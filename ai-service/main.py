from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.core.model import model_manager
from src.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        model_manager.load()
    except Exception as e:
        import traceback
        print(f"[AI] WARNING: model failed to load: {e}", flush=True)
        traceback.print_exc()
    yield


app = FastAPI(title="PhotoServices AI", version="1.0.0", lifespan=lifespan)
app.include_router(router)
