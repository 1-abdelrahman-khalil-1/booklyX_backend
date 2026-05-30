# AI Workflow — BooklyX Backend (Final)

## 0) System Awareness (Mandatory)

Before implementation, the agent must understand the system context.

* System type: multi-role booking platform (Fresha-like).
* Core entities:

  * User (`CLIENT`, `STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`)
  * Branch
  * Service
  * Appointment
  * BookingPayment
  * StaffAvailability
  * Review (only has pagination but others no)
  * Offer

Platform expectations:

* CLIENT: mobile app
* STAFF: mobile app
* BRANCH_ADMIN: web dashboard
* SUPER_ADMIN: web dashboard

---

## 0.1 Team Structure: Single Backend Dev + AI Agent

### RACI Legend

* R = Responsible
* A = Accountable
* C = Consulted
* I = Informed

### BooklyX Ownership Model

| Phase                          | Backend Dev | AI Agent |
| ------------------------------ | ----------- | -------- |
| Feature scope and API contract | A/R         | C        |
| Architecture decisions         | A           | C        |
| Validation and business rules  | A           | C        |
| Implementation                 | A           | R        |
| Refactoring proposals          | A           | C        |
| Code review                    | A/R         | C        |
| Security review                | A           | C        |
| Deployment                     | A/R         | I        |

### AI Agent Boundaries

Agent may:

* Generate code
* Generate tests
* Generate documentation
* Suggest refactors
* Reuse existing patterns

Agent must never:

* Bypass RBAC
* Bypass validation
* Bypass business rules
* Change architecture without justification
* Modify `src/server.js` unless explicitly requested

### Backend Developer Responsibilities

* Own architecture
* Own API contracts
* Review generated code
* Validate business logic
* Handle deployments
* Approve schema changes

---

## 0.2 Existing Implementation Awareness (Mandatory)

Before creating:

* new module
* new service
* new endpoint
* new Prisma model
* new DTO shape

Agent must inspect the existing implementation first.

Rules:

* Prefer extending existing modules.
* Reuse existing services when functionality already belongs there.
* Reuse existing validators and patterns.
* Reuse existing response contracts.
* Avoid creating parallel modules that duplicate responsibilities.
* Avoid introducing new architecture patterns.
* Preserve backward compatibility whenever possible.

Never redesign stable architecture without explicit instruction.

---

## 1) Feature Analysis (First Step)

Before implementation identify:

### Module

Examples:

* auth
* appointment
* payment
* service
* review
* offer
* client
* staff
* admin

### Actor

* CLIENT
* STAFF
* BRANCH_ADMIN
* SUPER_ADMIN

### Flow Position

Examples:

* onboarding
* approval workflow
* booking workflow
* checkout workflow
* review workflow

### Dependencies

Examples:

* service
* appointment
* payment
* availability
* reviews
* offers

Example:

Booking

* Module: appointment
* Actor: CLIENT
* Depends on:

  * service
  * staff
  * availability
  * payment

---

## 2) Validation Layer (Zod)

Validation rules:

* Validate body
* Validate params
* Validate query

Schemas must live in:

```text
[module].validation.js
```

Controllers must:

```text
validate
→ service
→ response
```

Use:

```text
safeParse()
```

Validation errors must map to:

```text
tr.KEY
```

Forbidden:

* Inline validation in controllers
* Inline validation in services

---

## 3) Authorization Layer (RBAC)

Before business logic:

* Verify authentication
* Verify role
* Verify ownership when required

Examples:

CLIENT:

* Can create appointments
* Can create reviews for own completed appointments

STAFF:

* Can access assigned work only

BRANCH_ADMIN:

* Can manage own branch resources only

SUPER_ADMIN:

* Platform-wide access

---

## 4) Service Layer (Core Logic)

All business logic belongs here.

All database access belongs here.

Controllers must not contain business logic.

---

## 4.1 Booking Logic

Minimum validations:

1. Service exists.
2. Service is approved.
3. Parent branch is visible.
4. Staff is valid (if provided).
5. Requested slot is available.
6. No double booking.
7. Requested datetime is in the future.

---

## 4.2 Payment Logic

Current project policy:

* Fake payment only.
* No real payment gateway integration.

Implementation must follow the current payment simulation strategy used by the project.

Do not hardcode alternative payment flows without explicit instruction.

---

## 4.3 Payment Flow

1. Create Appointment (PENDING)
2. Create BookingPayment (PENDING)
3. Execute fake payment
4. Success:

   * Payment → PAID
   * Appointment → CONFIRMED
