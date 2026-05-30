---
name: review-backend
description: "Production-grade backend code review aligned with project workflow"
argument-hint: "feature or whole project"
agent: "agent"
---

# Backend Code Review (Workflow-Aware)

## Overview

Perform a **production-grade backend review** مع فهم كامل للـ system من خلال:

- قراءة:
  ```
  .github/ai_workflow.md
  ```
- الهدف: تعرف المشروع المفروض يعمل ايه قبل ما تحكم على الكود

---

## Tools Available

```
- Use code_interpreter to read files and run commands
- Use python to run bash-equivalent commands (e.g. find, git diff)
- NEVER assume file content — always read first using the tool
- If a tool call fails, state the reason explicitly and continue with available info
```

---

## 1. Load Project Context First

### MUST READ

```python
with open(".github/ai_workflow.md", "r") as f:
    print(f.read())
```

### Fallback (إذا الملف مش موجود)

```md
If `.github/ai_workflow.md` not found:
- State clearly: "⚠️ No workflow file found — review based on folder structure only"
- Infer architecture from folder/module names
- Do NOT halt — continue review with structural assumptions
```

### الهدف

* فهم:

  * Business requirements
  * System behavior
  * Expected architecture
* بعد كده قارن الكود بالـ workflow مش بشكل عشوائي

---

### 1.5 Package Versions Check (STRICT)

```python
with open("package.json", "r") as f:
    import json
    pkg = json.load(f)
    print(json.dumps(pkg.get("dependencies", {}), indent=2))
```

* الهدف: معرفة إصدارات المكتبات المستخدمة (زي Zod, Prisma, Express).
* التأكد من إنك بتراجع بناءً على قواعد الإصدار الصحيح للمكتبة (مثلاً Zod 4 ممكن تختلف عن Zod 3 في الـ error parameters).
* دايماً اعمل Check للـ `package.json` قبل ما تحكم إن فيه Syntax Error في استخدام مكتبة معينة.

---

## 2. Review Priority Order

**الـ agent لازم يراجع بالترتيب ده — مش كل الحاجات بنفس الوزن:**

```
1. Security (auth, injection, exposure)
2. Data Integrity (transactions, validation, hardcoded values)
3. Business Logic Correctness (workflow alignment)
4. Performance (N+1, blocking, pagination)
5. Code Quality (naming, duplication, readability)
```

> ⚠️ لو فيه Critical security issue → اذكره فورًا قبل ما تكمل الـ review

---

## 3. Identify Files to Review

### Scope

* Feature:

  ```
  src/modules/<feature>/
  ```

* Whole project:

  ```
  src/
  ```

---

### File Discovery

```python
import subprocess
result = subprocess.run(
    ["find", "src", "-type", "f", "(", "-name", "*.js", "-o", "-name", "*.ts", ")"],
    capture_output=True, text=True
)
print(sorted(result.stdout.splitlines()))
```

---

### Incremental Review (STRICT)

```python
import subprocess
result = subprocess.run(["git", "diff", "--name-only", "HEAD~1"], capture_output=True, text=True)
print(result.stdout)
```

If no git history available:

* fallback to full scan using `find`

---

### Large Project Handling

```md
If file count > 20:
- Split review by module
- Output progress: "Reviewing module X (N/Total)..."
- Never batch all files in one pass
```

### Large File Handling

```md
If a single file exceeds 300 lines:
- Review in chunks of 100 lines
- State: "Reviewing lines X–Y of Z"
- Never skip a chunk
```

---

## 4. Deep Review Per File

> ⚠️ STRICT RULE: Re-read each file using the tool immediately before writing any issues for it.
> Do NOT rely on previously read content.

### 4.1 Business Logic vs Workflow

* هل الكود:

  * ماشي حسب `ai_workflow.md`؟
  * ولا فيه deviation؟

---

### 4.2 Edge Cases

* null / undefined
* invalid input
* duplicates
* race conditions

---

### 4.3 Architecture & Directory Structure (Modular Feature-Based Layout)

Expected:
1. **Directory Layout**: Each module (e.g. `client`, `staff`, `auth`, `branch_admin`) must follow a strict modular structure. Monolithic files at the root of a module (like `client.controller.js`, `client.service.js`) are strictly forbidden.
   Each folder inside a module must represent a single cohesive feature (domain) and contain its own:
   - `<feature>.routes.js`
   - `<feature>.controller.js`
   - `<feature>.service.js`
   - `<feature>.validation.js` (optional/required if validating input)
   
2. **Main Router**: The module's main router file (`src/modules/<module>/<module>.routes.js`) must ONLY import the feature sub-routers and mount them using `.use()`. No controller handlers should be imported or mounted directly in the main router file.

