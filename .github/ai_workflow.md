# AI Workflow — BooklyX Backend (Final)

## 0) System Awareness (Mandatory)

Before implementation, the agent must understand the system context.

- System type: multi-role booking backend (Fresha-like).
- Core entities:
  - `User` (`CLIENT`, `STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`)
  - `Business`
  - `Service`
  - `Appointment`
  - `Payment`
  - `StaffAvailability`

Platform expectations:

- `CLIENT`: app and web
- `STAFF`: app only
- `BRANCH_ADMIN`: web only
- `SUPER_ADMIN`: web only

### 0.1 Team Structure: Single Backend Dev + AI Agent

**RACI legend:**

- `R`: Responsible (does the work)
- `A`: Accountable (final owner)
- `C`: Consulted (gives input)
- `I`: Informed (kept up to date)

**For BooklyX: You (Backend Dev) + AI Agent**

| Phase                                   | You (Backend Dev) | AI Agent |
| --------------------------------------- | ----------------- | -------- |
| Feature scope and API contract          | A/R               | C        |
| Architecture and validation rules       | A                 | C        |
| Implementation (routes/service/testing) | A                 | R        |
| Code review (self + AI suggestions)     | A/R               | C        |
| Security and i18n checks                | A                 | C        |
| Deploy and QA feedback loop             | A/R               | I        |

**AI Agent boundaries:**

- Drafts code, tests, docs following this workflow + copilot-instructions.md.
- Handles repeated patterns and boilerplate reliably.
- Proposes refactors and optimizations with rationale.
- Must NEVER bypass RBAC/validation/i18n rules.
- Must NEVER modify `src/server.js` without explicit authorization.

**You (Backend Dev):**

- Own final decisions on architecture and API design.
- Review AI-generated code before merge.
- Ensure business logic aligns with product vision.
- Own all deployments and production decisions.

---

## 1) Feature Analysis (First Step)

For each task, identify all of the following first:

- Module (`appointment`, `payment`, `service`, `auth`, ...)
- Actor (`CLIENT`, `STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`)
- Position in flow (pre-payment, post-payment, approval step, etc.)
- Dependencies (services, availability, payment, onboarding state)

Example for booking:

- Module: `appointment`
- Actor: `CLIENT`
- Depends on: `service`, `staff`, `availability`, `payment`

---

## 2) Validation Layer (Zod)

Validation rules:

- Validate `body`, `params`, and `query` as needed.
- Define schemas in `[module].validation.js`.
- Use `safeParse` and map issues to `tr.KEY`.

Execution point:

- Controller calls validation helpers from `[module].validation.js` before calling service.

Forbidden:

- Do not write validation logic inline in controller or service.

---

## 3) Authorization Layer (RBAC)

Before business logic:

- Verify authenticated user identity.
- Verify role and permission for endpoint/action.

Example:

- `CLIENT` can book.
- `STAFF` cannot create client bookings unless explicitly allowed by policy.

---

## 4) Service Layer (Core Logic)

All business logic and all DB access are implemented in service layer only.

### 4.1 Booking Logic

Minimum checks:

1. Service exists.
2. Service is approved/active.
3. Staff is valid (if provided).
4. Staff availability matches requested slot.
5. No double booking.
6. Requested date/time is in the future.

### 4.2 Payment Logic (Mock)

Current project policy:

- No real gateway integration for now.
- Simulated payment response only.

Mock rule:

- `cardNumber === "4242"` -> success
- Otherwise -> failed

### 4.3 Payment Flow

1. Create appointment with `PENDING` status.
2. Execute mock payment.
3. If success:
   - Update appointment to `CONFIRMED`.
   - Create payment record as `PAID`.
4. If failed:
   - Keep appointment `PENDING` or set `FAILED` based on endpoint contract.

### 4.4 Transactions (Critical)

Use Prisma transaction for atomic steps (all-or-nothing) whenever multiple writes must succeed together:

- appointment create
- payment create
- status update

### 4.5 Status Lifecycle

Primary lifecycle:

- `PENDING` -> `CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`

### 4.6 Business Rules Enforcement

- No double booking.
- No booking in the past.
- Service must be approved.
- Confirmation requires successful payment when payment is required by flow.

### 4.7 branch_admin Re-Apply Policy (Mandatory)

- Onboarding flow: `branch_admin submits application` -> `super_admin approves/rejects`.
- If application is rejected, branch_admin is allowed to apply again.
- For `BranchAdmin` applications, `email` and `phone` are NOT globally unique historical identifiers.
- Do not enforce permanent uniqueness on rejected application records.
- Enforce conflict checks in service layer based on active workflow status (for example: prevent duplicates for pending/in-review applications, but allow re-apply after rejection according to business rules).

---

## 5) Controller Layer

Controller responsibilities only:

1. Read request and language.
2. Call validation helper.
3. Call service.
4. Return `successResponse` with translated message.

Forbidden:

- Business logic in controller.
- Direct DB access in controller.
- Hardcoded user-facing text.

---

## 6) Routing Layer

Per endpoint:

- Define route in `[module].routes.js`.
- Attach required middleware in order (auth, RBAC, and request guards as needed by module).

Notes:

- Validation schemas remain in `[module].validation.js`.
- Register module routes in `src/routes/index.js`.
- Never modify `src/server.js` for module routing changes.

---

## 7) AI Self-Review (Mandatory)

Before finalizing any implementation, verify:

- Validation exists and is wired correctly.
- RBAC checks are present.
- Transactions are used when needed.
- No duplicate/unnecessary DB calls.
- No business logic in controller.
- No hardcoded user-facing text (must use translation keys).
- If Prisma models changed, `prisma/seed.js` was updated in the same change and Prisma client was regenerated.
- If the change requires database schema work, use `npx prisma migrate dev --name <descriptive-name>` and only use `npx prisma migrate reset` when drift exists and the development-data loss is explicitly acceptable.

---

## 8) Performance Check

- Use Prisma `select` to avoid overfetching.
- Avoid N+1 queries.
- Avoid unnecessary round trips.
- Prefer pagination in list endpoints.

---

## 9) Testing Flow

Minimum test cases for booking/payment related features:

- Success booking path.
- Double booking prevention.
- Invalid/past time rejection.
- Payment failure path.
- Unauthorized/forbidden access.

Tests location and style:

- Place tests under module `__tests__`.
- Focus on service layer with mocked Prisma/external dependencies.

---

## 10) Global Rules (Must Follow)

- Never modify `src/server.js` unless explicitly requested.
- Never hardcode user-facing text; use `tr.KEY` and `t(...)`.
- Never skip validation.
- Never access DB outside service layer.
- Never bypass RBAC.
- Never assume business rules; verify from module flow and existing contracts.
- Do not make `BranchAdmin.email` or `BranchAdmin.phone` permanently unique in a way that blocks re-application after rejection.

---

## 11) Final Execution Flow (Quick Reference)

1. Analyze feature context and dependencies.
2. Validate input with Zod helpers.
3. Enforce RBAC and access checks.
4. Execute service logic (rules, payment, transaction).
5. Return translated response.
6. Run self-review checks.
7. Apply performance safeguards.

---

## 12) Done Criteria

Task is not done until all apply:

- Architecture flow respected: `Route -> Controller -> Service -> Prisma`.
- Validation + RBAC + business rules are enforced.
- Errors are domain-specific and localized.
- No hardcoded user-facing text.
- Tests added/updated where behavior changed.
- If API surface changed: Follow `.github/prompts/update_docs.prompt.md` for full Postman + docs sync checklist.