5. Failure:

   * Payment → FAILED
   * Appointment remains PENDING

---

## 4.4 Transactions (Critical)

Use Prisma transactions whenever multiple writes must succeed together.

Examples:

* create appointment
* create payment
* update appointment status

Use:

```text
prisma.$transaction()
```

for atomic operations.

---

## 4.5 Status Lifecycle

Appointment lifecycle typically follows:

```text
PENDING
→ CONFIRMED
→ IN_PROGRESS
→ COMPLETED
```

Additional terminal states may exist:

```text
CANCELLED
```

Agent must respect existing enum states and transitions.

Do not simplify or merge statuses.

---

## 4.6 Business Rules Enforcement

Mandatory rules:

* No double booking.
* No booking in the past.
* Approved services only.
* Visible branches only.
* Payment required before confirmation.
* One review per appointment.
* Reviews only after completion.
* Branch visibility requires:

  * APPROVED
  * active subscription
* Service visibility requires:

  * approved service
  * visible branch

---

## 4.7 Branch Admin Re-Apply Policy

Workflow:

```text
Apply
→ Pending
→ Approved / Rejected
```

Rejected applicants may apply again.

Rules:

* Email is not a permanent historical unique identifier.
* Phone is not a permanent historical unique identifier.
* Allow re-application after rejection.
* Prevent duplicate active applications.

Conflict checks must be implemented in service layer.

---

## 4.8 Response Shape Rule

Preserve existing response contracts.

Rules:

* Do not reshape DB results unnecessarily.
* Do not introduce new response formats without reason.
* Maintain API compatibility.

Controllers may perform light formatting only when required.

---

## 5) Controller Layer

Controller responsibilities:

1. Read request.
2. Read language.
3. Validate request.
4. Call service.
5. Return success response.

Forbidden:

* Business logic
* Direct Prisma access
* Hardcoded text
* Complex transformations

---

## 6) Routing Layer

Responsibilities:

* Define endpoint
* Attach middleware
* Attach RBAC

Rules:

* Register routes in:

  ```text
  src/routes/index.js
  ```

* Validation remains outside routes.

* Never modify:

  ```text
  src/server.js
  ```

unless explicitly requested.

---

## 7) AI Self-Review (Mandatory)

Before finishing implementation verify:

### Validation

* Validation exists.
* Validation is wired correctly.

### Authorization

* RBAC enforced.
* Ownership checks enforced.

### Architecture

* Route → Controller → Service → Prisma respected.

### Logic

* No duplicate DB calls.
* No unnecessary queries.
* No business logic in controllers.

### Internationalization

* No hardcoded user-facing text.
* Use:

  ```text
  tr.KEY
  ```

### Prisma

If schema changes:

* update migrations
* regenerate Prisma client
* update seed

### Documentation

If API changed:

* update OpenAPI
* update Apidog
* update docs

---

## 8) Performance Check

Rules:

* Use Prisma select.
* Avoid overfetching.
* Avoid N+1 queries.
* Avoid unnecessary round trips.
* Use pagination for list endpoints.
* Prefer cursor pagination for large datasets when applicable.

---

## 9) Testing Flow

Minimum booking/payment tests:

### Success Path

* successful booking
* successful payment

### Failure Path

* payment failure
* unavailable slot
* double booking
* past booking

### Authorization

* unauthorized access
* forbidden access

Tests should focus on:

```text
service layer
```

using mocked dependencies.

Location:

```text
src/modules/**/__tests__
```

---

## 10) Global Rules (Must Follow)

Never:

* modify server.js without permission
* bypass RBAC
* bypass validation
* bypass business rules
* access Prisma outside service layer
* hardcode user-facing text
* redesign architecture unnecessarily
* assume requirements without verification

Always:

* inspect existing implementation first
* preserve current architecture
* preserve current API contracts
* preserve current workflows

---

## 11) Final Execution Flow

1. Analyze feature.
2. Identify actor and dependencies.
3. Validate request.
4. Enforce RBAC.
5. Execute business rules.
6. Execute Prisma operations.
7. Use transactions when required.
8. Return translated response.
9. Run self-review.
10. Verify performance impact.

---

## 12) Done Criteria

Task is not complete until:

* Route → Controller → Service → Prisma respected.
* Validation implemented.
* RBAC enforced.
* Business rules enforced.
* Errors are localized.
* No hardcoded user-facing text.
* Tests updated when behavior changes.
* Documentation updated when API changes.
* Existing architecture and contracts remain compatible.
