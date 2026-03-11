from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/stripe-key")
def get_stripe_public_key():
    """Return the Stripe publishable key for frontend use."""
    return {"publishable_key": settings.STRIPE_PUBLIC_KEY}
