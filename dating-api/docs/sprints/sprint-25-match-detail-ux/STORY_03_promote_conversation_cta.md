# Story 3: Promote View conversation CTA

**Sprint:** 25  
**Status:** Done  
**Depends on:** —

---

## Why

When already matched, “View conversation” is a tiny teal link next to a badge. Undo / Block / Report compete visually with the real next step: talk.

---

## What

**As a** matched user  
**I want** messaging to be the obvious primary action  
**So that** I know what to do next without hunting.

### Acceptance criteria

- [x] When `mutualMatch` + `conversationId`, **View conversation** is a **primary button** (same visual weight family as Like — solid emerald CTA).
- [x] “You matched!” badge can stay, quieter than the CTA.
- [x] Undo / Block / Report remain secondary (text / quiet links) — not restyled to primary.
- [x] Spec still finds the conversation link/button and correct href.

### Out of scope

- Celebration modal changes.
- Changing Like / Pass button styles for non-mutual state.

## Suggested touchpoints

- `dating-ui/.../me-matches/[id]/page.tsx` (footer mutual block)
- `page.spec.tsx` (mutual / view conversation cases)