3. **Layer Separation**:
   - `routes` -> handles HTTP request mapping, auth middleware, and multer file upload integration.
   - `controller` -> handles input validation schema parsing, calling service functions, translating response keys using `t()`, and formatting/returning JSON responses using standard helpers.
   - `service` -> handles all business logic, database queries (Prisma), transactional processes, and integrations. Must be completely independent of HTTP context (no `req`, `res`, or Express-specific objects).

❌ ممنوع:
- Global/root module barrel files like `<module>.controller.js` or `<module>.service.js`.
- Controller files containing direct business logic or raw database queries.
- Service files handling Express request/response payloads or direct HTTP calls.


---

### 4.4 Database

* Queries صح؟
* فيه N+1؟
* فيه indexes؟

---

### 4.5 Security

* Validation موجود؟
* Auth / Authorization؟
* Injection؟

---

### 4.6 Abuse Protection

```md
- Rate limiting موجود على الـ public endpoints؟
- Brute force protection على login / OTP؟
- Sensitive endpoints محمية؟
```

> Missing rate limiting on auth endpoints → 🔴 Critical

---

### 4.7 Performance

* Pagination؟
* Heavy queries؟
* Blocking code؟

---

### 4.8 Async Issues

* Missing await
* unhandled promises
* race conditions

---

### 4.9 Error Handling

* centralized error handler؟
* custom errors؟

---

### 4.10 Scalability

* system يتحمل load؟
* فيه retry / queues؟

---

### 4.11 Testability & Test Coverage

```md
- Unit tests موجودة للـ services؟
- Critical paths (auth, payment, booking) covered؟
- Logic isolated عن I/O؟
- Missing tests على critical paths → 🟠 Major
```

---

### 4.12 Code Quality & Smell Detection

```md
- naming واضح؟
- duplication موجود؟
- readability كويسة؟

Flag automatically if:
- function > 50 lines
- file > 300 lines
- nested logic > 3 levels deep
- duplicated logic across files
```

---

### 4.13 API Contracts

```md
- Response shape consistent في كل الـ endpoints؟
- HTTP status codes صح؟
- Error format موحد؟
- DTOs أو schema validation موجودة؟
- No raw req.body usage in service layer
- Validation قبل business logic مش بعديه
```

> Missing schema validation → 🟠 Major

---

### 4.14 Logging & Monitoring (STRICT)

```md
MUST exist:
- All errors MUST be logged
- Structured logging (JSON preferred)
- Each log MUST include:
  - request_id
  - user_id (if exists)
  - action name

NEVER log:
- passwords
- tokens / secrets
- raw credit card or sensitive PII
```

> Logging sensitive data → 🔴 Critical
> Missing error logging → 🟠 Major

---

### 4.15 Transactions (STRICT)

```md
Transactions REQUIRED when:
- Multiple writes in one operation
- Financial or critical data changes
- Dependent operations (fail one → rollback all)

Check for:
- rollback on failure
- partial failure handling

Missing transaction on multi-write → 🔴 Critical
```

---

### 4.16 Config & Environment

```md
- Secrets مش hardcoded في الكود؟ (API keys, passwords, tokens)
- تستخدم env variables؟
- فيه config validation عند startup؟
- فيه .env.example أو config schema؟
```

> Hardcoded secret → 🔴 Critical

---

### 4.17 Hardcoded Values Check (STRICT)

```md
Scan every file for the following patterns:

1. Magic numbers:
   BAD:  if (role === 2)
   GOOD: if (role === Role.ADMIN)

   BAD:  const limit = 10
   GOOD: const limit = config.pagination.defaultLimit

2. Hardcoded strings (should be enums or constants):
   BAD:  status === "active"
   GOOD: status === Status.ACTIVE

3. Hardcoded i18n messages (ANY message returned to client):
   BAD:  res.json({ message: "User not found" })
   GOOD: res.json({ message: t("errors.userNotFound") })

   BAD:  throw new Error("Invalid token")
   GOOD: throw new AppError(t("errors.invalidToken"), 401)

4. Hardcoded URLs or endpoints:
   BAD:  fetch("http://localhost:3000/api/users")
   GOOD: fetch(`${config.services.userService}/api/users`)

5. Hardcoded timeouts or limits:
   BAD:  setTimeout(fn, 5000)
   GOOD: setTimeout(fn, config.timeouts.default)
```

> Hardcoded i18n string → 🟠 Major
> Hardcoded secret or URL → 🔴 Critical
> Hardcoded magic number without constant → 🟡 Minor

---

### 4.18 OpenAPI Specification Check (STRICT)

