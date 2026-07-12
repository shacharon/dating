# Story 4: Match feedback

**Sprint:** 10  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** —

---

## Why

Users see compatibility chips and takeaways but cannot tell the product whether a suggestion was helpful. Lightweight feedback creates a **quality signal** for future ranking work without changing the engine this sprint.

---

## What

**As a** user  
**I want** to say whether a match suggestion was good  
**So that** the product can improve over time

### Acceptance criteria

- [x] **Data model** — `MatchFeedback`:
  - `userId` (viewer), `matchProfileId` (candidate profile id)
  - `sentiment`: `POSITIVE` | `NEGATIVE`
  - `createdAt`, `updatedAt`
  - unique per `(userId, matchProfileId)` — upsert on change
- [x] **API** — `PUT /api/v1/me/matches/:profileId/feedback` body `{ sentiment: 'positive' | 'negative' }`
  - `GET .../feedback` returns current selection (`sentiment` or `null`)
  - Auth required; candidate must be visible in viewer's match universe (Story 5 photo gates)
  - Cannot feedback self → **400** `cannot_feedback_self`
- [x] **UI** — match detail page (`/dating/me-matches/[id]`):
  - Subtle prompt below takeaway/chips: "Was this a helpful suggestion?"
  - Thumbs up / thumbs down; selected thumb highlighted (`aria-pressed`)
  - Success state after submit: "Thanks for your feedback"
  - **v1:** no toggle-off / clear on repeat same thumb (architect lock)
- [x] **Analytics** — `match.feedback` with `{ sentiment }` (profile ids in envelope only)
- [x] **i18n** — en + es strings (`launch.matchDetail.feedback.*`)
- [x] **Tests** — API auth, upsert, self-feedback blocked, visibility 404; UI submits and shows thanks

### Out of scope (this story)

- Using feedback in ranking / re-scoring
- Free-text feedback comments
- Feedback on match list cards (detail only)
- Admin dashboard for feedback aggregates

---

## Technical notes (guidance, not prescriptive)

- Place UI after primary takeaway/chips — do not compete with Like/Pass CTAs.
- No engine changes: store-only + analytics.
- GET on feedback endpoint shows current selection (parallel fetch on detail load).

---

## Definition of done

- [x] Feedback persisted and logged
- [x] API + UI tests
- [x] PRODUCT_FUNNEL.md lists new event

---

## Manual smoke

1. Open match detail → tap thumbs up → thanks message
2. Change to thumbs down → single row updated
3. Structured log / analytics shows `match.feedback`

**Operator:** see `handoffs/STORY_04_match_feedback/agent-3-pm.md`.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Schema | `MatchFeedback` + migration `20260606240000_match_feedback` |
| API | `GET` + `PUT /api/v1/me/matches/:id/feedback`; visibility via `assertMatchCandidateVisible` |
| Account delete | `matchFeedback.deleteMany` (actor + profile rows) |
| Analytics | `match.feedback` event; structured trace `match_feedback_upserted` |
| UI | Mid-page thumbs on match detail; parallel fetch with detail + actions |
| i18n | en + es feedback copy |
| Docs | `PRODUCT_FUNNEL.md`, `DATA_RETENTION.md` |

**Deploy:** API + UI after `npx prisma migrate deploy`.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Weekly aggregate report for product | **Addressed** — [Sprint 11 Story 5 export](../sprint-11-match-quality-intelligence/STORY_05_engine_review_approval_workflow.md) + dashboard (Stories 2–3) |
| Engine analyze → approve → validate loop | [Sprint 11 Stories 4–6](../sprint-11-match-quality-intelligence/README.md) |
| Down-rank after repeated negative feedback | Sprint 12+ (after validation baseline) |
| "Why not helpful?" optional chips | UX polish |
| Toggle-off / undo feedback | v2 (architect deferred from v1) |
| Soft-fail if feedback GET errors while detail loads | UX polish |
