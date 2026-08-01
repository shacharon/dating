# Story 34.2 Frontend — Rich Content Moderation Errors (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 2 — Moderation error transparency (frontend phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** **ACCEPT** (frontend phase complete; Story 34.2 done)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for this phase only.  
**Prerequisite:** Backend phase **ACCEPT** (`5eb4137`) — rich 400 `details`.

---

## Goal

Show structured moderation feedback (field, flagged phrase, why, suggestion, example) on profile text save and message send — instead of a single flattened error string. Fix message **403 mute** mis-mapped as “no access.”

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Profile API | `me-profile-api.ts` flattens `content_moderation_failed` into `Error.message` (`field: suggestion` only) |
| Profile UI | `onboarding-texts-form.tsx` / `onboarding-basic-form.tsx` — red `<p role="alert">{saveError}</p>` |
| Message API | `conversations-api.ts` — 403 → “no access”; other errors → `body.message` only |
| Message UI | `use-conversation-messages` → `sendError` banner on thread page |
| Backend details | `source`, `flaggedText`, index/length, `reason`, `suggestion`, `exampleAlternative?`, message `muted?` |
| Soft-log | Expected profile failures already `trace` (keep) |

### AGENT_COMMANDS corrections (outdated — ignore these)

- ❌ Emoji in UI (⚠️ / 💡) — use text hierarchy + existing zinc/amber tokens  
- ❌ Link to `/content-guidelines` — **route does not exist**  
- ❌ Wrong field map (`aboutRelationship` ≠ “About my ideal partner”) — use existing onboarding labels  
- ❌ Textarea highlight overlay this story — **out of scope** (optional later)  
- ❌ Inventing `error.code` on thrown `Error` without a typed parse helper  

---

## Locked UX

### Visual

One reusable alert (amber, not red) for **policy** rejections — distinct from network/system red errors.

```
┌─────────────────────────────────────────────┐
│ We found an issue with your content         │  ← title (i18n)
│                                             │
│ Field: About my ideal partner               │  ← profile only
│ Flagged: "wanna fuck"                       │  ← quote flaggedText
│                                             │
│ Why: Direct sexual solicitation             │  ← API reason (EN from backend)
│                                             │
│ Suggestion                                  │
│ Describe connection or interests…           │  ← API suggestion
│ Example: Looking for someone adventurous… │  ← optional API example
└─────────────────────────────────────────────┘
```

| Surface | Title key idea | Extra |
|---------|----------------|--------|
| Profile texts | Issue with your profile text | Show **Field** when `details.field` present |
| Message send | Issue with your message | Show **Muted:** when `details.muted` present |
| `profile_edit_blocked` | Keep plain message (existing) — **not** the rich moderation card |
| `messaging_muted` 403 | Dedicated mute copy using `details.mutedUntil` if present; else API `message` — **not** “no access” |

### Interactions

- Dismiss / clear when user edits the relevant field or clicks optional dismiss control.  
- On profile: if `field` known, scroll/focus that textarea when error appears (nice-to-have; required: show field label).  
- Do **not** require Content Guidelines CTA.

---

## Locked parsing / types

### Shared module (preferred)

`dating-ui/src/lib/content-moderation-error.ts`

```typescript
export type ContentModerationDetails = {
  field?: 'aboutMe' | 'aboutPartner' | 'aboutRelationship' | string;
  category: string;
  source?: 'openai' | 'dating_blocklist' | 'dating_score' | string;
  flaggedText: string;
  flaggedTextIndex?: number;
  flaggedTextLength?: number;
  reason: string;
  suggestion: string;
  exampleAlternative?: string;
  muted?: string;
};

export class ContentModerationApiError extends Error {
  readonly code:
    | 'content_moderation_failed'
    | 'message_content_moderation_failed';
  readonly details: ContentModerationDetails;
  constructor(/* ... */) { /* message = details.suggestion or API message */ }
}

export function parseContentModerationErrorBody(
  status: number,
  bodyText: string,
): ContentModerationApiError | null;
```

