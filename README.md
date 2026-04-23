# BooklyX Backend

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)

Backend API for BooklyX, built with Node.js, Express 5, Prisma, Zod, and MySQL.

## Table of Contents

- [Overview](#overview)
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

## Overview

- Runtime: Node.js 18+
- Dev server: `http://localhost:3000`
- Production: `https://booklyxbackend-production.up.railway.app`
- API style: JSON REST API
- Auth: Bearer JWT
- Localization: `Accept-Language: en` or `ar`
- Platform header: `platform: APP` or `WEB`

Core route groups:

- `/auth`
- `/branch-admin`
- `/admin`
- `/files`

## Tech Stack

- Node.js
- Express 5
- Prisma ORM
- MySQL
- Zod validation
- Jest + Supertest

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file and provide the values your environment needs:

```bash
DATABASE_URL=
JWT_SECRET=
NODE_ENV=development
PORT=3000
VERIFICATION_CODE_EXPIRES_MINUTES=10

# Optional email config
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

# Optional Apidog sync config
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

For local development after schema changes, you can also use:

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

For testing admin-only endpoints (like `GET /admin/applications`), use the seeded `super_admin` account from the "Seeded Accounts" section below.

## Common Headers

```http
Content-Type: application/json
Accept-Language: en
platform: APP
Authorization: Bearer <token>
```

Access token format: `<loginSequence>|<jwt>` (example: `15|eyJ...`).

## Development OTP Note

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP usage is blocked.

## Seeded Accounts

### super_admin

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

### Staff Accounts (Initial)

| Name        | Email                     | Password   | Phone         |
| ----------- | ------------------------- | ---------- | ------------- |
| Mazen Tamer | `mazen.tamer@booklyx.com` | `12345678` | `01000000021` |
| Abdo Badr   | `abdo.badr@booklyx.com`   | `12345678` | `01000000022` |

### branch_admin Accounts

| Owner Name      | Email                         | Password   | Phone         | Business Name       | Category |
| --------------- | ----------------------------- | ---------- | ------------- | ------------------- | -------- |
| Mahmoud Ibrahim | `mahmoud.ibrahim@booklyx.com` | `12345678` | `01000000011` | Hassan Beauty Salon | `SPA`    |
| Ahmed Samir     | `ahmed.samir@booklyx.com`     | `12345678` | `01000000012` | Samir Health Clinic | `CLINIC` |
| Eslam Wael      | `eslam.branch@booklyx.com`    | `12345678` | `01000000020` | Eslam Premium Spa   | `SPA`    |

## Typical Flows

### Client registration

```text
1. POST /auth/register
2. POST /auth/verify-email
3. POST /auth/verify-phone
4. Use the returned token for protected endpoints
```

### Super admin access

```text
1. npx prisma db seed
2. POST /auth/login with role=super_admin
3. Use the returned token on /admin/* endpoints
```

### Branch admin onboarding

```text
1. POST /branch-admin/apply
2. POST /branch-admin/verify-email
3. POST /branch-admin/verify-phone
4. Wait for super_admin approval
5. POST /auth/login with role=branch_admin
6. POST /branch-admin/create-staff
7. POST /branch-admin/services
```

## Useful Commands

```bash
# App
npm run dev
npm start
npm run test

# Prisma
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
npx prisma studio

# API contract
npm run openapi:validate
npm run apidog:sync

# Local API session helpers
npm run api:login -- --role client --email user@example.com --password 12345678 --platform APP
npm run api:refresh -- --role client --platform APP
npm run api:session
npm run api:logout
npm run api:export:apidog
npm run api:export:env
```

## API Documentation

Detailed API references live in the following files:

- [API.md](./API.md)
- [openapi.yaml](./openapi.yaml)
- [docs/apidog-guide.md](./docs/apidog-guide.md)

Recommended workflow:

```bash
npm run openapi:validate
```

Then import `openapi.yaml` into Apidog or use the local session scripts to manage tokens while testing.

## Project Structure

```text
src/
  server.js
  routes/
  middleware/
  modules/
  lib/
  utils/

prisma/
  schema.prisma
  migrations/
  seed.js

docs/
  apidog-guide.md
```

## Deployment Notes

Production startup uses:

```bash
npm start
```

That runs:

```bash
prisma migrate deploy && node src/server.js
```

For Railway deployment, make sure these are set:

```bash
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
PORT=
```

Email variables are optional unless real email sending is enabled.

## Additional Docs

- [SETUP.md](./SETUP.md)
- [DEVELOPMENT.md](./DEVELOPMENT.md)
