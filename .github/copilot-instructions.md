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

### 1.1. Prisma Enum vs. Custom Enum

- **Prisma Enum**: Use for values stored in the database that are generated from `schema.prisma`.
- **Custom Enum**: Use for business logic values not in the database, stored in `src/utils/enums.js`.

---

## 2. Controller Rules

- No business logic inside controllers
- Controller responsibility ONLY:
  - Receive request
  - Call validation (if needed)
  - Call service
  - Return response
- **New Rule**: Do not call `getLanguage(req)` or `t(tr.KEY, lang)` inside the controller. This is now handled by the global error handler.

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
  - Prefer Prisma enums or shared constant enums for validation and business rules instead of hardcoded literal values
  - Validation helpers should return translation keys and params only; do not translate inside validation helpers

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
  - Error constructors should take translation keys, not language arguments; translation happens in the global error handler

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
  - Schema validation messages should be translation keys, not plain text
  - Prefer the auth-service pattern: store `tr.KEY` in the error message and let the error middleware translate it

---

## 8. Database Rules (Prisma)

- No DB access in controllers
- All DB logic inside services
- Import Prisma in modules through `src/lib/prisma.js` (centralized instance)
- If you change a Prisma model/schema, update `prisma/seed.js` in the same change so seeded data stays aligned with the schema.
- After Prisma schema/model changes, run `npx prisma generate` before tests so generated types stay in sync.
- If Prisma schema changes are part of a real feature change, apply them with `npx prisma migrate dev --name <descriptive-name>` before validating the feature.
- If Prisma reports drift or asks for a reset, treat `npx prisma migrate reset` as destructive development-only maintenance and ask for confirmation before using it.
- After any schema-driven migrate or reset, re-run `npx prisma generate` and confirm `prisma/seed.js` still matches the schema.

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

## 16. Module File Patterns (Reference)

### 16.1 `[module].controller.js`

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

### 16.2 `[module].service.js`

```javascript
import prisma from "../../lib/prisma.js";
import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

export class ModuleValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ModuleValidationError";
  }
}

export async function someServiceFunction(payload) {
  if (!payload?.id) {
    throw new ModuleValidationError(tr.INVALID_ID);
  }

  const entity = await prisma.someModel.findUnique({
    where: { id: payload.id },
    select: { id: true },
  });

  if (!entity) {
    throw new AppError(tr.NOT_FOUND, 404);
  }

  return entity;
}
```

### 16.3 `[module].routes.js`

```javascript
import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import { someHandler } from "./example.controller.js";

const moduleRouter = Router();

moduleRouter.get(
  "/example",
  authenticate,
  authorize(Role.branch_admin),
  someHandler,
);

export default moduleRouter;
```

### 16.4 `[module].validation.js`

```javascript
import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { ModuleValidationError } from "./example.service.js";

export const someSchema = z.object({
  id: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
});

export function validateModuleInput(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];

  if (
    firstIssue.code === "invalid_enum_value" ||
    firstIssue.code === "invalid_value"
  ) {
    const enumValues = firstIssue.options ?? firstIssue.values;
    throw new ModuleValidationError(tr.INVALID_ENUM_VALUE, {
      values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
    });
  }

  throw new ModuleValidationError(firstIssue.message);
}
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
- If Prisma schema changes, update `prisma/seed.js` in the same change and regenerate Prisma client.
- If the schema change needs a database migration, run `npx prisma migrate dev --name <descriptive-name>`; if drift is detected, only use `npx prisma migrate reset` after confirming data loss is acceptable in the development DB.
- If API surface changed: update OpenAPI docs and run `npm run apidog:sync`
- If you add a mobile-only module like `staff`, keep it under `src/modules/staff/` and protect it with `Role.staff`

## 18. OpenAPI Endpoint Pattern (Required)

- Every endpoint in `openapi.yaml` MUST include:
  - `tags`
  - `summary`
  - `description`
  - `operationId` (unique and stable)
  - Standard headers where applicable: `AcceptLanguageHeader` and `PlatformHeader`
  - `requestBody` with `schema` and `examples` for write operations (`POST`, `PUT`, `PATCH`)
  - `responses` with at least one success response (`200`/`201`) including response examples for JSON payloads
  - Standard error responses where applicable (`400`, `401`, `403`, `404`, `409`, `429`)

- `operationId` naming convention:
  - camelCase
  - starts with HTTP action semantics (`get`, `post`, `put`, `patch`, `delete`)
  - includes resource and key identifiers (example: `patchStaffAppointmentsByAppointmentIdAccept`)

### 18.1 Endpoint Template

```yaml
/resource/path/{id}:
  patch:
    tags: [Module]
    summary: Short action summary
    description: Clear endpoint behavior and intent.
    operationId: patchResourcePathByIdAction
    security:
      - bearerAuth: []
    parameters:
      - $ref: "#/components/parameters/AcceptLanguageHeader"
      - $ref: "#/components/parameters/PlatformHeader"
      - name: id
        in: path
        required: true
        schema:
          type: integer
          minimum: 1
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/SomeRequest"
          examples:
            default:
              $ref: "#/components/examples/SomeRequest"
    responses:
      "200":
        description: Action completed successfully
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ApiSuccess"
            examples:
              default:
                $ref: "#/components/examples/SimpleSuccessResponse"
      "400":
        $ref: "#/components/responses/BadRequest"
      "401":
        $ref: "#/components/responses/Unauthorized"
      "403":
        $ref: "#/components/responses/Forbidden"
      "404":
        $ref: "#/components/responses/NotFound"
```

## 19. FINAL RULE (MANDATORY)

- Write unit tests for core logical functions and services using `Jest`.
- Store tests inside the module directory in a `__tests__` folder (e.g., `src/modules/auth/__tests__/auth.service.test.js`).
- Mock database interactions (Prisma) and third-party dependencies when writing unit tests. Use `npm test` to run them.

## 20. OpenAPI + Apidog Sync

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
