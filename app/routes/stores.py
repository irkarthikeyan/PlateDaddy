from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Membership, Store
from app.schemas import MembershipResponse, StoreCreate, StoreResponse, StoreUpdate
from app.services.auth_service import get_current_store

router = APIRouter(prefix="/stores", tags=["stores"])


@router.post("/", response_model=StoreResponse, status_code=201)
def create_store(data: StoreCreate, db: Session = Depends(get_db)):
    """Create a new store with configurable membership points settings."""
    existing = db.query(Store).filter(Store.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Store name already exists")
    store = Store(
        name=data.name,
        visit_threshold=data.visit_threshold or 10,
        reward_amount_cents=data.reward_amount_cents or 500,
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/", response_model=List[StoreResponse])
def list_stores(db: Session = Depends(get_db)):
    """List all active stores."""
    return db.query(Store).filter(Store.is_active).all()


@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    """Get a store by ID."""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.patch("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    data: StoreUpdate,
    db: Session = Depends(get_db),
    current_store: Store = Depends(get_current_store),
):
    """Update store configuration (name, visit threshold, reward amount, active status). Requires auth."""
    if current_store.id != store_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this store")
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if data.name is not None:
        store.name = data.name
    if data.visit_threshold is not None:
        store.visit_threshold = data.visit_threshold
    if data.reward_amount_cents is not None:
        store.reward_amount_cents = data.reward_amount_cents
    if data.is_active is not None:
        store.is_active = data.is_active
    db.commit()
    db.refresh(store)
    return store


@router.get("/{store_id}/memberships", response_model=List[MembershipResponse])
def list_memberships(store_id: int, db: Session = Depends(get_db)):
    """List all membership accounts for a store."""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return db.query(Membership).filter(Membership.store_id == store_id).all()


@router.get("/{store_id}/memberships/{plate_number}", response_model=MembershipResponse)
def get_membership(store_id: int, plate_number: str, db: Session = Depends(get_db)):
    """Get the membership account for a specific plate at a store."""
    membership = (
        db.query(Membership)
        .filter(
            Membership.store_id == store_id,
            Membership.plate_number == plate_number.upper(),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    return membership
