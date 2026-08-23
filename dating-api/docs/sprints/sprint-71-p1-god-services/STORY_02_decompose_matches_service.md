# Story 02 — Decompose Legacy MatchesService (Admin Stack)

**Sprint:** 71  
**Effort:** 2 days  
**Risk:** ⚠️ MEDIUM — admin/dev compare endpoints; dual-stack confusion  
**Status:** Done  

**Handoffs:** [preflight](./handoffs/STORY_02_decompose_matches_service/agent--1-preflight.md) · [architect](./handoffs/STORY_02_decompose_matches_service/agent-0-architect.md) · [dev](./handoffs/STORY_02_decompose_matches_service/agent-1-dev.md) · [CR](./handoffs/STORY_02_decompose_matches_service/agent-2-cr.md) · [PM](./handoffs/STORY_02_decompose_matches_service/agent-3-pm.md)
**Replaces:** Sprint 64 Story 2 (partial — service still 503 LOC + direct Prisma)

---

## Objective

Split `matches/matches.service.ts` (503 LOC) into focused admin/legacy collaborators. Clarify this is **not** the product `/api/v1/me/matches` stack (`MeMatchesService` / `MatchRankingService`).

**Consumers:** `MatchesController` (`@UseGuards(AuthGuard, AdminGuard)`), internal admin tools, daemon index rebuild helpers.

---

## Current responsibilities (method map)

| Method | Concern |
|--------|---------|
| `compare`, `compareHgDiagnostic` | Pairwise engine compare |
| `getReadyMatchDetailContext` | Admin detail prep |
| `list`, `listFull`, `listFullWithHolyGrailRows`, `listAllComputed` | Admin match listing |
| `getShadowHgVsLegacyMetrics` | Shadow telemetry report |
| `persistMatchPairHgSnapshots`, `resolveHolyGrailDiagnosticsWireForMatchRecords` | HG snapshot persistence/wiring |
| `isHgCompareDiagnosticEnabled`, `isHgListAdmissionGateEnabled` | Feature flags |

Plus: direct `PrismaService` injection (DIP violation — peel to existing repos where trivial).

---

## Target layout (locked — Agent 0)

```
matches/
  matches.service.ts                     # thin facade ≤150 LOC (re-export types)
  matches.service.types.ts               # CompareBodyDto, CompareServiceResult, etc.
  matches-spec-size.policy.spec.ts       # LOC guards
  admin/
    matches-compare.service.ts           # compare + compareHgDiagnostic + getReadyMatchDetailContext
    matches-feature-flags.service.ts     # HG env flag helpers
  api/
    matches-admin-list.service.ts        # list*, listAllComputed, HG admission gate filtering
    matches-hg-diagnostics.service.ts    # snapshot persist, resolveWire, loadSnapshotMap (Prisma only here)
```

Facade stays at root per Sprint 70 README. Update `matches.module.ts` providers; controllers inject facade only.

---

## Legacy quarantine (optional, architect decides)

If compare/list are truly admin-only legacy:

- Add `@deprecated` JSDoc on facade methods pointing to product stack
- README note in `matches/README.md`: "Product match list → `me-profile/matches/`; this module is admin/engine diagnostics"

**Do not delete** endpoints — admin still uses them.

---

## Tasks

1. Map which methods share helpers (compare path vs list pipeline).
2. Extract services; move related private functions with them.
3. Where `PrismaService` is used for simple reads, switch to `ProfilesPrismaService` or existing repo if ≤30 min; otherwise document deferral in handoff.
4. Update `matches.service.spec.ts` or split per collaborator.
5. `npm test -- matches.service` + `matches-api-smoke.integration.spec.ts`.

---

## Success

- [x] Facade ≤150 LOC (116 non-empty)
- [x] Each collaborator ≤250 LOC
- [x] Admin HTTP responses unchanged
- [x] `MatchesController` compiles without signature changes

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
