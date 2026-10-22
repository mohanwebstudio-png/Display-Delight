"""
DisplayDelight V2 — Admin Customization Profiles Management API.
Full control over 3D Studio and Product Customization Profiles and Fields.
"""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, require_catalogue_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import (
    CustomizationField,
    CustomizationProfile,
    FieldType,
    Product,
    PublishStatus,
    User,
)

router = APIRouter(prefix="/customization-profiles", tags=["Admin Customization Profiles"])

# Mapping frontend field types to backend FieldType enum
TYPE_MAP = {
    "text": FieldType.text,
    "textarea": FieldType.textarea,
    "dropdown": FieldType.dropdown,
    "radio": FieldType.radio,
    "checkbox": FieldType.checkbox,
    "colour": FieldType.color,
    "color": FieldType.color,
    "number": FieldType.number,
    "size": FieldType.dimensions,
    "dimensions": FieldType.dimensions,
    "font": FieldType.font,
    "orientation": FieldType.orientation,
    "upload": FieldType.artwork_upload,
    "artwork_upload": FieldType.artwork_upload,
    "template": FieldType.template_select,
    "template_select": FieldType.template_select,
    "sides": FieldType.orientation,
    "notes": FieldType.textarea,
}

REV_TYPE_MAP = {
    FieldType.text: "text",
    FieldType.textarea: "textarea",
    FieldType.dropdown: "dropdown",
    FieldType.radio: "radio",
    FieldType.checkbox: "checkbox",
    FieldType.color: "colour",
    FieldType.number: "number",
    FieldType.dimensions: "size",
    FieldType.font: "font",
    FieldType.orientation: "orientation",
    FieldType.artwork_upload: "upload",
    FieldType.template_select: "template",
}


