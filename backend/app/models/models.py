"""
All SQLAlchemy ORM models for DisplayDelight V2.
Import order matters for Alembic; all models must be imported before
create_all() or before alembic env.py runs.
"""
from __future__ import annotations

import enum
import json
import re
import uuid
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


# ══════════════════════════════════════════════════════════════════════════════
# ENUMERATIONS
# ══════════════════════════════════════════════════════════════════════════════

class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"
    catalogue_manager = "catalogue_manager"
    order_manager = "order_manager"
    content_manager = "content_manager"
    inventory_manager = "inventory_manager"


class ProductKind(str, enum.Enum):
    digital = "digital"
    custom = "custom"
    standard = "standard"


class PublishStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class OrderStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    payment_failed = "payment_failed"
    paid_details_pending = "paid_details_pending"
    paid = "paid"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class PaymentStatus(str, enum.Enum):
    created = "created"
    pending = "pending"
    captured = "captured"
    failed = "failed"
    refunded = "refunded"


class QuoteStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    quoted = "quoted"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"


class FieldType(str, enum.Enum):
    text = "text"
    textarea = "textarea"
    dropdown = "dropdown"
    radio = "radio"
    checkbox = "checkbox"
    number = "number"
    dimensions = "dimensions"
    color = "color"
    font = "font"
    orientation = "orientation"
    artwork_upload = "artwork_upload"
    template_select = "template_select"


class FilterType(str, enum.Enum):
    checkbox = "checkbox"
    radio = "radio"
    range = "range"


class AttributeDataType(str, enum.Enum):
    text = "text"
    number = "number"
    boolean = "boolean"
    select = "select"
    multi_select = "multi_select"


class NotificationEvent(str, enum.Enum):
    new_order = "new_order"
    payment_failed = "payment_failed"
    new_quote = "new_quote"
    new_enquiry = "new_enquiry"
    low_stock = "low_stock"
    integration_failure = "integration_failure"


