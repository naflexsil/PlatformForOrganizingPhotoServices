from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.core.model import model_manager
from src.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_manager.load()
    yield


app = FastAPI(title="PhotoServices AI", version="1.0.0", lifespan=lifespan)
app.include_router(router)
