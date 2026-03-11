import stripe

from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_customer(name: str, email: str) -> str:
    """Create a Stripe customer and return the customer ID."""
    customer = stripe.Customer.create(name=name, email=email)
    return customer.id


def attach_payment_method(customer_id: str, payment_method_id: str) -> str:
    """Attach a payment method to a customer and set it as default.

    Returns the actual payment method ID (Stripe may create a new one from tokens).
    """
    pm = stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
    actual_pm_id = pm.id
    stripe.Customer.modify(
        customer_id,
        invoice_settings={"default_payment_method": actual_pm_id},
    )
    return actual_pm_id


def charge_customer(
    customer_id: str,
    payment_method_id: str,
    amount: int,
    currency: str = "usd",
    description: str = "PlateDaddy drive-through charge",
) -> stripe.PaymentIntent:
    """
    Create and confirm a payment intent to charge the customer off-session.

    Args:
        customer_id: Stripe customer ID
        payment_method_id: Stripe payment method ID
        amount: Amount in cents
        currency: Currency code
        description: Charge description

    Returns:
        The Stripe PaymentIntent object
    """
    payment_intent = stripe.PaymentIntent.create(
        amount=amount,
        currency=currency,
        customer=customer_id,
        payment_method=payment_method_id,
        off_session=True,
        confirm=True,
        description=description,
    )
    return payment_intent
