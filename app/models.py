from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plate_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    owner_name: Mapped[str] = mapped_column(String, nullable=False)
    owner_email: Mapped[str] = mapped_column(String, nullable=False)
    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=False)
    stripe_payment_method_id: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plate_number: Mapped[str] = mapped_column(String, index=True, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # cents
    currency: Mapped[str] = mapped_column(String, default="usd")
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, success, failed
    confidence: Mapped[float] = mapped_column(Float, nullable=True)  # LPR confidence
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
