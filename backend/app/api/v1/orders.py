"""
Orders router — customer-facing order listing, detail, tracking.
Admin order management is in admin/orders.py.
"""
from __future__ import annotations

import hashlib
import json
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.db.session import get_db
from app.models.models import (
    Coupon,
    Inventory,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    Product,
    User,
)
from app.schemas.schemas import (
    CheckoutRequest,
    OrderOut,
    OrderTrackRequest,
    OrderTrackOut,
    PaginatedResponse,
    PostPaymentDetailsIn,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
)
from app.services.notifications import notify
from app.services.pricing import (
    apply_coupon_discount,
    calculate_gst,
    calculate_shipping,
    compute_price_breakdown,
    validate_coupon,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def _gen_reference() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(6))
    return f"DD-{suffix}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _order_to_out(order: Order) -> OrderOut:
    billing = json.loads(order.billing_address) if order.billing_address else None
    shipping = json.loads(order.shipping_address) if order.shipping_address else None
    items_out = []
    for it in order.items:
        cfg = json.loads(it.configuration) if it.configuration else None
        items_out.append({
            "id": it.id,
            "product_id": it.product_id,
            "product_name": it.product_name,
            "product_sku": it.product_sku,
            "variant_name": it.variant_name,
            "quantity": it.quantity,
            "unit_price_paise": it.unit_price_paise,
            "total_paise": it.total_paise,
            "configuration": cfg,
            "artwork_url": it.artwork_url,
        })
    history_out = [
        {
            "status": h.status,
            "note": h.note,
            "changed_at": h.changed_at,
            "changed_by": h.changed_by,
        }
        for h in order.status_history
    ]
    return OrderOut(
        id=order.id,
        reference=order.reference,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        status=order.status.value,
        subtotal_paise=order.subtotal_paise,
        discount_paise=order.discount_paise,
        gst_paise=order.gst_paise,
        shipping_paise=order.shipping_paise,
        total_paise=order.total_paise,
        gst_rate=order.gst_rate,
        coupon_code=order.coupon_code,
        company_name=order.company_name,
        gstin=order.gstin,
        items=items_out,
        status_history=history_out,
        billing_address=billing,
        shipping_address=shipping,
        created_at=order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
    )


# ── Customer order listing ────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse)
def list_my_orders(
    page: int = 1,
    page_size: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Order).filter(
        or_(
            Order.user_id == user.id,
            func.lower(Order.customer_email) == func.lower(user.email),
        )
    )
    total = q.count()
    orders = (
        q.options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(
        items=[_order_to_out(o) for o in orders],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_my_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .filter((Order.id == order_id) | (Order.reference == order_id.upper().strip()))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found.")
    if order.user_id != user.id and (not order.customer_email or order.customer_email.lower() != user.email.lower()):
        raise ForbiddenError()
    return _order_to_out(order)


# ── Tracking & Public Status ──────────────────────────────────────────

@router.get("/{reference}/status", summary="Public order status for checkout confirmation and guest tracking")
def get_order_public_status(reference: str, db: Session = Depends(get_db)):
    ref = reference.upper().strip()
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payments),
        )
        .filter((Order.reference == ref) | (Order.id == reference))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found.")

    items_out = []
    for it in order.items:
        items_out.append({
            "id": it.id,
            "name": it.product_name,
            "product_name": it.product_name,
            "sku": it.product_sku,
            "product_sku": it.product_sku,
            "variant_name": it.variant_name,
            "qty": it.quantity,
            "quantity": it.quantity,
            "price": round((it.unit_price_paise or 0) / 100),
            "unit_price_paise": it.unit_price_paise,
            "total_paise": it.total_paise,
            "artwork_url": it.artwork_url,
        })

    history_out = [
        {"status": h.status, "note": h.note, "changed_at": h.changed_at, "changed_by": h.changed_by}
        for h in order.status_history
    ]
    shipment = json.loads(order.shipment_info) if order.shipment_info else None
    shipping_addr = json.loads(order.shipping_address) if order.shipping_address else None
    billing_addr = json.loads(order.billing_address) if order.billing_address else None
    latest_pay = order.payments[0] if order.payments else None

    return {
        "id": order.id,
        "reference": order.reference,
        "order_reference": order.reference,
        "status": order.status.value,
        "order_status": order.status.value,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "items_count": len(order.items),
        "total_paise": order.total_paise,
        "total_amount_inr": round((order.total_paise or 0) / 100),
        "payment_status": latest_pay.status.value if latest_pay else "created",
        "created_at": order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
        "shipment_info": shipment,
        "shipping_address": shipping_addr,
        "billing_address": billing_addr,
        "status_history": history_out,
        "items": items_out,
    }