# ══════════════════════════════════════════════════════════════════════════════
# IDENTITY & ACCESS
# ══════════════════════════════════════════════════════════════════════════════

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.customer
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    addresses: Mapped[List["Address"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[List["Order"]] = relationship(back_populates="user")
    wishlist_items: Mapped[List["WishlistItem"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    quote_requests: Mapped[List["QuoteRequest"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    password_resets: Mapped[List["PasswordReset"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    email_verifications: Mapped[List["EmailVerification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="actor")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    expires_at: Mapped[str] = mapped_column(String(50), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class PasswordReset(Base, TimestampMixin):
    __tablename__ = "password_resets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    expires_at: Mapped[str] = mapped_column(String(50), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="password_resets")


class EmailVerification(Base, TimestampMixin):
    __tablename__ = "email_verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    expires_at: Mapped[str] = mapped_column(String(50), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="email_verifications")


# ══════════════════════════════════════════════════════════════════════════════
# ADDRESSES
# ══════════════════════════════════════════════════════════════════════════════

class Address(Base, TimestampMixin):
    __tablename__ = "addresses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[Optional[str]] = mapped_column(String(100))
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    address_line1: Mapped[str] = mapped_column(String(300), nullable=False)
    address_line2: Mapped[Optional[str]] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(10), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="addresses")


# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — CATEGORIES
# ══════════════════════════════════════════════════════════════════════════════

class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus), default=PublishStatus.published, nullable=False
    )
    seo_title: Mapped[Optional[str]] = mapped_column(String(200))
    seo_description: Mapped[Optional[str]] = mapped_column(Text)

    parent: Mapped[Optional["Category"]] = relationship("Category", remote_side="Category.id")
    children: Mapped[List["Category"]] = relationship("Category", back_populates="parent")
    products: Mapped[List["Product"]] = relationship(back_populates="category")
    filter_configs: Mapped[List["CategoryFilterConfig"]] = relationship(back_populates="category", cascade="all, delete-orphan")


class CategoryFilterConfig(Base):
    """Associates which attributes are filterable for a given category."""
    __tablename__ = "category_filter_configs"
    __table_args__ = (UniqueConstraint("category_id", "attribute_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    attribute_id: Mapped[str] = mapped_column(ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category: Mapped["Category"] = relationship(back_populates="filter_configs")
    attribute: Mapped["ProductAttribute"] = relationship()


# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — ATTRIBUTES
# ══════════════════════════════════════════════════════════════════════════════

class ProductAttribute(Base, TimestampMixin):
    """Defines a filterable/searchable product attribute (e.g. screen_size, orientation)."""
    __tablename__ = "product_attributes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    data_type: Mapped[AttributeDataType] = mapped_column(
        Enum(AttributeDataType), default=AttributeDataType.select, nullable=False
    )
    filter_type: Mapped[FilterType] = mapped_column(
        Enum(FilterType), default=FilterType.checkbox, nullable=False
    )
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_searchable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_customer_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    options: Mapped[List["AttributeOption"]] = relationship(back_populates="attribute", cascade="all, delete-orphan")
    product_values: Mapped[List["ProductAttributeValue"]] = relationship(back_populates="attribute", cascade="all, delete-orphan")


class AttributeOption(Base):
    __tablename__ = "attribute_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    attribute_id: Mapped[str] = mapped_column(ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(200), nullable=False)
    display_label: Mapped[Optional[str]] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    attribute: Mapped["ProductAttribute"] = relationship(back_populates="options")

    __table_args__ = (UniqueConstraint("attribute_id", "value"),)


# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — PRODUCTS
# ══════════════════════════════════════════════════════════════════════════════

class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    model: Mapped[Optional[str]] = mapped_column(String(100))
    blurb: Mapped[Optional[str]] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text)
    kind: Mapped[ProductKind] = mapped_column(
        Enum(ProductKind), default=ProductKind.standard, nullable=False
    )
    category_id: Mapped[Optional[str]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), index=True)
    # Base price stored in paise (integer). NULL = quote-only.
    base_price_paise: Mapped[Optional[int]] = mapped_column(Integer)
    gst_rate: Mapped[int] = mapped_column(Integer, default=18, nullable=False)
    is_customizable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    minimum_order_qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus), default=PublishStatus.draft, nullable=False, index=True
    )
    seo_title: Mapped[Optional[str]] = mapped_column(String(200))
    seo_description: Mapped[Optional[str]] = mapped_column(Text)
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 3))
    warranty_info: Mapped[Optional[str]] = mapped_column(Text)
    shipping_info: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    category: Mapped[Optional["Category"]] = relationship(back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    variants: Mapped[List["ProductVariant"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    attribute_values: Mapped[List["ProductAttributeValue"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    specs: Mapped[List["ProductSpec"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    customization_profile: Mapped[Optional["CustomizationProfile"]] = relationship(back_populates="product", uselist=False)
    inventory: Mapped[Optional["Inventory"]] = relationship(back_populates="product", uselist=False)
    wishlist_items: Mapped[List["WishlistItem"]] = relationship(back_populates="product")
    related_products: Mapped[List["RelatedProduct"]] = relationship(
        "RelatedProduct", foreign_keys="RelatedProduct.product_id", back_populates="product", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_products_status_category", "status", "category_id"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[Optional[str]] = mapped_column(String(300))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="images")


class ProductSpec(Base):
    """Key-value spec rows (e.g. RAM → 1 GB)."""
    __tablename__ = "product_specs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="specs")


class ProductAttributeValue(Base):
    """Associates attribute options with products."""
    __tablename__ = "product_attribute_values"
    __table_args__ = (UniqueConstraint("product_id", "attribute_id", "value"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute_id: Mapped[str] = mapped_column(ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(300), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="attribute_values")
    attribute: Mapped["ProductAttribute"] = relationship(back_populates="product_values")


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    # Price delta in paise (can be negative). NULL = same as product base price.
    price_delta_paise: Mapped[Optional[int]] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    attributes: Mapped[Optional[str]] = mapped_column(Text)  # JSON string of {attr_key: value}

    product: Mapped["Product"] = relationship(back_populates="variants")


class RelatedProduct(Base):
    __tablename__ = "related_products"
    __table_args__ = (UniqueConstraint("product_id", "related_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    related_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship("Product", foreign_keys=[product_id], back_populates="related_products")
    related: Mapped["Product"] = relationship("Product", foreign_keys=[related_id])


class VariantOptionSet(Base, TimestampMixin):
    """Option sets customers choose from on a product page, grouped by category or product."""
    __tablename__ = "variant_option_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    applies_to_category: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    values_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    style: Mapped[str] = mapped_column(String(50), nullable=False, default="buttons")
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# ══════════════════════════════════════════════════════════════════════════════
# CATALOGUE — CUSTOMIZATION PROFILES
# ══════════════════════════════════════════════════════════════════════════════

class CustomizationProfile(Base, TimestampMixin):
    __tablename__ = "customization_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    supports_front: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supports_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus), default=PublishStatus.draft, nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="customization_profile")
    fields: Mapped[List["CustomizationField"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", order_by="CustomizationField.display_order"
    )


class CustomizationField(Base):
    __tablename__ = "customization_fields"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    profile_id: Mapped[str] = mapped_column(ForeignKey("customization_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    field_type: Mapped[FieldType] = mapped_column(Enum(FieldType), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_value: Mapped[Optional[str]] = mapped_column(String(500))
    allowed_values: Mapped[Optional[str]] = mapped_column(Text)  # JSON list
    min_length: Mapped[Optional[int]] = mapped_column(Integer)
    max_length: Mapped[Optional[int]] = mapped_column(Integer)
    min_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    max_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    allowed_mime_types: Mapped[Optional[str]] = mapped_column(String(500))  # comma-separated
    max_file_size_mb: Mapped[Optional[int]] = mapped_column(Integer)
    affects_price: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_delta_paise: Mapped[Optional[int]] = mapped_column(Integer)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    visibility_rule: Mapped[Optional[str]] = mapped_column(Text)  # JSON rule

    profile: Mapped["CustomizationProfile"] = relationship(back_populates="fields")

    __table_args__ = (UniqueConstraint("profile_id", "key"),)


# ══════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ══════════════════════════════════════════════════════════════════════════════

class Inventory(Base, TimestampMixin):
    __tablename__ = "inventory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    track_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="inventory")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_qty_positive"),
        CheckConstraint("reserved >= 0", name="ck_inventory_reserved_positive"),
    )


# ══════════════════════════════════════════════════════════════════════════════
# COMMERCE — COUPONS
# ══════════════════════════════════════════════════════════════════════════════

class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    discount_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    discount_fixed_paise: Mapped[Optional[int]] = mapped_column(Integer)
    min_order_paise: Mapped[Optional[int]] = mapped_column(Integer)
    max_discount_paise: Mapped[Optional[int]] = mapped_column(Integer)
    max_uses: Mapped[Optional[int]] = mapped_column(Integer)
    uses_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_from: Mapped[Optional[str]] = mapped_column(String(50))
    valid_until: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(discount_percent IS NOT NULL) != (discount_fixed_paise IS NOT NULL)",
            name="ck_coupon_one_discount_type",
        ),
    )


# ══════════════════════════════════════════════════════════════════════════════
# COMMERCE — ORDERS
# ══════════════════════════════════════════════════════════════════════════════

class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    reference: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)

    # Customer snapshot (denormalised for historical accuracy)
    customer_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), default="", nullable=False)

    # Address snapshots
    billing_address: Mapped[str] = mapped_column(Text, default="{}", nullable=False)  # JSON
    shipping_address: Mapped[Optional[str]] = mapped_column(Text)       # JSON

    # Financial snapshot (all in paise)
    subtotal_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    gst_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    total_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    gst_rate: Mapped[int] = mapped_column(Integer, default=18, nullable=False)
    coupon_code: Mapped[Optional[str]] = mapped_column(String(50))

    # Business details
    company_name: Mapped[Optional[str]] = mapped_column(String(200))
    gstin: Mapped[Optional[str]] = mapped_column(String(20))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.pending_payment, nullable=False, index=True
    )
    tracking_token: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    shipment_info: Mapped[Optional[str]] = mapped_column(Text)  # JSON

    user: Mapped[Optional["User"]] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[List["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    status_history: Mapped[List["OrderStatusHistory"]] = relationship(back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orders_status_created", "status", "created_at"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)

    # Product snapshot — immutable after order creation
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    product_name: Mapped[str] = mapped_column(String(300), nullable=False)
    product_sku: Mapped[str] = mapped_column(String(100), nullable=False)
    variant_id: Mapped[Optional[str]] = mapped_column(ForeignKey("product_variants.id", ondelete="SET NULL"))
    variant_name: Mapped[Optional[str]] = mapped_column(String(200))

    # Configuration snapshot (JSON)
    configuration: Mapped[Optional[str]] = mapped_column(Text)
    artwork_url: Mapped[Optional[str]] = mapped_column(String(500))

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    total_paise: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    changed_at: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[str]] = mapped_column(String(200))

    order: Mapped["Order"] = relationship(back_populates="status_history")


# ══════════════════════════════════════════════════════════════════════════════
# COMMERCE — PAYMENTS
# ══════════════════════════════════════════════════════════════════════════════

class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(300))
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.created, nullable=False, index=True
    )
    method: Mapped[Optional[str]] = mapped_column(String(100))
    error_code: Mapped[Optional[str]] = mapped_column(String(100))
    error_description: Mapped[Optional[str]] = mapped_column(Text)

    order: Mapped["Order"] = relationship(back_populates="payments")
    webhook_events: Mapped[List["PaymentWebhookEvent"]] = relationship(back_populates="payment", cascade="all, delete-orphan")


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    payment_id: Mapped[Optional[str]] = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"))
    razorpay_event_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    processed_at: Mapped[str] = mapped_column(String(50), nullable=False)

    payment: Mapped[Optional["Payment"]] = relationship(back_populates="webhook_events")


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMER SERVICES
# ══════════════════════════════════════════════════════════════════════════════

class WishlistItem(Base, TimestampMixin):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="wishlist_items")
    product: Mapped["Product"] = relationship(back_populates="wishlist_items")


class ArtworkUpload(Base, TimestampMixin):
    __tablename__ = "artwork_uploads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    original_filename: Mapped[str] = mapped_column(String(300), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(300), nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), default="artwork", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ready", nullable=False)


class QuoteRequest(Base, TimestampMixin):
    __tablename__ = "quote_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    reference: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    business_name: Mapped[Optional[str]] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[Optional[str]] = mapped_column(String(100))
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    product_snapshot: Mapped[Optional[str]] = mapped_column(Text)  # JSON snapshot
    configuration: Mapped[Optional[str]] = mapped_column(Text)     # JSON
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    artwork_url: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus), default=QuoteStatus.submitted, nullable=False, index=True
    )
    admin_notes: Mapped[Optional[str]] = mapped_column(Text)
    quoted_amount_paise: Mapped[Optional[int]] = mapped_column(Integer)
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[Optional["User"]] = relationship(back_populates="quote_requests")


# ══════════════════════════════════════════════════════════════════════════════
# CMS
# ══════════════════════════════════════════════════════════════════════════════

class HomepageSection(Base, TimestampMixin):
    __tablename__ = "homepage_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    section_key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    title: Mapped[Optional[str]] = mapped_column(String(300))
    subtitle: Mapped[Optional[str]] = mapped_column(Text)
    content: Mapped[Optional[str]] = mapped_column(Text)  # JSON or plain text
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    cta_label: Mapped[Optional[str]] = mapped_column(String(100))
    cta_url: Mapped[Optional[str]] = mapped_column(String(300))
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus), default=PublishStatus.published, nullable=False
    )


class ContentPage(Base, TimestampMixin):
    __tablename__ = "content_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text)
    seo_title: Mapped[Optional[str]] = mapped_column(String(200))
    seo_description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus), default=PublishStatus.draft, nullable=False
    )


