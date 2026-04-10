# BooklyX Apidog Guide

This repository uses `openapi.yaml` as the API source of truth.

## Current workflow

1. Update `openapi.yaml`
2. Validate it locally
3. Sync it to Apidog

```bash
npm run openapi:validate
npm run apidog:sync
```

## Importing into Apidog

According to the current Apidog docs, you can either:

- import an existing OpenAPI project by uploading the spec file
- use Spec-first Mode for a more Git-centered workflow

For this repository, the current maintained path is:

- keep `openapi.yaml` in git
- validate it locally
- push updates to Apidog with `npm run apidog:sync`

## Manual import steps

1. Open Apidog.
2. Choose `Import Project`.
3. Select OpenAPI or Swagger import.
4. Upload `openapi.yaml`.
5. Review the preview and confirm import.

## Local session helper scripts

These scripts keep local tokens in `.api/session.json`.

```bash
# Login and store tokens locally
npm run api:login -- --role client --email abdo.khalil@booklyx.com --password 12345678 --platform APP

# Refresh token for a role
npm run api:refresh -- --role client --platform APP

# Show saved session state
npm run api:session

# Clear one role or all roles
npm run api:logout -- --role client
npm run api:logout

# Export Apidog-friendly variables
npm run api:export:apidog
```

Generated local files:

- `.api/session.json`
- `.api/apidog-variables.json`

## Required sync variables

Put these in `.env` before running sync:

```bash
APIDOG_ACCESS_TOKEN=""
APIDOG_PROJECT_ID=""
APIDOG_LOCALE="en-US"
APIDOG_API_VERSION="2024-03-28"
OPENAPI_SPEC_FILE="openapi.yaml"
```

## Recommended Apidog environment variables

- `baseUrl`
- `platform`
- `lang`
- `clientToken`
- `branchAdminToken`
- `staffToken`
- `adminToken`
- `refreshClientToken`
- `refreshBranchAdminToken`
- `refreshStaffToken`
- `refreshAdminToken`
- `resetToken`

## Notes

- `scripts/api-session.mjs` defaults `API_BASE_URL` to `http://localhost:3000`.
- `scripts/api-session.mjs` defaults `API_LANG` to `en`.
- On `WEB`, refresh token behavior may rely on cookies.
- Better examples in `openapi.yaml` improve both imported endpoint cases and published docs in Apidog.
