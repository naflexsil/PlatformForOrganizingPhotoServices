import csv
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

MODEL_NAME   = "openai/clip-vit-base-patch32"
WEIGHTS_PATH = Path(__file__).parent.parent / "weights" / "clip_finetuned.pt"
DATA_CSV     = Path(__file__).parent / "data" / "labels.csv"
OUTPUT_PATH  = Path(__file__).parent.parent / "weights" / "centroids.npy"

MAX_PER_CLASS = 100
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def main():
    print(f"Device: {DEVICE}")

    if not DATA_CSV.exists():
        sys.exit(f"labels.csv not found: {DATA_CSV}. Run prepare_dataset.py first.")

    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME)

    if WEIGHTS_PATH.exists():
        state = torch.load(WEIGHTS_PATH, map_location=DEVICE, weights_only=True)
        model.vision_model.load_state_dict(state, strict=False)
        print(f"Loaded weights: {WEIGHTS_PATH.name}")
    else:
        print("WARNING: fine-tuned weights not found, using base CLIP")

    model = model.to(DEVICE).eval()

    by_category: dict[str, list[Path]] = defaultdict(list)
    with open(DATA_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            p = Path(row["path"])
            if p.exists():
                by_category[row["category"]].append(p)

    if not by_category:
        sys.exit("No images found. Check labels.csv paths.")

    centroids = {}
    print(f"\nComputing centroids for {len(by_category)} categories:")

    for category in sorted(by_category):
        paths = by_category[category][:MAX_PER_CLASS]
        vecs = []
        for path in paths:
            img = Image.open(path).convert("RGB")
            inputs = processor(images=img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                pooled   = model.vision_model(pixel_values=inputs["pixel_values"]).pooler_output
                features = model.visual_projection(pooled)
                features = F.normalize(features, p=2, dim=-1)
            vecs.append(features.cpu().numpy().flatten())

        centroid = np.mean(vecs, axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        centroids[category] = centroid
        print(f"  {category:12s}: {len(vecs)} images")

    np.save(str(OUTPUT_PATH), centroids)
    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
