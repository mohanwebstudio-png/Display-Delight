"""
Products and catalogue endpoints:
- Listing with full server-side filtering, search, pagination, and sorting
- Individual product detail
- Dynamic filter metadata per category
- Price preview (authoritative)
- Customization profile retrieval and validation
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user, get_optional_current_user, require_catalogue_manager
from app.core.exceptions import NotFoundError, ValidationError
from app.db.session import get_db
from app.models.models import (
    Category,
    CategoryFilterConfig,
    CustomizationField,
    CustomizationProfile,
    Inventory,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductImage,
    ProductReview,
    PublishStatus,
    User,
)
from app.schemas.schemas import (
    CustomizationProfileOut,
    CustomizationValidateRequest,
    CustomizationValidateResponse,
    FilterMeta,
    FilterOptionMeta,
    PaginatedResponse,
    PriceBreakdown,
    PricePreviewRequest,
    ProductDetail,
    ProductIn,
    ProductReviewCreate,
    ProductReviewOut,
    ProductSummary,
    ProductVariantOut,
)
from app.services.pricing import compute_price_breakdown

router = APIRouter(prefix="/products", tags=["products"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _product_to_summary(p: Product) -> ProductSummary:
    primary = next((i.url for i in p.images if i.is_primary), None)
    if not primary and p.images:
        primary = p.images[0].url
    stock = p.inventory.quantity if p.inventory else None

    attrs_dict: Dict[str, Any] = {}
    if hasattr(p, "attribute_values") and p.attribute_values:
        for pav in p.attribute_values:
            if pav.attribute:
                k = pav.attribute.key
                attrs_dict.setdefault(k, []).append(pav.value)

    specs_list = []
    if hasattr(p, "specs") and p.specs:
        specs_list = [(s.label, s.value) for s in sorted(p.specs, key=lambda x: x.display_order)]
        for s in p.specs:
            lbl = s.label.lower()
            if "size" in lbl or "screen" in lbl:
                attrs_dict.setdefault("size", []).append(s.value)
            if "resolution" in lbl:
                attrs_dict.setdefault("resolution", []).append(s.value)
            if "brightness" in lbl:
                attrs_dict.setdefault("brightness", []).append(s.value)
            if "orientation" in lbl:
                attrs_dict.setdefault("orientation", []).append(s.value)
            if "mounting" in lbl or "stand" in lbl:
                attrs_dict.setdefault("mounting", []).append(s.value)

    active_variants = [
        ProductVariantOut.model_validate(v)
        for v in (p.variants or [])
        if v.is_active
    ]

    return ProductSummary(
        id=p.id,
        slug=p.slug,
        name=p.name,
        sku=p.sku,
        kind=p.kind.value if hasattr(p.kind, "value") else str(p.kind),
        blurb=p.blurb,
        category_id=p.category_id,
        category_slug=p.category.slug if p.category else None,
        category_name=p.category.name if p.category else None,
        base_price_paise=p.base_price_paise,
        gst_rate=p.gst_rate,
        is_customizable=p.is_customizable,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        primary_image=primary,
        stock=stock,
        attrs=attrs_dict,
        specs=specs_list,
        variants=active_variants,
    )


def _product_to_detail(p: Product) -> ProductDetail:
    av = []
    seen_attrs: Dict[str, List[str]] = {}
    for pav in p.attribute_values:
        k = pav.attribute.key
        seen_attrs.setdefault(k, []).append(pav.value)
    for k, vals in seen_attrs.items():
        av.append({"key": k, "label": k, "values": vals})

    stock = p.inventory.quantity if p.inventory else None

    return ProductDetail(
        id=p.id,
        slug=p.slug,
        name=p.name,
        sku=p.sku,
        model=p.model,
        kind=p.kind.value if hasattr(p.kind, "value") else str(p.kind),
        blurb=p.blurb,
        description=p.description,
        category_id=p.category_id,
        category_slug=p.category.slug if p.category else None,
        category_name=p.category.name if p.category else None,
        base_price_paise=p.base_price_paise,
        gst_rate=p.gst_rate,
        is_customizable=p.is_customizable,
        minimum_order_qty=p.minimum_order_qty,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        images=p.images,
        specs=p.specs,
        variants=p.variants,
        attribute_values=av,
        warranty_info=p.warranty_info,
        shipping_info=p.shipping_info,
        seo_title=p.seo_title,
        seo_description=p.seo_description,
        stock=stock,
    )


# ── Product list ──────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse)
def list_products(
    q: Optional[str] = Query(None, description="Search text"),
    category: Optional[str] = Query(None, description="Category slug or ID"),
    min_price: Optional[int] = Query(None, ge=0, description="Min price in paise"),
    max_price: Optional[int] = Query(None, ge=0, description="Max price in paise"),
    attrs: Optional[str] = Query(None, description="JSON: {attr_key: [val,...]}"),
    sort: str = Query("newest", description="newest|price_asc|price_desc|name_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_unpublished: bool = Query(False),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.specs),
            selectinload(Product.variants),
            selectinload(Product.inventory),
            selectinload(Product.attribute_values).selectinload(ProductAttributeValue.attribute),
        )
        .filter(Product.status == PublishStatus.published)
    )
    if include_unpublished:
        stmt = select(Product).options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.specs),
            selectinload(Product.variants),
            selectinload(Product.inventory),
            selectinload(Product.attribute_values).selectinload(ProductAttributeValue.attribute),
        )

    # Category filter
    if category:
        cat = db.query(Category).filter(
            or_(Category.slug == category, Category.id == category)
        ).first()
        if cat:
            stmt = stmt.filter(Product.category_id == cat.id)

    # Price filter
    if min_price is not None:
        stmt = stmt.filter(Product.base_price_paise >= min_price)
    if max_price is not None:
        stmt = stmt.filter(Product.base_price_paise <= max_price)

    # Text search
    if q:
        pattern = f"%{q}%"
        stmt = stmt.filter(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.blurb.ilike(pattern),
                Product.description.ilike(pattern),
            )
        )

    # Attribute filters — applied via EXISTS subquery to avoid duplicate rows
    if attrs:
        try:
            attr_filters: Dict[str, List[str]] = json.loads(attrs)
        except (json.JSONDecodeError, ValueError):
            attr_filters = {}
        for attr_key, allowed_vals in attr_filters.items():
            if not allowed_vals:
                continue
            attr_obj = db.query(ProductAttribute).filter(ProductAttribute.key == attr_key).first()
            if not attr_obj:
                continue
            sub = (
                select(ProductAttributeValue.product_id)
                .filter(
                    ProductAttributeValue.attribute_id == attr_obj.id,
                    ProductAttributeValue.value.in_(allowed_vals),
                )
                .scalar_subquery()
            )
            stmt = stmt.filter(Product.id.in_(sub))

    # Count
    from sqlalchemy import func
    count_q = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.execute(count_q).scalar() or 0

    # Sorting
    if sort == "price_asc":
        stmt = stmt.order_by(Product.base_price_paise.asc().nulls_last())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.base_price_paise.desc().nulls_first())
    elif sort == "name_asc":
        stmt = stmt.order_by(Product.name.asc())
    else:  # newest
        stmt = stmt.order_by(Product.created_at.desc())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    products = db.execute(stmt).scalars().all()

    return PaginatedResponse(
        items=[_product_to_summary(p) for p in products],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


# ── Filter metadata ───────────────────────────────────────────────────────────

@router.get("/filters", response_model=List[FilterMeta])
def get_filters(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return filterable attributes for a category (or all products)."""
    cat = None
    if category:
        cat = db.query(Category).filter(
            or_(Category.slug == category, Category.id == category)
        ).first()

    if cat:
        configs = (
            db.query(CategoryFilterConfig)
            .filter(CategoryFilterConfig.category_id == cat.id, CategoryFilterConfig.is_visible == True)
            .order_by(CategoryFilterConfig.display_order)
            .all()
        )
        attributes = [c.attribute for c in configs if c.attribute]
    else:
        attributes = (
            db.query(ProductAttribute)
            .filter(
                ProductAttribute.is_filterable == True,
                ProductAttribute.is_active == True,
                ProductAttribute.is_customer_visible == True,
            )
            .order_by(ProductAttribute.display_order)
            .all()
        )

    from sqlalchemy import func
    result = []
    for attr in attributes:
        if not attr:
            continue

        q = (
            db.query(ProductAttributeValue.value, func.count(ProductAttributeValue.product_id))
            .filter(ProductAttributeValue.attribute_id == attr.id)
            .join(Product)
            .filter(Product.status == PublishStatus.published)
        )
        if cat:
            q = q.filter(Product.category_id == cat.id)
        rows = q.group_by(ProductAttributeValue.value).all()
        options = [FilterOptionMeta(value=v, label=v, count=c) for v, c in rows]

        result.append(FilterMeta(
            key=attr.key,
            label=attr.label,
            filter_type=attr.filter_type.value,
            options=options,
            unit=attr.unit,
        ))

    return result


