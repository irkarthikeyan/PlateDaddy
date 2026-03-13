from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CreditLedger, Membership, Store, Transaction, Vehicle
from app.schemas import ChargePlateRequest, ScanResponse
from app.services import payment
from app.services.lpr import detect_plate

router = APIRouter(prefix="/scan", tags=["scan"])


def _handle_membership(
    db: Session,
    plate_number: str,
    store_id: int,
    apply_credit: bool,
    charge_amount: int,
    transaction_id: int,
) -> dict:
    """
    Upsert a Membership record, award reward credit when a visit milestone is hit,
    and optionally apply available credit to reduce the charge amount.

    Must be called inside a db.flush() context (txn.id must already be set).
    Returns a dict consumed by the calling route to build ScanResponse.
    """
    store = db.query(Store).filter(Store.id == store_id, Store.is_active).first()
    if store is None:
        return {
            "final_charge_amount": charge_amount,
            "credit_applied_cents": None,
            "total_visits": None,
            "credit_balance_cents": None,
            "reward_earned": None,
        }

    # Upsert membership for this (plate, store) pair
    membership = (
        db.query(Membership)
        .filter(Membership.plate_number == plate_number, Membership.store_id == store_id)
        .first()
    )
    if membership is None:
        membership = Membership(
            plate_number=plate_number,
            store_id=store_id,
            total_visits=0,
            credit_balance_cents=0,
        )
        db.add(membership)
        db.flush()  # populate membership.id for ledger FK

    # Increment visit count (never resets)
    membership.total_visits += 1
    reward_earned = False

    # Award reward on every Nth visit
    if membership.total_visits % store.visit_threshold == 0:
        membership.credit_balance_cents += store.reward_amount_cents
        reward_earned = True
        db.add(CreditLedger(
            membership_id=membership.id,
            delta_cents=store.reward_amount_cents,
            reason="reward_earned",
            transaction_id=transaction_id,
        ))

    # Apply available credit if requested (reward credited first, then applied)
    credit_applied = 0
    final_charge = charge_amount
    if apply_credit and membership.credit_balance_cents > 0:
        credit_applied = min(membership.credit_balance_cents, charge_amount)
        membership.credit_balance_cents -= credit_applied
        final_charge = charge_amount - credit_applied
        db.add(CreditLedger(
            membership_id=membership.id,
            delta_cents=-credit_applied,
            reason="credit_applied",
            transaction_id=transaction_id,
        ))

    return {
        "final_charge_amount": final_charge,
        "credit_applied_cents": credit_applied,
        "total_visits": membership.total_visits,
        "credit_balance_cents": membership.credit_balance_cents,
        "reward_earned": reward_earned,
    }


@router.post("/", response_model=ScanResponse)
async def scan_plate(
    image: UploadFile,
    amount: Optional[int] = None,
    store_id: Optional[int] = None,
    apply_credit: bool = False,
    db: Session = Depends(get_db),
):
    """
    Scan a license plate image and process payment.

    Upload an image of a license plate. The system will:
    1. Detect and read the plate number
    2. Look up the registered vehicle
    3. Charge the associated payment method

    Optionally pass store_id to enable membership points tracking.
    Pass apply_credit=true to deduct available store credit from the charge.
    """
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    result = detect_plate(image_bytes)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Could not detect a license plate in the image",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == result.plate_number, Vehicle.is_active)
        .first()
    )
    if not vehicle:
        txn = Transaction(
            plate_number=result.plate_number,
            amount=0,
            status="failed",
            confidence=result.confidence,
        )
        db.add(txn)
        db.commit()
        raise HTTPException(
            status_code=404,
            detail=f"No registered vehicle found for plate: {result.plate_number}",
        )

    charge_amount = amount or settings.DEFAULT_CHARGE_AMOUNT

    txn = Transaction(
        plate_number=result.plate_number,
        amount=charge_amount,
        currency=settings.DEFAULT_CURRENCY,
        status="pending",
        confidence=result.confidence,
        store_id=store_id,
    )
    db.add(txn)
    db.flush()  # get txn.id before membership processing

    membership_data = {}
    final_charge = charge_amount
    if store_id is not None:
        membership_data = _handle_membership(
            db=db,
            plate_number=result.plate_number,
            store_id=store_id,
            apply_credit=apply_credit,
            charge_amount=charge_amount,
            transaction_id=txn.id,
        )
        final_charge = membership_data["final_charge_amount"]
        txn.amount = final_charge

    try:
        pi = payment.charge_customer(
            customer_id=vehicle.stripe_customer_id,
            payment_method_id=vehicle.stripe_payment_method_id,
            amount=final_charge,
            currency=settings.DEFAULT_CURRENCY,
            description=f"PlateDaddy charge for {result.plate_number}",
        )
        txn.stripe_payment_intent_id = pi.id
        txn.status = "success" if pi.status == "succeeded" else pi.status
        db.commit()

        return ScanResponse(
            plate_number=result.plate_number,
            confidence=result.confidence,
            owner_name=vehicle.owner_name,
            transaction_status=txn.status,
            amount=final_charge,
            message=f"Payment of ${final_charge / 100:.2f} processed for {vehicle.owner_name}",
            credit_applied_cents=membership_data.get("credit_applied_cents"),
            total_visits=membership_data.get("total_visits"),
            credit_balance_cents=membership_data.get("credit_balance_cents"),
            reward_earned=membership_data.get("reward_earned"),
        )

    except Exception as e:
        db.rollback()  # undo flushed membership/ledger changes
        failed_txn = Transaction(
            plate_number=result.plate_number,
            amount=charge_amount,
            currency=settings.DEFAULT_CURRENCY,
            status="failed",
            confidence=result.confidence,
            store_id=store_id,
        )
        db.add(failed_txn)
        db.commit()
        raise HTTPException(
            status_code=402,
            detail=f"Payment failed for plate {result.plate_number}: {str(e)}",
        )


