
import csv
import sys
from collections import defaultdict
from pathlib import Path

from datasets import load_dataset
from PIL import Image
from tqdm import tqdm

DATA_DIR = Path(__file__).parent / "data"
IMAGES_DIR = DATA_DIR / "images"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SHOOT_KEYWORDS: dict[str, list[str]] = {
    "wedding": [
        "wedding", "bride", "groom", "bridal", "veil", "bouquet",
        "wedding dress", "wedding cake", "wedding reception", "just married",
    ],
    "family": [
        "family", "children", "parents", "kids", "son", "daughter",
        "grandmother", "grandfather", "siblings", "toddler",
    ],
    "event": [
        "concert", "music festival", "crowd", "audience",
        "on stage", "graduation", "sports game", "fans cheering",
        "parade", "performance", "festival",
    ],
    "portrait": [
        "portrait", "headshot", "close-up of a man", "close-up of a woman",
        "posing", "looking at the camera", "smiling at the camera",
        "looking at camera", "smiling at camera",
    ],
    "commercial": [
        "fashion", "model", "outfit", "clothing",
        "runway", "fashion show",
    ],
    "couple": [
        "couple", "kissing", "holding hands", "boyfriend", "girlfriend",
        "romantic", "embrace", "hug each other",
    ],
}

EXCLUDE_KEYWORDS: dict[str, list[str]] = {
    "couple":     ["wedding", "bride", "groom", "bridal", "ceremony", "family", "children", "kids"],
    "portrait":   ["wedding", "bride", "groom", "family", "children"],
    "commercial": ["wedding", "bride", "groom", "family", "children", "kids"],
    "event":      ["wedding ceremony"],
}

MAX_PER_CLASS = 1500  # максимум изображений на категорию


def classify(captions: list[str]) -> str | None:
    text = " ".join(captions).lower()
    for category, kws in SHOOT_KEYWORDS.items():
        if not any(kw in text for kw in kws):
            continue

        exclusions = EXCLUDE_KEYWORDS.get(category, [])
        if any(ex in text for ex in exclusions):
            continue
        return category
    return None


def main():
    print("Загрузка Flickr30k (первый запуск: ~6 ГБ, кэшируется)...")
    ds = load_dataset("nlphuji/flickr30k", split="test")
    print(f"Датасет загружен: {len(ds)} изображений\n")

    counts: dict[str, int] = defaultdict(int)
    rows: list[dict] = []

    for item in tqdm(ds, desc="Фильтрация и сохранение"):
        captions: list[str] = item["caption"]
        category = classify(captions)
        if not category:
            continue
        if counts[category] >= MAX_PER_CLASS:
            continue

        img_id = item["img_id"]
        image: Image.Image = item["image"].convert("RGB")

        cat_dir = IMAGES_DIR / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        img_path = cat_dir / f"{img_id}.jpg"
        image.save(img_path, "JPEG", quality=90)

        rows.append({
            "img_id":   img_id,
            "category": category,
            "path":     str(img_path.resolve()),
            "caption":  captions[0],
        })
        counts[category] += 1

    out = DATA_DIR / "labels.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["img_id", "category", "path", "caption"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nСохранено {len(rows)} изображений → {IMAGES_DIR}")
    print("Распределение по категориям:")
    for cat, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:12s}: {n}")
    print(f"\nCSV-индекс → {out}")


if __name__ == "__main__":
    main()