@router.get("/{reference}/invoice", summary="Get Tax Invoice breakdown and legal billing document")
def get_order_invoice(reference: str, db: Session = Depends(get_db)):
    ref = reference.upper().strip()
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
        )
        .filter((Order.reference == ref) | (Order.id == ref))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found for invoice generation.")

    shipping = json.loads(order.shipping_address) if order.shipping_address else {}
    billing = json.loads(order.billing_address) if order.billing_address else shipping
    latest_pay = order.payments[0] if order.payments else None

    buyer_state = billing.get("state") or shipping.get("state") or "Tamil Nadu"
    is_intra_state = "tamil" in buyer_state.lower()

    subtotal_inr = round((order.subtotal_paise or 0) / 100)
    gst_inr = round((order.gst_paise or 0) / 100)
    shipping_inr = round((order.shipping_paise or 0) / 100)
    discount_inr = round((order.discount_paise or 0) / 100)
    total_inr = round((order.total_paise or 0) / 100)

    cgst_inr = round(gst_inr / 2) if is_intra_state else 0
    sgst_inr = gst_inr - cgst_inr if is_intra_state else 0
    igst_inr = gst_inr if not is_intra_state else 0

    items_invoice = []
    for idx, it in enumerate(order.items, 1):
        line_total_inr = round((it.total_paise or 0) / 100)
        line_taxable = round(line_total_inr / 1.18)
        line_tax = line_total_inr - line_taxable
        items_invoice.append({
            "sl_no": idx,
            "product_name": it.product_name,
            "product_sku": it.product_sku,
            "hsn_sac": "85285900",
            "quantity": it.quantity,
            "unit_price_inr": round((it.unit_price_paise or 0) / 100),
            "taxable_amount_inr": line_taxable,
            "gst_rate_percent": 18,
            "cgst_amount_inr": round(line_tax / 2) if is_intra_state else 0,
            "sgst_amount_inr": (line_tax - round(line_tax / 2)) if is_intra_state else 0,
            "igst_amount_inr": line_tax if not is_intra_state else 0,
            "total_inr": line_total_inr,
        })

    return {
        "invoice_number": f"INV-2026-{order.reference.replace('DD-', '')}",
        "invoice_date": order.created_at.strftime("%d-%b-%Y") if hasattr(order.created_at, "strftime") else str(order.created_at)[:10],
        "order_reference": order.reference,
        "payment_reference": latest_pay.provider_payment_id if latest_pay else "N/A",
        "payment_status": latest_pay.status.value if latest_pay else ("PAID" if order.status == OrderStatus.paid else "PENDING"),
        "place_of_supply": buyer_state,
        "seller": {
            "legal_name": "DisplayDelight Commercial Signage Solutions Pvt. Ltd.",
            "brand_name": "DisplayDelight",
            "gstin": "33AABCD1234E1Z5",
            "pan": "AABCD1234E",
            "state": "Tamil Nadu (Code: 33)",
            "address": "Plot 42, Guindy Industrial Estate, Guindy, Chennai, Tamil Nadu - 600032",
            "contact_email": "support@displaydelight.com",
            "contact_phone": "+91 98403 27440",
            "cin": "U31900TN2023PTC158920",
        },
        "buyer": {
            "name": order.customer_name,
            "email": order.customer_email,
            "phone": order.customer_phone,
            "company_name": order.company_name or None,
            "gstin": order.gstin or None,
            "billing_address": billing,
            "shipping_address": shipping,
        },
        "items": items_invoice,
        "totals": {
            "taxable_value_inr": subtotal_inr,
            "cgst_inr": cgst_inr,
            "sgst_inr": sgst_inr,
            "igst_inr": igst_inr,
            "total_gst_inr": gst_inr,
            "shipping_inr": shipping_inr,
            "discount_inr": discount_inr,
            "grand_total_inr": total_inr,
        },
        "declaration": "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    }


@router.post("/track", response_model=OrderTrackOut)
def track_order(body: OrderTrackRequest, db: Session = Depends(get_db)):
    ref = (body.reference or body.order_reference or "").upper().strip()
    if not ref:
        raise ValidationError("Order reference is required.")

    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payments),
        )
        .filter((Order.reference == ref) | (Order.id == ref))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found. Check the reference and try again.")

    # Validate against email or phone if provided
    verifier = (body.email_or_phone or body.email or "").strip()
    if verifier:
        v_clean = verifier.lower().replace(" ", "").replace("-", "")
        email_clean = (order.customer_email or "").lower().replace(" ", "")
        phone_clean = (order.customer_phone or "").replace(" ", "").replace("-", "")
        
        matches_email = v_clean in email_clean or email_clean in v_clean
        matches_phone = (phone_clean and (v_clean in phone_clean or phone_clean in v_clean))
        if not (matches_email or matches_phone):
            raise NotFoundError("Order details could not be verified with the provided email or phone number.")

    items_out = []
    for it in order.items:
        items_out.append({
            "id": it.id,
            "name": it.product_name,
            "product_name": it.product_name,
            "sku": it.product_sku,
            "variant_name": it.variant_name,
            "qty": it.quantity,
            "quantity": it.quantity,
            "price": round((it.unit_price_paise or 0) / 100),
            "unit_price_paise": it.unit_price_paise,
            "total_paise": it.total_paise,
            "artwork_url": it.artwork_url,
        })

    history_out = [
        {"status": h.status, "note": h.note, "changed_at": h.changed_at, "changed_by": h.changed_by}
        for h in order.status_history
    ]
    shipment = json.loads(order.shipment_info) if order.shipment_info else None
    shipping_addr = json.loads(order.shipping_address) if order.shipping_address else None
    latest_pay = order.payments[0] if order.payments else None

    return OrderTrackOut(
        reference=order.reference,
        status=order.status.value,
        items_count=len(order.items),
        total_paise=order.total_paise,
        total_amount_inr=round((order.total_paise or 0) / 100),
        payment_status=latest_pay.status.value if latest_pay else "paid",
        created_at=order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
        shipment_info=shipment,
        shipping_address=shipping_addr,
        status_history=history_out,
        items=items_out,
    )


