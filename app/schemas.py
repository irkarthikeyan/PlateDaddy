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
    store_id: Optional[int] = None
    apply_credit: Optional[bool] = False


class ScanResponse(BaseModel):
    plate_number: str
    confidence: float
    owner_name: str
    transaction_status: str
    amount: int
    message: str
    # Membership fields — present only when store_id was provided
    credit_applied_cents: Optional[int] = None
    total_visits: Optional[int] = None
    credit_balance_cents: Optional[int] = None
    reward_earned: Optional[bool] = None


class TransactionResponse(BaseModel):
    id: int
    plate_number: str
    amount: int
    currency: str
    status: str
    confidence: Optional[float]
    stripe_payment_intent_id: Optional[str]
    store_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StoreCreate(BaseModel):
    name: str
    visit_threshold: Optional[int] = 10
    reward_amount_cents: Optional[int] = 500


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    visit_threshold: Optional[int] = None
    reward_amount_cents: Optional[int] = None
    is_active: Optional[bool] = None


class StoreResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    visit_threshold: int
    reward_amount_cents: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StoreRegisterPayload(BaseModel):
    name: str
    email: str
    password: str
    visit_threshold: Optional[int] = 10
    reward_amount_cents: Optional[int] = 500


class StoreLoginPayload(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    store: StoreResponse


class MembershipResponse(BaseModel):
    id: int
    plate_number: str
    store_id: int
    total_visits: int
    credit_balance_cents: int
    updated_at: datetime

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
