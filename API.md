# BooklyX Backend - API Documentation

Complete API reference for BooklyX Backend with examples and response formats.

## Overview

- **Base URL**: `http://localhost:3000` (development)
- **API Version**: v1
- **Response Format**: JSON
- **Authentication**: Bearer token (JWT)
- **Localization**: `Accept-Language` header (en/ar)

---

## Common Headers

```http
Content-Type: application/json
Accept-Language: en
Authorization: Bearer <token>
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "error_key",
  "message": "Human readable error message",
  "statusCode": 400
}
```

---

## Authentication Module (`/api/auth`)

### Register User

**Endpoint:** `POST /api/auth/register`

Creates a new CLIENT account and sends email OTP.

**Request:**

```json
{
  "name": "Abdo Khalil",
  "email": "khalil@booklyx.com",
  "password": "SecurePass123",
  "phone": "201234567890"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": 1,
    "name": "Abdo Khalil",
    "email": "khalil@booklyx.com",
    "role": "client",
    "status": "PENDING_EMAIL"
  }
}
```

**Errors:**

- `400` - Invalid input
- `409` - Email already exists
- `422` - Validation failed

---

### Verify Email

**Endpoint:** `POST /api/auth/verify-email`

Verifies the OTP sent to user's email.

**Request:**

```json
{
  "email": "khalil@booklyx.com",
  "code": "333333"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "id": 1,
    "email": "khalil@booklyx.com",
    "status": "PENDING_PHONE"
  }
}
```

**Note:** In development, OTP is always `333333`. In production, real codes are sent.

---

### Verify Phone

**Endpoint:** `POST /api/auth/verify-phone`

Final verification step - moves user to ACTIVE status.

**Request:**

```json
{
  "email": "khalil@booklyx.com",
  "code": "333333"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Phone verified",
  "data": {
    "user": {
      "id": 1,
      "name": "Abdo Khalil",
      "email": "khalil@booklyx.com",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

---

### Login

**Endpoint:** `POST /api/auth/login`

Authenticates user and returns JWT tokens.

**Request:**

```json
{
  "email": "admin@booklyx.com",
  "password": "12345678",
  "role": "super_admin"
}
```

**Supported Roles:**

- `client` - Regular user
- `branch_admin` - Branch owner
- `staff` - Staff member
- `super_admin` - System admin

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin",
      "email": "admin@booklyx.com",
      "role": "super_admin"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

**Errors:**

- `400` - Missing email/password
- `401` - Invalid credentials
- `403` - Account not verified
- `429` - Too many login attempts

---

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

Refreshes an expired access token.

**Request:**

```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

---

### Resend OTP

**Endpoint:** `POST /api/auth/resend-code`

Resends verification code for EMAIL, PHONE, or PASSWORD_RESET.

**Request:**

```json
{
  "email": "khalil@booklyx.com",
  "type": "EMAIL"
}
```

**Types:**

- `EMAIL` - Email verification
- `PHONE` - Phone verification
- `PASSWORD_RESET` - Password reset

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Code sent successfully"
}
```

---

### Request Password Reset

**Endpoint:** `POST /api/auth/request-password-reset`

Sends password reset OTP to email.

**Request:**

```json
{
  "email": "khalil@booklyx.com"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Reset code sent"
}
```

---

### Verify Password Reset Code

**Endpoint:** `POST /api/auth/verify-password-reset`

Validates password reset code and returns reset token.

**Request:**

```json
{
  "email": "khalil@booklyx.com",
  "code": "333333"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Code verified",
  "data": {
    "resetToken": "eyJhbGci...",
    "expiresIn": 600
  }
}
```

---

### Reset Password

**Endpoint:** `POST /api/auth/reset-password`

Resets password using reset token.

**Request:**

```json
{
  "resetToken": "eyJhbGci...",
  "newPassword": "NewSecurePass123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Errors:**

- `400` - Invalid token or weak password
- `401` - Token expired

---

## Branch Admin Module (`/api/branch-admin`)

### Apply for Branch

**Endpoint:** `POST /api/branch-admin/apply`

Initial business application submission.

**Request:**

```json
{
  "ownerName": "Abdo Khalil",
  "email": "branch@example.com",
  "phone": "201234567890",
  "password": "SecurePass123",
  "businessName": "Premium Spa",
  "category": "SPA",
  "description": "Luxury spa services",
  "commercialRegisterNumber": "123456789",
  "taxId": "987654321",
  "city": "Cairo",
  "district": "Zamalek",
  "address": "123 Main St",
  "latitude": 30.0444,
  "longitude": 31.2357
}
```

**Categories:**

- `SPA`
- `CLINIC`
- `BARBER`

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Application submitted",
  "data": {
    "applicationId": 5,
    "status": "PENDING_EMAIL",
    "ownerName": "Abdo Khalil",
    "businessName": "Premium Spa"
  }
}
```

---

### Verify Application Email

**Endpoint:** `POST /api/branch-admin/verify-email`

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
  "code": "333333"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "status": "PENDING_PHONE"
  }
}
```

---

### Verify Application Phone

**Endpoint:** `POST /api/branch-admin/verify-phone`

