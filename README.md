# BooklyX Backend

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)

Backend API for BooklyX (graduation project), built with **Node.js**, **Express 5**, **JavaScript**, **Prisma 7**, **Zod**, and **PostgreSQL**.

---

## Table of Contents

- [Base Setup](#base-setup)
- [Default Admin Account](#default-admin-account)
- [OTP Note](#otp-note)
- [Auth Endpoints (`/auth`)](#auth-endpoints-auth)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/refresh](#post-authrefresh)
  - [POST /auth/verify-email](#post-authverify-email)
  - [POST /auth/verify-phone](#post-authverify-phone)
  - [POST /auth/resend-code](#post-authresend-code)
  - [POST /auth/request-password-reset](#post-authrequest-password-reset)
  - [POST /auth/verify-password-reset](#post-authverify-password-reset)
  - [POST /auth/reset-password](#post-authreset-password)
- [Branch Admin Onboarding (`/branch-admin`)](#branch-admin-onboarding-branch-admin)
  - [POST /branch-admin/apply](#post-branch-adminapply)
  - [POST /branch-admin/verify-email](#post-branch-adminverify-email)
  - [POST /branch-admin/verify-phone](#post-branch-adminverify-phone)
  - [POST /branch-admin/create-staff](#post-branch-admincreate-staff)
  - [POST /branch-admin/services](#post-branch-adminservices)
- [Admin Management (`/admin`)](#admin-management-admin)
  - [GET /admin/applications](#get-adminapplications)
  - [GET /admin/applications/:id](#get-adminapplicationsid)
  - [POST /admin/applications/:id/approve](#post-adminapplicationsidapprove)
  - [POST /admin/applications/:id/reject](#post-adminapplicationsidreject)
  - [POST /admin/services/:id/approve](#post-adminservicesidapprove)
  - [POST /admin/services/:id/reject](#post-adminservicesidreject)
- [Quick Test Order](#quick-test-order)
- [Project Commands](#project-commands)
- [Railway Deployment Checklist](#railway-deployment-checklist)
- [Postman Documentation](#postman-documentation)

---

## Base Setup

| Key | Value |
|-----|-------|
| Dev URL | `http://localhost:3000` |
| Prod URL | `https://booklyxbackend-production.up.railway.app` |
| Content-Type | `application/json` |
| Language Header | `Accept-Language: en` or `ar` |
| Platform Header | `platform: APP` or `platform: WEB` |
| Auth Header | `Authorization: Bearer <token>` |

---

## Default Admin Account

For testing admin-only endpoints, use these seeded credentials:

| Field | Value |
|-------|-------|
| Email | `admin@booklyx.com` |
| Password | `12345678` |
| Platform | `WEB` |
| Role | `super_admin` |

Run the seed script after database setup:

```bash
npx prisma db seed
```

Then login via `POST /auth/login` to get the admin token.

---

## OTP Note

- In **development**, OTP is fixed to `333333`.
- In **production**, hardcoded OTP is blocked and will throw an error if used.

---

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

**Responses**

```json
// 201 - Success
{
  "status": 201,
  "error": false,
  "message": "Registration successful.",
  "data": null
}

// 409 - Email already exists
{
  "status": 409,
  "error": true,
  "message": "A user with this email already exists.",
  "data": null
}
```

---

### `POST /auth/login`

Logs user in (requires verified email + phone) and returns token.

**Request body**

```json
{
  "email": "khalil@booklyx.com",
  "password": "12345678",
  "role": "client"
}
```

> role options: `client` · `branch_admin` · `super_admin` · `staff`

**Responses**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Login successful.",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "email": "client@example.com",
      "phone": "0123456789",
      "role": "client",
      "status": "ACTIVE",
      "emailVerified": true,
      "phoneVerified": true
    }
  }
}

// 403 - Email not verified
{
  "status": 403,
  "error": true,
  "message": "Your email is not verified. Please verify your email before logging in.",
  "data": null
}
```

---

### `POST /auth/refresh`

Refreshes an access token using a valid `refreshToken`.

**Request body**

```json
{
  "refreshToken": "<valid-refresh-token>"
}
```

**Responses**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Login successful.",
  "data": {
    "token": "<new-access-token>",
    "refreshToken": "<new-refresh-token>"
  }
}

// 400 - Invalid token
{
  "status": 400,
  "error": true,
  "message": "Invalid token.",
  "data": null
}
```

---

### `POST /auth/verify-email`

Verifies email OTP.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

**Responses**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Email verified successfully.",
  "data": null
}

// 429 - Too many failed attempts
{
  "status": 429,
  "error": true,
  "message": "Too many failed attempts. Please request a new code.",
  "data": null
}
```

---

### `POST /auth/verify-phone`

Final verification step — returns auth token + user.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

**Responses**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Phone verified successfully.",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 1,
      "email": "client@example.com",
      "role": "client",
      "status": "ACTIVE",
      "emailVerified": true,
      "phoneVerified": true
    }
  }
}

// 403 - Role not allowed on this platform
{
  "status": 403,
  "error": true,
  "message": "This role is not allowed to access from this platform.",
  "data": null
}
```

---

### `POST /auth/resend-code`

Resends OTP for email, phone, or password reset.

**Request body**

```json
{
  "email": "client@example.com",
  "phone": "0123456789",
  "type": "EMAIL"
}
```

> type options: `EMAIL` · `PHONE` · `PASSWORD_RESET`

**Responses**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Verification code sent.",
  "data": null
}

// 404 - User not found
{
  "status": 404,
  "error": true,
  "message": "No user found.",
  "data": null
}
```

---

### `POST /auth/request-password-reset`

Sends password reset OTP to email.

**Request body**

```json
{
  "email": "client@example.com"
}
```

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Password reset code sent to your email.",
  "data": null
}
```

---

### `POST /auth/verify-password-reset`

Validates OTP and returns a short-lived `resetToken`.

**Request body**

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Code verified. You can now reset your password.",
  "data": {
    "resetToken": "<password-reset-token>"
  }
}
```

---

### `POST /auth/reset-password`

Resets password using `resetToken`.

**Request body**

```json
{
  "resetToken": "<password-reset-token>",
  "newPassword": "newStrongPass123"
}
```

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Password reset successfully.",
  "data": null
}
```

---

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
  "category": "SPA",
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

> category options: `SPA` · `CLINIC` · `BARBER`

**Response**

```json
// 201 - Success
{
  "status": 201,
  "error": false,
  "message": "Your application has been submitted successfully. Please verify your email.",
  "data": null
}
```

---

### `POST /branch-admin/verify-email`

Verifies application email.

**Request body**

```json
{
  "email": "branch@example.com",
  "code": "333333"
}
```

---

### `POST /branch-admin/verify-phone`

Verifies application phone. Moves application to `PENDING_APPROVAL` state.

**Request body**

```json
{
  "email": "branch@example.com",
  "code": "333333"
}
```

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Your application has been verified and is now under review by our team.",
  "data": null
}
```

---

### `POST /branch-admin/create-staff`

Creates a staff account linked to the logged-in branch admin's branch.

**Auth:** `Authorization: Bearer <token>` — `branch_admin` role required

**Request body**

```json
{
  "name": "Sara Ali",
  "email": "staff@example.com",
  "age": 28,
  "startDate": "2026-03-01T00:00:00.000Z",
  "phone": "0101234567",
  "password": "12345678",
  "staffRole": "SPA_SPECIALIST",
  "commissionPercentage": 20.5,
  "serviceIds": [1, 2]
}
```

> staffRole options: `DOCTOR` · `BARBER` · `SPA_SPECIALIST`

> `serviceIds` must be approved services belonging to the same branch.

**Response**

```json
// 201 - Success
{
  "status": 201,
  "error": false,
  "message": "Staff created successfully.",
  "data": {
    "id": 10,
    "name": "Sara Ali",
    "email": "staff@example.com",
    "phone": "0101234567",
    "role": "staff",
    "status": "ACTIVE"
  }
}
```

---

### `POST /branch-admin/services`

Creates a new service for the branch. Service starts with `PENDING_APPROVAL` status until approved by Super Admin.

**Auth:** `Authorization: Bearer <token>` — `branch_admin` role required

**Request body**

```json
{
  "name": "Haircut",
  "description": "Classic haircut service",
  "price": 80,
  "durationMinutes": 45,
  "categoryName": "Hair"
}
```

> One of `categoryId` or `categoryName` is required.

---

## Admin Management (`/admin`)

> All endpoints in this section require `super_admin` role.

### `GET /admin/applications`

List all business applications.

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Applications retrieved successfully",
  "data": [
    {
      "id": 1,
      "ownerName": "Abdo Khalil",
      "businessName": "Khalil Spa",
      "status": "PENDING_APPROVAL"
    }
  ]
}
```

---

### `GET /admin/applications/:id`

Get business application details by ID.

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Application retrieved successfully.",
  "data": {
    "id": 1,
    "ownerName": "Abdo Khalil",
    "email": "branch@example.com",
    "status": "PENDING_APPROVAL"
  }
}
```

---

### `POST /admin/applications/:id/approve`

Approve a business application and create its `User` record.

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Application approved successfully.",
  "data": {
    "id": 10,
    "email": "branch@example.com",
    "role": "branch_admin"
  }
}
```

---

### `POST /admin/applications/:id/reject`

Reject an application with a reason.

**Request body**

```json
{
  "reason": "Missing documentation"
}
```

---

### `POST /admin/services/:id/approve`

Approve a pending branch service.

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Service approved successfully.",
  "data": {
    "id": 1,
    "status": "APPROVED",
    "approvedAt": "2026-03-19T12:00:00.000Z"
  }
}
```

---

### `POST /admin/services/:id/reject`

Reject a pending branch service with a reason.

**Request body**

```json
{
  "reason": "Pricing policy mismatch"
}
```

**Response**

```json
// 200 - Success
{
  "status": 200,
  "error": false,
  "message": "Service rejected successfully.",
  "data": {
    "id": 1,
    "status": "REJECTED",
    "rejectionReason": "Pricing policy mismatch"
  }
}
```

---

## Quick Test Order

### Client Registration & Login

```
1. POST /auth/register
2. POST /auth/verify-email   → code: 333333
3. POST /auth/verify-phone   → code: 333333
4. Use returned token in protected endpoints
```

### Admin Access

```
1. npx prisma db seed        (first time only)
2. POST /auth/login          → email: admin@booklyx.com, role: super_admin
3. Use returned token in /admin/* endpoints
```

### Branch Admin Flow

```
1. POST /branch-admin/apply
2. POST /branch-admin/verify-email   → code: 333333
3. POST /branch-admin/verify-phone   → code: 333333
4. Wait for Super Admin approval
5. POST /auth/login                  → role: branch_admin
6. POST /branch-admin/create-staff
7. POST /branch-admin/services
```

---

## Project Commands

```bash
# Development
npm run dev                   # Start dev server with hot reload
npm run test                  # Run Jest unit tests

# Database & Prisma
npx prisma generate           # Regenerate Prisma Client
npx prisma migrate dev        # Create and apply migrations
npx prisma db seed            # Seed super_admin account
npx prisma studio             # Open Prisma Studio (visual DB viewer)

# Postman
npm run postman:sync          # Sync Postman collection to cloud
```

---

## Railway Deployment Checklist

- Start command is configured in `package.json`:
  - `npm start` → runs `prisma migrate deploy && node src/server.js`
- Prisma client is auto-generated on install via `postinstall: prisma generate`

**Required environment variables:**

```bash
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
PORT=                                    # Railway injects this automatically

# Optional (defaults apply if not set)
VERIFICATION_CODE_EXPIRES_MINUTES=10

# Email (optional while mocked)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

---

## Postman Documentation

### Files

| File | Path |
|------|------|
| Collection | `docs/postman/booklyx-backend.postman_collection.json` |
| Environment | `docs/postman/booklyx-backend.postman_environment.json` |
| Full Routes Docs | `docs/postman-routes.md` |

### Update Documentation with API Changes

After adding or modifying endpoints:

```bash
npm run postman:sync
```

### Configuration

Add these to your `.env`:

```bash
POSTMAN_API_KEY="your_api_key"
POSTMAN_WORKSPACE_ID="your_workspace_id"
POSTMAN_COLLECTION_UID="your_collection_uid"
POSTMAN_ENVIRONMENT_UID="your_env_uid"
```

> `POSTMAN_COLLECTION_UID` and `POSTMAN_ENVIRONMENT_UID` are printed automatically after the first sync run — you can leave them empty initially.