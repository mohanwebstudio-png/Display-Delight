"""
DisplayDelight V2 — Checkout API.
Validates the cart, recalculates prices authoritatively on the server,
checks inventory reservations, creates immutable order snapshots, and
initiates Razorpay orders.
"""
from __future__ import annotations

import json
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_optional_current_user
from app.core.config import settings
from app.core.exceptions import CartError, NotFoundError, ValidationError
from app.models.models import (
    Cart,
    CartItem,
    Inventory,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    Payment,
    PaymentStatus,
    Product,
    ProductVariant,
    User,
)
from app.schemas.schemas import CheckoutRequest, RazorpayOrderResponse
from app.services.notifications import notify
from app.services.pricing import (
    compute_cart_breakdown,
    get_product_by_id_or_slug,
    get_variant_by_id_or_sku,
)
from app.services.razorpay_service import create_razorpay_order


router = APIRouter(prefix="/checkout", tags=["Checkout"])


def _generate_order_reference() -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(5))
    return f"DD-{today_str}-{suffix}"


@router.post("", response_model=RazorpayOrderResponse, summary="Create order and initiate payment")
@router.post("/instant", response_model=RazorpayOrderResponse, summary="Instant checkout alias")
def process_checkout(
    payload: CheckoutRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    # 1. Retrieve cart
    cart = None
    if current_user:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart and x_session_id:
        cart = db.query(Cart).filter(Cart.session_id == x_session_id).first()

    # 2. Extract shipping state for GST determination (Intra vs Inter state)
    shipping_state = None
    if payload.shipping_address and payload.shipping_address.state:
        shipping_state = payload.shipping_address.state
    elif payload.billing_address and payload.billing_address.state:
        shipping_state = payload.billing_address.state

    # 3. Check inventory and prepare items
    raw_items = []
    if cart and cart.items:
        for line in cart.items:
            opts = {}
            if line.options:
                try:
                    opts = json.loads(line.options) if isinstance(line.options, str) else line.options
                except Exception:
                    opts = {}

            # Stock check
            inv = None
            if line.variant_id:
                inv = db.query(Inventory).filter(Inventory.variant_id == line.variant_id).first()
            else:
                inv = db.query(Inventory).filter(Inventory.product_id == line.product_id).first()

            if inv and inv.track_stock:
                available = inv.quantity - inv.reserved
                if available < line.quantity:
                    raise ValidationError(
                        f"Insufficient stock for item in cart. Available: {max(0, available)}, requested: {line.quantity}."
                    )

            raw_items.append({
                "line_id": line.id,
                "product_id": line.product_id,
                "variant_id": line.variant_id,
                "quantity": line.quantity,
                "options": opts,
                "artwork_url": line.artwork_upload.file_url if line.artwork_upload else None,
                "artwork_upload_id": line.artwork_upload_id,
            })
    elif payload.items:
        # Fallback to items sent directly by the storefront client
        for it in payload.items:
            prod = get_product_by_id_or_slug(db, it.product_id)
            if not prod:
                continue
            variant = get_variant_by_id_or_sku(db, it.variant_id) if it.variant_id else None

            # Stock check
            inv = None
            if variant:
                inv = db.query(Inventory).filter(Inventory.variant_id == variant.id).first()
            else:
                inv = db.query(Inventory).filter(Inventory.product_id == prod.id).first()

            if inv and inv.track_stock:
                available = inv.quantity - inv.reserved
                if available < it.quantity:
                    raise ValidationError(
                        f"Insufficient stock for {prod.name}. Available: {max(0, available)}, requested: {it.quantity}."
                    )

            raw_items.append({
                "product_id": prod.id,
                "variant_id": variant.id if variant else None,
                "quantity": it.quantity,
                "options": it.options or {},
                "artwork_url": it.artwork or it.artwork_url,
            })

    if not raw_items:
        raise CartError("Cannot checkout with an empty cart.")

    # 4. Authoritative server re-computation of pricing
    coupon_to_use = payload.coupon_code or (cart.coupon_code if cart else None)
    breakdown = compute_cart_breakdown(
        db=db,
        items=raw_items,
        coupon_code=coupon_to_use,
        shipping_state=shipping_state,
    )

    if breakdown.get("quote_required"):
        raise CartError("Cart contains items that require an approved quotation. Please submit a quote request instead.")

    purchasable_lines = [l for l in breakdown["lines"] if l.get("is_purchasable")]
    if not purchasable_lines:
        raise CartError("No purchasable items found in cart.")

    total_paise = breakdown["total_paise"]
    if total_paise <= 0:
        raise CartError("Invalid cart total calculation.")

    # 5. Create Order
    order_ref = _generate_order_reference()
    now_iso = datetime.now(timezone.utc).isoformat()
    tracking_token = secrets.token_urlsafe(32)

    order_user_id = current_user.id if (current_user and getattr(current_user, 'role', None) == 'customer') else None
    if payload.customer_email:
        matching_user = db.query(User).filter(func.lower(User.email) == payload.customer_email.lower().strip()).first()
        if matching_user:
            order_user_id = matching_user.id
        elif current_user:
            order_user_id = current_user.id

    is_customer = bool(current_user and getattr(current_user, 'role', None) == 'customer')
    c_name = payload.customer_name or (current_user.full_name if is_customer else "Customer")
    c_email = (payload.customer_email or (current_user.email if is_customer else "")).lower()
    c_phone = (payload.customer_phone or (current_user.phone if is_customer else "") or "").strip()
    b_addr = payload.billing_address.model_dump_json() if payload.billing_address else "{}"
    s_addr = (payload.shipping_address or payload.billing_address).model_dump_json() if (payload.shipping_address or payload.billing_address) else "{}"

    order = Order(
        reference=order_ref,
        user_id=order_user_id,
        customer_name=c_name,
        customer_email=c_email,
        customer_phone=c_phone,
        billing_address=b_addr,
        shipping_address=s_addr,
        subtotal_paise=breakdown["subtotal_paise"],
        discount_paise=breakdown["discount_paise"],
        gst_paise=breakdown["gst_paise"],
        shipping_paise=breakdown["shipping_paise"],
        total_paise=total_paise,
        gst_rate=settings.DEFAULT_GST_RATE,
        coupon_code=breakdown["coupon_applied"],
        company_name=payload.company_name,
        gstin=payload.gstin,
        notes=payload.notes,
        status=OrderStatus.pending_payment,
        tracking_token=tracking_token,
    )
    db.add(order)
    db.flush()  # Obtain order.id

    # 6. Create immutable OrderItem snapshots
    for line in purchasable_lines:
        order_item = OrderItem(
            order_id=order.id,
            product_id=line["product_id"],
            product_name=line["product_name"],
            product_sku=line["product_sku"],
            variant_id=line.get("variant_id"),
            variant_name=line.get("variant_name"),
            configuration=json.dumps(line.get("options", {})) if line.get("options") else None,
            artwork_url=line.get("artwork_url"),
            quantity=line["quantity"],
            unit_price_paise=line["unit_price_paise"],
            total_paise=line["total_paise"],
        )
        db.add(order_item)

        # Reserve inventory if tracked
        if line.get("variant_id"):
            inv = db.query(Inventory).filter(Inventory.variant_id == line["variant_id"]).first()
        else:
            inv = db.query(Inventory).filter(Inventory.product_id == line["product_id"]).first()
        if inv and inv.track_stock:
            inv.reserved += line["quantity"]

    # 7. Initial Order Status History Event
    event = OrderStatusHistory(
        order_id=order.id,
        status="pending_payment",
        note="Order checkout initialized. Awaiting payment authorization.",
        changed_at=now_iso,
        changed_by="system",
    )
    db.add(event)

    # 8. Create Razorpay order
    rzp_res = create_razorpay_order(
        amount_paise=total_paise,
        order_number=order_ref,
        notes={
            "order_id": order.id,
            "order_reference": order_ref,
            "customer_email": c_email or None,
            "customer_phone": c_phone or None,
        },
        db=db,
    )

    # 9. Create Payment record
    payment = Payment(
        order_id=order.id,
        razorpay_order_id=rzp_res["id"],
        amount_paise=total_paise,
        currency="INR",
        status=PaymentStatus.created,
    )
    db.add(payment)

    # 10. Note: Cart items are preserved until Razorpay confirms payment
    db.commit()

    # 11. Dispatch order placed notification
    if c_email:
        notify(
            db=db,
            event_type="order_placed",
            recipient_email=c_email,
            context={
                "customer_name": c_name,
                "order_number": order_ref,
                "total_rupees": f"{total_paise / 100:.2f}",
            },
            user_id=current_user.id if current_user else None,
            resource_type="order",
            resource_id=order.id,
        )

    public_key = settings.RAZORPAY_KEY_ID or "rzp_test_public_key"
    try:
        from app.models.models import WebsiteSetting
        key_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "razorpay_key_id").first()
        if key_rec and key_rec.value:
            public_key = key_rec.value
    except Exception:
        pass

    is_sim = bool(rzp_res.get("simulated", False) or not public_key or public_key.startswith("rzp_test_public_key"))

    return RazorpayOrderResponse(
        razorpay_order_id=rzp_res["id"],
        amount_paise=total_paise,
        currency="INR",
        order_reference=order_ref,
        key_id=public_key,
        is_simulated=is_sim,
    )

