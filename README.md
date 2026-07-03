# BooklyX Backend

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![Project Status](https://img.shields.io/badge/Project_Status-Completed-success?style=flat-square)

> **BooklyX** is a full-featured appointment booking platform backend built as a graduation project. It connects clients with service businesses (salons, clinics, barbershops, spas), allowing clients to discover nearby branches, book appointments, and make payments — while giving branch owners and staff a complete management dashboard.

---

## What Was Built

BooklyX is the **server-side API** that powers the entire BooklyX platform. Think of it as the "engine" behind the mobile and web applications. Here is what it enables:

| Role | What they can do |
|---|---|
| **Client (App User)** | Register, discover nearby branches on a map, browse services and offers, book appointments, pay, cancel (with refund), leave reviews, manage favourites |
| **Branch Admin (Business Owner)** | Apply for a branch, manage staff, add/edit services and offers, view appointments and earnings, manage subscription plan, configure availability |
| **Staff Member** | View assigned appointments, start and complete services, view personal schedule and income |
| **Super Admin (Platform Owner)** | Approve/reject branch applications, manage subscription plans, view platform-wide analytics and revenue charts, moderate services |

### Key Technical Highlights

- **Secure Authentication** — JWT-based login with email + phone OTP verification, refresh tokens, and password reset flow
- **Multi-Role Access Control** — 4 distinct roles (`client`, `branch_admin`, `staff`, `super_admin`) with platform-aware guards (`APP` / `WEB`)
- **WAF Protection** — All production requests are validated by a Web Application Firewall layer before reaching the API
- **Geolocation Search** — Clients can discover branches by distance using MySQL spatial queries (`ST_Distance_Sphere`)
- **File Uploads** — Profile images, branch logos, and service images are uploaded to Cloudinary
- **Bilingual API** — Full Arabic/English localization on all responses and error messages
- **Subscription & Plans** — Branch admins subscribe to plans that gate features (max staff, max services, offers, loyalty)
- **Payments & Refunds** — Appointments require payment to confirm; cancellations trigger refund flow with a discrete `REFUNDED` status
- **OpenAPI Documentation** — Full API contract maintained in `openapi.yaml`, synced to Apidog
- **Automated Tests** — Jest test suites covering auth, middleware, and core service logic

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Common Headers](#common-headers)
- [Development OTP Note](#development-otp-note)
- [Seeded Accounts](#seeded-accounts)
- [Typical Flows](#typical-flows)
- [Useful Commands](#useful-commands)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Deployment Notes](#deployment-notes)
- [Additional Docs](#additional-docs)

---

## System Architecture

All incoming traffic must pass validation by the Web Application Firewall (WAF) before it is processed by the Express backend.

```text
┌──────────────────────┐        1. Request        ┌────────────────────────┐
│ Client App (App/Web) │ ───────────────────────> │  WAF (Firewall Guard)  │
└──────────────────────┘                          └────────────────────────┘
                                                              │
                                                              │ 2. Validates & Forwards
                                                              ▼
┌──────────────────────┐      3. Operations       ┌────────────────────────┐
│    MySQL Database    │ <─────────────────────── │  Express Backend API   │
└──────────────────────┘                          └────────────────────────┘
```

- **Production API:** `https://booklyxbackend-production.up.railway.app`
- **Local dev server:** `http://localhost:3000`
- **API style:** JSON REST API
- **Auth:** Bearer JWT (`<loginSequence>|<jwt>`)
- **Localization:** `Accept-Language: en` or `ar`
- **Platform header:** `platform: APP` or `WEB`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| ORM | Prisma 6 |
| Database | MySQL |
| Validation | Zod |
| Auth | JSON Web Tokens (JWT) + bcrypt |
| File Storage | Cloudinary |
| Email | Nodemailer |
| Testing | Jest |
| API Docs | OpenAPI 3 (synced to Apidog) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file (use `.env.example` as a template):

```bash
DATABASE_URL=
JWT_SECRET=
NODE_ENV=development
PORT=3000
VERIFICATION_CODE_EXPIRES_MINUTES=10

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional email config
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

# Optional Apidog sync
APIDOG_ACCESS_TOKEN=
APIDOG_PROJECT_ID=
APIDOG_LOCALE=en-US
APIDOG_API_VERSION=2024-03-28
OPENAPI_SPEC_FILE=openapi.yaml
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

For local development after schema changes:

```bash
npx prisma migrate dev
```

### 4. Seed demo data

```bash
npx prisma db seed
```

### 5. Start the server

```bash
npm run dev
```

---

## Common Headers

```http
Content-Type: application/json
Accept-Language: en
platform: APP
Authorization: Bearer <token>
```

Access token format: `<loginSequence>|<jwt>` (example: `15|eyJ...`).

Some endpoints require `platform: WEB` — for example all `/admin/*` and most `/branch-admin/*` routes.

---

## Development OTP Note

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP usage is blocked.

---

## Seeded Accounts

Run `npx prisma db seed` first.

### Super Admin

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@booklyx.com` |
| Password | `12345678`          |
| Phone    | `01000000000`       |
| Platform | `WEB`               |
| Role     | `super_admin`       |

### Client Accounts

| Name        | Email                     | Password   | Phone         |
| ----------- | ------------------------- | ---------- | ------------- |
| Abdo Khalil | `abdo.khalil@booklyx.com` | `12345678` | `01000000001` |
| Eslam Wael  | `eslam.wael@booklyx.com`  | `12345678` | `01000000002` |

### Staff Accounts

| Name        | Email                     | Password   | Phone         |
| ----------- | ------------------------- | ---------- | ------------- |
| Mazen Tamer | `mazen.tamer@booklyx.com` | `12345678` | `01000000021` |
| Abdo Badr   | `abdo.badr@booklyx.com`   | `12345678` | `01000000022` |

### Branch Admin Accounts

| Owner Name      | Email                         | Password   | Phone         | Business Name       | Category  |
| --------------- | ----------------------------- | ---------- | ------------- | ------------------- | --------- |
| Mahmoud Ibrahim | `mahmoud.ibrahim@booklyx.com` | `12345678` | `01000000011` | Hassan Beauty Salon | `SPA`     |
| Ahmed Samir     | `ahmed.samir@booklyx.com`     | `12345678` | `01000000012` | Samir Health Clinic | `CLINIC`  |
| Eslam Wael      | `eslam.branch@booklyx.com`    | `12345678` | `01000000020` | Eslam Premium Spa   | `SPA`     |

---

## Typical Flows

### Client registration

```text
1. POST /auth/register
2. POST /auth/verify-email  (OTP: 333333 in dev)
3. POST /auth/verify-phone  (OTP: 333333 in dev)
4. Use the returned token for protected endpoints
```

### Branch admin onboarding

```text
1. POST /branch-admin/apply
2. POST /branch-admin/verify-email
3. POST /branch-admin/verify-phone
4. Wait for super_admin approval via /admin/applications
5. POST /auth/login  (role: branch_admin)
6. POST /branch-admin/staff        — add staff members
7. POST /branch-admin/services     — add services
```

### Staff typical flow

```text
1. POST /auth/login  (role: staff)
2. GET  /staff/profile
3. GET  /staff/appointments        (defaults to PENDING)
4. GET  /staff/schedule            (daily plan)
5. PATCH /staff/appointments/:id/start
6. PATCH /staff/appointments/:id/complete
```

### Super admin access

```text
1. POST /auth/login  (role: super_admin, platform: WEB)
2. GET  /admin/applications        — review pending branches
3. PATCH /admin/applications/:id/approve or /reject
4. GET  /admin/analytics/overview
5. GET  /admin/analytics/revenue-chart
```

---

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server with hot reload
npm start                      # Start production server
npm run test                   # Run Jest test suite

# Database
npx prisma generate            # Regenerate Prisma client after schema changes
npx prisma migrate dev         # Create and apply a new migration (dev)
npx prisma migrate deploy      # Apply existing migrations (production)
npx prisma db seed             # Seed the database with demo data
npx prisma studio              # Open Prisma Studio (visual DB browser)

# API contract
npm run openapi:validate       # Validate openapi.yaml against the OpenAPI spec
npm run apidog:sync            # Sync openapi.yaml to Apidog

# Local API session helpers
npm run api:login -- --role client --email user@example.com --password 12345678 --platform APP
npm run api:refresh -- --role client --platform APP
npm run api:session
npm run api:logout
npm run api:export:apidog
npm run api:export:env
```

---

## API Documentation

The full API contract lives in `openapi.yaml`. This is the single source of truth for all endpoints.

- [`openapi.yaml`](./openapi.yaml) — Full OpenAPI 3 specification
- [`API.md`](./API.md) — High-level API overview
- [`docs/apidog-guide.md`](./docs/apidog-guide.md) — Guide for using Apidog with this project

```bash
# Validate the spec
npm run openapi:validate

# Sync to Apidog (requires APIDOG_ACCESS_TOKEN in .env)
npm run apidog:sync
```

---

## Project Structure

```text
booklyX_backend/
│
├── app.js                        # Entry point
├── openapi.yaml                  # Full API specification (OpenAPI 3)
│
├── src/
│   ├── server.js                 # Express app setup, middleware registration
│   │
│   ├── routes/
│   │   └── index.js              # Root router — mounts all module routes
│   │
│   ├── middleware/
│   │   ├── authenticate.js       # JWT verification & login sequence check
│   │   ├── wafGuard.js           # WAF signature validation (production guard)
│   │   ├── errorHandler.js       # Global error handler (translates & formats errors)
│   │   ├── rateLimiter.js        # Rate limiting per endpoint
│   │   ├── upload.js             # Multer file upload configuration (Cloudinary)
│   │   └── branchAdminSubscription.js  # Subscription status guard
│   │
│   ├── modules/                  # Feature modules (Route → Controller → Service)
│   │   │
│   │   ├── auth/                 # Authentication & identity
│   │   │   ├── registration/     # Register, verify email, verify phone
│   │   │   ├── session/          # Login, logout, refresh token
│   │   │   └── password/         # Request reset, verify OTP, reset password
│   │   │
│   │   ├── client/               # Client (app user) features
│   │   │   ├── dashboard/        # Home dashboard data
│   │   │   ├── discovery/        # Map search & branch browsing
│   │   │   ├── branches/         # Branch details & public profile
│   │   │   ├── appointments/     # Book, view, cancel appointments
│   │   │   ├── offers/           # Browse available offers
│   │   │   ├── favourites/       # Save & manage favourite branches
│   │   │   ├── staff/            # View staff profiles
│   │   │   └── profile/          # Client profile management
│   │   │
│   │   ├── branch_admin/         # Branch owner features
│   │   │   ├── registration/     # Apply for a branch (onboarding)
│   │   │   ├── profile/          # Branch profile & settings
│   │   │   ├── staff/            # Manage staff members
│   │   │   ├── services/         # Manage branch services
│   │   │   ├── offers/           # Manage promotional offers
│   │   │   ├── appointments/     # View & manage appointments
│   │   │   ├── subscription/     # Renew / cancel subscription plan
│   │   │   ├── finance/          # Earnings and payment history
│   │   │   └── analytics/        # Branch-level analytics
│   │   │
│   │   ├── staff/                # Staff member features
│   │   │   ├── profile/          # Staff profile
│   │   │   ├── appointments/     # View & update appointments
│   │   │   ├── schedule/         # Daily schedule view
│   │   │   ├── availability/     # Set availability windows
│   │   │   ├── services/         # Assigned services
│   │   │   └── income/           # Earnings breakdown
│   │   │
│   │   ├── admin/                # Super admin features
│   │   │   ├── branches/         # Review and approve branch applications
│   │   │   ├── services/         # Approve/reject branch services
│   │   │   ├── payments/         # Platform payment oversight
│   │   │   ├── activities/       # Activity log
│   │   │   ├── financial/        # Platform financial summary (MoM trends)
│   │   │   └── analytics/        # Platform analytics & revenue chart
│   │   │
│   │   ├── plans/                # Subscription plan definitions
│   │   └── reviews/              # Reviews (multi-role access)
│   │
│   ├── lib/
│   │   ├── prisma.js             # Centralized Prisma client instance
│   │   ├── cloudinary.js         # Cloudinary SDK configuration
│   │   ├── email.js              # Nodemailer email sending helpers
│   │   ├── i18n/                 # Internationalization (en/ar)
│   │   │   ├── index.js          # t() translation function
│   │   │   ├── keys.js           # All translation key constants (tr.*)
│   │   │   └── locales/          # en.js and ar.js translation maps
│   │   ├── mappers/
│   │   │   └── profile.mapper.js # Centralized user/profile response shaping
│   │   └── validation/
│   │       ├── primitives.js     # Shared Zod primitives (email, phone, id…)
│   │       └── helpers.js        # safeParse wrapper and validation utilities
│   │
│   └── utils/
│       ├── AppError.js           # Base error class (status + translation key)
│       ├── asyncHandler.js       # Wraps async controllers (no try/catch needed)
│       ├── response.js           # successResponse() helper
│       ├── enums.js              # App-level (non-DB) enumerations
│       ├── subscriptionGuards.js # Plan limit enforcement helpers
│       └── period.js             # Date/period utility functions
│
├── prisma/
│   ├── schema.prisma             # Full database schema (models, enums, relations)
│   └── migrations/               # Auto-generated SQL migration history
│
├── seed/
│   ├── index.js                  # Seed entry point
│   ├── modules/                  # Per-entity seed logic (users, branches, etc.)
│   ├── generators/               # Faker-based data generators
│   ├── factories/                # Entity factory helpers
│   └── config/                   # Seed configuration & constants
│
├── scripts/
│   ├── api-session.mjs           # CLI tool for managing local API sessions/tokens
│   ├── push-apidog-openapi.mjs   # Syncs openapi.yaml to Apidog
│   ├── generate-cloudinary-assets.mjs  # Pre-uploads seed images to Cloudinary
│   ├── openapi-master-builder.js # Builds the master OpenAPI spec
│   └── translate-deepl.mjs       # Auto-translates i18n keys using DeepL
│
└── docs/
    ├── apidog-guide.md           # Apidog workflow guide
    └── postman-routes.md         # Postman collection reference
```

---

## Deployment Notes

Production startup:

```bash
npm start
```

Which runs:

```bash
prisma migrate deploy && node app.js
```

Deployed on **Railway**. Required environment variables:

```bash
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
PORT=
WAF_SHARED_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Email variables are optional unless real email sending is needed.

---

## Additional Docs

- [SETUP.md](./SETUP.md) — Detailed local setup guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Contributor workflow and conventions
- [API.md](./API.md) — API overview and route groups
- [docs/apidog-guide.md](./docs/apidog-guide.md) — Apidog integration guide
