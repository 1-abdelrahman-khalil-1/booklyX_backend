# BooklyX API Contract

`openapi.yaml` is the source of truth for the BooklyX API.

If you want endpoint details, request bodies, response payloads, auth requirements, or examples, use:

- `openapi.yaml`
- `docs/apidog-guide.md`

## Why this file is short

This repository previously had a hand-written API reference here. It became stale and drifted from the actual code and routes.

To avoid duplicated documentation:

- maintain endpoint definitions in `openapi.yaml`
- validate with `npm run openapi:validate`
- sync to Apidog with `npm run apidog:sync`

## Current route groups

- `/auth`
- `/branch-admin`
- `/admin`
- `/files`

## Common headers

```http
Content-Type: application/json
Accept-Language: en
platform: APP
Authorization: Bearer <token>
```

## Useful commands

```bash
npm run openapi:validate
npm run apidog:sync
npm run api:session
```
