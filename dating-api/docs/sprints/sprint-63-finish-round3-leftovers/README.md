# Sprint 63 — Finish Round 3 Leftovers (P0/P1)

**Status:** In Progress  
**Depends on:** Sprints 58–62 Done on main; Story 01 lands Sprint 57 enrichment structure on tip  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) · [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md)  
**Repo:** `dating-api`  
**Round:** 3 (post Tracks 1–4 validation scan)

---

## Goal

Close gaps exposed after Sprints 57–62:

1. **Land enrichment decompose** if still stranded (Sprint 57 merge / verify on main)
2. **Split giant me-profile HTTP integration tests** (unblock future refactors)
3. **Finish Prisma peel** on leftover hot services (~10–12 injectors)
4. **ISP the god match repository** (30+ methods / Prisma generics leak)
5. **Consolidate twin rate-limit stacks** left by Sprint 61

**Non-goals:** Microservices; new product features; changing matching formulas.

---

## Checkpoint (why now)

| Metric | After 58–62 | Gap |
|--------|-------------|-----|
| Evaluate | ~132 LOC ✅ | — |
| Extraction | ~348 LOC | Soft ≤250 optional later |
| Enrichment-v2 | thin facade on tip ✅ | Merge tip → main |
| Prisma injectors | Priority peel Done ✅ (analysis/feedback/account/legacy matches) | Defer: session/users/WS/legacy matches/admin/narrative |
| `IMatchRepository` | God port | ISP split |
| Rate-limit twins | HTTP + WS duplicates | Shared module |
| `me-profile-http.integration.spec.ts` | Split ✅ (4 family + harness) | — |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Enrichment on main + hygiene](./STORY_01_enrichment_merge_hygiene.md) | 0.5–1 day | ⚡ LOW | Done |
| 02 | [Split me-profile HTTP integration specs](./STORY_02_split_me_profile_http_specs.md) | 2–3 days | ⚠️ MEDIUM | Done |
| 03 | [Finish Prisma peel](./STORY_03_finish_prisma_peel.md) | 2–3 days | ⚠️ MEDIUM | Done |
| 04 | [Match repo ISP + shared rate-limit](./STORY_04_match_repo_isp_rate_limit.md) | 2–3 days | ⚠️ MEDIUM | Blocked |

**Order:** 01 → 02 → 03 → 04 (02 can start in parallel with 01).

**Preferred merge tip:** `feature/sprint-63-story-4`

---

## Success criteria

- [x] `enrichment-v2.ts` is thin facade on tip (keyword modules present; merge to main to clear checkpoint) *(Story 01)*
- [x] Me-profile HTTP integration suite split into ≤4 focused files (no single 6k LOC file) *(Story 02)*
- [x] Prisma injectors in product me-profile path ≤ ~6 (analysis/feedback/account peeled or justified) *(Story 03 — four Success services at 0 Prisma injectors; infra/admin deferred)*
- [~] Match repository split or Prisma types removed from port surface *(impl on tip; story Blocked on E2E)*
- [~] One shared rate-limit store factory; HTTP/WS are thin wrappers *(impl on tip; story Blocked on E2E)*
- [ ] Specs green *(Agent 4 baselines red on tip — same as story-3)*

---

## Out of scope (later)

- Split `extraction.service.spec.ts` / `match-engine.spec.ts` (P2)
- Message-send pipeline collaborator extraction (P3)
- Kill remaining `forwardRef` module cycles
