# Handoff: Agent 0 — Architect — Sprint 42 Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_opener_analytics.md](../../STORY_03_opener_analytics.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Both `dating-api` + `dating-ui`. **Skip Agent 4** (analytics only — not eligibility / preference / ranking).

---

## Summary

- **Extend** existing `ConversationStarterCache` for lifecycle fields — **reject** story draft’s `conversationId`-keyed `ConversationStarter` redesign (browse openers exist **before** MutualMatch).
- Persist **displayed / used / sent / edited / reply** on that cache row; weekly report = Prisma query (no admin dashboard UI).
- Frontend already emits product logs (`opener_displayed` / `opener_used` / `opener_prefilled`). Story 3 adds: (1) best-effort **lifecycle HTTP** for displayed/used DB rows, (2) **send attribution** + (3) **reply attribution** on message send — **never block** messaging on tracking failures.
- Privacy: **no message body** in `AnalyticsService` / product analytics properties; opener text stays only in the existing cache column (already generated/stored).

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| Cache table | `ConversationStarterCache` — unique on viewer/candidate **profile + eval IDs + promptVersion**; has `used`/`edited` booleans (Story 1 defaults; never written) |
| No MutualMatch FK | Intentional — Story 1/2 lock |
| Story 2 UI | HIGH browse opener; Like&use → sessionStorage draft → celebration `?starter=` → composer `initialDraft`; URL stripped after apply |
| Client logs | `emitProductLog` events already (Story 2) |
| Send API | `POST /me/conversations/:id/messages` body `{ text }` only (`SendConversationMessageDto`) |
| Send analytics | `MESSAGE_SENT` with `conversationIdHash` only — no opener flags |
| Reply path | Same `sendMessage` for both parties; no opener reply logic today |
| Profile model | `UserProfile`; conversation other user DTO already exposes `profileId` |
| Admin dashboard | None for product metrics; reports module is user-report ops — **out of scope** |

---

## Decision 1 — Storage model (locked)

**Keep** `ConversationStarterCache`. **Do not** create a second `conversation_starters` table keyed by `conversationId`.

### Additive Prisma fields

```prisma
model ConversationStarterCache {
  // ... existing unique key + opener + model + used + edited ...

  displayed             Boolean   @default(false)
  displayedAt           DateTime?
  usedAt                DateTime?
  sent                  Boolean   @default(false)
  sentAt                DateTime?
  /// Message that was sent from this opener (MutualMatch Message.id).
  sentMessageId         String?
  /// Set when sent (conversation = MutualMatch.id). Nullable until send.
  mutualMatchId         String?
  receivedReply         Boolean   @default(false)
  replyReceivedAt       DateTime?
  /// Whole minutes from sentAt → first reply.
  responseTimeMin       Int?

  @@index([sentMessageId])
  @@index([mutualMatchId])
  @@index([createdAt]) // already present
}
```

| Item | Lock |
|------|------|
| Migration | Additive only; defaults false/null; no backfill |
| `used` / `edited` | Keep existing columns; Story 3 **writes** them |
| Rollback | Drop new columns (or leave harmless defaults) |
| FK to Message / MutualMatch | **No** Prisma FK required (soft string ids — avoid cascade complexity) |

**Reject:** story sample service methods keyed only by `conversationId` for displayed/used (no row until mutual).

---

## Decision 2 — What each metric means (locked)

| Metric | Definition (v1) |
|--------|-----------------|
| **Generated** | Rows in `ConversationStarterCache` (`createdAt` in window) — LLM upserts only (fallback/null never persisted — Story 1) |
| **Displayed** | Client saw opener on browse card → lifecycle `displayed` (first time only) |
| **Used** | User tapped **Like & use opener** → lifecycle `used` (first time); also set on send if somehow missing |
| **Sent** | First message in a mutual conversation attributed to this opener via send metadata |
| **Edited** | `normalize(sentText) !== normalize(originalOpener)` at send time |
| **Replied** | Other participant sends a message **after** `sentMessageId`, and that prior message is still the latest from the opener sender when reply arrives (see Decision 5) |

**Denomators for rates:**

- usageRate = used / displayed (if displayed=0 → null)
- editRate = edited / sent (among sent; story “edited/used” is noisier — lock **edited/sent**)
- sendRate = sent / used
- responseRate = receivedReply / sent

**Out of scope v1:** automated “manual baseline” response rate / lift (ops may compute offline). Report opener rates only; document lift as optional follow-up.

**Out of scope:** Levenshtein `editDistance`.

---

## Decision 3 — Module / service layout (locked)

