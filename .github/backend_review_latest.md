# Backend Review - 2026-03-30

## Summary

- Files reviewed: 32 handwritten backend files under `src` (excluding generated Prisma artifacts).
- Total issues:
  - 🔴 Critical: 4
  - 🟠 Major: 5
  - 🟡 Minor: 1
  - 🔵 Suggestions: 0

## Issues Table

| Severity    | Issue No. | File                                                                                                | Issue                                                                                                                                                     | Workflow Ref                                                                            | Current Code                                                                                                                                                                                            | Suggested Edit                                                                                                                                                                                                          |
| ----------- | --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Critical | 1         | src/modules/branch_admin/branch_admin.routes.js:31                                                  | Public branch-admin OTP endpoints have no dedicated auth/OTP limiter (only global limiter), increasing brute-force risk.                                  | Review Rule 4.6 Abuse Protection: OTP endpoints must be rate-limited.                   | `branchAdminRouter.post("/verify-email", verifyEmailHandler);` `branchAdminRouter.post("/verify-phone", verifyPhoneHandler);` `branchAdminRouter.post("/resend-code", resendCodeHandler);`              | Add endpoint-specific limiter: import `authLimiter` and apply it to `/apply`, `/verify-email`, `/verify-phone`, `/resend-code` before handlers.                                                                         |
| 🔴 Critical | 2         | src/modules/branch_admin/branch_admin.routes.js:21                                                  | Upload content-signature validation exists but is never wired to routes; current enforcement is MIME-only and spoofable.                                  | Security priority + Review Rule 4.5: file upload validation must resist MIME spoofing.  | `applicationUploadFields = documentsUpload.fields([...]);` `serviceUploadField = imageOnlyUpload.fields([...]);` while `validateUploadedFilesmagicbytes` is only defined in `src/middleware/upload.js`. | Chain `validateUploadedFilesmagicbytes` after multer in apply/create/update upload routes, with allowed types per endpoint.                                                                                             |
| 🔴 Critical | 3         | src/modules/auth/auth.service.js:335                                                                | Multi-write register flow is non-atomic (user create, then verification code create), risking partial state on failure.                                   | Review Rule 4.15 Transactions: dependent multi-write operations must rollback together. | `user = await prisma.user.create(...);` then `const code = await createVerificationCode(user.id, VerificationType.EMAIL);`                                                                              | Wrap `register` writes in `prisma.$transaction` and pass `tx` to verification code creation helper so user + code are committed or rolled back together.                                                                |
| 🔴 Critical | 4         | src/modules/branch_admin/branch_admin.service.js:175                                                | `submitApplication` performs dependent multi-write operations without a transaction (application create then OTP create).                                 | Review Rule 4.15 Transactions strict requirement.                                       | `const application = await prisma.branchAdmin.create(...);` then `const code = await createApplicationOtp(application.id, VerificationType.EMAIL);`                                                     | Use `prisma.$transaction` for application creation and OTP record creation as one atomic unit, using the same `tx` client in helpers.                                                                                   |
| 🟠 Major    | 5         | src/modules/branch_admin/branch_admin.controller.js:35-38                                           | Service images are marked public in controller comments but URL targets authenticated download route, causing contract mismatch and broken public access. | Business Logic Correctness vs. endpoint behavior.                                       | `// Get public URL for service images. Service images can be accessed without authentication.` then `return `${req.protocol}://${req.get("host")}/files/download/${file.filename}`;`                    | Add separate public image route for non-sensitive service images (e.g. `/files/public/:filename`) and keep `/files/download/:filename` authenticated for sensitive documents, updating `getPublicImageUrl` accordingly. |
| 🟠 Major    | 6         | src/modules/files/files.controller.js:20-26,33,38                                                   | Hardcoded client-facing error strings bypass i18n keys.                                                                                                   | Project i18n rule: client-visible messages must use translation keys.                   | `throw new AppError("Invalid filename", 400);` and `throw new AppError("File not found", 404);`                                                                                                         | Introduce `tr.INVALID_FILENAME` and `tr.FILE_NOT_FOUND` keys and throw `new AppError(tr.INVALID_FILENAME, 400)` / `new AppError(tr.FILE_NOT_FOUND, 404)` so the global error handler translates them.                   |
| 🟠 Major    | 7         | src/middleware/rateLimiter.js:8-12,20-23                                                            | Rate-limit response messages are hardcoded English strings, not localized.                                                                                | Project i18n consistency requirement for client responses.                              | `message: { status: false, message: "Too many requests from this IP, please try again after 15 minutes" }` and `"Too many authentication requests, please try again later"`                             | Replace static `message` objects with a custom handler or middleware that calls `getLanguage(req)` and returns `errorResponse(res, 429, t(tr.TOO_MANY_REQUESTS, lang))`-style localized responses.                      |
| 🟠 Major    | 8         | src/modules/branch_admin/branch_admin.validation.js:70-72                                           | Validation message uses hardcoded text instead of i18n key.                                                                                               | Project i18n + validation consistency requirement.                                      | `errorMap: () => ({ message: "Invalid staff role" }),`                                                                                                                                                  | Replace with `errorMap: () => ({ message: tr.STAFF_ROLE_INVALID })` (after adding `STAFF_ROLE_INVALID` to `tr` and locales) to keep messages translatable.                                                              |
| 🟠 Major    | 9         | src/middleware/errorHandler.js:36-37 and src/utils/asyncHandler.js:12-15, src/server.js:2-3,36-37   | Error logging is unstructured and lacks request_id, user_id, action metadata across handlers.                                                             | Review Rule 4.14 Logging & Monitoring strict requirements.                              | `console.error("Unhandled error:", err);` plus `[AsyncError] handler -> METHOD URL` logs and raw `console.error` in process-level handlers.                                                             | Introduce a logger utility that logs JSON with `{ level, message, requestId, userId, action, error }` and wire it into `asyncHandler`, `errorHandler`, and process-level handlers instead of raw `console.error`.       |
| 🟡 Minor    | 10        | src/modules/auth/auth.service.js:148-152 and src/modules/branch_admin/branch_admin.service.js:92-96 | OTP value is hardcoded to `"333333"` in non-production branches; risky if NODE_ENV misconfiguration reaches prod.                                         | Security hardening for OTP integrity and 4.17 hardcoded values guidance.                | `if (process.env.NODE_ENV === "production") { throw new Error("Hardcoded OTP not allowed in production."); } return "333333";`                                                                          | Replace with cryptographically random 6-digit OTP (e.g. `crypto.randomInt(100000, 999999).toString()`) in all environments except an explicit `TEST_OTP_BYPASS` flag used only in tests.                                |

