from src.ml_models.clip_wrapper import CLIPWrapper
from src.core.config import settings


class ModelManager:
    def __init__(self):
        self._clip: CLIPWrapper | None = None

    def load(self):
        self._clip = CLIPWrapper(
            model_name=settings.clip_model_name,
            weights_path=settings.clip_weights_path,
            centroids_path=settings.clip_centroids_path,
        )

    @property
    def clip(self) -> CLIPWrapper:
        if self._clip is None:
            raise RuntimeError("Model not loaded")
        return self._clip

    def is_loaded(self) -> bool:
        return self._clip is not None


model_manager = ModelManager()
