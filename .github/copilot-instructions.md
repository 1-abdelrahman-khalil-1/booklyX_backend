# BooklyX Backend — Copilot Instructions

## Project Overview

BooklyX is a graduation project backend for a booking platform built with **Node.js, Express 5, TypeScript, Prisma 7, Zod, and PostgreSQL**.

Planned domain modules: **Users, Bookings, Payments (card only), RBAC, Loyalty, Service Approval Workflow**.

User roles: `CLIENT`, `STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`.

Platform access by role:

- `CLIENT`: App and Web
- `STAFF`: App only
- `BRANCH_ADMIN`: Web only
- `SUPER_ADMIN`: Web only

---

## Architecture: Strict Layered Pattern

Every module **must** follow this exact 4-layer structure. Never mix responsibilities between layers.

```
Route → Controller → Service → Prisma (via src/lib/prisma.ts)
```

| Layer      | File                | Responsibility                                                                          |
| ---------- | ------------------- | --------------------------------------------------------------------------------------- |
| Route      | `*.routes.ts`       | Register endpoints only. No logic.                                                      |
| Controller | `*.controller.ts`   | Parse `req`/`res`. Map service errors to HTTP codes. No business logic.                 |
| Service    | `*.service.ts`      | Input validation, business logic, password hashing, throw typed errors. No `req`/`res`. |
| DB         | `src/lib/prisma.ts` | Single shared `PrismaClient` instance using `PrismaPg` adapter.                         |

**See `src/modules/users/` for the canonical example of this pattern.**

---

## Prisma 7 — Critical Setup Details

- **Client is generated to `src/generated/prisma/`** (not `node_modules`). Run `npx prisma generate` after every schema change.
- **Never import from `@prisma/client`** — always use the generated path:
  ```ts
  import { Prisma } from "../../generated/prisma/index.js";
  ```
- **`PrismaClient` requires a driver adapter** (Prisma 7 breaking change):
  ```ts
  // src/lib/prisma.ts
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "../generated/prisma/index.js";
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  export default new PrismaClient({ adapter });
  ```
- Database URL lives in `prisma.config.ts` (for CLI) and `.env` (for runtime via `dotenv`).
- `src/generated/prisma/` is gitignored — always run `npx prisma generate` after cloning.

### Enum Rule (Always)

- Prisma enums are **value-only**. Do not put computed flags or behavior inside enums (e.g. no `isClient => ...`).
- Keep enum-related logic in TypeScript (service/helper), for example: `role === Role.client`.
- For role/platform access checks, use a dedicated helper function (e.g. `isPlatformAllowedForRole(role, platform)`) instead of string comparisons spread across files.

---

## ESM Rules (project uses `"type": "module"`)

All local imports **must** include `.js` extensions, even for `.ts` source files:

```ts
import prisma from "../../lib/prisma.js"; // ✅
import prisma from "../../lib/prisma"; // ❌
```

---

## Error Handling Pattern

Services throw **typed domain errors** using **i18n message keys** (not hardcoded strings). Controllers catch them, detect the user's language, and use the response helpers.

```ts
// Service throws with a message KEY:
throw new AuthValidationError(tr.EMAIL_REQUIRED); // → 400
throw new DuplicateAccountError(tr.DUPLICATE_EMAIL); // → 409
// Unexpected errors bubble up to global error middleware // → 500

// Controller catches and translates using response helpers:
const lang = getLanguage(req);
if (error instanceof AuthValidationError)
  return void errorResponse(res, 400, t(error.message, lang, error.params));
```

Detect duplicate DB entries via Prisma error code `P2002` (`PrismaClientKnownRequestError`).

---

## Security Conventions

- **Never return `password`** in any response. Strip it with destructuring: `const { password: _, ...safeUser } = user;`
- Hash passwords with `bcrypt` (salt rounds: `10`) inside the **service layer only**.
- Validate all user input in the **service layer** before touching the database.

---

## API Response Contract

Every response — success **and** error — must follow this unified shape. Never use `res.json()` or `res.status().json()` directly in controllers or middleware.

```json
// Success
{ "status": 200, "error": false, "message": "Login successful.", "data": { ... } }

// Error
{ "status": 400, "error": true, "message": "Email is required.", "data": null }
```

### Helpers — `src/utils/response.ts`

