# BooklyX Backend - Developer & AI Instructions

**⚠️ CRITICAL**: Do NOT execute `git commit` or `git push` until explicitly requested by the project owner.

---

## Human Approval Gate (Mandatory)

STOP and ask for confirmation before continuing if any of the following occurs:

- Architectural uncertainty or multiple valid approaches
- Ambiguous business logic
- Schema/migration changes or Prisma model modifications
- Breaking API changes
- Deleting or renaming files
- Refactoring shared/core logic
- Security-sensitive or RBAC/auth/token decisions
- Unclear translation keys or localization behavior
- Any operation with potential data loss
- Any action that modifies more files/modules than originally expected

Do not assume intent. Present options, tradeoffs, and recommended approach first. Continue only after explicit confirmation. This rule has higher priority than implementation speed.

---

## 1. Project Architecture (Feature-Based)

- Modules live in `src/modules/*`: `auth`, `users`, `admin` (submodules: `financial`, `analytics`), `branch_admin`, `client`, `plans`, `offers`, `staff`, `reviews`.
- Strict flow: **Route → Controller → Service → Prisma** (centralized `src/lib/prisma.js`).
- Mental model:
  - `auth`: identity, session, verification lifecycle
  - `client`: home dashboard, map discovery, booking wizard, payments, appointments history, favourites
  - `branch_admin`: branch onboarding, verification, subscription and management
  - `admin` / `super_admin`: moderation, approvals, global actions, platform financial summary, analytics overview, monthly revenue charting
  - `staff`: staff profiles, schedules, earnings
  - `plans`: subscription plans and limits
- Each module MUST contain: `[module].controller.js`, `[module].service.js`, `[module].routes.js`, `[module].validation.js` (unless intentionally lightweight).

### 1.1 IDs, Enums & Models

- All primary keys are `Int` with `autoincrement()`. No UUIDs.
- Prefer **Prisma enums** (`prisma/schema.prisma`) for persisted values. Use `src/utils/enums.js` only for non-persisted, app-level enumerations.
- Notable enums: `Role`, `BranchStatus`, `ServiceApprovalStatus`, `AppointmentStatus`, `PaymentStatus` (especially `REFUNDED`), `OfferDiscountType`.

---

## 2. Controller Rules

- **No business logic** inside controllers. Responsibility: receive request → validate → call service → return response.
- Must use `asyncHandler` and `successResponse`. No `try/catch`, no raw `res.json`.
- Validation MUST happen in controller before calling services. Controllers build validated payloads and convert uploaded files to URLs.
- Translation: call `getLanguage(req)` and use `t(tr.KEY, lang)` for success responses. Errors use `AppError` with `tr.KEY` (translated by global error handler).

---

## 3. Service Rules

- All business logic and DB access MUST be inside services.
- Never throw raw errors — always throw domain-specific errors extending `AppError` with `tr.KEY` and optional `params`.
- No dependency on Express inside services. Services must be reusable and independent.
- Use `src/lib/mappers/profile.mapper.js` for profile responses. Keep profile shaping centralized.
- Preserve DB-selected response shapes unless the API contract explicitly requires transformation.
- Error-to-HTTP: `400` (validation/business), `401` (auth), `403` (forbidden), `404` (not found), `409` (conflict).

### 3.1 Subscription & Plan Guards

Use `src/utils/subscriptionGuards.js` helpers: `ensureActiveSubscription`, `ensureServiceLimitNotExceeded`, `ensureStaffLimitNotExceeded`, `ensureOffersEnabled`, `ensureLoyaltyEnabled`. Apply these when creating services, staff, offers, or subscription-gated features.

---

## 4. Validation Rules (Zod)

- Never write validation inside controllers or services — always use `[module].validation.js`.
- Use Zod schemas only. Prefer shared primitives from `src/lib/validation/primitives.js` and helpers from `src/lib/validation/helpers.js`.
- Validation flow: `safeParse` → on failure throw `AppError`-derived error with `tr.KEY`.
- Enum failures: use `tr.INVALID_ENUM_VALUE` with `{ values: (firstIssue.options ?? firstIssue.values)?.join(", ") }`.
- Validation wrappers should be thin — use the shared `safeParse` helper instead of reimplementing per module.
- Never trust `req.body`.

---

## 5. Package-First Approach

**MANDATORY**: Before implementing any feature or utility, check for existing libraries first.

1. Check `package.json` for what's already installed
2. Search npm if needed
3. Ask before installing new libraries
4. Only code manually when no suitable library exists AND user confirms

**Already installed**: `zod`, `bcrypt`, `jsonwebtoken`, `dayjs`, `dotenv`, `prisma`, `@faker-js/faker` (dev), `multer`, `jest`, `axios` (check). Use these consistently — avoid duplicating or reinventing.

---

## 6. Error Handling & Localization (i18n)

- No `try/catch` in controllers — use `asyncHandler`. Global error handler formats and translates.
- Services throw `AppError` subclasses with `tr.KEY` — never translate inside services or validation helpers.
- Never return raw strings or hardcode user-facing text. Always use `tr.KEY` with `t(tr.KEY, lang)`.
- Error constructors take translation keys, not language arguments.

---

## 7. Database Rules (Prisma)

