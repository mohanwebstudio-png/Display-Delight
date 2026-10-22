"""
DisplayDelight V3 — API v1 Router aggregator.
Mounts all customer-facing and administrative endpoints under /api/v1.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.admin import admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.cart import router as cart_router
from app.api.v1.categories import router as categories_router
from app.api.v1.checkout import router as checkout_router
from app.api.v1.contact import router as contact_router
from app.api.v1.content import router as content_router
from app.api.v1.customer import router as customer_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.products import router as products_router
from app.api.v1.quotes import router as quotes_router
from app.api.v1.settings import router as settings_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.variants import router as variants_router


api_v1_router = APIRouter(prefix="/api/v1")

# Authentication & Account
api_v1_router.include_router(auth_router)
api_v1_router.include_router(customer_router)

# Catalogue, Categories & Variants
api_v1_router.include_router(categories_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(variants_router)
api_v1_router.include_router(reviews_router)


# Commerce: Cart, Checkout, Orders, Payments
api_v1_router.include_router(cart_router)
api_v1_router.include_router(checkout_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payments_router)

# Enquiries & File Uploads
api_v1_router.include_router(quotes_router)
api_v1_router.include_router(contact_router)
api_v1_router.include_router(uploads_router)

# Public CMS & Content & Store Settings
api_v1_router.include_router(content_router)
api_v1_router.include_router(settings_router)

# Administrative Control Panel (RBAC guarded)
api_v1_router.include_router(admin_router)

# Aliases for storefront and monitoring
from app.api.v1.products import get_filters
from app.schemas.schemas import FilterMeta
from typing import List

api_v1_router.add_api_route("/filters", get_filters, methods=["GET"], response_model=List[FilterMeta], summary="Filter metadata alias")

@api_v1_router.get("/health", summary="API v1 Health check")
def api_v1_health():
    return {"status": "healthy", "service": "DisplayDelight API v1"}


