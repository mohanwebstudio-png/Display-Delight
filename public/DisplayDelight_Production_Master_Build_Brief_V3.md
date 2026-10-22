# DisplayDelight V3 — Greenfield Production E-commerce Platform & Cross-Platform Admin App

**Single Master Build Brief, PRD, TRD, UX Specification, and AI Implementation Prompts**  
**Version:** 3.1 — Greenfield Build Specification, updated 19 October 2026  
**Business:** DisplayDelight — Digital Signage and Customizable Display Products  
**Domain:** `displaydelight.com` (planned)  
**Launch market:** India; prices in INR  
**Primary build tool:** Antigravity or another repository-aware AI coding tool

> **How to use this file:** Treat this as the single source of truth for a **new DisplayDelight V3 application**. Create a new repository/workspace and new application from scratch; place this file at `/docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md`. The supplied prior documents, catalogue, logo and prompts are reference material for requirements and business data, not a codebase that must be preserved. Build the new customer storefront, web Admin Panel, shared backend, and Flutter Admin Companion App as one coherent product. Version 3.1 combines the detailed visual design brief with the production backend requirements, V3 responsive/filter/review/authentication/email/media/Instagram/payment-first requirements, and the QA Console. These V3 rules supersede older conflicting checkout instructions. Use the prompts in Part 13 in the new project workspace, implement the application rather than stopping at a plan or design, run tests, report exact results, and do not claim integrations work without evidence.

---

## 1. Product Vision and Non-Negotiable Outcomes

Create a **production-ready e-commerce website inspired by the convenience, search, filtering, product discovery, and checkout clarity of major marketplaces such as Flipkart**, adapted to DisplayDelight's own branding and B2B/retail products. Do not copy another company's logo, page designs, source code, text, or proprietary assets.

The complete platform has three clients sharing one secure backend:

1. **Customer storefront:** Fast, responsive web store for discovering, configuring, purchasing, and tracking DisplayDelight products.
2. **Web admin panel:** Full desktop/tablet-friendly control center for products, configurations, orders, enquiries, website content, settings, and reporting.
3. **Cross-platform Admin Companion App:** A platform-independent app for administrators and authorized staff, built with Flutter, initially targeting Android and iOS. Keep the codebase suitable for Flutter Web, Windows, and macOS builds where needed. It must use the same backend and permissions as the web admin, and provide fast push/in-app notification alerts.

All three clients must use the **same versioned FastAPI API**. Do not duplicate pricing, GST, order, permission, notification, or payment business rules inside a frontend or mobile app.

### 1.1 Required outcomes

- A real commerce system, not a static mockup or prototype.
- Product-specific customization: customers only see the options that apply to the selected product.
- Live or near-live visual customization preview before add-to-cart/quote submission.
- Artwork/logo upload and customer-entered text/name where the selected product supports it.
- Server-authoritative pricing based on product, variant, options, and applicable quantity tier/coupon/tax/shipping rules.
- Secure customer accounts and profile management; browsing is available to guests. Under V3 payment-first checkout, do not require new customer details or account creation before payment; collect required details only after authoritative payment verification and then link/create the account under the approved policy.
- Razorpay payments in INR, with verified server-side payment outcomes and safe retry handling.
- Admin-manageable products, stock, pricing rules, images, content, navigation, coupons, tax, shipping, email/SMTP, WhatsApp details, and ordinary runtime business settings.
- Notification alerts for important order, payment, enquiry, inventory, and integration events, delivered in-app and as mobile push where a device has granted permission.
- Very fast loading, responsive design, loading/skeleton states, optimized images, cacheable public pages, and production performance testing.
- Role-based permissions, admin audit log, protected secrets, backups, monitoring, CI/CD, and staging/production separation.

### 1.2 Important scope correction: no dedicated bulk-order feature

**Do not build a dedicated Bulk Order feature.** No `/bulk-order` page, menu item, customer workflow, bulk-order form, bulk-order-specific admin tab, bulk-order request API, or bulk-order-request database tables. Do not reintroduce it under a different label.

The normal shop/cart/checkout flow can still support buying more than one unit and quantity-based pricing tiers if configured for a product. The separate **Request a Quote** flow remains available for quote-capable products and custom requirements. Do not treat the quote feature as a bulk-order page.

### 1.3 Customer/business context

DisplayDelight sells digital signage and business display products to small businesses and organizations, including cafés, catering businesses, retail/textile showrooms, salons, hospitals, offices, schools, supermarkets, hotels, events, and advertising-related customers. Some visitors may not know technical product terminology, so labels, specifications, help text, and selection steps must be plain and helpful.

Product catalogue starts at approximately 40+ products and should support growth to 100+ without redesigning the data model. Example product families can include digital displays in sizes such as 32", 43", and 55" and tabletop/acrylic signage in supported formats such as A4, A5, A6, A7, or 6×4", but **actual options, availability, pricing, and attributes must come from admin product configuration and approved catalogue data**. Never fabricate real product stock, price, warranty, delivery promise, or technical specifications.

### 1.4 V3 client requirements — precedence and scope

The following V3 requirements define the greenfield application. Where they conflict with an older V2 statement or embedded legacy prompt, this V3 section takes precedence. Existing documents and assets are reference sources; do not assume an existing codebase or database must be preserved.

**Greenfield project, not an upgrade:** create a completely new DisplayDelight V3 application in a new repository/workspace. Use the supplied master brief, PRD/TRD, architecture/workflow diagrams, product catalogue, logo and client requirements as source material, not as a requirement to preserve any prior implementation. Build a clean frontend, backend, database schema, API contract, Admin Panel and companion app. Do not assume old code, APIs, database tables, credentials, or deployments exist.

**Responsive across real viewports:** ensure the complete customer storefront and web admin work on desktop monitors, 14-inch/15-inch/16-inch laptops, tablets, phones, small screens, portrait and landscape orientations. Test content-driven breakpoints at representative widths such as 320, 360, 390, 430, 768, 820, 1024, 1280, 1366, 1440, 1536 and 1920 CSS pixels. Laptop screen inches must not be treated as a CSS breakpoint. No horizontal overflow, clipped navigation, overlapping controls, broken product cards, inaccessible filter drawers or unusable admin tables.

**Homepage conversion priority:** make the homepage distinctly more attractive, premium, modern and product-led. The first viewport should show a confident brand message, real signage/product imagery, clear Shop Products and Request a Quote actions, and immediate pathways into the product catalogue. Add administrator-managed featured products, best-sellers only where supported by real sales data, selected categories with photographs, company introduction, verified client-logo banner, industries/use cases, product/video showcase, gallery preview, genuine reviews/testimonials, FAQs and contact/WhatsApp CTA. Product cards must appear prominently on the homepage. All supported sections must be editable, reorderable, publishable and hideable through admin UI. Do not invent client logos, ratings, discounts or sales claims.

**Product/category filters:** implement a backend-driven faceted filter system rather than static hardcoded filter lists. Include category/subcategory, price range, sizes and dimensions, model/SKU, touch/non-touch, mounting type (wall/floor/A-type/kiosk where applicable), indoor/outdoor, availability, orientation, shape, material/finish, single/double-sided capability, operating system, HDMI, RAM/ROM, brightness and other genuine product attributes where applicable. Each category should only show relevant filters. Admins must manage filterable attributes and category applicability through user-friendly forms. Support multiple filters together, counts where available, active chips, clear-all, sorting, pagination, filter state in the URL and mobile filter drawers. Backend remains authoritative; never fetch the whole catalogue to filter in the browser.

**Source catalogue and product data:** use the supplied DisplayDelight Digital Signage Product Catalogue PDF, client-approved product details, any later files the client provides, and the supplied brand assets. Treat imported records as draft/pending approval if price policy, stock, GST, availability, imagery or product details are uncertain. Preserve separate Dealer Price, MOP and MOP 1 fields where supplied; do not silently choose one as the storefront price. Include product families and actual configurations found in the PDF, including LED Fabric Signage, Premium Ultra Slim Signage, T-Shaped Card Stand, LED Lollipop Board, LED Rotating Lollipop Board, E Series digital displays, and Trueview wall-mount, floor-mount and kiosk products. Extract all pages/rows, not just examples. Never fabricate missing details.

**Customer and admin login/profile:** improve separate customer and administrator login journeys, registration/invitation as appropriate, forgotten-password and secure reset flows, email verification when configured, session-expiry handling, role-based access, and profile management. Customer profile may include name, email, phone and business details, address book, order/quote/review history, and notification/email preferences where supported. Admin profile may include name, email, avatar, phone, role display, password management, notification preferences and last-login metadata if available. No frontend role flags may grant privileges. Admin must not be able to elevate their own role by editing profile fields.

**Email:** connect login/profile flows and business events to the actual backend email service. Support verification and password-reset emails, relevant order/payment emails, admin order and quote notifications, and configurable templates as required. Admin settings should include SMTP host/port, TLS mode, username, password, sender name/email, masked secrets, and a Send Test Email action. Keep secrets server-side and encrypted at rest where stored. Report only actual delivery/submission status supported by the provider.

**V3 payment-first checkout — supersedes the V2 account-before-payment sequence:** the customer should select/configure products, review the cart, receive a server-calculated amount that is fully determinable under approved pricing/tax/shipping rules, pay with Razorpay, and only after the backend verifies successful payment provide the required personal/business/billing/shipping details. Do not demand new customer contact/address data before payment. Existing signed-in customers may be supported, but the V3 flow must not require entering those details before payment. Use a secure server-side payment/checkout session and a durable `PAID_DETAILS_PENDING` (or equivalent) state. After details are submitted, link them to the verified payment/cart snapshot, validate the data, and transition the order safely. Provide a secure resume path if a browser closes after payment. Admin must see paid sessions awaiting customer details. Do not declare order fulfilment-ready until required details are valid. Do not collect surprise additional taxes/shipping charges after payment. If total cannot be determined without address information, flag the missing policy/configuration and block payment rather than inventing the amount. Do not duplicate payments or orders; handle provider callbacks/webhooks idempotently. This V3 payment-first rule explicitly overrides older lines that say an account is required before checkout/payment; the customer account can be linked or created after collecting post-payment details according to the approved account policy.

**Razorpay:** implement a secure new integration in INR. Create payment orders server-side, verify signatures server-side, validate signed webhooks, record event IDs and process idempotently. Browser callbacks alone are not authoritative. Use test mode for tests and never perform real charges in automated testing.

**Reviews:** add customer product reviews with rating, title, body, timestamps, publication/moderation state, and verified-purchase indication only when verified by backend purchase history. Include ratings/review summaries only from real published reviews. Admins with permissions can moderate reviews. Add rate limits, validation, privacy controls, and tests; no fabricated reviews or ratings.

**Cloudflare-first storage with server fallback:** prefer configured Cloudflare services: Cloudflare Images for managed image delivery, Cloudflare Stream for video uploads/transcoding/playback, and Cloudflare R2 for object storage/private assets where appropriate. If the selected Cloudflare service is unavailable or not configured, use approved durable server storage. The server fallback must not be an ephemeral container filesystem unless persistence is guaranteed. Use a storage-provider adapter, persist provider/object metadata, retain media references, expose health/status in admin, and never expose credentials. Do not bypass authorization by falling back after an auth/security error. If neither Cloudflare nor durable fallback is available, fail clearly.

**Video and Instagram content:** admin must be able to upload original product/company videos, edit title/description/thumbnail/order/placement/visibility, and add supported Instagram post/Reel links using permitted embeds/APIs. Do not scrape or download unauthorized social videos. Uploaded originals use the configured video-storage path, preferably Cloudflare Stream when configured. Handle upload progress, processing status, ready/failed states and retries. Support video placement on homepage and gallery with thumbnails, lazy loading and accessible playback.

**Admin-first editing:** all supported website content and configurable business details must be changeable through the new Admin Panel, without source-code changes, manual database editing, or raw JSON editing. Use labelled forms, rich-text editors where appropriate, media pickers/uploaders, drag/reorder controls and previews. This includes homepage sections, content/pages, products, categories, variants, product attributes and filters, client logos, images/videos, navigation/Shop mega menu, contact details, map/social links, product/category/page SEO, reviews, and ordinary settings. Define typed API schemas for the new application and map friendly forms to those APIs. Secure sensitive integration settings and audit changes.

**Shopify Option B (optional, only if separately approved):** keep a modular direct integration between the new DisplayDelight backend and Shopify rather than making Shopify mandatory or migrating the whole application to Shopify. Use Shopify APIs and verified webhooks for explicitly selected product/order/inventory events, with idempotency, sync logs, retry handling, and a declared authority for each data type. Keep Shopify optional; existing DisplayDelight flows must continue when it is disabled. Do not enable or fabricate a live connection without credentials and permission.

**Testing:** create a separate QA/testing application only if approved/needed, and use it to call a configured staging API. A dashboard must report real PASS/FAIL/BLOCKED results, never fabricated results. Test API contracts, product imports, filters, authentication, post-payment customer details, Razorpay test mode, email, review moderation, media provider fallback, responsiveness, and optional Shopify synchronization. Playwright/pytest tests must run against staging/test data, not live production data.