- No DB access in controllers. Import Prisma through `src/lib/prisma.js`.
- **Seeder Consistency Rule (CRITICAL)**: If you change any schema, model, validation constraints, or business rules that affect seeded data, you MUST update the `seed/` directory (`seed/index.js`, `seed/modules/*`, `seed/generators/*`) in the same change. Always run `node seed/index.js` to verify.
- If seed changes expose new API behavior, update `openapi.yaml` in the same change.
- After schema changes: run `npx prisma generate`. For migrations: `npx prisma migrate dev --name <name>`. For resets: ask for confirmation first (destructive).
- Use `select` (avoid overfetching), `include` carefully. Use transactions for multi-step operations. Avoid N+1 queries.
- Never return raw Prisma objects containing sensitive fields (passwords, token hashes). Always use explicit `select`.
- Move Prisma select configurations for list/details queries into the module's helper file (e.g. `helpers.js`) as exported functions (e.g., `build[Name]PreviewSelect()`) to keep service files clean, focused, and reusable.
- Database: MySQL. Keep `@@index` and `@@map` conventions consistent.
- Important models: `User`, `Client`, `Staff`, `BranchAdmin`, `Plan`, `Service`, `Offer`, `Review`, `Appointment`, `SubscriptionPayment`, `ServiceExecution`.

---

## 8. Security & Auth

- Never trust input — always validate with Zod. Sanitize sensitive data. Use proper HTTP status codes.
- Access token format: `<loginSequence>|<jwt>` (enforced in `src/middleware/authenticate.js`).
- `platform` header is required and must match token's `platform` claim.
- Route protection order: `authenticate` → `authorize(Role.xxx)`.

---

## 9. Routing

- Define routes in `[module].routes.js`. Register in `src/routes/index.js`. Do NOT touch `server.js`.
- **RESTful principles**:
  - Nouns, not verbs in paths: ✅ `POST /branch-admin/staff` ❌ `POST /branch-admin/create-staff`
  - No redundancy: ✅ `GET /branch-admin/staff` ❌ `GET /branch-admin/staff/my-staff`
  - Method semantics: `GET` (fetch), `POST` (create/heavy actions), `PUT` (full replace), `PATCH` (partial/state changes like approve, reject, toggle)
  - Use resource IDs directly in path.
- File upload routes must use configured `multer` middleware.

---

## 10. File Upload Pattern

Files are **NEVER** stored as raw file objects. Flow:

1. Endpoint uses `multipart/form-data`. File fields use `snake_case` (e.g., `profile_image`, `logo`).
2. Controller receives file via `multer` middleware, converts to URL using helper functions.
3. If no file uploaded during update, URL stays `undefined` → Prisma retains old image automatically.
4. Controller validates URL in Zod schema (optional string URL).
5. Service receives and stores URL string in DB.
6. OpenAPI: use `format: binary` for file fields. Do NOT include URL fallback fields in `multipart/form-data` schemas.

---

## 11. Response & Code Quality

- Always use `successResponse`. Response structure: `{ status, error, message, data }`. Keys follow `snake_case` in OpenAPI.
- For profile endpoints, prefer reusable OpenAPI schemas aligned with the shared mapper output.
- No duplicate code, dead code, or unused imports. Follow SOLID principles. Prefer simple, readable code.
- Use pagination for lists. Avoid unnecessary DB calls and blocking operations.

---

## 12. Testing

- Use **Jest**. Place tests in `__tests__` per module. Focus on service layer.
- Mock Prisma & external services. Run with `npm test`.

---

## 13. OpenAPI & Apidog

Every endpoint in `openapi.yaml` MUST include: `tags`, `summary`, `description`, `operationId` (camelCase, starts with HTTP verb, e.g., `patchStaffAppointmentsByAppointmentIdAccept`), standard headers (`AcceptLanguageHeader`, `PlatformHeader`), `requestBody` with schema+examples for writes, `responses` with success + standard errors.

- Validate: `npm run openapi:validate`
- Sync: `npm run apidog:sync` (requires `APIDOG_ACCESS_TOKEN`, `APIDOG_PROJECT_ID` in `.env`)
- When adding/changing endpoints or seed data, update `openapi.yaml` in the same change.

---

## 14. Implementation Checklist

1. Add/extend module files in `src/modules/<module>/`
2. Add Zod schema in `[module].validation.js`
3. Validate in controller before calling service
4. Business logic and Prisma calls in service only
5. Domain errors extend `AppError` with `tr.KEY`
6. All user-facing messages use translation keys
7. Use `asyncHandler` + `successResponse` in controller
8. File uploads: handle in controller → build URL → pass URL to service
9. Register routes in `src/routes/index.js`
10. Add/update Jest tests in `__tests__`
11. If schema changes: update `seed/` files, run `npx prisma generate`, migrate if needed
12. If API surface changed: update `openapi.yaml`, run `npm run apidog:sync`

---

## 15. Business Rules & Appointments

- **Search & Discovery**: Distance search uses `ST_Distance_Sphere` on `lat`/`lng`. Sort: distance first, then rating. Only APPROVED branches with `isSubscriptionActive = true` appear.
- **Booking**: Appointments created as `PENDING` → require payment to become `CONFIRMED`. Failed payments keep `PENDING`. Prevent double booking and past bookings.
- **Cancellations & Refunds**: Restricted by `allowCancellationBeforeHours`. Refunds use discrete `REFUNDED` status — never overload `FAILED`.
- **Reviews**: Only for `COMPLETED` appointments, one review per appointment.

---

## 16. Admin Financial & Analytics

- **Financial Summary** (`/admin/financial/summary`): MoM trends for Monthly Revenue, Active Subscriptions, Refunds, Total Payments. Tracks `SubscriptionPayment` records only.
- **Analytics Overview** (`/admin/analytics/overview`): `revenueThisMonth`, `activeBranches`, `totalUsers`.
- **Revenue Chart** (`/admin/analytics/revenue-chart`): Monthly historical timeline using `dayjs`. Super Admin only.

---

## Final Notes

- This file is the single source of truth for AI development flow.
- Follow `.github/ai_workflow.md` for the execution cycle. Quick checklists: `.github/ai_workflow.strict.md`.
- Do NOT skip steps. Do NOT change flow order.
