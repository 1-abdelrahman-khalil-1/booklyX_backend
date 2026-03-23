---
name: update-postman-docs
description: Update Postman documentation with new API changes and sync to Postman workspace
applyTo: "*.js"
---

# Update Postman Documentation

When invoked, this prompt performs the following workflow:

## Workflow Steps

1. **Analyze Recent Changes** - Examine git changes in the `src/modules/` directory to identify new routes, controllers, and services that have been added or modified.

2. **Update Postman Collection** - If there are new API endpoints in the changes, suggest updates to the Postman collection file at `docs/postman/booklyx-backend.postman_collection.json` to include:
   - New request endpoints
   - Updated request parameters
   - Request/response examples
   - Proper request authentication headers

3. **Sync to Postman** - Execute the postman sync command:
   ```bash
   npm run postman:sync
   ```

## Usage

### Option 1: VS Code Command (Quick Access)

Run the existing Postman sync command directly.

### Option 2: Terminal Command

```bash
npm run postman:sync
```

### Option 3: Invoke @update-postman-docs

Call this prompt via Copilot:

```
@update-postman-docs
```

## Requirements

- Git changes must be staged or in working directory
- `.env` file must contain valid credentials:
  - `POSTMAN_API_KEY` - Your Postman API key
  - `POSTMAN_COLLECTION_UID` - Collection UID
  - `POSTMAN_ENVIRONMENT_UID` - Environment UID
  - `POSTMAN_WORKSPACE_ID` - Workspace ID
- Node.js and npm dependencies must be installed

## What Gets Updated

The prompt checks for changes in:

- `src/modules/*/[module].routes.js` - New API endpoints
- `src/modules/*/[module].controller.js` - New controller methods
- `src/modules/*/[module].validation.js` - Updated input validation schemas

Updates are applied to:

- `docs/postman/booklyx-backend.postman_collection.json` - Main collection file
- `docs/postman-routes.md` - Documentation file

## Workflow

```
1. Review your endpoint changes in src/modules/
2. Update Postman collection files if needed
3. Run postman:sync to upload to Postman workspace
4. Review changes in Postman workspace
```

## Notes

- Only updates routes that are properly exported in `src/routes/index.js`
- Maintains existing Postman collection structure and metadata
- Requires valid Postman API credentials in `.env`
- Safe to run multiple times (idempotent operation)

## Troubleshooting

**Error: Missing POSTMAN_API_KEY**

- Add `POSTMAN_API_KEY=your_key` to `.env`
- Get your key from https://www.postman.com/settings/me/api-keys

**Error: Missing POSTMAN_WORKSPACE_ID**

- Add `POSTMAN_WORKSPACE_ID=your_workspace_id` to `.env`
- Find in Postman workspace URL: `https://www.postman.com/workspace/{workspace-id}/...`

**Collection not syncing**

- Verify all required environment variables are set
- Check internet connection
- Ensure Postman API is accessible
