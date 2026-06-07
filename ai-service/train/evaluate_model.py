"""
Оценка качества файн-тюненной CLIP модели vs baseline.

Метрики:
    Precision@K = доля топ-K результатов той же категории что и запрос
    Считаем P@1, P@3, P@5 для каждой категории и в целом.

Сравнивает два варианта:
    1. Baseline CLIP (openai/clip-vit-base-patch32, без дообучения)
    2. Fine-tuned CLIP (те же веса + clip_finetuned.pt на vision_model)

Запуск (из корня проекта):
    cd ai-service
    .venv\\Scripts\\activate        # Windows
    python train/evaluate_model.py
"""

import csv
import random
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from tqdm import tqdm
from transformers import CLIPModel, CLIPProcessor

MODEL_NAME = "openai/clip-vit-base-patch32"
WEIGHTS_PATH = Path(__file__).parent.parent / "weights" / "clip_finetuned.pt"
DATA_CSV = Path(__file__).parent / "data" / "labels.csv"

N_EVAL = 30
TOP_KS = [1, 3, 5]
SEED = 99


def load_eval_set() -> tuple[list[Path], list[str]]:
    if not DATA_CSV.exists():
        sys.exit(
            f"ОШИБКА: {DATA_CSV} не найден.\n"
            "Запустите python train/prepare_dataset.py сначала."
        )

    by_category: dict[str, list[Path]] = defaultdict(list)
    with open(DATA_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            p = Path(row["path"])
            if p.exists():
                by_category[row["category"]].append(p)

    if not by_category:
        sys.exit("ОШИБКА: labels.csv пуст или файлы изображений не найдены.")

    random.seed(SEED)
    paths: list[Path] = []
    labels: list[str] = []
    print(f"\nОценочная выборка (seed={SEED}, до {N_EVAL} фото/категория):")
    for cat in sorted(by_category):
        sample = random.sample(by_category[cat], min(
            N_EVAL, len(by_category[cat])))
        paths.extend(sample)
        labels.extend([cat] * len(sample))
        print(f"  {cat:12s}: {len(sample):3d} фото")
    print(f"  {'ИТОГО':12s}: {len(paths):3d} фото\n")
    return paths, labels


def build_model(weights_path: Path | None) -> tuple[CLIPModel, CLIPProcessor, str]:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME)

    if weights_path and weights_path.exists():
        state = torch.load(
            weights_path, map_location=device, weights_only=True)
        model.vision_model.load_state_dict(state, strict=False)

    model = model.to(device).eval()
    return model, processor, device


def encode_all(
    paths: list[Path],
    model: CLIPModel,
    processor: CLIPProcessor,
    device: str,
    desc: str,
) -> np.ndarray:

    vectors: list[np.ndarray] = []
    for path in tqdm(paths, desc=f"  {desc}", ncols=70, leave=False):
        img = Image.open(path).convert("RGB")
        inputs = processor(images=img, return_tensors="pt").to(device)
        with torch.no_grad():
            pooled = model.vision_model(**inputs).pooler_output
            feat = model.visual_projection(pooled)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        vectors.append(feat.cpu().float().numpy().flatten())
    return np.stack(vectors)  # (N, 512)


def precision_at_k(
    labels: list[str],
    embeddings: np.ndarray,
    k: int,
) -> dict[str, float]:

    sim = embeddings @ embeddings.T
    per_cat: dict[str, list[float]] = defaultdict(list)

    for i, label in enumerate(labels):
        row = sim[i].copy()
        row[i] = -2.0  # исключаем само себя
        top_idx = np.argsort(row)[::-1][:k]
        hits = sum(1 for j in top_idx if labels[j] == label)
        per_cat[label].append(hits / k)

    overall = float(np.mean([v for vals in per_cat.values() for v in vals]))
    return {
        "overall":      overall,
        "per_category": {cat: float(np.mean(vals)) for cat, vals in per_cat.items()},
    }


def print_detailed(title: str, labels: list[str], emb: np.ndarray) -> None:
    print(f"\n{'─'*58}")
    print(f"  {title}")
    print(f"{'─'*58}")
    categories = sorted(set(labels))

    for k in TOP_KS:
        result = precision_at_k(labels, emb, k)
        per_cat = result["per_category"]
        print(f"\n  Precision@{k}  (overall: {result['overall']:.3f})")
        for cat in categories:
            score = per_cat.get(cat, 0.0)
            bar = "█" * round(score * 20)
            print(f"    {cat:12s}  {score:.3f}  {bar}")


def print_comparison(
    labels: list[str],
    emb_base: np.ndarray,
    emb_ft: np.ndarray,
) -> None:
    print(f"\n{'═'*58}")
    print("  Итог: Baseline  vs  Fine-tuned")
    print(f"{'═'*58}")
    print(f"  {'':4s}  {'Baseline':>10}  {'Fine-tuned':>10}  {'Δ':>8}")
    print(f"  {'─'*46}")
    for k in TOP_KS:
        r_base = precision_at_k(labels, emb_base, k)["overall"]
        r_ft = precision_at_k(labels, emb_ft,   k)["overall"]
        delta = r_ft - r_base
        sign = "+" if delta >= 0 else ""
        better = "▲" if delta > 0.01 else ("▼" if delta < -0.01 else "≈")
        print(
            f"  P@{k}  {r_base:>10.3f}  {r_ft:>10.3f}  {sign}{delta:>7.3f}  {better}")
    print()


def main() -> None:
    print("=" * 58)
    print("  Оценка качества CLIP модели  (Precision@K)")
    print("=" * 58)

    paths, labels = load_eval_set()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Устройство: {device}\n")

    print("Загружаю Baseline CLIP (без дообучения)...")
    model_b, proc_b, _ = build_model(weights_path=None)
    emb_base = encode_all(paths, model_b, proc_b, device, "Baseline")
    del model_b
    if device == "cuda":
        torch.cuda.empty_cache()

    if not WEIGHTS_PATH.exists():
        print(f"\nВеса не найдены: {WEIGHTS_PATH}")
        print("   Запустите python train/finetune_clip.py сначала.")
        sys.exit(1)

    print(f"Загружаю Fine-tuned CLIP ({WEIGHTS_PATH.name})...")
    model_ft, proc_ft, _ = build_model(weights_path=WEIGHTS_PATH)
    emb_ft = encode_all(paths, model_ft, proc_ft, device, "Fine-tuned")
    del model_ft

    print_detailed(
        "Baseline CLIP  (openai/clip-vit-base-patch32)", labels, emb_base)
    print_detailed(
        f"Fine-tuned CLIP  ({WEIGHTS_PATH.name})",        labels, emb_ft)
    print_comparison(labels, emb_base, emb_ft)


if __name__ == "__main__":
    main()
