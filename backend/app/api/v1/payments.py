"""
DisplayDelight V2 — Payments & Razorpay Webhooks.
Handles:
- Client checkout verification callback
- Authoritative Razorpay Webhook with HMAC-SHA256 raw-body validation & idempotency
- Real-time polling status endpoint: GET /orders/:reference/status
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.exceptions import NotFoundError, PaymentError, ValidationError
from app.models.models import (
    Inventory,
    Order,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    PaymentWebhookEvent,
)
from app.schemas.schemas import PaymentStatusOut, RazorpayVerifyRequest
from app.services.notifications import notify
from app.services.razorpay_service import verify_client_signature, verify_webhook_signature


router = APIRouter(tags=["Payments"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/payments/verify", summary="Verify Razorpay client payment signature")
def verify_payment(
    payload: RazorpayVerifyRequest,
    db: Session = Depends(get_db),
):
    # 1. Verify client signature
    is_valid = verify_client_signature(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
        db=db,
    )
    if not is_valid:
        raise PaymentError("Invalid Razorpay payment signature.")

    # 2. Look up Order and Payment
    order = db.query(Order).filter(Order.reference == payload.order_reference.strip().upper()).first()
    if not order:
        raise NotFoundError("Order reference not found.")

    payment = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.razorpay_order_id == payload.razorpay_order_id,
    ).first()

    if not payment:
        payment = Payment(
            order_id=order.id,
            razorpay_order_id=payload.razorpay_order_id,
            amount_paise=order.total_paise,
            currency="INR",
            status=PaymentStatus.created,
        )
        db.add(payment)

    # 3. Update payment details
    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentStatus.captured
    payment.paid_at = _now_iso()

    # 4. If order was pending_payment, advance based on whether details are provided
    if order.status == OrderStatus.pending_payment:
        has_full_details = bool(
            order.customer_email
            and "@" in order.customer_email
            and order.billing_address
            and order.billing_address not in ("{}", "", None)
            and order.customer_name
            and order.customer_name.strip() not in ("Customer", "Guest", "")
        )

        if has_full_details:
            order.status = OrderStatus.paid
            event_note = f"Payment confirmed via Razorpay payment ID {payload.razorpay_payment_id}."
        else:
            order.status = OrderStatus.paid_details_pending
            event_note = f"Payment confirmed via Razorpay payment ID {payload.razorpay_payment_id}. Awaiting customer shipping & contact details."

        # Deduct reserved inventory into sold inventory
        for item in order.items:
            inv = None
            if item.variant_id:
                inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
            elif item.product_id:
                inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
            if inv and inv.track_stock:
                inv.quantity = max(0, inv.quantity - item.quantity)
                inv.reserved = max(0, inv.reserved - item.quantity)

        # Log timeline event
        event = OrderStatusHistory(
            order_id=order.id,
            status=order.status.value,
            note=event_note,
            changed_at=_now_iso(),
            changed_by="razorpay_callback",
        )
        db.add(event)

        # Dispatch notification if full details already present
        if order.status == OrderStatus.paid and order.customer_email and "@" in order.customer_email:
            notify(
                db=db,
                event_type="payment_confirmed",
                recipient_email=order.customer_email,
                context={
                    "customer_name": order.customer_name,
                    "order_number": order.reference,
                    "total_rupees": f"{order.total_paise / 100:.2f}",
                    "tracking_token": order.tracking_token,
                },
                user_id=order.user_id,
                resource_type="order",
                resource_id=order.id,
            )

        # Clear user's server cart upon confirmed payment
        if order.user_id:
            from app.models.models import Cart
            user_cart = db.query(Cart).filter(Cart.user_id == order.user_id).first()
            if user_cart and user_cart.items:
                for line in user_cart.items:
                    db.delete(line)
                user_cart.coupon_code = None

    db.commit()

    return {
        "status": "success",
        "order_reference": order.reference,
        "payment_status": "captured",
        "order_status": order.status.value,
        "details_pending": order.status == OrderStatus.paid_details_pending,
    }


@router.get("/orders/{reference}/status", response_model=PaymentStatusOut, summary="Poll order and payment status")
def get_order_status(
    reference: str,
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.reference == reference.strip().upper()).first()
    if not order:
        raise NotFoundError("Order not found.")

    latest_payment = (
        db.query(Payment)
        .filter(Payment.order_id == order.id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    p_status = latest_payment.status.value if latest_payment else "created"

    return PaymentStatusOut(
        order_reference=order.reference,
        payment_status=p_status,
        order_status=order.status.value,
        total_amount_inr=round(order.total_paise / 100.0, 2),
        customer_name=order.customer_name,
        paid_at=latest_payment.paid_at if latest_payment else None,
    )


@router.post("/webhooks/razorpay", summary="Authoritative Razorpay Webhook receiver")
@router.post("/payments/webhook", summary="Authoritative Razorpay Webhook receiver alias")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """
    Authoritative server-side webhook handler:
    1. Reads raw bytes to verify HMAC-SHA256 signature
    2. Enforces idempotency via payment_webhook_events table
    3. Handles payment.captured, payment.failed, and order.paid
    """
    raw_body = await request.body()

    # 1. Verify webhook signature
    if x_razorpay_signature:
        if not verify_webhook_signature(raw_body, x_razorpay_signature, db=db):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Invalid webhook signature."},
            )

    try:
        data = json.loads(raw_body.decode("utf-8"))
    except Exception:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"error": "Invalid JSON."})

    event_id = data.get("event_id") or data.get("id") or str(uuid.uuid4())
    event_type = data.get("event")

    # 2. Idempotency check
    existing = db.query(PaymentWebhookEvent).filter(PaymentWebhookEvent.razorpay_event_id == event_id).first()
    if existing:
        return {"status": "ok", "message": "Event already processed."}

    webhook_record = PaymentWebhookEvent(
        razorpay_event_id=event_id,
        event_type=event_type or "unknown",
        payload_hash=hashlib.sha256(raw_body).hexdigest(),
        processed_at=_now_iso(),
    )
    db.add(webhook_record)

    # 3. Handle event types
    payload_entity = data.get("payload", {}).get("payment", {}).get("entity", {})
    razorpay_order_id = payload_entity.get("order_id")
    razorpay_payment_id = payload_entity.get("id")
    amount = payload_entity.get("amount")

    if razorpay_order_id:
        payment = db.query(Payment).filter(Payment.razorpay_order_id == razorpay_order_id).first()
        if payment:
            webhook_record.payment_id = payment.id
            order = payment.order
            if event_type in ("payment.captured", "order.paid"):
                payment.status = PaymentStatus.captured
                payment.razorpay_payment_id = razorpay_payment_id
                payment.paid_at = _now_iso()

                if order.status == OrderStatus.pending_payment:
                    has_full_details = bool(
                        order.customer_email
                        and "@" in order.customer_email
                        and order.billing_address
                        and order.billing_address not in ("{}", "", None)
                        and order.customer_name
                        and order.customer_name.strip() not in ("Customer", "Guest", "")
                    )
                    order.status = OrderStatus.paid if has_full_details else OrderStatus.paid_details_pending
                    event_note = (
                        f"Payment captured via webhook ({event_type}). Payment ID: {razorpay_payment_id}."
                        if has_full_details
                        else f"Payment captured via webhook ({event_type}). Payment ID: {razorpay_payment_id}. Awaiting customer shipping & contact details."
                    )

                    # Deduct stock
                    for item in order.items:
                        inv = None
                        if item.variant_id:
                            inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
                        elif item.product_id:
                            inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
                        if inv and inv.track_stock:
                            inv.quantity = max(0, inv.quantity - item.quantity)
                            inv.reserved = max(0, inv.reserved - item.quantity)

                    event = OrderStatusHistory(
                        order_id=order.id,
                        status=order.status.value,
                        note=event_note,
                        changed_at=_now_iso(),
                        changed_by="razorpay_webhook",
                    )
                    db.add(event)

                    if order.status == OrderStatus.paid and order.customer_email and "@" in order.customer_email:
                        notify(
                            db=db,
                            event_type="payment_confirmed",
                            recipient_email=order.customer_email,
                            context={
                                "customer_name": order.customer_name,
                                "order_number": order.reference,
                                "total_rupees": f"{order.total_paise / 100:.2f}",
                                "tracking_token": order.tracking_token,
                            },
                            user_id=order.user_id,
                            resource_type="order",
                            resource_id=order.id,
                        )

            elif event_type == "payment.failed":
                payment.status = PaymentStatus.failed
                event = OrderStatusHistory(
                    order_id=order.id,
                    status=order.status.value,
                    note=f"Payment failed ({payload_entity.get('error_description', 'transaction declined')}).",
                    changed_at=_now_iso(),
                    changed_by="razorpay_webhook",
                )
                db.add(event)

    db.commit()
    return {"status": "ok"}