class NavigationItem(Base):
    __tablename__ = "navigation_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(300), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("navigation_items.id", ondelete="CASCADE"))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    opens_in_new_tab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    parent: Mapped[Optional["NavigationItem"]] = relationship("NavigationItem", remote_side="NavigationItem.id")
    children: Mapped[List["NavigationItem"]] = relationship("NavigationItem", back_populates="parent")


class Faq(Base, TimestampMixin):
    __tablename__ = "faqs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Testimonial(Base, TimestampMixin):
    __tablename__ = "testimonials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    author_name: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(200))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ClientLogo(Base, TimestampMixin):
    __tablename__ = "client_logos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    website_url: Mapped[Optional[str]] = mapped_column(String(300))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class GalleryItem(Base, TimestampMixin):
    __tablename__ = "gallery_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[Optional[str]] = mapped_column(String(300))
    media_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    media_type: Mapped[str] = mapped_column(String(20), default="image", nullable=False)  # image | video | instagram
    placement: Mapped[str] = mapped_column(String(20), default="both", nullable=False)  # both | gallery | homepage
    caption: Mapped[Optional[str]] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def cat(self) -> str:
        if self.caption:
            try:
                data = json.loads(self.caption)
                if isinstance(data, dict):
                    return data.get("cat", "Installations")
            except Exception:
                return self.caption
        return "Installations"

    @property
    def prod(self) -> str:
        if self.caption:
            try:
                data = json.loads(self.caption)
                if isinstance(data, dict):
                    return data.get("prod", "")
            except Exception:
                pass
        return ""

    @property
    def embed_url(self) -> Optional[str]:
        if self.media_type == "instagram" and self.media_url:
            match = re.search(r"\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)", self.media_url)
            if match:
                return f"https://www.instagram.com/p/{match.group(1)}/embed/"
        return None


