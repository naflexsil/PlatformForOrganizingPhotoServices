from pathlib import Path
from io import BytesIO

import torch
import numpy as np
import requests
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


class CLIPWrapper:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32", weights_path: str = None):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CLIP] Loading on {self.device}")

        self.processor = CLIPProcessor.from_pretrained(model_name)
        self.model = CLIPModel.from_pretrained(model_name)

        weights = Path(weights_path) if weights_path else None
        if weights and weights.exists():
            state = torch.load(weights, map_location=self.device, weights_only=True)
            self.model.vision_model.load_state_dict(state, strict=False)
            print(f"[CLIP] Fine-tuned weights: {weights}")
        else:
            print("[CLIP] Using base pretrained weights (fine-tuned weights not found)")

        self.model = self.model.to(self.device)
        self.model.eval()

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

    def _encode(self, image: Image.Image) -> list[float]:
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().float().numpy().flatten().tolist()