@router.get("/{reference}/details-pending", summary="Check if paid order requires customer delivery details")
def get_order_details_pending_status(reference: str, db: Session = Depends(get_db)):
    ref = reference.upper().strip()
    order = db.query(Order).filter((Order.reference == ref) | (Order.id == ref)).first()
    if not order:
        raise NotFoundError("Order not found.")

    is_pending = order.status == OrderStatus.paid_details_pending
    billing = json.loads(order.billing_address) if order.billing_address and order.billing_address != "{}" else None
    shipping = json.loads(order.shipping_address) if order.shipping_address and order.shipping_address != "{}" else None

    return {
        "reference": order.reference,
        "status": order.status.value,
        "total_paise": order.total_paise,
        "total_inr": round(order.total_paise / 100, 2),
        "details_pending": is_pending,
        "customer_name": order.customer_name if order.customer_name not in ("Customer", "Guest", "") else "",
        "customer_email": order.customer_email if "@" in (order.customer_email or "") else "",
        "customer_phone": order.customer_phone if order.customer_phone != "9840327440" else "",
        "company_name": order.company_name or "",
        "gstin": order.gstin or "",
        "billing_address": billing,
        "shipping_address": shipping,
    }


@router.post("/{reference}/customer-details", summary="Submit post-payment customer & delivery details")
def submit_post_payment_details(
    reference: str,
    payload: PostPaymentDetailsIn,
    db: Session = Depends(get_db),
):
    ref = reference.upper().strip()
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
        )
        .filter((Order.reference == ref) | (Order.id == ref))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found.")

    # Update customer information
    order.customer_name = payload.customer_name.strip()
    order.customer_email = payload.customer_email.lower().strip()
    order.customer_phone = payload.customer_phone.strip()
    order.billing_address = payload.billing_address.model_dump_json()
    order.shipping_address = (
        payload.shipping_address.model_dump_json()
        if payload.shipping_address
        else payload.billing_address.model_dump_json()
    )
    if payload.company_name:
        order.company_name = payload.company_name.strip()
    if payload.gstin:
        order.gstin = payload.gstin.strip().upper()
    if payload.notes:
        order.notes = payload.notes.strip()

    # Optional account creation or linking
    if payload.create_account and payload.password:
        existing = db.query(User).filter(func.lower(User.email) == order.customer_email).first()
        if not existing:
            new_user = User(
                email=order.customer_email,
                hashed_password=hash_password(payload.password),
                full_name=order.customer_name,
                phone=order.customer_phone,
                role="customer",
                is_active=True,
                is_email_verified=True,
            )
            db.add(new_user)
            db.flush()
            order.user_id = new_user.id
        else:
            order.user_id = existing.id
    elif not order.user_id:
        existing = db.query(User).filter(func.lower(User.email) == order.customer_email).first()
        if existing:
            order.user_id = existing.id

    # If the order was waiting for details, promote to confirmed paid
    if order.status == OrderStatus.paid_details_pending:
        order.status = OrderStatus.paid

    # Append status history log
    event = OrderStatusHistory(
        order_id=order.id,
        status=order.status.value,
        note="Customer delivery & contact details recorded. Order confirmed.",
        changed_at=_now_iso(),
        changed_by="customer",
    )
    db.add(event)

    # Dispatch notification email
    if order.customer_email and "@" in order.customer_email:
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

    db.commit()

    return {
        "status": "success",
        "order_reference": order.reference,
        "order_status": order.status.value,
        "message": "Delivery details recorded successfully.",
        "tracking_token": order.tracking_token,
    }
