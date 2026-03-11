from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction
from app.schemas import TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    plate_number: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List transactions, optionally filtered by plate number or status."""
    query = db.query(Transaction)
    if plate_number:
        query = query.filter(Transaction.plate_number == plate_number.upper())
    if status:
        query = query.filter(Transaction.status == status)
    return query.order_by(Transaction.created_at.desc()).limit(limit).all()