```ts
import { successResponse, errorResponse } from "../../utils/response.js";

// In a controller:
successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), data);
errorResponse(res, 400, t(tr.EMAIL_REQUIRED, lang));
```

- `successResponse(res, status, message, data?)` — `data` defaults to `null` when omitted.
- `errorResponse(res, status, message)` — always sets `data: null`.
- **Never** return a nested `{ error: { ... } }` object. Only the flat contract above.

### Global Error Middleware

`server.ts` registers a 4-argument Express error handler that catches any unhandled thrown errors and returns a `500` in the unified format.

---

## Validation — Zod v4

All input validation uses **Zod** schemas. Never write manual `if/throw` chains for validation.

### How it works

1. Define a Zod schema with i18n keys as error messages (Zod **v4** syntax):
   ```ts
   const loginSchema = z.object({
     // z.email() is the top-level email type in Zod v4 (z.string().email() is deprecated)
     email: z.email({
       error: (issue) => {
         if (issue.input === undefined) return tr.EMAIL_REQUIRED;
         return tr.EMAIL_INVALID;
       },
     }),
     password: z.string({ error: tr.PASSWORD_REQUIRED }),
   });
   ```
2. Parse input via a helper that catches `ZodError` and re-throws the project's typed error:
   ```ts
   function parseWithAuthError<T>(schema: z.ZodType<T>, data: unknown): T {
     const result = schema.safeParse(data);
     if (result.success) return result.data;
     throw new AuthValidationError(result.error.issues[0].message);
   }
   ```
3. For **enum validation**, use `z.enum(PrismaEnum)` — Zod v4 merged `nativeEnum` into `enum`, so `z.nativeEnum()` is deprecated.
4. For **dynamic error params** (like listing allowed values), check the message key and attach params.

### Zod v4 API — Breaking Changes to Know

| Zod v3 (old — deprecated)   | Zod v4 (correct)          |
| --------------------------- | ------------------------- |
| `z.string().email(msg)`     | `z.email({ error: ... })` |
| `z.nativeEnum(Enum, {...})` | `z.enum(Enum, {...})`     |
| `{ required_error: "..." }` | `{ error: "..." }`        |

### Rules

- All Zod schemas live in the **service file** where they are used.
- Every error message in a schema must be an **i18n key** from `tr` — never a hardcoded string.
- Use `.safeParse()` + helper function (not `.parse()`) so we control the error type thrown.
- Zod handles type checking, required fields, format validation, and min/max — no manual `typeof` or regex needed.

---

## i18n — Internationalization

All user-facing messages (errors, success responses) are **translated** via a lightweight custom i18n system. No external library is used.

### File Structure

```
src/lib/i18n/
  keys.ts            # Central `tr` object with all message key constants
  index.ts           # `t(key, lang, params?)` translator + `getLanguage(req)` helper
  locales/
    en.ts            # English translations (default/fallback)
    ar.ts            # Arabic translations
```

### Rules

1. **Services** throw errors using keys from `tr`: `throw new AuthValidationError(tr.EMAIL_REQUIRED)`.
2. **Controllers** detect language via `getLanguage(req)` (reads `Accept-Language` header → `"ar"` or `"en"`).
3. **Controllers** translate before responding: `t(error.message, lang)` or `t(tr.SUCCESS_KEY, lang)`.
4. **Never put hardcoded user-facing strings** in controllers or services — always use `tr.KEY`.
5. For dynamic values, use `{{placeholder}}` interpolation:
   ```ts
   throw new AuthValidationError(tr.PLATFORM_MUST_BE_ONE_OF, {
     values: "APP, WEB",
   });
   // English → "Platform must be one of: APP, WEB."
   // Arabic  → "يجب أن تكون المنصة واحدة من: APP, WEB."
   ```
6. When adding a new message: add key to `keys.ts`, add translations to **both** `en.ts` and `ar.ts`.
7. `Messages` type ensures **type-safe completeness** — missing translations cause compile errors.

---

## Verification System

Email, phone, and password-reset verification all use the **same `VerificationCode` table** — a single unified approach.

### VerificationCode Model

