"""
DisplayDelight V3 — Email Template Engine.
Provides responsive, branded transactional HTML email templates
customizable and editable by administrators via the Admin Control Panel.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.models import WebsiteSetting


DEFAULT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "order_confirmation": {
        "id": "order_confirmation",
        "category": "customer",
        "title": "Order Confirmation",
        "badge": "Customer Transaction",
        "subject": "Order Confirmed: #{order_number} | DisplayDelight Commercial Displays",
        "description": "Sent automatically to the customer as soon as an order is placed and confirmed in the database.",
        "heading": "Thank you for your order, {customer_name}!",
        "body": "We have received your order #{order_number} placed on {order_date}. Our hardware engineering and fabrication team is now preparing your signage displays. You can track your order status in real time using your reference code.",
        "cta_text": "Track Order Live",
        "cta_url": "https://mohanwebstudio.online/store/#/track?ref={order_number}",
        "variables": ["customer_name", "order_number", "order_date", "total_rupees", "items_summary", "shipping_address", "tracking_link"],
        "sample_context": {
            "customer_name": "Valued Customer",
            "order_number": "DD-20261020-S68I9",
            "order_date": datetime.now().strftime("%d %b %Y"),
            "total_rupees": "2,89,100",
            "items_summary": "Fine-Pitch Indoor LED Video Wall P1.8 × 1",
            "shipping_address": "No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001",
            "tracking_link": "https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9",
        },
    },
    "payment_confirmed": {
        "id": "payment_confirmed",
        "category": "customer",
        "title": "Payment Verified & Receipt",
        "badge": "Financial Receipt",
        "subject": "Payment Verified — Order #{order_number} | DisplayDelight",
        "description": "Sent to customer when Razorpay payment is captured and verified by digital signature.",
        "heading": "Payment Verified: ₹{total_rupees}",
        "body": "Your payment for order #{order_number} has been verified and confirmed by Razorpay. An official GST Tax Invoice has been generated for your business records.",
        "cta_text": "Download Tax Invoice",
        "cta_url": "https://mohanwebstudio.online/store/#/account/orders",
        "variables": ["customer_name", "order_number", "total_rupees", "payment_id", "gstin", "payment_date"],
        "sample_context": {
            "customer_name": "Valued Customer",
            "order_number": "DD-20261020-S68I9",
            "total_rupees": "2,89,100",
            "payment_id": "pay_Tq58Trxo1YSOGM",
            "gstin": "29AAAAA0000A1Z5",
            "payment_date": datetime.now().strftime("%d %b %Y, %I:%M %p IST"),
        },
    },
    "order_shipped": {
        "id": "order_shipped",
        "category": "customer",
        "title": "Shipment & Dispatch",
        "badge": "Logistics Dispatch",
        "subject": "Dispatched: Your Order #{order_number} is on the way | DisplayDelight",
        "description": "Sent to customer when order status changes to Dispatched or In Transit.",
        "heading": "Your Display Hardware is on the way!",
        "body": "Great news! Order #{order_number} has completed quality testing and has been dispatched via our secure logistics network.\n\nCourier Partner: {courier_partner}\nTracking Number: {tracking_number}\nExpected Delivery: {expected_delivery}\nDelivery Destination: {shipping_address}",
        "cta_text": "Track Courier Delivery",
        "cta_url": "https://mohanwebstudio.online/store/#/track?ref={order_number}",
        "variables": ["customer_name", "order_number", "courier_partner", "tracking_number", "expected_delivery", "shipping_address"],
        "sample_context": {
            "customer_name": "Valued Customer",
            "order_number": "DD-20261020-S68I9",
            "courier_partner": "Blue Dart Express Logistics",
            "tracking_number": "BLD-884920491",
            "expected_delivery": "22 Oct 2026",
            "shipping_address": "No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001",
        },
    },
    "quote_received": {
        "id": "quote_received",
        "category": "customer",
        "title": "Quotation Request Acknowledgment",
        "badge": "B2B Quotation",
        "subject": "Quote Request Received: #{quote_number} | DisplayDelight Commercial Solutions",
        "description": "Sent to customer when they submit a custom display or sign quote request.",
        "heading": "We've received your quotation request!",
        "body": "Thank you for reaching out regarding custom commercial displays and business signage. Our technical sales engineering team has received your specifications (#{quote_number}) and is preparing a formal proposal.",
        "cta_text": "View Quote Details",
        "cta_url": "https://mohanwebstudio.online/store/#/quote",
        "variables": ["customer_name", "quote_number", "product_name", "specifications", "contact_phone"],
        "sample_context": {
            "customer_name": "Sangamithra M",
            "quote_number": "QT-310",
            "product_name": "Custom Architectural Curved LED Installation",
            "specifications": "Curved radius 4.5m, P2.5 High Refresh rate, Outdoor weather-rated IP65",
            "contact_phone": "+91 98403 27440",
        },
    },
    "quote_replied": {
        "id": "quote_replied",
        "category": "customer",
        "title": "Quotation Proposal Ready",
        "badge": "B2B Quotation",
        "subject": "Your DisplayDelight Quotation Proposal is Ready (#{quote_number})",
        "description": "Sent to customer when admin publishes a formal quote proposal with pricing.",
        "heading": "Your Quotation Proposal is Ready",
        "body": "We have prepared a customized proposal for #{quote_number}. Estimated investment: ₹{estimated_total}. Review the technical specifications, delivery timeline, and warranty breakdown online.",
        "cta_text": "Review & Approve Quote",
        "cta_url": "https://mohanwebstudio.online/store/#/quote",
        "variables": ["customer_name", "quote_number", "estimated_total", "product_name", "validity_days"],
        "sample_context": {
            "customer_name": "Sangamithra M",
            "quote_number": "QT-310",
            "estimated_total": "4,50,000",
            "product_name": "Custom Architectural Curved LED Installation",
            "validity_days": "15 days",
        },
    },
    "order_delivered": {
        "id": "order_delivered",
        "category": "customer",
        "title": "Order Delivered",
        "badge": "Delivery Complete",
        "subject": "Delivered: Your Order #{order_number} has arrived | DisplayDelight",
        "description": "Sent to customer when order status is marked as Delivered.",
        "heading": "Your Order #{order_number} has been delivered!",
        "body": "We are pleased to inform you that order #{order_number} has been successfully delivered on {delivery_date} to:\n{shipping_address}\n\nThank you for choosing DisplayDelight for your commercial display solutions. If you need any assistance with installation, mounting, or warranty registration, our technical team is ready to assist.",
        "cta_text": "View Order & Invoices",
        "cta_url": "https://mohanwebstudio.online/store/#/account/orders",
        "variables": ["customer_name", "order_number", "delivery_date", "shipping_address", "tracking_link"],
        "sample_context": {
            "customer_name": "Valued Customer",
            "order_number": "DD-20261020-S68I9",
            "delivery_date": datetime.now().strftime("%d %b %Y"),
            "shipping_address": "No. 42 Commercial Complex, MG Road, Bangalore, Karnataka - 560001",
            "tracking_link": "https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9",
        },
    },
    "order_status_change": {
        "id": "order_status_change",
        "category": "customer",
        "title": "Order Status Update",
        "badge": "Order Tracking",
        "subject": "Order #{order_number} Status Update: {status_label} | DisplayDelight",
        "description": "Sent to customer for operational status updates (e.g. Processing, In Production, Cancelled).",
        "heading": "Order #{order_number} Status: {status_label}",
        "body": "Hello {customer_name},\n\nYour order #{order_number} status has been updated to: {status_label}.\n\nUpdate Note: {note}\n\nYou can track the progress of your order in real time on our customer tracking portal.",
        "cta_text": "Track Order Live",
        "cta_url": "https://mohanwebstudio.online/store/#/track?ref={order_number}",
        "variables": ["customer_name", "order_number", "status_label", "note", "tracking_link"],
        "sample_context": {
            "customer_name": "Valued Customer",
            "order_number": "DD-20261020-S68I9",
            "status_label": "In Production",
            "note": "Hardware assembly and LED module calibration in progress.",
            "tracking_link": "https://mohanwebstudio.online/store/#/track?ref=DD-20261020-S68I9",
        },
    },
    "contact_form": {
        "id": "contact_form",
        "category": "admin",
        "title": "New Contact Enquiry",
        "badge": "Store Admin Alert",
        "subject": "New Contact Enquiry from {name}: {subject} | DisplayDelight",
        "description": "Sent to admin team when a visitor submits the contact form.",
        "heading": "New Contact Enquiry: {subject}",
        "body": "A visitor submitted an enquiry on DisplayDelight:\n\nName: {name}\nEmail: {email}\nPhone: {phone}\nSubject: {subject}\n\nMessage:\n{message}",
        "cta_text": "Open Admin Dashboard",
        "cta_url": "https://mohanwebstudio.online/store/#/admin/dashboard",
        "variables": ["name", "email", "phone", "subject", "message"],
        "sample_context": {
            "name": "Arjun Kumar",
            "email": "arjun@example.com",
            "phone": "+91 98765 43210",
            "subject": "Outdoor LED P4 Display Inquiry",
            "message": "Looking for outdoor waterproof LED screen 12x8 ft for our commercial building in Hyderabad.",
        },
    },
    "admin_order_alert": {
        "id": "admin_order_alert",
        "category": "admin",
        "title": "Admin: New Paid Order Alert",
        "badge": "Store Admin Alert",
        "subject": "[NEW ORDER] #{order_number} — ₹{total_rupees} from {customer_name}",
        "description": "Instant alert sent to the store management team when a customer completes checkout.",
        "heading": "New Order Placed: #{order_number}",
        "body": "A new order has been paid and confirmed on DisplayDelight. Customer: {customer_name} ({customer_email}, {customer_phone}). Total: ₹{total_rupees}.",
        "cta_text": "Open in Admin Dashboard",
        "cta_url": "https://mohanwebstudio.online/store/#/admin/orders",
        "variables": ["order_number", "customer_name", "customer_email", "customer_phone", "total_rupees", "items_summary"],
        "sample_context": {
            "order_number": "DD-20261020-S68I9",
            "customer_name": "Valued Customer",
            "customer_email": "seguvar.m@gmail.com",
            "customer_phone": "9840327440",
            "total_rupees": "2,89,100",
            "items_summary": "Fine-Pitch Indoor LED Video Wall P1.8 × 1",
        },
    },
    "admin_quote_alert": {
        "id": "admin_quote_alert",
        "category": "admin",
        "title": "Admin: New Quotation Enquiry",
        "badge": "Store Admin Alert",
        "subject": "[NEW QUOTE] Request #{quote_number} from {customer_name}",
        "description": "Alert sent to sales engineers when a prospective client submits a quote inquiry.",
        "heading": "New Custom Display Request: #{quote_number}",
        "body": "A customer requested a custom quote for {product_name}. Contact: {customer_name} | {customer_phone} | {customer_email}. Review specifications in the admin quotes console.",
        "cta_text": "Review Quote in Admin",
        "cta_url": "https://mohanwebstudio.online/store/#/admin/quotes",
        "variables": ["quote_number", "customer_name", "customer_email", "customer_phone", "product_name", "specifications"],
        "sample_context": {
            "quote_number": "QT-310",
            "customer_name": "Sangamithra M",
            "customer_email": "seguvar.m@gmail.com",
            "customer_phone": "+91 98403 27440",
            "product_name": "Custom Architectural Curved LED Installation",
            "specifications": "Curved radius 4.5m, P2.5 High Refresh rate",
        },
    },
}

TEMPLATE_ALIASES: Dict[str, str] = {
    "order_placed": "order_confirmation",
    "shipped": "order_shipped",
    "delivered": "order_delivered",
    "dispatched": "order_shipped",
    "dispatch": "order_shipped",
    "cancelled": "order_status_change",
    "processing": "order_status_change",
}


def _build_responsive_html(
    heading: str,
    body: str,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    badge: str = "DisplayDelight Official",
    site_name: str = "DisplayDelight",
    support_phone: str = "+91 98403 27440",
    support_email: str = "Displaydelight@gmail.com",
    address: str = "Chennai / Bangalore Showroom Distribution Hub, No. 42 Commercial Complex, MG Road, Bangalore 560001",
) -> str:
    """
    Renders a responsive, bulletproof HTML email template designed for:
    - Mobiles (320px - 480px)
    - 14-inch & 15-inch Laptops (1024px - 1536px)
    - Desktops & Webmail clients (Gmail, Apple Mail, Outlook).
    """
    paragraphs = "".join(f"<p style=\"margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #374151;\">{p.strip()}</p>" for p in body.split("\n\n") if p.strip())

    cta_block = ""
    if cta_text and cta_url:
        cta_block = f"""
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="left">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0284c7;">
                    <a href="{cta_url}" target="_blank" style="font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; letter-spacing: 0.3px;">
                      {cta_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{heading}</title>
  <style type="text/css">
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    @media only screen and (max-width: 620px) {{
      .wrapper {{ width: 100% !important; max-width: 100% !important; }}
      .mob-p {{ padding-left: 20px !important; padding-right: 20px !important; }}
      .header-title {{ font-size: 20px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table class="wrapper" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 26px 32px; border-bottom: 3px solid #0284c7;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      Display<span style="color: #38bdf8;">Delight</span>
                    </h1>
                    <p style="color: #94a3b8; margin: 3px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Commercial Signage &amp; Digital Displays
                    </p>
                  </td>
                  <td align="right">
                    <span style="background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
                      {badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mob-p" style="padding: 36px 32px 28px 32px;">
              <h2 class="header-title" style="margin: 0 0 18px 0; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">
                {heading}
              </h2>
              {paragraphs}
              {cta_block}
            </td>
          </tr>

          <!-- Security & Verification Assurance -->
          <tr>
            <td class="mob-p" style="padding: 0 32px 24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="font-size: 12px; color: #64748b; line-height: 1.5;">
                    <strong style="color: #0f172a;">Official Verified Communication:</strong> This automated notification was dispatched from DisplayDelight Enterprise systems. Need assistance? Call <a href="tel:{support_phone}" style="color: #0284c7; text-decoration: none; font-weight: 600;">{support_phone}</a> or reply directly to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569; font-weight: 600;">
                {site_name} &bull; Innovation is Key to Success
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                {address}<br>
                &copy; {datetime.now().year} {site_name}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def get_template(template_id: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    """Retrieves template by ID, overlaying admin database customizations over system defaults."""
    resolved_id = TEMPLATE_ALIASES.get(template_id, template_id)
    default = DEFAULT_TEMPLATES.get(resolved_id)
    if not default:
        return None

    res = dict(default)

    if db:
        try:
            key = f"email_template_{resolved_id}"
            s = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
            if s and s.value:
                custom = json.loads(s.value)
                if isinstance(custom, dict):
                    if custom.get("subject"): res["subject"] = custom["subject"]
                    if custom.get("heading"): res["heading"] = custom["heading"]
                    if custom.get("body"): res["body"] = custom["body"]
                    if custom.get("cta_text") is not None: res["cta_text"] = custom["cta_text"]
                    if custom.get("cta_url") is not None: res["cta_url"] = custom["cta_url"]
                    if custom.get("custom_html"): res["custom_html"] = custom["custom_html"]
                    res["is_customized"] = True
                    res["updated_at"] = custom.get("updated_at")
        except Exception:
            pass

    return res


def get_all_templates(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """Returns all available email templates with customizations applied."""
    templates = []
    for tid in DEFAULT_TEMPLATES.keys():
        t = get_template(tid, db=db)
        if t:
            templates.append(t)
    return templates


def save_template(template_id: str, updates: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Persists admin customization for an email template into WebsiteSetting."""
    resolved_id = TEMPLATE_ALIASES.get(template_id, template_id)
    if resolved_id not in DEFAULT_TEMPLATES:
        raise ValueError(f"Unknown email template '{template_id}'.")

    key = f"email_template_{resolved_id}"
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if not setting:
        setting = WebsiteSetting(key=key, description=f"Admin customized email template: {resolved_id}")
        db.add(setting)

    save_payload = {
        "subject": updates.get("subject"),
        "heading": updates.get("heading"),
        "body": updates.get("body"),
        "cta_text": updates.get("cta_text"),
        "cta_url": updates.get("cta_url"),
        "custom_html": updates.get("custom_html"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    setting.value = json.dumps(save_payload)
    db.commit()

    return get_template(resolved_id, db=db) or {}


def reset_template(template_id: str, db: Session) -> Dict[str, Any]:
    """Removes admin customization and resets to system defaults."""
    resolved_id = TEMPLATE_ALIASES.get(template_id, template_id)
    key = f"email_template_{resolved_id}"
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == key).first()
    if setting:
        db.delete(setting)
        db.commit()
    return get_template(resolved_id, db=db) or {}


def render_template(
    template_id: str,
    context: Dict[str, Any],
    db: Optional[Session] = None,
) -> Dict[str, str]:
    """
    Renders subject, plain-text body, and responsive HTML email.
    Substitutes both {var} and {{var}} placeholders safely.
    """
    resolved_id = TEMPLATE_ALIASES.get(template_id, template_id)
    tpl = get_template(resolved_id, db=db)
    if not tpl:
        if "courier_partner" in context or "tracking_number" in context:
            tpl = get_template("order_shipped", db=db) or DEFAULT_TEMPLATES.get("order_shipped", {})
        elif "delivery_date" in context:
            tpl = get_template("order_delivered", db=db) or DEFAULT_TEMPLATES.get("order_delivered", {})
        elif "status_label" in context or "note" in context:
            tpl = get_template("order_status_change", db=db) or DEFAULT_TEMPLATES.get("order_status_change", {})
        else:
            tpl = DEFAULT_TEMPLATES.get("order_confirmation", {})

    subject_raw = tpl.get("subject", "")
    heading_raw = tpl.get("heading", "")
    body_raw = tpl.get("body", "")
    cta_text_raw = tpl.get("cta_text", "")
    cta_url_raw = tpl.get("cta_url", "")
    custom_html = tpl.get("custom_html")

    # Smart default values for common email template variables to avoid raw placeholders
    sub_context: Dict[str, Any] = {
        "order_date": datetime.now().strftime("%d %b %Y"),
        "expected_delivery": "3-5 Business Days",
        "courier_partner": "Commercial Express Logistics",
        "tracking_number": "Track via portal",
        "delivery_date": datetime.now().strftime("%d %b %Y"),
        "shipping_address": "Customer Registered Delivery Address",
        "tracking_link": f"https://mohanwebstudio.online/store/#/track?ref={context.get('order_number', '')}",
        "status_label": "Order Updated",
        "note": "Order is progressing normally.",
    }
    for k, v in context.items():
        if v is not None:
            sub_context[k] = v

    def _sub(text: str) -> str:
        if not text:
            return ""
        s = text
        for k, v in sub_context.items():
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
        site_name = "DisplayDelight"
        phone = "+91 98403 27440"
        email = "Displaydelight@gmail.com"
        addr = "Chennai / Bangalore Showroom Distribution Hub, No. 42 Commercial Complex, MG Road, Bangalore 560001"
        if db:
            try:
                from app.models.models import WebsiteSetting
                recs = {s.key: s.value for s in db.query(WebsiteSetting).all()}
                if recs.get("site_name"): site_name = recs["site_name"]
                if recs.get("contact_phone"): phone = recs["contact_phone"]
                if recs.get("contact_email"): email = recs["contact_email"]
                if recs.get("business_address"): addr = recs["business_address"]
            except Exception:
                pass

        html = _build_responsive_html(
            heading=heading or subject,
            body=body,
            cta_text=cta_text,
            cta_url=cta_url,
            badge=tpl.get("badge", "DisplayDelight Official"),
            site_name=site_name,
            support_phone=phone,
            support_email=email,
            address=addr,
        )

    return {
        "subject": subject,
        "body_text": f"{heading}\n\n{body}" + (f"\n\n{cta_text}: {cta_url}" if cta_text and cta_url else ""),
        "body_html": html,
    }
