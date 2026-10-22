# DisplayDelight V3 — API Contract & Architecture Notes

> **API Version:** 1.0.0 (`/api/v1`)  
> **Backend Framework:** FastAPI (Python 3.11+)  
> **Database:** PostgreSQL (Production) / SQLite with ACID isolation (Dev/Test)  
> **Specification Compliance:** `docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md` (Version 3.1)

---

## 1. Unified Architecture & Standards

All clients (Customer Storefront, Web Admin Control Center, and Flutter Companion Apps) share the same versioned REST API.

- **Base URL:** `/api/v1`
- **Response Format:** Uniform JSON envelopes with ISO 8601 UTC timestamps.
- **Monetary Unit:** Integer **paise** ($1\text{ INR} = 100\text{ paise}$).
- **Tax Calculation:** Server-enforced 18% GST ($0.18 \times \text{taxable amount}$).
- **Security Headers:** HSTS, CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`).
- **Traceability:** `X-Request-ID` and `X-Process-Time` attached to every response.

---

## 2. Authentication & Role-Based Access Control (RBAC)

### 2.1 Public & Customer Auth
- `POST /api/v1/auth/register` — Customer account creation.
- `POST /api/v1/auth/login` — Returns JWT `access_token` and HTTP-only refresh token.
- `POST /api/v1/auth/refresh` — Refresh expired JWT access tokens.
- `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password` — Secure email-based reset without token logging.

### 2.2 Admin RBAC
- Roles: `super_admin`, `catalog_manager`, `order_manager`, `support_rep`.
- Dependencies: `require_admin`, `require_super_admin`, `get_current_active_user`.
- Audit Logging: All mutations logged in `audit_logs` with actor email, IP address, and changed fields.

---

## 3. Storefront Catalogue & Customization Engine

### 3.1 Products & Categories
- `GET /api/v1/products` — Paginated catalogue with server-driven facets (`min_price`, `max_price`, `category_id`, `search`, `attributes`).
- `GET /api/v1/products/{id_or_slug}` — Full product details, variants, specifications, warranty, and customization profiles.
- `GET /api/v1/categories` — Nested category hierarchy with slug mappings.
- `GET /api/v1/categories/{id_or_slug}/filters` — Category-aware filter configurations.

### 3.2 Product Customization Builder
- `GET /api/v1/admin/customization/profiles` — List admin-defined profiles.
- `POST /api/v1/admin/customization/profiles` — Create new customization schema with conditioned fields.
- `GET /api/v1/admin/customization/profiles/{id}` — Inspect profile details, fields, option price deltas, and conditional visibility rules.
- `PUT /api/v1/admin/customization/profiles/{id}` — Update profile fields and unbind prior products (enforcing 1-to-1 association).
- `POST /api/v1/cart/price` — Storefront ad-hoc pricing engine calculating authoritative option price deltas in paise.

---

## 4. V3 Payment-First Checkout Sequence

### 4.1 Flow Specification (V3 §1.4 & §9.4)
```text
1. Cart snapshot created on server
2. POST /api/v1/checkout -> Validates stock & price, creates Razorpay Order, status: 'pending_payment'
3. Customer authorizes payment through Razorpay modal
4. POST /api/v1/payments/verify -> HMAC-SHA256 signature verification
   - If contact details exist -> Order status: 'paid'
   - If contact details missing -> Order status: 'paid_details_pending'
5. POST /api/v1/orders/{ref}/customer-details -> Record name, phone, address, GSTIN -> Order status: 'paid'
6. Background notification worker dispatches confirmation email & companion push
```

### 4.2 Endpoints
- `POST /api/v1/checkout` — Initiates server-authoritative checkout session.
- `POST /api/v1/payments/verify` — Client payment verification callback.
- `POST /api/v1/payments/webhooks/razorpay` — Authoritative server-to-server webhook receiver with HMAC-SHA256 validation and idempotency table `payment_webhook_events`.
- `GET /api/v1/orders/{ref}/status` — Polling status endpoint.
- `GET /api/v1/orders/{ref}/details-pending` — Check whether post-payment details are required.
- `POST /api/v1/orders/{ref}/customer-details` — Customer submits shipping/billing address post-payment.
- `POST /api/v1/orders/track` — Public order tracking by reference and email.

---

## 5. Customer Reviews & Verified Purchase System

- `POST /api/v1/products/{id}/reviews` — Submit customer review. Backend automatically checks actual order history (`Order.status.in_([paid, processing, shipped, delivered])`) to set `is_verified_purchase: true`. New reviews enter `status: 'pending'`.
- `GET /api/v1/products/{id}/reviews` — Public listings return only `status: 'published'` reviews.
- `GET /api/v1/admin/reviews` — Admin moderation queue with status filter (`all`, `pending`, `published`, `rejected`).
- `PATCH /api/v1/admin/reviews/{id}` — Admin approve/publish or reject review.
- `DELETE /api/v1/admin/reviews/{id}` — Permanently delete review.

---

## 6. Companion Devices & Push Notification System

- `POST /api/v1/admin/devices/register` — Registers companion device tokens (`android`, `ios`, `web`, `windows`, `macos`).
- `GET /api/v1/admin/devices` — Lists registered devices with platform badge, last active time, and status.
- `POST /api/v1/admin/devices/{id}/deactivate` — Deactivates companion device.
- `DELETE /api/v1/admin/devices/{id}` — Deletes companion device.
- `POST /api/v1/admin/notifications/test-push` — Dispatches test push alert to companion devices and logs to `notification_deliveries`.
- `GET /api/v1/admin/notifications/deliveries` — Delivery audit ledger.
- `GET /api/v1/admin/notifications/unread-count` — Current unread notification counter.

---

## 7. Media & Social Media Embed Policy

- `POST /api/v1/admin/content/validate-instagram` — Validates Instagram Post/Reel links using `INSTAGRAM_URL_REGEX` and returns permitted embed URLs (`/p/{shortcode}/embed/`). Scraping or downloading unauthorized videos is strictly prohibited.
- `POST /api/v1/admin/media/upload` — Validated media uploads to Cloudflare R2 / durable server storage.
