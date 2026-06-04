# Backend Code Review Report — Admin Module

## Summary

- **Feature Module:** Admin (`src/modules/admin/`)
- **Review Date:** 2026-06-04
- **Files Reviewed:** 13 (`admin.routes.js`, `admin.validation.js`, `errors.js`, and the controller/service pairs for `activities`, `analytics`, `branches`, `payments`, `services`)
- **Package versions:** Zod `^4.3.6`, Prisma `^6.16.3`, Express `^5.2.1`
- **Workflow Reference:** `.github/ai_workflow.md`

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 Major | 3 |
| 🟡 Minor | 0 |
| 🔵 Suggestion | 0 |

---

## Issues Table

| Severity | Issue No. | File | Issue | Workflow Ref | Current Code | Suggested Edit |
|----------|-----------|------|-------|--------------|--------------|----------------|
| 🔴 Critical | 1 | `branches.service.js:94-101` | `approveBranch` updates the branch status to `APPROVED` but **never creates the associated `User` record** or links the `userId` in the DB. This completely breaks the branch admin login flow. | Workflow §4.6 — Visible branches requires active subscription and approved status; §5.15 — Business Rules Enforcement | `prisma.branchAdmin.update({ where: { id: branch.id }, data: { status: BranchStatus.APPROVED } })` | Wrap user creation and branch status update in a transaction (see fix below) |
| 🟠 Major | 2 | `openapi.yaml` | The following endpoints are implemented in the routing layer (`admin.routes.js`) but are **completely missing from `openapi.yaml`**: <br>1. `GET /admin/analytics/recent-activities`<br>2. `POST /admin/payments/{paymentId}/refund` | Workflow §7 Documentation — update OpenAPI when API changes; Review prompt §5.17 — Missing endpoint is 🟠 Major | Endpoints are present in routes, but not declared in `openapi.yaml` | Document both endpoints in `openapi.yaml` with correct schemas, parameters, and examples |
| 🟠 Major | 3 | `openapi.yaml:6916-6980` + `openapi.yaml:7713-7765` | **HTTP Method Mismatch**: The branch and service approval/rejection endpoints are defined as `POST` in `openapi.yaml`, but the code defines them as `PATCH` routes. | Review prompt §5.17 — Request/Response mismatch is 🟠 Major | OpenAPI has `post:` routes; `admin.routes.js` has `adminRouter.patch` | Align `openapi.yaml` routes to use `patch:` instead of `post:` for approval and rejection paths |
| 🟠 Major | 4 | `admin.service.test.js` | **Critical admin service paths have zero test coverage.** The tests only cover `listBranchPayments`, `refundBranchPayment`, and `getRecentActivities`. `listBranches`, `getBranchDetails`, `approveBranch`, `rejectBranch`, `listServices`, `getServiceDetails`, `approveService`, `rejectService`, and `getPlatformAnalytics` are completely untested. | Workflow §9 Testing — critical paths must be covered; Review prompt §5.10 — missing tests on critical paths is 🟠 Major | No test coverage for branches, services, or analytics service layers | Add test cases for each of the missing service functions to `admin.service.test.js` |

---

## Issue Fixes

### Fix #1 — Create User on Branch Approval

**`branches.service.js`:**
```js
import { BranchStatus, Role, UserStatus } from "../../../generated/prisma/client.js";

// ...

export async function approveBranch(id) {
  const branch = await prisma.branchAdmin.findUnique({ where: { id } });
  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.PENDING_APPROVAL) throw new BranchIsNotPendingError();

  await prisma.$transaction(async (tx) => {
    // 1. Create the User record
    const user = await tx.user.create({
      data: {
        name: branch.ownerName,
        email: branch.email,
        password: branch.passwordHash,
        phone: branch.phone,
        role: Role.branch_admin,
        status: UserStatus.ACTIVE,
        emailVerified: branch.emailVerified,
        phoneVerified: branch.phoneVerified,
      },
    });

    // 2. Link User and Approve Branch
    await tx.branchAdmin.update({
      where: { id: branch.id },
      data: {
        status: BranchStatus.APPROVED,
        rejectionReason: null,
        userId: user.id,
      },
    });
  });

  return { message: tr.BRANCH_APPROVED };
}
```

---

## Files Status

| File | Status |
|------|--------|
| `src/modules/admin/admin.routes.js` | ✅ Clean |
| `src/modules/admin/admin.validation.js` | ✅ Clean |
| `src/modules/admin/errors.js` | ✅ Clean |
| `src/modules/admin/activities/activities.controller.js` | ✅ Clean |
| `src/modules/admin/activities/activities.service.js` | ✅ Clean |
| `src/modules/admin/analytics/analytics.controller.js` | ✅ Clean |
| `src/modules/admin/analytics/analytics.service.js` | ✅ Clean |
| `src/modules/admin/branches/branches.controller.js` | ✅ Clean |
| `src/modules/admin/branches/branches.service.js` | ⚠️ Has Issues (Critical #1) |
| `src/modules/admin/payments/payments.controller.js` | ✅ Clean |
| `src/modules/admin/payments/payments.service.js` | ✅ Clean |
| `src/modules/admin/services/services.controller.js` | ✅ Clean |
| `src/modules/admin/services/services.service.js` | ✅ Clean |
| `src/modules/admin/__tests__/admin.service.test.js` | ⚠️ Has Issues (Major #4) |
| `openapi.yaml` (Admin section) | ⚠️ Has Issues (Major #2, Major #3) |

---

## Final Output

- Files reviewed: 14
- 🔴 Critical: 1
- 🟠 Major: 3
- 🟡 Minor: 0
- 🔵 Suggestions: 0

---

## Top 3 Issues

1. **🔴 `approveBranch` does not create the associated `User` record** — When a branch is approved, its status is updated but no `User` is created. Since the login flow verifies that a matching `User` record with role `branch_admin` exists, approved branch admins are blocked from logging in.
2. **🟠 OpenAPI Missing Endpoints** — The `/admin/analytics/recent-activities` (GET) and `/admin/payments/{paymentId}/refund` (POST) endpoints exist in code but are completely undocumented.
3. **🟠 HTTP Method Mismatches** — OpenAPI defines approval/rejection endpoints as `POST` while the code implements them as `PATCH`.

---

## Code Health Score

```
Start = 10
-2 × 1 (🔴) = -2
-1 × 3 (🟠) = -3

Final: 5/10
```
