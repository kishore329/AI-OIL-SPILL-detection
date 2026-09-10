"""
Detection API routes — /api/v1/detection
Analyzes satellite and drone imagery for oil spill anomalies.
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.detection import DetectionAnalyzeResponse
from app.ml.detection.service import DetectionService

router = APIRouter(prefix="/detection", tags=["AI Detection"])


@router.post(
    "/analyze",
    response_model=DetectionAnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze satellite / drone image for oil spill",
    description=(
        "Analyzes an uploaded satellite or drone image (PNG, JPG, JPEG) or demo preset. "
        "Returns detection status, confidence score, estimated spill area, "
        "segmentation mask overlay, and PostGIS boundary polygon. "
        "Automatically persists detection records and escalates confirmed spills into active Incidents."
    ),
)
async def analyze_spill(
    image: Optional[UploadFile] = File(None, description="Satellite or drone image file (PNG, JPG, JPEG)"),
    latitude: float = Form(10.85, ge=-90.0, le=90.0, description="Capture point latitude"),
    longitude: float = Form(79.90, ge=-180.0, le=180.0, description="Capture point longitude"),
    timestamp: Optional[datetime] = Form(None, description="Image capture timestamp"),
    demo_preset: Optional[str] = Form(None, description="Optional simulation preset (e.g. sentinel_sar_slick, drone_coastal_spill, clean_ocean_water, low_confidence_sheen)"),
    db: Session = Depends(get_db),
):
    return await DetectionService.analyze_image(
        db=db,
        file=image,
        latitude=latitude,
        longitude=longitude,
        timestamp=timestamp,
        demo_preset=demo_preset,
    )