```md
- Are all newly implemented or reviewed endpoints documented in `openapi.yaml`?
- Do the Request Parameters (query, body, path) and Response Payloads in `openapi.yaml` accurately match the actual implementation in controllers/validation schemas?
- **CRITICAL**: EVERY endpoint MUST have explicit `example` or `examples` defined for ALL its parameters (path, query, header) and request/response body schemas. Check this meticulously for the endpoints under review.
- **SUCCESS RESPONSES**: Pay special attention to `200` and `201` responses. They MUST include a full, realistic `example` (or `examples` with mocked data) showing the exact JSON structure that will be returned, exactly as the backend returns it. NEVER use generic or hallucinated dummy values like `{"exampleKey": "exampleValue"}`.
- Are endpoints logically grouped into their corresponding `tags`?
```

> Missing endpoint in OpenAPI docs → 🟠 Major
> Request/Response mismatch between Code and OpenAPI → 🟠 Major
> Missing examples in OpenAPI docs (parameters or schemas) → 🔴 Critical

---

### 4.19 File Upload Check (STRICT)

```md
For every endpoint under review, perform the following two-sided check:

#### Side A — OpenAPI → Code (Upload declared but not implemented?)

1. Read the endpoint's entry in `openapi.yaml`.
2. Check if the requestBody uses `content: multipart/form-data` AND contains at least one property with `format: binary`.
3. If YES → open the corresponding route file and verify ALL of the following:
   a. A multer upload middleware (`imageOnlyUpload`, `documentsUpload`, or equivalent) is imported.
   b. The middleware is attached to that exact route (e.g. `imageOnlyUpload.single(...)`, `.fields([...])`, `.array(...)`).
   c. The controller reads the uploaded file from `req.file` or `req.files` and stores/uses the result (e.g. `req.file.path`, `req.files.logo[0].path`).

If any of (a), (b), or (c) is missing → FLAG as 🔴 Critical and provide the fix.

**Fix template when upload middleware is missing from a route:**
```js
// In the route file — import the upload middleware
import { imageOnlyUpload } from "../../middleware/upload.js";
// or: import { documentsUpload } from "../../middleware/upload.js";

// Attach before the controller handler (single file):
router.post("/endpoint", authenticate, imageOnlyUpload.single("fieldName"), handler);

// Attach before the controller handler (multiple named fields):
router.post("/endpoint", authenticate, documentsUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "document", maxCount: 1 },
]), handler);
```

**Fix template when controller doesn't read the uploaded file:**
```js
// In the controller — read from req.file (single) or req.files (fields):
const imageUrl = req.file?.path ?? body.imageUrl ?? null;         // single file
const logoUrl  = req.files?.logo?.[0]?.path ?? body.logoUrl ?? null;  // named field
```

#### Side B — Code → OpenAPI (Upload implemented but not documented?)

1. Read the route file for the endpoint under review.
2. Check if a multer middleware (`imageOnlyUpload`, `documentsUpload`) is attached to the route.
3. If YES → open `openapi.yaml` and verify:
   a. The requestBody `content` type is `multipart/form-data` (NOT `application/json`).
   b. Each uploaded field (e.g. `logo`, `image`, `taxCertificate`) appears in the schema with `type: string` and `format: binary`.
   c. Any non-file fields sent alongside the upload (text, numbers, IDs) are also listed in the same multipart schema.
   d. EVERY property inside the multipart schema (both file and non-file fields) MUST have an explicit `example` or `description` providing a sample value.

If any of (a), (b), (c), or (d) is missing or wrong → FLAG as 🟠 Major and provide the corrected YAML snippet.

**Fix template for missing/wrong OpenAPI multipart documentation:**
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          fieldName:           # text field
            type: string
            example: some value
          logo:                # file field
            type: string
            format: binary
            description: "Image file upload for logo"
          document:            # another file field
            type: string
            format: binary
            description: "PDF/Image for document"
```

#### Upload Middleware Reference (project-specific)

| Middleware export     | Cloudinary folder       | Allowed types              | Use for                          |
|-----------------------|-------------------------|----------------------------|----------------------------------|
| `imageOnlyUpload`     | `booklyx/images`        | jpeg, png, gif, webp       | Profile photos, service images   |
| `documentsUpload`     | `booklyx/documents`     | jpeg, png, gif, webp       | KYC docs, certificates, licenses |

