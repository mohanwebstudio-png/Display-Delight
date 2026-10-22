# DisplayDelight V2 — Backend Guidance

The front end in this repo is a prototype. All prices, totals, GST, shipping, coupons, stock, order status and payment status shown in it are **sample values or client-side stand-ins**. The server must be the single source of truth for each of them.

## 1. Recommended architecture

| Concern | Recommendation |
|---|---|
| API | REST (JSON) over HTTPS, versioned `/api/v1`. NestJS, Express/Fastify, Django or Laravel are all fine. |
| Database | PostgreSQL. Use JSONB for attribute values and customization schemas. |
| Cache / queues | Redis for sessions, rate limits and BullMQ (or equivalent) for email, WhatsApp, image processing and webhook retries. |
| Object storage | Cloudflare R2 (S3 API). Public bucket for catalogue media. **Private** bucket for customer artwork. |
| Payments | Razorpay Orders + Checkout, with server-side signature and webhook verification. |
| Email | Transactional provider (SES, Postmark, Resend) with templates stored in the DB. |
| Auth | Customers: email + password (argon2id) or OTP, httpOnly session cookie. Admin: separate login, mandatory MFA recommended, short-lived JWT or session, RBAC. |
| Hosting | Front end as static build on a CDN. API on a container platform. Managed Postgres with daily backups and point-in-time recovery. |

## 2. Core entities

Every table: `id (uuid)`, `created_at`, `updated_at`; soft delete (`deleted_at`) on catalogue and content.

**Catalogue**
- `categories` (id, parent_id, slug, name, description, image_id, sort, is_active, seo_*)
- `products` (id, sku, slug, name, category_id, kind `digital|custom|standard`, short_desc, long_desc, status `draft|published|archived`, base_price_paise nullable, price_mode `fixed|from|on_request`, gst_rate, hsn_code, customization_profile_id nullable, seo_*)
- `product_media` (product_id, media_id, sort, alt)
- `attributes` (id, key, label, type `text|number|enum|bool`, is_filterable, filter_ui `checkbox|radio|range`, unit)
- `category_attributes` (category_id, attribute_id, sort, is_visible_in_filter) — **this table drives the shop sidebar**, so adding a filter needs no front-end change.
- `product_attribute_values` (product_id, attribute_id, value jsonb)
- `variants` (id, product_id, sku, options jsonb, price_paise nullable, is_active)
- `inventory` (variant_id or product_id, quantity, reserved, track boolean). Show availability only if `track = true`.
- `customization_profiles` (id, name, schema jsonb, version) — see section 4.

**Commerce**
- `customers`, `addresses`, `wishlists`, `compare_lists` (optional server sync)
- `carts`, `cart_lines` (product_id, variant_id, qty, options jsonb, artwork_id nullable)
- `orders` (id, number, customer_id, status, payment_status, currency, subtotal, discount, tax, shipping, total, billing, shipping_address, gstin, notes, coupon_id, razorpay_order_id)
- `order_lines` (snapshot of name, sku, price, options, artwork_id — **never** read live product data for history)
- `order_events` (order_id, type, note, actor, created_at) — the only source for the tracking timeline
- `payments` (order_id, razorpay_payment_id, status, method, amount, raw jsonb, verified_at)
- `coupons`, `coupon_redemptions`, `quotes` (+ `quote_lines`, `quote_messages`)

**Content / CMS**
- `pages`, `navigation_items`, `homepage_sections` (type, config jsonb, sort, is_visible), `gallery_items`, `client_logos`, `industries`, `faqs`, `testimonials` (**only with `approved_at`**), `policies`, `seo_entries`, `media` (key, mime, size, width, height, alt, visibility)
- `settings` (key, value, is_secret) — secrets encrypted at rest, **never** returned by the API (return `"••••last4"` only)

**Admin / ops**
- `admin_users`, `roles`, `permissions`, `role_permissions`, `audit_logs` (actor, action, entity, entity_id, diff jsonb, ip, at), `notifications`

## 3. Endpoint outline

