# BooklyX Backend - Developer & AI Instructions

**⚠️ CRITICAL WORKFLOW RULE**: Do NOT execute `git commit` or `git push` until explicitly requested by the project owner. This constraint is mandatory.

---

## 1. Project Architecture (Feature-Based)

- The application is divided into `src/modules/*` (e.g., `auth`, `users`, `admin`, `branch_admin`)
- Strict flow per request: `Route -> Controller -> Service -> Prisma (through src/lib/prisma.js)`
- Mental model for this booking backend (Fresha-like):
  - `auth`: identity and verification lifecycle
  - `users`: internal account creation and management
  - `branch_admin`: onboarding applications and verification
  - `admin`: approval/rejection and supervision flows
- Each module MUST contain:
  - `[module].controller.js`
  - `[module].service.js`
  - `[module].routes.js`
  - `[module].validation.js` (if needed)

---

## 2. Controller Rules

- No business logic inside controllers
- Controller responsibility ONLY:
  - Receive request
  - Call validation (if needed)
  - Call service
  - Return response

- Must use:
  - `asyncHandler`
  - `successResponse`

- Controller output contract:
  - Success responses must be sent through `successResponse`
  - Errors must be delegated to global error middleware (no local formatting logic)

---

## 3. Service Rules

- All business logic MUST be inside services
- All DB access MUST be inside services
- Never throw raw errors
- Always throw domain-specific error classes that extend `AppError`
- Services must be reusable and independent
- No dependency on Express داخل services

- Error-to-HTTP guidance:
  - Validation/business input errors -> `400`
  - Unauthorized/auth errors -> `401`
  - Forbidden role/access errors -> `403`
  - Not found domain entities -> `404`
  - Conflict/duplicate state -> `409`

---

## 4. Validation Rules (Zod)

- Never write validation inside controllers or services
- Always use `[module].validation.js`

- Use Zod schemas only
- Use helper function (e.g., `validateInput(schema, data)`)

- Validation flow:
  - `safeParse`
  - On failure → throw a domain error extending `AppError`
  - Map errors to `tr.KEY`
  - For all enum validation failures, always use one generic key: `tr.INVALID_ENUM_VALUE`
  - Detect enum failures by Zod issue code: `firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value"`
  - Always attach available enum options dynamically in error params from either shape: `{ values: (firstIssue.options ?? firstIssue.values)?.join(", ") }`

- Never trust `req.body`

---

## 5. Package-First Approach (IMPORTANT)

- Do NOT implement common logic manually if a well-known package exists

### Always prefer:

- Validation → `zod`
- Hashing → `bcrypt`
- Auth → `jsonwebtoken`
- Date → `dayjs`
- Env → `dotenv`
- DB → `prisma`

### Rules:

- Avoid reinventing the wheel
- Use stable, well-known libraries only
- Keep usage consistent across project

---

## 6. Global Error Handling

- No `try/catch` in controllers
- Always use `asyncHandler`

- Services throw:
  - Domain errors extending `AppError`

- Global error handler:
  - formats response
  - handles translation

---

## 7. Localization (i18n)

- Never return raw strings
- Never hardcode user-facing text in controllers, services, validations, or middleware
- Always use `tr.KEY`
- Translation handled using:
  - `t(tr.KEY, lang)`

---

## 8. Database Rules (Prisma)

- No DB access in controllers
- All DB logic inside services
- Import Prisma in modules through `src/lib/prisma.js` (centralized instance)

- Use:
  - `select` (avoid overfetching)
  - `include` carefully

- Use transactions for multi-step operations
- Avoid N+1 queries

---

## 9. Security Rules

- Never trust input
- Always validate using Zod
- Sanitize sensitive data (e.g., remove password)
- Do not expose internal errors
- Use proper HTTP status codes

---

## 10. Performance Rules

- Avoid unnecessary DB calls
- Use pagination for lists
- Use `select` instead of full objects
- Avoid blocking operations
- Keep services efficient

---

## 11. Async Rules

- No unhandled promises
- No try/catch in controllers
- Always use `asyncHandler`

---

## 12. Response Rules

- Always use `successResponse`
- Never use raw `res.json`
- Keep response structure consistent: `{ status, error, message, data }`

---

## 13. Routing

- Define routes in `[module].routes.js`
- Register all modules in `src/routes/index.js`
- Do NOT touch `server.js`

---

## 14. Testing

- Use Jest
- Place tests inside `__tests__` per module
- Mock Prisma & external services
- Focus on service layer

---

## 15. Code Quality Rules

- No duplicate code
- No dead code
- No unused imports
- Follow SOLID principles
- Prefer simple, readable code

---

## 16. Controller Pattern (Reference)

```javascript
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { someServiceFunction } from "./example.service.js";

export const exampleHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await someServiceFunction(req.body);
  successResponse(res, 200, t(tr.SUCCESS_KEY, lang), result);
});
```

## 17. Implementation Checklist (Quick)

- Add/extend module files in `src/modules/<module>/`
- Add or update Zod schema in `[module].validation.js`
- Keep business logic and Prisma calls inside `[module].service.js`
- Throw domain errors extending `AppError` with `tr.KEY`
- Ensure all user-facing messages/errors use translation keys (no hardcoded text)
- Use `asyncHandler` + `successResponse` in controller
- Register routes in `src/routes/index.js`
- Add/update service-layer Jest tests in `__tests__`
- If API surface changed: update OpenAPI docs and run `npm run apidog:sync`

## 18. FINAL RULE (MANDATORY)

- Write unit tests for core logical functions and services using `Jest`.
- Store tests inside the module directory in a `__tests__` folder (e.g., `src/modules/auth/__tests__/auth.service.test.js`).
- Mock database interactions (Prisma) and third-party dependencies when writing unit tests. Use `npm test` to run them.

## 8. OpenAPI + Apidog Sync

- When adding new API endpoints or routes, update `openapi.yaml` first.
- Validate using: `npm run openapi:validate`
- Sync to Apidog using: `npm run apidog:sync`
- Requires valid Apidog credentials in `.env` (`APIDOG_ACCESS_TOKEN`, `APIDOG_PROJECT_ID`).

- This file is the single source of truth for AI development flow in this repository
- Follow `.github/ai_workflow.md` for the execution cycle and phase gates
- For quick daily checklists: `.github/ai_workflow.strict.md`
- Do NOT skip steps
- Do NOT change flow order
- See `.github/ai_workflow.md` for full workflow details.
