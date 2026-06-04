---
name: review-backend
description: "Production-grade backend code review aligned with project workflow"
argument-hint: "feature or whole project"
agent: "agent"
---

# Backend Code Review (Workflow-Aware)

## Overview

Perform a **production-grade backend review** مع فهم كامل للـ system:

1. اقرأ `.github/ai_workflow.md` لفهم المشروع قبل ما تحكم على الكود.
2. لو الملف مش موجود → وضّح: `⚠️ No workflow file found — reviewing based on folder structure only` واستمر.

---

## Tools

- استخدم `code_interpreter` لقراءة الملفات وتشغيل الأوامر.
- **لا تفترض محتوى أي ملف — اقرأه أولاً دايماً.**
- لو tool call فشل → وضّح السبب واستمر بالمعلومات المتاحة.

---

## 1. Load Project Context

```python
with open(".github/ai_workflow.md", "r") as f:
    print(f.read())
```

الهدف: فهم Business requirements وـ Expected architecture قبل المراجعة.

---

## 2. Package Versions Check

```python
import json
with open("package.json", "r") as f:
    pkg = json.load(f)
    print(json.dumps(pkg.get("dependencies", {}), indent=2))
```

تحقق من إصدارات المكتبات (Zod, Prisma, Express) قبل الحكم على أي syntax.

---

## 3. Review Priority Order

```
1. Security          (auth, injection, exposure)
2. Data Integrity    (transactions, validation, hardcoded values)
3. Business Logic    (workflow alignment)
4. Performance       (N+1, blocking, pagination)
5. Code Quality      (naming, duplication, readability)
```

> ⚠️ Critical security issue → اذكره فورًا قبل ما تكمل

---

## 4. File Discovery & Scope

**Feature:** `src/modules/<feature>/`  
**Whole project:** `src/`

```python
import subprocess
# Incremental review (preferred)
result = subprocess.run(["git", "diff", "--name-only", "HEAD~1"], capture_output=True, text=True)
print(result.stdout)
# Fallback: full scan
# result = subprocess.run(["find", "src", "-type", "f", "-name", "*.js", "-o", "-name", "*.ts"], capture_output=True, text=True)
```

**Large project (> 20 files):** قسّم على modules واعرض progress `"Reviewing module X (N/Total)..."`.  
**Large file (> 300 lines):** راجع على chunks من 100 سطر مع ذكر النطاق `"Reviewing lines X–Y of Z"`.

---

## 5. Deep Review Per File

> ⚠️ Re-read كل ملف بالـ tool مباشرةً قبل ما تكتب أي issue عليه.

### 5.1 Business Logic vs Workflow
هل الكود ماشي حسب `ai_workflow.md`؟

### 5.2 Edge Cases
null / undefined · invalid input · duplicates · race conditions

### 5.3 Architecture (Modular Feature-Based)

**Expected structure per feature:**
```
src/modules/<module>/<feature>/
├── <feature>.routes.js
├── <feature>.controller.js
├── <feature>.service.js
└── <feature>.validation.js
```

**Layer responsibilities:**
| Layer | Responsibility |
|---|---|
| `routes` | HTTP mapping, auth middleware, multer |
| `controller` | Validation parsing, call service, `t()` messages, format response |
| `service` | Business logic, Prisma, transactions — **no `req`/`res`** |

**Strictly forbidden:**
- Monolithic root files (`<module>.controller.js`, `<module>.service.js`)
- DB queries in controllers
- Express objects in services
- Controller handlers in the main module router (only `router.use()` mounting sub-module routers is allowed, mirroring the `branch_admin` pattern)
- Custom error classes defined directly inside service or controller files (all custom error classes for a module must be consolidated and exported from `src/modules/<module>/errors.js` mirroring the `branch_admin` pattern)

### 5.4 Database
Queries صح؟ · N+1؟ · Indexes موجودة؟

### 5.5 Security
Validation · Auth/Authorization · Injection protection

### 5.6 Abuse Protection
- Rate limiting على public endpoints؟
- Brute force protection على login/OTP؟

> Missing rate limiting on auth endpoints → 🔴 Critical

### 5.7 Performance
Pagination · Heavy queries · Blocking code

### 5.8 Async Issues
Missing `await` · Unhandled promises · Race conditions

### 5.9 Error Handling
Centralized error handler · Custom errors

### 5.10 Testability
Unit tests للـ services؟ · Critical paths (auth, payment, booking) covered؟ · Logic isolated عن I/O؟

> Missing tests on critical paths → 🟠 Major

### 5.11 Code Quality
naming واضح؟ · duplication؟ · readability كويسة؟

