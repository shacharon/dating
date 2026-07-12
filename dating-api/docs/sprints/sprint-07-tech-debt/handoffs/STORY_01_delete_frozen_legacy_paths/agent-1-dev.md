# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_delete_frozen_legacy_paths.md](../../STORY_01_delete_frozen_legacy_paths.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Deleted frozen analyze cluster** — `ProfilesAnalyzeController` + cache/failures persistence + specs (`/api/profiles/*analyze*` removed).
- **Deleted V2 extraction chain** — `ExtractionModule`, `ExtractionV2*`, interests/negatives extraction, `canonical-projection`, `canonical-profile.repository`, `holy-grail-ranking-signals-sync`, `chips-layer-builder`, `validate-v1-v2.ts`.
- **Module cleanup** — removed `ExtractionModule` from `AppModule` and `ProfilesModule`; product path unchanged (`ExtractionCoreModule` via `EvaluateServiceModule`).
- **Slimmed evaluate endpoint** — `POST /api/v1/profiles/evaluate` returns JSON only (no `ProfilesPrismaService.save`).
- **Slimmed `ProfilesPrismaService`** — removed frozen `save`/`saveToPrisma` and dead snapshot helpers; stub readers kept for admin/compare.
- **UI POC removed** — deleted `dating-ui/src/app/poc/**` (6 files).
- **Script cleanup** — removed `validate:v1-v2` from `package.json`; deleted `scripts/analyze-all-resume.ps1`.
- **`legacy/` module kept** — per architect; admin routes unchanged.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/profiles/profiles.module.ts` | removed analyze controller + V2 deps |
| `dating-api/src/profiles/profiles.controller.ts` | evaluate-only, no persist |
| `dating-api/src/profiles/profiles-prisma.service.ts` | slimmed (no save path) |
| `dating-api/src/app.module.ts` | removed `ExtractionModule` |
| `dating-api/src/extraction/extraction-core.module.ts` | updated comment |
| `dating-api/package.json` | removed `validate:v1-v2` |
| `dating-api/docs/refactor-changelog.md` | Sprint 7 Story 1 checkpoint |
| `dating-api/PROFILES_EVALUATE_PIPELINE_MAP.md` | persist steps removed |
| **Deleted (API)** | `profiles-analyze.controller.ts` + spec, `analysis-cache.service.ts`, `analyze-failures-persistence.service.ts`, `extraction.module.ts`, `extraction-v2*.ts`, `interests-extraction.service.ts` + spec, `negatives-extraction.service.ts`, `chips-layer-builder.ts` + spec, `canonical-projection.ts`, `canonical-profile.repository.ts`, `holy-grail-ranking-signals-sync.ts`, `validate-v1-v2.ts` |
| **Deleted (UI)** | `dating-ui/src/app/poc/**` (6 files) |
| **Deleted (scripts)** | `scripts/analyze-all-resume.ps1` |

---

## Decisions (do not reverse without discussion)

- Followed architect deletion tiers 1–5 in order.
- Did not delete `legacy/` module, `ProfilesReadController`, or deprecated `exit(1)` npm scripts (Story 2).
- No Prisma schema changes.

---

## Import grep checkpoint

Post-deletion `rg` on `src/` for deleted symbols: **zero runtime imports** (comments in me-profile specs only).

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npm run build` (dating-ui) — pass (no `/poc` routes)
- [x] Guard suite:
  ```bash
  npx jest me-profile-http.integration.spec.ts me-profile-analysis.service.spec.ts match-quality-audit.v1-path.spec.ts me-matches.v1-contract.spec.ts matches-api-smoke.integration.spec.ts --runInBand
  ```
  **219/219 pass**
- [ ] Full `npm test` — Agent 2 to run full suite
- [ ] Manual product smoke — login → matches → like → message (operator)

---

## Manual smoke

```bash
cd dating-api && npm run start:dev
cd dating-ui && npm run dev
```

1. Login → browse matches → like → open conversation → send message  
2. Visit `/evaluate` — submit texts, receive evaluation JSON (no DB write)  
3. Confirm `/poc` returns 404  

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Full test suite | Agent 2 |
| Deprecated npm scripts bulk cleanup | Story 2 |
| DB column/table drops | Story 2 |
| `scripts/analyze-all.ts` | Story 2 |

---

## Open questions / blockers

- None blocking Agent 2.

---

## Next agent

```text
--agent 2 sprint 7 story 1
```

**Notes for next agent:**

1. Run full `npx jest --runInBand`; fix any broken imports from deleted modules.
2. Verify grep checkpoint (zero refs to deleted symbols in `src/`).
3. Optional: add test asserting `POST /api/v1/profiles/evaluate` does not call prisma write.
4. Do not restore deleted analyze routes or `ExtractionModule`.
