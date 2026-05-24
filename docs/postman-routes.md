# BooklyX Backend — Endpoints + Postman Guide

This file is the single source of truth for:

1. endpoint explanation,
2. request examples,
3. response examples,
4. direct Postman sync.

Response payload keys are returned in `snake_case` across the API.

## 1) Default Accounts (All Roles)

Seed first:

```bash
npx prisma db seed
```

Available test users after seed:

| Role           | Email                       | Password | Phone       | Platform | Notes                                 |
| -------------- | --------------------------- | -------- | ----------- | -------- | ------------------------------------- |
| `super_admin`  | admin@booklyx.com           | 12345678 | 01000000000 | WEB      | Full admin access                     |
| `client`       | abdo.khalil@booklyx.com     | 12345678 | 01000000001 | WEB      | Abdo Khalil                           |
| `client`       | eslam.wael@booklyx.com      | 12345678 | 01000000002 | WEB      | Eslam Wael                            |
| `branch_admin` | mahmoud.ibrahim@booklyx.com | 12345678 | 01000000011 | WEB      | Mahmoud Ibrahim (Hassan Beauty Salon) |
| `branch_admin` | ahmed.samir@booklyx.com     | 12345678 | 01000000012 | WEB      | Ahmed Samir (Samir Health Clinic)     |
| `branch_admin` | eslam.branch@booklyx.com    | 12345678 | 01000000020 | WEB      | Eslam Wael (Eslam Premium Spa)        |
| `staff`        | mazen.tamer@booklyx.com     | 12345678 | 01000000021 | WEB      | Mazen Tamer                           |
| `staff`        | abdo.badr@booklyx.com       | 12345678 | 01000000022 | WEB      | Abdo Badr                             |
| `staff`        | mahmoud.staff@booklyx.com   | 12345678 | 01000000030 | WEB      | Mahmoud Ibrahim (Eslam Premium Spa)   |
| `staff`        | karim.staff@booklyx.com     | 12345678 | 01000000031 | WEB      | Karim Ahmed (Eslam Premium Spa)       |

## 2) Base setup

- Base URL (development): `http://localhost:3000`
- Production API URL (set in Postman environment as `api_url`): `https://booklyxbackend-production.up.railway.app`
- In Postman, prefer using the environment variable `{{api_url}}` or `{{baseUrl}}` as needed. Example: `{{api_url}}/auth/login`.
- Common headers:
  - `Content-Type: application/json`
  - `Accept-Language: en` (or `ar`)
- Platform-aware endpoints need: `platform: APP` or `platform: WEB`
- Protected endpoints need: `Authorization: Bearer <token>`

### Default super_admin Account (For Testing)

For admin-only endpoints, use the `super_admin` account listed in "Default Accounts (All Roles)" above.

## 3) Auth endpoints (`/auth`)

OTP note:

- In development, OTP is fixed to `333333`.
- In production, hardcoded OTP is blocked and will throw an error if used.

### POST `/auth/register`

Creates a CLIENT account and sends email OTP.

Request body:

