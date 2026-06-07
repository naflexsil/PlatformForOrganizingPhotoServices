"""
Fine-tuning CLIP ViT-B/32 с Supervised Contrastive Loss.

Почему SupCon лучше Triplet Loss для этой задачи:

  Triplet Loss: за один шаг - 1 позитив, 1 негатив.
  SupCon Loss:  за один шаг - ВСЕ позитивы и ВСЕ негативы батча.
  При batch=48 (8 примеров × 6 классов):
    каждый sample видит 7 позитивов и 40 негативов - сигнала в ~50× больше.

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
from torch.utils.data import Dataset, DataLoader, Sampler
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
from tqdm import tqdm

MODEL_NAME = "openai/clip-vit-base-patch32"
DATA_CSV = Path(__file__).parent / "data" / "labels.csv"
WEIGHTS_DIR = Path(__file__).parent.parent / "weights"
WEIGHTS_DIR.mkdir(exist_ok=True)

N_PER_CLASS = 8       # образцов каждого класса в одном батче
EPOCHS = 10      # SupCon учится быстрее — меньше эпох чем Triplet
LR = 1e-5
TEMPERATURE = 0.07    # τ — стандартное значение для CLIP-стиля обучения
GRAD_CLIP = 1.0
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class SupConLoss(nn.Module):

    def __init__(self, temperature: float = 0.07):
        super().__init__()
        self.temperature = temperature

    def forward(self, features: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:

        device = features.device
        N = features.shape[0]

        sim = torch.mm(features, features.T) / self.temperature  # (N, N)

        sim = sim - sim.max(dim=1, keepdim=True).values.detach()

        labels2d = labels.unsqueeze(1)
        mask_pos = (labels2d == labels2d.T).float()
        mask_self = torch.eye(N, device=device)
        mask_pos = mask_pos - mask_self

        exp_sim = torch.exp(sim) * (1.0 - mask_self)

        log_denom = torch.log(exp_sim.sum(dim=1, keepdim=True) + 1e-8)

        log_prob = sim - log_denom

        n_pos = mask_pos.sum(dim=1).clamp(min=1.0)
        loss = -(log_prob * mask_pos).sum(dim=1) / n_pos

        return loss.mean()


class PhotoDataset(Dataset):

    def __init__(self, csv_path: Path, processor: CLIPProcessor):
        self.processor = processor
        self.paths:      list[Path] = []
        self.labels:     list[int] = []
        self._cat_to_idx: dict[str, int] = {}

        if not csv_path.exists():
            sys.exit(
                f"ОШИБКА: {csv_path} не найден. Запустите prepare_dataset.py сначала.")

        by_cat: dict[str, list[Path]] = defaultdict(list)
        with open(csv_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                p = Path(row["path"])
                if p.exists():
                    by_cat[row["category"]].append(p)

        if not by_cat:
            sys.exit("ОШИБКА: нет валидных данных в labels.csv.")

        for cat in sorted(by_cat):
            idx = len(self._cat_to_idx)
            self._cat_to_idx[cat] = idx
            for p in by_cat[cat]:
                self.paths.append(p)
                self.labels.append(idx)

        print(
            f"\nДатасет: {len(self.paths)} изображений, {len(self._cat_to_idx)} классов")
        for cat, idx in self._cat_to_idx.items():
            count = sum(1 for l in self.labels if l == idx)
            print(f"  [{idx}] {cat:12s}: {count}")

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img = Image.open(self.paths[idx]).convert("RGB")
        tensor = self.processor(images=img, return_tensors="pt")[
            "pixel_values"].squeeze(0)
        return tensor, self.labels[idx]


class BalancedBatchSampler(Sampler):

    def __init__(self, labels: list[int], n_per_class: int):
        self.n_per_class = n_per_class
        self.classes = sorted(set(labels))
        self.by_class = {
            c: [i for i, l in enumerate(labels) if l == c]
            for c in self.classes
        }
        self._n_batches = max(len(v)
                              for v in self.by_class.values()) // n_per_class

    def __iter__(self):
        shuffled = {c: random.sample(v, len(v))
                    for c, v in self.by_class.items()}

        for b in range(self._n_batches):
            batch = []
            for c in self.classes:
                pool = shuffled[c]
                start = (b * self.n_per_class) % len(pool)
                end = start + self.n_per_class
                if end <= len(pool):
                    batch.extend(pool[start:end])
                else:
                    part = pool[start:]
                    need = self.n_per_class - len(part)
                    random.shuffle(shuffled[c])
                    batch.extend(part + shuffled[c][:need])
            random.shuffle(batch)
            yield batch

    def __len__(self) -> int:
        return self._n_batches


def train():
    print(f"Устройство: {DEVICE}")
    if DEVICE == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME).to(DEVICE)

    for param in model.text_model.parameters():
        param.requires_grad = False
    for param in model.text_projection.parameters():
        param.requires_grad = False

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Обучаемые параметры: {trainable:,} (только vision encoder)")

    dataset = PhotoDataset(DATA_CSV, processor)
    sampler = BalancedBatchSampler(dataset.labels, n_per_class=N_PER_CLASS)
    loader = DataLoader(
        dataset,
        batch_sampler=sampler,
        num_workers=2,
        pin_memory=(DEVICE == "cuda"),
        persistent_workers=True,
    )

    n_classes = len(dataset._cat_to_idx)
    batch_size = n_classes * N_PER_CLASS
    print(
        f"\nОбучение: {EPOCHS} эпох | batch={batch_size} ({N_PER_CLASS}×{n_classes} классов)")
    print(f"SupCon τ={TEMPERATURE} | lr={LR} | batches/epoch≈{len(sampler)}")
    print("─" * 56)

    criterion = SupConLoss(temperature=TEMPERATURE)
    optimizer = AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=LR,
        weight_decay=0.01,
    )
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=LR * 0.1)

    best_loss = float("inf")
    history = []

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        valid_steps = 0

        for images, labels in tqdm(loader, desc=f"Epoch {epoch}/{EPOCHS}"):
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            pooled = model.vision_model(pixel_values=images).pooler_output
            features = model.visual_projection(pooled)
            features = F.normalize(features, p=2, dim=-1)

            loss = criterion(features, labels)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()

            total_loss += loss.item()
            valid_steps += 1

        scheduler.step()
        avg_loss = total_loss / max(valid_steps, 1)
        history.append(avg_loss)
        print(
            f"Epoch {epoch}/{EPOCHS}  loss={avg_loss:.4f}  lr={scheduler.get_last_lr()[0]:.2e}")

        if avg_loss < best_loss:
            best_loss = avg_loss
            out = WEIGHTS_DIR / "clip_finetuned.pt"
            torch.save(model.vision_model.state_dict(), out)
            print(f"Лучшие веса сохранены → {out}")

    print(f"\nОбучение завершено. Лучший loss: {best_loss:.4f}")
    print(f"История: {[f'{l:.4f}' for l in history]}")
    print(f"\nВеса перезаписаны в: {WEIGHTS_DIR / 'clip_finetuned.pt'}")


if __name__ == "__main__":
    train()
