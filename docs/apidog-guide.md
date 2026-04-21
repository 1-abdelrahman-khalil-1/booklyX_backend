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

Staff mobile APIs are documented in the `/staff` section of `openapi.yaml` and should continue to use translation-key errors and enum-backed validation.

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
APIDOG_ENDPOINT_OVERWRITE_BEHAVIOR="AUTO_MERGE"
APIDOG_SCHEMA_OVERWRITE_BEHAVIOR="AUTO_MERGE"
```

Sync behavior notes:

- The sync script defaults to `AUTO_MERGE` for endpoints and schemas to reduce losing manual Apidog request settings.
- If you intentionally want full replacement, set both behaviors to `OVERWRITE_EXISTING` before running sync.
- Other supported values from Apidog API: `KEEP_EXISTING`, `CREATE_NEW`.

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

## Auth post-response script (Apidog/Postman compatible)

Important:

- OpenAPI sync updates endpoint definitions and examples, but Post Processors may still appear empty in Apidog UI.
- Add this script once as a Public Script, then attach it in Post Processors for each auth endpoint.

Quick setup in Apidog:

1. Go to `Settings > Public Scripts` and create a script named `Auth Token Extractor`.
2. Paste the script below and save.
3. Open each endpoint: `/auth/login`, `/auth/verify-phone`, `/auth/verify-password-reset`, `/auth/refresh`.
4. In `Post Processors`, click `Add PostProcessor` and reference `Auth Token Extractor`.

Use this script in the Post Processor for these endpoints:

- `/auth/login`
- `/auth/verify-phone`
- `/auth/verify-password-reset`
- `/auth/refresh`

```javascript
function setIfNotExists(key, value) {
  if (!key || value === undefined || value === null) return;
  const existing = pm.environment.get(key);
  if (existing === undefined || existing === null) {
    pm.environment.set(key, value);
  }
}

function getFirstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function getFirstValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

let json;
try {
  json = pm.response.json();
} catch (error) {
  if (pm.console && typeof pm.console.log === "function") {
    pm.console.log("Response is not JSON; skipping token extraction.");
  }
}

if (json && typeof json === "object") {
  const data = json.data && typeof json.data === "object" ? json.data : {};
  const role = getFirstString([
    data.user && typeof data.user === "object" ? data.user.role : undefined,
    data.role,
    pm.environment.get("authRole"),
    "client",
  ]);

  const accessTokenEnvKeyByRole = {
    client: "clientToken",
    staff: "staffToken",
    branch_admin: "branchAdminToken",
    super_admin: "adminToken",
  };

  const refreshTokenEnvKeyByRole = {
    client: "refreshClientToken",
    staff: "refreshStaffToken",
    branch_admin: "refreshBranchAdminToken",
    super_admin: "refreshAdminToken",
  };

  const accessTokenResponseKeysByRole = {
    client: ["clientToken", "token"],
    staff: ["staffToken", "token"],
    branch_admin: ["branchAdminToken", "branchToken", "token"],
    super_admin: ["adminToken", "superAdminToken", "token"],
  };

  setIfNotExists("authRole", role);

  const accessToken = getFirstValue(
    data,
    accessTokenResponseKeysByRole[role] || ["token"],
  );
  if (accessToken) {
    setIfNotExists("authToken", accessToken);

    const accessEnvKey = accessTokenEnvKeyByRole[role];
    if (accessEnvKey) {
      setIfNotExists(accessEnvKey, accessToken);
    }
  }

  const refreshToken = getFirstString([data.refreshToken]);
  if (refreshToken) {
    setIfNotExists("refreshToken", refreshToken);

    const refreshEnvKey = refreshTokenEnvKeyByRole[role];
    if (refreshEnvKey) {
      setIfNotExists(refreshEnvKey, refreshToken);
    }
  }
}
```

## Notes

- `scripts/api-session.mjs` defaults `API_BASE_URL` to `http://localhost:3000`.
- `scripts/api-session.mjs` defaults `API_LANG` to `en`.
- On `WEB`, refresh token behavior may rely on cookies.
- Better examples in `openapi.yaml` improve both imported endpoint cases and published docs in Apidog.
