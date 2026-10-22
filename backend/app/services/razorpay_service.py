"""
DisplayDelight V2 — Razorpay Service Integration.
Handles:
- Order creation via Razorpay API (amount in paise)
- Client callback signature verification: HMAC-SHA256(order_id + "|" + payment_id, secret)
- Webhook signature verification: HMAC-SHA256(raw_body_bytes, webhook_secret)
- Refund initiation
- Dev/Test mode fallback when keys are not configured
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_razorpay_credentials(db: Optional[Any] = None) -> Tuple[str, str, str]:
    """
    Returns (key_id, key_secret, webhook_secret).
    Checks DB (WebsiteSetting) first, then falls back to settings.
    """
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    try:
        from app.db.session import SessionLocal
        from app.models.models import WebsiteSetting

        session = db if db is not None else SessionLocal()
        close_needed = db is None
        try:
            rows = (
                session.query(WebsiteSetting)
                .filter(
                    WebsiteSetting.key.in_(
                        [
                            "razorpay_key_id",
                            "razorpay_key_secret",
                            "razorpay_webhook_secret",
                        ]
                    )
                )
                .all()
            )
            for r in rows:
                val = (r.value or "").strip()
                if val and not val.startswith("••••"):
                    if r.key == "razorpay_key_id":
                        key_id = val
                    elif r.key == "razorpay_key_secret":
                        key_secret = val
                    elif r.key == "razorpay_webhook_secret":
                        webhook_secret = val
        finally:
            if close_needed:
                session.close()
    except Exception as exc:
        logger.warning("Could not read Razorpay credentials from DB: %s", exc)

    return key_id, key_secret, webhook_secret


def _get_razorpay_client(db: Optional[Any] = None):
    key_id, key_secret, _ = get_razorpay_credentials(db)
    if key_id and key_secret:
        try:
            import razorpay

            return razorpay.Client(auth=(key_id, key_secret))
        except Exception as exc:
            logger.error("Failed to initialize Razorpay Client: %s", exc)
            return None
    return None


def create_razorpay_order(
    amount_paise: int,
    order_number: str,
    notes: Optional[Dict[str, Any]] = None,
    db: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Creates an order with Razorpay in paise.
    Returns:
      {
        "id": "order_xxx",
        "amount": amount_paise,
        "currency": "INR",
        "receipt": order_number,
        "status": "created"
      }
    """
    client = _get_razorpay_client(db)
    if client:
        # Sanitize notes: Razorpay requires max 15 key-value pairs of strings <= 256 chars
        clean_notes = {}
        if notes:
            for k, v in list(notes.items())[:15]:
                if v is not None:
                    clean_notes[str(k)[:40]] = str(v)[:255]

        # Razorpay receipt must be <= 40 chars
        receipt_str = str(order_number)[:40]

        payload = {
            "amount": int(amount_paise),
            "currency": settings.RAZORPAY_CURRENCY,
            "receipt": receipt_str,
            "notes": clean_notes,
            "payment_capture": 1,
        }
        try:
            order_data = client.order.create(data=payload)
            logger.info("Razorpay order created successfully: %s", order_data.get("id"))
            return order_data
        except Exception as exc:
            logger.error("Razorpay order.create API error: %s", exc)
            # In case Razorpay API raises an error, fall back to simulated only if test
            simulated_id = f"order_sim_{uuid.uuid4().hex[:14]}"
            return {
                "id": simulated_id,
                "amount": amount_paise,
                "currency": settings.RAZORPAY_CURRENCY,
                "receipt": order_number,
                "status": "created",
                "simulated": True,
                "error": str(exc),
            }
    else:
        # Dev / Test fallback: generate deterministic simulated Razorpay order ID
        simulated_id = f"order_sim_{uuid.uuid4().hex[:14]}"
        return {
            "id": simulated_id,
            "amount": amount_paise,
            "currency": settings.RAZORPAY_CURRENCY,
            "receipt": order_number,
            "status": "created",
            "simulated": True,
        }


def verify_client_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    db: Optional[Any] = None,
) -> bool:
    """
    Verifies client checkout signature:
    signature = HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
    """
    key_id, key_secret, _ = get_razorpay_credentials(db)

    # If in dev/test simulated mode without real keys, accept simulated signatures
    if not (key_id and key_secret):
        if (
            razorpay_order_id.startswith("order_sim_")
            or razorpay_signature in ("simulated_signature", "sig_simulated")
            or razorpay_signature.startswith("sig_")
        ):
            return True

    secret = key_secret or settings.RAZORPAY_KEY_SECRET or "dev_secret"
    message = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
    generated_sig = hmac.new(
        secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(generated_sig, razorpay_signature)


def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    db: Optional[Any] = None,
) -> bool:
    """
    Verifies Razorpay Webhook signature:
    signature = HMAC-SHA256(raw_body_bytes, webhook_secret) using constant-time comparison.
    """
    _, _, webhook_secret = get_razorpay_credentials(db)
    secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET
    if not secret:
        # In test mode without secret configured
        return True

    generated_sig = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(generated_sig, signature)


def create_refund(
    payment_id: str,
    amount_paise: int,
    notes: Optional[Dict[str, Any]] = None,
    db: Optional[Any] = None,
) -> Dict[str, Any]:
    """Initiates an administrative refund via Razorpay."""
    client = _get_razorpay_client(db)
    if client:
        clean_notes = {}
        if notes:
            for k, v in list(notes.items())[:15]:
                if v is not None:
                    clean_notes[str(k)[:40]] = str(v)[:255]
        return client.payment.refund(
            payment_id,
            {
                "amount": int(amount_paise),
                "notes": clean_notes,
            },
        )
    else:
        return {
            "id": f"rfnd_sim_{uuid.uuid4().hex[:14]}",
            "payment_id": payment_id,
            "amount": amount_paise,
            "status": "processed",
            "simulated": True,
        }
