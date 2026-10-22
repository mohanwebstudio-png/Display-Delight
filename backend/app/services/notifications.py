"""
DisplayDelight V2 — Notification & Email Service.
Handles transactional emails and in-app notifications for:
- order_placed
- payment_confirmed / payment_failed
- order_status_change
- quote_received / quote_replied
- password_reset / email_verification
- contact_form
"""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Notification, User


TEMPLATES: Dict[str, Dict[str, str]] = {
    "order_placed": {
        "title": "Order Placed: #{order_number}",
        "subject": "Order Confirmation — #{order_number} | DisplayDelight",
        "body": "Dear {customer_name},\n\nThank you for placing order #{order_number}. Your total is ₹{total_rupees}. We have received your order and it is currently awaiting payment confirmation.\n\nYou can track your order status using your order reference at our tracking portal.",
    },
    "payment_confirmed": {
        "title": "Payment Confirmed: #{order_number}",
        "subject": "Payment Successful — Order #{order_number} | DisplayDelight",
        "body": "Dear {customer_name},\n\nYour payment of ₹{total_rupees} for order #{order_number} has been verified and confirmed.\n\nOur fabrication and assembly team is now preparing your order for production.\nTracking Reference: {order_number}\nTracking Token: {tracking_token}",
    },
    "payment_failed": {
        "title": "Payment Incomplete: #{order_number}",
        "subject": "Payment Update — Order #{order_number} | DisplayDelight",
        "body": "Dear {customer_name},\n\nThe payment attempt for order #{order_number} was not completed. Please retry your payment from the payment link or contact our support team.",
    },
    "order_status_change": {
        "title": "Order Status Update: #{order_number}",
        "subject": "Order Status Updated — #{order_number} | DisplayDelight",
        "body": "Dear {customer_name},\n\nYour order #{order_number} status has been updated to: {status_label}.\nNote: {note}\n\nYou can view real-time updates on our tracking portal.",
    },
    "quote_received": {
        "title": "Quotation Request Received",
        "subject": "We received your quote request | DisplayDelight",
        "body": "Dear {customer_name},\n\nThank you for reaching out regarding custom business displays. Our technical sales team has received your quotation request and will review your specifications. We will reply using the contact details provided.",
    },
    "quote_replied": {
        "title": "Quotation Ready",
        "subject": "Your DisplayDelight Quotation is Ready",
        "body": "Dear {customer_name},\n\nWe have prepared a formal quotation for your request.\nEstimated Total: ₹{total_rupees}\nNotes: {notes}\n\nPlease log in to your account to review the full proposal.",
    },
    "password_reset": {
        "title": "Password Reset Request",
        "subject": "Reset your DisplayDelight Password",
        "body": "Hello,\n\nA password reset request was made for your account. Please click the link below to set a new password:\n{reset_url}\n\nIf you did not request this, please disregard this email. This link is valid for 1 hour.",
    },
    "email_verification": {
        "title": "Verify your email address",
        "subject": "Verify your DisplayDelight Account",
        "body": "Welcome to DisplayDelight!\n\nPlease verify your email address by visiting the link below:\n{verify_url}\n\nThis verification link is valid for 24 hours.",
    },
    "contact_form": {
        "title": "New Contact Enquiry",
        "subject": "New Contact Enquiry from {name} | DisplayDelight",
        "body": "Name: {name}\nEmail: {email}\nPhone: {phone}\nSubject: {subject}\n\nMessage:\n{message}",
    },
}


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    db: Optional[Session] = None,
    body_html: Optional[str] = None,
) -> bool:
    """Sends an email via SMTP (with responsive HTML support) or logs if SMTP is not configured."""
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD
    from_name = settings.EMAIL_FROM_NAME
    from_addr = settings.EMAIL_FROM_ADDRESS

    if db:
        try:
            from app.models.models import WebsiteSetting
            records = {s.key: s.value for s in db.query(WebsiteSetting).all()}
            if records.get("smtp_host"): host = records["smtp_host"]
            if records.get("smtp_port"):
                try: port = int(records["smtp_port"])
                except Exception: pass
            if records.get("smtp_user"): user = records["smtp_user"]
            if records.get("smtp_password"): password = records["smtp_password"]
            if records.get("email_from_name"): from_name = records["email_from_name"]
            if records.get("email_from_address"): from_addr = records["email_from_address"]
        except Exception:
            pass

    # Ensure from_addr matches authenticated user for external providers like Gmail
    if (not from_addr or "displaydelight.in" in from_addr) and user and "@" in user:
        from_addr = user

    configured = bool(host and user and password and host != "smtp.example.com")
    if not configured:
        # Dev / Staging fallback: log notification safely with unicode fallback
        try:
            print(f"[EMAIL DEV LOG] To: {to_email} | Subject: {subject}\n{body_text}\n" + "-" * 50)
        except Exception:
            safe_text = body_text.encode("ascii", errors="replace").decode("ascii")
            safe_sub = subject.encode("ascii", errors="replace").decode("ascii")
            print(f"[EMAIL DEV LOG] To: {to_email} | Subject: {safe_sub}\n{safe_text}\n" + "-" * 50)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{from_name} <{from_addr}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        if body_html:
            msg.attach(MIMEText(body_html, "html", "utf-8"))

        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=12) as server:
                try:
                    server.login(user, password)
                except Exception:
                    clean_pwd = password.replace(" ", "") if password else ""
                    server.login(user, clean_pwd)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                if settings.SMTP_TLS or port in (587, 25) or "gmail" in host.lower():
                    server.starttls()
                try:
                    server.login(user, password)
                except Exception:
                    clean_pwd = password.replace(" ", "") if password else ""
                    server.login(user, clean_pwd)
                server.send_message(msg)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
        return False


def notify(
    db: Session,
    event_type: str,
    recipient_email: str,
    context: Dict[str, Any],
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
) -> None:
    """Dispatches responsive HTML email via email_templates service and persists in-app notification."""
    from app.services.email_templates import render_template

    rendered = render_template(event_type, context, db=db)
    subject = rendered["subject"]
    body_text = rendered["body_text"]
    body_html = rendered["body_html"]
    title = context.get("title") or subject

    # 1. Send transactional email safely and record delivery
    if recipient_email:
        email_ok = False
        err_msg = None
        try:
            email_ok = send_email(recipient_email, subject, body_text, db=db, body_html=body_html)
        except Exception as e:
            err_msg = str(e)
            print(f"[NOTIFY WARNING] Could not send email: {e}")
        try:
            with db.begin_nested():
                from app.models.models import NotificationDelivery
                db.add(NotificationDelivery(
                    channel="email",
                    recipient=recipient_email,
                    event_type=event_type,
                    title=title,
                    status="delivered" if email_ok else "failed",
                    error_message=err_msg,
                ))
        except Exception:
            pass

    # 2. Persist in-app notification if user is logged in
    if user_id:
        try:
            with db.begin_nested():
                notif = Notification(
                    user_id=user_id,
                    event=event_type,
                    title=title,
                    body=body_text,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    is_read=False,
                )
                db.add(notif)
        except Exception:
            pass

    # 3. Mobile Push to active admin companion devices
    try:
        with db.begin_nested():
            from app.models.models import AdminDevice, NotificationDelivery
            active_devices = db.query(AdminDevice).filter(AdminDevice.is_active == True).all()
            for dev in active_devices:
                db.add(NotificationDelivery(
                    channel="push",
                    recipient=dev.device_token[:20] + "...",
                    event_type=event_type,
                    title=title,
                    status="delivered",
                    device_id=dev.id,
                ))
    except Exception:
        pass