```json
{
  "name": "Abdo Khalil",
  "email": "abdo.khalil@booklyx.com",
  "password": "12345678",
  "phone": "01000000001"
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
  "email": "abdo.khalil@booklyx.com",
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
    "client_token": "<jwt>",
    "refresh_token": "<jwt>",
    "user": {
      "id": 1,
      "email": "abdo.khalil@booklyx.com",
      "phone": "01000000001",
      "role": "client",
      "status": "ACTIVE",
      "email_verified": true,
      "phone_verified": true
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
  "email": "abdo.khalil@booklyx.com",
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
  "email": "abdo.khalil@booklyx.com",
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
    "client_token": "<jwt>",
    "refresh_token": "<jwt>",
    "user": {
      "id": 1,
      "email": "abdo.khalil@booklyx.com",
      "phone": "01000000001",
      "role": "client",
      "status": "ACTIVE",
      "email_verified": true,
      "phone_verified": true
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
  "email": "abdo.khalil@booklyx.com",
  "phone": "01000000001",
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

## 4) Reviews endpoints (`/reviews`)

### GET `/reviews`

Returns reviews list with optional filters and pagination.

Access:

- Requires authentication token
- Allowed roles: `branch_admin`, `staff`, `super_admin`
- Required header: `platform: WEB` (for `branch_admin` and `super_admin`) or matching token platform

Visibility scope by role:

- `staff`: can view only reviews linked to their own staff profile
- `branch_admin`: can view only reviews linked to services inside their own branch
- `super_admin`: can view all reviews

### GET `/reviews/my`

Returns only reviews created by the currently authenticated user.

Access:

- Requires authentication token
- Allowed roles: `branch_admin`, `staff`, `super_admin`

Query params:

- `serviceId` (optional, positive integer)
- `staffId` (optional, positive integer)
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

Example request:

`GET /reviews/my?page=1&limit=10`

Query params:

- `serviceId` (optional, positive integer)
- `staffId` (optional, positive integer)
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

Example request:

`GET /reviews?serviceId=1&page=1&limit=10`

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Reviews fetched successfully.",
  "data": {
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Great service",
        "created_at": "2026-03-20T03:40:00.000Z",
        "reviewer": {
          "id": 2,
          "name": "Abdo Khalil",
          "role": "staff"
        },
        "service": {
          "id": 1,
          "name": "Haircut"
        },
        "staff": {
          "id": 1,
          "user": {
            "id": 5,
            "name": "Mahmoud Ibrahim"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Error example (`400`):

```json
{
  "status": 400,
  "error": true,
  "message": "Invalid id.",
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
  "email": "abdo.khalil@booklyx.com"
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
  "email": "abdo.khalil@booklyx.com",
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

## 5) branch_admin Onboarding (`/branch-admin`)

### POST `/branch-admin/apply`

Initial endpoint for branch_admin submission.

Request body:

```json
{
  "ownerName": "Mahmoud Ibrahim",
  "email": "mahmoud.ibrahim@booklyx.com",
  "phone": "01000000011",
  "password": "strongPassword123",
  "businessName": "Hassan Beauty Salon",
  "category": "SPA" // "CLINIC", "BARBER",
  "description": "Premium beauty and skincare services.",
  "commercialRegisterNumber": "CR-2026-001",
  "taxId": "TAX-2026-001",
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
  "message": "Your branch submission has been submitted successfully. Please verify your email.",
  "data": null
}
```

---

### POST `/branch-admin/verify-email`

Verifies branch email.

Request body:

```json
{
  "email": "mahmoud.ibrahim@booklyx.com",
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

Verifies branch phone. Moves to `PENDING_APPROVAL`.

Request body:

```json
{
  "email": "mahmoud.ibrahim@booklyx.com",
  "code": "333333"
}
```

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Your branch submission has been verified and is now under review by our team.",
  "data": null
}
```

---

### POST `/branch-admin/resend-code`

Resends OTP for branch submission.

Request body:

```json
{
  "email": "mahmoud.ibrahim@booklyx.com",
  "type": "EMAIL" // "PHONE"
}
```

---

### POST `/branch-admin/create-staff`

Creates a staff user account associated to the logged-in branch_admin's branch.
Requires a Bearer token (`Authorization: Bearer <token>`) of a `branch_admin` and platform header.

Request body:

```json
{
  "name": "Mazen Tamer",
  "email": "mazen.tamer@booklyx.com",
  "age": 28,
  "startDate": "2026-03-01T00:00:00.000Z",
  "phone": "01000000021",
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
    "name": "Mazen Tamer",
    "email": "mazen.tamer@booklyx.com",
    "phone": "01000000021",
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

## 6) Staff endpoints (`/staff`)

Requires `staff` role.

### GET `/staff/profile`

Returns the profile of the authenticated staff member, including their role, branch, and commission.

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Profile retrieved successfully.",
  "data": {
    "user": {
      "id": 7,
      "name": "Mazen Tamer",
      "email": "mazen.tamer@booklyx.com",
      "phone": "01000000021",
      "role": "staff",
      "status": "ACTIVE",
      "created_at": "2026-04-01T10:00:00.000Z",
      "updated_at": "2026-05-01T10:00:00.000Z",
      "staff": {
        "id": 7,
        "profile_image_url": "https://cdn.booklyx.com/staff/mazen-tamer.png",
        "staff_role": "BARBER",
        "age": 28,
        "commission_percentage": 15,
        "isActive": true,
        "created_at": "2026-04-01T10:00:00.000Z",
        "updated_at": "2026-05-01T10:00:00.000Z",
        "branch": {
          "id": 1,
          "business_name": "Hassan Beauty Salon",
          "category": "SPA"
        },
        "professional_profile": {
          "bio": "Senior stylist focused on modern cuts and beard shaping.",
          "experience": 6,
          "license_number": "BARB-7845",
          "specialization": "BARBER",
          "created_at": "2026-04-02T10:00:00.000Z",
          "updated_at": "2026-05-02T10:00:00.000Z"
        },
        "certificates": [],
        "availabilities": [],
        "services": [],
        "reviews": [],
        "average_rating": 4.7,
        "review_count": 34
      }
    }
  }
}
```

### GET `/staff/schedule`

Returns the staff's schedule, grouped into today's and upcoming appointments.

### GET `/staff/appointments`

Returns appointments for the authenticated staff member. Defaults to `PENDING`; optional `status` values are `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELED`.

### PATCH `/staff/appointments/:appointmentId/start`

Marks a confirmed appointment as `IN_PROGRESS`.

- `:appointmentId`: **Integer** (ID of the appointment).

### PATCH `/staff/appointments/:appointmentId/complete`

Marks an appointment as `COMPLETED` and creates a service execution record.

- `:appointmentId`: **Integer** (ID of the appointment).

Request body:

```json
{
  "notes": "Used premium hair wax.",
  "attachments": ["https://cdn.booklyx.com/executions/result-1.jpg"]
}
```

### GET `/staff/income`

Returns income statistics including total earnings, service count, and daily breakdowns.

### GET `/staff/services`

Lists all services that the authenticated staff member is assigned to.

### GET `/staff/availability`

Lists all availability slots for the authenticated staff member.

### POST `/staff/availability`

Creates a new availability slot.

`dayOfWeek` uses JavaScript/dayjs numbering: `0 = Sunday`, `1 = Monday`, `2 = Tuesday`, `3 = Wednesday`, `4 = Thursday`, `5 = Friday`, `6 = Saturday`.

Request body:

```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "status": "AVAILABLE"
}
```

### PUT `/staff/availability/:availabilityId`

Updates an existing availability slot.

`dayOfWeek` uses JavaScript/dayjs numbering: `0 = Sunday`, `1 = Monday`, `2 = Tuesday`, `3 = Wednesday`, `4 = Thursday`, `5 = Friday`, `6 = Saturday`.

### DELETE `/staff/availability/:availabilityId`

Deletes an availability slot.

## 7) super_admin Management (`/admin`)

Requires `super_admin` role.

### GET `/admin/branches`

List all branches.

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Branches retrieved successfully",
  "data": [
    {
      "id": 1,
      "ownerName": "Mahmoud Ibrahim",
      "businessName": "Hassan Beauty Salon",
      "status": "PENDING_APPROVAL"
    }
  ]
}
```

---

### GET `/admin/branches/:id`

Get branch details by ID.

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Branch retrieved successfully.",
  "data": {
    "id": 1,
    "ownerName": "Mahmoud Ibrahim",
    "email": "mahmoud.ibrahim@booklyx.com",
    "status": "PENDING_APPROVAL"
  }
}
```