- Return typed error when `error` is `content_moderation_failed` or `message_content_moderation_failed` and `details` has at least `category` + (`suggestion` or `reason`).  
- Require `flaggedText` when present on backend (always for new API); if missing, still show reason/suggestion without Flagged row.

### `me-profile-api.ts`

- On create/patch failure: if parse succeeds → **throw `ContentModerationApiError`**.  
- Else keep existing string `Error` paths (`profile_edit_blocked`, `nickname_taken`, generic).  
- Keep soft-log for expected codes.

### `conversations-api.ts` — `sendConversationMessage`

| Status | Behavior |
|--------|----------|
| 400 + moderation parse | throw `ContentModerationApiError` |
| 403 + `messaging_muted` | throw dedicated error or structured `MessagingMutedError` with message + `mutedUntil` |
| 403 other | keep “no access” |
| 429 / 404 | unchanged |
| other | prefer `body.message` |

---

## Locked UI components

### `ContentModerationErrorAlert` (new)

Path: `dating-ui/src/components/content-moderation-error-alert.tsx`  
(+ unit spec)

Props: `{ details: ContentModerationDetails; variant: 'profile' | 'message'; title: string; fieldLabel?: string | null; onDismiss?: () => void }`

Render rows only when data present: Field, Flagged, Why, Suggestion, Example, Muted.

No emoji. Amber border/bg consistent with existing product alerts; dark mode tokens.

### Wire

| File | Change |
|------|--------|
| `onboarding-texts-form.tsx` | Catch `ContentModerationApiError` → state; render alert; keep red string for other errors |
| `onboarding-basic-form.tsx` | Same catch if patch can return moderation (nickname rarely); at least don’t crash |
| `use-conversation-messages.ts` / thread page | Catch moderation error → structured state or store details on sendError union; render alert above composer |
| Field labels | Reuse `copy.onboarding.textsForm.aboutMeLabel` / `aboutPartnerLabel` / `aboutRelationshipLabel` |

### i18n (`en` / `he` / `es`)

Add under e.g. `copy.moderationError` or `copy.contentModeration`:

| Key | EN |
|-----|-----|
| `profileTitle` | We found an issue with your profile text |
| `messageTitle` | We found an issue with your message |
| `fieldLabel` | Field |
| `flaggedLabel` | Flagged |
| `whyLabel` | Why |
| `suggestionLabel` | Suggestion |
| `exampleLabel` | Example |
| `mutedLabel` | Messaging restricted |
| `dismiss` | Dismiss |
| `messagingMuted` | Messaging is temporarily restricted |
| `categoryDatingPolicy` | Community dating policy | (optional display; primary UX uses `reason`) |

**Do not** translate API `reason` / `suggestion` / `exampleAlternative` this story (backend English).

---

## Out of scope

- Textarea highlight overlay  
- Content guidelines page/link  
- Admin violations UI  
- Photo moderation  
- Changing backend  

---

## Tests (required)

- `parseContentModerationErrorBody` / `ContentModerationApiError` unit tests  
- Alert renders field + flagged + reason + suggestion + example when provided  
- `onboarding-texts-form`: moderation error shows alert (not only flat string)  
- `sendConversationMessage`: throws moderation error with details; 403 mute ≠ access denied  
- Thread or hook: moderation send failure shows alert / structured UI  

---

## Acceptance criteria

- [x] Profile moderation shows field, flagged phrase, why, suggestion (+ example when present)  
- [x] Message moderation shows same (no field) + muted when present  
- [x] `messaging_muted` not shown as “no access”  
- [x] Soft-log expected profile failures preserved  
- [x] No emoji; no fake guidelines link  
- [x] en/he/es chrome strings  
- [x] Specs green  

---

## Agent 1 status

**Complete** — see `handoffs/STORY_02_moderation_errors_frontend/agent-1-implement.md`

## Agent 2 status

**PASS** — see `handoffs/STORY_02_moderation_errors_frontend/agent-2-cr.md`

## Agent 3 status

**ACCEPT** — see `handoffs/STORY_02_moderation_errors_frontend/agent-3-pm.md`

## Next

```
--agent 0 sprint 34 story 3
```
