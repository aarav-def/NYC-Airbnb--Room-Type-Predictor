from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "Model_Pipeline.pkl"

# Load once when the API starts. Use scikit-learn 1.6.1 to match the
# version used when this pipeline was saved.
try:
    model = joblib.load(MODEL_PATH)
except Exception as exc:
    raise RuntimeError(
        f"Could not load {MODEL_PATH}. Install the model's original "
        f"scikit-learn version (1.6.1). Original error: {exc}"
    ) from exc

COLUMNS = [
    "latitude",
    "longitude",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "calculated_host_listings_count",
    "availability_365",
    "neighbourhood_group",
    "neighbourhood",
]

MODEL_CLASSES = [str(value) for value in model.classes_]

app = FastAPI(title="RoomSense NYC Room Type Predictor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development. Restrict this in production.
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class Features(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    price: float = Field(..., gt=0)
    minimum_nights: int = Field(..., ge=1, le=365)
    number_of_reviews: int = Field(..., ge=0)
    reviews_per_month: float = Field(..., ge=0)
    calculated_host_listings_count: int = Field(..., ge=0)
    availability_365: int = Field(..., ge=0, le=365)
    neighbourhood_group: str = Field(..., min_length=1)
    neighbourhood: str = Field(..., min_length=1)


@app.get("/")
def health():
    return {
        "status": "online",
        "service": "RoomSense",
        "model_loaded": True,
        "classes": MODEL_CLASSES,
    }


@app.post("/predict")
def predict(features: Features):
    try:
        # Pydantic v2-compatible conversion; column order matches training.
        row = pd.DataFrame([features.model_dump()], columns=COLUMNS)
        prediction = model.predict(row)[0]

        if not hasattr(model, "predict_proba"):
            raise RuntimeError("The loaded model does not support predict_proba().")

        probabilities = model.predict_proba(row)[0].tolist()

        return {
            "Predicted_room_type": str(prediction),
            "Probability": probabilities,
            "classes": MODEL_CLASSES,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {type(exc).__name__}: {exc}",
        ) from exc
