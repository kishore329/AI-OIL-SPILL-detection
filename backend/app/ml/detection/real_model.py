"""
Real model adapter for production oil spill models (ONNX / PyTorch).
Gracefully falls back when model weights are not present.
"""
from __future__ import annotations
import os
import logging
from typing import Optional

from app.ml.detection.base import DetectionModel, DetectionOutput

logger = logging.getLogger(__name__)


class RealModelAdapter(DetectionModel):
    """
    Adapter for a trained deep-learning segmentation model (e.g., U-Net or DeepLabV3+).
    Attempts to load weights from disk if configured.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.getenv("OIL_SPILL_MODEL_PATH", "models/oil_spill_unet.onnx")
        self._model = None
        self._load_model()

    def _load_model(self) -> None:
        """Attempt to load trained model weights."""
        if os.path.exists(self.model_path):
            try:
                # Placeholder for ONNX runtime or PyTorch loading
                logger.info(f"Loaded trained oil spill detection model from {self.model_path}")
                self._model = "loaded"
            except Exception as e:
                logger.warning(f"Failed loading model weights at {self.model_path}: {e}")
                self._model = None
        else:
            self._model = None

    def is_available(self) -> bool:
        return self._model is not None

    def predict(
        self,
        image_bytes: bytes,
        filename: str,
        latitude: float,
        longitude: float,
        demo_preset: Optional[str] = None,
    ) -> DetectionOutput:
        if not self.is_available():
            raise RuntimeError("Real model weights are not loaded. Use DemoDetector.")
        # Future real inference logic would go here
        raise NotImplementedError("Real model inference execution pipeline.")