Completes verification and moves to UNDER_REVIEW status.

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
  "code": "333333"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Phone verified",
  "data": {
    "status": "UNDER_REVIEW"
  }
}
```

---

### Create Service

**Endpoint:** `POST /api/branch-admin/services`

**Headers:**

```
Authorization: Bearer <branch_admin_token>
```

**Request:**

```json
{
  "name": "Full Body Massage",
  "description": "60-minute relaxation massage",
  "price": 150,
  "duration": 60
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Service created",
  "data": {
    "id": 10,
    "name": "Full Body Massage",
    "price": 150,
    "duration": 60,
    "status": "PENDING_APPROVAL"
  }
}
```

**Note:** Services require admin approval before becoming available.

---

### Create Staff

**Endpoint:** `POST /api/branch-admin/create-staff`

**Headers:**

```
Authorization: Bearer <branch_admin_token>
```

**Request:**

```json
{
  "name": "Sara Ali",
  "email": "sara@example.com",
  "age": 28,
  "startDate": "2026-03-01T00:00:00.000Z",
  "phone": "201234567890",
  "password": "StaffPass123",
  "staffRole": "SPA_SPECIALIST",
  "commissionPercentage": 20.5,
  "serviceIds": [1, 2, 3]
}
```

**Staff Roles:**

- `SPA_SPECIALIST` - Spa therapist
- `DOCTOR` - Medical doctor
- `BARBER` - Barber specialist

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Staff member created",
  "data": {
    "id": 20,
    "name": "Sara Ali",
    "email": "sara@example.com",
    "staffRole": "SPA_SPECIALIST",
    "status": "ACTIVE"
  }
}
```

---

## Admin Module (`/api/admin`)

**⚠️ Requires `super_admin` role**

### Get All Applications

**Endpoint:** `GET /api/admin/applications`

**Query Parameters:**

- `status=PENDING_REVIEW,APPROVED,REJECTED` (optional)
- `category=SPA,CLINIC,BARBER` (optional)
- `page=1` (optional)
- `limit=10` (optional)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Applications retrieved",
  "data": {
    "applications": [
      {
        "id": 1,
        "ownerName": "Abdo Khalil",
        "businessName": "Premium Spa",
        "status": "UNDER_REVIEW",
        "category": "SPA",
        "createdAt": "2026-03-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5
    }
  }
}
```

---

### Get Application Details

**Endpoint:** `GET /api/admin/applications/:id`

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Application details",
  "data": {
    "id": 1,
    "ownerName": "Abdo Khalil",
    "businessName": "Premium Spa",
    "email": "branch@example.com",
    "phone": "201234567890",
    "status": "UNDER_REVIEW",
    "category": "SPA",
    "description": "Luxury spa services",
    "city": "Cairo",
    "district": "Zamalek",
    "address": "123 Main St",
    "commercialRegisterNumber": "123456789",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

---

### Approve Application

**Endpoint:** `POST /api/admin/applications/:id/approve`

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Application approved",
  "data": {
    "id": 1,
    "status": "APPROVED",
    "userId": 25
  }
}
```

---

### Reject Application

**Endpoint:** `POST /api/admin/applications/:id/reject`

**Request:**

```json
{
  "reason": "Missing required documents"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Application rejected",
  "data": {
    "id": 1,
    "status": "REJECTED",
    "rejectionReason": "Missing required documents"
  }
}
```

---

### Approve Service

**Endpoint:** `POST /api/admin/services/:id/approve`

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Service approved",
  "data": {
    "id": 10,
    "name": "Full Body Massage",
    "status": "APPROVED"
  }
}
```

---

### Reject Service

**Endpoint:** `POST /api/admin/services/:id/reject`

**Request:**

```json
{
  "reason": "Price not competitive"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Service rejected",
  "data": {
    "id": 10,
    "status": "REJECTED"
  }
}
```

---

## Error Codes

| Code | Meaning           | Example                  |
| ---- | ----------------- | ------------------------ |
| 400  | Bad Request       | Invalid input data       |
| 401  | Unauthorized      | Invalid/expired token    |
| 403  | Forbidden         | Insufficient permissions |
| 404  | Not Found         | Resource doesn't exist   |
| 409  | Conflict          | Email already registered |
| 422  | Validation Failed | Schema validation error  |
| 429  | Too Many Requests | Rate limit exceeded      |
| 500  | Server Error      | Unexpected error         |

---

## Rate Limiting

- **Login endpoint**: 5 attempts per 15 minutes per IP
- **OTP endpoints**: 3 attempts per hour per email
- **General API**: 100 requests per minute per IP

HTTP headers returned:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1695123456
```

---

## Pagination

Standard pagination in list endpoints:

**Query:**

```
GET /api/admin/applications?page=1&limit=10
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

## Localization

Use `Accept-Language` header for translations:

```http
Accept-Language: en
```

Supported: `en` (English), `ar` (Arabic)

If header missing, defaults to `en`.

---

## Testing with Postman

1. **Import Collection**
   - Open Postman
   - Import `docs/postman/booklyx-backend.postman_collection.json`
   - Import `docs/postman/booklyx-backend.postman_environment.json`

2. **Set Base URL**
   - Set `baseUrl` variable to `http://localhost:3000`

3. **Register & Login**
   - Use Register endpoint with test data
   - Copy token from Login response
   - Add to Authorization header in requests

4. **Quick Test Flow**
   - POST Register
   - POST Verify Email
   - POST Verify Phone
   - Copy token
   - Use in protected endpoints

---

## Best Practices

✅ **Do:**

- Include `Accept-Language` header
- Handle error responses gracefully
- Use pagination for list endpoints
- Store tokens securely
- Refresh tokens before expiration

❌ **Don't:**

- Expose tokens in logs
- Hardcode API URLs
- Ignore error codes
- Send sensitive data in query params
- Use production token in tests

---

## Getting Help

- See `SETUP.md` for configuration
- Check `DEVELOPMENT.md` for implementation patterns
- Review `.github/copilot-instructions.md` for coding standards
- View full Postman docs in `docs/postman-routes.md`

---

**Need help? Check the docs or contact the team! 🚀**