Auto-flag:
- Function > 50 lines
- File > 300 lines
- Nested logic > 3 levels
- Duplicated logic across files

### 5.12 API Contracts
- Response shape consistent؟
- HTTP status codes صح؟
- Error format موحد؟
- Validation قبل business logic مش بعديه
- No raw `req.body` في service layer

> Missing schema validation → 🟠 Major

### 5.13 Logging

**Must exist:** structured logging (JSON preferred) · كل error يتلوج · كل log يشمل `request_id`, `user_id`, `action`.  
**Never log:** passwords · tokens · PII حساسة

> Logging sensitive data → 🔴 Critical · Missing error logging → 🟠 Major

### 5.14 Transactions

Required لما يكون فيه multiple writes أو financial/critical operations.  
تحقق من: rollback on failure · partial failure handling.

> Missing transaction on multi-write → 🔴 Critical

### 5.15 Config & Environment
- لا secrets hardcoded (API keys, passwords, tokens)
- env variables مستخدمة
- Config validation عند startup
- `.env.example` أو config schema موجودة

> Hardcoded secret → 🔴 Critical

### 5.16 Hardcoded Values

| Pattern | Bad | Good |
|---|---|---|
| Magic numbers | `if (role === 2)` | `if (role === Role.ADMIN)` |
| Hardcoded strings | `status === "active"` | `status === Status.ACTIVE` |
| i18n messages | `res.json({ message: "User not found" })` | `res.json({ message: t("errors.userNotFound") })` |
| Hardcoded URLs | `fetch("http://localhost:3000/...")` | `fetch(\`${config.services.userService}/...\`)` |
| Hardcoded timeouts | `setTimeout(fn, 5000)` | `setTimeout(fn, config.timeouts.default)` |

> Hardcoded secret/URL → 🔴 Critical · Hardcoded i18n string → 🟠 Major · Magic number → 🟡 Minor

### 5.17 OpenAPI Spec

- كل endpoint موثق في `openapi.yaml`؟
- Request/Response يطابق الـ implementation الفعلي؟
- **كل parameter وـ body schema لازم يكون فيه `example` صريح وواقعي (مش dummy).**
- Endpoints متجمعة في الـ tags الصح؟

> Missing endpoint → 🟠 Major · Request/Response mismatch → 🟠 Major · Missing examples → 🔴 Critical

### 5.18 File Upload

**Side A — OpenAPI → Code (declared but not implemented?)**

لو `openapi.yaml` بيعرّف `multipart/form-data` + `format: binary` → تحقق إن:
- multer middleware (`imageOnlyUpload` / `documentsUpload`) مـ imported
- Middleware مربوط على الـ route
- Controller بيقرأ `req.file` أو `req.files`

**Side B — Code → OpenAPI (implemented but not documented?)**

لو multer middleware موجود على الـ route → تحقق إن `openapi.yaml` عنده:
- `content: multipart/form-data`
- كل file field فيها `type: string, format: binary`
- كل non-file field موجودة في الـ schema
- كل property فيها `example` أو `description`

**Upload Middleware Reference:**

| Export | Cloudinary folder | Allowed types | Use for |
|---|---|---|---|
| `imageOnlyUpload` | `booklyx/images` | jpeg, png, gif, webp | Profile photos, service images |
| `documentsUpload` | `booklyx/documents` | jpeg, png, gif, webp | KYC docs, certificates |

كلاهما exported من `src/middleware/upload.js`. Files في `req.file.path` (`.single()`) أو `req.files.<field>[0].path` (`.fields()`).

**Fix templates:**

```js
// Route — attach upload middleware
import { imageOnlyUpload } from "../../middleware/upload.js";
router.post("/endpoint", authenticate, imageOnlyUpload.single("fieldName"), handler);
// or for multiple fields:
router.post("/endpoint", authenticate, documentsUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "document", maxCount: 1 },
]), handler);

// Controller — read uploaded file
const imageUrl = req.file?.path ?? body.imageUrl ?? null;
const logoUrl  = req.files?.logo?.[0]?.path ?? body.logoUrl ?? null;
```

```yaml
# OpenAPI — multipart/form-data fix
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          fieldName:
            type: string
            example: some value
          logo:
            type: string
            format: binary
            description: "Image file for logo"
```

> Multer missing in route → 🔴 Critical · Controller not reading `req.file` → 🔴 Critical · OpenAPI missing `multipart/form-data` → 🟠 Major · File field missing `format: binary` → 🟠 Major

---

## 6. Issues Table

| Severity | Issue No. | File | Issue | Workflow Ref | Current Code | Suggested Edit |
|---|---|---|---|---|---|---|