Stay under conversation-starter (not a new top-level `src/analytics/opener-*` god service):

```text
src/matches/conversation-starter/
  opener-tracking.service.ts          # NEW injectable
  opener-tracking.service.spec.ts
  opener-tracking-normalize.ts        # pure: normalize for edit compare
  opener-tracking-report.ts           # pure: rates from row aggregates
  opener-tracking-report.spec.ts
  # extend cache service with markDisplayed / markUsed / markSent / markReply helpers
  # OR keep marks only on OpenerTrackingService using prisma directly
```

Register in same Nest module as `ConversationStarterCacheService`.

**Weekly report:** `OpenerTrackingService.getWeeklyReport(asOf?: Date)` returning plain numbers + rates. **No** admin HTTP UI in Story 3. Optional: document SQL in `docs/sprints/sprint-42-conversation-intelligence/OPENER_WEEKLY_REPORT.md` (Agent 1 or 3).

---

## Decision 4 — Frontend + lifecycle HTTP (locked)

### New endpoint (best-effort)

```http
POST /api/v1/me/matches/:candidateProfileId/opener-lifecycle
Body: { "event": "displayed" | "used" }
→ 204 No Content
```

| Rule | Lock |
|------|------|
| Auth | Session user; resolve **viewer** `UserProfile.id` from session |
| Row resolve | Latest `ConversationStarterCache` for `(viewerProfileId, candidateProfileId, promptVersion=CONVERSATION_STARTER_PROMPT_VERSION)` by `createdAt desc` |
| Idempotent | `displayed` / `used`: set once (if already true, no-op) |
| Missing row | **204 anyway** (no error UX) — opener may be fallback-null or cache miss |
| Failures | Catch + obs.trace; still 204 — never fail the browse card |
| Side analytics | Optional `AnalyticsService.track` with `opener.displayed` / `opener.used` — properties: `candidateProfileId` **hash or raw?** → use **raw profile id is already known to user**; prefer **no PII growth** — properties: `event` only + `openerLength` if known from row. **Do not** put opener text in analytics properties. |

Wire UI:

| Event | When |
|-------|------|
| `displayed` | `MatchOpenerSection` mount (same place as `emitProductLog` opener_displayed) — fire-and-forget `fetch`, ignore errors |
| `used` | `handleLikeAndUseOpener` after `saveOpenerDraft` — fire-and-forget |

Keep existing `emitProductLog` events (dual signal: browser product log + DB).

### Send attribution (locked)

Extend DTO:

```ts
// SendConversationMessageDto
text: string;
/** Optional — attribution only; omit for normal messages */
openerAttribution?: {
  /** Exact suggested opener that was prefilled (from ?starter= / baseline ref) */
  originalOpener: string; // MaxLength 200
};
```

UI:

1. Conversation page keeps `openerBaselineRef` / state from `starterFromUrl` **before** strip (Story 2 currently strips — **must retain in memory** for this send).
2. On successful send of the **first** message that still “counts” as opener send: pass `openerAttribution` when `openerBaseline` is set and this send is the first outbound after prefill (lock: **pass attribution whenever baseline is set and message is sent while baseline still held**; clear baseline after first attributed send **or** after user clears draft entirely — prefer **clear baseline after first successful send** so later messages aren’t tagged).
3. `sendConversationMessage(id, text, opts?)` + hook plumbing.

Server `sendMessage`:

1. Create message as today.
2. `void trackOpenerSentBestEffort(...)` — never await in a way that fails the HTTP response; prefer try/catch after create, still return 201.
3. Compare normalized texts → `edited`.
4. Resolve cache row: viewer=sender profile, candidate=other profile, promptVersion current; prefer match `opener === originalOpener` else latest for pair.
5. Update: `used` (if not set), `sent`, `sentAt`, `edited`, `sentMessageId`, `mutualMatchId`.
6. Extend `MESSAGE_SENT` analytics properties: `wasOpenerPrefill: true/false`, `wasOpenerEdited: true/false` (booleans only).

---

## Decision 5 — Reply attribution (locked)

Inside same `sendMessage` after create (best-effort):

1. Load recent messages in conversation (e.g. last 20 by `createdAt desc`) **excluding** the just-created id, or query before create — either OK if consistent.
2. Find the latest message from the **other** user (`senderId !== sessionUserId`).
3. Look up `ConversationStarterCache` where `sentMessageId = thatMessage.id` and `receivedReply = false`.
4. If found: set `receivedReply`, `replyReceivedAt`, `responseTimeMin = floor((now - sentAt) / 60000)`.

