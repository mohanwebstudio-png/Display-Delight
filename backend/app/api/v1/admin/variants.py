"""
DisplayDelight V2 — Admin Product Variants & Option Sets Management API.
Full administrative control over product variant option sets (Size, Pitch, Mounting, Touch, etc.).
Directly synced with the SQLite database.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_catalogue_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import User, VariantOptionSet


router = APIRouter(prefix="/variants", tags=["Admin Variants"])


@router.get("", summary="Admin: List all variant option sets")
def list_admin_variants(
    category_id: Optional[str] = None,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    query = db.query(VariantOptionSet)
    if category_id:
        query = query.filter(VariantOptionSet.applies_to_category == category_id)
    sets = query.order_by(VariantOptionSet.display_order.asc()).all()

    out = []
    for s in sets:
        try:
            vals = json.loads(s.values_json)
        except Exception:
            vals = []
        out.append({
            "id": s.id,
            "name": s.name,
            "applies": s.applies_to_category,
            "values": vals,
            "style": s.style,
            "required": s.is_required,
            "display_order": s.display_order,
        })
    return out


@router.post("", summary="Admin: Create new variant option set")
def create_variant_set(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValidationError("Variant option set name is required.")

    applies = payload.get("applies") or payload.get("category_id") or "all"
    values = payload.get("values", [])
    if isinstance(values, str):
        values = [v.strip() for v in values.split(",") if v.strip()]

    max_order = db.query(VariantOptionSet).count()

    v_set = VariantOptionSet(
        name=name,
        applies_to_category=applies,
        values_json=json.dumps(values),
        style=payload.get("style", "buttons"),
        is_required=payload.get("required", False),
        display_order=payload.get("display_order", max_order + 1),
    )
    db.add(v_set)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="variant.create",
        resource_type="variant_option_set",
        resource_id=v_set.id,
        detail={"name": v_set.name, "category": applies},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "status": "success",
        "item": {
            "id": v_set.id,
            "name": v_set.name,
            "applies": v_set.applies_to_category,
            "values": values,
            "style": v_set.style,
            "required": v_set.is_required,
            "display_order": v_set.display_order,
        }
    }


@router.put("/{variant_id}", summary="Admin: Update variant option set")
def update_variant_set(
    variant_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    v_set = db.get(VariantOptionSet, variant_id)
    if not v_set:
        raise NotFoundError("Variant option set not found.")

    if "name" in payload and payload["name"]:
        v_set.name = payload["name"].strip()
    if "applies" in payload:
        v_set.applies_to_category = payload["applies"]
    elif "category_id" in payload:
        v_set.applies_to_category = payload["category_id"]
    if "values" in payload:
        vals = payload["values"]
        if isinstance(vals, str):
            vals = [v.strip() for v in vals.split(",") if v.strip()]
        v_set.values_json = json.dumps(vals)
    if "style" in payload:
        v_set.style = payload["style"]
    if "required" in payload:
        v_set.is_required = bool(payload["required"])
    if "display_order" in payload:
        v_set.display_order = int(payload["display_order"])

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="variant.update",
        resource_type="variant_option_set",
        resource_id=v_set.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    try:
        vals = json.loads(v_set.values_json)
    except Exception:
        vals = []

    return {
        "status": "success",
        "item": {
            "id": v_set.id,
            "name": v_set.name,
            "applies": v_set.applies_to_category,
            "values": vals,
            "style": v_set.style,
            "required": v_set.is_required,
            "display_order": v_set.display_order,
        }
    }


@router.delete("/{variant_id}", summary="Admin: Delete variant option set")
def delete_variant_set(
    variant_id: str,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    v_set = db.get(VariantOptionSet, variant_id)
    if not v_set:
        raise NotFoundError("Variant option set not found.")

    db.delete(v_set)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="variant.delete",
        resource_type="variant_option_set",
        resource_id=variant_id,
        detail={"name": v_set.name},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Variant option set deleted."}
