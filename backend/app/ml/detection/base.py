"""
Abstract base class and data structures for oil spill detection models.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional, Any
from pydantic import BaseModel, Field


class DetectionOutput(BaseModel):
    """Normalized output from any oil spill detection model."""
    detected: bool
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1 (never claims 100%)")
    spill_area_km2: float = Field(..., ge=0.0, description="Estimated spill area in square kilometers")
    geometry_geojson: Optional[str] = Field(None, description="Spill boundary polygon GeoJSON string")
    mask_base64: Optional[str] = Field(None, description="Base64-encoded PNG of segmentation mask overlay")
    model_name: str = Field(..., description="Name of the model (clearly tagged DEMO MODEL when applicable)")
    processing_time_ms: float = Field(..., description="Inference latency in milliseconds")
    potential_false_positive: bool = Field(False, description="Flagged if confidence is below threshold (<0.70)")
    is_demo_model: bool = Field(True, description="Indicates whether result is from a simulation demo detector")
    details: dict[str, Any] = Field(default_factory=dict, description="Supplementary diagnostic metadata")


class DetectionModel(ABC):
    """Abstract interface for oil spill detection models."""

    @abstractmethod
    def predict(
        self,
        image_bytes: bytes,
        filename: str,
        latitude: float,
        longitude: float,
        demo_preset: Optional[str] = None,
    ) -> DetectionOutput:
        """
        Execute oil spill detection inference on the provided image.
        Returns a normalized DetectionOutput.
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if model weights and runtime dependencies are available."""
        pass
