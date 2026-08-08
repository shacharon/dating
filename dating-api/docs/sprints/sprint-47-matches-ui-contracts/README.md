# Sprint 47 — Matches UI Contracts (Berlin) (P1)

**Status:** In Progress (Story 01 Done)  
**Depends on:** Sprint 45 Done (DTO boundary) · Sprint 46 recommended (stable policy) · Sprint 38.3 Done  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repos:** `dating-ui` primary; `dating-api` only if contract enum/shared types need a tiny additive change  
**Agent 4:** Skip (UI); use browser / RQ smoke in agent 1–2 as needed

---

## Goal

Align the UI with the post-refactor API edge:

1. Stable view-model layer over `me-matches-api` / `me-profile-api` (stop treating engine JSON as UI domain)
2. Matches infinite list → React Query (same idiom as conversations)
3. Chip-evidence keys → stable enum / contract (kill English label string coupling)

**Non-goals:** Redesigning match browse visuals for product reasons; Option B folder layout; changing ranking.

---

## Stories

| # | Story | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 01 | [UI match view-models](./STORY_01_ui_match_view_models.md) | P1 | 1.5–2d | **Done** |
| 02 | [Matches list React Query](./STORY_02_matches_react_query.md) | P1 | 1–1.5d | Planned |
| 03 | [Chip-evidence enum contract](./STORY_03_chip_evidence_enum.md) | P1 | 1d | Planned |

**Order:** 01 → 02 → 03.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Components | Prefer view-models; raw engine fields not scattered |
| Pagination | One RQ idiom for conversations + matches |
| Chip evidence | Enum/stable keys; no hardcoded English API keys in UI |
| Regression | Matches browse + detail smoke green |

---

## Roadmap

| Next | Focus |
|------|--------|
| **48+ (optional)** | Option B domain/application/infrastructure polish on API |
