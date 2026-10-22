"""
DisplayDelight V2 — Public Settings API.
Exposes storefront configuration to public visitors:
- Brand, logo, tagline
- Contact email, phone, business address, operating hours, Google Maps embed
- Announcement bar text & visibility
- WhatsApp number & prefilled chat message
- Verified social links (Instagram, Facebook, YouTube, LinkedIn)
- Public tax & shipping rules (GST rate, free shipping threshold)
- Payment gateway public key ID (Razorpay Key ID) & mode (test vs live)
Strict security policy:
Zero secrets (passwords, tokens, key secrets, webhook secrets) are ever exposed.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import settings
from app.models.models import WebsiteSetting


router = APIRouter(prefix="/settings", tags=["Public Settings"])


def _get_setting_raw(db: Session, key: str, default: Any = None) -> Any:
    s = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if s and s.value is not None:
        return s.value
    return default


@router.get("/public", summary="Get public storefront and brand settings")
def get_public_settings(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    # Parse social links
    links_raw = _get_setting_raw(db, "social_links")
    try:
        social_links = json.loads(links_raw) if links_raw else [
            ["Instagram", "https://instagram.com/displaydelight", True],
            ["Facebook", "https://facebook.com/displaydelight", True],
            ["YouTube", "https://youtube.com/@displaydelight", True],
            ["LinkedIn", "https://linkedin.com/company/displaydelight", True],
        ]
    except Exception:
        social_links = [
            ["Instagram", "https://instagram.com/displaydelight", True],
            ["Facebook", "https://facebook.com/displaydelight", True],
            ["YouTube", "https://youtube.com/@displaydelight", True],
            ["LinkedIn", "https://linkedin.com/company/displaydelight", True],
        ]

    # Parse shipping zones
    zones_raw = _get_setting_raw(db, "shipping_zones")
    try:
        shipping_zones = json.loads(zones_raw) if zones_raw else [
            {"z": "Local (same city)", "rate": "300", "days": "1–2 business days"},
            {"z": "Within state", "rate": "600", "days": "2–3 business days"},
            {"z": "Rest of India", "rate": "1200", "days": "4–6 business days"},
            {"z": "Remote and island regions", "rate": "2500", "days": "7–10 business days"},
        ]
    except Exception:
        shipping_zones = [
            {"z": "Local (same city)", "rate": "300", "days": "1–2 business days"},
            {"z": "Within state", "rate": "600", "days": "2–3 business days"},
            {"z": "Rest of India", "rate": "1200", "days": "4–6 business days"},
            {"z": "Remote and island regions", "rate": "2500", "days": "7–10 business days"},
        ]

    # Free shipping threshold in INR
    free_thr_raw = _get_setting_raw(db, "shipping_free_threshold", "50000")
    try:
        free_shipping_threshold_inr = int(float(free_thr_raw))
    except Exception:
        free_shipping_threshold_inr = 50000

    # Default GST rate
    gst_rate_raw = _get_setting_raw(db, "default_gst_rate", "18")
    try:
        default_gst_rate = int(float(gst_rate_raw))
    except Exception:
        default_gst_rate = 18

    return {
        "site_name": _get_setting_raw(db, "site_name", "DisplayDelight"),
        "site_tagline": _get_setting_raw(db, "site_tagline", "INNOVATION IS KEY TO SUCCESS"),
        "site_logo_url": _get_setting_raw(db, "site_logo_url", "/logo-orange.png"),
        "contact_email": _get_setting_raw(db, "contact_email", _get_setting_raw(db, "support_email", "Displaydelight@gmail.com")),
        "contact_phone": _get_setting_raw(db, "contact_phone", _get_setting_raw(db, "support_phone", "+91 98403 27440")),
        "business_address": _get_setting_raw(db, "business_address", "Chennai / Bangalore Showroom Distribution Hub, No. 42 Commercial Complex, MG Road, Bangalore 560001"),
        "business_hours": _get_setting_raw(db, "business_hours", "Mon – Sat: 9:30 AM – 7:00 PM IST"),
        "announcement_enabled": str(_get_setting_raw(db, "announcement_enabled", "true")).lower() in ("true", "1", "yes"),
        "announcement_text": _get_setting_raw(db, "announcement_text", "All Business Solutions — DisplayDelight · Premium Commercial Displays & Custom Signage"),
        "contact_map_enabled": str(_get_setting_raw(db, "contact_map_enabled", "true")).lower() in ("true", "1", "yes"),
        "contact_map_embed": _get_setting_raw(db, "contact_map_embed", "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9854483726593!2d77.5945627!3d12.9715987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"),
        "whatsapp_number": _get_setting_raw(db, "whatsapp_number", "919840327440"),
        "whatsapp_message": _get_setting_raw(db, "whatsapp_message", "Hi DisplayDelight, I would like to know more about your commercial displays and custom signage."),
        "social_links": social_links,
        "payment_mode": _get_setting_raw(db, "payment_mode", "test"),
        "razorpay_key_id": _get_setting_raw(db, "razorpay_key_id", settings.RAZORPAY_KEY_ID or "rzp_test_Tq2xyBU7kvMX7q"),
        "images_cdn_hostname": _get_setting_raw(db, "storage_images_cdn", "cdn.displaydelight.in"),
        "gst_registered": str(_get_setting_raw(db, "gst_registered", "true")).lower() in ("true", "1", "yes"),
        "company_gstin": _get_setting_raw(db, "company_gstin", "29AAAAA0000A1Z5"),
        "default_gst_rate": default_gst_rate,
        "gst_pricing_mode": _get_setting_raw(db, "gst_pricing_mode", "excl"),
        "shipping_zones": shipping_zones,
        "shipping_free_enabled": str(_get_setting_raw(db, "shipping_free_enabled", "true")).lower() in ("true", "1", "yes"),
        "shipping_free_threshold_inr": free_shipping_threshold_inr,
    }
