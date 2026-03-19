# BooklyX Backend — Endpoints + Postman Guide

This file is the single source of truth for:

1. endpoint explanation,
2. request examples,
3. response examples,
4. direct Postman sync.

## 1) Base setup

- Base URL (development): `http://localhost:3000`
- Production API URL (set in Postman environment as `api_url`): `https://booklyxbackend-production.up.railway.app`
- In Postman, prefer using the environment variable `{{api_url}}` or `{{baseUrl}}` as needed. Example: `{{api_url}}/auth/login`.
- Common headers:
  - `Content-Type: application/json`
  - `Accept-Language: en` (or `ar`)
- Platform-aware endpoints need: `platform: APP` or `platform: WEB`
- Protected endpoints need: `Authorization: Bearer <token>`

### Default Admin Account (For Testing)

To test admin-only endpoints (like `GET /admin/applications`), use these **seeded credentials**:

**Email:** `admin@booklyx.com`  
**Password:** `12345678`  
**Phone:** `01000000000`  
**Platform:** `WEB`  
**Role:** `super_admin`

**First time setup:**

```bash
npx prisma db seed
```

**Get admin token:**

Login via `POST /auth/login` with the credentials above. The token returned can be used in all admin-protected endpoints.

## 2) Auth endpoints (`/auth`)

OTP note:

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP is blocked and will throw an error if used.

### POST `/auth/register`

Creates a CLIENT account and sends email OTP.

Request body:

```json
{
  "name": "Abdo Khalil",
  "email": "khalil@booklyx.com",
  "password": "12345678",
  "phone": "0123456789"
}
```

Success example (`201`):

```json
{
  "status": 201,
  "error": false,
  "message": "Registration successful.",
  "data": null
}
```

Error example (`409`):

```json
{
  "status": 409,
  "error": true,
  "message": "A user with this email already exists.",
  "data": null
}
```

---

### POST `/auth/login`

Logs user in (requires verified email + phone) and returns token.

Request body:

```json
{
  "email": "khalil@booklyx.com",
  "password": "12345678",
  "role": "client" // "client", "branch_admin", "super_admin", "staff"
}
```

Success example (`200`):

```json
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
```

Error example (`403`):

```json
{
  "status": 403,
  "error": true,
  "message": "Your email is not verified. Please verify your email before logging in.",
  "data": null
}
```

---

### POST `/auth/verify-email`

Verifies email OTP (code is `333333` in development).

Request body:

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Email verified successfully.",
  "data": null
}
```

Error example (`429`):

```json
{
  "status": 429,
  "error": true,
  "message": "Too many failed attempts. Please request a new code.",
  "data": null
}
```

---

### POST `/auth/verify-phone`

Final verification step, returns auth token + user.

Request body:

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Phone verified successfully.",
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
```

Error example (`403`):

```json
{
  "status": 403,
  "error": true,
  "message": "This role is not allowed to access from this platform.",
  "data": null
}
```

---

### POST `/auth/resend-code`

Resends OTP for `EMAIL`, `PHONE`, or `PASSWORD_RESET`.

Request body:

```json
{
  "email": "client@example.com",
  "phone": "0123456789",
  "type": "EMAIL" // "PHONE", "PASSWORD_RESET"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Verification code sent.",
  "data": null
}
```

Error example (`404`):

```json
{
  "status": 404,
  "error": true,
  "message": "No user found.",
  "data": null
}
```

---

### POST `/auth/refresh`

Refreshes an access token using a valid `refreshToken`.

Request body:

```json
{
  "refreshToken": "<valid-refresh-token>"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Login successful.",
  "data": {
    "token": "<new-access-token>",
    "refreshToken": "<new-refresh-token>"
  }
}
```

Error example (`400`):

```json
{
  "status": 400,
  "error": true,
  "message": "Invalid token.",
  "data": null
}
```

---

### POST `/auth/request-password-reset`

Sends password reset OTP.

Request body:

```json
{
  "email": "client@example.com"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Password reset code sent to your email.",
  "data": null
}
```

Error example (`400`):

```json
{
  "status": 400,
  "error": true,
  "message": "Email must be a valid email address.",
  "data": null
}
```

---

### POST `/auth/verify-password-reset`

Validates OTP and returns short-lived `resetToken`.

Request body:

```json
{
  "email": "client@example.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Code verified. You can now reset your password.",
  "data": {
    "resetToken": "<password-reset-token>"
  }
}
```

Error example (`400`):

```json
{
  "status": 400,
  "error": true,
  "message": "Invalid code.",
  "data": null
}
```

---

### POST `/auth/reset-password`

Resets password using `resetToken`.

Request body:

