"""
DisplayDelight V2 — Shopping Cart API.
Handles:
- Persistent cart for authenticated customers or guest sessions (via X-Session-ID)
- Server-authoritative totals and real-time validation
- Customization option persistence
- Coupon application and removal
- Authoritative price calculation with signed price token
"""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_optional_current_user
from app.core.exceptions import CartError, NotFoundError, ValidationError
from app.models.models import Cart, CartItem, Product, ProductVariant, User
from app.schemas.schemas import ApplyCouponRequest, CartItemIn, CartOut
from app.services.pricing import (
    compute_cart_breakdown,
    get_product_by_id_or_slug,
    get_variant_by_id_or_sku,
    validate_coupon,
)


router = APIRouter(prefix="/cart", tags=["Cart"])


def _get_or_create_cart(
    db: Session,
    user: Optional[User],
    session_id: Optional[str],
) -> Cart:
    """Finds existing Cart for user or session_id, or creates a new one."""
    cart: Optional[Cart] = None
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart and session_id:
            # Check if there is an existing guest cart to associate with user
            guest_cart = db.query(Cart).filter(Cart.session_id == session_id).first()
            if guest_cart and not guest_cart.user_id:
                guest_cart.user_id = user.id
                db.commit()
                return guest_cart
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()

    if not cart:
        cart = Cart(
            session_id=session_id or f"sess_{uuid.uuid4().hex[:16]}",
            user_id=user.id if user else None,
        )
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return cart


def _format_cart_response(db: Session, cart: Cart, shipping_state: Optional[str] = None) -> Dict[str, Any]:
    """Evaluates cart items and calculates authoritative totals."""
    raw_items = []
    for line in cart.items:
        opts = {}
        if line.options:
            try:
                opts = json.loads(line.options) if isinstance(line.options, str) else line.options
            except Exception:
                opts = {}
        raw_items.append({
            "item_id": line.id,
            "product_id": line.product_id,
            "variant_id": line.variant_id,
            "quantity": line.quantity,
            "options": opts,
            "artwork_url": line.artwork_upload.file_url if line.artwork_upload else None,
            "artwork_upload_id": line.artwork_upload_id,
        })

    breakdown = compute_cart_breakdown(
        db=db,
        items=raw_items,
        coupon_code=cart.coupon_code,
        shipping_state=shipping_state,
    )

    items_out = []
    for line_data in breakdown["lines"]:
        items_out.append({
            "item_id": line_data.get("item_id"),
            "product_id": line_data.get("product_id"),
            "product_name": line_data.get("product_name", "Unknown Product"),
            "product_sku": line_data.get("product_sku", "SKU-N/A"),
            "primary_image": line_data.get("primary_image"),
            "variant_id": line_data.get("variant_id"),
            "variant_name": line_data.get("variant_name"),
            "quantity": line_data.get("quantity", 1),
            "unit_price_paise": line_data.get("unit_price_paise"),
            "total_paise": line_data.get("total_paise"),
            "options": line_data.get("options", {}),
            "artwork_url": line_data.get("artwork_url"),
            "is_purchasable": line_data.get("is_purchasable", True),
            "validation_error": line_data.get("validation_error"),
        })

    totals_out = None
    if breakdown["subtotal_paise"] > 0:
        totals_out = {
            "base_price_paise": breakdown["subtotal_paise"],
            "variant_delta_paise": 0,
            "customization_delta_paise": 0,
            "subtotal_paise": breakdown["subtotal_paise"],
            "discount_paise": breakdown["discount_paise"],
            "taxable_paise": breakdown["taxable_paise"],
            "gst_paise": breakdown["gst_paise"],
            "gst_rate": 18,
            "shipping_paise": breakdown["shipping_paise"],
            "total_paise": breakdown["total_paise"],
            "quantity": sum(i.get("quantity", 1) for i in items_out),
            "coupon_applied": breakdown["coupon_applied"],
        }

    return {
        "cart_id": cart.id,
        "session_id": cart.session_id,
        "items": items_out,
        "totals": totals_out,
        "coupon_code": cart.coupon_code,
        "coupon_error": breakdown.get("coupon_error"),
        "quote_required": breakdown.get("quote_required", False),
        "price_token": breakdown.get("price_token"),
        "gst_components": breakdown.get("gst_components"),
    }


@router.get("", summary="Get current cart with server-authoritative totals")
def get_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    return _format_cart_response(db, cart)


