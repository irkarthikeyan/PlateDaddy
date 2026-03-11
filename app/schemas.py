from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class VehicleRegister(BaseModel):
    plate_number: str
    owner_name: str
    owner_email: str
    stripe_payment_method_id: str


class VehicleResponse(BaseModel):
    id: int
    plate_number: str
    owner_name: str
    owner_email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanRequest(BaseModel):
    amount: Optional[int] = None  # cents, uses default if not provided


class ChargePlateRequest(BaseModel):
    plate_number: str
    amount: Optional[int] = None  # cents, uses default if not provided


class ScanResponse(BaseModel):
    plate_number: str
    confidence: float
    owner_name: str
    transaction_status: str
    amount: int
    message: str


class TransactionResponse(BaseModel):
    id: int
    plate_number: str
    amount: int
    currency: str
    status: str
    confidence: Optional[float]
    stripe_payment_intent_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlateDetectionResult(BaseModel):
    plate_number: str
    confidence: float
    bbox: Optional[List[List[int]]] = None
    is_registered: Optional[bool] = None


class PlateDetectedEvent(BaseModel):
    plate_number: str
    confidence: float
    timestamp: str
    is_registered: bool
