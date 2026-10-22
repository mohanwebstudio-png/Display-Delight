"""
DisplayDelight V2 — Admin Orders Management API.
Handles:
- Full orders listing with status filtering and customer search
- Order details inspection with full financial & product snapshots
- Status progression: PATCH /orders/:id/status
- Custom timeline notes: POST /orders/:id/events
- Administrative refunds: POST /orders/:id/refund via Razorpay API
All actions are logged to audit_logs.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, require_order_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import (
    Inventory,
    Order,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    User,
)
from app.schemas.schemas import OrderOut, PaginatedResponse
from app.services.notifications import notify
from app.services.razorpay_service import create_refund


router = APIRouter(prefix="/orders", tags=["Admin Orders"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", summary="Admin: List orders with filters and pagination")
def list_orders(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    q: Optional[str] = None,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    query = db.query(Order).options(selectinload(Order.items), selectinload(Order.payments))
    if status:
        query = query.filter(Order.status == status)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            Order.reference.ilike(term)
            | Order.customer_email.ilike(term)
            | Order.customer_name.ilike(term)
            | Order.customer_phone.ilike(term)
        )

    total = query.count()
    orders = (
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for o in orders:
        latest_payment = o.payments[0] if o.payments else None
        items.append({
            "id": o.id,
            "reference": o.reference,
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "customer_phone": o.customer_phone,
            "status": o.status.value,
            "payment_status": latest_payment.status.value if latest_payment else "none",
            "total_paise": o.total_paise,
            "items_count": len(o.items),
            "created_at": o.created_at.isoformat() if hasattr(o.created_at, "isoformat") else str(o.created_at),
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/{order_id}", summary="Admin: Get order full detail")
def get_order_detail(
    order_id: str,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
        .filter((Order.id == order_id) | (Order.reference == order_id))
        .first()
    )
    if not order:
        raise NotFoundError("Order not found.")

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

    payments_out = []
    for p in order.payments:
        payments_out.append({
            "id": p.id,
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "amount_paise": p.amount_paise,
            "status": p.status.value,
            "paid_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
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

    return {
        "id": order.id,
        "reference": order.reference,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "status": order.status.value,
        "subtotal_paise": order.subtotal_paise,
        "discount_paise": order.discount_paise,
        "gst_paise": order.gst_paise,
        "shipping_paise": order.shipping_paise,
        "total_paise": order.total_paise,
        "gst_rate": order.gst_rate,
        "coupon_code": order.coupon_code,
        "company_name": order.company_name,
        "gstin": order.gstin,
        "notes": order.notes,
        "billing_address": json.loads(order.billing_address) if order.billing_address else None,
        "shipping_address": json.loads(order.shipping_address) if order.shipping_address else None,
        "tracking_token": order.tracking_token,
        "shipment_info": json.loads(order.shipment_info) if order.shipment_info else None,
        "items": items_out,
        "payments": payments_out,
        "status_history": history_out,
        "created_at": order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
    }


@router.patch("/{order_id}/status", summary="Admin: Update order status")
def update_order_status(
    order_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.reference == order_id)).first()
    if not order:
        raise NotFoundError("Order not found.")

    new_status_str = payload.get("status")
    note = payload.get("note") or payload.get("notes") or f"Updated by {admin_user.email}"
    shipment_info = payload.get("shipment_info")
    carrier = payload.get("carrier")
    tracking_num = payload.get("tracking_number") or payload.get("tracking_token")

    if shipment_info and isinstance(shipment_info, dict):
        carrier = carrier or shipment_info.get("carrier")
        tracking_num = tracking_num or shipment_info.get("tracking_number") or shipment_info.get("awb") or shipment_info.get("tracking_token")

    previous_status = order.status.value
    new_status = order.status

    status_aliases = {
        "awaiting_payment": "pending_payment",
        "awaiting payment": "pending_payment",
        "pending": "pending_payment",
        "in_production": "processing",
        "production": "processing",
        "completed": "delivered",
    }

    if new_status_str:
        clean_status = str(new_status_str).strip().lower().replace(" ", "_")
        clean_status = status_aliases.get(clean_status, clean_status)
        try:
            new_status = OrderStatus(clean_status)
            order.status = new_status
        except ValueError:
            raise ValidationError(f"Invalid status '{new_status_str}'. Allowed: {[s.value for s in OrderStatus]}")

    if tracking_num:
        order.tracking_token = tracking_num

    if shipment_info:
        if isinstance(shipment_info, dict):
            existing = json.loads(order.shipment_info) if order.shipment_info else {}
            existing.update(shipment_info)
            if carrier:
                existing["carrier"] = carrier
            if tracking_num:
                existing["tracking_number"] = tracking_num
                existing["awb"] = tracking_num
            order.shipment_info = json.dumps(existing)
        else:
            order.shipment_info = json.dumps(shipment_info)
    elif carrier or tracking_num:
        existing = json.loads(order.shipment_info) if order.shipment_info else {}
        if carrier:
            existing["carrier"] = carrier
        if tracking_num:
            existing["tracking_number"] = tracking_num
            existing["awb"] = tracking_num
        order.shipment_info = json.dumps(existing)

    # If cancelling order, restore inventory
    if new_status == OrderStatus.cancelled and previous_status != "cancelled":
        for item in order.items:
            inv = None
            if item.variant_id:
                inv = db.query(Inventory).filter(Inventory.variant_id == item.variant_id).first()
            elif item.product_id:
                inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
            if inv and inv.track_stock:
                inv.quantity += item.quantity

    # Add tracking event
    event = OrderStatusHistory(
        order_id=order.id,
        status=new_status.value,
        note=note,
        changed_at=_now_iso(),
        changed_by=admin_user.email,
    )
    db.add(event)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="order.status_update",
        resource_type="order",
        resource_id=order.id,
        detail={"from": previous_status, "to": new_status.value, "note": note},
        ip_address=request.client.host if request.client else None,
    )

    # ── Notification Dispatch Based on Order Status ──
    shipment_dict: Dict[str, Any] = {}
    if order.shipment_info:
        try:
            shipment_dict = json.loads(order.shipment_info) if isinstance(order.shipment_info, str) else order.shipment_info
        except Exception:
            shipment_dict = {}

    resolved_carrier = carrier or shipment_dict.get("carrier") or "Commercial Express Logistics"
    resolved_track = tracking_num or order.tracking_token or shipment_dict.get("tracking_number") or shipment_dict.get("awb") or "Available on tracker"
    tracking_link = f"https://mohanwebstudio.online/store/#/track?ref={order.reference}"

    shipping_addr_str = "Customer registered delivery address"
    if order.shipping_address:
        try:
            s_data = json.loads(order.shipping_address) if isinstance(order.shipping_address, str) else order.shipping_address
            if isinstance(s_data, dict):
                parts = [
                    s_data.get("full_name") or s_data.get("name"),
                    s_data.get("address_line1"),
                    s_data.get("address_line2"),
                    s_data.get("city"),
                    s_data.get("state"),
                    s_data.get("pin_code") or s_data.get("postal_code"),
                ]
                formatted = ", ".join(p for p in parts if p)
                if formatted:
                    shipping_addr_str = formatted
        except Exception:
            pass

    if new_status == OrderStatus.shipped:
        notify(
            db=db,
            event_type="order_shipped",
            recipient_email=order.customer_email,
            context={
                "customer_name": order.customer_name or "Valued Customer",
                "order_number": order.reference,
                "courier_partner": resolved_carrier,
                "tracking_number": resolved_track,
                "expected_delivery": shipment_dict.get("expected_delivery") or "3-5 Business Days",
                "shipping_address": shipping_addr_str,
                "tracking_link": tracking_link,
            },
            user_id=order.user_id,
            resource_type="order",
            resource_id=order.id,
        )
    elif new_status == OrderStatus.delivered:
        notify(
            db=db,
            event_type="order_delivered",
            recipient_email=order.customer_email,
            context={
                "customer_name": order.customer_name or "Valued Customer",
                "order_number": order.reference,
                "delivery_date": datetime.now().strftime("%d %b %Y"),
                "shipping_address": shipping_addr_str,
                "tracking_link": tracking_link,
            },
            user_id=order.user_id,
            resource_type="order",
            resource_id=order.id,
        )
    else:
        notify(
            db=db,
            event_type="order_status_change",
            recipient_email=order.customer_email,
            context={
                "customer_name": order.customer_name or "Valued Customer",
                "order_number": order.reference,
                "status_label": new_status.value.replace("_", " ").title(),
                "note": note,
                "tracking_link": tracking_link,
            },
            user_id=order.user_id,
            resource_type="order",
            resource_id=order.id,
        )

    return {"status": "success", "new_status": new_status.value}


@router.post("/{order_id}/events", summary="Admin: Add timeline event or note to order")
def add_order_event(
    order_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order:
        raise NotFoundError("Order not found.")

    event = OrderStatusHistory(
        order_id=order.id,
        status=payload.get("status", order.status.value),
        note=payload.get("note", "Operational note"),
        changed_at=_now_iso(),
        changed_by=admin_user.email,
    )
    db.add(event)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="order.event_add",
        resource_type="order",
        resource_id=order.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


@router.post("/{order_id}/refund", summary="Admin: Initiate refund via Razorpay")
def refund_order(
    order_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order:
        raise NotFoundError("Order not found.")

    payment = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.status == PaymentStatus.captured,
    ).first()

    if not payment or not payment.razorpay_payment_id:
        raise ValidationError("No captured payment found for this order to refund.")

    amount_paise = payload.get("amount_paise", payment.amount_paise)
    reason = payload.get("reason", "Customer requested cancellation / refund")

    rfnd_res = create_refund(
        payment_id=payment.razorpay_payment_id,
        amount_paise=amount_paise,
        notes={"order_id": order.id, "reason": reason},
    )

    payment.status = PaymentStatus.refunded
    order.status = OrderStatus.refunded

    event = OrderStatusHistory(
        order_id=order.id,
        status="refunded",
        note=f"Refund initiated for ₹{amount_paise / 100:.2f}. Reason: {reason}.",
        changed_at=_now_iso(),
        changed_by=admin_user.email,
    )
    db.add(event)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="order.refund",
        resource_type="order",
        resource_id=order.id,
        detail={"refund_amount_paise": amount_paise, "reason": reason, "refund_id": rfnd_res.get("id")},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "refund_id": rfnd_res.get("id"), "amount_paise": amount_paise}