```prisma
enum VerificationType { EMAIL  PHONE  PASSWORD_RESET }

model VerificationCode {
  id        Int              @id @default(autoincrement())
  userId    Int
  type      VerificationType
  codeHash  String           // bcrypt hash of the OTP — never store raw codes
  expiresAt DateTime
  used      Boolean          @default(false)
  attempts  Int              @default(0)
  createdAt DateTime         @default(now())
  user      User             @relation(...)
  @@index([userId, type])
}
```

### OTP Rules

- Codes are **6-digit**, generated with `crypto.randomInt(100000, 1000000)` (cryptographically secure).
- The **raw code** is sent to the user; only the **bcrypt hash** is stored in the DB (same reason we hash passwords).
- Expiry is controlled by `VERIFICATION_CODE_EXPIRES_MINUTES` env var (default: `10`).
- **Max 5 failed attempts** per code → `MaxAttemptsExceededError` (HTTP 429) after limit.
- Each failed attempt increments `attempts` counter. User must request a new code to unlock.
- Creating a new code **deletes all previous unused codes** of the same type for that user.

### Email / Phone Flow

1. `POST /auth/send-verification-email` → generates OTP, stores hash, emails raw code.
2. `POST /auth/verify-email` with `{ email, code }` → validates hash, marks `emailVerified = true`.

Same pattern for phone via `send-phone-verification` / `verify-phone` (auth-protected).

### Password Reset Flow (3 steps)

1. `POST /auth/request-password-reset` `{ email }` → generate `PASSWORD_RESET` OTP, email it.
2. `POST /auth/verify-password-reset` `{ email, code }` → validate OTP → returns `{ resetToken }` (15-min JWT with `purpose: "PASSWORD_RESET"`).
3. `POST /auth/reset-password` `{ resetToken, newPassword }` → verify JWT purpose → update password.

The short-lived JWT in step 2 is a stateless proof that the OTP was already verified. It carries `purpose: "PASSWORD_RESET"` so it cannot be used as a regular auth token.

> **Important:** All verification uses OTP codes — no token/link flows anywhere in the system.

---

## Key Commands

```bash
npm run dev                  # Start dev server with hot reload (tsx watch)
npx prisma generate          # Regenerate client after schema changes
npx prisma migrate dev       # Create and apply a new migration
npx prisma validate          # Validate schema (source of truth for Prisma 7)
```

---

## Teaching Mode

This project is being built by a learner. When generating or modifying code, always:

1. Explain what each file/function is responsible for and **why** it's structured that way.
2. Describe what happens when input is invalid or an edge case is hit.
3. When introducing a new concept (middleware, transaction, enum, JWT, etc.), provide a short beginner-friendly explanation and a small example.
4. After any architectural change, summarize the **updated mental model** of the system.
5. Map every error scenario to its HTTP status code and explain the choice.

---

## Architecture Compliance

- If a suggestion violates the layered architecture (Route → Controller → Service → Prisma), **explicitly explain why** it's a violation and propose a fully compliant alternative before proceeding.
- If a shortcut is possible but reduces maintainability (e.g., putting logic in a controller, skipping typed errors, inline SQL), **explain the tradeoff clearly** before applying it — never silently take the shortcut.

---

## Prefer Established Libraries

Always prefer well-known, battle-tested npm packages over manual implementations when they exist. Examples:

| Task             | Use this       | Not this                 |
| ---------------- | -------------- | ------------------------ |
| Input validation | `zod`          | Manual `if/typeof/regex` |
| Password hashing | `bcrypt`       | Custom hashing           |
| JWT              | `jsonwebtoken` | Manual token logic       |
| Email            | `nodemailer`   | Raw SMTP                 |
| ORM              | `prisma`       | Raw SQL queries          |

Before writing utility code from scratch, check if an existing dependency or a lightweight npm package already solves the problem. Only write custom code when no suitable library exists or when the solution is trivially simple (< 5 lines).

---

## System State Tracking

At the end of any major change (new module, schema migration, new middleware, auth/RBAC addition), always provide a **"Current Backend State Snapshot"** in this format:

```
### 📸 Current Backend State Snapshot

**Active Modules:** <list of modules with their available endpoints>
**Database Models:** <list of Prisma models and their key fields>
**Auth Status:** <e.g., Not implemented / JWT issued on login / Refresh tokens supported>
**RBAC Status:** <e.g., Not implemented / Role enum exists / Middleware enforced on routes>
**Known Technical Debt:** <list of shortcuts, missing validations, or deferred work>
```
