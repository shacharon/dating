# Handoff: Agent 0 — Architect — Sprint 42 Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_opener_ui.md](../../STORY_02_opener_ui.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code.** Primarily `dating-ui`. **Skip Agent 4.**

---

## Summary

- Show `suggestedOpener` on **HIGH** `MatchBrowseCard` only (hide when null). Do **not** put openers on compact `MatchListItem` / hard-blocked trail.
- Browse has **no** `conversationId` — reject story sketch that navigates with list `conversationId`.
- Prefill lock: composer accepts `?starter=` **and** a small **sessionStorage** handoff so Like → mutual → “Send message” can prefill without inventing a list conversation id.
- Style with existing **emerald / zinc** HIGH language — **reject** story’s indigo/purple card CSS.
- Analytics via existing `emitProductLog` (same pattern as `match.card_viewed`). Backend `used`/`edited` columns stay Story 3.

---

## Baseline facts (verified)

| Fact | Detail |
|------|--------|
| API | `MeMatchItemDto.suggestedOpener: string \| null` — HIGH only; null otherwise |
| UI types | `dating-ui/src/lib/me-matches-api.ts` — **missing** `suggestedOpener` |
| Browse card | `match-browse-card.tsx` — photo → oneLiner → Why → Like/Pass → view profile; `isHigh` already |
| Composer | `conversation-message-composer.tsx` — `useState('')` only; no initial draft |
| Conversation page | `conversations/[id]/page.tsx` — no `useSearchParams` |
| Like → mutual | Action DTO `conversationId`; celebration modal → `/dating/conversations/{id}` |
| Analytics | `emitProductLog` + `meta.event` (e.g. `match.card_viewed`) |
| i18n | `matches.list.browse` — no opener strings yet (en/he/es) |

---

## Decision 1 — Where to display (locked)

| Surface | Behavior |
|---------|----------|
| `MatchBrowseCard` | If `resolvePriorityTier(m) === 'HIGH'` **and** `m.suggestedOpener?.trim()` → show opener block |
| GOOD / OTHER / hard-blocked / empty opener | **No** opener UI |
| `MatchListItem` | **No** opener |
| Match detail (`me-matches/[id]`) | **Optional nice-to-have:** same block if list field is also on detail later — **out of scope** unless Agent 1 already has opener on detail DTO (it does not). Stay browse-only. |

**Placement in card:** Below Why section (or below one-liner if Why collapsed), **above** Like/Pass. One block — not a second card.

**Component:** Prefer small `MatchOpenerSection` next to `MatchWhySection` for testability.

---

## Decision 2 — “Use this opener” without list `conversationId` (locked)

Story draft assumes `match.conversationId` on browse — **false**. Lock this flow instead:

### Storage helper (new small util)

```ts
// dating-ui/src/lib/conversation-opener-draft.ts
export const OPENER_DRAFT_STORAGE_KEY = 'dating.openerDraft';

export type OpenerDraftPayload = {
  matchProfileId: string;
  opener: string;
  savedAt: number; // Date.now()
};

export function saveOpenerDraft(payload: OpenerDraftPayload): void;
export function readOpenerDraft(): OpenerDraftPayload | null;
export function clearOpenerDraft(): void;
```

- TTL soft rule: ignore draft if `savedAt` older than **30 minutes**.
- No PII beyond opener text + profile id (already known to the user).

### CTA behavior on browse

| Viewer state | Button | Behavior |
|--------------|--------|----------|
| Has opener, not yet liked (`yourAction` null/PASS) | **“Like & use opener”** (i18n) | `saveOpenerDraft` → trigger same Like path as Like button (`useMatchActions`). On mutual → celebration; **Send message** navigates with starter (below). If like succeeds but **not** mutual → keep draft; show existing “you liked” UX (opener waiting until mutual). |
| Has opener, already `yourAction === 'LIKE'`, not mutual | **“Saved for when you match”** disabled helper **or** secondary text only (no fake chat nav) | Draft still saved if they tap a softer “Save opener” — **Lock:** keep button as disabled with helper copy; draft saved on first Like&use. |
| Mutual already (only if Agent 1 later exposes conversationId — **not on list today**) | N/A on browse | Detail celebration / “View conversation” already exists; browse won’t know `conversationId` until action response |

**Do not** navigate to `/dating/conversations/...` without a real `conversationId`.

### Celebration → conversation handoff

Extend mutual celebration navigation (list + detail):

1. Before `router.push`, `readOpenerDraft()`.
2. If draft `matchProfileId` matches the celebrated match →  
   `router.push(\`/dating/conversations/${conversationId}?starter=${encodeURIComponent(draft.opener)}\`)`  
   then `clearOpenerDraft()` **after** composer applies (or clear on navigate and rely on URL only for that hop).
3. If no matching draft → existing push without query.

`onMutualMatch` / celebration context must carry **`matchProfileId`** (already available as `matchId` on list page) so draft matching works.

### Detail page Like with opener

Detail has no `suggestedOpener` in Story 1. **Out of scope** unless cheap later. Browse is the Story 2 surface.

---

## Decision 3 — Composer prefill (locked)

**Primary:** URL query `starter` (story lock).

