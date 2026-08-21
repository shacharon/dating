# Story 03 — Violations + Reports Repository

**Sprint:** 62  
**Effort:** 2 days  
**Risk:** ⚡ LOW–MED  
**Status:** Planned

---

## Objective

Centralize `userContentViolation` / `userReport` Prisma access for product + admin services.

---

## Hot call sites

| Service | Path | Intensity |
|---------|------|-----------|
| Content violations | `content-moderation/content-violation.service.ts` | highest (~14 ops) |
| Admin violations | `admin/admin-content-violations/admin-content-violations.service.ts` | ~6 |
| Reports | `reports/reports.service.ts` | |
| Admin reports | `admin/admin-reports/admin-reports.service.ts` | |

---

## Design sketch

```typescript
export const CONTENT_VIOLATION_REPOSITORY = Symbol('CONTENT_VIOLATION_REPOSITORY');
export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');
```

Keep **enforcement policy** (mute thresholds) in `ContentViolationService`; repository only persists counts/status/mute fields.

---

## Tasks

1. Extract violation CRUD + count queries into repository.
2. Extract report create/list/status into repository.
3. Point admin services at same ports (or admin-specific query methods on same adapter).
4. Specs: content-violation, reports, admin twins.

---

## Success

- [ ] Violation + report product services free of direct Prisma
- [ ] Admin paths share adapters
- [ ] Enforcement thresholds unchanged

---

## Follow-up

Story 04 — Profile photo repository.
