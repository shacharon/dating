# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_match_feedback.md](../../STORY_04_match_feedback.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Store-only quality signal** — thumbs up/down on **match detail only**; no engine / ranking changes.
- **Schema** — new `MatchFeedback` table; unique `(userId, matchProfileId)`; upsert on sentiment change.
- **API** — `GET` + `PUT /api/v1/me/matches/:id/feedback`; visibility via existing `assertMatchCandidateVisible` (includes Story 5 photo gates).
- **UI** — subtle prompt below takeaway/chips on `/dating/me-matches/[id]`; thanks state after submit.
- **Analytics** — `match.feedback` with `{ sentiment }` only (profile ids in envelope, not properties).
- **i18n** — en + es under `launch.matchDetail.feedback`.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — schema** | |
| `dating-api/prisma/schema.prisma` | `MatchFeedbackSentiment` enum; `MatchFeedback` model; relations on `User`, `UserProfile` |
| `dating-api/prisma/migrations/*_match_feedback/migration.sql` | create table + indexes |
| **API — feedback** | |
| `dating-api/src/me-profile/me-match-feedback.service.ts` | **created** — get + upsert |
| `dating-api/src/me-profile/me-match-feedback.dto.ts` | **created** — request/response DTOs |
| `dating-api/src/me-profile/me-match-feedback.service.spec.ts` | **created** — unit tests |
| `dating-api/src/me-profile/me-profile.controller.ts` | `GET/PUT matches/:id/feedback` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | HTTP auth, upsert, self-blocked, visibility |
| `dating-api/src/me-profile/me-profile.module.ts` | register service |
| `dating-api/src/me-account/me-account.service.ts` | `matchFeedback.deleteMany` on account deletion (mirror `matchAction`) |
| `dating-api/src/me-account/me-account.service.spec.ts` | assert deleteMany called |
| **API — observability** | |
| `dating-api/src/analytics/product-analytics.events.ts` | `MATCH_FEEDBACK: 'match.feedback'` |
| `dating-api/src/logging/error-codes.ts` | `MATCH_FEEDBACK_UPSERTED` |
| **UI** | |
| `dating-ui/src/lib/me-profile-api.ts` | `fetchMatchFeedback`, `upsertMatchFeedback` |
| `dating-ui/src/lib/me-profile-api.spec.ts` | parse/submit types |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | feedback prompt + thumbs + thanks |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | submit + thanks tests |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `launch.matchDetail.feedback.*` |
| **Docs** | |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | `match.feedback` row |

**No changes required:**

- `MeMatchesService` scoring / list logic
- Admin surfaces
- `MeProfileMatchesService`

**Note:** Sprint README table says “POST feedback” — **correct verb is PUT** (story AC + upsert semantics).

---

## Decisions (do not reverse without discussion)

### 1. HTTP verbs — PUT upsert + GET read (not POST)

| Approach | Verdict |
|----------|---------|
| `POST` create only | **Rejected** — AC specifies PUT; duplicates awkward |
| Embed feedback in `GET matches/:id` detail DTO | **Rejected** — bloats V1 contract; extra fetch is cheap |
| **`GET` + `PUT /api/v1/me/matches/:id/feedback`** | **Chosen** — mirrors `matches/:id/actions` pattern |

**Locked routes** (Nest: register near existing `matches/:id/actions` routes):

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/v1/me/matches/:id/feedback` | **200** `{ sentiment: 'POSITIVE' \| 'NEGATIVE' \| null }` |
| `PUT` | `/api/v1/me/matches/:id/feedback` | **200** body below |

`:id` = candidate `UserProfile.id` (same as actions/detail).

---

### 2. Schema — `MatchFeedback`

```prisma
enum MatchFeedbackSentiment {
  POSITIVE
  NEGATIVE
}

