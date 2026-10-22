# DisplayDelight V3 — Production E-Commerce Platform & Admin Console

> **Version:** 3.1 (Greenfield Build)  
> **Target Market:** India (Prices in INR, 18% GST server-verified)  
> **Master Specification:** [docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md](docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md)

---

## 1. Project Overview

DisplayDelight is a digital signage and customizable business display platform engineered for commercial clients across India (retail showrooms, corporate offices, healthcare facilities, and hospitality venues).

### Core Platform Clients & Components
1. **Customer Storefront (`src/`)**: High-performance, responsive React 19 + Vite 8 + Tailwind CSS v4 e-commerce experience featuring product catalogues, faceted filtering, interactive 2D/3D customizer studio, cart, and payment-first checkout.
2. **Web Admin Panel (`src/admin/`)**: Full-featured control center for catalogue management, category attributes, customization profiles builder, order fulfillment, review moderation, customer support, and system settings.
3. **Unified Backend API (`backend/`)**: Secure, versioned FastAPI application providing server-authoritative pricing, inventory reservation, Razorpay payments, transactional notifications, and companion device push services.
4. **Companion App Services (`backend/app/api/v1/admin/notifications.py`)**: Unified REST surface for companion mobile apps (Android & iOS) and workstation browsers with live push alert dispatching.

---

## 2. Key Architectural Guarantees & Constraints

- **Strict Prohibition of `/bulk-order`**: No dedicated bulk-order routes, forms, API endpoints, or database tables exist. Multiple units are handled via the standard cart, and bespoke corporate requirements use the **Request a Quote** feature.
- **Official Social Embeds Only**: Instagram Reels and Posts are integrated strictly via official `/p/{shortcode}/embed/` iframes. Background scraping or unauthorized downloading of social media is prohibited.
- **Server-Authoritative Pricing**: All calculations are performed in integer **paise** ($1\text{ INR} = 100\text{ paise}$). Frontend price estimates are provisional; checkout strictly binds to server-calculated totals including 18% GST.
- **V3 Payment-First Checkout Sequence**: Guests pay through Razorpay before submitting contact and delivery forms. Orders transition securely through `PAID_DETAILS_PENDING` before being promoted to `PAID`.

---

## 3. Quickstart & Local Development

### 3.1 Frontend Web Application
```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev
# Running on http://localhost:8443
```

### 3.2 Backend FastAPI Server
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

---

## 4. Testing & Quality Assurance

### 4.1 Backend Integration Tests (Pytest)
```bash
# From repository root:
backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```
*Current Status: 18 / 18 tests passing (100% Green).*

### 4.2 Frontend Static Typecheck
```bash
npx tsc --noEmit
```
*Current Status: 0 errors.*

### 4.3 Production Bundle Compilation
```bash
npm run build
```
*Current Status: Minified production bundle generated cleanly in ~2.0s.*

---

## 5. Technical Documentation Index

- [Master Build Brief V3.1](docs/DISPLAYDELIGHT_MASTER_BUILD_BRIEF.md) — Single source of truth specifications and PRD.
- [API Contract Notes](docs/api-contract-notes.md) — Complete endpoint reference, models, and data envelopes.
- [Deployment Runbook](docs/deployment-runbook.md) — Production server provisioning, systemd, Nginx, and SSL instructions.
- [Environment Template](.env.example) — Safe configuration template for staging and production.

---

## 6. License & Copyright

Copyright © 2026 DisplayDelight Pvt Ltd. All rights reserved.
