# Story 4: Feedback → audit drill-down

**Sprint:** 11  
**Status:** **Done** (engineering gate; operator staging smoke pending)  
**Depends on:** [Story 2](./STORY_02_admin_feedback_aggregates_api.md); `match-quality-audit.ts`

**Operator:** see `handoffs/STORY_04_feedback_audit_drilldown/agent-3-pm.md`.

---

## Why

Top negative candidates (Story 2–3) answer **who** gets thumbs down, not **why**. Operators need engine explainability (score, chips, guards) on the same screen to form hypotheses before changing the matcher.

---

## What

**As a** product owner  
**I want** to inspect why a suggested match received negative feedback  
**So that** I can approve or reject engine changes with evidence

### Acceptance criteria

- [x] **API** — `GET /api/v1/admin/match-quality/candidates/:profileId/audit`
  - Query: optional `viewerUserId` (if omitted, pick a recent negative feedback row’s viewer for that candidate)
  - Response: reuse `MatchQualityAuditReport` shape from `buildMatchQualityAuditJson` (score, explainability, recommendation, guards outcome)
  - Include: `{ feedbackSummary: { negativeCount, positiveCount, lastSentiment } }` for that candidate (windowed)
- [x] **Admin UI** — `/admin/match-quality/[profileId]`:
  - Feedback counts at top
  - Read-only audit panel: `matchScore`, top chips, `recommendation`, guard/score outcome
  - Link to open candidate in match detail **as admin** (optional new tab — dev/staging only if no impersonation)
- [x] **No alternate scoring** — audit must call `MeMatchesService.getById` path only (per existing audit module)
- [x] **Tests** — seeded negative feedback + profiles → audit returns scored or guard outcome; 404 if candidate unknown

### Out of scope (this story)

- User impersonation / “view as user” in prod
- Free-text feedback reasons
- Auto-labeling “bad match” in DB

---

## Technical notes (guidance, not prescriptive)

- Wire `buildMatchQualityAuditJson` from admin service; inject `MeMatchesService` + `PrismaService`.
- If viewer has no visible match to candidate (filtered), return `compare.outcome: guard` with reason — still useful for ops.

---

## Definition of done

- [x] PM can answer “why did users dislike this suggestion?” for a top-negative candidate without SQL (when audit available)
- [x] API + UI tests (operator staging smoke pending)

---

## Manual smoke

1. User A thumbs down candidate B on staging.
2. Admin opens drill-down for B → sees negative count ≥ 1 and audit JSON with score/chips.
3. Document one sentence hypothesis in weekly notes (example: “high score but lifestyle chip conflict”).

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| API | `GET /api/v1/admin/match-quality/candidates/:profileId/audit` |
| UI | `/admin/match-quality/[profileId]` drill-down |
| Engine | `buildMatchQualityAuditJson` (V1 `MeMatchesService.getById`) |
| Module | `AdminModule` → `MeProfileModule` |
| Docs | Runbook drill-down §, manual review template |

**Deploy:** API + UI — no migration. Gated staging + `ADMIN_USER_IDS`.

---

## Product action items (owner)

| Cadence | Action |
|---------|--------|
| Weekly ritual step 4 | **View audit** on top negatives (replaces CLI for most cases) |
| When audit unavailable | Use CLI hint on drill-down page or runbook script |
| Story 5 | Engine approval checklist uses drill-down evidence |

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| User impersonation | Out of scope — CLI / explicit `viewerUserId` |
| Free-text feedback reasons | Sprint 12+ |
| Raw JSON export on drill-down | **Addressed** — [Story 5 export](./STORY_05_engine_review_approval_workflow.md) |