@router.post("", summary="Add product to cart")
def add_to_cart(
    payload: CartItemIn,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    # Validate product exists and is active
    product = get_product_by_id_or_slug(db, payload.product_id)
    if not product or getattr(product.status, "value", str(product.status)) != "published":
        raise NotFoundError("Product not found or not published.")

    variant = None
    if payload.variant_id:
        variant = get_variant_by_id_or_sku(db, payload.variant_id)
        if not variant or variant.product_id != product.id:
            raise NotFoundError("Selected variant does not exist for this product.")

    cart = _get_or_create_cart(db, current_user, x_session_id)

    # Check if identical line already in cart (same product, variant, options)
    options_json = json.dumps(payload.options, sort_keys=True) if payload.options else "{}"
    existing_line = None
    for line in cart.items:
        line_opts = json.dumps(json.loads(line.options), sort_keys=True) if line.options else "{}"
        if (
            line.product_id == product.id
            and line.variant_id == (variant.id if variant else None)
            and line_opts == options_json
            and line.artwork_upload_id == payload.artwork_upload_id
        ):
            existing_line = line
            break

    if existing_line:
        existing_line.quantity += payload.quantity
    else:
        new_line = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
            quantity=payload.quantity,
            options=options_json,
            artwork_upload_id=payload.artwork_upload_id,
        )
        db.add(new_line)

    db.commit()
    db.refresh(cart)
    return _format_cart_response(db, cart)


@router.patch("/items/{item_id}", summary="Update cart item quantity or options")
def update_cart_item(
    item_id: str,
    payload: Dict[str, Any],
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    line = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not line:
        raise NotFoundError("Cart line item not found.")

    if "quantity" in payload:
        new_qty = int(payload["quantity"])
        if new_qty <= 0:
            db.delete(line)
        else:
            line.quantity = new_qty

    if "options" in payload:
        line.options = json.dumps(payload["options"], sort_keys=True)

    db.commit()
    db.refresh(cart)
    return _format_cart_response(db, cart)


@router.delete("/items/{item_id}", summary="Remove item from cart")
def remove_cart_item(
    item_id: str,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    line = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if line:
        db.delete(line)
        db.commit()
        db.refresh(cart)
    return _format_cart_response(db, cart)


@router.delete("", summary="Clear cart")
def clear_cart(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    for line in cart.items:
        db.delete(line)
    cart.coupon_code = None
    db.commit()
    db.refresh(cart)
    return _format_cart_response(db, cart)


@router.post("/price", summary="Compute authoritative price for cart or item list")
def compute_price(
    payload: Optional[Dict[str, Any]] = None,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    shipping_state = payload.get("shipping_state") if payload else None
    coupon_code = payload.get("coupon_code") if payload else None
    items = payload.get("items") if payload else None

    if items is not None:
        # Calculate from ad-hoc items payload
        breakdown = compute_cart_breakdown(
            db=db,
            items=items,
            coupon_code=coupon_code,
            shipping_state=shipping_state,
        )
        return breakdown
    else:
        # Calculate from current user's DB cart
        cart = _get_or_create_cart(db, current_user, x_session_id)
        if coupon_code:
            cart.coupon_code = coupon_code.strip().upper()
            db.commit()
        return _format_cart_response(db, cart, shipping_state=shipping_state)


@router.post("/coupon", summary="Apply coupon code to cart")
def apply_coupon(
    payload: ApplyCouponRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    if not cart.items:
        raise CartError("Cart is empty.")

    resp = _format_cart_response(db, cart)
    subtotal = resp.get("totals", {}).get("subtotal_paise", 0) if resp.get("totals") else 0

    coupon, err = validate_coupon(db, payload.code, subtotal)
    if not coupon:
        error_messages = {
            "COUPON_NOT_FOUND": "Invalid coupon code.",
            "COUPON_NOT_STARTED": "Coupon is not active yet.",
            "COUPON_EXPIRED": "This coupon has expired.",
            "COUPON_MAX_USES_EXCEEDED": "This coupon usage limit has been reached.",
            "COUPON_MIN_ORDER_NOT_MET": "Order total does not meet the minimum requirement for this coupon.",
        }
        raise ValidationError(error_messages.get(err, "Invalid coupon code."))

    cart.coupon_code = coupon.code
    db.commit()
    db.refresh(cart)
    return _format_cart_response(db, cart)


@router.delete("/coupon", summary="Remove applied coupon from cart")
def remove_coupon(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    cart = _get_or_create_cart(db, current_user, x_session_id)
    cart.coupon_code = None
    db.commit()
    db.refresh(cart)
    return _format_cart_response(db, cart)
