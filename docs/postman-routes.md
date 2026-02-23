# BooklyX Backend — Endpoints + Postman Guide

This file is the single source of truth for:

1. endpoint explanation,
2. request examples,
3. response examples,
4. direct Postman sync.

## 1) Base setup

- Base URL: `http://localhost:3000`
- Common headers:
  - `Content-Type: application/json`
  - `Accept-Language: en` (or `ar`)
- Platform-aware endpoints need: `platform: APP` or `platform: WEB`
- Protected endpoints need: `Authorization: Bearer <token>`

## 2) Auth endpoints (`/auth`)

OTP note:

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP is blocked and will throw an error if used.

### POST `/auth/register`

Creates a CLIENT account and sends email OTP.

Request body:

```json
{
  "email": "client@example.com",
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
  "email": "client@example.com",
  "password": "12345678"
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
  "type": "EMAIL"
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

## 3) Users endpoints (`/users`)

### POST `/users`

Create user endpoint, allowed for `super_admin` and `branch_admin` only.

Request body:

```json
{
  "email": "staff1@example.com",
  "password": "12345678",
  "phone": "0123456789",
  "role": "staff"
}
```

Success example (`201`):

```json
{
  "status": 201,
  "error": false,
  "message": "User created successfully.",
  "data": {
    "id": 2,
    "email": "staff1@example.com",
    "phone": "0123456789",
    "role": "staff"
  }
}
```

Error example (`403`):

```json
{
  "status": 403,
  "error": true,
  "message": "You do not have permission to access this resource.",
  "data": null
}
```

## 4) Quick test order

1. `POST /auth/register`
2. `POST /auth/verify-email` with code `333333`
3. `POST /auth/verify-phone` with code `333333`
4. Use returned token in `POST /users`

## 5) Postman files in repo

- Collection: `docs/postman/booklyx-backend.postman_collection.json`
- Environment: `docs/postman/booklyx-backend.postman_environment.json`

## 6) Sync to Postman Cloud

`postman:sync` reads from `.env` automatically.

Required env vars:

```bash
POSTMAN_API_KEY="your_api_key_here"
POSTMAN_COLLECTION_UID="your_uid_here"
```

Run:

```bash
npm run postman:sync
```

After any update in collection JSON, run the same command to push changes to Postman directly.
