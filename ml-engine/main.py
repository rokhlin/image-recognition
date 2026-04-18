import os
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from insightface.app import FaceAnalysis
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import SentenceTransformer

# Initialize FastAPI
app = FastAPI(title="Photo AI ML Engine", version="1.0.0")

# Setup models directory (create if doesn't exist)
models_dir = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(models_dir, exist_ok=True)

# Initialize InsightFace with buffalo_l model
face_app = FaceAnalysis(name='buffalo_l', root=models_dir, providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

# CLIP model for scene recognition (optional)
try:
    clip_model = SentenceTransformer('clip-ViT-B-32')
    has_clip = True
except ImportError:
    has_clip = False
    clip_model = None

class FaceResult(BaseModel):
    bbox: List[float]
    prob: float
    embedding: List[float]

class SceneResult(BaseModel):
    embedding: List[float]

@app.post("/analyze-face", response_model=List[FaceResult])
async def analyze_face(image_path: str = Body(..., embed=True)):
    """
    Receives a local file path, processes the image, 
    and returns face coordinates + embeddings.
    """
    if not os.path.exists(image_path):
        raise HTTPException(
            status_code=404, 
            detail="Image not found in container filesystem"
        )

    # Load image using OpenCV (OpenCV format is BGR)
    img = cv2.imread(image_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # Perform analysis
    faces = face_app.get(img)

    results = []
    for face in faces:
        results.append(FaceResult(
            bbox=face.bbox.tolist(),  # [x, y, x', y']
            prob=float(face.det_score),
            embedding=face.normed_embedding.tolist()  # 512-D vector
        ))

    return results

@app.post("/analyze-scene", response_model=SceneResult)
async def analyze_scene(image_path: str = Body(..., embed=True)):
    """
    Analyze scene content for semantic search.
    Only available if CLIP model is loaded successfully.
    """
    if not has_clip or clip_model is None:
        raise HTTPException(
            status_code=501, 
            detail="Scene analysis module not configured"
        )

    # Generate a vector representing the visual content
    img = cv2.imread(image_path)
    img_emb = clip_model.encode(img)[:384]  # CLIP returns float64
    
    return SceneResult(
        embedding=img_emb.tolist() if isinstance(img_emb, np.ndarray) else img_emb
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
