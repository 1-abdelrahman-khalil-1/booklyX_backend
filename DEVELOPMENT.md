# BooklyX Development Workflow

This file keeps the contributor workflow aligned with the current codebase.

## Feature structure

Each feature lives under `src/modules/<feature>/`.

Typical files:

- `<feature>.routes.js`
- `<feature>.controller.js`
- `<feature>.service.js`
- `<feature>.validation.js`
- `<feature>.permissions.js` when needed
- `__tests__/`

## Route registration

All route groups are mounted from `src/routes/index.js`:

- `/auth`
- `/branch-admin`
- `/admin`
- `/files`

When you add a new module:

1. Create the module files.
2. Export a router from `<feature>.routes.js`.
3. Register it in `src/routes/index.js`.
4. Update `openapi.yaml`.

## Recommended implementation order

1. Update `prisma/schema.prisma` if data changes are needed.
2. Run `npx prisma migrate dev --name <change-name>`.
3. Implement validation in the module validation file.
4. Implement business logic in the service file.
5. Add handlers in the controller file.
6. Add routes in the module router.
7. Update `openapi.yaml`.
8. Run tests and OpenAPI validation.

## Testing

Run all tests:

```bash
npm run test
```

Current tests live in:

- `src/modules/auth/__tests__/`
- `src/modules/branch_admin/__tests__/`

## API contract workflow

`openapi.yaml` is the only API source of truth.

Before pushing API changes:

```bash
npm run openapi:validate
```

If your Apidog sync variables are configured:

```bash
npm run apidog:sync
```

## Conventions

- Use `successResponse` and `errorResponse` from `src/utils/response.js`.
- Use `asyncHandler` for async controllers.
- Use localized messages through `src/lib/i18n`.
- Keep route paths consistent with the mounted root paths, not `/api/...`.