class IndustryShowcase(Base, TimestampMixin):
    __tablename__ = "industry_showcases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SeoMeta(Base, TimestampMixin):
    __tablename__ = "seo_meta"
    __table_args__ = (UniqueConstraint("resource_type", "resource_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    og_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    canonical_url: Mapped[Optional[str]] = mapped_column(String(300))
    noindex: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class MediaAsset(Base, TimestampMixin):
    __tablename__ = "media_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="image/jpeg", nullable=False)
    media_type: Mapped[str] = mapped_column(String(20), default="image", nullable=False)  # image | video
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dimensions: Mapped[Optional[str]] = mapped_column(String(50))
    title: Mapped[Optional[str]] = mapped_column(String(300))
    alt_text: Mapped[Optional[str]] = mapped_column(String(300))
    tags: Mapped[Optional[str]] = mapped_column(String(500))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ══════════════════════════════════════════════════════════════════════════════
# ADMINISTRATION
# ══════════════════════════════════════════════════════════════════════════════

class WebsiteSetting(Base, TimestampMixin):
    __tablename__ = "website_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    value: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(String(500))
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(36))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    user: Mapped["User"] = relationship(back_populates="notifications")


class AdminDevice(Base, TimestampMixin):
    __tablename__ = "admin_devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_token: Mapped[str] = mapped_column(String(500), nullable=False, unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(50), default="android", nullable=False)  # android | ios | web | windows | macos
    device_name: Mapped[Optional[str]] = mapped_column(String(200))
    app_version: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_seen_at: Mapped[Optional[str]] = mapped_column(String(50))

    user: Mapped["User"] = relationship()


class NotificationDelivery(Base, TimestampMixin):
    __tablename__ = "notification_deliveries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)  # email | push | in_app
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="delivered", nullable=False)  # delivered | failed | queued
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    device_id: Mapped[Optional[str]] = mapped_column(ForeignKey("admin_devices.id", ondelete="SET NULL"), nullable=True)

    device: Mapped[Optional["AdminDevice"]] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    actor_email: Mapped[Optional[str]] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(100))
    resource_id: Mapped[Optional[str]] = mapped_column(String(36))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    occurred_at: Mapped[str] = mapped_column(String(50), nullable=False)

    actor: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")