Both are exported from `src/middleware/upload.js`. Uploaded files land in `req.file.path` (`.single()`) or `req.files.<fieldName>[0].path` (`.fields()`).
```

> Upload declared in OpenAPI but multer middleware missing in route → 🔴 Critical
> Upload declared in OpenAPI but controller doesn't read `req.file` / `req.files` → 🔴 Critical
> Multer middleware present in route but OpenAPI missing `multipart/form-data` → 🟠 Major
> File field missing `format: binary` in OpenAPI schema → 🟠 Major

---

## 5. Issues Table

**Output the issues table ONLY for this section. No extra commentary or summaries between rows.**

| Severity | Issue No. | File | Issue | Workflow Ref | Current Code | Suggested Edit |
| -------- | --------- | ---- | ----- | ------------ | ------------ | -------------- |

---

### Severity Levels

| Icon | Level      | معناها                                       |
| ---- | ---------- | -------------------------------------------- |
| 🔴   | Critical   | security hole, data corruption, system crash |
| 🟠   | Major      | wrong business logic, missing auth, N+1      |
| 🟡   | Minor      | code smell, missing validation               |
| 🔵   | Suggestion | refactor, readability                        |

---

### Rules

* Severity → من الجدول فوق
* Issue No → incremental
* File → path + line
* Issue → واضح ومحدد
* Workflow Ref → reference من `ai_workflow.md` أو inferred requirement
* Current Code → snippet
* Suggested Edit → كود جاهز

---

### Example

```md
| 🔴 Critical | 1 | src/modules/user/service/user.service.ts:45 | Missing email validation | User must provide valid email before account creation | `const user = await repo.create(data)` | `if (!isValidEmail(data.email)) throw new AppError(t("errors.invalidEmail"), 400)` |
| 🟠 Major    | 2 | src/modules/auth/controller/auth.controller.ts:12 | Hardcoded i18n message | All client-facing messages must use i18n keys | `res.json({ message: "User not found" })` | `res.json({ message: t("errors.userNotFound") })` |
```

---

## 6. Generate Report

**Output each section header and its content only. Do not add transitional commentary between sections.**

In addition to printing in chat, the agent MUST write the full report sections
(Summary, Issues Table, Files Status, Final Output, Top 3 Issues, Code Health Score)
into a markdown file inside the project workspace:

```md
.github/backend_review_latest.md
```

- Overwrite the previous contents of this file on each run.
- The file must be valid Markdown and include all sections exactly once.

### Summary

* Files reviewed
* Total issues per severity

---

### Issues Table

(بالشكل الجديد)

---

### Files Status

| File    | Status        |
| ------- | ------------- |
| src/... | ✅ Clean       |
| src/... | ⚠️ Has Issues |

---

## 7. Update Review State

```bash
.github/review_state.md
```

### Rule

* Append only — لا تعمل overwrite

```md
## Review — {date}

| File | Status | Issues Count | Last Reviewed |
|------|--------|-------------|--------------|
| src/... | ✅ Clean | 0 | {date} |
| src/... | ⚠️ Has Issues | 3 | {date} |
```

---

## 8. Final Output

```md
- Files reviewed: X
- 🔴 Critical: X
- 🟠 Major: X
- 🟡 Minor: X
- 🔵 Suggestions: X
```

---

### Top 3 Issues

اذكر أعلى 3 مشاكل + fix

---

### Code Health Score

```md
Start = 10
-2 per 🔴
-1 per 🟠
-0.3 per 🟡
-0.1 per 🔵
Min = 1

Final: X/10
```

---

## 9. Anti-Hallucination Rules (STRICT)

* If you are not 100% sure an issue exists in the code → DO NOT include it
* Re-read the file using the tool before writing any issue for it
* Every issue MUST be backed by an exact code snippet from the file
* If unsure → write: "Needs Verification" and skip
* NEVER use vague statements like "could be improved" without a specific reason and code reference
* NEVER invent issues that are not present in the actual file content

---

## 10. Fix Mode

If user says `fix [issue number]` or `fix all`:

* Confirm scope first:
  ```
  "Will fix issues: X, Y, Z — confirm?"
  ```
* Apply only after confirmation
* Fix must preserve existing behavior unless issue is Critical
* Add regression-safe edits only
* After fix: update `review_state.md` accordingly
* **Never auto-fix Critical issues without explicit approval**

---

## Critical Rules

* اقرأ `ai_workflow.md` الأول — لو مش موجود، وضّح واستمر
* استخدم `code_interpreter` لقراءة كل ملف قبل الحكم عليه — لا تفترض المحتوى
* استخدم incremental review لو متاح (`git diff`) — fallback لـ `find`
* لو الـ scope > 20 ملف: قسّم على modules وأظهر progress
* لو الملف > 300 سطر: راجعه على chunks مش كله مرة واحدة
* اتبع الـ review priority order — security الأول دايمًا
* كل issue لازم: severity · workflow reference · code snippet · fix واضح
* افحص كل hardcoded value (strings, numbers, messages, URLs, secrets) بالـ patterns في 4.17
* الـ code health score يتحسب بالمعادلة مش تقدير شخصي
* update `review_state.md` بـ **append** مش overwrite
* لا تعمل fix تلقائي — confirm الأول، وـ Critical تحتاج approval صريح
* Output the issues table and report sections ONLY — no extra commentary between sections
* ركز على: correctness · security · scalability