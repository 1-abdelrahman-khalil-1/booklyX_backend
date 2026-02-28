# BooklyX Backend

Backend API for BooklyX (graduation project), built with **Node.js**, **Express 5**, **JavaScript**, **Prisma 7**, **Zod**, and **PostgreSQL**.

This README is adapted from `docs/postman-routes.md` and serves as the GitHub entry point.

## Base Setup

- Base URL: `http://localhost:3000`
- Common headers:
  - `Content-Type: application/json`
  - `Accept-Language: en` (or `ar`)
- Platform-aware endpoints need: `platform: APP` or `platform: WEB`
- Protected endpoints need: `Authorization: Bearer <token>`

## Default Admin Account

For testing admin-only endpoints (like `GET /admin/applications`), use these credentials:

**Email:** `admin@booklyx.com`  
**Password:** `12345678`  
**Platform:** `WEB`  
**Role:** `super_admin`

Run the seed script after database setup:

```bash
npx prisma db seed
```

Then login via `POST /auth/login` to get the admin token.

## OTP Note

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP is blocked and will throw an error if used.

## Auth Endpoints (`/auth`)

### `POST /auth/register`

Creates a `CLIENT` account and sends email OTP.

**Request body**

```json
{
  "name": "Abdo Khalil",
  "email": "khalil@booklyx.com",
  "password": "12345678",
  "phone": "0123456789"
}
```

### `POST /auth/login`

Logs user in (requires verified email + phone) and returns token.

**Request body**

```json
{
  "email": "khalil@booklyx.com",
  "password": "12345678",
  "role": "client" // "client", "branch_admin", "super_admin", "staff"
}
```

### `POST /auth/refresh`

Refreshes an access token using a valid `refreshToken`.

**Request body**

```json
{
  "refreshToken": "<valid-refresh-token>"
}
```

### `POST /auth/verify-email`

Verifies email OTP.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

### `POST /auth/verify-phone`

Final verification step, returns auth token + user.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

### `POST /auth/resend-code`

Resends OTP for `EMAIL`, `PHONE`, or `PASSWORD_RESET`.

**Request body**

```json
{
  "email": "client@example.com",
  "phone": "0123456789",
  "type": "EMAIL" // "PHONE", "PASSWORD_RESET"
}
```

### `POST /auth/request-password-reset`

Sends password reset OTP.

**Request body**

```json
{
  "email": "client@example.com"
}
```

### `POST /auth/verify-password-reset`

Validates OTP and returns short-lived `resetToken`.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

### `POST /auth/reset-password`

Resets password using `resetToken`.

**Request body**

```json
{
  "resetToken": "<password-reset-token>",
  "newPassword": "newStrongPass123"
}
```

## Branch Admin Onboarding (`/branch-admin`)

### `POST /branch-admin/apply`

Initial application submission for Branch Admins.

**Request body**

```json
{
  "ownerName": "Abdo Khalil",
  "email": "branch@example.com",
  "phone": "0101234567",
  "password": "strongPassword123",
  "businessName": "Khalil Spa",
  "category": "SPA" // "CLINIC", "BARBER",
  "description": "Premium spa services",
  "commercialRegisterNumber": "123456789",
  "taxId": "123456789",
  "city": "Cairo",
  "district": "Tahrir Square",
  "address": "Tahrir Square",
  "latitude": 30.0444,
  "longitude": 31.2357
}
```

### `POST /branch-admin/verify-email`

Verifies application email.

### `POST /branch-admin/verify-phone`

Verifies application phone. Moves application to review state.

### `POST /branch-admin/create-staff`

Creates a staff user account associated with the logged-in branch admin's branch.
Requires a Bearer token (`Authorization: Bearer <token>`) of a `branch_admin`.

**Request body**

```json
{
  "name": "Sara Ali",
  "email": "staff@example.com",
  "phone": "0101234567",
  "password": "12345678",
  "staffRole": "SPA_SPECIALIST", // "DOCTOR", "BARBER", "SPA_SPECIALIST"
  "commissionPercentage": 20.5
}
```

## Admin Management (`/admin`)

Requires `super_admin` role.

### `GET /admin/applications`

List all business applications.

### `GET /admin/applications/:id`

Get business application details by ID.

### `POST /admin/applications/:id/approve`

Approve a business application and create its `User` record.

### `POST /admin/applications/:id/reject`

Reject an application with a reason.

## Quick Test Order

### For Client Registration

1. `POST /auth/register`
2. `POST /auth/verify-email` with code `333333`
3. `POST /auth/verify-phone` with code `333333`
4. Use returned token

### For Admin Access

1. Run `npx prisma db seed` (first time only)
2. `POST /auth/login` with admin credentials (see "Default Admin Account" above)
3. Use returned token in admin-only endpoints like `GET /admin/applications`

## Project Commands

```bash
npm run dev                  # Start dev server
npx prisma generate          # Regenerate Prisma Client
npx prisma migrate dev       # Create and apply migrations
npx prisma db seed           # Seed super_admin account
npm run postman:sync         # Sync Postman collection to cloud
```

## Postman

- Collection: `docs/postman/booklyx-backend.postman_collection.json`
- Environment: `docs/postman/booklyx-backend.postman_environment.json`
- Full endpoint details, examples, and response cases: `docs/postman-routes.md`

### Sync to Postman Cloud

Required env vars:

```bash
POSTMAN_API_KEY="your_api_key_here"
POSTMAN_WORKSPACE_ID="your_workspace_id_here"
POSTMAN_COLLECTION_UID="your_uid_here"
POSTMAN_ENVIRONMENT_UID="your_environment_uid_here"
```

`POSTMAN_COLLECTION_UID` and `POSTMAN_ENVIRONMENT_UID` are optional on first run (the sync script prints them after creation).

Run:

```bash
npm run postman:sync
```
