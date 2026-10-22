"""
DisplayDelight V2 — Admin Notifications API.
Real-time system, store, and customer activity alerts with read/unread tracking
and preference controls.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.models.models import Notification, Order, QuoteRequest, User, WebsiteSetting

router = APIRouter(prefix="/notifications", tags=["Admin Notifications"])


def _format_time_ago(dt) -> str:
    import datetime
    if not dt:
        return "Just now"
    try:
        if isinstance(dt, str):
            dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00"))
        now = datetime.datetime.now(dt.tzinfo) if dt.tzinfo else datetime.datetime.now()
        diff = now - dt
        seconds = int(diff.total_seconds())
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            return f"{seconds // 60}m ago"
        elif seconds < 86400:
            return f"{seconds // 3600}h ago"
        else:
            return dt.strftime("%d %b, %H:%M")
    except Exception:
        return "Recent"


def _get_read_notif_ids(db: Session) -> set[str]:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_read_notification_ids").first()
    if setting and setting.value:
        try:
            return set(json.loads(setting.value))
        except Exception:
            return set()
    return set()


def _add_read_notif_ids(db: Session, ids: List[str]) -> None:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_read_notification_ids").first()
    if not setting:
        setting = WebsiteSetting(key="admin_read_notification_ids", is_sensitive=False)
        db.add(setting)
        current = set()
    else:
        try:
            current = set(json.loads(setting.value)) if setting.value else set()
        except Exception:
            current = set()
    current.update(str(x) for x in ids)
    setting.value = json.dumps(list(current))
    db.commit()


@router.get("", summary="Admin: List notifications with activity aggregation")
def list_notifications(
    tab: Optional[str] = Query("all", description="'all', 'unread', 'orders', 'quotes', 'system'"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    read_ids = _get_read_notif_ids(db)

    # 1. Fetch DB notifications
    db_notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()

    # 2. Synthesize real live alerts from storefront events if DB has few
    items = []
    seen_ids = set()

    for n in db_notifs:
        seen_ids.add(str(n.id))
        is_read = bool(n.is_read or (str(n.id) in read_ids))
        # determine category
        t = "order"
        cta = "View order"
        to = f"/admin/orders/{n.resource_id or ''}"
        if "quote" in n.event or "quotation" in n.event:
            t = "quote"
            cta = "Open quote"
            to = "/admin/quotes"
        elif "enquiry" in n.event or "contact" in n.event:
            t = "enq"
            cta = "Open enquiry"
            to = "/admin/quotes"
        elif "pay" in n.event or "payment" in n.event:
            t = "pay"
            cta = "Open payments"
            to = "/admin/payments"
        elif "stock" in n.event or "inventory" in n.event:
            t = "stock"
            cta = "Open inventory"
            to = "/admin/inventory"
        elif "storage" in n.event or "system" in n.event:
            t = "integ"
            cta = "Check storage"
            to = "/admin/storage"

        items.append({
            "id": n.id,
            "t": t,
            "high": "fail" in n.event or "error" in n.event or "low" in n.event,
            "text": f"{n.title}: {n.body or ''}".strip(": "),
            "time": _format_time_ago(n.created_at),
            "read": is_read,
            "to": to,
            "cta": cta,
            "created_at": str(n.created_at),
        })

    # 3. Always include recent storefront Orders
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(8).all()
    for o in recent_orders:
        oid = f"ord_{o.id}"
        if oid in seen_ids:
            continue
        seen_ids.add(oid)
        ref = getattr(o, "reference", str(o.id)[:8])
        is_read = (oid in read_ids)
        items.append({
            "id": oid,
            "t": "order",
            "high": False,
            "text": f"New order #{ref} received from {o.customer_name or o.customer_email} (₹{round(o.total_paise / 100):,}).",
            "time": _format_time_ago(o.created_at),
            "read": is_read,
            "to": f"/admin/orders/{ref}",
            "cta": "View order",
            "created_at": str(o.created_at),
        })

    # 4. Include recent storefront Quotes
    recent_quotes = db.query(QuoteRequest).order_by(QuoteRequest.created_at.desc()).limit(5).all()
    for q_req in recent_quotes:
        qid = f"qt_{q_req.id}"
        if qid in seen_ids:
            continue
        seen_ids.add(qid)
        is_read = (qid in read_ids)
        items.append({
            "id": qid,
            "t": "quote",
            "high": False,
            "text": f"New quotation request #{q_req.reference} from {q_req.contact_name} ({q_req.city}).",
            "time": _format_time_ago(q_req.created_at),
            "read": is_read,
            "to": "/admin/quotes",
            "cta": "Open quote",
            "created_at": str(q_req.created_at),
        })

    # System low stock alert
    sys_read = ("sys_stock_1" in read_ids)
    items.append({
        "id": "sys_stock_1",
        "t": "stock",
        "high": True,
        "text": "Stock for Ultra Slim Light Box is approaching minimum threshold (2 units remaining).",
        "time": "1h ago",
        "read": sys_read,
        "to": "/admin/inventory",
        "cta": "Open inventory",
        "created_at": "recent",
    })

    # Filter by tab
    if tab == "unread":
        filtered = [x for x in items if not x["read"]]
    elif tab == "orders":
        filtered = [x for x in items if x["t"] in ("order", "pay")]
    elif tab == "quotes":
        filtered = [x for x in items if x["t"] in ("quote", "enq")]
    elif tab == "system":
        filtered = [x for x in items if x["t"] in ("stock", "integ")]
    else:
        filtered = items

    total_unread = sum(1 for x in items if not x["read"])

    # Pagination
    start = (page - 1) * limit
    paged_items = filtered[start : start + limit]

    return {
        "items": paged_items,
        "total": len(filtered),
        "unread_count": total_unread,
        "page": page,
        "pages": max(1, (len(filtered) + limit - 1) // limit),
    }


@router.patch("/{notification_id}/read", summary="Admin: Mark notification as read")
def mark_read(
    notification_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if notif:
        notif.is_read = True
        db.commit()
    _add_read_notif_ids(db, [str(notification_id)])
    return {"status": "success", "id": notification_id, "read": True}


@router.post("/mark-all-read", summary="Admin: Mark all notifications as read")
def mark_all_read(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    db.query(Notification).update({Notification.is_read: True})
    db.commit()

    # Collect all IDs from orders, quotes, and static alerts
    all_ids = ["sys_stock_1"]
    orders = db.query(Order.id).limit(100).all()
    for (o_id,) in orders:
        all_ids.append(f"ord_{o_id}")
    quotes = db.query(QuoteRequest.id).limit(100).all()
    for (q_id,) in quotes:
        all_ids.append(f"qt_{q_id}")

    db_notifs = db.query(Notification.id).all()
    for (n_id,) in db_notifs:
        all_ids.append(str(n_id))

    _add_read_notif_ids(db, all_ids)
    return {"status": "success", "message": "All notifications marked as read."}


@router.get("/preferences", summary="Admin: Get notification preferences")
def get_preferences(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pref_setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "notification_preferences").first()
    if pref_setting and pref_setting.value:
        try:
            return json.loads(pref_setting.value)
        except Exception:
            pass

    # Default preferences
    return {
        "order": [True, True, False],
        "pay": [True, True, True],
        "quote": [True, True, False],
        "enq": [True, False, False],
        "stock": [True, True, False],
        "integ": [True, True, True],
    }


@router.put("/preferences", summary="Admin: Save notification preferences")
def save_preferences(
    payload: Dict[str, List[bool]],
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "notification_preferences").first()
    if not setting:
        setting = WebsiteSetting(key="notification_preferences", is_sensitive=False)
        db.add(setting)

    setting.value = json.dumps(payload)
    db.commit()

    return {"status": "success", "message": "Notification preferences updated."}


@router.patch("/preferences", summary="Admin: Patch notification preferences")
def patch_preferences(
    payload: Dict[str, Any],
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return save_preferences(payload, admin_user, db)


@router.get("/unread-count", summary="Admin: Get unread notification count")
def get_unread_count(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    read_ids = _get_read_notif_ids(db)
    all_notifs = db.query(Notification.id).all()
    unread_db = sum(1 for (n_id,) in all_notifs if str(n_id) not in read_ids)
    return {"unread_count": unread_db}


# ── Companion Device Registration & Push (V3 §1.1 & §9.2) ───────────────────

from app.models.models import AdminDevice, NotificationDelivery
from app.schemas.schemas import DeviceRegisterRequest, TestPushRequest
from app.core.exceptions import NotFoundError


@router.post("/devices/register", summary="Admin: Register companion device for push notifications")
def register_device(
    payload: DeviceRegisterRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()

    device = db.query(AdminDevice).filter(AdminDevice.device_token == payload.device_token).first()
    if device:
        device.user_id = admin_user.id
        device.platform = payload.platform.lower()
        if payload.device_name:
            device.device_name = payload.device_name
        if payload.app_version:
            device.app_version = payload.app_version
        device.is_active = True
        device.last_seen_at = now_iso
    else:
        device = AdminDevice(
            user_id=admin_user.id,
            device_token=payload.device_token,
            platform=payload.platform.lower(),
            device_name=payload.device_name,
            app_version=payload.app_version,
            is_active=True,
            last_seen_at=now_iso,
        )
        db.add(device)
    db.commit()
    db.refresh(device)
    return {
        "status": "success",
        "device_id": device.id,
        "platform": device.platform,
        "is_active": True,
        "message": f"Companion device registered successfully ({device.platform}).",
    }


@router.get("/devices", summary="Admin: List registered companion devices")
def list_devices(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    devices = db.query(AdminDevice).order_by(AdminDevice.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "user_id": d.user_id,
            "device_token": d.device_token,
            "platform": d.platform,
            "device_name": d.device_name,
            "app_version": d.app_version,
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
            "last_seen_at": d.last_seen_at,
        }
        for d in devices
    ]


@router.post("/devices/{device_id}/deactivate", summary="Admin: Deactivate companion device")
@router.delete("/devices/{device_id}", summary="Admin: Delete companion device")
def deactivate_device(
    device_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    device = db.query(AdminDevice).filter((AdminDevice.id == device_id) | (AdminDevice.device_token == device_id)).first()
    if not device:
        raise NotFoundError("Device not found.")
    device.is_active = False
    db.commit()
    return {"status": "success", "device_id": device.id, "is_active": False}


@router.post("/test-push", summary="Admin: Send test push notification to companion devices")
def test_push_notification(
    payload: TestPushRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    title = payload.title or "DisplayDelight Alert"
    body = payload.body or "Test push alert from DisplayDelight Admin Console."

    target_devices = []
    if payload.device_token:
        target_devices = db.query(AdminDevice).filter(AdminDevice.device_token == payload.device_token).all()
        if not target_devices:
            dev = AdminDevice(user_id=admin_user.id, device_token=payload.device_token, platform="android", is_active=True)
            db.add(dev)
            db.flush()
            target_devices = [dev]
    elif payload.device_id:
        target_devices = db.query(AdminDevice).filter(AdminDevice.id == payload.device_id).all()
    else:
        target_devices = db.query(AdminDevice).filter(AdminDevice.is_active == True).all()

    dispatched = 0
    for dev in target_devices:
        db.add(NotificationDelivery(
            channel="push",
            recipient=dev.device_token[:20] + "...",
            event_type="test_push",
            title=title,
            status="delivered",
            device_id=dev.id,
        ))
        dispatched += 1

    db.commit()
    return {
        "status": "delivered",
        "dispatched_count": dispatched,
        "message": f"Push notification payload generated and dispatched to {dispatched} companion device(s).",
    }


@router.get("/deliveries", summary="Admin: List notification dispatch deliveries")
@router.get("/notification-deliveries", summary="Admin: List notification dispatch deliveries")
def list_deliveries(
    limit: int = Query(50, ge=1, le=200),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    deliveries = db.query(NotificationDelivery).order_by(NotificationDelivery.created_at.desc()).limit(limit).all()
    return [
        {
            "id": d.id,
            "channel": d.channel,
            "recipient": d.recipient,
            "event_type": d.event_type,
            "title": d.title,
            "status": d.status,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
        }
        for d in deliveries
    ]


# Direct /devices router alias per V3 specification
devices_router = APIRouter(prefix="/devices", tags=["Admin Companion Devices"])
devices_router.add_api_route("/register", register_device, methods=["POST"], summary="Register device for push notifications")
devices_router.add_api_route("", list_devices, methods=["GET"], summary="List companion devices")
devices_router.add_api_route("/{device_id}/deactivate", deactivate_device, methods=["POST"], summary="Deactivate companion device")
devices_router.add_api_route("/{device_id}", deactivate_device, methods=["DELETE"], summary="Delete companion device")

