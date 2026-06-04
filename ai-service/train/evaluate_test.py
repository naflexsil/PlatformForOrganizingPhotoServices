
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
TEST_DIR = Path(__file__).parent / "data" / "test_images"
DATA_CSV = Path(__file__).parent / "data" / "labels.csv"
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
TOP_KS = [1, 3, 5]
MAX_DB_PER_CAT = 100
SEED = 42


def load_test_queries():
    if not TEST_DIR.exists():
        sys.exit(f"ОШИБКА: папка {TEST_DIR} не найдена.\n"
                 "Создайте train/data/test_images/<category>/ и положите туда фото.")

    paths, labels = [], []
    print("\nТестовая выборка (query) — новые, невиданные фото:")
    for cat_dir in sorted(TEST_DIR.iterdir()):
        if not cat_dir.is_dir():
            continue
        cat = cat_dir.name
        imgs = sorted(p for p in cat_dir.iterdir()
                      if p.suffix.lower() in IMG_EXTS)
        if not imgs:
            print(f"  {cat:12s}: 0 фото  ← пропущено")
            continue
        paths.extend(imgs)
        labels.extend([cat] * len(imgs))
        print(f"  {cat:12s}: {len(imgs):3d} фото")
    print(f"  {'ИТОГО':12s}: {len(paths):3d} фото\n")

    if not paths:
        sys.exit("ОШИБКА: не найдено ни одного фото в test_images/.")
    return paths, labels


def load_db(categories: list[str]):
    if not DATA_CSV.exists():
        sys.exit(f"ОШИБКА: {DATA_CSV} не найден. Запусти prepare_dataset.py.")

    by_cat: dict[str, list[Path]] = defaultdict(list)
    with open(DATA_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            p = Path(row["path"])
            cat = row["category"]
            if cat in categories and p.exists():
                by_cat[cat].append(p)

    random.seed(SEED)
    paths, labels = [], []
    print(
        f"База поиска (db) — обучающий датасет (до {MAX_DB_PER_CAT} фото/кат.):")
    for cat in sorted(categories):
        pool = by_cat.get(cat, [])
        sample = random.sample(pool, min(MAX_DB_PER_CAT, len(pool)))
        paths.extend(sample)
        labels.extend([cat] * len(sample))
        print(f"  {cat:12s}: {len(sample):3d} фото")
    print(f"  {'ИТОГО':12s}: {len(paths):3d} фото\n")
    return paths, labels


def build_model(weights_path=None):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME)
    if weights_path and Path(weights_path).exists():
        state = torch.load(
            weights_path, map_location=device, weights_only=True)
        model.vision_model.load_state_dict(state, strict=False)
    model = model.to(device).eval()
    return model, processor, device


def encode_all(paths, model, processor, device, desc):
    vectors = []
    for path in tqdm(paths, desc=f"  {desc}", ncols=70, leave=False):
        img = Image.open(path).convert("RGB")
        inputs = processor(images=img, return_tensors="pt").to(device)
        with torch.no_grad():
            pooled = model.vision_model(**inputs).pooler_output
            feat = model.visual_projection(pooled)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        vectors.append(feat.cpu().float().numpy().flatten())
    return np.stack(vectors)


def cross_precision_at_k(q_labels, db_labels, q_emb, db_emb, k):
    sim = q_emb @ db_emb.T
    per_cat: dict[str, list[float]] = defaultdict(list)
    for i, label in enumerate(q_labels):
        top_idx = np.argsort(sim[i])[::-1][:k]
        hits = sum(1 for j in top_idx if db_labels[j] == label)
        per_cat[label].append(hits / k)
    overall = float(np.mean([v for vals in per_cat.values() for v in vals]))
    return {"overall": overall,
            "per_category": {cat: float(np.mean(v)) for cat, v in per_cat.items()}}


def print_model_results(title, q_labels, db_labels, q_emb, db_emb):
    print(f"\n{'─'*58}")
    print(f"  {title}")
    print(f"{'─'*58}")
    categories = sorted(set(q_labels))
    for k in TOP_KS:
        res = cross_precision_at_k(q_labels, db_labels, q_emb, db_emb, k)
        per_cat = res["per_category"]
        print(f"\n  Precision@{k}  (overall: {res['overall']:.3f})")
        for cat in categories:
            score = per_cat.get(cat, 0.0)
            bar = "█" * round(score * 20)
            print(f"    {cat:12s}  {score:.3f}  {bar}")


def print_comparison(q_labels, db_labels,
                     q_emb_base, db_emb_base,
                     q_emb_ft,   db_emb_ft):
    print(f"\n{'═'*58}")
    print("  Итог: Baseline  vs  Fine-tuned  (тестовая выборка)")
    print(f"{'═'*58}")
    print(f"  {'':4s}  {'Baseline':>10}  {'Fine-tuned':>10}  {'Δ':>8}")
    print(f"  {'─'*46}")
    for k in TOP_KS:
        r_b = cross_precision_at_k(
            q_labels, db_labels, q_emb_base, db_emb_base, k)["overall"]
        r_f = cross_precision_at_k(
            q_labels, db_labels, q_emb_ft,   db_emb_ft,   k)["overall"]
        d = r_f - r_b
        sign = "+" if d >= 0 else ""
        marker = "▲" if d > 0.01 else ("▼" if d < -0.01 else "≈")
        print(f"  P@{k}  {r_b:>10.3f}  {r_f:>10.3f}  {sign}{d:>7.3f}  {marker}")
    print()


def main():
    print("  Оценка CLIP на тестовой выборке  (честная оценка)")

    q_paths, q_labels = load_test_queries()
    categories = sorted(set(q_labels))
    db_paths, db_labels = load_db(categories)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Устройство: {device}\n")

    print("Загружаю Baseline CLIP (без дообучения)...")
    model_b, proc_b, _ = build_model(weights_path=None)
    q_emb_base = encode_all(q_paths,  model_b, proc_b,
                            device, "Query  baseline")
    db_emb_base = encode_all(db_paths, model_b, proc_b,
                             device, "DB     baseline")
    del model_b
    if device == "cuda":
        torch.cuda.empty_cache()

    if not WEIGHTS_PATH.exists():
        sys.exit(f"\nВеса не найдены: {WEIGHTS_PATH}\n"
                 "Запусти python train/finetune_clip.py сначала.")

    print(f"Загружаю Fine-tuned CLIP ({WEIGHTS_PATH.name})...")
    model_ft, proc_ft, _ = build_model(weights_path=WEIGHTS_PATH)
    q_emb_ft = encode_all(q_paths,  model_ft, proc_ft,
                          device, "Query  fine-tuned")
    db_emb_ft = encode_all(db_paths, model_ft, proc_ft,
                           device, "DB     fine-tuned")
    del model_ft

    print_model_results("Baseline CLIP  (openai/clip-vit-base-patch32)",
                        q_labels, db_labels, q_emb_base, db_emb_base)
    print_model_results(f"Fine-tuned CLIP  ({WEIGHTS_PATH.name})",
                        q_labels, db_labels, q_emb_ft, db_emb_ft)
    print_comparison(q_labels, db_labels,
                     q_emb_base, db_emb_base,
                     q_emb_ft,   db_emb_ft)


if __name__ == "__main__":
    main()