model MatchFeedback {
  id             String                 @id @default(cuid())
  userId         String
  user           User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  matchProfileId String
  matchProfile   UserProfile            @relation(fields: [matchProfileId], references: [id], onDelete: Cascade)
  sentiment      MatchFeedbackSentiment
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  @@unique([userId, matchProfileId])
  @@index([userId, createdAt])
  @@index([matchProfileId])
}
```

Add to `User`: `matchFeedbacks MatchFeedback[]`  
Add to `UserProfile`: `matchFeedbacksReceived MatchFeedback[]`

Migration: standard `CREATE TABLE` + unique index. No backfill.

---

### 3. PUT body + response

**Request** (JSON, validated via `MeProfileValidationPipe`):

```typescript
{ sentiment: 'positive' | 'negative' }  // lowercase in API wire format
```

Map to `MatchFeedbackSentiment.POSITIVE` | `NEGATIVE` in service.

**Response 200:**

```typescript
{
  matchProfileId: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';  // enum wire format (match actions style)
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
}
```

**Errors:**

| Case | Code | Body |
|------|------|------|
| Unauthenticated | 401 | auth |
| Candidate not visible | 404 | `Match not found.` (same as actions) |
| Self feedback (`targetUserId === actorUserId`) | 400 | `{ error: 'cannot_feedback_self' }` |
| Invalid sentiment | 400 | validation |

---

### 4. Visibility + self check — reuse match actions policy

```typescript
const { candidateProfileId, targetUserId } =
  await this.meMatches.assertMatchCandidateVisible(actorUserId, candidateProfileId);

