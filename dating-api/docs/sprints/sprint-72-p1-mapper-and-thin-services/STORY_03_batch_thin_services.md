# Story 03 — Batch Thin Services (200–348 LOC)

**Sprint:** 72  
**Effort:** 2–3 days  
**Risk:** ⚡ LOW  
**Status:** Done

**Handoffs:** [preflight](./handoffs/STORY_03_batch_thin_services/agent--1-preflight.md) · [architect](./handoffs/STORY_03_batch_thin_services/agent-0-architect.md) · [dev](./handoffs/STORY_03_batch_thin_services/agent-1-dev.md) · [CR](./handoffs/STORY_03_batch_thin_services/agent-2-cr.md) · [PM](./handoffs/STORY_03_batch_thin_services/agent-3-pm.md)

---

## Candidates (pick top pain only)

| Service | ~LOC | Suggested extract |
|---------|------|-------------------|
| `extraction.service.ts` | 348 | Already collaborators — peel telemetry if still mixed |
| `admin-match-quality.service.ts` | 348 | Query vs export |
| `me-profile-analysis.service.ts` | 343 | Submit vs fetch |
| `photo-moderation.service.ts` | 341 | Queue vs webhook |
| `messaging-socket-registry.service.ts` | 328 | Presence vs session map |
| `me-conversation-messages.service.ts` | 305 | Send vs list |

**Rule:** Only split if a file still has ≥2 clear reasons to change. Cap facade ≤200 LOC.

Document **accept list** for anything left intentional.

---

## In scope (thinned)

| Facade | Collaborators | Facade LOC |
|--------|---------------|------------|
| `MeConversationMessagesService` | list / send / fanout | 36 |
| `AdminMatchQualityService` | metrics-query / candidate-audit (+ export on facade) | 94 |
| `PhotoModerationService` | decision / apply (+ `processPendingPhoto` on facade) | 128 |

Accept list: [ACCEPT_LIST_STORY_03.md](./ACCEPT_LIST_STORY_03.md) — extraction, messaging-socket-registry, me-profile-analysis.

---

## Success

- [x] No in-scope service >250 LOC without accept note (send max **205**; facades ≤200)
- [x] Tests green (Agent 2: **11** suites / **104** tests incl. policy + wiring)

---

## Shipped

`feature/sprint-72-story-3` @ `fae3fff`

- `628ce76` — refactor: batch-thin conversation, match-quality, and photo moderation services
- `fae3fff` — test: add LOC policy specs for sprint 72 story 3 thinned services

**Shipped on main:** _(filled after merge)_  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** Edits hit ≤205 LOC modules instead of 305–348 LOC monoliths for the three in-scope families.

---

## SOLID / KISS

- **SRP:** list ≠ send ≠ fanout; metrics ≠ audit; decide ≠ apply.
- **KISS:** Move-only; public facades unchanged; Nest tokens preserved.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
