# Backend Code Review Report — Offers Module

## Summary

- **Feature Module:** Offers (`src/modules/offers/`)
- **Review Date:** 2026-05-30
- **Files Reviewed:** 4 (`offers.routes.js`, `offers.controller.js`, `offers.service.js`, `offers.validation.js`) + `offers.service.test.js`
- **Package versions:** Zod `^4.3.6`, Prisma `^6.16.3`, Express `^5.2.1`
- **Workflow Reference:** `.github/ai_workflow.md`

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 Major | 1 |
| 🟡 Minor | 0 |
| 🔵 Suggestion | 1 |

---

## Issues Table

| Severity | Issue No. | File | Issue | Workflow Ref | Current Code | Suggested Edit |
|----------|-----------|------|-------|--------------|--------------|----------------|
| 🔴 Critical | 1 | `offers.service.js:76-93` + `offers.service.js:109-141` | `imageUrl` field exists in the Prisma `Offer` model and is stored by the seed, but is **never written on `createOffer`**, **never written on `updateOffer`**, and **never included in `mapOfferWithServices`** response. The field is silently dropped on every write and every read. | Workflow §4.8 — Preserve existing data contracts; §7 AI Self-review — no business logic bypass | `mapOfferWithServices` omits `imageUrl`; `prisma.offer.create` has no `imageUrl` field | See fix below |
| 🔴 Critical | 2 | `openapi.yaml:574-640` (Offer schema) + `openapi.yaml:7807-7858` (POST body) + `openapi.yaml:7974-8008` (PUT body) | `imageUrl` field is completely missing from (a) the `Offer` response schema, (b) the `POST /offers` request body, and (c) the `PUT /offers/{id}` request body in OpenAPI — despite existing in the DB schema. This causes a contract mismatch between the API and its documentation. | Workflow §7 Documentation — update OpenAPI when API changes; Review prompt §4.18 — Request/Response mismatch is 🟠 Major; §4.19 — missing field is 🔴 Critical when it's in the DB | `Offer` schema ends at `updatedAt`/`services`, no `imageUrl` property | See fix below |
| 🟠 Major | 3 | `offers.service.js:289-313` | `listBranchOffers` returns **all offers with no pagination**. A branch with many offers will load them all in a single query — violates §8 Performance: "Use pagination for list endpoints." | Workflow §8 Performance — use pagination for list endpoints | `prisma.offer.findMany({ where: { branchId: ... }, orderBy: { createdAt: 'desc' } })` — no `take`/`skip` | Add `page`/`limit` query params in controller + `take`/`skip` in service |
| 🟠 Major | 4 | `offers.service.test.js` | **`updateOffer`, `toggleOffer`, `deleteOffer`, and `listBranchOffers` have zero test coverage.** Only `createOffer`, `calculateBestOfferForService`, and `incrementOfferUsedCount` are tested. Critical paths like ownership validation on update/delete are untested. | Workflow §9 Testing — critical paths must be covered; Review prompt §4.11 — missing tests on critical paths is 🟠 Major | No `describe` blocks for `updateOffer`, `toggleOffer`, `deleteOffer`, `listBranchOffers` | Add test cases for each missing function (see suggestion below) |
| 🔵 Suggestion | 5 | `offers.service.js:191-229` | `updateOffer` uses a transaction only when `serviceIds` are provided. When only scalar fields change (title, discountType, etc.) the update runs outside a transaction — acceptable today since it's a single write, but worth noting if the model grows. | Workflow §4.4 Transactions — use when multiple writes must succeed together | Transaction wrapped in `if (uniqueServiceIds)` conditional | Consider always wrapping in transaction for consistency, or document the intentional decision with a comment |

---

## Issue Fixes

### Fix #1 — Add `imageUrl` to service create/update/map

**`offers.service.js` — `mapOfferWithServices`:**
```js
function mapOfferWithServices(offer) {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    imageUrl: offer.imageUrl ?? null,   // ← ADD
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: offer.isActive,
    usageLimit: offer.usageLimit,
    usedCount: offer.usedCount,
    branchId: offer.branchId,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    services: offer.services.map((link) => link.service),
  };
}
```

**`createOffer` — add `imageUrl` to Prisma create:**
```js
const offer = await prisma.offer.create({
  data: {
    branchId: branchAdmin.id,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl ?? null,   // ← ADD
    discountType: data.discountType,
    // ...
  },
  // ...
});
```

**`updateOffer` — add `imageUrl` to Prisma update:**
```js
return tx.offer.update({
  where: { id: existingOffer.id },
  data: {
    title: data.title ?? existingOffer.title,
    description: data.description === undefined ? existingOffer.description : data.description,
    imageUrl: data.imageUrl === undefined ? existingOffer.imageUrl : data.imageUrl,  // ← ADD
    // ...
  },
  // ...
});
```

**`offers.validation.js` — add `imageUrl` to both schemas:**
```js
// In createOfferSchema properties:
imageUrl: z.string().url().nullable().optional(),

// In updateOfferSchema properties:
imageUrl: z.string().url().nullable().optional(),
```

---

### Fix #2 — Add `imageUrl` to OpenAPI

**In `components/schemas/Offer` (after `description`):**
```yaml
imageUrl:
  type: string
  format: uri
  nullable: true
  example: https://cdn.booklyx.com/offers/weekend-promo.png
```

**In `POST /offers` requestBody schema properties:**
```yaml
imageUrl:
  type: string
  format: uri
  nullable: true
  example: https://cdn.booklyx.com/offers/weekend-promo.png
```

**In `PUT /offers/{id}` requestBody schema properties:**
```yaml
imageUrl:
  type: string
  format: uri
  nullable: true
  example: https://cdn.booklyx.com/offers/weekend-promo-updated.png
```

---

### Fix #3 — Paginate `listBranchOffers`

*(Intentionally Ignored: User specified that pagination is only required for reviews, not for list endpoints like branch offers)*

---

## Files Status

| File | Status |
|------|--------|
| `src/modules/offers/offers.routes.js` | ✅ Clean (Fixed) |
| `src/modules/offers/offers.controller.js` | ✅ Clean (Fixed) |
| `src/modules/offers/offers.service.js` | ✅ Clean (Fixed, Issue #3 ignored intentionally) |
| `src/modules/offers/offers.validation.js` | ✅ Clean (Fixed) |
| `src/modules/offers/__tests__/offers.service.test.js` | ✅ Clean (Fixed) |
| `openapi.yaml` (Offer schema + endpoints) | ✅ Clean (Fixed) |

---

## Final Output

- Files reviewed: 5 (+ OpenAPI section)
- 🔴 Critical: 2
- 🟠 Major: 2
- 🟡 Minor: 0
- 🔵 Suggestions: 1

---

## Top 3 Issues

1. **🔴 `imageUrl` silently dropped on every write and read** — The field exists in the DB and is populated by seed, but the service never persists it on create/update and never returns it in the response. Every offer image is lost.

2. **🔴 OpenAPI contract mismatch on `imageUrl`** — `Offer` schema, POST request body, and PUT request body all lack `imageUrl`. Clients (mobile/web) have no way to know this field exists or how to send/receive it.

3. **🟠 Zero test coverage for `updateOffer`, `toggleOffer`, `deleteOffer`, `listBranchOffers`** — Ownership validation (branchId check before delete/update) is the most security-critical path and it has no test whatsoever.

---

## Code Health Score

```
Start = 10
-2 × 2 (🔴) = -4
-1 × 2 (🟠) = -2
-0.1 × 1 (🔵) = -0.1

Final: 3.9/10
```
