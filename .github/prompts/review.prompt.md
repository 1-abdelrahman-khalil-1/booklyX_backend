# Production-Grade Backend Code Review Workflow

## Overview

When this workflow is triggered, perform a **senior-level production backend code review**.

Assume:

- The system will go live
- It must scale
- It must be secure

---

## 1. Identify Files to Review

- If a feature is specified:
  - Review files inside:  
    `src/modules/<feature>/`

- If "whole project":
  - Review all files inside `src/` (excluding `node_modules`)

### Incremental Review (IMPORTANT)

- Check if `.agent/review_state.md` exists
- If exists:
  - Review ONLY new or modified files
- Otherwise:
  - Review everything

---

## 2. Review Each File (Deep Analysis)

### 2.1 Business Logic Correctness

- Validate logic correctness
- Check:
  - Wrong conditions
  - Missing validations
  - Incorrect flows

---

### 2.2 Edge Case Handling

- Empty input
- Null / undefined
- Invalid formats
- Pagination limits
- Concurrency issues

---

### 2.3 Architecture & Separation of Concerns

- Controller:
  - No business logic
- Service:
  - Contains all logic
- Validation:
  - Isolated in validation file

❌ Red Flags:

- Logic inside controller
- DB calls outside service

---

### 2.4 SOLID Principles

- Single Responsibility
- Proper abstractions
- No tight coupling

---

### 2.5 Database & Prisma Usage

Check for:

- ❌ N+1 queries
- ❌ Overfetching (missing `select`)
- ❌ Missing transactions
- ❌ Multiple queries instead of optimized one

✔ Ensure:

- Efficient queries
- Proper relations handling
- Correct indexing assumptions

---

### 2.6 Performance Bottlenecks

- Repeated DB calls
- Unnecessary queries
- Blocking code (sync loops / heavy CPU)
- Missing pagination

---

### 2.7 Memory & Resource Management

- Unclosed DB connections
- Unhandled async operations
- Event listeners not cleaned

---

### 2.8 Security Vulnerabilities (CRITICAL)

Check for:

- ❌ No validation on input
- ❌ Trusting `req.body`
- ❌ Exposing internal errors
- ❌ Missing auth checks
- ❌ Hardcoded secrets
- ❌ Hardcoded user-facing messages/errors (must use translation keys)

✔ Ensure:

- Proper validation (Zod)
- Sanitization
- Authorization checks
- Localized responses using translation keys (`tr.KEY`) and translator helpers

---

### 2.9 Error Handling

- Controllers:
  - Must NOT use try/catch
- Services:
  - Must throw domain-specific errors extending `AppError`

Check:

- Consistent error format
- Proper status codes
- No hardcoded user-facing error text (must use translated keys)

---

### 2.10 API Design Consistency

- Response format consistent
- Uses `successResponse`
- No raw `res.json`
- No hardcoded user-facing response text; use translation keys

---

### 2.11 Async & Concurrency

- Missing `await`
- Unhandled promises
- Race conditions
- Parallel operations that should be sequential (or vice versa)

---

### 2.12 Scalability Risks

- No pagination
- Large responses
- Tight coupling between modules
- No caching strategy (if needed)

---

### 2.13 Code Quality & Maintainability

- Naming consistency
- No dead code
- No unused imports
- No duplication
- Simple readable logic

---

### 2.14 Code Smell Detection

- Duplicate services
- Over-abstraction
- Huge functions
- Mixed responsibilities

---

### 2.15 Package Usage (IMPORTANT)

Check if developer:

- Reinvented logic بدل استخدام package

❌ Bad:

- Manual validation بدل Zod
- Manual hashing بدل bcrypt

✔ Ensure:

- Uses:
  - Zod
  - Prisma
  - bcrypt
  - jsonwebtoken

---

## 3. Classify Issues

For each issue:

| Field    | Description                       |
| -------- | --------------------------------- |
| Severity | 🔴 Critical / 🟠 Major / 🟡 Minor |
| File     | Path + line                       |
| Problem  | What’s wrong                      |
| Impact   | Real effect                       |
| Fix      | Exact fix (code)                  |

---

### Severity Rules

- 🔴 Critical:
  - Security issues
  - Data corruption
  - Crash

- 🟠 Major:
  - Performance problems
  - Logic bugs
  - Bad architecture

- 🟡 Minor:
  - Style / readability

---

## 4. Generate Report

Include:

### Summary

- Files reviewed
- Issues count

### Issues Table

Grouped by severity

### Files Status

- ✅ Clean
- ⚠️ Has Issues

---

## 5. Update Review State

Update:

```

.github/review_state.md

```

```md
# Review State

## Last Review Date

{date}

## Reviewed Files

| Issue No. | File | Type | Severity | Status | Last Reviewed | Current (As-Is) | Suggested Fix |

```

---

## 6. Final Summary Output

Provide:

- Files reviewed count
- Issues by severity
- Top 3 critical issues
- Code health (1-10)

---

## Review Principles

- No generic كلام
- Be specific (file + line)
- Think production
- Prioritize critical issues
- Focus on real impact

---

## FINAL RULE

- Follow `.github/copilot-instructions.md` to understand development flow before reviewing
- Follow `.github/ai_workflow.md` to align review with feature execution cycle
