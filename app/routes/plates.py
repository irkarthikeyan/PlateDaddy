from typing import List

import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Vehicle
from app.schemas import VehicleRegister, VehicleResponse
from app.services import payment

router = APIRouter(prefix="/plates", tags=["plates"])


@router.post("/create-setup-intent")
def create_setup_intent():
    """Create a Stripe SetupIntent for collecting payment method via Elements."""
    stripe.api_key = settings.STRIPE_SECRET_KEY
    intent = stripe.SetupIntent.create(payment_method_types=["card"])
    return {"client_secret": intent.client_secret}


@router.post("/register", response_model=VehicleResponse)
def register_vehicle(data: VehicleRegister, db: Session = Depends(get_db)):
    """Register a vehicle's plate number with a payment method."""
    # Check if plate already registered
    existing = db.query(Vehicle).filter(Vehicle.plate_number == data.plate_number.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plate number already registered")

    # Create Stripe customer
    customer_id = payment.create_customer(data.owner_name, data.owner_email)

    # Attach payment method (returns the real pm_ ID)
    actual_pm_id = payment.attach_payment_method(customer_id, data.stripe_payment_method_id)

    # Save to database
    vehicle = Vehicle(
        plate_number=data.plate_number.upper(),
        owner_name=data.owner_name,
        owner_email=data.owner_email,
        stripe_customer_id=customer_id,
        stripe_payment_method_id=actual_pm_id,
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle


@router.get("/", response_model=List[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    """List all registered vehicles."""
    return db.query(Vehicle).filter(Vehicle.is_active).all()


@router.get("/{plate_number}", response_model=VehicleResponse)
def get_vehicle(plate_number: str, db: Session = Depends(get_db)):
    """Get a specific vehicle by plate number."""
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == plate_number.upper(), Vehicle.is_active)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.delete("/{plate_number}")
def deactivate_vehicle(plate_number: str, db: Session = Depends(get_db)):
    """Deactivate a vehicle registration."""
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.plate_number == plate_number.upper(), Vehicle.is_active)
        .first()
    )
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    vehicle.is_active = False
    db.commit()
    return {"message": f"Vehicle {plate_number.upper()} deactivated"}
