import colorsys
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


class CLIPWrapper:
    def __init__(self, model_name: str, weights_path: str = None, centroids_path: str = None):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CLIP] Loading on {self.device}", flush=True)

        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model = CLIPModel.from_pretrained(model_name)

        weights = Path(weights_path) if weights_path else None
        if weights and weights.exists():
            state = torch.load(weights, map_location=self.device, weights_only=True)
            self.model.vision_model.load_state_dict(state, strict=False)
            print(f"[CLIP] Fine-tuned weights: {weights}", flush=True)
        else:
            print("[CLIP] Base pretrained weights", flush=True)

        self.model = self.model.to(self.device).eval()

        self._centroids: dict[str, np.ndarray] | None = None
        self._centroid_threshold = 0.25
        if centroids_path:
            self._load_centroids(centroids_path)

    def _load_centroids(self, path: str) -> None:
        p = Path(path)
        if not p.exists():
            print(f"[CLIP] No centroids file at {p}", flush=True)
            return
        data = np.load(str(p), allow_pickle=True).item()
        self._centroids = {k: np.array(v, dtype=np.float32) for k, v in data.items()}
        print(f"[CLIP] Loaded {len(self._centroids)} centroids: {list(self._centroids)}", flush=True)

    def classify(self, embedding: list[float]) -> tuple[str | None, float]:
        if not self._centroids:
            return None, 0.0
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        best_cat, best_sim = None, -1.0
        for cat, centroid in self._centroids.items():
            sim = float(np.dot(vec, centroid))
            if sim > best_sim:
                best_sim = sim
                best_cat = cat
        if best_sim < self._centroid_threshold:
            return None, round(best_sim, 4)
        return best_cat, round(best_sim, 4)

    @staticmethod
    def analyze_color_tone(image: Image.Image) -> str:
        img = image.convert("RGB").resize((50, 50))
        pixels = list(img.getdata())
        warm = cool = neutral = 0
        brightness_sum = saturation_sum = 0.0
        for r, g, b in pixels:
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            brightness_sum += v
            saturation_sum += s
            if s < 0.15:
                neutral += 1
            elif h < 0.17 or h > 0.88:
                warm += 1
            else:
                cool += 1
        n = len(pixels)
        avg_v = brightness_sum / n
        avg_s = saturation_sum / n
        if avg_s < 0.12:
            if avg_v > 0.72:
                return "light"
            if avg_v < 0.28:
                return "dark"
            return "neutral"
        if warm >= cool and warm >= neutral:
            return "warm"
        if cool >= warm and cool >= neutral:
            return "cool"
        return "neutral"

    def encode_url(self, url: str) -> list[float]:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        image = Image.open(BytesIO(resp.content)).convert("RGB")
        return self._encode(image)

    def encode_bytes(self, data: bytes) -> list[float]:
        image = Image.open(BytesIO(data)).convert("RGB")
        return self._encode(image)

    def encode_batch_urls(self, urls: list[str]) -> list[list[float]]:
        return [self.encode_url(u) for u in urls]

    def analyze_url(self, url: str) -> dict:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        image = Image.open(BytesIO(resp.content)).convert("RGB")
        return self._analyze(image)

    def analyze_bytes(self, data: bytes) -> dict:
        image = Image.open(BytesIO(data)).convert("RGB")
        return self._analyze(image)

    def _analyze(self, image: Image.Image) -> dict:
        embedding = self._encode(image)
        category, confidence = self.classify(embedding)
        color_tone = self.analyze_color_tone(image)
        return {
            "embedding": embedding,
            "category": category,
            "categoryConfidence": confidence,
            "colorTone": color_tone,
        }

    def _encode(self, image: Image.Image) -> list[float]:
        import torch.nn.functional as F
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            pooled   = self.model.vision_model(pixel_values=inputs["pixel_values"]).pooler_output
            features = self.model.visual_projection(pooled)
            features = F.normalize(features, p=2, dim=-1)
        return features.cpu().float().numpy().flatten().tolist()
