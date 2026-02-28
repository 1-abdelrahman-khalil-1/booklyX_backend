---
description: Incremental code review — only re-review changed or new files
---

## How to run #review

1. Compare the current project state against the **Baseline Review State** below.

2. Do NOT re-review any file listed in the baseline unless:
   - The file has been modified (based on Git diff / GitHub tree), or
   - The user explicitly requests a full re-review.

3. Review ONLY:
   - New files not listed in the baseline.
   - Files that have been modified since the last review.

4. When reviewing modified files:
   - Focus ONLY on the changed parts.
   - Re-check related functions only if the modification impacts them.

5. After completing the review:
   - Update the Baseline Review State table.
   - Append newly reviewed files.
   - Record:
     - File name
     - Review date
     - Status (OK / Issues Found)
     - Short summary of issues (if any)

6. Treat the updated baseline as the new source of truth for future reviews.

---

## Baseline Review State — `2026-02-27`

All files below have been fully reviewed and confirmed clean (or fixed) as of this date.

| File                                                              | Reviewed   | Status       | Summary                                        |
| ----------------------------------------------------------------- | ---------- | ------------ | ---------------------------------------------- |
| `.env`                                                            | 2026-02-27 | Issues Found | C1: JWT secret & Postman API key committed     |
| `prisma/schema.prisma`                                            | 2026-02-27 | Issues Found | M3: BranchAdmin email/phone lack @unique       |
| `prisma/seed.js`                                                  | 2026-02-27 | Issues Found | M1: Invalid enum `ApplicationStatus.PENDING`   |
| `src/server.js`                                                   | 2026-02-27 | Issues Found | C4: No JSON body limit; C5: No CORS            |
| `src/lib/prisma.js`                                               | 2026-02-27 | Issues Found | M10: No $connect/$disconnect lifecycle         |
| `src/lib/email.js`                                                | 2026-02-27 | Issues Found | C3: All email functions are no-ops             |
| `src/lib/i18n/index.js`                                           | 2026-02-27 | OK           | —                                              |
| `src/lib/i18n/keys.js`                                            | 2026-02-27 | OK           | —                                              |
| `src/lib/i18n/locales/en.js`                                      | 2026-02-27 | OK           | —                                              |
| `src/middleware/authenticate.js`                                  | 2026-02-27 | OK           | —                                              |
| `src/middleware/errorHandler.js`                                  | 2026-02-27 | OK           | —                                              |
| `src/middleware/rateLimiter.js`                                   | 2026-02-27 | Issues Found | m2: Hardcoded English messages                 |
| `src/utils/AppError.js`                                           | 2026-02-27 | OK           | —                                              |
| `src/utils/asyncHandler.js`                                       | 2026-02-27 | OK           | —                                              |
| `src/utils/response.js`                                           | 2026-02-27 | OK           | —                                              |
| `src/routes/index.js`                                             | 2026-02-27 | OK           | —                                              |
| `src/modules/auth/auth.routes.js`                                 | 2026-02-27 | OK           | —                                              |
| `src/modules/auth/auth.controller.js`                             | 2026-02-27 | OK           | —                                              |
| `src/modules/auth/auth.service.js`                                | 2026-02-27 | Issues Found | C2: Hardcoded OTP; M4/M6/M9/m6/m8              |
| `src/modules/auth/auth.validation.js`                             | 2026-02-27 | Issues Found | M8: Circular import                            |
| `src/modules/auth/auth.permissions.js`                            | 2026-02-27 | OK           | —                                              |
| `src/modules/auth/__tests__/auth.service.test.js`                 | 2026-02-27 | Issues Found | m10: Very thin coverage                        |
| `src/modules/branch_admin/branch_admin.routes.js`                 | 2026-02-27 | OK           | —                                              |
| `src/modules/branch_admin/branch_admin.controller.js`             | 2026-02-27 | OK           | —                                              |
| `src/modules/branch_admin/branch_admin.service.js`                | 2026-02-27 | Issues Found | C2: Hardcoded OTP; M2/m7/m12                   |
| `src/modules/branch_admin/branch_admin.validation.js`             | 2026-02-27 | Issues Found | M8: Circular import; m3: Hardcoded English     |
| `src/modules/branch_admin/__tests__/branch_admin.service.test.js` | 2026-02-27 | Issues Found | m10: Thin coverage                             |
| `src/modules/admin/admin.routes.js`                               | 2026-02-27 | OK           | —                                              |
| `src/modules/admin/admin.controller.js`                           | 2026-02-27 | Issues Found | M5: parseInt NaN; M7: Validation in controller |
| `src/modules/admin/admin.service.js`                              | 2026-02-27 | OK           | —                                              |
| `src/modules/admin/admin.validation.js`                           | 2026-02-27 | Issues Found | m9: Inconsistent zod import                    |