## Files Status

| File                                                | Status        |
| --------------------------------------------------- | ------------- |
| src/modules/branch_admin/branch_admin.routes.js     | ⚠️ Has Issues |
| src/middleware/upload.js                            | ⚠️ Has Issues |
| src/modules/auth/auth.service.js                    | ⚠️ Has Issues |
| src/modules/branch_admin/branch_admin.service.js    | ⚠️ Has Issues |
| src/modules/branch_admin/branch_admin.controller.js | ⚠️ Has Issues |
| src/modules/files/files.routes.js                   | ⚠️ Has Issues |
| src/modules/files/files.controller.js               | ⚠️ Has Issues |
| src/middleware/rateLimiter.js                       | ⚠️ Has Issues |
| src/modules/branch_admin/branch_admin.validation.js | ⚠️ Has Issues |
| src/middleware/errorHandler.js                      | ⚠️ Has Issues |
| src/utils/asyncHandler.js                           | ⚠️ Has Issues |
| src/server.js                                       | ⚠️ Has Issues |
| src/modules/auth/auth.routes.js                     | ✅ Clean      |
| src/modules/auth/auth.controller.js                 | ✅ Clean      |
| src/modules/admin/admin.routes.js                   | ✅ Clean      |
| src/modules/admin/admin.controller.js               | ✅ Clean      |
| src/modules/admin/admin.service.js                  | ✅ Clean      |
| src/routes/index.js                                 | ✅ Clean      |

## Final Output

- Files reviewed: 32
- 🔴 Critical: 4
- 🟠 Major: 5
- 🟡 Minor: 1
- 🔵 Suggestions: 0

## Top 3 Issues

1. **Upload security gap on branch-admin upload routes** — `validateUploadedFilesmagicbytes` is defined but never used; current checks rely only on MIME type, which can be spoofed. **Fix:** wire `validateUploadedFilesmagicbytes` after multer on each upload endpoint with appropriate allowed types.
2. **Non-atomic multi-write flows in auth `register` and branch-admin `submitApplication`** — user/application creation and OTP creation are separate operations without transactions. **Fix:** wrap these sequences in `prisma.$transaction` and use the same transaction client across all dependent writes.
3. **Missing dedicated limiter on public branch-admin OTP endpoints** — `/verify-email`, `/verify-phone`, and `/resend-code` are only protected by the general limiter. **Fix:** apply `authLimiter` or a stricter OTP-specific limiter on these routes.

## Code Health Score

- Start: 10
- 4 × 🔴 → -8
- 5 × 🟠 → -5
- 1 × 🟡 → -0.3
- 0 × 🔵 → -0
- Raw score: 10 - 8 - 5 - 0.3 = -3.3 → min 1

**Final Score:** 1/10