```json
{
  "resetToken": "<password-reset-token>",
  "newPassword": "newStrongPass123"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Password reset successfully.",
  "data": null
}
```

Error example (`400`):

```json
{
  "status": 400,
  "error": true,
  "message": "Invalid token.",
  "data": null
}
```

## 3) Branch Admin Onboarding (`/branch-admin`)

### POST `/branch-admin/apply`

Initial endpoint for Branch Admin application.

Request body:

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

Success example (`201`):

```json
{
  "status": 201,
  "error": false,
  "message": "Your application has been submitted successfully. Please verify your email.",
  "data": null
}
```

---

### POST `/branch-admin/verify-email`

Verifies application email.

Request body:

```json
{
  "email": "branch@example.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Email verified successfully.",
  "data": null
}
```

---

### POST `/branch-admin/verify-phone`

Verifies application phone. Moves to `PENDING_APPROVAL`.

Request body:

```json
{
  "email": "branch@example.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Your application has been verified and is now under review by our team.",
  "data": null
}
```

---

### POST `/branch-admin/resend-code`

Resends OTP for application.

Request body:

```json
{
  "email": "branch@example.com",
  "type": "EMAIL" // "PHONE"
}
```

---

### POST `/branch-admin/create-staff`

Creates a staff user account associated to the logged-in branch admin's branch.
Requires a Bearer token (`Authorization: Bearer <token>`) of a `branch_admin` and platform header.

Request body:

```json
{
  "name": "Sara Ali",
  "email": "staff@example.com",
  "age": 28,
  "startDate": "2026-03-01T00:00:00.000Z",
  "phone": "0101234567",
  "password": "12345678",
  "staffRole": "SPA_SPECIALIST", // "DOCTOR", "BARBER", "SPA_SPECIALIST"
  "commissionPercentage": 20.5,
  "serviceIds": [1, 2]
}
```

Notes:

- `startDate` must be a valid ISO date string.
- `serviceIds` must be approved services that belong to the same branch.

Success example (`201`):

```json
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

### POST `/branch-admin/services`

Creates a new branch service with default status `PENDING_APPROVAL`.
Requires a Bearer token (`Authorization: Bearer <token>`) of a `branch_admin` and platform header.

Request body:

```json
{
  "name": "Haircut",
  "description": "Classic haircut service",
  "price": 80,
  "duration": 45
}
```

Success example (`201`):

```json
{
  "status": 201,
  "error": false,
  "message": "Service submitted and waiting for admin approval.",
  "data": {
    "id": 1,
    "branchId": 5,
    "name": "Haircut",
    "description": "Classic haircut service",
    "price": 80,
    "duration": 45,
    "status": "PENDING_APPROVAL"
  }
}
```

## 4) Admin Management (`/admin`)

Requires `super_admin` role.

### GET `/admin/applications`

List all applications.

Success example (`200`):

```json
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

### GET `/admin/applications/:id`

Get application details by ID.

Success example (`200`):

```json
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

### POST `/admin/applications/:id/approve`

Approve application and create User.

Success example (`200`):

```json
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

### POST `/admin/applications/:id/reject`

Reject application with reason.

Request body:

```json
{
  "reason": "Missing documentation"
}
```

---

### POST `/admin/services/:id/approve`

Approves a pending branch service.

Success example (`200`):

```json
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

### POST `/admin/services/:id/reject`

Rejects a pending branch service with a reason.

Request body:

```json
{
  "reason": "Pricing policy mismatch"
}
```

Success example (`200`):

```json
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

## 5) Quick test order

### For Client Registration & Login

1. `POST /auth/register`
2. `POST /auth/verify-email` with code `333333`
3. `POST /auth/verify-phone` with code `333333`
4. Use returned token in protected endpoints

### For Admin Access

1. Run `npx prisma db seed` (first time only)
2. `POST /auth/login` with:
   ```json
   {
     "email": "admin@booklyx.com",
     "password": "12345678",
     "role": "super_admin"
   }
   ```
3. Use returned token in admin-only endpoints like `GET /admin/applications`

## 6) Postman files in repo

- Collection: `docs/postman/booklyx-backend.postman_collection.json`
- Environment: `docs/postman/booklyx-backend.postman_environment.json`

## 7) Sync to Postman Cloud

`postman:sync` reads from `.env` automatically.

Required env vars:

```bash
POSTMAN_API_KEY="your_api_key_here"
POSTMAN_WORKSPACE_ID="your_workspace_id_here"
POSTMAN_COLLECTION_UID="your_uid_here"
POSTMAN_ENVIRONMENT_UID="your_environment_uid_here"
```

On first run, UID values are optional. The script prints both values after successful creation.

Run:

```bash
npm run postman:sync
```

After any update in collection JSON, run the same command to push changes to Postman directly.
