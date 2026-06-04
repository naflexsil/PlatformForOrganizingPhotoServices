from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    clip_model_name: str = "openai/clip-vit-base-patch32"
    clip_weights_path: str = "weights/clip_finetuned.pt"
    clip_centroids_path: str = "weights/centroids.npy"

    model_config = {"env_file": ".env"}


settings = Settings()