```ts
// ConversationMessageComposer
initialDraft?: string; // applied once on mount
```

Conversation detail client:

1. `const starter = searchParams.get('starter')`
2. If present and non-empty after decode → pass as `initialDraft`
3. `router.replace` same path **without** `starter` after apply (avoid re-prefill on refresh / share leakage)
4. Draft remains **fully editable**; send unchanged path

**Also accept sessionStorage** only as backup if URL missing but draft’s `matchProfileId` was just celebrated — prefer URL for the hop so refresh still works once.

**Reject** putting opener only in React context (lost on full navigation).

Encoding: `encodeURIComponent` / `decodeURIComponent`; quotes/emoji OK. Cap apply length to `MAX_MESSAGE_TEXT_LENGTH` (trim if needed).

---

## Decision 4 — Types + i18n (locked)

### UI DTO

```ts
// me-matches-api.ts MeMatchItemDto
/** Sprint 42 — HIGH only; null/omit when absent. */
suggestedOpener?: string | null;
```

### Copy keys (en + he + es + types)

Under `matches.list.browse`:

| Key | EN intent |
|-----|-----------|
| `openerHeading` | “Try this” |
| `useOpener` | “Like & use opener” |
| `openerWaiting` | “Opener ready when you match” |
| `useOpenerAria` | Accessible name including nickname/opener truncated |

No emoji required in copy (story’s 💬 optional; prefer text for a11y/i18n).

---

## Decision 5 — Visual design (locked)

| Item | Lock |
|------|------|
| Accent | Emerald aligned with HIGH (`emerald-50` / `emerald-800` / dark variants) — **not** indigo/purple from story CSS |
| Layout | Subtle inset panel: border / tinted bg, no heavy dual shadows, no glow |
| Typography | Same card font scale; opener body `text-sm`; heading `text-xs font-semibold` |
| Mobile | Always visible when present (not collapsible v1) — story “collapsible if tight” deferred |
| Dark mode | Zinc/emerald dark tokens consistent with Why chips |

---

## Decision 6 — Analytics (locked)

Use `emitProductLog` (client). **Do not** invent new analytics backend in Story 2. Story 3 may wire DB `used`/`edited`.

| `meta.event` | When | Meta |
|--------------|------|------|
| `conversation.opener_displayed` | Opener section mounts / first visible | `matchProfileId`, `openerLength`, `priorityScore` |
| `conversation.opener_used` | User taps Like & use opener | `matchProfileId`, `openerLength` |
| `conversation.opener_prefilled` | Composer applies starter | `conversationId`, `openerLength` |

Optional Story 3 prep (nice-to-have, not required): on successful send, if draft matched original starter → log `wasEdited` boolean — **defer** if composer plumbing is awkward.

---

## Decision 7 — API / schema

| Item | Lock |
|------|------|
| Prisma / migrations | **None** |
| New endpoints | **None** |
| Backend changes | **None** required (Story 1 enough) |
| Redis | unchanged |

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `dating-ui/src/lib/me-matches-api.ts` | `suggestedOpener` |
| `dating-ui/src/lib/conversation-opener-draft.ts` | sessionStorage helper |
| `dating-ui/src/app/dating/me-matches/match-opener-section.tsx` | new UI |
| `match-browse-card.tsx` | wire section + Like&use |
| `me-matches-page-client.tsx` / celebration nav | starter query on Send message |
| `conversation-message-composer.tsx` + conversations `[id]` | `initialDraft` / `?starter=` |
| `lib/i18n/{en,he,es,types}.ts` | browse opener strings |
| Specs | browse card HIGH/GOOD/empty; composer prefill; draft util |

---

## Decisions (do not reverse without discussion)

1. Browse-only opener UI on `MatchBrowseCard`; HIGH + non-null only.
2. No fake `conversationId` on list — Like&use + celebration `?starter=` handoff.
3. Prefill via `?starter=` + sessionStorage draft helper.
4. Emerald/zinc styling; no indigo story CSS.
5. Client `emitProductLog` events only; DB used/edited = Story 3.
6. Skip Agent 4.

---

## Runtime topology

N/A for sockets. REST list already returns `suggestedOpener`. Composer remains same-origin Next app → API send as today.

**Cookie / host:** unchanged. Celebration navigation stays in-app router.

---

## E2E verification

N/A for Agent 4.

Agent 1/2: Vitest for card visibility gates + composer initial draft; manual smoke on Agent 3.

---

## Tests / verification

- [ ] Unit/UI: Agent 1
- [ ] Result: not run (architect)
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network: Story 2 smoke on Agent 1/3 — list JSON has `suggestedOpener`; chat send still works with prefilled draft
- [ ] Socket: N/A

---

## Open questions / blockers

None for start. Live opener quality batch remains Story 1 follow-up / beta.

---

## Next agent

```text
--agent 1 sprint 42 story 2
```

**Notes for next agent:**

- Follow this handoff over the story’s `match.conversationId` + indigo CSS sketches.
- Reuse `useMatchActions` for Like&use — do not duplicate Like API.
- Clear `starter` from URL after apply.
- Do not mark ConversationStarterCache `used` (Story 3).
- Do not auto-run Agent 2.