---

## 2. Brand, Visual Design, and UX Direction

### 2.1 Brand tokens

Use the supplied DisplayDelight logo asset from the project assets. Prefer a transparent SVG or PNG version for the real production header if the client can provide one; the supplied JPG can be used temporarily. Do not redraw or change the logo without approval.

| Token | Value | Usage |
|---|---|---|
| Brand orange | `#E84B1A` | Primary CTA, selected states, active links, key accents |
| Orange hover | `#C23A10` | Hover/pressed state |
| Soft orange | `#FFF0EB` | Selected option/card background |
| Dark navy | `#1A1A2E` | Footer, high-contrast sections, admin navigation where suitable |
| White | `#FFFFFF` | Main canvas, product cards |
| Main text | `#212121` | Headings and primary text |
| Secondary text | `#616161` | Explanatory copy and labels |
| Border | `#E0E0E0` | Inputs, card outlines, separators |
| Success | `#2E7D32` | Confirmed, delivered, successful payment |
| Warning | `#F57C00` | Pending, low stock, attention needed |
| Error | `#C62828` | Failed, invalid, unavailable |

Typography: use **Barlow Condensed** for prominent headings and call-to-action labels, and **Inter** for body text, tables, and forms. Self-host or optimize font delivery; use only the required weights. If the selected framework/font packaging changes, preserve equivalent readability and visual style.

### 2.2 Marketplace-inspired UX

- Prominent search, category browsing, product cards, sorting, faceted filters, product comparison, wishlist, and recently viewed products.
- Clear prices, discounts when genuine, stock status, variants, delivery information where available, warranty if defined, and obvious next action.
- Product pages must make size/specification selection easy for non-technical visitors.
- Keep customer-facing labels conversational, short, and clear.
- Avoid excessive animations, clutter, giant autoplay videos, fake countdowns, fake stock counts, fake ratings, or fabricated reviews.
- Use white/light neutral surfaces, deliberate orange CTAs, generous spacing, readable product images, accessible contrast, visible focus states, and responsive layouts.
- Mobile: product images and key purchase controls must remain usable; provide a sticky add-to-cart bar only where it does not cover page content.
- Design for desktop, laptop, tablet, and mobile. Suggested breakpoints are 390px mobile, 768px tablet, 1024–1280px laptop, and 1440px desktop, adjusted to content rather than blindly enforced.

### 2.3 Loading, feedback, and empty states

Implement **useful loading feedback**, not a fake long intro screen:

- A brief DisplayDelight brand splash may appear on first app boot while essential startup work occurs, but it must not add an artificial delay.
- Use route-level loading states, skeleton cards/tables, image placeholders with fixed aspect ratios, button-level pending states, and progress indicators for uploads/payment initiation.
- Do not block the entire storefront while non-critical sections load. Render useful content progressively.
- Prevent layout shifts by reserving image/media space.
- Provide meaningful empty states, retry controls, timeout handling, and error boundaries.
- Prevent spinner loops. Every loading state must terminate in success, an informative error, or an explicit retry option.
- For the Flutter admin app, show a branded startup/loading state only while auth/session/app configuration is resolved, use cached minimal dashboard data when appropriate, and distinguish offline/stale data from fresh data.

### 2.4 Required design system, components, and screen deliverables

Build the design system before laying out every screen. Use reusable components and variants rather than designing each page independently. The design system must include:

- Buttons: primary, secondary, tertiary, text, destructive, loading, disabled, icon-only, and full-width mobile variants.
- Forms: text/password/search/number inputs, text areas, dropdowns, searchable selectors, multi-selects, radio buttons, checkboxes, switches, segmented controls, colour selectors, field help, validation messages, and required/optional indicators.
- Commerce: product cards, category cards, image galleries, price displays, valid discount display, stock/availability badges, variant selectors, quantity controls, product specification tables, filter groups, active-filter chips, price ranges, compare controls, wishlist controls, cart rows, order summaries and status timelines.
- Media: image/video thumbnails, gallery lightbox, drag-and-drop uploader, file validation, upload progress, replacement/removal, processing states, and private asset access affordances.
- Navigation: announcement bar, desktop header, mobile header, mega menu, mobile navigation drawer, breadcrumbs, tabs, pagination and footer patterns.
- Feedback: skeletons, spinners only when useful, toasts, confirmation dialogs, drawers, tooltips, empty states, error panels, retry controls, success panels, warning states, and focus/keyboard states.
- Admin: dashboard metrics, data tables, filtering/sorting/pagination, status badges, page headers, sidebar, profile menu, notification bell/inbox, multi-section forms, rich-text editor, media picker, reordering controls, publish/draft states and confirmation flows.

Organize the design file into named pages/sections: Cover and Overview; Design System; Storefront Desktop; Storefront Tablet/Mobile; Product Customization; Cart and Checkout; Account and Support Pages; Web Admin Panel; Content and Media Management; Prototype Flows and Developer Handoff.

Produce high-fidelity designs for the homepage, shop, category page, search suggestions/results, product detail (standard and configurable), customization studio, artwork upload states, cart, payment-first checkout, payment status/recovery, customer details form after verified payment, order confirmation, login/register/password recovery, profile/address book, orders/tracking, wishlist, compare, quote request/history, about, gallery, contact/map/social links, FAQ/policy templates, and 404/error states. Admin screens must include login/profile, dashboard, product/category/attribute/variant management, customization field builder and preview, orders including paid-details-pending records, customers, quotes, inventory/coupons where enabled, review moderation, homepage/content editor, navigation/mega-menu editor, gallery/video/Instagram management, SEO editor, media library, settings, notifications, users/roles, and audit logs.

Prototype the principal flows with purposeful interactions: homepage → category/shop → product → customization → cart → payment → verified payment → customer details → order completion; product → quote; customer account → orders/wishlist/compare/quotes; admin dashboard → product editor → customization builder → preview/publish; admin content editor → media picker → preview/publish; notification → related authorized record. Every screen must account for default, hover/focus, selected, disabled, loading, validation, error, empty and success states as relevant.

Do not treat a visual prototype as a production backend. If the tool can write code, implement working API-driven behavior; if it is design-only, annotate all API dependencies and make no claim that real payment, authentication, uploads or persistence is already implemented.

---

## 3. Recommended System Architecture

```text
Customer Browser
  └── Cloudflare CDN / WAF / HTTPS
       └── Next.js Storefront ─────────────────────────┐
                                                      │
Admin Browser ── Cloudflare ── Next.js Admin Panel ───┤
                                                      ├── FastAPI REST API /api/v1
Admin Android/iOS (Flutter) ──────────────────────────┤     ├── PostgreSQL (system of record)
                                                      │     ├── Redis (cache, rate limits, job broker)
                                                      │     ├── Background Worker(s)
                                                      │     ├── S3-compatible object storage / Cloudflare R2
                                                      │     ├── Razorpay (payments + signed webhooks)
                                                      │     ├── SMTP/email provider
                                                      │     ├── Firebase Cloud Messaging (push notifications)
                                                      │     └── WhatsApp click-to-chat / analytics
                                                      │
                                                      └── Notification Outbox → Worker → In-app + FCM + Email
```

### 3.1 Technology baseline

**Customer storefront and web admin**
- Next.js App Router, TypeScript, React, Tailwind CSS, and accessible component primitives.
- Use React Server Components/server rendering for public product/content pages by default. Use client components only for genuine interactivity (product configurator, canvas preview, filters, cart controls, forms, push permission controls, admin tables/charts).
- Pin patched dependency versions during implementation. Verify current supported versions and security advisories when scaffolding; do not assume a version mentioned in an old prompt is still supported.

**Backend API**
- Python 3.12+ (or a currently supported stable version at implementation time), FastAPI, Pydantic, SQLAlchemy 2.x, Alembic migrations, async PostgreSQL driver/connection pooling, and OpenAPI documentation.
- Layering: router → validation/schema → application service → domain/business rules → repository → database.
- Isolate payment/email/storage/push integrations behind services/adapters.

**Database and infrastructure**
- PostgreSQL as the authoritative database for users, products, pricing rules, carts, orders, payments, inventory, quotes, notifications, settings, and audit logs.
- Redis for short-lived cache, rate limiting, job queue/broker, and ephemeral state. Never use cache as the source of truth for payments/orders.
- S3-compatible storage such as Cloudflare R2 for product images and private artwork uploads, behind CDN for public optimized assets.
- Cloudflare for DNS/CDN/WAF where selected by the client.
- Background workers for email, push dispatch, media processing, PDF generation, reminder jobs, cleanup, and notification retries.
- Separate local, staging, and production environments, with secrets and databases kept separate.

**Cross-platform Admin Companion App**
- Flutter stable channel with Dart, responsive/adaptive layouts, typed models, a central API client, secure platform storage for session credentials, and push notification handling.
- First supported app deliverables: Android and iOS. Keep the Flutter code and navigation suitable for additional Flutter Web/Windows/macOS builds when required. The web admin panel remains the primary full-featured browser interface.
- Firebase Cloud Messaging (FCM) for mobile push; configure APNs credentials for iOS and platform-specific setup. Web push should only be enabled if Flutter Web is formally included in the supported deployment target and its HTTPS/service-worker requirements are met.

### 3.2 System authority rules

- Browser/mobile clients never connect directly to PostgreSQL or Redis.
- The backend calculates final price, discount, GST, shipping, stock reservation, payment state, and authorization.
- Frontend preview can render selections, but the backend validates selections and returns the authoritative price breakdown.
- Razorpay payment signature verification and webhook handling happen server-side.
- A payment is not considered successful merely because the browser returns from Razorpay.
- Admin web/app clients call the same API and use the same role-based permissions.
- Secrets must never be bundled into frontend JavaScript, mobile binaries, or source control.

---

## 4. Product Catalogue and Product-Specific Customization

Customization is a **product-level capability**, not a global form with every option shown for every item. A product can be non-customizable, partially customizable, or have a fully configurable artwork workflow. Admin controls which fields appear for each product and their order, validation, price impact, and preview behavior.

### 4.1 Product fields

Each product should support:

- Name, slug, SKU/model, category and subcategory, status, short/long description, key benefits.
- Specifications, size/dimensions, weight, warranty, installation/support information where applicable.
- Product type: simple, variant-based, configurable/customizable, or quote-only as business rules allow.
- One or more variants with SKU, option values, stock/availability, weight/dimensions, and pricing.
- Product photos, image alt text, optional demonstration video, related products, and SEO metadata.
- Base price, MRP/reference price when applicable, tax class, coupon eligibility, quantity price rules if required, and a quote-enabled flag.
- Admin-controlled feature/popularity flags and display order.
- Product-specific customization profile ID or an explicit “customization unavailable” state.

### 4.2 Product customization examples

These are examples for design and must be enabled only when relevant to a specific product:

