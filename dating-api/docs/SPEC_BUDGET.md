# Spec LOC budget (soft)

**Repo:** `dating-api`  
**Status:** active (Sprint 50 Story 03)  
**Check (warn-only):** `npm run check:spec-budget` from `dating-api`

Soft guidance so new work does not recreate mega-specs. Soft ≈ review policy, not a compile error. A **failing CI gate** requires explicit team agreement later — do not add one without that decision.

---

## Soft thresholds

| Kind | Soft max (lines) | Rule |
|------|------------------|------|
| New focused unit / façade characterization specs | **~400** | Prefer split or shared `*.spec-support.ts` before growing past this |
| Collaborator characterization / large focused specs | **~900** | Allowed with **ownership header**; prefer split when approaching |
| Shared `*.spec-support.ts` / e2e harness support | **~1200** | Ownership note if over; prefer extract helpers over unbounded growth |
| New mega-spec without ownership note | **Forbidden** by policy | Agent / CR must reject or require note + split plan |

**Counting:** physical lines in the file (editor / line-count tools).

### Kind heuristic (for `check-spec-budget`)

| Match | Soft max |
|-------|----------|
| `*.spec-support.ts` | 1200 |
| path contains `/matches/` **or** `*.integration.spec.ts` | 900 |
| other `*.spec.ts` | 400 |

---

## Ownership header

Required when over the soft max, or when intentionally keeping a large file:

```ts
/**
 * Ownership: <collaborator or area> — <why this file is large>.
 * Soft budget: <N> LOC (see dating-api/docs/SPEC_BUDGET.md). Split plan: <none | link/story>.
 */
```

---

## Grandfathered (Sprint 50 — do not “fix” in Story 03)

| File (approx LOC) | Note |
|-------------------|------|
| `src/me-profile/me-matches.service.spec.ts` (~533) | Story 01 façade residual; further thin → future cleanup |
| `src/me-profile/matches/match-list-cache.service.spec.ts` (~809) | Under ~900; scoring split in Story 01 |
| `src/me-profile/matches/match-detail.service.spec.ts` (~735) | Under ~900 |
| `src/me-profile/me-matches-eligibility.spec-support.ts` (~1200) | E2E harness; Story 02 relocate |
| Unrelated giants (`me-profile-http.integration.spec.ts`, `me-profile.service.spec.ts`, …) | Known debt; out of Sprint 50 scope |

---

## How to check

```bash
cd dating-api
npm run check:spec-budget
```

Always exits **0** and prints files over soft thresholds (warn-only). Not wired into GitHub Actions CI.

---

## Related

- Sprint 50: [sprint-50-spec-decomposition](./sprints/sprint-50-spec-decomposition/)
- Round 2 commands: [ROUND2_AGENT_COMMANDS.md](./sprints/ROUND2_AGENT_COMMANDS.md)
