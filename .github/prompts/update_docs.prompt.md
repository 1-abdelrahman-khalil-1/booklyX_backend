# Update Postman collection, environment, and docs

Purpose

- Provide a single, copy-pastable prompt and checklist for updating the Postman collection, Postman environment, related docs, and README.

Scope

- Update the exported Postman collection and environment in the repo
- Update `docs/postman-routes.md` and `README.md` to reflect changes
- Run the local Postman sync script if applicable
- Commit and open a PR with a clear description of changes and test steps

Files to update

- [docs/postman/booklyx-backend.postman_collection.json](docs/postman/booklyx-backend.postman_collection.json)
- [docs/postman/booklyx-backend.postman_environment.json](docs/postman/booklyx-backend.postman_environment.json)
- [docs/postman-routes.md](docs/postman-routes.md)
- [README.md](README.md)
- Script (sync/publish): [scripts/push-postman-collection.mjs](scripts/push-postman-collection.mjs)

Checklist

- [ ] Open the Postman app and update the collection: add new requests, update request bodies, responses/examples, descriptions, and tests.
- [ ] Ensure authentication is correctly set (collection-level bearer token or pre-request script) and update any environment variables used by requests.
- [ ] Export the collection (Postman 2.1 recommended) and overwrite [docs/postman/booklyx-backend.postman_collection.json](docs/postman/booklyx-backend.postman_collection.json).
- [ ] Export the environment and overwrite [docs/postman/booklyx-backend.postman_environment.json](docs/postman/booklyx-backend.postman_environment.json).
- [ ] Update [docs/postman-routes.md](docs/postman-routes.md) with endpoint summaries, example requests/responses, and auth notes.
- [ ] Update [README.md](README.md) to reference the updated Postman collection and environment (how to import, required env vars).
- [ ] Run the sync script to push changes (if enabled): run `npm run postman:sync` or `node scripts/push-postman-collection.mjs`.
- [ ] Perform a smoke test (use Postman Runner or `curl`) to exercise new/changed endpoints.
- [ ] Commit changes with a clear message and open a PR. Example commit message: `docs(postman): update collection & env for <feature>`.

PR description template (suggested)

- Summary: Short description of what changed in the collection and why.
- Files changed: list of updated files in the PR.
- How to test: steps to import the collection & env, auth steps, and a minimal set of requests to run.
- Notes: any environment variables added/removed, or migration/auth changes that consumers should know.

Helpful commands

```bash
# create branch
git checkout -b docs/postman-update/<short-desc>

# run the repo's postman sync script
npm run postman:sync

# alternative: run the script directly
node scripts/push-postman-collection.mjs

# stage, commit and push
git add docs/postman/* README.md
git commit -m "docs(postman): update collection & env for <feature>"
git push -u origin HEAD
```

Notes for maintainers

- Keep collection exports tidy: remove unnecessary test runs and large example payloads unless they are useful for docs.
- Use consistent naming for request descriptions and folders so `docs/postman-routes.md` can be kept in sync easily.
- If automations exist (CI or script) to publish Postman, prefer using them and document the steps here.

Suggested PR reviewer checklist

- [ ] Confirm collection and env JSON are valid (load in Postman)
- [ ] Spot-check example requests/responses in `docs/postman-routes.md`
- [ ] Verify auth instructions and environment variable names

If you want, I can:

- open a branch and commit these changes
- run `npm run postman:sync` once you confirm collection/env files are ready
