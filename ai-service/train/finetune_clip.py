"""
Fine-tuning CLIP ViT-B/32 с Triplet Loss на отфильтрованном Flickr30k.

Математика (Triplet Loss):
    L(a, p, n) = max(0, ||f(a) − f(p)||² − ||f(a) − f(n)||² + α)
    f(x) = normalize(CLIP_vision_encoder(x))
    a — anchor, p — positive (тот же класс), n — negative (другой класс)
    α — margin: минимальный зазор между pos и neg дистанцией
"""

import csv
import random
import sys
from collections import defaultdict
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import Dataset, DataLoader
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
from tqdm import tqdm

# ─── Гиперпараметры ──────────────────────────────────────────────────────────

MODEL_NAME = "openai/clip-vit-base-patch32"
DATA_CSV = Path(__file__).parent / "data" / "labels.csv"
WEIGHTS_DIR = Path(__file__).parent.parent / "weights"
WEIGHTS_DIR.mkdir(exist_ok=True)

BATCH_SIZE = 16     # уменьши до 8 если не хватает VRAM
EPOCHS = 5
LR = 1e-5
MARGIN = 0.3    # α
GRAD_CLIP = 1.0
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ─── Triplet Loss ─────────────────────────────────────────────────────────────


class TripletLoss(nn.Module):
    """
    L(a,p,n) = mean( max(0, d(a,p) − d(a,n) + margin) )
    d(x,y) = ||normalize(x) − normalize(y)||² = 2 − 2·cos(x,y)
    """

    def __init__(self, margin: float = 0.3):
        super().__init__()
        self.margin = margin

    def forward(self, anchor: torch.Tensor, positive: torch.Tensor, negative: torch.Tensor) -> torch.Tensor:
        a = F.normalize(anchor,   p=2, dim=-1)
        p = F.normalize(positive, p=2, dim=-1)
        n = F.normalize(negative, p=2, dim=-1)

        pos_dist = (a - p).pow(2).sum(dim=-1)
        neg_dist = (a - n).pow(2).sum(dim=-1)
        return F.relu(pos_dist - neg_dist + self.margin).mean()


# ─── Dataset ─────────────────────────────────────────────────────────────────

class TripletDataset(Dataset):
    def __init__(self, csv_path: Path, processor: CLIPProcessor):
        self.processor = processor
        self.by_category: dict[str, list[Path]] = defaultdict(list)

        if not csv_path.exists():
            sys.exit(
                f"ОШИБКА: {csv_path} не найден. Запусти prepare_dataset.py сначала.")

        with open(csv_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                p = Path(row["path"])
                if p.exists():
                    self.by_category[row["category"]].append(p)

        self.categories = [
            c for c, paths in self.by_category.items() if len(paths) >= 2]
        if not self.categories:
            sys.exit(
                "ОШИБКА: нет категорий с ≥2 изображениями. Проверь labels.csv и пути к файлам.")

        self.triplets = self._build_triplets()

        print(
            f"\nДатасет: {len(self.triplets)} троек из {len(self.categories)} классов")
        for cat in self.categories:
            print(f"  {cat:12s}: {len(self.by_category[cat])} изображений")

    def _build_triplets(self) -> list[tuple[Path, Path, Path]]:
        # Все негативы: объединяем пути из всех ДРУГИХ категорий
        neg_pool: dict[str, list[Path]] = {
            cat: [p for c, paths in self.by_category.items() if c !=
                  cat for p in paths]
            for cat in self.categories
        }
        triplets = []
        for cat in self.categories:
            paths = list(self.by_category[cat])
            random.shuffle(paths)
            for i in range(0, len(paths) - 1, 2):
                neg = random.choice(neg_pool[cat])
                triplets.append((paths[i], paths[i + 1], neg))
        random.shuffle(triplets)
        return triplets

    def __len__(self) -> int:
        return len(self.triplets)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        a_path, p_path, n_path = self.triplets[idx]
        a = self._load(a_path)
        p = self._load(p_path)
        n = self._load(n_path)
        return a, p, n

    def _load(self, path: Path) -> torch.Tensor:
        img = Image.open(path).convert("RGB")
        return self.processor(images=img, return_tensors="pt")["pixel_values"].squeeze(0)


# ─── Обучение ─────────────────────────────────────────────────────────────────

def train():
    print(f"Устройство: {DEVICE}")
    if DEVICE == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(
            f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME).to(DEVICE)

    # Замораживаем текстовый энкодер — он нам не нужен для задачи
    for param in model.text_model.parameters():
        param.requires_grad = False
    for param in model.text_projection.parameters():
        param.requires_grad = False

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Обучаемые параметры: {trainable:,} (только vision encoder)")

    dataset = TripletDataset(DATA_CSV, processor)
    loader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=2,
        pin_memory=(DEVICE == "cuda"),
        persistent_workers=True,
    )

    criterion = TripletLoss(margin=MARGIN)
    optimizer = AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=LR,
        weight_decay=0.01,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=LR * 0.1)

    best_loss = float("inf")
    history = []

    print(
        f"\nОбучение: {EPOCHS} эпох | batch={BATCH_SIZE} | lr={LR} | margin={MARGIN}")
    print("─" * 56)

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        valid_batches = 0

        for a, p, n in tqdm(loader, desc=f"Epoch {epoch}/{EPOCHS}"):
            a, p, n = a.to(DEVICE), p.to(DEVICE), n.to(DEVICE)

            a_emb = model.visual_projection(model.vision_model(pixel_values=a).pooler_output)
            p_emb = model.visual_projection(model.vision_model(pixel_values=p).pooler_output)
            n_emb = model.visual_projection(model.vision_model(pixel_values=n).pooler_output)

            loss = criterion(a_emb, p_emb, n_emb)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()

            total_loss += loss.item()
            valid_batches += 1

        scheduler.step()
        avg_loss = total_loss / max(valid_batches, 1)
        history.append(avg_loss)
        print(
            f"Epoch {epoch}/{EPOCHS}  loss={avg_loss:.4f}  lr={scheduler.get_last_lr()[0]:.2e}")

        if avg_loss < best_loss:
            best_loss = avg_loss
            out = WEIGHTS_DIR / "clip_finetuned.pt"
            torch.save(model.vision_model.state_dict(), out)
            print(f"  ✓ Лучшие веса сохранены → {out}")

    print(f"\nОбучение завершено. Лучший loss: {best_loss:.4f}")
    print(f"История: {[f'{l:.4f}' for l in history]}")
    print(f"Файл весов: {WEIGHTS_DIR / 'clip_finetuned.pt'}")


if __name__ == "__main__":
    train()
