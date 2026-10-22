"""
DisplayDelight V2 — Admin Products & Catalogue Management API.
Full administrative control over:
- Products, variants, specifications, media
- Categories & sidebar filter mappings
- Customization builder profiles
- Inventory stock adjustments
All mutations are strictly guarded with RBAC and logged to audit_logs.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, require_catalogue_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import (
    Category,
    CategoryFilterConfig,
    CustomizationProfile,
    Inventory,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductImage,
    ProductKind,
    ProductSpec,
    ProductVariant,
    PublishStatus,
    User,
)
from app.schemas.schemas import CategoryIn, CategoryOut, InventoryAdjust, PaginatedResponse, ProductIn


router = APIRouter(prefix="/products", tags=["Admin Products"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r"[^\w\s-]", "", text).replace(" ", "-")


def _find_product(db: Session, identifier: str) -> Optional[Product]:
    return (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.specs),
            selectinload(Product.variants),
            selectinload(Product.inventory),
            selectinload(Product.customization_profile),
            selectinload(Product.attribute_values).selectinload(ProductAttributeValue.attribute),
        )
        .filter(or_(Product.id == identifier, Product.slug == identifier, Product.sku == identifier))
        .first()
    )


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("", summary="Admin: List all products with filtering and pagination")
def list_admin_products(
    page: int = 1,
    page_size: int = 50,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    q: Optional[str] = None,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.inventory),
    )
    if status:
        stat_val = status.lower()
        if stat_val in ["published", "draft", "archived"]:
            query = query.filter(Product.status == PublishStatus(stat_val))
    if category_id:
        cat = db.query(Category).filter(or_(Category.id == category_id, Category.slug == category_id)).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(Product.name.ilike(term) | Product.sku.ilike(term))

    total = query.count()
    products = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for p in products:
        items.append({
            "id": p.id,
            "sku": p.sku,
            "slug": p.slug,
            "name": p.name,
            "kind": p.kind.value if hasattr(p.kind, "value") else str(p.kind),
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "price_mode": "quote" if p.base_price_paise is None else "fixed",
            "base_price_paise": p.base_price_paise,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else None,
            "category_slug": p.category.slug if p.category else None,
            "primary_image": p.images[0].url if p.images else None,
            "is_featured": p.is_customizable,
            "stock": p.inventory.quantity if p.inventory else 10,
            "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/{product_id}", summary="Admin: Get product detail by ID, slug, or SKU")
def get_admin_product(
    product_id: str,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    p = _find_product(db, product_id)
    if not p:
        raise NotFoundError(f"Product '{product_id}' not found.")

    return {
        "id": p.id,
        "sku": p.sku,
        "slug": p.slug,
        "name": p.name,
        "kind": p.kind.value if hasattr(p.kind, "value") else str(p.kind),
        "status": p.status.value if hasattr(p.status, "value") else str(p.status),
        "price_mode": "quote" if p.base_price_paise is None else "fixed",
        "base_price_paise": p.base_price_paise,
        "base_price_inr": (p.base_price_paise // 100) if p.base_price_paise else None,
        "category_id": p.category_id,
        "category_slug": p.category.slug if p.category else None,
        "category_name": p.category.name if p.category else None,
        "blurb": p.blurb,
        "description": p.description,
        "gst_rate": p.gst_rate,
        "is_customizable": p.is_customizable,
        "images": [{"url": img.url, "alt": img.alt_text, "is_primary": img.is_primary} for img in p.images],
        "primary_image": p.images[0].url if p.images else None,
        "specs": [[s.label, s.value] for s in p.specs],
        "variants": [{"id": v.id, "name": v.name, "sku": v.sku, "price_delta_paise": v.price_delta_paise, "is_active": v.is_active} for v in p.variants],
        "stock": p.inventory.quantity if p.inventory else 10,
        "track_stock": p.inventory.track_stock if p.inventory else True,
        "profile": p.customization_profile.id if p.customization_profile else "",
        "profile_name": p.customization_profile.name if p.customization_profile else "",
        "attributes": {
            pav.attribute.key: pav.value
            for pav in (p.attribute_values or [])
            if pav.attribute
        },
        "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
    }


@router.post("", summary="Admin: Create new product")
def create_product(
    payload: ProductIn,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    # Check SKU uniqueness
    if db.query(Product).filter(Product.sku == payload.sku.strip().upper()).first():
        raise ValidationError(f"SKU '{payload.sku}' already exists.")

    slug = payload.slug or _slugify(payload.name)
    if db.query(Product).filter(Product.slug == slug).first():
        slug = f"{slug}-{payload.sku.lower()}"

    # Resolve category
    cat = None
    if payload.category_id:
        cat = db.query(Category).filter(
            or_(Category.id == payload.category_id, Category.slug == payload.category_id)
        ).first()

    blurb = payload.blurb or payload.short_description or ""
    desc = payload.description or payload.long_description or blurb
    stat = PublishStatus.published if (payload.status or "").lower() == "published" else PublishStatus.draft
    k = ProductKind(payload.kind) if payload.kind in [pk.value for pk in ProductKind] else ProductKind.standard

    product = Product(
        sku=payload.sku.strip().upper(),
        slug=slug,
        name=payload.name.strip(),
        category_id=cat.id if cat else None,
        kind=k,
        blurb=blurb,
        description=desc,
        status=stat,
        base_price_paise=payload.base_price_paise,
        gst_rate=payload.gst_rate,
        is_customizable=bool(payload.is_customizable or payload.is_featured),
    )
    db.add(product)
    db.flush()

    # Images
    if payload.images:
        for idx, img in enumerate(payload.images):
            if isinstance(img, str):
                url, alt = img, product.name
            elif isinstance(img, dict):
                url = img.get("image_url") or img.get("url") or ""
                alt = img.get("alt_text") or img.get("alt") or product.name
            else:
                url = getattr(img, "image_url", getattr(img, "url", ""))
                alt = getattr(img, "alt_text", getattr(img, "alt", product.name))
            if url:
                db.add(ProductImage(
                    product_id=product.id,
                    url=url,
                    alt_text=alt,
                    is_primary=(idx == 0),
                    display_order=idx,
                ))

    # Specs
    if payload.specs:
        for idx, s in enumerate(payload.specs):
            if isinstance(s, (list, tuple)) and len(s) >= 2:
                label, val = str(s[0]), str(s[1])
            elif isinstance(s, dict):
                label = s.get("label") or f"{s.get('group_name', 'General')}: {s.get('spec_key', '')}"
                val = s.get("value") or s.get("spec_value", "")
            else:
                label = getattr(s, "label", f"{getattr(s, "group_name", "General")}: {getattr(s, "spec_key", "")}")
                val = getattr(s, "value", getattr(s, "spec_value", ""))
            if label.strip() and val.strip():
                db.add(ProductSpec(
                    product_id=product.id,
                    label=label.strip(),
                    value=val.strip(),
                    display_order=idx,
                ))

    # Variants
    if getattr(payload, "variants", None):
        for idx, v in enumerate(payload.variants):
            if isinstance(v, dict):
                v_name = v.get("name") or v.get("label") or f"Variant {idx+1}"
                v_sku = v.get("sku") or f"{product.sku}-{idx+1}"
                delta = v.get("price_delta_paise")
                if delta is None and v.get("price"):
                    try:
                        override_paise = int(float(v["price"]) * 100)
                        if product.base_price_paise:
                            delta = override_paise - product.base_price_paise
                    except Exception:
                        pass
                is_active = bool(v.get("is_active", v.get("on", True)))
                db.add(ProductVariant(
                    product_id=product.id,
                    name=v_name,
                    sku=v_sku,
                    price_delta_paise=delta,
                    is_active=is_active,
                ))

    # Initial Inventory
    stock_qty = payload.stock if payload.stock is not None else 10
    inv = Inventory(
        product_id=product.id,
        quantity=max(0, stock_qty),
        reserved=0,
        track_stock=True,
    )
    db.add(inv)

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="product.create",
        resource_type="product",
        resource_id=product.id,
        detail={"sku": product.sku, "name": product.name},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "product_id": product.id, "slug": product.slug}


@router.put("/{product_id}", summary="Admin: Update existing product")
def update_product(
    product_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    product = _find_product(db, product_id)
    if not product:
        raise NotFoundError("Product not found.")

    if "name" in payload and payload["name"]:
        product.name = payload["name"].strip()
    if "sku" in payload and payload["sku"]:
        product.sku = payload["sku"].strip().upper()
    if "slug" in payload and payload["slug"]:
        new_slug = payload["slug"].strip().lower()
        conflict = db.query(Product).filter(Product.slug == new_slug, Product.id != product.id).first()
        if conflict:
            raise ValidationError(f"Slug '{new_slug}' is already taken by another product.")
        product.slug = new_slug
    if "blurb" in payload or "short_description" in payload:
        product.blurb = payload.get("blurb") or payload.get("short_description")
    if "description" in payload or "long_description" in payload:
        product.description = payload.get("description") or payload.get("long_description")
    if "base_price_paise" in payload:
        product.base_price_paise = payload["base_price_paise"]
    if "gst_rate" in payload:
        product.gst_rate = payload["gst_rate"]
    if "is_customizable" in payload or "is_featured" in payload:
        product.is_customizable = bool(payload.get("is_customizable") or payload.get("is_featured"))
    if "status" in payload and payload["status"]:
        s_val = str(payload["status"]).lower()
        if s_val == "published":
            product.status = PublishStatus.published
        elif s_val == "archived":
            product.status = PublishStatus.archived
        else:
            product.status = PublishStatus.draft
    if "kind" in payload and payload["kind"]:
        k_val = str(payload["kind"]).lower()
        if k_val in [pk.value for pk in ProductKind]:
            product.kind = ProductKind(k_val)
    if "category_id" in payload and payload["category_id"]:
        cat = db.query(Category).filter(
            or_(Category.id == payload["category_id"], Category.slug == payload["category_id"])
        ).first()
        if cat:
            product.category_id = cat.id

    # Images
    if "images" in payload and isinstance(payload["images"], list):
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for idx, img in enumerate(payload["images"]):
            if isinstance(img, str):
                url, alt = img, product.name
            elif isinstance(img, dict):
                url = img.get("image_url") or img.get("url") or ""
                alt = img.get("alt_text") or img.get("alt") or product.name
            else:
                url = getattr(img, "image_url", getattr(img, "url", ""))
                alt = getattr(img, "alt_text", getattr(img, "alt", product.name))
            if url:
                db.add(ProductImage(
                    product_id=product.id,
                    url=url,
                    alt_text=alt,
                    is_primary=(idx == 0),
                    display_order=idx,
                ))

    # Specs
    if "specs" in payload and isinstance(payload["specs"], list):
        db.query(ProductSpec).filter(ProductSpec.product_id == product.id).delete()
        for idx, s in enumerate(payload["specs"]):
            if isinstance(s, (list, tuple)) and len(s) >= 2:
                label, val = str(s[0]), str(s[1])
            elif isinstance(s, dict):
                label = s.get("label") or f"{s.get('group_name', 'General')}: {s.get('spec_key', '')}"
                val = s.get("value") or s.get("spec_value", "")
            else:
                continue
            if label.strip() and val.strip():
                db.add(ProductSpec(
                    product_id=product.id,
                    label=label.strip(),
                    value=val.strip(),
                    display_order=idx,
                ))

    # Variants
    if "variants" in payload and isinstance(payload["variants"], list):
        db.query(ProductVariant).filter(ProductVariant.product_id == product.id).delete()
        for idx, v in enumerate(payload["variants"]):
            if isinstance(v, dict):
                v_name = v.get("name") or v.get("label") or f"Variant {idx+1}"
                v_sku = v.get("sku") or f"{product.sku}-{idx+1}"
                delta = v.get("price_delta_paise")
                if delta is None and v.get("price") is not None and str(v.get("price")).strip() != "":
                    try:
                        override_paise = int(round(float(v["price"]) * 100))
                        if product.base_price_paise is not None:
                            delta = override_paise - product.base_price_paise
                        else:
                            delta = 0
                    except Exception:
                        pass
                is_active = bool(v.get("is_active", v.get("on", True)))
                db.add(ProductVariant(
                    product_id=product.id,
                    name=v_name,
                    sku=v_sku,
                    price_delta_paise=delta,
                    is_active=is_active,
                ))

        # Synchronize size and thickness attribute values from variants
        size_attr = db.query(ProductAttribute).filter(ProductAttribute.key == 'size').first()
        if size_attr:
            db.query(ProductAttributeValue).filter(
                ProductAttributeValue.product_id == product.id,
                ProductAttributeValue.attribute_id == size_attr.id
            ).delete()
            for v in payload["variants"]:
                v_name = v.get("name") or v.get("label") or ""
                # Extract clean size token
                m = re.search(r"\(([^)]+)\)", v_name)
                sz = m.group(1).strip() if m else v_name.split()[0].strip()
                if not sz:
                    sz = v_name.strip()
                if sz:
                    db.add(ProductAttributeValue(
                        product_id=product.id,
                        attribute_id=size_attr.id,
                        value=sz,
                    ))

        # Synchronize thickness attribute for fabric signage if thickness variants are provided
        thick_attr = db.query(ProductAttribute).filter(ProductAttribute.key == 'thickness').first()
        if thick_attr and ('fabric' in (product.slug or '') or product.sku == 'DD-FAB-01'):
            db.query(ProductAttributeValue).filter(
                ProductAttributeValue.product_id == product.id,
                ProductAttributeValue.attribute_id == thick_attr.id
            ).delete()
            for v in payload["variants"]:
                v_name = v.get("name") or v.get("label") or ""
                m = re.search(r"(\d+\s*mm)", v_name, re.I)
                thk = m.group(1).strip() if m else v_name.strip()
                if thk:
                    db.add(ProductAttributeValue(
                        product_id=product.id,
                        attribute_id=thick_attr.id,
                        value=thk,
                    ))

    # Inventory
    if "stock" in payload and payload["stock"] is not None:
        inv = db.query(Inventory).filter(Inventory.product_id == product.id).first()
        if not inv:
            inv = Inventory(product_id=product.id, quantity=int(payload["stock"]), reserved=0, track_stock=True)
            db.add(inv)
        else:
            inv.quantity = max(0, int(payload["stock"]))

    # Product Attributes
    if "attributes" in payload:
        attrs_input = payload["attributes"]
        if isinstance(attrs_input, dict):
            db.query(ProductAttributeValue).filter(ProductAttributeValue.product_id == product.id).delete()
            for a_key, a_val in attrs_input.items():
                attr_obj = db.query(ProductAttribute).filter(ProductAttribute.key == a_key).first()
                if not attr_obj:
                    continue
                vals = a_val if isinstance(a_val, list) else [a_val]
                for v in vals:
                    if v:
                        db.add(ProductAttributeValue(
                            product_id=product.id,
                            attribute_id=attr_obj.id,
                            value=str(v).strip(),
                        ))

    # Customization Profile Assignment
    if "profile" in payload or "profile_id" in payload:
        prof_identifier = payload.get("profile") or payload.get("profile_id")
        if prof_identifier:
            prof_obj = db.query(CustomizationProfile).filter(
                or_(
                    CustomizationProfile.id == prof_identifier,
                    CustomizationProfile.name.ilike(str(prof_identifier).replace("-", " ")),
                )
            ).first()
            if prof_obj:
                prof_obj.product_id = product.id
        else:
            old_prof = db.query(CustomizationProfile).filter(CustomizationProfile.product_id == product.id).first()
            if old_prof:
                old_prof.product_id = None

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="product.update",
        resource_type="product",
        resource_id=product.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "product_id": product.id}


@router.delete("/{product_id}", summary="Admin: Archive or delete product")
def delete_product(
    product_id: str,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    product = _find_product(db, product_id)
    if not product:
        raise NotFoundError("Product not found.")

    product.status = PublishStatus.archived
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="product.archive",
        resource_type="product",
        resource_id=product.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Product archived."}


# ── Inventory Adjustment ──────────────────────────────────────────────────────

@router.post("/inventory/adjust", summary="Admin: Adjust product or variant stock")
def adjust_inventory(
    payload: InventoryAdjust,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    inv = None
    if payload.variant_id:
        inv = db.query(Inventory).filter(Inventory.variant_id == payload.variant_id).first()
    elif payload.product_id:
        prod = _find_product(db, payload.product_id)
        prod_id = prod.id if prod else payload.product_id
        inv = db.query(Inventory).filter(Inventory.product_id == prod_id).first()
        if not inv and prod:
            inv = Inventory(
                product_id=prod.id,
                quantity=0,
                reserved=0,
                track_stock=True,
            )
            db.add(inv)

    if not inv:
        inv = Inventory(
            product_id=payload.product_id,
            quantity=0,
            reserved=0,
            track_stock=True,
        )
        db.add(inv)

    previous_stock = inv.quantity
    inv.quantity = max(0, inv.quantity + payload.delta)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="inventory.adjust",
        resource_type="inventory",
        resource_id=inv.id,
        detail={
            "product_id": payload.product_id,
            "delta": payload.delta,
            "previous_stock": previous_stock,
            "new_stock": inv.quantity,
            "reason": payload.reason,
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "status": "success",
        "previous_stock": previous_stock,
        "new_stock": inv.quantity,
    }


# ── Customization Profiles ───────────────────────────────────────────────────

@router.get("/customization-profiles", summary="Admin: List customization profiles")
def list_customization_profiles(
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    profiles = db.query(CustomizationProfile).all()
    out = []
    for p in profiles:
        out.append({
            "id": p.id,
            "name": p.name,
            "version": p.version,
            "fields_count": len(p.fields),
        })
    return out


@router.post("/customization-profiles", summary="Admin: Create customization profile")
def create_customization_profile(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    prof = CustomizationProfile(
        name=payload["name"],
        version=payload.get("version", 1),
        schema_json=json.dumps(payload.get("schema", {})),
    )
    db.add(prof)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="customization_profile.create",
        resource_type="customization_profile",
        resource_id=prof.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "profile_id": prof.id}