| Product family | Possible configuration fields | Preview expectations |
|---|---|---|
| Tabletop/acrylic illuminated sign or LED frame | Supported size such as A4/A5/A6/A7 or 6×4", orientation, front/back artwork if double-sided, customer name/text, font, text colour, alignment, logo/artwork upload, supported finish/accessories | Show text/artwork positioned on the configured sign mockup; show each side when supported |
| Digital signage display (e.g. 32", 43", 55" only if present in catalogue) | Screen size/model, touch/non-touch, stand or mount, orientation, compatibility/accessory options if sold | Update the product image/model selection; do not pretend the preview is a physical simulation if it is only a configuration preview |
| Custom print/frame product | Frame/print size, frame/stand option, orientation, colour/finish, uploaded artwork, optional personalization text | Show artwork inside the printable area and update the mockup dimensions/format |
| Non-customizable product | Only real purchasable variants/specifications | No customize button or irrelevant customization controls |

Never display unsupported options just because they appear in a sample row above. Each product uses its own admin-defined profile.

### 4.3 Configurable customization field types

The admin product configurator builder should support reusable field types:

- Dropdown / single choice.
- Radio buttons / card choices.
- Checkbox / boolean add-on.
- Colour selector using admin-defined colours.
- Text / customer name / short message with character limits.
- Font selector from approved font choices.
- Numeric dimension inputs with minimum/maximum/unit and validation, if a product supports dimensions.
- Artwork/logo upload with accepted formats, file-size limits, helper text, and upload status.
- Image/template selector from admin-approved templates.
- Front-side/back-side art selection only for supported double-sided items.
- Optional notes field.

Each field must support stable ID/key, label, help text, order, required/optional, default, validation constraints, visibility/dependency rules, price effect, and preview mapping. Use stable machine keys such as `sign_size`, `customer_name`, `text_color`, `front_artwork`, and `back_artwork`; labels can be edited by admin independently of those keys.

### 4.4 Live preview interaction

- Display the product-specific mockup with the printable/customizable area clearly outlined.
- Update the preview immediately when size, colour, text, font, orientation, template, or artwork changes.
- Use a focused 2D renderer (for example Canvas with a maintained library such as Konva or Fabric.js) where useful. Load the renderer only on product pages that need it; it must not inflate every storefront route's JavaScript.
- For file upload, show the selected file thumbnail, upload progress, validation result, remove/replace action, and the corresponding preview layer.
- If a product has front/back sides, allow front/back preview switching and save configuration for both sides.
- Preserve preview aspect ratios for different sizes and show an “illustrative preview” note where actual print/material output may differ.
- Provide “Reset customization” and accessible form labels/keyboard navigation.
- Preview should remain responsive on mobile. If the canvas is heavy, debounce updates and render only visible elements.
- The preview is a visual guide, not an approval of print production accuracy or colour calibration.

### 4.5 Artwork upload and safety

- Use a backend-authorized pre-signed upload URL or equivalent secure upload flow to object storage; do not proxy large files through memory-heavy API handlers unnecessarily.
- Allow only admin-configured formats. A conservative initial allow-list is JPEG, PNG, and PDF; allow SVG or other vector types only after sanitization/rasterization and explicit testing. Reject executable/script file types.
- Validate actual file signature/content, MIME type, extension, and size, not extension alone. Set upload-size limits per profile.
- Store private originals in non-public storage and serve them through short-lived signed URLs to authorized users. Public product images can be CDN cached; customer artwork must not be publicly accessible by default.
- Add malware scanning where available and quarantine files that fail validation.
- Keep the original file and an optimized/preview derivative where practical. Record ownership and purpose.
- Never trust client-sent filenames or paths. Use generated storage keys. Do not render uploaded SVG/HTML directly into the page.

### 4.6 Customization data and pricing

Save a normalized configuration snapshot with each cart item/order item, including:

- Product ID, variant ID, selected option IDs/values, free-text values, artwork asset IDs, preview asset ID if stored, profile/rule version, and a readable summary.
- Server-calculated line price and price breakdown at time of add-to-cart/checkout, later captured as a historical order snapshot.
- The selected profile/rule version so future admin changes do not silently change an existing order.

For each option the admin may configure no price effect, fixed surcharge, per-unit surcharge, or an approved restricted formula/rule. Do not use `eval`, dynamic Python execution, arbitrary JavaScript, or unrestricted code input for pricing formulas. Use a versioned, allow-listed rule interpreter. Validate every selected option on the backend. Any changed selection triggers an authoritative price recalculation API call; price shown before the response should be clearly provisional.

### 4.7 Save/share configuration

- A customer can update a configuration before adding it to the cart.
- After add-to-cart, the cart item retains its configuration and preview summary.
- Changing customization in the cart should be an explicit “Edit customization” flow that revalidates price and stock.
- Checkout and order details must display the selected specs, personalization, and uploaded artwork/preview references.
- Quote-capable products must include relevant customization data and selected artwork in the quote request.

---

## 5. Storefront Information Architecture and Key User Journeys

### 5.1 Customer-facing routes

```text
/
/about
/shop
/shop/[category]
/product/[slug]
/search?q=...
/cart
/checkout
/checkout/success
/login
/register
/account
/account/profile
/account/addresses
/account/orders
/account/orders/[id]
/account/wishlist
/account/compare
/account/quotes
/quote
/track-order
/gallery
/faq
/contact
/policies/shipping
/policies/returns
/policies/warranty
/policies/privacy
/policies/terms
```

There must be no `/bulk-order` route or menu item. Provide correct 404/410 behavior if an old route is requested, without leaving a broken link in navigation.

### 5.2 Homepage — V3 product-first conversion design

- Premium, original hero with high-quality signage product imagery, clear headline, Shop Products CTA and Request a Quote CTA; all supported copy, images, links and visibility are admin-managed.
- Responsive header with supplied logo, configurable navigation, stylish global search/autocomplete, account, wishlist and cart.
- Prominent product sections on the homepage: admin-selected featured products, new arrivals, and best-selling/popular items only when backed by genuine data. Product cards show accurate imagery, useful specifications, approved price, relevant actions, wishlist and compare.
- Photo-based category cards sourced from published categories.
- Company introduction, benefits and industry/use-case sections using verified company/product content.
- Admin-managed Our Clients banner containing only approved real logos.
- Product demonstration videos with optimized thumbnails and accessible playback.
- Gallery preview, genuine customer reviews/testimonials, FAQ highlights, contact/WhatsApp CTA and complete footer with policy/contact links.
- Admin can create/edit/reorder/hide/publish supported sections through friendly forms, media pickers and previews. No source-code or raw JSON editing for ordinary updates.
- Keep below-the-fold assets lazy-loaded; do not use a giant autoplaying hero video or fabricated sales/trust claims.

### 5.3 Shop, categories, search and V3 faceted filters

- Server-side search/filter/sort/pagination; never download the whole catalogue to filter it in the browser.
- Search by product name, SKU/model, category, and supported specification/attribute values.
- Backend-driven facets configurable by administrators; show only attributes applicable to the current category/product family.
- Filter candidates include category/subcategory, price range, size/dimensions, model/SKU, touch/non-touch, mounting type (wall/floor/A-type/kiosk where supported), indoor/outdoor, availability, application/use case, orientation, shape, material/finish, single/double-sided capability, operating system, HDMI, RAM/ROM, brightness, power options, customization and artwork support, and other catalogue-defined attributes.
- Attribute types should support text, number/range, boolean, single-select and multi-select as appropriate. Admin can mark attributes searchable/filterable, choose category applicability, configure labels/allowed values, and set display order using a friendly UI.
- Filters must be combinable. Support active-filter chips, remove-one, clear-all, result count, loading/error/empty states, pagination, sorting and query-state in the URL. Reset pagination when filters materially change.
- Responsive desktop sidebar and accessible mobile drawer/bottom sheet with Apply/Clear actions.
- Sorting: relevance, price ascending/descending, newest and popularity only where real data supports it.
- Product cards show accurate image, name, useful specifications, approved price, stock/availability where supported, admin-configured badges, wishlist and comparison actions.
- No fabricated counts, ratings, prices, or availability. Empty/loading/error states and retry are mandatory.

### 5.4 Product detail page

- Image gallery with thumbnails, zoom, optional optimized video, name/SKU, clear specifications, warranty/delivery only if configured, stock state, quantity, price breakdown, customer reviews and rating summary derived only from genuine published reviews, FAQs and related products.
- Variant selectors and product-specific customization controls.
- Live preview for customizable products, with mobile-friendly controls.
- Clear “Add to Cart” for purchasable products, “Request a Quote” for quote-enabled products, and contextual WhatsApp/call links when configured.
- Avoid showing mutually contradictory CTAs. Admin must decide whether a quote-enabled product is quote-only or can also be purchased.
- Explain options briefly for non-technical users.

### 5.5 Cart and V3 payment-first checkout

- Guest browsing is allowed. V3 specifically requires payment before collecting new customer contact, business, billing or shipping details. This overrides the older account-required-before-payment wording in any earlier section or prompt. An existing signed-in customer may be recognized, but must not be forced to re-enter personal/address details before payment.
- Cart supports multiple products, quantities, removal, editing customization, coupon entry, stock validation, price breakdown and configured GST display.
- Pre-payment sequence: validate cart and customization on server; determine the complete payable amount under approved pricing/tax/shipping rules; create a durable checkout/payment session; initiate Razorpay; verify payment server-side.
- Only after payment is authoritatively confirmed, show the customer/business/contact/address form. Link those details to the same checkout/payment session and cart snapshot.
- Maintain a durable state such as `PAID_DETAILS_PENDING` when payment succeeds but customer details are incomplete. Provide a secure resume flow and Admin Panel visibility for these records. Do not mark the order ready for fulfilment until required details are valid.
- If address-dependent tax or shipping prevents an accurate total before payment, do not invent a total or charge surprise amounts later. Require an approved pricing policy/configuration before allowing payment.
- Support separate billing/shipping addresses and save address details to customer profile after the detail-submission phase when an account is created/linked according to approved policy.
- Razorpay UPI/cards/net banking in INR. COD, bank transfer, international currency, credit terms and partial payments remain out of launch scope unless approved later.
- Payment failure/retry must not lose the cart/session or create duplicate payments/orders. Server-side verification and signed/idempotent webhooks are authoritative.
- Success/confirmation states must accurately distinguish paid-but-details-pending, details-submitted/order-confirmed and payment-pending/failed. Do not display a false success state.

### 5.6 Customer account

- Improved login, registration, password reset, email verification where configured, profile/contact/business information, and session management. Account linking/creation must support the V3 post-payment customer-detail workflow.
- Address book after customer details are collected; different billing/shipping addresses.
- Order list/detail, order tracking, invoice download, and a clear paid-details-pending continuation route where applicable.
- Saved quote history/status, wishlist, comparison (up to four products), recently viewed history, and review history where supported.
- Support links via configured email/phone/WhatsApp.

### 5.7 Quote/contact flows

- General contact/callback enquiry.
- Product-specific enquiry.
- Product quote request with selected configuration, customer/business details, notes and optional artwork/reference upload.
- Show submission success and reference number; protect from spam/rate abuse.
- Admin receives in-app/web/mobile notification and email according to notification configuration.
- Quote/lead statuses: New, Contacted, Qualified, Won, Lost. Track follow-up reminders and audit changes.

### 5.8 Supporting pages

About, gallery, FAQ, contact, privacy, terms, shipping, returns/refunds and warranty pages. Content and policy text are admin-editable, and final legal copy must be reviewed by the client before launch.

---

## 6. Web Admin Panel Requirements

The web admin panel is the main full-featured control center. Use a responsive dashboard shell with sidebar navigation on desktop and collapsible navigation on smaller widths.

### 6.1 Core navigation

```text
/admin/login
/admin/dashboard
/admin/products
/admin/products/new
/admin/products/[id]
/admin/categories
/admin/attributes
/admin/customization-profiles
/admin/orders
/admin/orders/[id]
/admin/customers
/admin/leads
/admin/quotes
/admin/coupons
/admin/inventory
/admin/content/home
/admin/content/pages
/admin/content/gallery
/admin/content/faq
/admin/content/testimonials
/admin/navigation
/admin/seo
/admin/media
/admin/notifications
/admin/reports
/admin/settings/general
/admin/settings/email
/admin/settings/payment
/admin/settings/shipping
/admin/settings/tax
/admin/settings/notifications
/admin/settings/integrations
/admin/settings/users
/admin/settings/roles
/admin/audit-logs
```

Do not create `/admin/bulk-orders` or any dedicated bulk-order administration surface.

### 6.2 Dashboard

- Metric cards for order count/value, pending payments, recent orders, new quotes/enquiries, low stock and failed integrations.
- Date range selection.
- Recent orders and open enquiries with drill-down.
- A notification bell and unread count; clicking an alert opens the relevant record after permission checks.
- Every metric must come from real API/database data. Label empty/demo values as empty; no fabricated sales figures.

### 6.3 Product and customization management

Admin users with correct permissions can create/edit/archive products, SKUs, categories, media, specifications, variants, stock, price settings, related items, SEO, visibility and quote behavior.

Customization profile builder must let admin:

- Create a reusable profile or product-specific profile.
- Add/reorder/remove field definitions and mark required fields.
- Configure labels, helper text, allowed values, defaults and validation limits.
- Define conditional visibility (e.g., show a back-artwork upload only when double-sided is selected).
- Configure supported preview template/mockup and customizable/printable coordinates.
- Configure front/back preview layers where applicable.
- Select allowed artwork formats and max upload size.
- Set safe price adjustments per option and preview/price rule version.
- Preview/test the customer configurator before publishing.
- Publish, unpublish, clone or version a profile. Existing orders must retain their original snapshots.

### 6.4 Orders and inventory

- Search/filter/sort/paginate by order number, customer, date, payment state, fulfillment state and product.
- Order detail with items, configuration snapshot, preview/artwork links (permission-checked), price/tax/shipping snapshot, payment attempts, invoice, shipment/tracking and status timeline.
- Status transitions validated server-side and audited.
- Inventory at SKU/variant level where configured; atomic stock reservation/release to avoid overselling.
- Notifications on important state changes.
- CSV export only for authorized staff, with sensitive fields restricted by role.

### 6.5 Content management

Admin-editable announcement bar, hero/headlines/images/video references, homepage section order/visibility, featured products, categories and photos, company introduction, verified client logos, benefits, industry tiles, gallery, uploaded videos, permitted Instagram embeds, FAQs, genuine testimonials/reviews where relevant, contact information, map, office location, phone, email, WhatsApp number/templates, social links, navigation/Shop mega menu, SEO titles/descriptions, and legal/policy text. Use friendly forms and visual media pickers instead of raw JSON. Validate URLs, file types, image dimensions, content lengths and publication status.

### 6.6 Runtime settings and integrations

Super Admin can manage/verify, without a code redeployment for ordinary config changes:

- Razorpay test/live mode and keys/webhook secret.
- SMTP host/port/username/password/from name/from email, plus Send Test Email.
- Cloudflare-first media provider settings: Cloudflare Images/Stream/R2 where configured, provider health, upload settings, and durable server-storage fallback settings/health. Keep object-storage configuration tests where supported.
- WhatsApp number, per-context message templates and floating button on/off.
- GSTIN/business legal name, tax rules, HSN/tax classes, inclusive/exclusive display setting.
- Shipping zones, rates, free-shipping threshold and delivery SLA text.
- Customer support details, social links, store contact settings.
- Notification types, enabled channels, preference defaults, and test push flow.
- Operational toggles and non-secret business settings.

Protect the settings interface with Super Admin-only permission, validation, masked secrets, an audit log and a test/verify action where appropriate. Store sensitive settings encrypted at rest, do not return secrets in API responses, and never log them. Use environment/secret-manager fallback only for initial/bootstrap credentials and highly privileged deployment secrets. Admin changes to ordinary settings must invalidate relevant caches and take effect safely without restarting the whole application.

---

## 7. Cross-Platform Admin Companion App (Flutter)

### 7.1 Goal

Build an independent installable app for authorized DisplayDelight staff, not a separate customer shopping app. It must let staff react to business events quickly while reusing the same FastAPI APIs, business rules, users, roles and audit trail as the web admin.

### 7.2 Platforms and release plan

- **Initial target:** Android and iOS mobile phones and tablets.
- **Architectural target:** Shared Flutter code suitable for web and desktop builds (Windows/macOS, and Linux if requested), using adaptive navigation/layouts.
- **Fallback/always available:** Full web admin panel in any supported modern browser.
- Do not promise every platform is production-ready simply because the framework can compile for it; create a target-platform matrix and run actual builds, UI tests and notification tests per platform.

### 7.3 App screens

- Branded splash/startup, sign-in, session restore and secure logout.
- Dashboard with role-specific widgets.
- Orders list and order detail.
- Quote/enquiry inbox and detail with status update/follow-up actions.
- Inventory/low stock view where role permits.
- Notifications inbox with read/unread, categories, timestamp, priority and navigation to the relevant record.
- Profile, security/session controls, notification preferences and app settings.
- Optional read-only product lookup; editing the full catalog can remain in the web admin initially.
- Permission-denied, offline, no-data, loading, retry, expired-session and update-required states.

### 7.4 Push and real-time notification behavior

Use **Firebase Cloud Messaging (FCM)** for Android/iOS push. Configure Apple Push Notification service (APNs) credentials for iOS. The server sends pushes using a server credential stored in a secrets manager or tightly restricted encrypted configuration—not a key embedded in the app.

Required behavior:

1. After authenticated app startup, register the device token with the backend, linked to the user, role, platform, app version and active state.
2. Ask permission at a relevant moment with a short explanation; do not repeatedly prompt after the user declines.
3. Persist notifications in PostgreSQL before dispatch so the alert is not lost if push/email is down.
4. Use a transactional outbox or equivalent durable queue to dispatch notifications asynchronously.
5. Foreground: show a concise in-app banner and update the inbox/unread counter.
6. Background/terminated: send OS push with a category, concise title/body, opaque notification ID and safe deep-link metadata.
7. When tapped, open the relevant order/quote/enquiry only after rechecking authentication and server authorization.
8. If delivery fails due to expired/invalid tokens, mark the token stale and stop retrying it indefinitely; retry transient errors with capped exponential backoff.
9. Deduplicate sends with an idempotency key; do not create one push per API retry.
10. Mark read/opened status on the server. Provide notification history even if OS push was blocked.
11. Support per-user notification preferences and channel toggles where reasonable. Critical security/payment events should follow agreed policy rather than being silently disabled by a broad preference.
12. Never include passwords, API secrets, private artwork URLs, full addresses or sensitive customer/payment data in notification payloads. Fetch details securely after tapping.

### 7.5 Important admin alerts

| Event | Priority | Suggested recipient/channel |
|---|---|---|
| New paid/confirmed order | High | In-app + push + email according to settings |
| Payment failure / webhook mismatch | High | Finance/Super Admin in-app + push |
| New quote/contact enquiry | High | Sales roles in-app + push + email |
| Low stock threshold reached | Normal/High | Operations roles |
| Order status changed / shipment issue | Normal/High | Relevant operations roles |
| Refund requested or refund sync failure | High | Finance/Super Admin |
| SMTP or payment integration test failed | High | Super Admin |
| Artwork upload/processing failed | Normal | Assigned admin/operations role where relevant |
| Follow-up reminder due | Normal | Assigned/authorized sales role |
| Admin security event or role/settings change | High | Super Admin/audit view |

Channel rules, roles, event types, priority and templates must be configurable. Notification content should be short, useful and non-sensitive.

### 7.6 Performance and resilience for the app

- Keep initial screen and navigation bundles modest; lazy-load less-used sections.
- Use pagination and server-side filters.
- Cache only appropriate, non-sensitive view data for fast reopen; show “last updated”/stale labels if offline.
- Never cache secrets, full payment information or privileged tokens in plain storage.
- Use secure storage provided by the platform for credentials and a centralized API client with refresh/expiry handling.
- Add request timeouts, cancellation, retry only for safe/idempotent requests, and clear offline UI.
- Deep links must be validated and must not bypass login/permission checks.
- Keep mobile notification handling tested in foreground, background and terminated states on real devices.

---

## 8. Notification System Design

Use a unified notification domain that supports web admin, Flutter app, and email delivery.

### 8.1 Suggested data model

```text
notifications
  id, recipient_user_id, event_type, title, body, priority,
  resource_type, resource_id, safe_deep_link, created_at,
  read_at, archived_at, deduplication_key

notification_deliveries
  id, notification_id, channel, destination_reference,
  status, attempt_count, next_attempt_at, sent_at, error_code,
  provider_message_id, created_at, updated_at

admin_devices
  id, user_id, platform, push_token, token_status,
  app_version, last_seen_at, created_at, updated_at

notification_preferences
  user_id, event_type, in_app_enabled, push_enabled, email_enabled

notification_outbox
  id, event_id, event_type, payload_reference, status,
  created_at, processed_at, retry_count
```

The schema may be refined during implementation but must preserve durability, deduplication, delivery diagnostics and access boundaries. Never save large/private artwork blobs inside notification rows; refer to protected records/assets.

### 8.2 Notification pipeline

```text
Business transaction succeeds
  → Persist domain event/outbox in same DB transaction
  → Background worker claims outbox record
  → Resolve recipients through roles/permissions/preferences
  → Persist notification inbox item(s)
  → Deliver FCM/email asynchronously
  → Record outcome/retry
  → Web app refreshes via polling/SSE/WebSocket as appropriate
  → Flutter app updates inbox and/or receives push
```

A push delivery failure must not undo an order or payment transaction. Notification send failure is operationally visible and retryable independently.

### 8.3 Realtime transport

Use SSE or WebSocket for the active web admin when it measurably improves alert latency and can be operated safely; otherwise start with bounded polling plus FCM on mobile. Do not create persistent connections for every anonymous storefront visitor. Use authentication, authorization, keepalive, reconnect with jitter, event versioning and per-user scope for any realtime channel.

---

## 9. Backend API and Domain Requirements

### 9.1 API conventions

- Base path: `/api/v1`.
- JSON REST APIs with typed request/response schemas and OpenAPI docs.
- Consistent error structure with machine-readable code, human-readable message and correlation/request ID.
- Pagination and filtering for list endpoints.
- Validate all client input server-side.
- Use idempotency for checkout/order/payment and notification-triggering operations where duplicate submissions are possible.
- Enforce authentication/authorization on every private route, not just the UI.

### 9.2 Key endpoint groups

**Public catalogue**
```text
GET    /api/v1/categories
GET    /api/v1/categories/{slug}
GET    /api/v1/products
GET    /api/v1/products/{slug}
GET    /api/v1/products/{id}/customization
POST   /api/v1/products/{id}/price-preview
GET    /api/v1/products/{id}/related
GET    /api/v1/products/filters (or equivalent documented filter metadata API)
GET    /api/v1/categories/{slug}/filters (or equivalent)
GET    /api/v1/products/{id}/reviews
POST   /api/v1/products/{id}/reviews
GET    /api/v1/search
```

**Authentication and customer account**
```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/addresses
POST   /api/v1/me/addresses
PATCH  /api/v1/me/addresses/{id}
DELETE /api/v1/me/addresses/{id}
GET    /api/v1/me/orders
GET    /api/v1/me/orders/{id}
GET    /api/v1/me/quotes
GET    /api/v1/me/wishlist
POST   /api/v1/me/wishlist/{product_id}
DELETE /api/v1/me/wishlist/{product_id}
```

**Artwork and customization**
```text
POST   /api/v1/uploads/presign
POST   /api/v1/uploads/{id}/complete
DELETE /api/v1/uploads/{id}
POST   /api/v1/products/{id}/price-preview
POST   /api/v1/quotes
```

Only the authenticated owner/customer or an authorized admin may access private uploaded assets. Ensure the backend validates that each uploaded asset belongs to the current user or is otherwise explicitly shared for that order/quote.

**Cart and checkout**
```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}
POST   /api/v1/cart/apply-coupon
DELETE /api/v1/cart/coupon
POST   /api/v1/checkout/preview
POST   /api/v1/checkout/payment-session (V3: create server-authoritative payable session)
POST   /api/v1/checkout/customer-details (V3: submit required details after verified payment)
POST   /api/v1/checkout/orders (implement as part of the defined payment-first implementation if this endpoint is used)
```

**Razorpay/payment/order lifecycle**
```text
POST   /api/v1/payments/razorpay/order
POST   /api/v1/payments/razorpay/verify
POST   /api/v1/webhooks/razorpay
GET    /api/v1/me/orders/{id}/payment-status
GET    /api/v1/me/orders/{id}/invoice
```

Webhook routes must verify provider signatures, persist event IDs, process idempotently, and reconcile delayed/out-of-order events. A browser callback is not authoritative.

**Quote, leads, and support**
```text
POST   /api/v1/quotes
GET    /api/v1/me/quotes
POST   /api/v1/contact
POST   /api/v1/product-enquiries
POST   /api/v1/callback-requests
```

**Admin**
```text
GET/POST/PATCH/DELETE /api/v1/admin/products...
GET/POST/PATCH/DELETE /api/v1/admin/categories...
GET/POST/PATCH/DELETE /api/v1/admin/customization-profiles...
GET/PATCH               /api/v1/admin/orders...
GET/PATCH               /api/v1/admin/leads...
GET/POST/PATCH/DELETE   /api/v1/admin/coupons...
GET/PATCH               /api/v1/admin/inventory...
GET/PATCH               /api/v1/admin/content...
GET/PATCH               /api/v1/admin/settings...
GET                      /api/v1/admin/audit-logs
```

**Notifications and device registration**
```text
POST   /api/v1/admin/devices/register
POST   /api/v1/admin/devices/{id}/deactivate
GET    /api/v1/admin/notifications
GET    /api/v1/admin/notifications/unread-count
PATCH  /api/v1/admin/notifications/{id}/read
POST   /api/v1/admin/notifications/mark-all-read
GET    /api/v1/admin/notification-preferences
PATCH  /api/v1/admin/notification-preferences
POST   /api/v1/admin/notifications/test-push
GET    /api/v1/admin/notification-deliveries (permission restricted)
```

For this greenfield application, implement the route conventions defined in this brief (or document a justified consistent alternative) and publish the final contract in OpenAPI for all clients.

### 9.2.1 V3 endpoints and integrations

For this greenfield application, implement the required capabilities using the routes below or a consistently documented equivalent. Final paths and schemas must match OpenAPI and be shared by all clients.

**Customer/admin profile and email:** implement secure customer/admin auth and profile APIs, password recovery, verification, email preferences and SMTP test operations. Example admin settings capabilities: `GET/PUT /api/v1/admin/settings/email`, `POST /api/v1/admin/settings/email/test`. Never return stored secrets.

**Review endpoints:** `GET /api/v1/products/{id}/reviews`, `POST /api/v1/products/{id}/reviews`, and permission-protected admin review list/moderation endpoints. Keep actual rating summaries derived from published reviews. Only backend purchase checks can assign verified-purchase state.

**Filter metadata:** `GET /api/v1/products/filters` and `GET /api/v1/categories/{slug}/filters` or equivalent route(s) must expose filterable attribute definitions and actual values/counts where supported. The product list endpoint should support server-side filter, sort and pagination parameters.

**Payment-first checkout:** implement or adapt a durable checkout session/payment intent endpoint and a post-payment customer-details submission endpoint. The server must persist payment attempts and state transitions such as `PAYMENT_PENDING`, `PAID_DETAILS_PENDING`, `DETAILS_COMPLETE`/`ORDER_CONFIRMED`, `PAYMENT_FAILED` or equivalent. Keep this aligned to the single order/payment state machine and avoid duplicating an order table or lifecycle. Apply idempotency keys and ownership/verification checks.

**Media provider abstraction:** implement upload endpoints, provider health/status, image/video upload authorization, video processing status and provider/fallback metadata endpoints. Cloudflare should be tried as the preferred provider; use durable server storage only for eligible storage/service unavailability and never to bypass authorization failures.

**CMS/social video:** add/update APIs for client logos, homepage sections, video metadata, permitted Instagram URLs/embeds, gallery content and social/map settings as needed. Keep admin mutations protected and revalidate public caches after publish/update.

**Optional Shopify direct integration:** if separately approved, isolate it behind a modular integration service. Verify Shopify webhook signatures, deduplicate events, log sync outcomes and declare a source of truth for product/stock/order data. The website must work when Shopify is not configured.

### 9.3 Main database entities

At minimum plan normalized tables for:

- Identity/access: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, refresh/session records, password reset/email verification records.
- Customer: profiles and addresses.
- Catalogue: `categories`, `products`, `product_media`, `attributes`, `attribute_values`, `product_variants`, `product_option_groups`, `product_option_values`, related products.
- Customization: `customization_profiles`, `customization_fields`, `customization_rules`, `product_customization_profiles`, `customization_assets`, preview references/rule versions.
- Pricing: product/variant prices, quantity price rules where required, versioned pricing rules, coupons, coupon redemptions.
- Inventory: inventory items/movements and stock reservations.
- Commerce: carts/cart items, orders/order items, order item configuration snapshots, order addresses, status history.
- Payments: payment attempts, payment webhook events, refunds/refund events.
- Shipping: zones/methods/rules, shipments, tracking events.
- Tax: tax classes/rules/components.
- Enquiries: quotes, quote items, leads, lead events, reminders, file uploads. **No bulk-order-request entity.**
- Content: pages, page sections, media assets with provider/object identifiers and processing status, gallery items, video/Instagram source metadata, client logos, FAQs, testimonials, navigation, category filter configuration and SEO metadata.
- Reviews: product reviews, moderation/audit state, customer association, publication state, and helpful/report records only if supported.
- V3 checkout: persistent checkout/payment session or equivalent state for `PAID_DETAILS_PENDING`, customer-details completion, idempotency keys, and safe recovery after payment. Use one coherent order/payment entity model instead of creating duplicate commerce records.
- Notifications: notifications, deliveries, preferences, admin devices, durable notification outbox.
- Settings/audit: system/integration/SMTP/WhatsApp/tax-shipping/analytics settings, audit logs.

Use foreign keys, unique constraints, appropriate indexes, UTC timestamps, migrations, soft deletion/status where needed, and immutable historical snapshots for orders/payments. Avoid one huge JSON document for the entire commerce system; JSONB is appropriate for extensible product attribute/configuration snapshots, not a replacement for relational constraints.

### 9.4 Pricing pipeline

```text
Resolve product
→ validate selected variant
→ validate product-specific customization fields/rules
→ calculate option and allowed formula adjustments
→ apply quantity tier if enabled
→ apply eligible coupon
→ calculate GST/tax from approved rules
→ calculate shipping from approved rules
→ persist price snapshot for checkout/order
```

Pricing rules must be deterministic, testable, versioned, auditable and safe. Client totals are display-only; backend recomputes at add-to-cart, cart updates and checkout.

---

## 10. Security, Reliability, and Production Readiness

### 10.1 Authentication and authorization

- Secure, short-lived access with refresh/session handling; prefer secure, HTTP-only, SameSite cookies for browser sessions when architecture permits.
- For Flutter, use platform secure storage and a documented token/session lifecycle. Avoid long-lived bearer tokens in plain local storage.
- Password hashing using a modern password hashing algorithm, rate-limited auth endpoints, email verification/reset with expiring one-time tokens.
- Role-based access control for Super Admin, Operations Admin, Sales, Content Manager, Finance, and Support; exact permissions must be configurable by Super Admin.
- Require two-factor authentication for Super Admin and privileged admin access before production.
- Enforce authorization in FastAPI for every admin resource/action, including notification subscriptions, uploaded artwork, CSV exports, settings, payment details, and role changes.
- Record security-sensitive changes in audit logs.

### 10.2 Payment and order integrity

- Server-side Razorpay order creation and signature verification.
- Verify webhook signatures; keep event IDs and process idempotently.
- Prevent duplicate checkout submissions, duplicate payment capture processing and duplicate order creation.
- Use transaction boundaries and atomic stock reservation/release.
- Define explicit order/payment state machines and validate transitions.
- Handle out-of-order webhooks and retries safely.
- Payment/checkout failures must retain retry context and show clear status.

### 10.3 Secrets, file uploads, and admin config

- `.env` and secret files are excluded from source control.
- Never put private keys in `NEXT_PUBLIC_*`, mobile configuration bundles, logs, analytics events or error messages.
- Encrypt integration credentials at rest; mask secret fields in admin responses.
- Verify permissions before reading/writing settings; only authorized Super Admin can change privileged integration settings.
- Storage fallback must use durable persistent storage. Never claim fallback success when the host filesystem is ephemeral or inaccessible.
- Product reviews require backend validation, rate limiting, moderation controls and genuine verified-purchase logic.
- Validate, scan and isolate uploaded artwork; serve private files with signed URLs and short expiry.
- Add CSRF protections where cookie-based authentication is used, appropriate CORS allow-lists, Content Security Policy, secure headers, output encoding, SQL parameterization, rate limits, anti-spam controls and request-size limits.
- Do not log personal data or full payment details unless specifically required and securely governed.

### 10.4 Data protection and reliability

- Automated encrypted database backups; daily backup is recommended, with documented restore process and a restore test before launch.
- Object storage retention/versioning for important assets.
- Health/readiness endpoints, structured logs, request/correlation IDs, exception tracking, uptime checks, DB/Redis monitoring, worker queue monitoring and payment webhook failure alerts.
- Background jobs must be retryable, idempotent where possible, observable, and bounded by timeouts/retry caps.
- Staging data and credentials must never accidentally be used for production payments or email.

---

## 11. Performance, Loading, and Responsiveness Targets

These are proposed engineering acceptance targets to measure in staging/production-like tests, not guaranteed outcomes independent of hosting/content/network.

### 11.1 Public storefront targets

- Target Core Web Vitals on representative mobile tests: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Target p95 origin latency for simple cached public APIs below 150 ms; product detail below 250 ms; search/filter below 300 ms; checkout calculation below 500 ms excluding external payment-provider latency.
- Target initial client JavaScript: keep small and justify every large dependency; separately analyze customer and admin bundles.
- Optimize the first viewport first; do not eagerly load below-the-fold product images, videos, analytics, editors, admin charts or customization canvas libraries.
- Use responsive AVIF/WebP images with explicit width/height/aspect ratio and appropriate `sizes`; lazy-load below-the-fold assets and prioritize only the true LCP image.
- Validate responsive behaviour at actual CSS viewport widths for small phones, standard mobile, tablets, 14-inch/15-inch/16-inch laptop viewports and large desktop monitors; screen inches alone are not CSS breakpoints.
- Use CDN caching for public product/category/content pages and media. Invalidate/revalidate affected cache entries after admin edits.
- Cache public catalogue data carefully; do not cache per-user price/cart/stock/payment states as if immutable.
- Use server rendering/static/cached rendering for public pages. Keep account, cart, checkout and admin appropriately private/dynamic.
- Add database indexes and pagination; avoid N+1 queries, unbounded result sets, and full catalogue downloads.
- Keep analytics and non-critical third-party scripts out of the critical rendering path.
- Use route-level code splitting, dynamic imports for heavy components, optimized/self-hosted fonts, and bundle analysis.

### 11.2 Web admin and Flutter app targets

- Dashboard should render its shell immediately and stream/load metric cards independently; do not block navigation while charts are fetched.
- Paginate admin lists and query on server; do not load all orders/leads/users into the browser/app memory.
- Use cache for safe reference data; invalidate after mutations.
- Target perceived app readiness under ~2 seconds on a representative mid-range device/network as an engineering goal; measure on actual devices and optimize rather than adding fixed delays.
- Push notification delivery latency depends on OS/network/provider, so design for quick durable dispatch, track delivery state where supported, and provide an inbox that does not depend on push delivery.
- Create performance checks for real product pages with artwork preview because the configurator is the likely heavy path.

### 11.3 Loading implementation checklist

- Next.js `loading` UI/suspense boundaries where appropriate, skeleton product cards and skeleton admin tables.
- Image placeholder/loading behavior that preserves layout.
- Disable/relabel buttons while mutations are in progress.
- Show upload progress, progress/errors, and “retry upload”.
- Show payment-in-progress with a clear do-not-refresh/help message, while the backend still supports safe resume/retry.
- Flutter app startup splash while essential state resolves, pull-to-refresh where suitable, loading skeletons, stale/offline state, and retry actions.
- Tests for slow network, failed API, empty response, expired session, failed artwork upload, push permission denied, and payment pending.

---

## 12. Testing and Definition of Done

A feature is not complete because the screen looks correct. It is complete only when UI, API, persistence/migration, permissions, validation, loading/error states, logging/audit where required, automated tests, and documentation are present.

### 12.1 Required tests

**Frontend**
- Unit tests for price display formatting, customization state mapping, validation and conditional fields.
- Component/accessibility tests for product selectors, preview controls, cart, checkout, and notification inbox.
- End-to-end tests for browse → configure → cart → server-calculated payable total → Razorpay test payment → backend verification → customer details form → order confirmation (the V3 payment-first journey).
- Responsive tests for storefront and admin at representative 320/360/390/430/768/820/1024/1280/1366/1440/1536/1920 CSS-pixel viewport widths.
- Product/category facet tests with multiple filters, URL state, pagination, and irrelevant-attribute suppression.
- Customer and admin login/profile/password reset/email verification tests.
- Review submission, moderation, duplicate prevention, and verified-purchase tests.
- Cloudflare preferred-storage failure and durable server-storage fallback tests.
- Uploaded video processing and allowed Instagram embed URL tests.
- Responsive tests on desktop/tablet/mobile and visual checks for loading/error states.

**Backend**
- Unit tests for pricing rule engine, option visibility validation, coupon rules, tax/shipping rules, permission checks, order state transitions and webhook idempotency.
- API integration tests with a disposable/test database.
- Migration and database constraint tests.
- Upload authorization, type/size validation and signed URL expiry tests.
- Notification outbox, duplicate event, retry, invalid token and role-recipient tests.

**Flutter admin app**
- Widget tests for dashboard, list/detail, permission states and notification inbox.
- Unit tests for API/session/retry/deep-link handling.
- Android/iOS build tests and push notification tests on real devices or suitable platform test services.
- Foreground, background, terminated, permission denied, stale token, logout, and expired session tests.

**Integration/security/performance**
- API contract compatibility check among Next.js, Flutter and FastAPI.
- Razorpay test-mode payment success/failure/retry and signed webhook tests.
- No secrets in compiled frontend bundles/app package/logs.
- Role access and IDOR testing for orders/artwork/notifications/settings.
- Load test catalogue/search/cart/checkout/notification ingestion at agreed expected concurrency.
- Lighthouse or equivalent production-build audits, Core Web Vitals measurement, API p95 tests, accessibility checks and error/uptime alerts.
- Backup restore drill, staging-to-production checklist and production smoke test.

### 12.2 Acceptance journeys

**A. Customized purchase**
1. Browse or search for a product.
2. Open a product whose customization is enabled.
3. Select only that product's options.
4. Enter permitted text and upload artwork.
5. See preview update immediately.
6. See server-validated price update.
7. Add to cart; refresh/reopen and confirm configuration persists.
8. Backend validates cart and determines final payable amount under configured rules.
9. Create checkout/payment session and complete Razorpay test payment.
10. Verify the payment on the backend; confirm a durable paid-details-pending state.
11. Submit customer details after payment, link them to that session, and complete the order.
12. Verify server webhook/callback state, order record, item configuration snapshot, artwork access rules, invoice and customer email.
11. Confirm admin web and Flutter app receive one durable notification, with no duplicate order/push from retries.

**B. Quote enquiry**
1. Open quote-enabled product and configure it if applicable.
2. Submit contact details, notes and artwork/reference.
3. Quote appears in customer account if applicable, admin leads/quotes inbox, audit timeline and notification inbox.
4. Authorized staff receive push/email according to settings.
5. Sales updates status and follow-up reminder.

**C. Payment failure/retry**
1. Simulate failed payment.
2. Order/payment attempt remains traceable and retryable.
3. Customer sees clear state, not a false success page.
4. Retry can succeed without duplicate order/payment capture.
5. Webhook and notification handling remain idempotent.

**D. Admin push**
1. Authorized admin logs in to Flutter app and opts in to notifications.
2. Device token registers on backend.
3. Trigger a test push and verify foreground and background behavior.
4. Trigger new order or enquiry; verify one inbox record and appropriate channel delivery.
5. Tap push; app routes to record, checks permission, and shows correct state.
6. Logout/deactivate device; private notifications cannot be read by a different user.

---

## 13. AI Coding Prompts — Copy, Paste, and Run Sequentially

**Important working rule for Antigravity or another coding agent:** Run these prompts in the new project workspace created specifically for DisplayDelight V3. Use the master brief and supplied reference files as requirements. Build the agreed modules in a coherent order with tests. Do not assume an earlier implementation or database exists. If optional provider credentials are missing, build secure configuration and status handling plus setup instructions; never fabricate live credentials or claim an integration works without verification.

### PROMPT 1 — Create the production web frontend (storefront + web admin)

```text
You are the lead frontend architect and senior product engineer. Create the production-grade DisplayDelight customer storefront and web Admin Panel from scratch in the new project workspace. Follow /docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md as the source of truth. Treat supplied documents, catalogue and logo files as requirements/assets. Establish the frontend structure, design system, route tree, typed API client, and reusable components. Do not depend on an undocumented legacy application.

GOAL
Create a real, responsive, accessible, fast e-commerce frontend for DisplayDelight—not a static mockup. The user experience should have marketplace-level product discovery and checkout clarity similar to Flipkart, but use DisplayDelight's own branding, logo, color tokens, copy, layouts and assets. Customer storefront and web admin must be separate route/layout/bundle boundaries and must call the new FastAPI backend through one typed API client. Never connect to a database from the browser or calculate authoritative prices/payment status in frontend-only code.

STACK
Use current stable and security-patched Next.js App Router, React and TypeScript versions compatible with the selected deployment, Tailwind CSS, accessible primitives and validated schemas. Prefer React Server Components/server rendering for public pages and client components only for actual interaction. Use server fetch/caching/revalidation intentionally. Use `next/image` or current equivalent image optimizations and optimized/self-hosted fonts. Keep dependencies lean. Add lint/typecheck/unit/e2e scripts that fit the project.

DESIGN
Use the DisplayDelight tokens: orange #E84B1A, hover #C23A10, soft orange #FFF0EB, navy #1A1A2E, white surfaces, readable neutral text, Barlow Condensed-style display headings and Inter-style body. Use the actual provided logo. Build consistent buttons, forms, cards, badges, price blocks, tables, dialogs, toast feedback, skeletons and error/empty states. Make desktop, laptop, tablet and 390px mobile polished. Keep motion subtle and respect reduced-motion preferences.

CUSTOMER ROUTES
Implement at minimum: /, /about, /shop, /shop/[category], /product/[slug], /search, /cart, /checkout, /checkout/success, /login, /register, /account/profile, /account/addresses, /account/orders, /account/orders/[id], /account/wishlist, /account/compare, /account/quotes, /quote, /gallery, /faq, /contact and policy routes. There must be no `/bulk-order` page/menu/link/workflow. Browsing is allowed while signed out. Under V3, do not require new customer details or account creation before payment; collect required details only after verified payment, then link/create the account according to approved policy. Build searchable/filterable paginated product grids, category pages, product detail pages, wishlist, compare (max four), recently viewed, quote forms and account pages. Do not invent product prices, stock, reviews, warranty or shipping claims; render only backend data and use clear empty states when catalogue content is absent.

PRODUCT CUSTOMIZATION IS CRITICAL
Customization must depend on the product's server-delivered profile. Build a typed generic configurator renderer for field types the backend returns: select/radio, checkbox, colour, text/customer name, font selector, validated dimensions where allowed, artwork upload, template selector, notes and front/back artwork when applicable. Only render fields/options returned for the current product. Support conditional visibility, required fields and errors. Call the backend price-preview endpoint after valid changes and treat frontend price as provisional until API response. Never hard-code the same options for all products.

For products with a preview profile, dynamically load a 2D preview component (Canvas-based; use a maintained library only if justified) so it does not burden every page. Overlay text/artwork on the correct product mockup and update immediately on size/colour/font/text/artwork changes. Support front/back switching only if the profile enables it. Keep ratios stable on mobile, debounce expensive drawing, show an illustrative-preview label, and provide reset/remove/edit actions. Implement secure upload UX with accepted format/size rules from the API, progress, validation, thumbnail, retry, remove/replace. Do not put private artwork in public paths. If preview template/config is unavailable, show a clear configuration fallback rather than crashing.

PRODUCT PAGE UX
Image gallery/zoom, SKU, specs, price breakdown, real availability, variants, quantity, product-specific customization, preview, warranty/delivery only if configured, related products, FAQs and clear Add to Cart / Request a Quote actions. Ensure quote-only vs purchasable behavior comes from the API. Keep customer language clear for non-technical buyers. Cart items show selected options and customization summary with edit/remove. Checkout follows the V3 payment-first sequence: server-validates cart and total, customer pays through Razorpay, backend verifies payment, then the customer provides required details and order completion follows. Never show success until backend confirms the payment/order state.

WEB ADMIN
Implement protected `/admin/*` pages and navigation described in the master brief: dashboard, products, categories, attributes, customization profiles, orders, customers, leads/quotes, coupons, inventory, content, media, navigation/SEO, notification inbox, reports, integration/settings pages, roles/users and audit log. Use real API loading/mutation flows, pagination, confirmation dialogs, RBAC-aware controls, filters, skeletons and errors. Do not assume hiding a button is authorization; backend enforces permissions. Product editor includes a profile/customization builder UI for field definitions, order, required state, conditions, price effects, allowed file types/limits and preview mapping. Allow admin to test the customer configurator before publishing. Use no bulk-order tab or records.

NOTIFICATIONS UX
Add a global admin notification bell/unread badge/inbox. Fetch notifications and unread counts from API; update via SSE/WebSocket only if server supports it, otherwise use modest bounded polling. Support read/mark-all-read, filters/categories, priority, timestamps and safe deep link. Re-check permissions after navigation. Avoid sensitive data in push-preview payloads. Provide admin notification preference and test-push settings screens as permitted by API.

LOADING/PERFORMANCE
No artificial delays. Use route-level loading UI, skeleton product cards and admin tables, fixed image aspect ratios, responsive optimized images, lazy below-fold media, code splitting, deferred analytics, dynamic import for preview/chart/rich-text/editor libraries, cacheable public pages, correct invalidation/revalidation after admin edits, and no admin code in storefront bundles. Add error boundaries, 404/500 pages, retry controls, keyboard accessibility, labels, focus states and meaningful empty states. Track and optimize LCP/INP/CLS and bundle sizes from production builds.

API INTEGRATION
Create one typed `apiClient` with a configured base URL, safe session handling, timeout/abort, request correlation IDs where appropriate, consistent error parsing, validation and session-expiry handling. Never put secrets in `NEXT_PUBLIC_*`; only public API origin/analytics IDs may be public. Define explicit request/response types and generate or maintain OpenAPI as the source of truth. Add a mock API adapter only for isolated local UI tests; do not let mock product data masquerade as production records.

V3 REQUIRED UPDATES — MUST NOT BE OMITTED
- Make the homepage substantially more attractive and product-first, with real products directly on the front page, admin-selected featured items, photo-based categories, company introduction, verified client-logo banner, industry use cases, product videos, gallery highlights, genuine reviews, FAQ and contact/WhatsApp CTA. All supported sections must be managed by the Admin Panel.
- Validate responsive layouts on small phones, tablets, 14-inch/15-inch/16-inch laptop viewports and large desktops; test representative CSS widths 320, 360, 390, 430, 768, 820, 1024, 1280, 1366, 1440, 1536 and 1920. Do not use laptop inches as CSS breakpoints. No horizontal overflow or clipped controls.
- Implement backend-driven dynamic facets on shop/category/search pages. Applicable filters may include price, size/dimensions, model/SKU, touch/non-touch, wall/floor/A-type/kiosk mounting, indoor/outdoor, orientation, shape, material, OS, HDMI, RAM/ROM, brightness and other real attributes. Only show category-applicable attributes. Support combinable filters, active chips, clear-all, counts when supported, URL state, sorting, pagination, and accessible mobile filter drawer. Do not download the entire catalogue.
- Add customer review/rating UX backed by real review APIs. Never fabricate ratings or verified-purchase labels.
- Improve customer and admin login/profile UX, forgot/reset password, email verification where configured, session handling and admin role-aware profile information.
- IMPORTANT V3 checkout override: the customer selects/configures products, sees an authoritative server-calculated payable amount, pays through Razorpay, and only after backend payment verification enters required contact/business/billing/shipping details. Do not require new customer details or account creation before payment. Use a durable paid-details-pending continuation state. Do not allow payment when address-dependent fees make the amount unknowable, do not add surprise charges after payment, and never claim success before server verification. This supersedes any older account-gate-before-payment instruction.
- Support video uploads, authorized Instagram post/Reel embeds and gallery/homepage placement. Do not scrape unauthorized content.
- Prefer configured Cloudflare Images/Stream/R2 according to media type; use a storage abstraction and a durable server-storage fallback only when Cloudflare is unavailable/unconfigured. Keep private artwork protected; display real processing/upload errors.
- Replace raw JSON CRUD with understandable admin forms for content, products, filters, reviews, media, navigation, SEO and settings. All supported content/images/videos and configurable business details must persist in the backend and be editable without source-code changes.
- Keep optional Shopify Option B as a modular direct integration only if separately approved and configured. Do not migrate the application to Shopify or make the website depend on Shopify credentials.

ENGINEERING PROCESS
1. Initialize the project structure and define the initial API/schema contract from this master brief.
2. Add/confirm route and component architecture.
3. Implement design system/header/footer/loading/error skeletons.
4. Implement catalogue, search/filter and product pages.
5. Implement product-specific configurator + preview + secure upload integration.
6. Implement cart, auth, checkout and payment states.
7. Implement account/quote/support pages.
8. Implement web admin pages and notification inbox.
9. Add tests and accessibility/performance checks.
10. Run formatting, lint, typecheck, unit tests, e2e tests where configured, and production build. Fix failures rather than suppressing them.

Do not call the work production-ready until APIs are connected, auth/permissions are respected, forms have real validation, tests pass, loading/error states exist, and the production build succeeds. At completion, report implemented routes/components, API endpoints assumed/used, tests and exact results, remaining issues, configuration required, and next steps. Do not claim a real payment/push integration succeeded unless tested against the appropriate sandbox/test environment.
```

### PROMPT 2 — Build the secure production backend API

```text
You are the senior backend architect for DisplayDelight. Build a new production-grade FastAPI backend from scratch in the new project workspace according to /docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md. Establish a clean module structure, PostgreSQL schema, SQLAlchemy models, Alembic migrations, typed Pydantic schemas, service/repository boundaries, authentication, permissions, and OpenAPI contract. Use supplied documents and product data as requirements, not as evidence that existing tables/routes are available. Implement the backend rather than stopping at an implementation plan.

STACK AND STRUCTURE
Use currently supported Python, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL, async-compatible database access/pooling, Redis for cache/job coordination where useful, and a background worker. Use a modular structure: API routers, DTO/schema validation, services/use cases, domain rules, repositories, integrations and tests. Version all APIs under `/api/v1`. Publish OpenAPI and document error responses. Include local development setup, migration commands, seed strategy that never claims seed data is real client catalog data, Docker configuration where useful, health/readiness endpoints and environment configuration.

DOMAIN MODULES
Implement auth/users/roles/permissions, catalog/categories/attributes/variants/media, product customization profiles/fields/rules, price calculation, inventory/reservations, cart, checkout/orders, Razorpay payments/webhooks/refunds, GST/tax, shipping, coupons, quotes/leads/follow-up reminders, customer content/CMS, uploads/storage, SMTP/email templates/logs, WhatsApp configuration/link building, settings/integrations, notification inbox/push device registration/delivery/outbox, audit logs and observability. Do not implement a dedicated bulk-order feature, request entity, route, table, or admin API. Normal product cart quantities and configured quantity pricing may remain.

V3 REQUIRED BACKEND UPDATES
- Create a clean frontend application using the approved new-project stack and define explicit typed API contracts shared with the new backend.
- Import the complete supplied Digital Signage Product Catalogue into draft/staging records after parsing every page/table. Keep Dealer Price, MOP, MOP 1 and approved storefront price distinct. Never silently choose an unapproved column or publish uncertain stock, tax, warranty or shipping data.
- Implement typed category-aware product attributes and server-driven facets. Add filter metadata routes only when equivalent APIs are missing. Query/filter/sort/paginate on the server and test multi-filter combinations.
- Add product review submission, listing and admin moderation. Only backend purchase validation can mark a review as verified. Never generate fake reviews or ratings.
- Implement customer/admin login/profile, password reset and verification flows, session handling and secure SMTP/email integration. Provide masked secrets and a Send Test Email action; never leak credentials or log reset tokens.
- Implement the V3 payment-first flow: create a durable server-side checkout/payment session with cart/configuration/pricing snapshots; calculate the entire payable total before payment using approved rules; create Razorpay order server-side; verify payment and signed webhooks idempotently; persist `PAID_DETAILS_PENDING`; accept customer/business/contact/address details only after verified payment; link them to the same session; then move to order-confirmed state. Provide secure resume/recovery, admin visibility for pending details, duplicate-prevention and reconciliation. If address-dependent GST/shipping makes the final total unknown before payment, block payment and expose the missing policy instead of inventing charges.
- Implement a storage-provider abstraction prioritizing configured Cloudflare Images/Stream/R2 as appropriate. If a Cloudflare service is unavailable/unconfigured, use durable configured server storage when safe; never use an ephemeral filesystem as a claimed persistent fallback. Do not bypass auth errors by falling back. Keep private artwork private and media metadata in the database.
- Support video upload processing state and permitted Instagram post/Reel URL/embed metadata. Do not download/scrape unauthorized Instagram content.
- Ensure all supported homepage/CMS/navigation/category filter/media/SEO/contact/social/map content is manageable through friendly Admin Panel forms, persisted through APIs, and cache-invalidated on publication.
- Preserve Shopify Option B as an optional, isolated service only if approved/enabled. Verify Shopify webhooks, enforce idempotency, define source of truth and keep core commerce functional when Shopify is disabled.
- Add real automated tests for responsive endpoints/UI flows, facets, reviews, email, payment-first details-pending state, Cloudflare failure/fallback and optional Shopify sync.

DATA AND MIGRATIONS
Design normalized PostgreSQL tables with foreign keys, constraints, safe indexes, UTC timestamps and Alembic migrations. Include order price/configuration snapshots and rule versions so later catalog edits do not rewrite history. Include tables for customization profiles, ordered field definitions, conditional rules, allowed option values, safe price effects, asset metadata, private uploads, notification devices/preferences/outbox/delivery attempts. Do not store private files as public blobs. No `bulk_order_requests` or `bulk_order_items` tables. Add migration tests and database constraints for uniqueness and state transitions.

CUSTOMIZATION API
Products can be simple, variant-based, quote-only or customizable. The backend returns each product's enabled profile/schema and only the options valid for it. Support configurable fields (select/radio/checkbox/color/text/font/dimension/artwork/template/front-back/notes), required/optional rules, condition visibility, limits and allowed file types. Use safe, versioned rule interpretation; never `eval`, arbitrary Python code execution, arbitrary JS, or unrestricted expressions. Provide an authoritative price-preview endpoint that validates selections and returns a breakdown; do not trust frontend-sent totals. Validate customization again at cart and checkout. Persist normalized option values, uploaded asset IDs, profile version and a readable summary in cart/order/quote snapshots.

UPLOAD SECURITY
Implement an authorized pre-signed URL or equivalent flow for object storage. Use generated object keys. Validate extension and actual file signature/MIME/size, enforce admin-configured allowed formats, verify ownership when completion is reported, and keep user artwork private by default. Use signed, expiring URLs to read it. Do not allow untrusted HTML/SVG execution; reject or sanitize/rasterize SVG only if deliberately supported. Add status for pending, uploaded, validated, rejected and quarantined uploads; hooks for malware scanning if available. Avoid passing large files through API memory unnecessarily.

COMMERCE AND PAYMENT
Implement browse/search/filter endpoints with pagination and safe query construction; customer auth/session and addresses; cart operations; coupon validation; server-calculated price/GST/shipping; order creation with idempotency; inventory reservation; Razorpay order creation; signature verification; signed webhook verification; persistent webhook event IDs; payment status reconciliation; refunds/history where approved; invoices; shipping and tracking state. Razorpay browser return is not the source of truth. Treat webhooks as asynchronous/retryable and idempotent. Handle duplicate/out-of-order webhooks, payment timeout and retry without duplicate paid orders. Never trust client product price, stock, coupon discount, tax, shipping, role or payment status.

CONFIGURATION
Provide admin-authorized settings APIs for Razorpay test/live config, SMTP, object storage, WhatsApp messages/contact, GST/tax, shipping, site content and notification preferences. Encrypt sensitive integration credentials at rest, mask secrets from API output, never log secrets, and write all changes to audit log. Provide Send Test Email, storage verification and payment credential verification where technically safe. Use environment/secret-manager settings as bootstrap fallback. Changes must invalidate relevant Redis/app cache and take effect safely without redeploy for ordinary settings. Never expose privileged Firebase/FCM service credentials to web/mobile clients; keep server credentials in a secrets manager or tightly restricted encrypted server-side configuration.

NOTIFICATIONS AND FCM
Use a durable transactional outbox or equivalent so domain transactions and event records are consistent. Worker dispatch should persist inbox notifications, determine recipients through roles/permissions/preferences, send FCM push to registered admin devices and email as configured, record delivery status/provider ID, deduplicate and retry transient failures with capped exponential backoff. Avoid undoing an order when a push/email fails. Support token register/deactivate, unread count, list, mark read/mark all read, preferences, test push and role-protected delivery diagnostics. Remove stale device tokens. Push payloads contain only safe identifiers and minimal text; fetch private resource detail after authorized app navigation. Provide real-time SSE/WebSocket only if chosen architecture and deployment can secure it; otherwise support reliable inbox polling.

AUTH AND SECURITY
Implement secure login/logout/refresh, email verification, password reset, session expiration/revocation, robust password hashing, rate limiting, admin 2FA requirement for high-privilege roles, RBAC at every private route, CSRF controls if cookie auth is used, explicit CORS, security headers where relevant, parameterized database access, safe file uploads and audit logs. Prevent IDOR by verifying access to order, quote, asset and notification ownership on every request. Avoid exposing raw stack traces, PII or secrets to clients.

PERFORMANCE AND OPERATIONS
Use database pooling, async external I/O, bounded paginated queries, correct indexes and query plans, Redis only where it improves measured performance, timeouts, retries only for safe/idempotent calls, background work for SMTP/push/media/PDF/reminders, structured logs, correlation IDs, error tracking hooks, health/readiness endpoints and metrics. Do not query the database for static public content on every request unnecessarily. Include index/query/performance notes and avoid N+1 patterns. Provide safe caching with invalidation; never blindly cache orders/payments/inventory/permissions.

TESTS AND DELIVERABLES
Create unit, repository/API integration, migration, security and end-to-end-relevant tests. Required tests include pricing and rule validation, conditional custom fields, coupon/tax calculations, inventory race prevention, checkout idempotency, Razorpay invalid/valid signature and duplicate webhook, auth/RBAC, upload permission/type/size checks, notification outbox retry/deduplication/invalid token, audit logging, secret masking and configuration validation. Configure test mode for Razorpay; never fabricate live keys. Include `.env.example` with safe placeholders only, migration instructions, background worker commands, OpenAPI output and staging/production notes. Run lint/typecheck as appropriate, tests and migration checks. Report exact outcomes and unresolved decisions. Do not state “production-ready” if critical tests are failing or a required provider credential is missing.
```

### PROMPT 3 — Build the cross-platform Flutter Admin Companion App with push alerts

```text
You are the senior Flutter architect for DisplayDelight. Create a production-minded, platform-independent Admin Companion App from scratch following `/docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md` and the new backend OpenAPI contract. The app is for authorized staff, not public customers. It must share the same backend, permissions, business rules and records as the new web admin. Do not create a separate database or duplicate order/pricing business logic in Dart.

PLATFORMS AND STACK
Use the current stable Flutter/Dart release at implementation time and pin versions in the project lockfile. Target Android and iOS first. Use adaptive/responsive components and organize the app so web/Windows/macOS targets can be added and tested without rewriting domain logic. Keep the Next.js web admin as the full-featured browser control panel. Use a clean structure with app/router, feature modules, typed API client, repositories, models, state management, secure session storage, notification service and platform-specific adapters. Select a well-maintained state-management/navigation approach suited to the repository; explain the choice and avoid excessive dependencies.

SCREENS
Implement branded splash/session restore, sign in, dashboard, orders list/detail, quote/enquiry inbox/detail, notifications inbox, low-stock view if role permits, profile/security/settings, notification preferences and access-denied/empty/error/offline/session-expired states. Use role-specific dashboards and navigation. Staff should be able to tap an alert and reach the relevant order or enquiry in very few steps. Use server pagination, pull-to-refresh where suitable, stable list keys, loading skeletons and safe retry behavior. Full content/CMS editing can remain on the web admin for the first release unless the API and brief explicitly support an app workflow.

AUTHENTICATION AND API
Use one typed API client for `/api/v1`; parse standard error envelopes, handle timeouts, auth expiry and safe refresh. Store tokens/session data using platform secure storage; never plain text shared preferences for secrets. Check permissions with server responses, not only local role flags. Do not store privileged credentials in source or app assets. Ensure logout unregisters/deactivates device notification association as defined by backend and clears sensitive cached data. Add environment-configurable API base URL for local/staging/production; production endpoints must use HTTPS.

PUSH NOTIFICATIONS
Integrate Firebase Cloud Messaging (FCM) for Android/iOS with the official platform setup; ensure APNs credentials/capabilities are configured for iOS in the release instructions. Do not hard-code server credentials or FCM server keys inside the app. On authenticated startup, request/register the device token after appropriate permission UX, register it through the backend admin device endpoint, refresh tokens as required, and deactivate/unregister on logout/device removal. Provide a settings test-push action only if the backend permission allows it.

Support notification behavior in foreground, background and terminated app states. In foreground, show an accessible in-app banner and update the inbox. On push tap, parse only a safe notification ID/resource type/resource ID, restore session if possible, fetch the resource through API, re-check access and route to the correct detail page. If signed out or permission is denied, present safe login/unavailable behavior. Notifications must never include secret keys, full addresses, raw payment information or private artwork URL. Do not rely solely on push delivery—load inbox notifications from the backend and show unread counts.

Notification screen must support loading, pagination, unread/read state, mark-as-read, mark-all-read, timestamp/priority/category, empty/error state and refresh. Test new order, payment failure, new quote/enquiry, low stock, integration failure, token expired, network lost, duplicate push, invalid deep link, logout and revoked role scenarios. Handle Android notification channels and iOS authorization appropriately.

PERFORMANCE AND RELIABILITY
Keep first frame and dashboard shell lean; lazy-load large sections/charts; paginate; cache safe low-risk data only; show last-updated status for cached information. Add offline/connection error indicators, request timeouts, cancellation and safe retry. Avoid retry loops for non-idempotent mutations. Make navigation responsive on phone/tablet; if web/desktop is enabled, adapt layouts instead of stretching the mobile UI. No artificial splash delay. Push delivery latency cannot be guaranteed by client code, so persist all alerts in the backend inbox and show delivery diagnostics where allowed.

TESTING AND RELEASE
Add unit/widget tests for API parsing, session expiry, role-based screens, notification routing and read/unread state. Add integration-test instructions for real Android/iOS devices, including permission denied, foreground/background/terminated states. Produce platform setup documentation for Firebase project config and iOS APNs. Include debug/staging/release flavors or a safe environment strategy. Do not include real Firebase private credentials in repo. Verify Android build; report if iOS builds require macOS/Xcode unavailable in the current environment. If Flutter web/desktop cannot be fully tested in this pass, label it as not release-verified rather than claiming support.

At completion report files changed, app screens, platform targets actually built/tested, FCM/APNs steps still needed, API endpoints, test command/results and release blockers. Do not fake push notifications or claim that remote push works without a real test device/provider configuration.
```

### PROMPT 4 — Connect frontend, backend, and Flutter app; harden for production

```text
Act as the integration lead and release engineer for the DisplayDelight platform. Use `/docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md` as the final agreed implementation source. Inspect the newly created frontend, FastAPI backend and Flutter app code after initial implementation and before integration changes. Build and verify the end-to-end connection among the new Next.js customer storefront, new Next.js web admin, FastAPI API/PostgreSQL, object storage, Razorpay test mode, notification worker/FCM and Flutter admin app. Do not create fake integrations or replace real API calls with hard-coded mock responses outside tests.

PHASE 1 — CONTRACT ALIGNMENT
1. Generate/read the new backend OpenAPI document and compare every frontend/app endpoint and data model.
2. Correct mismatched route names, field names, IDs, enums, pagination, date/price formats, upload states and error envelopes.
3. Generate or maintain typed TypeScript clients/types from OpenAPI where practical; maintain typed Dart models for the same contract.
4. Document API origin and credentials/secret configuration per local, staging and production environments.
5. Add contract tests so a future backend change does not silently break either client.

V3 INTEGRATION REQUIREMENTS
1. Verify the homepage CMS and all supported admin-managed content fields are backed by real APIs/database state; publish/edit actions must invalidate/revalidate correct public caches.
2. Test category-aware facets end-to-end and confirm every shown filter is backed by actual category attributes and API results.
3. Test genuine review creation/moderation and verified-purchase logic.
4. Test the new payment-first flow: payable amount → Razorpay test payment → server verification → durable paid-details-pending session → customer details → order completion; test browser close/resume, failed payment, duplicate webhooks and idempotency.
5. Test SMTP verification/reset/order emails with test accounts and never log secrets.
6. Test Cloudflare-first image/video storage and durable server-storage fallback without using an ephemeral filesystem or bypassing authorization.
7. Test Instagram URL validation/approved embeds and original video upload/processing.
8. Test customer/admin profile access and role permissions at all supported viewport sizes.
9. If Shopify Option B is enabled, test signed webhook handling, product/stock/order sync, duplicate-event handling and integration-disabled behaviour.

PHASE 2 — AUTH AND ROLE SAFETY
1. Verify register/login/logout/refresh/verification/reset.
2. Verify guest browsing and the V3 payment-first checkout: no customer details before payment; details only after server-verified payment; secure session recovery when details are incomplete.
3. Verify browser and app session handling, expiry, logout and unauthorized response behavior.
4. Test every admin role against frontend buttons and backend endpoints, including settings, orders, leads, files, notifications, push token operations and audit logs.
5. Fix IDOR risks: a customer or admin must not access another user's order/quote/artwork/notification without explicit permission.

PHASE 3 — END-TO-END PRODUCT CONFIGURATION
1. Seed a clearly labeled local/test product with its own mockup/customization profile only in development/test data.
2. Confirm the frontend fetches the product configuration profile from FastAPI and renders only applicable fields.
3. Confirm options, conditionals, required fields, file upload, preview, front/back where enabled, validation and server price preview.
4. Verify uploaded artwork stays private and authorized access expires correctly.
5. Add a customized product to cart, refresh, sign in, edit the configuration, recalculate price, checkout and confirm the order snapshot persists.
6. Verify a different non-customizable product does not display customizer controls.

PHASE 4 — COMMERCE AND PAYMENTS
1. Test cart quantities, coupon eligibility/limits, price snapshots, GST display mode, shipping rules and inventory reservations.
2. Connect Razorpay test mode; create payment orders only on the backend, verify callback signatures server-side, validate webhook signatures, persist webhook IDs, and reconcile delayed events.
3. Test successful/failed/cancelled/retried payment, duplicate button submissions, duplicate/late webhooks and stock race conditions.
4. Confirm no false success UI and no duplicate paid orders.
5. Verify invoice/order emails are queued safely and can fail/retry without blocking checkout.

PHASE 5 — ADMIN WEB + FLUTTER APP + NOTIFICATIONS
1. Register Android/iOS device tokens to the authenticated user and keep token lifecycle consistent.
2. Trigger a new paid order and a new quote/enquiry; verify one durable notification record and the intended recipients.
3. Verify web admin unread count/inbox refresh and Flutter FCM foreground/background/terminated behavior.
4. Tap push and confirm login/role check/deep link to the correct order or quote.
5. Test disabled permissions, stale tokens, delivery retry, duplicate events, logout, revoked role, notification preference and no sensitive payload data.
6. Confirm push/email failure never undoes a successful order/payment.
7. Test email/SMTP with the admin Send Test Email function and verify failure state/logging.

PHASE 6 — PERFORMANCE, ACCESSIBILITY, SECURITY AND OPS
- Run production Next.js build and measure Lighthouse/Core Web Vitals on key routes.
- Analyze frontend bundle size; prove customization canvas and admin charts are lazy-loaded.
- Test product image resizing/CDN caching and cache revalidation after admin edits.
- Run API p95/load tests for public catalogue/search/cart/checkout/notifications at agreed concurrency.
- Check DB query counts/indexes, Redis behavior and worker retry limits.
- Scan code/bundles for accidentally exposed secrets and unsafe file-upload paths.
- Validate CORS, CSRF strategy, rate limits, security headers, auth, role access, input validation and audit logs.
- Verify environment variables, migrations, backup/restore, health probes, logs, monitoring and separate staging/production resources.
- Verify all loading states terminate correctly under slow network/API errors and no fake fixed delay remains.

PHASE 7 — RELEASE OUTPUT
Produce a clear status report with:
- Implemented features and routes per client.
- API and schema contract summary.
- Test commands and exact pass/fail results.
- Build results for Next.js, FastAPI and each platform actually compiled for Flutter.
- Razorpay sandbox test result and FCM/APNs delivery test result (only if actually performed).
- Performance measurements and the environment in which measured.
- Environment variables and provider setup still required.
- Open client decisions and release blockers.
- Staging deployment and production rollout/rollback steps.

Never claim a task passed if it was not run. Do not mark production-ready while critical tests, security items, payment verification, private artwork access, backups or required notification configuration remain broken. Fix failures first and keep this master brief updated if an approved design/API decision changes.
```

---

## 14. Suggested Repository Layout

Use a monorepo if practical so one shared master brief and contract can guide all projects:

```text
displaydelight/
  docs/
    DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md
    api-contract-notes.md
    deployment-runbook.md
  apps/
    storefront/             # Next.js customer storefront
    admin-web/              # Next.js admin (may share frontend workspace/packages)
    admin-mobile/            # Flutter Android/iOS app
  services/
    api/                     # FastAPI application
    worker/                  # Background jobs/notification dispatch (may share API package)
  packages/
    ui/                      # Shared web UI/design tokens if useful
    api-types/               # Generated/shared contract types if useful
  infra/
    docker/
    deployment/
  tests/
    e2e/
    contract/
  .env.example
  README.md
```

This is a suggested structure, not a requirement to split into microservices. Avoid unnecessary services. The main backend can include API routers and worker tasks in one repository while deployed as separate processes.

---

## 15. Environment and Deployment Checklist

Use distinct `.env`/secret sets for local, staging and production. Provide `.env.example` with names and safe placeholders, never production values.

Possible server-side settings (adapt to the code):

```text
APP_ENV=
PUBLIC_SITE_URL=
ADMIN_SITE_URL=
API_BASE_URL=
DATABASE_URL=
REDIS_URL=
AUTH_SECRET_KEY=
ENCRYPTION_KEY=
CORS_ALLOWED_ORIGINS=
OBJECT_STORAGE_PROVIDER=
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY_ID=
OBJECT_STORAGE_SECRET_ACCESS_KEY=
OBJECT_STORAGE_PUBLIC_CDN_URL=
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_NAME=
SMTP_FROM_EMAIL=
FCM_PROJECT_ID=
FCM_SERVER_CREDENTIALS_SECRET_REF=
SENTRY_DSN=
ANALYTICS_ID=
```

Only genuinely public values may use a `NEXT_PUBLIC_` prefix. Database URLs, Razorpay secrets, SMTP password, encryption keys, FCM server credentials and storage secret keys must be server-only.

Before launch:

- Confirm domain/DNS/HTTPS and email deliverability (SPF/DKIM/DMARC where applicable).
- Configure Razorpay test mode and complete end-to-end tests before live keys are added.
- Configure object storage bucket/private artwork policy and CDN rules.
- Configure FCM/Android app IDs and iOS bundle ID/APNs credentials; test real push on each supported mobile platform.
- Set CORS/CSRF/security headers and admin 2FA.
- Run migrations on staging, populate real approved catalogue/product images, test all product customizer profiles, and get legal policy copy approved.
- Test database backup restore, application health endpoints, background worker restarts, email failure, payment webhook retry and notification retry.
- Validate mobile app signing, privacy disclosures, permissions, versioning, store metadata and release build signing before distribution.
- Conduct a staging sign-off and production smoke test.

---

## 16. Open Decisions to Confirm Before Production

Do not fabricate decisions for the following. Build configuration points and mark the feature blocked from live release until confirmed where necessary:

1. **Launch date:** the requirement questionnaire's date appears inconsistent with its meeting date; obtain the correct launch date.
2. **GSTIN policy:** confirm whether GSTIN is mandatory for every checkout or optional for non-GST customers/businesses.
3. **Purchase order number and delivery instructions:** confirm which fields must be mandatory for every order.
4. **Shipping:** confirm carrier/provider, shipping zones/rates/formula, delivery SLA and oversize/freight rules.
5. **Returns/refunds/warranty:** approve final terms, non-returnable products, refund calculation/timing and warranty period by product.
6. **Product data:** provide final product master sheet, SKU/variant stock, price/tax data, customization support flags, size/option values and approved preview mockups/artwork zones.
7. **Product quote behavior:** identify products that are quote-only versus both purchase and quote.
8. **Payments:** verify Razorpay account/KYC, test/live credentials and webhook setup.
9. **Email:** set up a business email domain and confirm SMTP provider/sender.
10. **Hosting/storage:** approve hosting provider, database/Redis service, storage bucket and Cloudflare/CDN configuration.
11. **Flutter app distribution:** decide public app stores versus private/internal distribution, release owners, supported minimum OS versions and whether Flutter Web/desktop should be released in V1 or later.
12. **Notifications:** confirm who receives which event, push/email preferences, working hours/quiet hours if any, and whether Sales/Operations users need staff assignments.
13. **Artwork proof/approval:** confirm whether customized orders proceed automatically or require admin artwork approval before production.
14. **GST display and price policy:** confirm whether product listings show prices inclusive or exclusive of GST by default.

---

## 17. First Implementation Order

1. Create a new DisplayDelight V3 repository/workspace and commit this master brief to `/docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md`.
2. Inventory all supplied reference files: product catalogue, client requirements, PRD/TRD, architecture/workflow diagrams, logo and design guide. Record uncertainties rather than inventing missing data.
3. Establish the greenfield system architecture, repository structure, environment configuration, design tokens, API conventions, database schema and OpenAPI contract.
4. Build the design system and responsive customer storefront foundation, then the premium product-first homepage, navigation/Shop mega menu, CMS structure and category/search experience.
5. Implement catalogue/category management, product attributes, category-aware facets, product details, product-specific customization and server-authoritative price preview.
6. Import the supplied product catalogue into draft/review records, preserve distinct original pricing columns, and require explicit approval before publishing uncertain selling prices or technical details.
7. Build the web Admin Panel and its friendly CRUD/CMS/media/SEO/navigation/configuration interfaces. Build the Flutter Admin Companion against the same API contract.
8. Implement customer/admin authentication, profiles, email verification/password recovery, SMTP integration and authorization.
9. Implement cart and the V3 Razorpay payment-first checkout with durable checkout sessions, verified payment, `PAID_DETAILS_PENDING`, secure resume, post-payment customer details and duplicate prevention.
10. Implement reviews/moderation, quote requests, order tracking, wishlist, comparison, notifications, gallery/video/Instagram content, Cloudflare-first storage and durable server-storage fallback.
11. Keep Shopify Option B modular and disabled until the client approves it and supplies store credentials/permissions/sync rules.
12. Run database migration tests, unit/API/security tests, responsive browser tests, payment test-mode tests, storage fallback tests, email tests and cross-client contract tests.
13. Deploy to staging, import/approve real business data, confirm unresolved price/GST/shipping/legal/content decisions, obtain client sign-off, then deploy production with backups, monitoring and a rollback plan.
---

## 18. V3 QA Console

For a separate test-dashboard application, use the companion prompt pack `DisplayDelight_V3_AI_Prompts.md` to generate a Google AI Studio QA Console for the newly created DisplayDelight V3 staging application. It must target only configured staging/test systems, use real test results (PASS/FAIL/BLOCKED), support API and responsive checks, exercise Razorpay test mode only, and never expose credentials or fabricate successful checks. The QA Console is supplemental: it does not replace pytest, Playwright, contract tests, or manual device verification.

---

## 19. Official Technical References

Check current documentation and release/security advisories at implementation time; pin compatible versions and do not blindly follow outdated examples.

- Next.js production checklist: https://nextjs.org/docs/pages/guides/production-checklist
- Flutter supported deployment platforms: https://docs.flutter.dev/reference/supported-platforms
- Flutter multi-platform integration guidance: https://docs.flutter.dev/platform-integration
- Firebase Cloud Messaging for Flutter setup: https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- Firebase Cloud Messaging receive behavior: https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- FastAPI documentation: https://fastapi.tiangolo.com/tutorial/
- PostgreSQL documentation: https://www.postgresql.org/docs/current/
- Redis documentation: https://redis.io/docs/latest/
- Razorpay integration documentation: https://razorpay.com/docs/

---

## Final instruction

**Build one coherent new product from scratch, not disconnected demos.** The storefront, web admin, backend, and Flutter Admin Companion App must share a secure, documented API and consistent permissions. Product customization must be configured per product, previewed by the customer, validated and priced by the backend, and preserved on the order. V3 additionally requires a more attractive product-first homepage; real category-aware filters; responsive layouts across phones, tablets, 14/15/16-inch laptops and large desktops; customer reviews; improved customer/admin login and profiles; email integration; Cloudflare-first media with safe durable server fallback; uploaded and permitted Instagram video content; full admin editing through friendly forms; and the approved payment-first Razorpay flow with customer details collected only after verified payment. Optional Shopify integration stays modular. Notification records must be durable even when push/email delivery fails. Performance, security, testing and operational readiness are acceptance criteria—not optional polish.
