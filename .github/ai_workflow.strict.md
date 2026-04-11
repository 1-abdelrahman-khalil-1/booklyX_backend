# AI Workflow — BooklyX Backend (Strict Mode)

Use this file as a daily quick-run checklist.
For full details, see `.github/ai_workflow.md`.

## 1) Analyze First

- Identify module, actor, and flow position.
- Identify dependencies and impacted endpoints/models.

## 2) Validate Input

- Validate `body`, `params`, and `query` using Zod.
- Keep schemas/helpers in `[module].validation.js`.
- Controller calls validation helper before service.
- Map validation errors to `tr.KEY`.

## 3) Enforce Access

- Require auth when needed.
- Enforce RBAC before business logic.

## 4) Implement In Service Layer

- Business logic and DB access only in service.
- Throw domain errors extending `AppError`.
- Never hardcode user-facing text; use `tr.KEY` + `t(...)`.
- Use Prisma `select`, avoid N+1.
- Use transaction for multi-write critical flows.
- BranchAdmin onboarding must allow re-apply after rejection.
- Do not enforce permanent uniqueness for BranchAdmin application `email`/`phone` in a way that blocks rejected applicants from applying again.

## 5) Keep Controller Thin

- No business logic.
- No DB access.
- Use `asyncHandler` and `successResponse`.

## 6) Routing Rules

- Define routes in `[module].routes.js`.
- Attach auth/RBAC/request guards in proper order.
- Register module routes in `src/routes/index.js`.
- Do not modify `src/server.js` unless explicitly requested.

## 7) Self-Review Gate

- Validation exists and is wired.
- RBAC checks exist.
- No controller business logic.
- No hardcoded user-facing text.
- No duplicate/unnecessary DB calls.
- Transaction used where required.

## 8) Test Gate

- Add/update service-level tests in `__tests__`.
- Include negative paths (auth, validation, business rules).

## 9) Docs Gate

- If API surface changed: follow `.github/prompts/update_docs.prompt.md` for full checklist.

## 10) Done Criteria

A task is done only if architecture, validation, RBAC, i18n, tests, and docs gates are all satisfied.