| Edge | Lock |
|------|------|
| Opener sender sends second message before reply | Reply still links to `sentMessageId` when other party eventually replies (OK) |
| Other party already messaged first (opener never sent) | No cache hit — no-op |
| Unmatch / missing sentAt | Skip or responseTimeMin null |

**Do not** scan for “first message in thread” heuristics beyond `sentMessageId`.

---

## Decision 6 — Privacy (locked)

| Surface | Allowed | Forbidden |
|---------|---------|-----------|
| DB `ConversationStarterCache.opener` | Already stored LLM opener | N/A |
| Analytics / structured product logs | Booleans, lengths, hashed conversation id, profile ids already used elsewhere | **Full message text**, full opener text in analytics properties |
| Lifecycle HTTP body | `event` enum only | Opener text |
| Send body `originalOpener` | Needed for edit detect + row match; max 200 | Do not re-log to analytics |

CR checklist must verify no `text` / opener string in `AnalyticsService.track` properties.

---

## Decision 7 — Weekly report + decision framework (locked)

```ts
type OpenerWeeklyReport = {
  windowDays: 7;
  generated: number;
  displayed: number;
  used: number;
  sent: number;
  edited: number;       // among sent where edited=true
  replied: number;
  usageRate: number | null;
  editRate: number | null;   // edited/sent
  sendRate: number | null;   // sent/used
  responseRate: number | null;
  avgResponseTimeMin: number | null;
};
```

Story decision thresholds (product, not code gates):

| Metric | Kill | Caution | Success |
|--------|------|---------|---------|
| Usage rate | &lt;20% | 20–40% | &gt;40% |
| Send rate | &lt;60% | 60–80% | &gt;80% |
| Response rate | &lt;40% | 40–60% | &gt;60% |

Kill/expand criteria stay documentation for PM — **no feature flag auto-kill** in Story 3.

---

## Decision 8 — Out of scope (locked)

- Admin / user-facing dashboard UI
- A/B opener variants, regenerate, cost-per-opener
- NLP reply quality
- Expanding openers to GOOD (Sprint 43 / metrics-driven)
- Changing Story 2 Like&use / `?starter=` UX beyond attribution plumbing
- Agent 4 E2E eligibility suite

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `prisma/schema.prisma` + migration | Additive lifecycle columns + indexes |
| `opener-tracking.service.ts` (+ specs) | mark displayed/used/sent/reply; weekly report |
| `me-profile.controller.ts` | `POST matches/:id/opener-lifecycle` |
| `me-conversation-messages.dto.ts` + service | `openerAttribution`; best-effort track sent + reply |
| `product-analytics.events.ts` | optional `opener.displayed` / `opener.used`; MESSAGE_SENT props |
| `dating-ui` conversations API + hook + page | baseline retain; send attribution; lifecycle fetch |
| `match-opener-section` / browse card | fire displayed/used lifecycle |
| `OPENER_WEEKLY_REPORT.md` (optional) | SQL + markdown template |

---

## Decisions (do not reverse without discussion)

1. Extend `ConversationStarterCache` — no conversationId-primary redesign.
2. Tracking must never fail message send / Like / browse.
3. No message/opener text in analytics properties.
4. Reply only via `sentMessageId`.
5. Weekly report = service query + doc; no dashboard UI.
6. Skip Agent 4.

---

## Runtime topology

| Concern | Lock |
|---------|------|
| Sockets | Unchanged; reply tracking on REST send path covers WS-originated sends if they share `sendMessage` |
| Cookies / host | Unchanged |
| Redis list cache | Unchanged (lifecycle fields not on list DTO) |

---

## E2E verification

N/A for Agent 4.

Agent 1/2: unit tests for tracking + DTO; Agent 3: small manual or scripted lifecycle scenario + weekly report sample.

---

## Tests / verification

- [ ] Unit: Agent 1
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: required for new columns
- [ ] Browser Network: Agent 3 — lifecycle 204s; send with `openerAttribution`; DB row fields
- [ ] Socket: N/A (unless send path differs — verify REST only is enough)

---

## Open questions / blockers

None for start. Live opener quality batch remains beta (Stories 1–2 deferred).

---

## Next agent

```text
--agent 1 sprint 42 story 3
```

**Notes for next agent:**

- Follow this handoff over the story’s `conversationId`-keyed sketches and indigo-era samples.
- Retain Story 2 `?starter=` baseline in memory after URL strip.
- Best-effort everywhere; 204 on lifecycle miss.
- Do not mark ConversationStarterCache on every list attach as “displayed” (that overcounts).
- Do not auto-run Agent 2.