# ══════════════════════════════════════════════════════════════════════════════
# COMMERCE — CART & CART ITEMS
# ══════════════════════════════════════════════════════════════════════════════

class Cart(Base, TimestampMixin):
    __tablename__ = "carts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    coupon_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    items: Mapped[List["CartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan")
    user: Mapped[Optional["User"]] = relationship()


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    cart_id: Mapped[str] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id: Mapped[Optional[str]] = mapped_column(ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    options: Mapped[Optional[str]] = mapped_column(Text)  # JSON-encoded customization choices
    artwork_upload_id: Mapped[Optional[str]] = mapped_column(ForeignKey("artwork_uploads.id", ondelete="SET NULL"), nullable=True)

    cart: Mapped["Cart"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    variant: Mapped[Optional["ProductVariant"]] = relationship()
    artwork_upload: Mapped[Optional["ArtworkUpload"]] = relationship()


# ══════════════════════════════════════════════════════════════════════════════
# REVIEWS & SOCIAL PROOF
# ══════════════════════════════════════════════════════════════════════════════

class ProductReview(Base, TimestampMixin):
    __tablename__ = "product_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    author_name: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(200))
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)  # pending | published | rejected
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    product: Mapped["Product"] = relationship()
    user: Mapped[Optional["User"]] = relationship()