if (targetUserId === actorUserId) {
  throw new BadRequestException({ error: 'cannot_feedback_self' });
}
```

Uses Story 5 candidate photo gate + gender eligibility + block check. **No separate HG check** (same as `MeMatchActionsService`).

---

### 5. Upsert semantics — no clear/toggle-off in v1

Story AC: “second click same button clears optional.” **Locked for v1: no clear.**

| User action | Behavior |
|-------------|----------|
| First thumbs up | upsert `POSITIVE` |
| Switch to thumbs down | upsert `NEGATIVE` (same row) |
| Repeat same thumb | idempotent upsert **200** (no DELETE) |

No `DELETE` endpoint in v1. Follow-up if product wants “undo feedback.”

---

### 6. Analytics + structured log

**Product analytics** (on every successful PUT, including idempotent re-PUT):

```typescript
this.analytics.track(userId, ProductAnalyticsEvents.MATCH_FEEDBACK, {
  sentiment: 'positive' | 'negative',  // lowercase — mirrors match.action
});
```

**PII:** `matchProfileId` **not** in `properties` — only `userId` in analytics envelope. Ops can join via DB.

**Structured trace** (optional, no free text):

```text
event=match_feedback_upserted userId=... matchProfileId=... sentiment=POSITIVE|NEGATIVE
```

Use `ErrorCodes.MATCH_FEEDBACK_UPSERTED`.

---

### 7. Account deletion — cascade cleanup

Mirror `matchAction.deleteMany` in `MeAccountService.deleteAccount`:

```typescript
await tx.matchFeedback.deleteMany({ where: { userId } });
```

Also delete feedback **about** deleted user's profile if profile teardown runs — if profile row removed via cascade from user, `matchProfileId` FK cascade handles feedback on candidate profile. Verify account deletion path deletes profile and/or add explicit `deleteMany({ where: { matchProfileId: profile.id } })` if profile deleted in same transaction.

---

### 8. UI placement + behavior

**Location:** `/dating/me-matches/[id]/page.tsx` — insert **after** `match-detail-chips` (or after takeaway when no chips), **before** match score / “Why you match”. Do **not** place in footer near Like/Pass.

**Layout:**

```text
[ takeaway ]
[ chips ]
→ [ feedback prompt + thumbs ]     ← NEW
[ score ]
[ traits / about / footer CTAs ]
```

**Load:** parallel with existing fetches:

```typescript
Promise.all([fetchMyMatchById(id), fetchMatchAction(id), fetchMatchFeedback(id)])
```

**Interaction:**

1. Prompt: i18n `launch.matchDetail.feedback.prompt` — “Was this a helpful suggestion?”
2. Two icon buttons (thumbs up / down) with accessible labels.
3. On successful PUT → show thanks (`launch.matchDetail.feedback.thanks`) with `role="status"`.
4. Highlight selected thumb (aria-pressed).
5. Switching thumb → new PUT + keep thanks visible.

**testids:** `match-feedback`, `match-feedback-positive`, `match-feedback-negative`, `match-feedback-thanks`

**Styling:** subtle border section (zinc/emerald accent on selected); do not compete with Like/Pass emerald buttons in footer.

---

### 9. i18n keys

```typescript
// launch.matchDetail.feedback
prompt: string;
thanks: string;
positiveLabel: string;   // a11y
negativeLabel: string;   // a11y
```

Provide en + es translations.

---

### 10. Service signatures

```typescript
@Injectable()
export class MeMatchFeedbackService {
  getFeedback(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<MatchFeedbackStateDto>;

  upsertFeedback(
    actorUserId: string,
    candidateProfileId: string,
    sentiment: 'positive' | 'negative',
  ): Promise<MatchFeedbackDto>;
}
```

DTOs in `me-match-feedback.dto.ts`:

```typescript
export class UpsertMatchFeedbackDto {
  @IsIn(['positive', 'negative'])
  sentiment!: 'positive' | 'negative';
}

export interface MatchFeedbackStateDto {
  sentiment: 'POSITIVE' | 'NEGATIVE' | null;
}

export interface MatchFeedbackDto {
  matchProfileId: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  createdAt: string;
  updatedAt: string;
}
```

---

## Runtime topology

| Concern | Value |
|---------|--------|
| Auth | Session cookie (`AuthGuard` on controller) |
| Visibility | `MeMatchesService.assertMatchCandidateVisible` |
| Engine | **Unchanged** |
| Socket | N/A |
| Expected Network tab | `GET .../feedback` → 200; `PUT .../feedback` → 200 |

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-api
npx prisma migrate deploy
npm test

cd ../dating-ui
npm test
npm run build
```

### Scenarios (must pass)

**API**

- [ ] `GET/PUT` without session → **401**
- [ ] `PUT` with invisible candidate → **404**
- [ ] `PUT` on self profile id → **400** `cannot_feedback_self`
- [ ] `PUT` positive → **200**; `GET` → `POSITIVE`
- [ ] `PUT` negative → **200**; same row updated (`updatedAt` changes)
- [ ] Repeat same sentiment → **200** idempotent
- [ ] Analytics `match.feedback` fired with `{ sentiment }` only
- [ ] Account deletion removes user's feedback rows

**UI**

- [ ] Page loads feedback state; selected thumb reflected
- [ ] Click thumbs up → PUT + thanks message
- [ ] Switch to thumbs down → single updated state
- [ ] i18n keys used (not hardcoded English in component)

Manual smoke (operator): story manual smoke section.

---

## Docs updates (agent 1)

Add to `PRODUCT_FUNNEL.md`:

| Event | When | Properties |
|-------|------|------------|
| `match.feedback` | Successful PUT feedback | `sentiment` (`positive` \| `negative`) |

Optional one-line in `DATA_RETENTION.md` § user data — feedback rows deleted on account deletion (no export in v1).

---

## Open questions / blockers

- None.

**Follow-up (not this story):** feedback clear/undo; ranking consumption; admin aggregates; optional chips (“why not helpful?”).

---

## Next agent

```text
--agent 1 sprint 10 story 4
```

**Notes for dev:**

1. Run migration before integration tests.
2. Register feedback routes **after** static segments if any conflict — same pattern as `actions`.
3. Wire `MeMatchFeedbackService` in `MeProfileModule` only (no new top-level module).
4. Extend account deletion transaction — do not skip.
5. UI: fetch feedback in parallel with detail + actions; place section mid-page per §8.
6. Fix sprint README “POST feedback” → PUT when touching docs (optional in same PR).
