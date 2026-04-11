# Code Review State

## Last Review Date

2026-03-19

## Scope

Whole project - Production-Grade Backend Code Review

## Summary

- **Files Reviewed:** 25
- **Fixed:** 15
- **Skipped/Deferred by Decision:** 4
- **Recheck Only On Change:** Enabled
- **Code Health:** 8/10

## Recheck Policy (For Next Reviews)

- Do not reopen items with `Status = Fixed` unless related files changed.
- Do not reopen items with `Status = Skipped (by request)` unless user asks.
- Re-review only changed files and only issues mapped to those files.
- BranchAdmin re-apply rule is approved policy: rejected applications may re-apply, so `BranchAdmin.email/phone` are not permanent unique constraints.

## Issues Table

| Issue No. | File                                                | Type            | Severity | Status                      | Last Reviewed | Current (As-Is)                                                                       | Suggested Fix                                                            |
| --------- | --------------------------------------------------- | --------------- | -------- | --------------------------- | ------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1         | src/lib/email.js                                    | Reliability     | Critical | Skipped (by request)        | 2026-03-19    | Email sending functions are mocked and do not send real emails.                       | Implement real transporter calls and fail-safe logging/retry strategy.   |
| 2         | src/modules/auth/auth.service.js                    | Security        | Critical | Kept Hardcoded (by request) | 2026-03-19    | OTP remains hardcoded with explicit TODO for future secure generator.                 | Replace fixed OTP with secure random 6-digit generation when ready.      |
| 3         | src/modules/branch_admin/branch_admin.service.js    | Security        | Critical | Kept Hardcoded (by request) | 2026-03-19    | OTP remains hardcoded with explicit TODO for future secure generator.                 | Replace fixed OTP with secure random 6-digit generation when ready.      |
| 4         | src/modules/admin/admin.controller.js               | Architecture    | Critical | Fixed                       | 2026-03-19    | Controller now delegates validation and error flow via service/middleware.            | Keep this pattern for future handlers.                                   |
| 5         | src/modules/admin/admin.service.js                  | Performance     | Major    | Skipped (by request)        | 2026-03-19    | listApplications remains unpaginated.                                                 | Add page/limit with sane max cap and metadata when needed.               |
| 6         | src/modules/admin/admin.service.js                  | Performance     | Major    | Fixed                       | 2026-03-19    | Admin queries now use select to reduce payload and overfetching.                      | Keep strict select usage for list/detail endpoints.                      |
| 7         | src/modules/admin/admin.service.js                  | Performance     | Major    | Fixed                       | 2026-03-19    | Verification codes are optional behind includeCodes query switch.                     | Keep heavy relations opt-in only.                                        |
| 8         | src/middleware/rateLimiter.js                       | Localization    | Major    | Fixed                       | 2026-03-19    | Rate-limit responses are localized using i18n keys.                                   | Reuse i18n handler pattern in other middleware responses.                |
| 9         | src/modules/admin/admin.controller.js               | Validation      | Major    | Fixed                       | 2026-03-19    | Route params now validated using Zod coercion schema.                                 | Validate params/query with module schemas before service call.           |
| 10        | src/modules/branch_admin/branch_admin.service.js    | Concurrency     | Major    | Fixed                       | 2026-03-19    | Duplicate check/create now runs in transaction with unique-conflict mapping.          | Keep transaction + unique constraints for concurrent safety.             |
| 11        | src/server.js                                       | Reliability     | Major    | Fixed                       | 2026-03-19    | Graceful shutdown now disconnects Prisma on fatal signals/events.                     | Keep lifecycle handling in sync with infra signal behavior.              |
| 12        | src/modules/admin/admin.controller.js               | Error Handling  | Major    | Fixed                       | 2026-03-19    | Direct error response path removed in favor of centralized middleware flow.           | Continue throwing domain errors from validation/service.                 |
| 13        | src/modules/branch_admin/branch_admin.service.js    | Business Logic  | Major    | Fixed                       | 2026-03-19    | Verification state transitions now use guarded conditional updates.                   | Keep transition guards explicit and atomic.                              |
| 14        | src/modules/branch_admin/branch_admin.service.js    | Data Integrity  | Major    | Fixed                       | 2026-03-19    | Staff creation now checks duplicate email/phone and maps conflicts to domain errors.  | Keep duplicate checks before create and map DB unique conflicts.         |
| 15        | src/modules/admin/admin.controller.js               | Code Quality    | Minor    | Fixed                       | 2026-03-19    | Direct errorResponse import/usage removed from controller.                            | Keep controller thin with successResponse + asyncHandler only.           |
| 16        | src/modules/branch_admin/branch_admin.validation.js | Code Quality    | Minor    | Fixed                       | 2026-03-19    | Redundant helper function removed.                                                    | Keep single validation entry point.                                      |
| 17        | src/modules/admin/admin.validation.js               | Consistency     | Minor    | Fixed                       | 2026-03-19    | Zod import style standardized.                                                        | Apply same import style in all modules.                                  |
| 18        | src/modules/auth/auth.service.js                    | Maintainability | Minor    | Fixed                       | 2026-03-19    | Password reset purpose magic string extracted into named constant.                    | Keep claims/constants centralized.                                       |
| 19        | prisma/schema.prisma                                | Performance     | Minor    | Fixed (policy aligned)      | 2026-03-19    | BranchAdmin email/phone are indexed but not unique to allow re-apply after rejection. | Keep non-unique fields with indexes; enforce duplicate rules in service. |

## Deferred / Accepted Risks

1. **Issue #1** - Email sending remains mocked (by product/dev decision).
2. **Issues #2, #3** - OTP remains fixed code with TODO for future secure OTP rollout.
3. **Issue #5** - listApplications remains unpaginated (accepted for now).

## Next Steps

- [ ] Keep email mock as-is until provider setup is ready (Issue #1 skipped by request)
- [ ] Keep fixed OTP policy until security rollout (Issues #2, #3 skipped by request)
- [ ] Keep admin list endpoint without pagination for now (Issue #5 skipped by request)

## Review Notes

Most previously reported code issues are fixed and should not be re-reviewed unless those files change. Remaining skipped items are explicitly accepted by decision and should be treated as deferred risks, not new findings.

**Recommendation:** For future `review` runs, use incremental mode and skip fixed/deferred items unless changed or explicitly requested.
