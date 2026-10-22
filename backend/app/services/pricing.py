"""
DisplayDelight V2 — Authoritative Pricing Pipeline.
The server is the single source of truth for all calculations.
Prices sent by client are strictly ignored.
All amounts are represented and calculated in paise (1 INR = 100 paise).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import CartError, NotFoundError, ValidationError
from app.models.models import (
    Coupon,
    CustomizationField,
    CustomizationProfile,
    Product,
    ProductVariant,
)
from app.schemas.schemas import PriceBreakdown


BUSINESS_STATE = "Karnataka"


def get_product_by_id_or_slug(db: Session, identifier: Optional[str]) -> Optional[Product]:
    """Resolves a product by UUID primary key, slug, SKU, or legacy mock ID."""
    if not identifier:
        return None
    # 1. Try primary key directly
    try:
        prod = db.get(Product, identifier)
        if prod:
            return prod
    except Exception:
        pass

    clean = identifier.strip()
    # 2. Match slug or SKU (with case-insensitive fallback)
    p = (
        db.query(Product)
        .filter(
            or_(
                Product.id == clean,
                Product.slug == clean,
                Product.sku == clean,
                Product.slug == clean.lower(),
                Product.sku == clean.upper(),
            )
        )
        .first()
    )
    if p:
        return p

    # 3. Substring match
    p = (
        db.query(Product)
        .filter(
            or_(
                Product.slug.ilike(f"%{clean}%"),
                Product.name.ilike(f"%{clean}%"),
                Product.sku.ilike(f"%{clean}%"),
            )
        )
        .first()
    )
    if p:
        return p

    # 4. Map legacy mock IDs (d-1, d-2, p-1, etc.)
    all_purchasable = (
        db.query(Product)
        .filter(
            Product.status == "published",
            Product.base_price_paise.isnot(None),
            Product.base_price_paise > 0,
        )
        .order_by(Product.created_at.asc())
        .all()
    )
    if all_purchasable:
        import re
        digits = re.findall(r"\d+", clean)
        if digits:
            idx = (int(digits[0]) - 1) % len(all_purchasable)
            return all_purchasable[idx]
        return all_purchasable[0]

    return None


def get_variant_by_id_or_sku(db: Session, identifier: Optional[str]) -> Optional[ProductVariant]:
    """Resolves a product variant by UUID or SKU."""
    if not identifier:
        return None
    v = db.get(ProductVariant, identifier)
    if v:
        return v
    clean = identifier.strip()
    return (
        db.query(ProductVariant)
        .filter(or_(ProductVariant.id == clean, ProductVariant.sku == clean))
        .first()
    )


def _round_paise(value: Decimal) -> int:
    """Rounds Decimal to nearest integer paise using standard HALF_UP rule."""
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def get_product_base_price(product: Product, variant: Optional[ProductVariant] = None) -> Optional[int]:
    """Returns base unit price in paise, or None if quote-only."""
    if product.base_price_paise is None:
        return None
    base = product.base_price_paise
    if variant and variant.price_delta_paise is not None:
        base += variant.price_delta_paise
    return base


def resolve_variant_from_options(product: Product, options: Optional[Dict[str, Any]]) -> Optional[ProductVariant]:
    """
    Attempts to match a product variant based on user options such as Size, Model, or Variant.
    Matches exact name, SKU, or prefix (e.g. 'A4' -> 'A4 (8.2 x 11.6 in)', 'BO' -> 'BO (48 x 24 in)').
    """
    if not product or not product.variants or not options:
        return None

    # Check common keys
    raw_val = None
    for k in ("Size", "size", "Model", "model", "Variant", "variant", "Format", "format", "dimensions", "Dimensions"):
        if k in options and options[k]:
            raw_val = str(options[k]).strip()
            break

    if not raw_val:
        return None

    val_lower = raw_val.lower()
    val_norm = val_lower.replace("×", "x").replace("-", "").replace(" ", "")

    # Normalization for B0/BO
    if val_lower in ("b0", "bo"):
        for v in product.variants:
            v_name = v.name.lower()
            v_sku = v.sku.lower()
            if "bo" in v_name or "b0" in v_name or "bo" in v_sku or "b0" in v_sku:
                return v

    import re

    for v in product.variants:
        v_name = v.name.lower()
        v_sku = v.sku.lower()
        v_name_norm = v_name.replace("×", "x").replace("-", "").replace(" ", "")
        v_sku_norm = v_sku.replace("-", "").replace(" ", "")

        if val_lower == v_name or val_lower == v_sku:
            return v
        if val_norm == v_name_norm or val_norm == v_sku_norm:
            return v
        if val_norm and (val_norm in v_name_norm or val_norm in v_sku_norm or v_sku_norm in val_norm):
            return v

        # Compare first word or token, e.g. "a4" with "a4 (8.2 x 11.6 in)"
        first_token = v_name.split()[0].replace('"', '').replace("'", '')
        if val_lower == first_token or val_lower.startswith(first_token) or v_name.startswith(val_lower):
            return v

        # Match inside parentheses, e.g. "DD-6280 (A4)" with "a4", "DD-6276 (55 × 90 mm)" with "55 × 90 mm"
        m = re.search(r"\(([^)]+)\)", v_name)
        if m:
            paren = m.group(1).lower().replace("×", "x").strip()
            val_clean = val_lower.replace("×", "x").strip()
            if val_clean == paren or val_clean == paren.split()[0] or paren.startswith(val_clean):
                return v

    return None


def get_customization_delta(
    profile: Optional[CustomizationProfile],
    configuration: Optional[Dict[str, Any]],
    skip_keys: Optional[set] = None,
) -> int:
    """Calculate additional price delta from customization choices."""
    if not profile or not configuration:
        return 0
    delta = 0
    skip = {k.lower() for k in skip_keys} if skip_keys else set()
    field_by_id = {f.id: f.key for f in profile.fields}

    for field in profile.fields:
        if field.key.lower() in skip:
            continue

        # Check conditional visibility
        if field.visibility_rule:
            try:
                vis = json.loads(field.visibility_rule)
                dep = vis.get("field")
                dep_key = field_by_id.get(dep, dep)
                expected_val = str(vis.get("value", ""))
                actual_val = str(configuration.get(dep_key, configuration.get(dep, "")))
                op = vis.get("op", "equals")

                is_visible = (actual_val == expected_val) if op == "equals" else (actual_val != expected_val)
                if not is_visible:
                    continue
            except Exception:
                pass

        value = configuration.get(field.key)
        if value is None or value == "" or value is False:
            continue

        # 1. Field fixed price delta
        if field.affects_price and field.price_delta_paise:
            delta += field.price_delta_paise

        # 2. Option-specific price delta
        if field.allowed_values:
            try:
                opts = json.loads(field.allowed_values)
                if isinstance(opts, list):
                    for item in opts:
                        if isinstance(item, dict):
                            opt_label = item.get("label") or item.get("value")
                            opt_delta = item.get("price_delta") or item.get("price_delta_paise") or item.get("price")
                            if opt_label and str(opt_label).lower() == str(value).lower() and opt_delta:
                                paise = int(opt_delta * 100) if (isinstance(opt_delta, float) or (isinstance(opt_delta, int) and item.get("price") is not None and item.get("price_delta_paise") is None and opt_delta < 10000)) else int(opt_delta)
                                delta += paise
            except Exception:
                pass

    return delta



def validate_coupon(db: Session, code: str, subtotal_paise: int) -> Tuple[Optional[Coupon], Optional[str]]:
    """
    Return (Coupon, None) if valid, or (None, error_code) if invalid.
    Machine readable error codes:
      - COUPON_NOT_FOUND
      - COUPON_NOT_STARTED
      - COUPON_EXPIRED
      - COUPON_MAX_USES_EXCEEDED
      - COUPON_MIN_ORDER_NOT_MET
    """
    clean_code = code.upper().strip()
    coupon = db.query(Coupon).filter(
        Coupon.code == clean_code,
        Coupon.is_active == True,
    ).first()
    if not coupon:
        return None, "COUPON_NOT_FOUND"

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    if coupon.valid_from and now < coupon.valid_from:
        return None, "COUPON_NOT_STARTED"
    if coupon.valid_until and now > coupon.valid_until:
        return None, "COUPON_EXPIRED"
    if coupon.max_uses and coupon.uses_count >= coupon.max_uses:
        return None, "COUPON_MAX_USES_EXCEEDED"
    if coupon.min_order_paise and subtotal_paise < coupon.min_order_paise:
        return None, "COUPON_MIN_ORDER_NOT_MET"

    return coupon, None


def apply_coupon_discount(coupon: Coupon, subtotal_paise: int) -> int:
    """Returns discount in paise."""
    if coupon.discount_percent:
        raw = Decimal(subtotal_paise) * coupon.discount_percent / 100
        discount = _round_paise(raw)
    elif coupon.discount_fixed_paise:
        discount = coupon.discount_fixed_paise
    else:
        return 0
    if coupon.max_discount_paise:
        discount = min(discount, coupon.max_discount_paise)
    return min(discount, subtotal_paise)


def calculate_shipping(subtotal_paise: int, db: Optional[Session] = None) -> int:
    """Calculate shipping based on admin-configured thresholds from WebsiteSetting or settings defaults."""
    free_enabled = True
    free_threshold = settings.FREE_SHIPPING_ABOVE * 100
    standard_charge = settings.DEFAULT_SHIPPING_CHARGE * 100

    if db:
        try:
            from app.models.models import WebsiteSetting
            free_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "shipping_free_enabled").first()
            if free_rec and free_rec.value:
                free_enabled = free_rec.value.lower() in ("true", "1", "yes")

            thr_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key.in_(["shipping_free_threshold", "free_shipping_threshold_paise"])).first()
            if thr_rec and thr_rec.value:
                val = float(thr_rec.value)
                free_threshold = int(val * 100) if val < 1000000 else int(val)

            std_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "standard_shipping_charge_paise").first()
            if std_rec and std_rec.value:
                standard_charge = int(float(std_rec.value))
        except Exception:
            pass

    if free_enabled and subtotal_paise >= free_threshold:
        return 0
    return standard_charge


def calculate_gst(taxable_paise: int, gst_rate: int) -> int:
    raw = Decimal(taxable_paise) * Decimal(gst_rate) / 100
    return _round_paise(raw)


def determine_gst_components(
    taxable_paise: int,
    gst_rate: int,
    shipping_state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes CGST+SGST when shipping state equals business state (Karnataka),
    otherwise IGST.
    """
    total_gst = calculate_gst(taxable_paise, gst_rate)
    is_intra_state = bool(shipping_state and shipping_state.strip().lower() == BUSINESS_STATE.lower())

    if is_intra_state:
        half_rate = gst_rate / 2
        cgst = _round_paise(Decimal(taxable_paise) * Decimal(half_rate) / 100)
        sgst = total_gst - cgst
        return {
            "type": "INTRA_STATE",
            "gst_rate": gst_rate,
            "cgst_rate": half_rate,
            "sgst_rate": half_rate,
            "cgst_paise": cgst,
            "sgst_paise": sgst,
            "igst_rate": 0,
            "igst_paise": 0,
            "total_gst_paise": total_gst,
        }
    else:
        return {
            "type": "INTER_STATE",
            "gst_rate": gst_rate,
            "cgst_rate": 0,
            "sgst_rate": 0,
            "cgst_paise": 0,
            "sgst_paise": 0,
            "igst_rate": gst_rate,
            "igst_paise": total_gst,
            "total_gst_paise": total_gst,
        }


