import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.api.v1.api import api_router
    from backend.app.ml_service.model_loader import ml_service
except ImportError:
    from app.api.v1.api import api_router
    from app.ml_service.model_loader import ml_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler: loads ML models on startup.
    """
    print("[ACTSE Backend] Initializing engine and loading ML models...")
    try:
        ml_service.load_models()
        print("[ACTSE Backend] Model loading complete. Engine ready for transaction scoring.")
    except Exception as e:
        print(f"[ACTSE Backend ERROR] Failed to load ML models: {e}")
        raise e
    yield
    print("[ACTSE Backend] Shutting down ACTSE engine.")

app = FastAPI(
    title="ACTSE (Adaptive Controlled Transaction Settlement Engine) API",
    description="Intelligent transaction risk scoring, dynamic throttling, and controlled state machine lifecycle engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Health"])
async def root_health():
    return {
        "service": "ACTSE Settlement Core API",
        "status": "HEALTHY",
        "models_loaded": ml_service.is_loaded(),
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "HEALTHY",
        "models_loaded": ml_service.is_loaded()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