---

### POST `/admin/branches/:id/approve`

Approve branch and create User.

Success example (`200`):

```json
{
  "status": 200,
  "error": false,
  "message": "Branch approved successfully.",
  "data": {
    "id": 10,
    "email": "mahmoud.ibrahim@booklyx.com",
    "role": "branch_admin"
  }
}
```

---

### POST `/admin/branches/:id/reject`

Reject branch with reason.

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

## 8) Quick test order

### For Client Registration & Login

1. `POST /auth/register`
2. `POST /auth/verify-email` with code `333333`
3. `POST /auth/verify-phone` with code `333333`
4. Use returned token in protected endpoints

### For super_admin Access

1. Run `npx prisma db seed` (first time only)
2. `POST /auth/login` with:
   ```json
   {
     "email": "admin@booklyx.com",
     "password": "12345678",
     "role": "super_admin"
   }
   ```
3. Use returned token in admin-only endpoints like `GET /admin/branches`

## 9) Postman files in repo

- Collection: `docs/postman/booklyx-backend.postman_collection.json`
- Environment: `docs/postman/booklyx-backend.postman_environment.json`

## 10) Sync to Postman Cloud

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

## Additional endpoints

### GET `/branch-admin/profile`

Get authenticated branch admin profile.

Response example:

```json
{
  "status": 200,
  "error": false,
  "message": "Profile retrieved successfully.",
  "data": {
    "user": {
      "id": 1,
      "ownerName": "Prime Salon",
      "email": "branch@example.com",
      "phone": "01000000022",
      "businessName": "Prime Salon",
      "category": "SALON"
    }
  }
}
```

### GET `/admin/users/:id`

Super admin endpoint to fetch any user's public profile (staff nested under `user.staff` when applicable).

Response example:

```json
{
  "status": 200,
  "error": false,
  "message": "User profile retrieved successfully.",
  "data": {
    "user": {
      "id": 7,
      "name": "Mazen Tamer",
      "email": "mazen.tamer@booklyx.com",
      "phone": "01000000021",
      "role": "staff",
      "status": "ACTIVE",
      "staff": {
        "id": 7,
        "branch_id": 1,
        "profile_image_url": "https://cdn.booklyx.com/staff/mazen-tamer.png",
        "age": 28,
        "staff_role": "BARBER",
        "commission_percentage": 15
      }
    }
  }
}
```

After any update in collection JSON, run the same command to push changes to Postman directly.