@router.post("/detect")
async def detect_only(image: UploadFile, db: Session = Depends(get_db)):
    """Detect a plate number without processing payment. Also checks registration status."""
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    result = detect_plate(image_bytes)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Could not detect a license plate in the image",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == result.plate_number, Vehicle.is_active)
        .first()
    )
    result.is_registered = vehicle is not None

    return result


@router.post("/charge-plate", response_model=ScanResponse)
def charge_plate(data: ChargePlateRequest, db: Session = Depends(get_db)):
    """
    Charge a registered vehicle by plate number (no image needed).
    Used when the plate is already detected from the live camera feed.

    Pass store_id to enable membership points tracking.
    Pass apply_credit=true to deduct available store credit from the charge.
    """
    plate = data.plate_number.upper()
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == plate, Vehicle.is_active)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail=f"No registered vehicle found for plate: {plate}",
        )

    charge_amount = data.amount or settings.DEFAULT_CHARGE_AMOUNT
    store_id = data.store_id
    apply_credit = data.apply_credit or False

    txn = Transaction(
        plate_number=plate,
        amount=charge_amount,
        currency=settings.DEFAULT_CURRENCY,
        status="pending",
        store_id=store_id,
    )
    db.add(txn)
    db.flush()  # get txn.id before membership processing

    membership_data = {}
    final_charge = charge_amount
    if store_id is not None:
        membership_data = _handle_membership(
            db=db,
            plate_number=plate,
            store_id=store_id,
            apply_credit=apply_credit,
            charge_amount=charge_amount,
            transaction_id=txn.id,
        )
        final_charge = membership_data["final_charge_amount"]
        txn.amount = final_charge

    try:
        pi = payment.charge_customer(
            customer_id=vehicle.stripe_customer_id,
            payment_method_id=vehicle.stripe_payment_method_id,
            amount=final_charge,
            currency=settings.DEFAULT_CURRENCY,
            description=f"PlateDaddy charge for {plate}",
        )
        txn.stripe_payment_intent_id = pi.id
        txn.status = "success" if pi.status == "succeeded" else pi.status
        db.commit()

        return ScanResponse(
            plate_number=plate,
            confidence=1.0,
            owner_name=vehicle.owner_name,
            transaction_status=txn.status,
            amount=final_charge,
            message=f"Payment of ${final_charge / 100:.2f} processed for {vehicle.owner_name}",
            credit_applied_cents=membership_data.get("credit_applied_cents"),
            total_visits=membership_data.get("total_visits"),
            credit_balance_cents=membership_data.get("credit_balance_cents"),
            reward_earned=membership_data.get("reward_earned"),
        )

    except Exception as e:
        db.rollback()  # undo flushed membership/ledger changes
        failed_txn = Transaction(
            plate_number=plate,
            amount=charge_amount,
            currency=settings.DEFAULT_CURRENCY,
            status="failed",
            store_id=store_id,
        )
        db.add(failed_txn)
        db.commit()
        raise HTTPException(
            status_code=402,
            detail=f"Payment failed for plate {plate}: {str(e)}",
        )
