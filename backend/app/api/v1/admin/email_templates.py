"""
DisplayDelight V3 — Admin Email Templates API Router.
Enables administrators to view, customize, edit, preview, and test-send
transactional email templates across all customer and internal events.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.models.models import User
from app.api.v1.admin.common import log_audit
from app.services.email_templates import (
    DEFAULT_TEMPLATES,
    get_all_templates,
    get_template,
    save_template,
    reset_template,
    render_template,
)
from app.services.notifications import send_email

router = APIRouter(prefix="/email-templates", tags=["Admin Email Templates"])


class TemplateUpdateRequest(BaseModel):
    subject: Optional[str] = None
    heading: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    custom_html: Optional[str] = None


class TemplatePreviewRequest(BaseModel):
    subject: Optional[str] = None
    heading: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    custom_html: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class TemplateTestSendRequest(BaseModel):
    to: str
    subject: Optional[str] = None
    heading: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    custom_html: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


@router.get("", summary="List all email templates with customized overrides")
def list_email_templates(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    templates = get_all_templates(db=db)
    # Enrich with rendered sample preview for instant display
    for t in templates:
        ctx = t.get("sample_context") or {}
        rendered = render_template(t["id"], ctx, db=db)
        t["preview_subject"] = rendered["subject"]
        t["preview_html"] = rendered["body_html"]
        t["preview_text"] = rendered["body_text"]
    return templates


@router.get("/{template_id}", summary="Get a single email template by ID")
def get_email_template(
    template_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tpl = get_template(template_id, db=db)
    if not tpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template '{template_id}' was not found.",
        )
    ctx = tpl.get("sample_context") or {}
    rendered = render_template(template_id, ctx, db=db)
    tpl["preview_subject"] = rendered["subject"]
    tpl["preview_html"] = rendered["body_html"]
    tpl["preview_text"] = rendered["body_text"]
    return tpl


@router.put("/{template_id}", summary="Update and customize an email template")
def update_email_template(
    template_id: str,
    payload: TemplateUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' is not an editable template.",
        )

    updated = save_template(template_id, payload.model_dump(exclude_unset=True), db=db)

    log_audit(
        db=db,
        actor=admin_user,
        action="email_template.update",
        resource_type="email_template",
        resource_id=template_id,
        detail={"template_id": template_id, "updated_fields": list(payload.model_dump(exclude_unset=True).keys())},
        ip_address=request.client.host if request.client else None,
    )

    ctx = updated.get("sample_context") or {}
    rendered = render_template(template_id, ctx, db=db)
    updated["preview_subject"] = rendered["subject"]
    updated["preview_html"] = rendered["body_html"]
    updated["preview_text"] = rendered["body_text"]

    return {"status": "ok", "message": f"Template '{template_id}' updated successfully.", "template": updated}


@router.post("/{template_id}/reset", summary="Reset an email template to default factory settings")
def reset_email_template_endpoint(
    template_id: str,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if template_id not in DEFAULT_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' is not recognized.",
        )

    reset_item = reset_template(template_id, db=db)

    log_audit(
        db=db,
        actor=admin_user,
        action="email_template.reset",
        resource_type="email_template",
        resource_id=template_id,
        detail={"template_id": template_id},
        ip_address=request.client.host if request.client else None,
    )

    ctx = reset_item.get("sample_context") or {}
    rendered = render_template(template_id, ctx, db=db)
    reset_item["preview_subject"] = rendered["subject"]
    reset_item["preview_html"] = rendered["body_html"]
    reset_item["preview_text"] = rendered["body_text"]

    return {"status": "ok", "message": f"Template '{template_id}' reset to system defaults.", "template": reset_item}


@router.post("/{template_id}/preview", summary="Live render a preview of template edits")
def preview_email_template(
    template_id: str,
    payload: TemplatePreviewRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tpl = get_template(template_id, db=db)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    context = dict(tpl.get("sample_context") or {})
    if payload.context:
        context.update(payload.context)

    # Temporary overlay of incoming unsaved draft changes
    temp_tpl = dict(tpl)
    if payload.subject is not None: temp_tpl["subject"] = payload.subject
    if payload.heading is not None: temp_tpl["heading"] = payload.heading
    if payload.body is not None: temp_tpl["body"] = payload.body
    if payload.cta_text is not None: temp_tpl["cta_text"] = payload.cta_text
    if payload.cta_url is not None: temp_tpl["cta_url"] = payload.cta_url
    if payload.custom_html is not None: temp_tpl["custom_html"] = payload.custom_html

    from app.services.email_templates import _build_responsive_html

    subject_raw = temp_tpl.get("subject", "")
    heading_raw = temp_tpl.get("heading", "")
    body_raw = temp_tpl.get("body", "")
    cta_text_raw = temp_tpl.get("cta_text", "")
    cta_url_raw = temp_tpl.get("cta_url", "")
    custom_html = temp_tpl.get("custom_html")

    def _sub(text: str) -> str:
        if not text: return ""
        s = text
        for k, v in context.items():
            val = str(v) if v is not None else ""
            s = s.replace(f"{{{{{k}}}}}", val)
            s = s.replace(f"{{{k}}}", val)
        return s

    subject = _sub(subject_raw)
    heading = _sub(heading_raw)
    body = _sub(body_raw)
    cta_text = _sub(cta_text_raw) if cta_text_raw else None
    cta_url = _sub(cta_url_raw) if cta_url_raw else None

    if custom_html and custom_html.strip():
        html = _sub(custom_html)
    else:
        html = _build_responsive_html(
            heading=heading or subject,
            body=body,
            cta_text=cta_text,
            cta_url=cta_url,
            badge=temp_tpl.get("badge", "DisplayDelight Official"),
        )

    return {
        "subject": subject,
        "body_text": f"{heading}\n\n{body}" + (f"\n\n{cta_text}: {cta_url}" if cta_text and cta_url else ""),
        "body_html": html,
    }


@router.post("/{template_id}/test-send", summary="Send a real test email using this template")
def test_send_email_template(
    template_id: str,
    payload: TemplateTestSendRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not payload.to or "@" not in payload.to:
        raise HTTPException(status_code=400, detail="Invalid recipient email address.")

    tpl = get_template(template_id, db=db)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    context = dict(tpl.get("sample_context") or {})
    if payload.context:
        context.update(payload.context)

    # Use unsaved live draft changes if provided, else use saved template
    temp_tpl = dict(tpl)
    if payload.subject is not None: temp_tpl["subject"] = payload.subject
    if payload.heading is not None: temp_tpl["heading"] = payload.heading
    if payload.body is not None: temp_tpl["body"] = payload.body
    if payload.cta_text is not None: temp_tpl["cta_text"] = payload.cta_text
    if payload.cta_url is not None: temp_tpl["cta_url"] = payload.cta_url
    if payload.custom_html is not None: temp_tpl["custom_html"] = payload.custom_html

    from app.services.email_templates import _build_responsive_html

    subject_raw = temp_tpl.get("subject", "")
    heading_raw = temp_tpl.get("heading", "")
    body_raw = temp_tpl.get("body", "")
    cta_text_raw = temp_tpl.get("cta_text", "")
    cta_url_raw = temp_tpl.get("cta_url", "")
    custom_html = temp_tpl.get("custom_html")

    def _sub(text: str) -> str:
        if not text: return ""
        s = text
        for k, v in context.items():
            val = str(v) if v is not None else ""
            s = s.replace(f"{{{{{k}}}}}", val)
            s = s.replace(f"{{{k}}}", val)
        return s

    subject = _sub(subject_raw)
    heading = _sub(heading_raw)
    body = _sub(body_raw)
    cta_text = _sub(cta_text_raw) if cta_text_raw else None
    cta_url = _sub(cta_url_raw) if cta_url_raw else None

    if custom_html and custom_html.strip():
        html = _sub(custom_html)
    else:
        html = _build_responsive_html(
            heading=heading or subject,
            body=body,
            cta_text=cta_text,
            cta_url=cta_url,
            badge=temp_tpl.get("badge", "DisplayDelight Official"),
        )

    body_text = f"{heading}\n\n{body}" + (f"\n\n{cta_text}: {cta_url}" if cta_text and cta_url else "")

    ok = send_email(
        to_email=payload.to.strip(),
        subject=subject,
        body_text=body_text,
        db=db,
        body_html=html,
    )

    if ok:
        return {"status": "ok", "message": f"Test email for '{tpl['title']}' delivered to {payload.to}."}
    else:
        return {"status": "error", "message": f"Failed to send test email to {payload.to}. Check SMTP settings."}
