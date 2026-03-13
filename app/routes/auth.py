from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Store
from app.schemas import AuthResponse, StoreLoginPayload, StoreRegisterPayload, StoreResponse
from app.services.auth_service import (
    create_access_token,
    get_current_store,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(data: StoreRegisterPayload, db: Session = Depends(get_db)):
    """Register a new store with email and password."""
    # Check email uniqueness
    existing = db.query(Store).filter(Store.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check store name uniqueness
    existing_name = db.query(Store).filter(Store.name == data.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Store name already taken")

    store = Store(
        name=data.name,
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        visit_threshold=data.visit_threshold or 10,
        reward_amount_cents=data.reward_amount_cents or 500,
    )
    db.add(store)
    db.commit()
    db.refresh(store)

    token = create_access_token(store.id, store.name)
    return AuthResponse(access_token=token, store=StoreResponse.model_validate(store))


@router.post("/login", response_model=AuthResponse)
def login(data: StoreLoginPayload, db: Session = Depends(get_db)):
    """Login with email and password, returns a JWT."""
    store = db.query(Store).filter(Store.email == data.email.lower()).first()
    if not store or not store.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(data.password, store.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not store.is_active:
        raise HTTPException(status_code=403, detail="Store account is inactive")

    token = create_access_token(store.id, store.name)
    return AuthResponse(access_token=token, store=StoreResponse.model_validate(store))


@router.get("/me", response_model=StoreResponse)
def me(current_store: Store = Depends(get_current_store)):
    """Return the currently authenticated store."""
    return current_store
