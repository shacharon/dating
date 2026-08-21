# Sprint 63 — Finish Round 3 Leftovers (P0/P1)

**Status:** Planned  
**Depends on:** Sprints 58–62 Done on main; **merge Sprint 57 first if enrichment still fat on main**  
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
| Enrichment-v2 | ~889 on main ⚠️ | Merge/verify Sprint 57 |
| Prisma injectors | ~10–12 (was 31) | Finish peel |
| `IMatchRepository` | God port | ISP split |
| Rate-limit twins | HTTP + WS duplicates | Shared module |
| `me-profile-http.integration.spec.ts` | ~6183 LOC | Split by route family |

---

## Stories

| # | Story | Effort | Risk | Status |
|---|-------|--------|------|--------|
| 01 | [Enrichment on main + hygiene](./STORY_01_enrichment_merge_hygiene.md) | 0.5–1 day | ⚡ LOW | Planned |
| 02 | [Split me-profile HTTP integration specs](./STORY_02_split_me_profile_http_specs.md) | 2–3 days | ⚠️ MEDIUM | Planned |
| 03 | [Finish Prisma peel](./STORY_03_finish_prisma_peel.md) | 2–3 days | ⚠️ MEDIUM | Planned |
| 04 | [Match repo ISP + shared rate-limit](./STORY_04_match_repo_isp_rate_limit.md) | 2–3 days | ⚠️ MEDIUM | Planned |

**Order:** 01 → 02 → 03 → 04 (02 can start in parallel with 01).

**Preferred merge tip:** `feature/sprint-63-story-4`

---

## Success criteria

- [ ] `enrichment-v2.ts` is thin facade on main (or documented freeze-only dump with keyword modules present)
- [ ] Me-profile HTTP integration suite split into ≤4 focused files (no single 6k LOC file)
- [ ] Prisma injectors in product me-profile path ≤ ~6 (analysis/feedback/account peeled or justified)
- [ ] Match repository split or Prisma types removed from port surface
- [ ] One shared rate-limit store factory; HTTP/WS are thin wrappers
- [ ] Specs green

---

## Out of scope (later)

- Split `extraction.service.spec.ts` / `match-engine.spec.ts` (P2)
- Message-send pipeline collaborator extraction (P3)
- Kill remaining `forwardRef` module cycles
