"""
Pydantic v2 request/response schemas for all API endpoints.
All monetary values are in paise (integer) on the wire and converted to ₹ by the frontend.
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator
try:
    import email_validator
    from pydantic import EmailStr
except ImportError:
    EmailStr = str


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    page: int
    page_size: int
    total: int
    total_pages: int


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_email_verified: bool

    model_config = {"from_attributes": True}


# ── Addresses ─────────────────────────────────────────────────────────────────

class AddressIn(BaseModel):
    label: Optional[str] = None
    full_name: str = Field(min_length=1, max_length=200)
    phone: Optional[str] = None
    address_line1: str = Field(min_length=1, max_length=300)
    address_line2: Optional[str] = None
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pin_code: str = Field(pattern=r"^\d{6}$")
    country: str = "India"
    is_default: bool = False


class AddressOut(AddressIn):
    id: str
    model_config = {"from_attributes": True}


# ── Categories ────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    description: Optional[str]
    image_url: Optional[str]
    parent_id: Optional[str]
    display_order: int
    status: str
    seo_title: Optional[str]
    seo_description: Optional[str]

    model_config = {"from_attributes": True}


class CategoryIn(BaseModel):
    slug: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    display_order: int = 0
    status: str = "published"
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# ── Attributes ────────────────────────────────────────────────────────────────

class AttributeOptionOut(BaseModel):
    id: str
    value: str
    display_label: Optional[str]
    display_order: int

    model_config = {"from_attributes": True}


class AttributeOut(BaseModel):
    id: str
    key: str
    label: str
    data_type: str
    filter_type: str
    is_filterable: bool
    is_searchable: bool
    is_customer_visible: bool
    display_order: int
    unit: Optional[str]
    is_active: bool
    options: List[AttributeOptionOut] = []

    model_config = {"from_attributes": True}


class AttributeIn(BaseModel):
    key: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9_]+$")
    label: str = Field(min_length=1, max_length=200)
    data_type: str = "select"
    filter_type: str = "checkbox"
    is_filterable: bool = True
    is_searchable: bool = False
    is_customer_visible: bool = True
    display_order: int = 0
    unit: Optional[str] = None
    is_active: bool = True


# ── Filter metadata ───────────────────────────────────────────────────────────

class FilterOptionMeta(BaseModel):
    value: str
    label: str
    count: int = 0


class FilterMeta(BaseModel):
    key: str
    label: str
    filter_type: str
    options: List[FilterOptionMeta]
    unit: Optional[str] = None


# ── Products ──────────────────────────────────────────────────────────────────

class ProductImageOut(BaseModel):
    id: str
    url: str
    alt_text: Optional[str]
    is_primary: bool
    display_order: int

    model_config = {"from_attributes": True}


class ProductSpecOut(BaseModel):
    label: str
    value: str
    display_order: int

    model_config = {"from_attributes": True}


class ProductVariantOut(BaseModel):
    id: str
    name: str
    sku: str
    price_delta_paise: Optional[int]
    is_active: bool

    model_config = {"from_attributes": True}


class ProductSummary(BaseModel):
    id: str
    slug: str
    name: str
    sku: str
    kind: str
    blurb: Optional[str] = None
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    category_name: Optional[str] = None
    base_price_paise: Optional[int] = None
    gst_rate: int = 18
    is_customizable: bool = False
    status: str = "published"
    primary_image: Optional[str] = None
    stock: Optional[int] = None
    attrs: Dict[str, Any] = {}
    specs: List[Any] = []
    variants: List[ProductVariantOut] = []

    model_config = {"from_attributes": True}


class ProductDetail(BaseModel):
    id: str
    slug: str
    name: str
    sku: str
    model: Optional[str] = None
    kind: str = "standard"
    blurb: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    category_name: Optional[str] = None
    base_price_paise: Optional[int] = None
    gst_rate: int = 18
    is_customizable: bool = False
    minimum_order_qty: int = 1
    status: str = "published"
    images: List[ProductImageOut] = []
    specs: List[ProductSpecOut] = []
    variants: List[ProductVariantOut] = []
    attribute_values: List[Dict[str, Any]] = []
    warranty_info: Optional[str] = None
    shipping_info: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    stock: Optional[int] = None

    model_config = {"from_attributes": True}


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    sku: str = Field(min_length=1, max_length=100)
    slug: Optional[str] = None
    model: Optional[str] = None
    blurb: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    kind: str = "standard"
    category_id: Optional[str] = None
    base_price_paise: Optional[int] = Field(None, ge=0)
    gst_rate: int = Field(18, ge=0, le=100)
    is_customizable: bool = False
    is_featured: bool = False
    minimum_order_qty: int = Field(1, ge=1)
    status: str = "published"
    images: Optional[List[Any]] = None
    specs: Optional[List[Any]] = None
    stock: Optional[int] = None
    warranty_info: Optional[str] = None
    shipping_info: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    model_config = {"extra": "allow"}


# ── Price preview ─────────────────────────────────────────────────────────────

class PricePreviewRequest(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(1, ge=1)
    configuration: Optional[Dict[str, Any]] = None
    coupon_code: Optional[str] = None


class PriceBreakdown(BaseModel):
    base_price_paise: int
    variant_delta_paise: int = 0
    customization_delta_paise: int = 0
    subtotal_paise: int
    discount_paise: int = 0
    taxable_paise: int
    gst_paise: int
    gst_rate: int
    shipping_paise: int
    total_paise: int
    quantity: int
    coupon_applied: Optional[str] = None


# ── Customization profile ─────────────────────────────────────────────────────

class CustomizationFieldOut(BaseModel):
    id: str
    key: str
    label: str
    field_type: str
    is_required: bool
    default_value: Optional[str]
    allowed_values: Optional[List[Union[str, Dict[str, Any]]]] = None
    min_length: Optional[int]
    max_length: Optional[int]
    min_value: Optional[float]
    max_value: Optional[float]
    allowed_mime_types: Optional[List[str]]
    max_file_size_mb: Optional[int]
    affects_price: bool
    price_delta_paise: Optional[int]
    display_order: int
    visibility_rule: Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}


class CustomizationProfileOut(BaseModel):
    id: str
    product_id: Optional[str] = None
    name: str
    supports_front: bool
    supports_back: bool
    status: str
    version: int
    fields: List[CustomizationFieldOut]

    model_config = {"from_attributes": True}


class CustomizationValidateRequest(BaseModel):
    configuration: Dict[str, Any]
    variant_id: Optional[str] = None


class CustomizationValidateResponse(BaseModel):
    valid: bool
    errors: Dict[str, str] = {}


# ── Cart (server-side representation) ────────────────────────────────────────

class CartItemIn(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(1, ge=1)
    options: Dict[str, Any] = {}
    artwork_upload_id: Optional[str] = None


class CartItemOut(BaseModel):
    item_id: str
    product_id: str
    product_name: str
    product_sku: str
    primary_image: Optional[str]
    variant_id: Optional[str]
    variant_name: Optional[str]
    quantity: int
    unit_price_paise: Optional[int]
    total_paise: Optional[int]
    options: Dict[str, Any]
    artwork_url: Optional[str]
    is_purchasable: bool
    validation_error: Optional[str]


class CartOut(BaseModel):
    items: List[CartItemOut]
    totals: Optional[PriceBreakdown]
    coupon_code: Optional[str]


class ApplyCouponRequest(BaseModel):
    code: str


# ── Checkout ──────────────────────────────────────────────────────────────────

class AddressSnapshot(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = "Karnataka"
    pin_code: Optional[str] = "560001"
    postal_code: Optional[str] = "560001"
    country: str = "India"

    @model_validator(mode="before")
    @classmethod
    def normalize_address(cls, values: Any) -> Any:
        if isinstance(values, dict):
            pin = values.get("pin_code") or values.get("postal_code") or values.get("pin") or "560001"
            values["pin_code"] = str(pin)
            values["postal_code"] = str(pin)
            if not values.get("state"):
                values["state"] = "Karnataka"
        return values


class CheckoutItemIn(BaseModel):
    product_id: str
    quantity: int = 1
    options: Optional[Dict[str, Any]] = None
    artwork: Optional[str] = None
    artwork_url: Optional[str] = None
    artwork_upload_id: Optional[str] = None
    variant_id: Optional[str] = None


class CheckoutRequest(BaseModel):
    customer_name: Optional[str] = "Customer"
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = "9840327440"
    billing_address: Optional[AddressSnapshot] = None
    shipping_address: Optional[AddressSnapshot] = None
    company_name: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=15)
    notes: Optional[str] = None
    coupon_code: Optional[str] = None
    price_token: Optional[str] = None
    items: Optional[List[CheckoutItemIn]] = None

    @field_validator("customer_email", mode="before")
    @classmethod
    def clean_email(cls, v: Any) -> Optional[str]:
        if not v or not str(v).strip():
            return None
        s = str(v).strip()
        if "@" not in s or "." not in s:
            return None
        return s

    @field_validator("customer_phone", mode="before")
    @classmethod
    def clean_phone(cls, v: Any) -> str:
        if v is None:
            return "9840327440"
        s = str(v).strip()
        digits = re.sub(r"\D", "", s)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) >= 10:
            return digits[-10:]
        return digits or "9840327440"

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) != 15:
            raise ValueError("GSTIN must be exactly 15 characters.")
        return v.upper() if v else v

    @model_validator(mode="after")
    def populate_address_defaults(self) -> "CheckoutRequest":
        if self.billing_address:
            if not self.billing_address.full_name and self.customer_name:
                self.billing_address.full_name = self.customer_name
            if not self.billing_address.phone and self.customer_phone:
                self.billing_address.phone = self.customer_phone
        if self.shipping_address:
            if not self.shipping_address.full_name and self.customer_name:
                self.shipping_address.full_name = self.customer_name
            if not self.shipping_address.phone and self.customer_phone:
                self.shipping_address.phone = self.customer_phone
        return self


class PostPaymentDetailsIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=200)
    customer_email: EmailStr
    customer_phone: str
    billing_address: AddressSnapshot
    shipping_address: Optional[AddressSnapshot] = None
    company_name: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=15)
    notes: Optional[str] = None
    create_account: Optional[bool] = False
    password: Optional[str] = None

    @field_validator("customer_phone", mode="before")
    @classmethod
    def clean_phone(cls, v: Any) -> str:
        s = str(v).strip()
        digits = re.sub(r"\D", "", s)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) >= 10:
            return digits[-10:]
        return digits or "9840327440"

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) != 15:
            raise ValueError("GSTIN must be exactly 15 characters.")
        return v.upper() if v else v



# ── Payment ───────────────────────────────────────────────────────────────────

class RazorpayOrderResponse(BaseModel):
    razorpay_order_id: str
    amount_paise: int
    currency: str
    order_reference: str
    key_id: str
    is_simulated: Optional[bool] = False


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_reference: str


class PaymentStatusOut(BaseModel):
    order_reference: str
    payment_status: str
    order_status: str
    total_amount_inr: Optional[float] = None
    customer_name: Optional[str] = None
    paid_at: Optional[str] = None


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    id: str
    product_id: Optional[str]
    product_name: str
    product_sku: str
    variant_name: Optional[str]
    quantity: int
    unit_price_paise: int
    total_paise: int
    configuration: Optional[Dict[str, Any]]
    artwork_url: Optional[str]


class OrderStatusHistoryOut(BaseModel):
    status: str
    note: Optional[str]
    changed_at: str
    changed_by: Optional[str]


class OrderOut(BaseModel):
    id: str
    reference: str
    customer_name: str
    customer_email: str
    status: str
    subtotal_paise: int
    discount_paise: int
    gst_paise: int
    shipping_paise: int
    total_paise: int
    gst_rate: int
    coupon_code: Optional[str]
    company_name: Optional[str]
    gstin: Optional[str]
    items: List[OrderItemOut]
    status_history: List[OrderStatusHistoryOut]
    billing_address: Optional[Dict[str, Any]]
    shipping_address: Optional[Dict[str, Any]]
    created_at: str

    model_config = {"from_attributes": True}


class OrderTrackRequest(BaseModel):
    order_reference: Optional[str] = None
    reference: Optional[str] = None
    email: Optional[str] = None
    email_or_phone: Optional[str] = None


class OrderTrackOut(BaseModel):
    reference: str
    status: str
    items_count: int
    total_paise: int
    total_amount_inr: Optional[float] = None
    payment_status: Optional[str] = "paid"
    created_at: str
    shipment_info: Optional[Dict[str, Any]] = None
    shipping_address: Optional[Dict[str, Any]] = None
    status_history: List[OrderStatusHistoryOut] = []
    items: Optional[List[Dict[str, Any]]] = None


# ── Quotes ────────────────────────────────────────────────────────────────────

class QuoteRequestIn(BaseModel):
    contact_name: str = Field(min_length=2, max_length=200)
    business_name: Optional[str] = None
    email: EmailStr
    phone: str = Field(pattern=r"[\d\s\-\+]{10,15}")
    city: str = Field(min_length=1, max_length=100)
    state: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = Field(1, ge=1)
    notes: Optional[str] = None
    artwork_upload_id: Optional[str] = None
    consent_given: bool = True
    configuration: Optional[Dict[str, Any]] = None


class QuoteOut(BaseModel):
    id: str
    reference: str
    contact_name: str
    business_name: Optional[str]
    email: str
    phone: str
    city: str
    state: Optional[str]
    product_id: Optional[str]
    quantity: int
    notes: Optional[str]
    artwork_url: Optional[str]
    status: str
    created_at: str

    model_config = {"from_attributes": True}


# ── Upload ────────────────────────────────────────────────────────────────────

class UploadOut(BaseModel):
    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: str
    url: str  # signed / served URL


# ── Wishlish ──────────────────────────────────────────────────────────────────

class WishlistOut(BaseModel):
    product_ids: List[str]


# ── CMS / Storefront ──────────────────────────────────────────────────────────

class HomepageSectionOut(BaseModel):
    section_key: str
    title: Optional[str]
    subtitle: Optional[str]
    content: Optional[Any]
    image_url: Optional[str]
    cta_label: Optional[str]
    cta_url: Optional[str]
    is_visible: bool
    display_order: int

    model_config = {"from_attributes": True}


class ContentPageOut(BaseModel):
    slug: str
    title: str
    content: Optional[str]
    seo_title: Optional[str]
    seo_description: Optional[str]

    model_config = {"from_attributes": True}


class NavigationItemOut(BaseModel):
    id: str
    label: str
    url: str
    parent_id: Optional[str]
    display_order: int
    children: List["NavigationItemOut"] = []

    model_config = {"from_attributes": True}


NavigationItemOut.model_rebuild()


class FaqOut(BaseModel):
    id: str
    question: str
    answer: str
    category: Optional[str]
    display_order: int

    model_config = {"from_attributes": True}


class TestimonialOut(BaseModel):
    id: str
    author_name: str
    company: Optional[str]
    text: str
    rating: Optional[int]
    avatar_url: Optional[str]
    display_order: int

    model_config = {"from_attributes": True}


class ClientLogoOut(BaseModel):
    id: str
    name: str
    logo_url: str
    website_url: Optional[str]
    display_order: int

    model_config = {"from_attributes": True}


class GalleryItemOut(BaseModel):
    id: str
    title: Optional[str] = None
    media_url: str
    thumbnail_url: Optional[str] = None
    embed_url: Optional[str] = None
    media_type: str
    placement: Optional[str] = "both"
    caption: Optional[str] = None
    cat: Optional[str] = "Installations"
    prod: Optional[str] = ""
    display_order: int

    model_config = {"from_attributes": True}


class IndustryShowcaseOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    image_url: Optional[str]
    display_order: int

    model_config = {"from_attributes": True}


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    event: str
    title: str
    body: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    is_read: bool
    created_at: str

    model_config = {"from_attributes": True}


class DeviceRegisterRequest(BaseModel):
    device_token: str
    platform: str = "android"  # android | ios | web | windows | macos
    device_name: Optional[str] = None
    app_version: Optional[str] = None


class DeviceOut(BaseModel):
    id: str
    user_id: str
    device_token: str
    platform: str
    device_name: Optional[str] = None
    app_version: Optional[str] = None
    is_active: bool
    created_at: str
    last_seen_at: Optional[str] = None

    model_config = {"from_attributes": True}


class TestPushRequest(BaseModel):
    title: Optional[str] = "DisplayDelight Companion Alert"
    body: Optional[str] = "Real-time push notification delivered to your authorized device."
    device_token: Optional[str] = None
    device_id: Optional[str] = None


class NotificationDeliveryOut(BaseModel):
    id: str
    channel: str
    recipient: str
    event_type: str
    title: str
    status: str
    error_message: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}



# ── Inventory ────────────────────────────────────────────────────────────────

class InventoryOut(BaseModel):
    product_id: str
    quantity: int
    reserved: int
    available: int
    low_stock_threshold: int
    track_stock: bool
    is_low_stock: bool

    model_config = {"from_attributes": True}


class InventoryAdjust(BaseModel):
    quantity_delta: int
    note: Optional[str] = None


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingOut(BaseModel):
    key: str
    value: Optional[str]  # None for sensitive settings
    description: Optional[str]
    is_sensitive: bool


class SettingIn(BaseModel):
    value: str


# ── Integration status ────────────────────────────────────────────────────────

class IntegrationStatus(BaseModel):
    name: str
    configured: bool
    status: str  # ok | not_configured | error
    message: Optional[str]


# ── Audit logs ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    actor_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    detail: Optional[str]
    ip_address: Optional[str]
    occurred_at: str

    model_config = {"from_attributes": True}


# ── Reviews & Social Proof ────────────────────────────────────────────────────

class ProductReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    author_name: str = Field(min_length=2, max_length=200)
    title: Optional[str] = Field(default=None, max_length=300)
    body: str = Field(min_length=5, max_length=2000)
    company: Optional[str] = Field(default=None, max_length=200)


class ProductReviewOut(BaseModel):
    id: str
    product_id: str
    author_name: str
    company: Optional[str] = None
    rating: int
    title: Optional[str] = None
    body: str
    text: Optional[str] = None
    verified: bool = False
    is_verified_purchase: bool = False
    status: str
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewModerateIn(BaseModel):
    status: str = Field(pattern=r"^(published|rejected|pending)$")