Public (no auth, cacheable): `GET /categories`, `/categories/:slug/filters`, `/products` (query = filter keys + `sort`, `page`, `q`, `min`, `max`), `/products/:slug`, `/search/suggest?q=`, `/home`, `/pages/:slug`, `/gallery`, `/faqs`, `/policies/:slug`.

Customer (session): `POST /auth/register|login|logout|forgot|reset|verify-email`, `GET/PATCH /me`, `/me/addresses`, `/me/orders`, `/me/orders/:number`, `/me/quotes`, `/me/wishlist`.

Cart and checkout: `GET/POST/PATCH/DELETE /cart`, **`POST /cart/price`** (returns authoritative totals), `POST /cart/coupon`, `POST /checkout` (creates order in `pending_payment` and a Razorpay order), `GET /orders/:number/status` (polled by the payment-status page), `POST /track` (order number + email/phone).

Uploads: `POST /uploads/sign` (returns a presigned PUT for a private key), `POST /uploads/:id/complete`.

Enquiries: `POST /quotes`, `POST /contact`.

Webhooks: `POST /webhooks/razorpay`.

Admin (`/admin/api/v1`, RBAC per route): full CRUD for every entity above, plus `PATCH /orders/:id/status`, `POST /orders/:id/events`, `POST /media`, `PUT /settings/:group`, `GET /audit-logs`. **There is no bulk-order resource.**

## 4. Product customization builder

Store a JSON schema per profile. The studio and the admin builder both render from it.

```json
{
  "version": 3,
  "fields": [
    { "key": "text", "type": "text", "label": "Brand text", "max": 40, "required": false },
    { "key": "font", "type": "enum", "options": ["Barlow Condensed", "Inter"] },
    { "key": "color", "type": "color", "palette": ["#FFFFFF", "#E84B1A"] },
    { "key": "artwork", "type": "file", "formats": ["png", "jpg", "svg", "pdf"], "maxBytes": 8388608, "minDpi": 150 },
    { "key": "size", "type": "enum", "source": "variants" }
  ],
  "rules": [{ "if": { "field": "size", "eq": "A1" }, "then": { "show": "notes" } }],
  "pricing": [{ "field": "size", "map": { "A3": 0, "A2": 120000 } }]
}
```

The server validates submitted options against the **profile version stored on the cart line**. Reject unknown keys and out-of-range values.

## 5. Pricing pipeline (authoritative)

1. Load product/variant base price from the DB. Ignore any price sent by the client.
2. Add option surcharges from the customization profile `pricing` rules.
3. Multiply by quantity, then apply quantity tiers if configured.
4. Validate and apply the coupon (active window, usage limits, min subtotal, category scope). Return a machine-readable error code when invalid.
5. Compute GST per line from `gst_rate`. Use CGST+SGST when the shipping state equals the business state, otherwise IGST.
6. Add shipping from admin-configured zones/rules. If no rule matches, return `shipping: null` and require a quote. Do not default to "free".
7. Round once per line in **paise (integers)**. Never use floats for money.
8. Return a signed `price_token` valid for a few minutes. `POST /checkout` must recompute and reject on mismatch.

Items with `price_mode = on_request` are excluded from totals and flagged `quote_required: true`.

## 6. Razorpay flow

1. `POST /checkout` validates the cart, recomputes the price, creates `orders` (`pending_payment`), then calls Razorpay `orders.create` with `amount` in paise and `receipt = order.number`. Return `{ order_number, razorpay_order_id, key_id }`. Only the **public** key id is ever sent to the browser.
2. The browser opens Razorpay Checkout. The client callback is **not** proof of payment. It only redirects to `/payment/processing?order=…`.
3. **Webhook** `payment.captured` / `payment.failed` / `order.paid`:
   - Verify `X-Razorpay-Signature` = HMAC-SHA256(raw body, webhook secret) using a constant-time compare. Use the raw bytes, not re-serialised JSON.
   - Make handling idempotent on `event.id` / `payment.id`.
   - Check that `amount` and `currency` equal the order. Then set `payment_status = paid`, write an `order_events` row, enqueue emails and notifications.
