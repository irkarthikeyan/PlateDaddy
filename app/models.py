from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
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
    store_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("stores.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    visit_threshold: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    reward_amount_cents: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plate_number: Mapped[str] = mapped_column(String, index=True, nullable=False)
    store_id: Mapped[int] = mapped_column(Integer, ForeignKey("stores.id"), nullable=False)
    total_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    credit_balance_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("plate_number", "store_id", name="uq_membership_plate_store"),
    )


class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    membership_id: Mapped[int] = mapped_column(Integer, ForeignKey("memberships.id"), nullable=False)
    delta_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # positive=earned, negative=applied
    reason: Mapped[str] = mapped_column(String, nullable=False)  # "reward_earned" | "credit_applied"
    transaction_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("transactions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