@router.get("", summary="Admin: List customization profiles")
def list_customization_profiles(
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    profiles = (
        db.query(CustomizationProfile)
        .options(
            selectinload(CustomizationProfile.fields),
            selectinload(CustomizationProfile.product),
        )
        .order_by(CustomizationProfile.created_at.desc())
        .all()
    )

    out = []
    for p in profiles:
        out.append({
            "id": p.id,
            "name": p.name,
            "status": p.status.value.capitalize() if hasattr(p.status, "value") else str(p.status).capitalize(),
            "version": p.version,
            "product_id": p.product_id,
            "product_name": p.product.name if p.product else None,
            "product_slug": p.product.slug if p.product else None,
            "supports_front": p.supports_front,
            "supports_back": p.supports_back,
            "fields_count": len(p.fields),
        })
    return out


def _parse_customization_field(profile_id: str, idx: int, f: Dict[str, Any]) -> CustomizationField:
    ft_str = f.get("field_type") or f.get("type", "text")
    ft_enum = TYPE_MAP.get(ft_str, FieldType.text)

    # options
    opts = f.get("options", [])
    allowed_serialized = None
    if isinstance(opts, list) and opts:
        allowed_serialized = json.dumps(opts)

    price_paise = None
    if f.get("price_delta_paise") is not None:
        try:
            price_paise = int(f["price_delta_paise"])
        except Exception:
            pass
    elif f.get("price_delta") is not None:
        try:
            price_paise = int(float(f["price_delta"]) * 100)
        except Exception:
            pass
    elif f.get("price") is not None:
        try:
            price_paise = int(float(f["price"]) * 100)
        except Exception:
            pass

    # Visibility rule
    cond_field = f.get("cond_field") or f.get("condField")
    cond_val = f.get("cond_val") or f.get("condVal")
    cond_op = f.get("cond_op") or f.get("condOp") or "equals"
    vis_rule = None
    if cond_field:
        vis_rule = json.dumps({"field": cond_field, "op": cond_op, "value": cond_val})
    elif f.get("visibility_rule"):
        vis_rule = json.dumps(f["visibility_rule"]) if isinstance(f["visibility_rule"], dict) else str(f["visibility_rule"])

    # Formats / mime types
    allowed_mimes = f.get("allowed_file_types") or f.get("formats") or f.get("allowed_mime_types")
    if isinstance(allowed_mimes, list):
        allowed_mimes = ", ".join(str(m) for m in allowed_mimes)

    min_val = None
    if f.get("min_value") is not None:
        try:
            min_val = Decimal(str(f["min_value"]))
        except Exception:
            pass
    elif f.get("min"):
        try:
            min_val = Decimal(str(f["min"]))
        except Exception:
            pass

    max_val = None
    if f.get("max_value") is not None:
        try:
            max_val = Decimal(str(f["max_value"]))
        except Exception:
            pass
    elif f.get("max"):
        try:
            max_val = Decimal(str(f["max"]))
        except Exception:
            pass

    max_mb = None
    if f.get("max_file_size_mb") is not None:
        try:
            max_mb = int(f["max_file_size_mb"])
        except Exception:
            pass
    elif f.get("maxMb") is not None:
        try:
            max_mb = int(f["maxMb"])
        except Exception:
            pass

    min_len = int(f["min_length"]) if f.get("min_length") is not None else None
    max_len = int(f["max_length"]) if f.get("max_length") is not None else None

    return CustomizationField(
        profile_id=profile_id,
        key=f.get("key") or f"f_{idx+1}",
        label=f.get("label") or f"Field {idx+1}",
        field_type=ft_enum,
        is_required=bool(f.get("is_required") or f.get("required", False)),
        default_value=str(f.get("default_value") or f.get("def") or "") if (f.get("default_value") is not None or f.get("def") is not None) else None,
        allowed_values=allowed_serialized,
        allowed_mime_types=allowed_mimes,
        max_file_size_mb=max_mb,
        min_value=min_val,
        max_value=max_val,
        min_length=min_len,
        max_length=max_len,
        visibility_rule=vis_rule,
        affects_price=bool(f.get("priceMode") in ["fixed", "unit"] or (price_paise is not None and price_paise > 0) or f.get("affects_price")),
        price_delta_paise=price_paise,
        display_order=f.get("display_order", idx),
    )


@router.get("/{profile_id}", summary="Admin: Get customization profile detail")
def get_customization_profile(
    profile_id: str,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    p = (
        db.query(CustomizationProfile)
        .options(
            selectinload(CustomizationProfile.fields),
            selectinload(CustomizationProfile.product),
        )
        .filter(
            or_(
                CustomizationProfile.id == profile_id,
                CustomizationProfile.product_id == profile_id,
                CustomizationProfile.name.ilike(profile_id.replace("-", " ")),
            )
        )
        .first()
    )
    if not p:
        raise NotFoundError(f"Customization profile '{profile_id}' not found.")

    fields_out = []
    for f in p.fields:
        opts_list = []
        if f.allowed_values:
            try:
                parsed = json.loads(f.allowed_values)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict):
                            opts_list.append({
                                "label": item.get("label", ""),
                                "price": item.get("price") or item.get("price_delta") or 0,
                                "hex": item.get("hex"),
                            })
                        else:
                            opts_list.append({"label": str(item), "price": 0})
            except Exception:
                opts_list = []

        # Parse visibility rule
        cond_field = ""
        cond_op = "equals"
        cond_val = ""
        if f.visibility_rule:
            try:
                vis = json.loads(f.visibility_rule)
                if isinstance(vis, dict):
                    cond_field = vis.get("field", "")
                    cond_op = vis.get("op", "equals")
                    cond_val = vis.get("value", "")
            except Exception:
                pass

        fields_out.append({
            "id": f.id,
            "key": f.key,
            "label": f.label,
            "type": REV_TYPE_MAP.get(f.field_type, "text"),
            "required": f.is_required,
            "def": f.default_value or "",
            "options": opts_list,
            "priceMode": "fixed" if f.affects_price else "none",
            "price": (f.price_delta_paise or 0) / 100 if f.price_delta_paise else 0,
            "display_order": f.display_order,
            "fixed": True,
            "min": str(f.min_value or f.min_length or ""),
            "max": str(f.max_value or f.max_length or ""),
            "condField": cond_field,
            "condOp": cond_op,
            "condVal": cond_val,
            "formats": (f.allowed_mime_types or "PNG, JPG, SVG, PDF").split(", "),
            "maxMb": str(f.max_file_size_mb or 10),
            "mapPos": "Centre",
            "twoSided": p.supports_back,
        })

    return {
        "id": p.id,
        "name": p.name,
        "status": p.status.value.capitalize() if hasattr(p.status, "value") else str(p.status).capitalize(),
        "version": p.version,
        "product_id": p.product_id,
        "product_name": p.product.name if p.product else None,
        "supports_front": p.supports_front,
        "supports_back": p.supports_back,
        "fields": fields_out,
    }


@router.post("", summary="Admin: Create customization profile")
def create_customization_profile(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    name = str(payload.get("name", "")).strip()
    if not name:
        raise ValidationError("Profile name is required.")

    status_val = str(payload.get("status", "draft")).lower()
    stat = PublishStatus.published if status_val == "published" else PublishStatus.draft

    # Product resolution
    product = None
    prod_id = payload.get("product_id")
    if prod_id:
        product = db.query(Product).filter(or_(Product.id == prod_id, Product.slug == prod_id)).first()
        if product:
            existing = db.query(CustomizationProfile).filter(CustomizationProfile.product_id == product.id).all()
            for ep in existing:
                ep.product_id = None

    prof = CustomizationProfile(
        name=name,
        product_id=product.id if product else None,
        status=stat,
        version=int(payload.get("version", 1)),
        supports_front=bool(payload.get("supports_front", True)),
        supports_back=bool(payload.get("supports_back", False)),
    )
    db.add(prof)
    db.flush()

    # Fields
    fields_data = payload.get("fields", [])
    if isinstance(fields_data, list):
        for idx, f in enumerate(fields_data):
            field_obj = _parse_customization_field(prof.id, idx, f)
            db.add(field_obj)

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

    return {"status": "success", "profile_id": prof.id, "id": prof.id, "name": prof.name}


@router.put("/{profile_id}", summary="Admin: Update customization profile")
def update_customization_profile(
    profile_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    prof = (
        db.query(CustomizationProfile)
        .filter(
            or_(
                CustomizationProfile.id == profile_id,
                CustomizationProfile.product_id == profile_id,
            )
        )
        .first()
    )
    if not prof:
        raise NotFoundError(f"Customization profile '{profile_id}' not found.")

    if "name" in payload and payload["name"]:
        prof.name = str(payload["name"]).strip()
    if "status" in payload:
        s_val = str(payload["status"]).lower()
        prof.status = PublishStatus.published if s_val == "published" else PublishStatus.draft
    if "supports_front" in payload:
        prof.supports_front = bool(payload["supports_front"])
    if "supports_back" in payload:
        prof.supports_back = bool(payload["supports_back"])
    if "version" in payload:
        prof.version = int(payload["version"])

    if "product_id" in payload:
        prod_id = payload["product_id"]
        if prod_id:
            p = db.query(Product).filter(or_(Product.id == prod_id, Product.slug == prod_id)).first()
            if p:
                existing = db.query(CustomizationProfile).filter(CustomizationProfile.product_id == p.id, CustomizationProfile.id != prof.id).all()
                for ep in existing:
                    ep.product_id = None
                prof.product_id = p.id
            else:
                prof.product_id = None
        else:
            prof.product_id = None

    # Replace fields if provided
    if "fields" in payload and isinstance(payload["fields"], list):
        db.query(CustomizationField).filter(CustomizationField.profile_id == prof.id).delete()
        for idx, f in enumerate(payload["fields"]):
            field_obj = _parse_customization_field(prof.id, idx, f)
            db.add(field_obj)

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="customization_profile.update",
        resource_type="customization_profile",
        resource_id=prof.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "profile_id": prof.id, "name": prof.name}


@router.delete("/{profile_id}", summary="Admin: Delete customization profile")
def delete_customization_profile(
    profile_id: str,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    prof = db.query(CustomizationProfile).filter(CustomizationProfile.id == profile_id).first()
    if not prof:
        raise NotFoundError(f"Customization profile '{profile_id}' not found.")

    db.delete(prof)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="customization_profile.delete",
        resource_type="customization_profile",
        resource_id=profile_id,
        detail={"name": prof.name},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": f"Profile '{profile_id}' deleted."}
