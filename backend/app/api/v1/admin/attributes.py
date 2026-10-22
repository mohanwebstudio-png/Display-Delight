"""
DisplayDelight V2 — Admin Product Attributes and Filter Management API.
Allows administrators to manage attributes, allowed options, and category filter configurations.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, require_catalogue_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import (
    AttributeDataType,
    AttributeOption,
    Category,
    CategoryFilterConfig,
    FilterType,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    User,
)

router = APIRouter(prefix="/attributes", tags=["Admin Attributes"])


@router.get("", summary="Admin: List all product attributes")
def list_attributes(
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    attrs = (
        db.query(ProductAttribute)
        .options(selectinload(ProductAttribute.options))
        .order_by(ProductAttribute.display_order.asc())
        .all()
    )

    out = []
    for a in attrs:
        # Get assigned category slugs
        filter_configs = (
            db.query(CategoryFilterConfig)
            .join(Category)
            .filter(CategoryFilterConfig.attribute_id == a.id)
            .all()
        )
        cat_slugs = [fc.category.slug for fc in filter_configs if fc.category]

        # Allowed values from AttributeOption or distinct ProductAttributeValue
        options_list = [opt.value for opt in sorted(a.options, key=lambda x: x.display_order)]
        if not options_list:
            vals = (
                db.query(ProductAttributeValue.value)
                .filter(ProductAttributeValue.attribute_id == a.id)
                .distinct()
                .all()
            )
            options_list = [str(v[0]) for v in vals if v[0]]

        # Map backend enum to frontend AType
        ui_type = "single"
        if a.filter_type == FilterType.checkbox:
            ui_type = "multi"
        elif a.filter_type == FilterType.range:
            ui_type = "range"
        elif a.data_type == AttributeDataType.number:
            ui_type = "number"
        elif a.data_type == AttributeDataType.text and not options_list:
            ui_type = "text"

        out.append({
            "id": a.id,
            "key": a.key,
            "label": a.label,
            "type": ui_type,
            "data_type": a.data_type.value if hasattr(a.data_type, "value") else str(a.data_type),
            "filter_type": a.filter_type.value if hasattr(a.filter_type, "value") else str(a.filter_type),
            "unit": a.unit,
            "values": options_list,
            "cats": cat_slugs,
            "filterable": a.is_filterable,
            "searchable": a.is_searchable,
            "visible": a.is_customer_visible,
            "behaviour": "single" if a.filter_type == FilterType.radio else "multi",
            "display_order": a.display_order,
            "min": "",
            "max": "",
            "regex": "",
        })
    return out


@router.post("", summary="Admin: Create new attribute")
def create_attribute(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    key = str(payload.get("key", "")).strip().lower()
    label = str(payload.get("label", "")).strip()
    if not key or not label:
        raise ValidationError("Key and label are required.")

    if db.query(ProductAttribute).filter(ProductAttribute.key == key).first():
        raise ValidationError(f"Attribute key '{key}' already exists.")

    ui_type = payload.get("type", "single")
    filter_type = FilterType.radio if payload.get("behaviour") == "single" or ui_type == "bool" else FilterType.checkbox
    if ui_type == "range":
        filter_type = FilterType.range

    data_type = AttributeDataType.number if ui_type in ["number", "range"] else AttributeDataType.select
    if ui_type == "text":
        data_type = AttributeDataType.text

    attr = ProductAttribute(
        key=key,
        label=label,
        data_type=data_type,
        filter_type=filter_type,
        is_filterable=bool(payload.get("filterable", True)),
        is_searchable=bool(payload.get("searchable", False)),
        is_customer_visible=bool(payload.get("visible", True)),
        unit=payload.get("unit"),
        is_active=True,
        display_order=payload.get("display_order", 0),
    )
    db.add(attr)
    db.flush()

    # Allowed options
    values = payload.get("values", [])
    if isinstance(values, list):
        for idx, val in enumerate(values):
            db.add(AttributeOption(
                attribute_id=attr.id,
                value=str(val).strip(),
                display_label=str(val).strip(),
                display_order=idx,
            ))

    # Connect to categories
    cats = payload.get("cats", [])
    if isinstance(cats, list):
        for c_slug in cats:
            cat_obj = db.query(Category).filter(or_(Category.slug == c_slug, Category.id == c_slug)).first()
            if cat_obj:
                db.add(CategoryFilterConfig(
                    category_id=cat_obj.id,
                    attribute_id=attr.id,
                    display_order=0,
                    is_visible=True,
                ))

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="attribute.create",
        resource_type="attribute",
        resource_id=attr.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "attribute_id": attr.id, "key": attr.key}


@router.put("/{key_or_id}", summary="Admin: Update attribute")
def update_attribute(
    key_or_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    attr = db.query(ProductAttribute).filter(
        or_(ProductAttribute.id == key_or_id, ProductAttribute.key == key_or_id)
    ).first()
    if not attr:
        raise NotFoundError(f"Attribute '{key_or_id}' not found.")

    if "label" in payload and payload["label"]:
        attr.label = str(payload["label"]).strip()

    if "type" in payload:
        ui_type = payload["type"]
        if ui_type == "range":
            attr.filter_type = FilterType.range
            attr.data_type = AttributeDataType.number
        elif ui_type == "number":
            attr.data_type = AttributeDataType.number
        elif ui_type == "text":
            attr.data_type = AttributeDataType.text
        else:
            attr.data_type = AttributeDataType.select

    if "behaviour" in payload:
        attr.filter_type = FilterType.radio if payload["behaviour"] == "single" else FilterType.checkbox

    if "filterable" in payload:
        attr.is_filterable = bool(payload["filterable"])
    if "searchable" in payload:
        attr.is_searchable = bool(payload["searchable"])
    if "visible" in payload:
        attr.is_customer_visible = bool(payload["visible"])
    if "unit" in payload:
        attr.unit = payload["unit"]
    if "display_order" in payload:
        attr.display_order = int(payload["display_order"])

    # Update values
    if "values" in payload and isinstance(payload["values"], list):
        db.query(AttributeOption).filter(AttributeOption.attribute_id == attr.id).delete()
        for idx, val in enumerate(payload["values"]):
            db.add(AttributeOption(
                attribute_id=attr.id,
                value=str(val).strip(),
                display_label=str(val).strip(),
                display_order=idx,
            ))

    # Update categories
    if "cats" in payload and isinstance(payload["cats"], list):
        db.query(CategoryFilterConfig).filter(CategoryFilterConfig.attribute_id == attr.id).delete()
        for c_slug in payload["cats"]:
            cat_obj = db.query(Category).filter(or_(Category.slug == c_slug, Category.id == c_slug)).first()
            if cat_obj:
                db.add(CategoryFilterConfig(
                    category_id=cat_obj.id,
                    attribute_id=attr.id,
                    display_order=0,
                    is_visible=True,
                ))

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="attribute.update",
        resource_type="attribute",
        resource_id=attr.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "attribute_id": attr.id, "key": attr.key}


@router.delete("/{key_or_id}", summary="Admin: Delete attribute")
def delete_attribute(
    key_or_id: str,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    attr = db.query(ProductAttribute).filter(
        or_(ProductAttribute.id == key_or_id, ProductAttribute.key == key_or_id)
    ).first()
    if not attr:
        raise NotFoundError(f"Attribute '{key_or_id}' not found.")

    db.delete(attr)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="attribute.delete",
        resource_type="attribute",
        resource_id=attr.id,
        detail={"key": attr.key},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": f"Attribute '{key_or_id}' deleted."}


@router.get("/filters", summary="Admin: List category filter configurations")
def list_category_filters(
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    configs = (
        db.query(CategoryFilterConfig)
        .options(
            selectinload(CategoryFilterConfig.category),
            selectinload(CategoryFilterConfig.attribute),
        )
        .order_by(CategoryFilterConfig.display_order.asc())
        .all()
    )

    out = []
    for c in configs:
        if not c.category or not c.attribute:
            continue
        out.append({
            "id": c.id,
            "category_id": c.category_id,
            "category_slug": c.category.slug,
            "category_name": c.category.name,
            "attribute_id": c.attribute_id,
            "attribute_key": c.attribute.key,
            "attribute_label": c.attribute.label,
            "display_order": c.display_order,
            "is_visible": c.is_visible,
        })
    return out


@router.put("/filters", summary="Admin: Update category filters")
def update_category_filters(
    payload: List[Dict[str, Any]],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    for item in payload:
        cid = item.get("id")
        if not cid:
            continue
        conf = db.query(CategoryFilterConfig).filter(CategoryFilterConfig.id == cid).first()
        if conf:
            if "is_visible" in item:
                conf.is_visible = bool(item["is_visible"])
            if "display_order" in item:
                conf.display_order = int(item["display_order"])
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="category_filters.update",
        resource_type="category_filter_config",
        resource_id="batch",
        detail={"count": len(payload)},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "updated": len(payload)}
