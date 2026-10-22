"""
DisplayDelight V2 — Admin Website & Integration Settings API.
Enforces security rule:
Sensitive credentials (Razorpay secret, Cloudflare token, SMTP password)
are masked at the server boundary and NEVER returned raw to the client.
Returns '••••last4' only.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.api.v1.admin.common import log_audit
from app.core.config import settings
from app.models.models import User, WebsiteSetting
from app.schemas.schemas import SettingIn, SettingOut


router = APIRouter(prefix="/settings", tags=["Admin Settings"])


def _mask_value(val: str) -> str:
    if not val:
        return "••••"
    if len(val) <= 4:
        return "••••"
    return f"••••{val[-4:]}"



def _get_setting_raw(db: Session, key: str, default: Any = None) -> Any:
    s = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if s and s.value is not None:
        return s.value
    return default


def _set_setting_raw(db: Session, key: str, value: Any, is_sensitive: bool = False, description: str | None = None) -> None:
    s = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if not s:
        s = WebsiteSetting(key=key, is_sensitive=is_sensitive, description=description)
        db.add(s)
    # If sensitive and placeholder passed, do not overwrite real secret
    str_val = str(value) if value is not None else ""
    if is_sensitive and str_val.startswith("••••"):
        return
    s.value = str_val
    if is_sensitive:
        s.is_sensitive = True
    if description:
        s.description = description


@router.get("", response_model=List[SettingOut], summary="Admin: List system and business settings (masked)")
def list_settings(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    records = db.query(WebsiteSetting).all()
    results = []
    for r in records:
        masked_val = _mask_value(r.value) if (r.is_sensitive and r.value) else r.value
        results.append(
            SettingOut(
                key=r.key,
                value=masked_val,
                description=r.description,
                is_sensitive=r.is_sensitive,
            )
        )
    return results


@router.get("/grouped", summary="Admin: Get settings structured by domain group")
def get_grouped_settings(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import json

    # 1. General
    general = {
        "name": _get_setting_raw(db, "site_name", "DisplayDelight"),
        "tag": _get_setting_raw(db, "site_tagline", "INNOVATION IS KEY TO SUCCESS"),
        "logo_url": _get_setting_raw(db, "site_logo_url", "/logo-orange.png"),
        "email": _get_setting_raw(db, "contact_email", _get_setting_raw(db, "support_email", "Displaydelight@gmail.com")),
        "phone": _get_setting_raw(db, "contact_phone", _get_setting_raw(db, "support_phone", "+91 98403 27440")),
        "addr": _get_setting_raw(db, "business_address", "Chennai / Bangalore Showroom Distribution Hub, No. 42 Commercial Complex, MG Road, Bangalore 560001"),
        "hours": _get_setting_raw(db, "business_hours", "Mon – Sat: 9:30 AM – 7:00 PM IST"),
        "ann": _get_setting_raw(db, "announcement_text", "All Business Solutions — DisplayDelight · Premium Commercial Displays & Custom Signage"),
        "annOn": str(_get_setting_raw(db, "announcement_enabled", "true")).lower() in ("true", "1", "yes"),
        "maps": _get_setting_raw(db, "contact_map_embed", "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9854483726593!2d77.5945627!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"),
        "mapsOn": str(_get_setting_raw(db, "contact_map_enabled", "true")).lower() in ("true", "1", "yes"),
    }

    # 2. Payments
    payments = {
        "mode": _get_setting_raw(db, "payment_mode", "test"),
        "key_id": _get_setting_raw(db, "razorpay_key_id", settings.RAZORPAY_KEY_ID or "rzp_test_Tq2xyBU7kvMX7q"),
        "key_secret": _mask_value(_get_setting_raw(db, "razorpay_key_secret", settings.RAZORPAY_KEY_SECRET or "W4N2aajElPsDN4T64f0oPZx3")),
        "webhook_secret": _mask_value(_get_setting_raw(db, "razorpay_webhook_secret", settings.RAZORPAY_WEBHOOK_SECRET or "Sequvar@2004")),
        "webhook_status": _get_setting_raw(db, "webhook_status", "connected"),
    }

    # 3. Storage
    storage = {
        "r2_bucket": _get_setting_raw(db, "storage_r2_bucket", "dd-artwork-sample"),
        "r2_account_id": _mask_value(_get_setting_raw(db, "storage_cf_account_id", "c41f992a00b")),
        "images_cdn": _get_setting_raw(db, "storage_images_cdn", "cdn.displaydelight.in"),
        "images_account_id": _mask_value(_get_setting_raw(db, "storage_images_account_id", "c41f992a00b")),
        "stream_code": _get_setting_raw(db, "storage_stream_code", "cfstream_dd_enterprise"),
        "r2_access_key": _mask_value(_get_setting_raw(db, "storage_r2_access_key", "r2_key_sample")),
        "r2_secret_key": _mask_value(_get_setting_raw(db, "storage_r2_secret_key", "r2_sec_sample")),
        "images_token": _mask_value(_get_setting_raw(db, "storage_images_token", "img_token_sample")),
        "stream_token": _mask_value(_get_setting_raw(db, "storage_stream_token", "stream_token_sample")),
    }

    # 4. GST & Taxes
    hsn_raw = _get_setting_raw(db, "gst_hsn_codes")
    try:
        hsn_list = json.loads(hsn_raw) if hsn_raw else [
            ["LED signage and light boxes", "9405"],
            ["Digital signage displays", "8528"],
            ["Acrylic stands and frames", "3926"],
            ["Roll-up and fabric displays", "4911"],
        ]
    except Exception:
        hsn_list = [
            ["LED signage and light boxes", "9405"],
            ["Digital signage displays", "8528"],
            ["Acrylic stands and frames", "3926"],
            ["Roll-up and fabric displays", "4911"],
        ]

    gst = {
        "reg": str(_get_setting_raw(db, "gst_registered", "true")).lower() in ("true", "1", "yes"),
        "gstin": _get_setting_raw(db, "company_gstin", "29AAAAA0000A1Z5"),
        "rate": str(_get_setting_raw(db, "default_gst_rate", "18")),
        "incl": _get_setting_raw(db, "gst_pricing_mode", "excl"),
        "hsn": hsn_list,
    }

    # 5. Shipping
    zones_raw = _get_setting_raw(db, "shipping_zones")
    try:
        zones_list = json.loads(zones_raw) if zones_raw else [
            {"z": "Local (same city)", "rate": "300", "days": "1–2 business days"},
            {"z": "Within state", "rate": "600", "days": "2–3 business days"},
            {"z": "Rest of India", "rate": "1200", "days": "4–6 business days"},
            {"z": "Remote and island regions", "rate": "2500", "days": "7–10 business days"},
        ]
    except Exception:
        zones_list = [
            {"z": "Local (same city)", "rate": "300", "days": "1–2 business days"},
            {"z": "Within state", "rate": "600", "days": "2–3 business days"},
            {"z": "Rest of India", "rate": "1200", "days": "4–6 business days"},
            {"z": "Remote and island regions", "rate": "2500", "days": "7–10 business days"},
        ]

    shipping = {
        "zones": zones_list,
        "free": str(_get_setting_raw(db, "shipping_free_enabled", "true")).lower() in ("true", "1", "yes"),
        "thr": str(_get_setting_raw(db, "shipping_free_threshold", "50000")),
    }

    # 6. Social Links & WhatsApp
    links_raw = _get_setting_raw(db, "social_links")
    try:
        links_list = json.loads(links_raw) if links_raw else [
            ["Instagram", "https://instagram.com/displaydelight", True],
            ["Facebook", "https://facebook.com/displaydelight", True],
            ["YouTube", "https://youtube.com/@displaydelight", True],
            ["LinkedIn", "https://linkedin.com/company/displaydelight", True],
        ]
    except Exception:
        links_list = [
            ["Instagram", "https://instagram.com/displaydelight", True],
            ["Facebook", "https://facebook.com/displaydelight", True],
            ["YouTube", "https://youtube.com/@displaydelight", True],
            ["LinkedIn", "https://linkedin.com/company/displaydelight", True],
        ]

    social = {
        "wa": _get_setting_raw(db, "whatsapp_number", "919840327440"),
        "msg": _get_setting_raw(db, "whatsapp_message", "Hi DisplayDelight, I would like to know more about your commercial displays and custom signage."),
        "links": links_list,
    }

    # 7. Email Settings
    email = {
        "host": _get_setting_raw(db, "smtp_host", "smtp.example.com"),
        "port": _get_setting_raw(db, "smtp_port", "587"),
        "user": _get_setting_raw(db, "smtp_user", "notifications@displaydelight.com"),
        "from": _get_setting_raw(db, "email_from_name", "DisplayDelight"),
        "password": _mask_value(_get_setting_raw(db, "smtp_password", "")),
        "to": _get_setting_raw(db, "admin_notification_email", "Displaydelight@gmail.com"),
        "orders_enabled": str(_get_setting_raw(db, "email_notify_orders", "true")).lower() in ("true", "1", "yes"),
        "quotes_enabled": str(_get_setting_raw(db, "email_notify_quotes", "true")).lower() in ("true", "1", "yes"),
    }

    # 8. Roles & Permissions
    roles_raw = _get_setting_raw(db, "role_permissions")
    try:
        roles = json.loads(roles_raw) if roles_raw else {}
    except Exception:
        roles = {}

    return {
        "general": general,
        "payments": payments,
        "storage": storage,
        "gst": gst,
        "shipping": shipping,
        "social": social,
        "email": email,
        "roles": roles,
    }


@router.put("/grouped/{group_key}", summary="Admin: Update settings for a specific domain group")
def update_grouped_settings(
    group_key: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    import json

    if group_key == "general":
        if "name" in payload or "site_name" in payload:
            _set_setting_raw(db, "site_name", payload.get("name") or payload.get("site_name"))
        if "tag" in payload or "site_tagline" in payload or "tagline" in payload:
            _set_setting_raw(db, "site_tagline", payload.get("tag") or payload.get("site_tagline") or payload.get("tagline"))
        if "logo_url" in payload or "site_logo_url" in payload:
            _set_setting_raw(db, "site_logo_url", payload.get("logo_url") or payload.get("site_logo_url"))
        if "email" in payload or "contact_email" in payload:
            val = payload.get("email") or payload.get("contact_email")
            _set_setting_raw(db, "contact_email", val)
            _set_setting_raw(db, "support_email", val)
        if "phone" in payload or "contact_phone" in payload:
            val = payload.get("phone") or payload.get("contact_phone")
            _set_setting_raw(db, "contact_phone", val)
            _set_setting_raw(db, "support_phone", val)
        if "addr" in payload or "business_address" in payload:
            _set_setting_raw(db, "business_address", payload.get("addr") or payload.get("business_address"))
        if "hours" in payload or "business_hours" in payload:
            _set_setting_raw(db, "business_hours", payload.get("hours") or payload.get("business_hours"))
        if "ann" in payload or "announcement_text" in payload:
            _set_setting_raw(db, "announcement_text", payload.get("ann") or payload.get("announcement_text"))
        if "annOn" in payload or "announcement_enabled" in payload:
            v = payload.get("annOn") if "annOn" in payload else payload.get("announcement_enabled")
            _set_setting_raw(db, "announcement_enabled", "true" if v else "false")
        if "maps" in payload or "contact_map_embed" in payload:
            _set_setting_raw(db, "contact_map_embed", payload.get("maps") or payload.get("contact_map_embed"))
        if "mapsOn" in payload or "contact_map_enabled" in payload:
            v = payload.get("mapsOn") if "mapsOn" in payload else payload.get("contact_map_enabled")
            _set_setting_raw(db, "contact_map_enabled", "true" if v else "false")

    elif group_key == "payments":
        if "mode" in payload: _set_setting_raw(db, "payment_mode", payload["mode"])
        if "key_id" in payload: _set_setting_raw(db, "razorpay_key_id", payload["key_id"])
        if "key_secret" in payload:
            _set_setting_raw(db, "razorpay_key_secret", payload["key_secret"], is_sensitive=True)
        if "webhook_secret" in payload:
            _set_setting_raw(db, "razorpay_webhook_secret", payload["webhook_secret"], is_sensitive=True)
        if "webhook_status" in payload: _set_setting_raw(db, "webhook_status", payload["webhook_status"])

    elif group_key == "storage":
        if "r2_bucket" in payload: _set_setting_raw(db, "storage_r2_bucket", payload["r2_bucket"])
        if "r2_account_id" in payload: _set_setting_raw(db, "storage_cf_account_id", payload["r2_account_id"], is_sensitive=True)
        if "images_cdn" in payload: _set_setting_raw(db, "storage_images_cdn", payload["images_cdn"])
        if "images_account_id" in payload: _set_setting_raw(db, "storage_images_account_id", payload["images_account_id"], is_sensitive=True)
        if "stream_code" in payload: _set_setting_raw(db, "storage_stream_code", payload["stream_code"])
        if "r2_access_key" in payload: _set_setting_raw(db, "storage_r2_access_key", payload["r2_access_key"], is_sensitive=True)
        if "r2_secret_key" in payload: _set_setting_raw(db, "storage_r2_secret_key", payload["r2_secret_key"], is_sensitive=True)
        if "images_token" in payload: _set_setting_raw(db, "storage_images_token", payload["images_token"], is_sensitive=True)
        if "stream_token" in payload: _set_setting_raw(db, "storage_stream_token", payload["stream_token"], is_sensitive=True)

    elif group_key == "gst":
        if "reg" in payload: _set_setting_raw(db, "gst_registered", "true" if payload["reg"] else "false")
        if "gstin" in payload: _set_setting_raw(db, "company_gstin", payload["gstin"])
        if "rate" in payload: _set_setting_raw(db, "default_gst_rate", str(payload["rate"]))
        if "incl" in payload: _set_setting_raw(db, "gst_pricing_mode", payload["incl"])
        if "hsn" in payload: _set_setting_raw(db, "gst_hsn_codes", json.dumps(payload["hsn"]))

    elif group_key == "shipping":
        if "zones" in payload: _set_setting_raw(db, "shipping_zones", json.dumps(payload["zones"]))
        if "free" in payload: _set_setting_raw(db, "shipping_free_enabled", "true" if payload["free"] else "false")
        if "thr" in payload:
            _set_setting_raw(db, "shipping_free_threshold", str(payload["thr"]))
            # also sync free_shipping_threshold_paise
            try:
                paise_val = int(float(payload["thr"]) * 100)
                _set_setting_raw(db, "free_shipping_threshold_paise", str(paise_val))
            except Exception:
                pass

    elif group_key == "social":
        if "wa" in payload: _set_setting_raw(db, "whatsapp_number", payload["wa"])
        if "msg" in payload: _set_setting_raw(db, "whatsapp_message", payload["msg"])
        if "links" in payload: _set_setting_raw(db, "social_links", json.dumps(payload["links"]))

    elif group_key == "email":
        if "host" in payload and payload["host"] is not None:
            _set_setting_raw(db, "smtp_host", str(payload["host"]).strip())
        if "port" in payload and payload["port"] is not None:
            _set_setting_raw(db, "smtp_port", str(payload["port"]).strip())
        if "user" in payload and payload["user"] is not None:
            user_val = str(payload["user"]).strip()
            _set_setting_raw(db, "smtp_user", user_val)
            _set_setting_raw(db, "email_from_address", str(payload.get("from_address") or user_val).strip())
        if "from" in payload and payload["from"] is not None:
            _set_setting_raw(db, "email_from_name", str(payload["from"]).strip())
        if "from_address" in payload and payload["from_address"]:
            _set_setting_raw(db, "email_from_address", str(payload["from_address"]).strip())
        if "password" in payload and payload["password"] and "••••" not in str(payload["password"]):
            _set_setting_raw(db, "smtp_password", str(payload["password"]).strip(), is_sensitive=True)
        if "to" in payload and payload["to"] is not None:
            _set_setting_raw(db, "admin_notification_email", str(payload["to"]).strip())
        if "orders_enabled" in payload:
            _set_setting_raw(db, "email_notify_orders", "true" if payload["orders_enabled"] else "false")
        if "quotes_enabled" in payload:
            _set_setting_raw(db, "email_notify_quotes", "true" if payload["quotes_enabled"] else "false")

    elif group_key == "roles":
        _set_setting_raw(db, "role_permissions", json.dumps(payload))

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action=f"setting.update.{group_key}",
        resource_type="setting_group",
        resource_id=group_key,
        detail={"group": group_key, "keys_updated": list(payload.keys())},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "group": group_key}


@router.post("/test-payment", summary="Admin: Verify Razorpay payment configuration")
def test_payment_config(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.razorpay_service import get_razorpay_credentials
    key_id, key_sec, _ = get_razorpay_credentials(db)
    mode = _get_setting_raw(db, "payment_mode", "test")

    # Validation
    if not key_id or len(key_id) < 8:
        return {"status": "error", "message": "Razorpay Key ID is empty or invalid format."}

    if not key_sec:
        return {"status": "error", "message": "Razorpay Key Secret is not configured."}

    try:
        import razorpay
        client = razorpay.Client(auth=(key_id, key_sec))
        client.order.all({"count": 1})
        return {
            "status": "ok",
            "mode": mode,
            "key_id": key_id,
            "has_secret": True,
            "message": f"Connected to Razorpay ({mode.upper()} mode) successfully! Verified with Razorpay API.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "mode": mode,
            "key_id": key_id,
            "message": f"Razorpay connection failed: {str(exc)}",
        }


@router.post("/test-payment", summary="Admin: Test live Razorpay API key and secret")
def test_payment_config(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.razorpay_service import get_razorpay_credentials
    import requests
    from requests.auth import HTTPBasicAuth

    key_id, key_secret, _ = get_razorpay_credentials(db)
    if not key_id or not key_secret:
        return {"status": "error", "message": "Razorpay credentials are not configured."}

    try:
        r = requests.get(
            "https://api.razorpay.com/v1/orders?count=1",
            auth=HTTPBasicAuth(key_id, key_secret),
            timeout=8,
        )
        if r.status_code == 200:
            return {"status": "ok", "message": f"Successfully connected to Razorpay API with Key ID {key_id[:8]}••••", "key_id": key_id}
        else:
            return {"status": "error", "message": f"Razorpay API rejected credentials ({r.status_code}): {r.text}"}
    except Exception as e:
        return {"status": "error", "message": f"Could not reach Razorpay API: {str(e)}"}


@router.post("/test-email", summary="Admin: Send test email with configured SMTP settings")
def test_email_config(
    payload: Dict[str, Any],
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.notifications import send_email

    # Allow testing unsaved or direct credentials and auto-persist if valid
    if "user" in payload and payload.get("user"):
        u = str(payload["user"]).strip()
        _set_setting_raw(db, "smtp_user", u)
        _set_setting_raw(db, "email_from_address", str(payload.get("from_address") or u).strip())
    if "host" in payload and payload.get("host"):
        _set_setting_raw(db, "smtp_host", str(payload["host"]).strip())
    if "port" in payload and payload.get("port"):
        _set_setting_raw(db, "smtp_port", str(payload["port"]).strip())
    if "from" in payload and payload.get("from"):
        _set_setting_raw(db, "email_from_name", str(payload["from"]).strip())
    if "password" in payload and payload.get("password") and "••••" not in str(payload["password"]):
        _set_setting_raw(db, "smtp_password", str(payload["password"]).strip(), is_sensitive=True)
    if "to" in payload and payload.get("to"):
        _set_setting_raw(db, "admin_notification_email", str(payload["to"]).strip())
    db.commit()

    to_addr = payload.get("to") or _get_setting_raw(db, "admin_notification_email", "Displaydelight@gmail.com")
    if not to_addr or "@" not in to_addr:
        return {"status": "error", "message": "Invalid recipient email address."}

    host = _get_setting_raw(db, "smtp_host", "smtp.gmail.com")
    port = _get_setting_raw(db, "smtp_port", "587")
    user = _get_setting_raw(db, "smtp_user", "seguar.m@gmail.com")
    from_name = _get_setting_raw(db, "email_from_name", "DisplayDelight")

    subject = "DisplayDelight — SMTP Connection Test"
    body = (
        f"Hello,\n\nThis is a verified test email sent from your DisplayDelight store admin panel.\n"
        f"SMTP Host: {host}:{port}\n"
        f"Sender: {from_name} <{user}>\n"
        f"Recipient: {to_addr}\n\n"
        f"If you received this message, your outbound email configuration is working properly."
    )
    body_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    <tr>
      <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #0284c7;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Display<span style="color: #38bdf8;">Delight</span></h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">SMTP Diagnostic Service</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #0f172a; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Outbound Email Test Successful! &check;</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          This message confirms that your SMTP credentials have been validated. Your store is now primed to send responsive transactional notifications for orders, dispatches, and custom quotes.
        </p>
        <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
          <tr>
            <td style="color: #64748b; font-weight: 600;">Server Host</td>
            <td align="right" style="font-family: monospace; color: #0284c7; font-weight: 700;">{host}:{port}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-top: 1px solid #e2e8f0;">Authenticated User</td>
            <td align="right" style="font-family: monospace; color: #0f172a; border-top: 1px solid #e2e8f0;">{user}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-top: 1px solid #e2e8f0;">Sender Display</td>
            <td align="right" style="color: #0f172a; border-top: 1px solid #e2e8f0;">{from_name} &lt;{user}&gt;</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; border-top: 1px solid #e2e8f0;">Delivered To</td>
            <td align="right" style="font-weight: 700; color: #059669; border-top: 1px solid #e2e8f0;">{to_addr}</td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
          DisplayDelight Commercial Signage &amp; Digital Displays &bull; Innovation is Key to Success
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    ok = send_email(to_addr, subject, body, db=db, body_html=body_html)
    if ok:
        return {"status": "ok", "message": f"Test email dispatched successfully to {to_addr} via {host}:{port}."}
    else:
        return {"status": "error", "message": f"Failed to send test email to {to_addr}. Please check SMTP credentials (host, port, user, app password)."}


@router.get("/storage-status", summary="Admin: Get storage provider health and active adapter status")
def get_admin_storage_status(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.storage import storage_manager
    return storage_manager.get_status(db)


@router.post("/test-storage", summary="Admin: Test storage provider connectivity and health")
def test_storage_provider(
    payload: Dict[str, Any],
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.storage import storage_manager
    provider = payload.get("provider", "local")
    return storage_manager.test_provider(provider, db=db)


@router.put("/{key}", summary="Admin: Update setting key")
def update_setting(
    key: str,
    payload: SettingIn,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if not setting:
        setting = WebsiteSetting(key=key, is_sensitive=payload.is_sensitive)
        db.add(setting)

    # If new value is not just a masked placeholder, update it
    if payload.value and not payload.value.startswith("••••"):
        setting.value = payload.value

    if payload.description:
        setting.description = payload.description

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="setting.update",
        resource_type="setting",
        resource_id=setting.id,
        detail={"key": key, "is_sensitive": setting.is_sensitive},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "key": key}