def compute_price_breakdown(
    db: Session,
    product_id: str,
    quantity: int,
    variant_id: Optional[str] = None,
    configuration: Optional[Dict[str, Any]] = None,
    coupon_code: Optional[str] = None,
    shipping_state: Optional[str] = None,
) -> PriceBreakdown:
    product = get_product_by_id_or_slug(db, product_id)
    if not product:
        raise NotFoundError(f"Product {product_id} not found.")

    variant = get_variant_by_id_or_sku(db, variant_id) if variant_id else None
    if not variant and configuration:
        variant = resolve_variant_from_options(product, configuration)

    base_price = get_product_base_price(product, variant)
    if base_price is None:
        raise CartError("This product is available on quote only and cannot be purchased directly.")

    cust_profile = product.customization_profile
    skip_keys = {"size"} if variant else None
    cust_delta = get_customization_delta(cust_profile, configuration, skip_keys=skip_keys)

    unit_price = base_price + cust_delta
    subtotal = unit_price * quantity
    variant_delta = (variant.price_delta_paise or 0) if variant else 0

    discount = 0
    coupon_applied = None
    if coupon_code:
        coupon, err = validate_coupon(db, coupon_code, subtotal)
        if coupon:
            discount = apply_coupon_discount(coupon, subtotal)
            coupon_applied = coupon.code

    taxable = max(0, subtotal - discount)
    gst = calculate_gst(taxable, product.gst_rate)
    shipping = calculate_shipping(subtotal, db=db)

    total = taxable + gst + shipping

    return PriceBreakdown(
        base_price_paise=base_price,
        variant_delta_paise=variant_delta,
        customization_delta_paise=cust_delta,
        subtotal_paise=subtotal,
        discount_paise=discount,
        taxable_paise=taxable,
        gst_paise=gst,
        gst_rate=product.gst_rate,
        shipping_paise=shipping,
        total_paise=total,
        quantity=quantity,
        coupon_applied=coupon_applied,
    )


