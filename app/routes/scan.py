from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Transaction, Vehicle
from app.schemas import ChargePlateRequest, ScanResponse
from app.services import payment
from app.services.lpr import detect_plate

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/", response_model=ScanResponse)
async def scan_plate(image: UploadFile, amount: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Scan a license plate image and process payment.

    Upload an image of a license plate. The system will:
    1. Detect and read the plate number
    2. Look up the registered vehicle
    3. Charge the associated payment method
    """
    # Read image
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    # Detect plate
    result = detect_plate(image_bytes)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Could not detect a license plate in the image",
        )

    # Look up vehicle
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == result.plate_number, Vehicle.is_active)
        .first()
    )
    if not vehicle:
        # Log failed scan
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

    # Charge
    charge_amount = amount or settings.DEFAULT_CHARGE_AMOUNT
    txn = Transaction(
        plate_number=result.plate_number,
        amount=charge_amount,
        currency=settings.DEFAULT_CURRENCY,
        status="pending",
        confidence=result.confidence,
    )
    db.add(txn)
    db.commit()

    try:
        pi = payment.charge_customer(
            customer_id=vehicle.stripe_customer_id,
            payment_method_id=vehicle.stripe_payment_method_id,
            amount=charge_amount,
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
            amount=charge_amount,
            message=f"Payment of ${charge_amount / 100:.2f} processed for {vehicle.owner_name}",
        )

    except Exception as e:
        txn.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=402,
            detail=f"Payment failed for plate {result.plate_number}: {str(e)}",
        )


@router.post("/detect")
async def detect_only(image: UploadFile):
    """Detect a plate number without processing payment. Useful for testing LPR."""
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    result = detect_plate(image_bytes)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Could not detect a license plate in the image",
        )

    return result


@router.post("/charge-plate", response_model=ScanResponse)
def charge_plate(data: ChargePlateRequest, db: Session = Depends(get_db)):
    """
    Charge a registered vehicle by plate number (no image needed).
    Used when the plate is already detected from the live camera feed.
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

    txn = Transaction(
        plate_number=plate,
        amount=charge_amount,
        currency=settings.DEFAULT_CURRENCY,
        status="pending",
    )
    db.add(txn)
    db.commit()

    try:
        pi = payment.charge_customer(
            customer_id=vehicle.stripe_customer_id,
            payment_method_id=vehicle.stripe_payment_method_id,
            amount=charge_amount,
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
            amount=charge_amount,
            message=f"Payment of ${charge_amount / 100:.2f} processed for {vehicle.owner_name}",
        )

    except Exception as e:
        txn.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=402,
            detail=f"Payment failed for plate {plate}: {str(e)}",
        )