4. Also verify the client callback signature (`order_id|payment_id`) server-side for faster UX. The webhook remains authoritative.
5. The status page polls `GET /orders/:number/status`. It renders **success only** when the server reports `paid`. Map `created/attempted` to *processing*, bank-pending to *pending*, `failed` to *failed*, a dismissed modal to *cancelled*, and timeouts to *interrupted*.
6. Run a reconciliation job that fetches Razorpay payments for orders stuck in `pending_payment` for more than 15 minutes.
7. Refunds are admin-initiated through the Razorpay API and recorded in `payments`.

## 7. Uploads and Cloudflare R2

- **Customer artwork** goes in a private bucket under `artwork/{customer|session}/{uuid}/{filename}`. The browser never receives a permanent URL. The API issues short-lived (5–15 min) signed GET URLs only to the owner, and to admins with `orders.read`.
- Flow: `POST /uploads/sign` validates mime, extension and size against the profile, then returns a presigned PUT. After upload the client calls `/complete`. The server re-checks magic bytes and size with `HEAD`, scans with ClamAV (queue), strips EXIF and generates a preview thumbnail. Status moves `uploading → scanning → ready | rejected`.
- Reject SVGs containing scripts (sanitise or rasterise). Never serve user files from your app origin.
- **Catalogue media** goes in a public bucket behind a CDN. Generate responsive sizes (320/640/1024/1600, WebP/AVIF) on upload.
- Credentials (account id, access key, secret) live in environment variables or a secret manager. The settings UI stores and shows them masked only.

## 8. Notifications

- Event → template mapping: order placed, payment confirmed/failed, order status change, quote received, quote replied, password reset, email verification, contact form.
- Channels: email (required), WhatsApp Business API (optional, template messages only), in-app admin notifications.
- Send from a queue with retries and dead-letter handling. Log each attempt.
- Do not promise response times in templates. Quote emails should say the team will reply using the contact details provided.

## 9. Security checklist

- Hash passwords with argon2id. Rate-limit login, OTP, forgot-password, coupon and track-order endpoints. Use generic error messages to avoid account enumeration.
- CSRF protection on cookie-authenticated routes (SameSite=Lax plus a token). Strict CORS allow-list.
- Validate every request with a schema (zod/class-validator). Use parameterised queries only.
- Authorisation on every object (`order.customer_id === session.user`). The track-order endpoint requires order number **and** email or phone.
- Admin: RBAC, MFA, IP/audit logging, no shared accounts. Write an `audit_logs` row for every mutation.
- Secrets never in the front-end bundle or in API responses. Mask in logs. Rotate on staff change.
- Security headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- Sanitise any admin-authored HTML (policies, pages) on save **and** on render.
- Pin dependencies, run `audit` in CI, enable automated backups and test restores.
- GDPR/DPDP: data export and deletion path, consent for marketing email, retention policy for artwork.

## 10. Content-integrity rules to enforce server-side

- Do not seed or render ratings, review counts, stock numbers, discount percentages, "free shipping", delivery promises, warranty text, certifications, client logos or statistics unless an admin has entered and published them.
- `original_price` may be returned only when greater than `price` and set by an admin.
- Testimonials and client logos require an explicit `approved` flag.
- Mark placeholder rows `is_placeholder = true` so the UI can label them until replaced.

## 11. Deployment

- Environments: local, staging, production, each with its own Razorpay keys (test and live), R2 buckets and database.
- CI: lint, typecheck, tests, migrations dry run. Deploy with migrations run before the new version takes traffic.
- Observability: structured logs with a request id, error tracking (Sentry), uptime checks on `/health`, alerts for webhook failures and queue backlog.
- Run `POST /webhooks/razorpay` behind a stable public URL with no auth middleware other than signature verification.
- Seed script: categories, attribute definitions, filter mappings and the initial catalogue. Seed **no** fake reviews, stock or client data.

## 12. Build order

1. Auth, RBAC, settings, media and R2 signing.
2. Categories, attributes, products, variants, filters API.
3. Customization profiles and validation.
4. Cart, pricing pipeline, coupons.
5. Checkout, Razorpay, webhook, order events, emails.
6. Account, quotes, track order.
7. CMS: homepage sections, navigation, gallery, FAQs, policies, SEO.
8. Notifications, audit log, reports, hardening.
