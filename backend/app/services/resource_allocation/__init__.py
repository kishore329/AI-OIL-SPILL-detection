"""
Module 16 — Response Resource Allocation Services.
"""
from app.services.resource_allocation.scoring_engine import ResourceAllocationEngine
from app.services.resource_allocation.service import ResourceAllocationService

__all__ = [
    "ResourceAllocationEngine",
    "ResourceAllocationService",
]
