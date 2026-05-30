import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from src.core.model import model_manager

router = APIRouter()


class EmbedUrlRequest(BaseModel):
    url: str


class EmbedResponse(BaseModel):
    embedding: list[float]
    dim: int


class BatchEmbedRequest(BaseModel):
    urls: list[str]


class PersonalizeRequest(BaseModel):
    vectors: list[list[float]]


class PersonalizeResponse(BaseModel):
    avg_vector: list[float]


@router.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model_manager.is_loaded()}


@router.post("/embed", response_model=EmbedResponse)
async def embed_url(req: EmbedUrlRequest):
    try:
        vec = model_manager.clip.encode_url(req.url)
        return EmbedResponse(embedding=vec, dim=len(vec))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed-upload", response_model=EmbedResponse)
async def embed_upload(file: UploadFile = File(...)):
    try:
        data = await file.read()
        vec = model_manager.clip.encode_bytes(data)
        return EmbedResponse(embedding=vec, dim=len(vec))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed-batch")
async def embed_batch(req: BatchEmbedRequest):
    try:
        vecs = model_manager.clip.encode_batch_urls(req.urls)
        return {"embeddings": vecs, "count": len(vecs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personalize", response_model=PersonalizeResponse)
async def personalize(req: PersonalizeRequest):
    if not req.vectors:
        return PersonalizeResponse(avg_vector=[0.0] * 512)
    arr = np.array(req.vectors, dtype=np.float32)
    avg = arr.mean(axis=0)
    norm = np.linalg.norm(avg)
    if norm > 0:
        avg = avg / norm
    return PersonalizeResponse(avg_vector=avg.tolist())