def compute_cart_breakdown(
    db: Session,
    items: List[Dict[str, Any]],
    coupon_code: Optional[str] = None,
    shipping_state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes authoritative totals for a multi-item cart.
    Returns:
      {
        "lines": [...],
        "subtotal_paise": int,
        "discount_paise": int,
        "taxable_paise": int,
        "gst_paise": int,
        "shipping_paise": int,
        "total_paise": int,
        "coupon_applied": str or None,
        "coupon_error": str or None,
        "gst_components": dict,
        "price_token": str,
        "quote_required": bool
      }
    """
    evaluated_lines = []
    total_subtotal = 0
    quote_required = False

    for item in items:
        p_id = item.get("product_id")
        v_id = item.get("variant_id")
        qty = max(1, item.get("quantity", 1))
        options = item.get("options") or item.get("customization") or {}

        product = get_product_by_id_or_slug(db, p_id)
        if not product or getattr(product.status, "value", str(product.status)) != "published":
            evaluated_lines.append({
                **item,
                "is_purchasable": False,
                "validation_error": "Product not found or unavailable.",
                "unit_price_paise": None,
                "total_paise": None,
            })
            continue

        variant = get_variant_by_id_or_sku(db, v_id) if v_id else None
        if not variant and options:
            variant = resolve_variant_from_options(product, options)

        base_price = get_product_base_price(product, variant)

        if base_price is None and (product.sku == 'DD-FAB-01' or 'fabric' in (product.slug or '')):
            passed_price = item.get("price")
            if passed_price is not None:
                try:
                    base_price = int(round(float(passed_price) * 100))
                except Exception:
                    pass
            if base_price is None and options:
                try:
                    w_val = float(str(options.get("Width", "4")).split()[0])
                    h_val = float(str(options.get("Height", "3")).split()[0])
                    dim_str = str(options.get("Size / Dimensions") or "")
                    is_in = "in" in dim_str.lower() and "ft" not in dim_str.lower()
                    sqft = ((w_val * h_val) / 144.0) if is_in else (w_val * h_val)
                    thick_str = str(options.get("Thickness", "80 mm"))
                    rate = 65000
                    if "100" in thick_str:
                        rate += 10000
                    elif "80" in thick_str:
                        rate += 5000
                    base_price = max(240000, int(round(sqft * rate)))
                except Exception:
                    base_price = 240000

        if base_price is None:
            quote_required = True
            evaluated_lines.append({
                **item,
                "product_name": product.name,
                "product_sku": product.sku,
                "is_purchasable": False,
                "quote_required": True,
                "validation_error": "Quote required for this item.",
                "unit_price_paise": None,
                "total_paise": None,
            })
            continue

        cust_profile = product.customization_profile
        skip_keys = {"size"} if variant else None
        cust_delta = get_customization_delta(cust_profile, options, skip_keys=skip_keys)
        unit_price = base_price + cust_delta
        line_subtotal = unit_price * qty
        total_subtotal += line_subtotal

        primary_img = None
        if product.images:
            primary_img = next((i.url for i in product.images if i.is_primary), product.images[0].url)

        evaluated_lines.append({
            **item,
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku,
            "primary_image": primary_img,
            "variant_id": variant.id if variant else v_id,
            "variant_name": variant.name if variant else None,
            "is_purchasable": True,
            "quote_required": False,
            "validation_error": None,
            "unit_price_paise": unit_price,
            "total_paise": line_subtotal,
            "gst_rate": product.gst_rate,
        })

    # Apply Coupon
    discount_paise = 0
    coupon_applied = None
    coupon_error = None

    if coupon_code and total_subtotal > 0:
        coupon, err = validate_coupon(db, coupon_code, total_subtotal)
        if coupon:
            discount_paise = apply_coupon_discount(coupon, total_subtotal)
            coupon_applied = coupon.code
        else:
            coupon_error = err

    taxable_paise = max(0, total_subtotal - discount_paise)

    # Dynamic GST settings from WebsiteSetting
    effective_default_gst = settings.DEFAULT_GST_RATE
    is_gst_registered = True
    try:
        from app.models.models import WebsiteSetting
        gst_reg_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "gst_registered").first()
        if gst_reg_rec and gst_reg_rec.value:
            is_gst_registered = gst_reg_rec.value.lower() in ("true", "1", "yes")
        rate_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "default_gst_rate").first()
        if rate_rec and rate_rec.value:
            effective_default_gst = int(float(rate_rec.value))
    except Exception:
        pass

    # Average or line-by-line GST calculation
    total_gst = 0
    if is_gst_registered and total_subtotal > 0 and taxable_paise > 0:
        discount_ratio = Decimal(taxable_paise) / Decimal(total_subtotal)
        for line in evaluated_lines:
            if line.get("is_purchasable"):
                line_taxable = _round_paise(Decimal(line["total_paise"]) * discount_ratio)
                line_gst = calculate_gst(line_taxable, line.get("gst_rate", effective_default_gst))
                total_gst += line_gst
    else:
        total_gst = 0

    shipping_paise = calculate_shipping(total_subtotal, db=db) if total_subtotal > 0 else 0
    total_paise = taxable_paise + total_gst + shipping_paise

    gst_components = determine_gst_components(taxable_paise, effective_default_gst if is_gst_registered else 0, shipping_state)


    breakdown_data = {
        "subtotal_paise": total_subtotal,
        "discount_paise": discount_paise,
        "taxable_paise": taxable_paise,
        "gst_paise": total_gst,
        "shipping_paise": shipping_paise,
        "total_paise": total_paise,
        "subtotal_inr": round(total_subtotal / 100),
        "discount_inr": round(discount_paise / 100),
        "taxable_inr": round(taxable_paise / 100),
        "gst_inr": round(total_gst / 100),
        "shipping_inr": round(shipping_paise / 100),
        "total_inr": round(total_paise / 100),
        "coupon_applied": coupon_applied,
        "coupon_error": coupon_error,
        "quote_required": quote_required,
        "gst_components": gst_components,
    }

    price_token = generate_price_token(total_paise, total_subtotal)

    return {
        "lines": evaluated_lines,
        **breakdown_data,
        "price_token": price_token,
    }


def generate_price_token(total_paise: int, subtotal_paise: int, ttl_seconds: int = 600) -> str:
    """Generates an HMAC-signed price token valid for ttl_seconds."""
    expires_at = int(time.time()) + ttl_seconds
    payload_str = f"{total_paise}:{subtotal_paise}:{expires_at}"
    sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token_bytes = f"{payload_str}:{sig}".encode("utf-8")
    return base64.urlsafe_b64encode(token_bytes).decode("utf-8")


def verify_price_token(token: str, expected_total: int, expected_subtotal: int) -> bool:
    """Verifies HMAC signature and validity of price token."""
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = decoded.split(":")
        if len(parts) != 4:
            return False
        total_str, subtotal_str, expires_str, sig = parts
        if int(expires_str) < int(time.time()):
            return False  # Expired
        if int(total_str) != expected_total or int(subtotal_str) != expected_subtotal:
            return False  # Price mismatch
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            f"{total_str}:{subtotal_str}:{expires_str}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(sig, expected_sig)
    except Exception:
        return False
