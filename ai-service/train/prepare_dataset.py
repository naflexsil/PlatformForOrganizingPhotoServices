
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
        "wedding", "bride", "groom", "ceremony", "bridal", "veil", "bouquet",
    ],
    "family": [
        "family", "children", "parents", "kids", "son", "daughter",
        "grandmother", "grandfather", "siblings", "toddler",
    ],
    "couple": [
        "couple", "holding hands", "kissing", "boyfriend", "girlfriend",
        "romantic", "embrace", "hug each other",
    ],
    "event": [
        "party", "concert", "festival", "celebration", "crowd",
        "audience", "performance", "conference",
    ],
    "portrait": [
        "portrait", "headshot", "posing", "smiling at camera",
        "close-up of a man", "close-up of a woman",
    ],
    "commercial": [
        "product", "fashion", "wearing", "outfit", "clothing", "model wearing",
    ],
}

MAX_PER_CLASS = 800  # максимум изображений на категорию


def classify(captions: list[str]) -> str | None:
    text = " ".join(captions).lower()
    for category, kws in SHOOT_KEYWORDS.items():
        if any(kw in text for kw in kws):
            return category
    return None


def main():
    print("Загрузка Flickr30k (первый запуск: ~6 ГБ, кэшируется)...")
    # split="test" — в nlphuji/flickr30k весь датасет лежит в этом сплите
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

    # Сохраняем CSV
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