**Severity levels:**

| Icon | Level | معناها |
|---|---|---|
| 🔴 | Critical | Security hole, data corruption, system crash |
| 🟠 | Major | Wrong business logic, missing auth, N+1 |
| 🟡 | Minor | Code smell, missing validation |
| 🔵 | Suggestion | Refactor, readability |

---

## 7. Report

اكتب الـ report في `.github/backend_review_latest.md` (overwrite كل مرة).

### Summary
- Files reviewed
- Total issues per severity

### Issues Table
(كما في Section 6)

### Files Status

| File | Status |
|---|---|
| src/... | ✅ Clean |
| src/... | ⚠️ Has Issues |

---

## 8. Update Review State

Append فقط في `.github/review_state.md` — لا تعمل overwrite.

```md
## Review — {date}

| File | Status | Issues Count | Last Reviewed |
|---|---|---|---|
| src/... | ✅ Clean | 0 | {date} |
```

---

## 9. Final Output

```
Files reviewed: X
🔴 Critical: X
🟠 Major: X
🟡 Minor: X
🔵 Suggestions: X
```

### Top 3 Issues
أعلى 3 مشاكل + fix لكل منها.

### Code Health Score

```
Start = 10
-2 per 🔴 · -1 per 🟠 · -0.3 per 🟡 · -0.1 per 🔵
Min = 1

Final: X/10
```

---

## 10. Anti-Hallucination Rules

- لو مش 100% متأكد إن الـ issue موجود → لا تذكره.
- كل issue لازم يكون معاه code snippet فعلي من الملف.
- لو مش متأكد → اكتب `"Needs Verification"` وتخطى.
- ممنوع تمامًا: "could be improved" بدون سبب محدد وـ code reference.

---

## 11. Fix Mode

لو المستخدم قال `fix [issue number]` أو `fix all`:

1. أكد الـ scope: `"Will fix issues: X, Y, Z — confirm?"`
2. نفّذ بس بعد الموافقة.
3. الـ fix لازم يحافظ على الـ behavior الحالي إلا لو الـ issue Critical.
4. بعد الـ fix: حدّث `review_state.md`.
5. **Critical issues تحتاج explicit approval — لا تعمل auto-fix.**

---

## Critical Rules (Summary)

- اقرأ `ai_workflow.md` الأول — لو مش موجود، وضّح واستمر.
- Re-read كل ملف بالـ tool قبل ما تكتب issues عليه.
- استخدم incremental review (`git diff`) — fallback لـ `find`.
- Scope > 20 ملف → قسّم على modules مع progress.
- ملف > 300 سطر → chunks من 100 سطر.
- اتبع الـ review priority: security أولاً دايمًا.
- كل issue: severity · workflow ref · code snippet · fix.
- Code health score بالمعادلة — مش تقدير شخصي.
- `review_state.md` → append فقط.
- Output: issues table وـ report sections فقط — بدون commentary زيادة.
- ركز على: correctness · security · scalability.

---

## Module Generation Rules

### Architecture Source

الـ folder structure يتولد من **OpenAPI tags**.

```yaml
tags:
  - name: registration
```

يولّد:
```
auth/registration/
├── registration.routes.js
├── registration.controller.js
├── registration.service.js
└── registration.validation.js
```

### Multiple Tags

```yaml
tags:
  - registration
  - session
  - password
```

يولّد:
```
auth/
├── registration/
├── session/
├── password/
└── auth.routes.js
```

### Main Module Router

```js
// auth.routes.js — ONLY imports and mounts sub-routers
import registrationRouter from "./registration/registration.routes.js";
import sessionRouter from "./session/session.routes.js";

const authRouter = Router();
authRouter.use("/", registrationRouter);
authRouter.use("/", sessionRouter);

export default authRouter;
```

❌ ممنوع تمامًا: `router.post("/login", loginController)` داخل الـ main router.

### Auto-Create Missing Features

لو OpenAPI فيه tag مش موجود في الـ codebase → أنشئ الـ folder وكل ملفاته تلقائيًا.

### Endpoint Placement

كل endpoint يتحط جوه الـ folder بتاع الـ tag بتاعه في OpenAPI — مش بالـ URL أو حاجة تانية.

### Layer Responsibilities

| Layer | Allowed |
|---|---|
| `routes` | Route definitions, auth middleware, upload middleware |
| `controller` | Validation parsing, call services, translate messages, format responses |
| `service` | Business logic, Prisma, transactions, integrations |
| `validation` | Zod schemas only |

❌ DB queries في controllers · Business logic في routes · `req`/`res` في services.

> OpenAPI tags = single source of truth للـ folder structure.