"""
DisplayDelight V2 — Admin API Router aggregator.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.admin.analytics import router as analytics_router
from app.api.v1.admin.attributes import router as attributes_router
from app.api.v1.admin.audit_logs import router as audit_logs_router
from app.api.v1.admin.categories import router as categories_router
from app.api.v1.admin.content import router as content_router
from app.api.v1.admin.coupons import router as coupons_router
from app.api.v1.admin.customization import router as customization_router
from app.api.v1.admin.media import router as media_router
from app.api.v1.admin.notifications import router as notifications_router, devices_router
from app.api.v1.admin.orders import router as orders_router
from app.api.v1.admin.products import router as products_router
from app.api.v1.admin.quotes import router as quotes_router
from app.api.v1.admin.reviews import router as reviews_router
from app.api.v1.admin.seo import router as seo_router
from app.api.v1.admin.settings import router as settings_router
from app.api.v1.admin.email_templates import router as email_templates_router
from app.api.v1.admin.users import router as users_router
from app.api.v1.admin.variants import router as variants_router


admin_router = APIRouter(prefix="/admin")

admin_router.include_router(products_router)
admin_router.include_router(categories_router)
admin_router.include_router(attributes_router)
admin_router.include_router(customization_router)
admin_router.include_router(variants_router)
admin_router.include_router(orders_router)
admin_router.include_router(coupons_router)
admin_router.include_router(quotes_router)
admin_router.include_router(content_router)
admin_router.include_router(reviews_router)
admin_router.include_router(media_router)
admin_router.include_router(seo_router)
admin_router.include_router(notifications_router)
admin_router.include_router(devices_router)
admin_router.include_router(settings_router)
admin_router.include_router(email_templates_router)
admin_router.include_router(users_router)
admin_router.include_router(audit_logs_router)
admin_router.include_router(analytics_router)

from app.api.v1.admin.settings import test_payment_config
admin_router.add_api_route("/test-payment", test_payment_config, methods=["POST"], summary="Admin test payment alias")


