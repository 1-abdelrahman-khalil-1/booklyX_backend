# BooklyX Backend

Backend API for BooklyX (graduation project), built with **Node.js**, **Express 5**, **TypeScript**, **Prisma 7**, **Zod**, and **PostgreSQL**.

This README is adapted from `docs/postman-routes.md` and serves as the GitHub entry point.

## Base Setup

- Base URL: `http://localhost:3000`
- Common headers:
  - `Content-Type: application/json`
  - `Accept-Language: en` (or `ar`)
- Platform-aware endpoints need: `platform: APP` or `platform: WEB`
- Protected endpoints need: `Authorization: Bearer <token>`

## OTP Note

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP is blocked and will throw an error if used.

## Auth Endpoints (`/auth`)

### `POST /auth/register`

Creates a `CLIENT` account and sends email OTP.

**Request body**

```json
{
  "email": "client@example.com",
  "password": "12345678",
  "phone": "0123456789"
}
```

### `POST /auth/login`

Logs user in (requires verified email + phone) and returns token.

**Request body**

```json
{
  "email": "client@example.com",
  "password": "12345678"
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
  "type": "EMAIL"
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

## Users Endpoints (`/users`)

### `POST /users`

Create user endpoint, allowed for `super_admin` and `branch_admin` only.

**Request body**

```json
{
  "email": "staff1@example.com",
  "password": "12345678",
  "phone": "0123456789",
  "role": "staff"
}
```

## Quick Test Order

1. `POST /auth/register`
2. `POST /auth/verify-email` with code `333333`
3. `POST /auth/verify-phone` with code `333333`
4. Use returned token in `POST /users`

## Project Commands

```bash
npm run dev
npx prisma generate
npx prisma migrate dev
npm run postman:sync
```

## Postman

- Collection: `docs/postman/booklyx-backend.postman_collection.json`
- Environment: `docs/postman/booklyx-backend.postman_environment.json`
- Full endpoint details, examples, and response cases: `docs/postman-routes.md`

### Sync to Postman Cloud

Required env vars:

```bash
POSTMAN_API_KEY="your_api_key_here"
POSTMAN_COLLECTION_UID="your_uid_here"
```

Run:

```bash
npm run postman:sync
```