# ── Product detail ────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductDetail)
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.specs),
            selectinload(Product.variants),
            selectinload(Product.inventory),
            selectinload(Product.attribute_values).selectinload(ProductAttributeValue.attribute),
        )
        .filter(or_(Product.id == product_id, Product.slug == product_id, Product.sku == product_id))
        .first()
    )
    if not p or p.status != PublishStatus.published:
        raise NotFoundError(f"Product '{product_id}' not found.")
    return _product_to_detail(p)


# ── Price preview ─────────────────────────────────────────────────────────────

@router.post("/{product_id}/price-preview", response_model=PriceBreakdown)
def price_preview(
    product_id: str,
    body: PricePreviewRequest,
    db: Session = Depends(get_db),
):
    return compute_price_breakdown(
        db=db,
        product_id=product_id,
        quantity=body.quantity,
        variant_id=body.variant_id,
        configuration=body.configuration,
        coupon_code=body.coupon_code,
    )


# ── Customization profile ─────────────────────────────────────────────────────

@router.get("/{product_id}/customization-profile", response_model=CustomizationProfileOut)
@router.get("/{product_id}/customization", response_model=CustomizationProfileOut)
def get_customization_profile(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(
        or_(Product.id == product_id, Product.slug == product_id)
    ).first()

    profile = None
    if product:
        profile = (
            db.query(CustomizationProfile)
            .options(selectinload(CustomizationProfile.fields))
            .filter(
                CustomizationProfile.product_id == product.id,
                CustomizationProfile.status == PublishStatus.published,
            )
            .order_by(CustomizationProfile.created_at.desc())
            .first()
        )
        if not profile:
            profile = (
                db.query(CustomizationProfile)
                .options(selectinload(CustomizationProfile.fields))
                .filter(CustomizationProfile.product_id == product.id)
                .order_by(CustomizationProfile.created_at.desc())
                .first()
            )

    if not profile:
        # Check if product_id is itself the profile ID or matches a profile name
        profile = (
            db.query(CustomizationProfile)
            .options(selectinload(CustomizationProfile.fields))
            .filter(
                or_(
                    CustomizationProfile.id == product_id,
                    CustomizationProfile.name.ilike(product_id.replace("-", " ")),
                )
            )
            .first()
        )

    if not profile:
        return CustomizationProfileOut(
            id=f"default-{product_id}",
            product_id=product.id if product else product_id,
            name="Standard",
            supports_front=False,
            supports_back=False,
            status="published",
            version=1,
            fields=[],
        )

    # Serialize fields
    fields_out = []
    for f in profile.fields:
        allowed = json.loads(f.allowed_values) if f.allowed_values else None
        mimes = f.allowed_mime_types.split(",") if f.allowed_mime_types else None
        vis = json.loads(f.visibility_rule) if f.visibility_rule else None
        fields_out.append({
            "id": f.id,
            "key": f.key,
            "label": f.label,
            "field_type": f.field_type.value,
            "is_required": f.is_required,
            "default_value": f.default_value,
            "allowed_values": allowed,
            "min_length": f.min_length,
            "max_length": f.max_length,
            "min_value": float(f.min_value) if f.min_value else None,
            "max_value": float(f.max_value) if f.max_value else None,
            "allowed_mime_types": mimes,
            "max_file_size_mb": f.max_file_size_mb,
            "affects_price": f.affects_price,
            "price_delta_paise": f.price_delta_paise,
            "display_order": f.display_order,
            "visibility_rule": vis,
        })

    return CustomizationProfileOut(
        id=profile.id,
        product_id=profile.product_id,
        name=profile.name,
        supports_front=profile.supports_front,
        supports_back=profile.supports_back,
        status=profile.status.value,
        version=profile.version,
        fields=fields_out,
    )


@router.post("/{product_id}/customization/validate", response_model=CustomizationValidateResponse)
def validate_customization(
    product_id: str,
    body: CustomizationValidateRequest,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        or_(Product.id == product_id, Product.slug == product_id)
    ).first()
    if not product:
        raise NotFoundError("Product not found.")

    profile = (
        db.query(CustomizationProfile)
        .options(selectinload(CustomizationProfile.fields))
        .filter(CustomizationProfile.product_id == product.id)
        .order_by(CustomizationProfile.created_at.desc())
        .first()
    )
    if not profile:
        raise NotFoundError("Product or customization profile not found.")

    errors: Dict[str, str] = {}
    config = body.configuration

    field_by_id = {f.id: f.key for f in profile.fields}

    for field in profile.fields:
        # Check conditional visibility
        if field.visibility_rule:
            try:
                vis = json.loads(field.visibility_rule)
                dep = vis.get("field")
                dep_key = field_by_id.get(dep, dep)
                expected_val = str(vis.get("value", ""))
                actual_val = str(config.get(dep_key, config.get(dep, "")))
                op = vis.get("op", "equals")

                is_visible = (actual_val == expected_val) if op == "equals" else (actual_val != expected_val)
                if not is_visible:
                    continue  # Hidden field: skip validation entirely
            except Exception:
                pass

        val = config.get(field.key)
        if field.is_required and (val is None or val == ""):
            errors[field.key] = f"{field.label} is required."
            continue
        if val is None or val == "":
            continue

        if field.allowed_values:
            try:
                allowed_raw = json.loads(field.allowed_values)
                allowed_labels = []
                for item in allowed_raw:
                    if isinstance(item, dict):
                        allowed_labels.append(str(item.get("label") or item.get("value", "")).lower())
                    else:
                        allowed_labels.append(str(item).lower())
                if str(val).lower() not in allowed_labels:
                    errors[field.key] = f"Invalid value for {field.label}."
            except Exception:
                pass

        if field.max_length and isinstance(val, str) and len(val) > field.max_length:
            errors[field.key] = f"{field.label} exceeds maximum length of {field.max_length}."
        if field.min_length and isinstance(val, str) and len(val) < field.min_length:
            errors[field.key] = f"{field.label} must be at least {field.min_length} characters."

    return CustomizationValidateResponse(valid=not errors, errors=errors)



# ── Customer Reviews & Moderation ─────────────────────────────────────────────

@router.get("/{product_id}/reviews", response_model=List[ProductReviewOut], summary="Get approved customer reviews for a product")
def get_product_reviews(
    product_id: str,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(or_(Product.id == product_id, Product.slug == product_id)).first()
    if not product:
        raise NotFoundError("Product not found.")

    reviews = (
        db.query(ProductReview)
        .filter(
            ProductReview.product_id == product.id,
            ProductReview.status == "published",
        )
        .order_by(ProductReview.created_at.desc())
        .all()
    )

    out = []
    for r in reviews:
        c_at = r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at)
        out.append(ProductReviewOut(
            id=r.id,
            product_id=r.product_id,
            author_name=r.author_name,
            company=r.company,
            rating=r.rating,
            title=r.title,
            body=r.body,
            text=r.body,
            verified=r.is_verified_purchase,
            is_verified_purchase=r.is_verified_purchase,
            status=r.status,
            created_at=c_at,
        ))
    return out


@router.post("/{product_id}/reviews", summary="Submit a customer review for moderation")
def submit_product_review(
    product_id: str,
    payload: ProductReviewCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(or_(Product.id == product_id, Product.slug == product_id)).first()
    if not product:
        raise NotFoundError("Product not found.")

    # Check verified purchase: user has completed order containing this product
    is_verified = False
    user_id = current_user.id if current_user else None
    if current_user:
        purchased = (
            db.query(OrderItem)
            .join(Order, OrderItem.order_id == Order.id)
            .filter(
                Order.user_id == current_user.id,
                Order.status.in_([OrderStatus.paid, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered]),
                OrderItem.product_id == product.id,
            )
            .first()
        )
        if purchased:
            is_verified = True

    review = ProductReview(
        product_id=product.id,
        user_id=user_id,
        author_name=payload.author_name.strip(),
        company=payload.company.strip() if payload.company else None,
        rating=payload.rating,
        title=payload.title.strip() if payload.title else None,
        body=payload.body.strip(),
        status="pending",
        is_verified_purchase=is_verified,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "status": "pending_moderation",
        "message": "Thank you! Your review has been submitted and is pending moderation.",
    }

