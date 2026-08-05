# Handoff: Agent 2 — Code Review — Sprint 42 Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_opener_ui.md](../../STORY_02_opener_ui.md)  
**Sprint:** sprint-42-conversation-intelligence  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

**Verdict:** **approved (fixed)** — Major PASS→Like no-op fixed; tests green.

---

## Summary

- Reviewed UI against Architect lock: HIGH-only opener on `MatchBrowseCard`, no list `conversationId`, sessionStorage draft → celebration `?starter=` → composer `initialDraft`, emerald/zinc, `emitProductLog` events.
- **Major fixed:** `useMatchActions` blocked Like when `yourAction === 'PASS'`, so Architect’s “null/PASS → Like & use” CTA was a no-op.
- **Minor fixed:** stopped double-`decodeURIComponent` on `?starter=` (Next already decodes; `%` in openers could throw).
- Skip Agent 4. Next → Agent 3.

---

## Checklist vs Architect / Story CR

| Check | Result |
|-------|--------|
| Opener only on HIGH browse card + non-null | Pass |
| No opener on `MatchListItem` / GOOD / empty | Pass |
| No fake list `conversationId` navigation | Pass |
| Like & use → `saveOpenerDraft` → Like → mutual `?starter=` | Pass |
| Celebration matches draft by `matchProfileId` | Pass |
| Composer editable `initialDraft`; strip query after apply | Pass |
| Emerald/zinc (no indigo story CSS) | Pass |
| Analytics: `opener_displayed` / `opener_used` / `opener_prefilled` | Pass |
| i18n en/he/es + aria | Pass |
| No Prisma / backend / DB `used`/`edited` | Pass |
| Like & use after PASS | Pass (after CR) |

---

## Issues

### Critical
- None

### Major (fixed)
1. **Like & use after PASS was a no-op** — Architect allows `yourAction` null/PASS; opener CTA stayed enabled after Pass, but `useMatchActions` refused any action when `currentAction != null`.  
   **Fix:** allow `LIKE` to overwrite `PASS` in `recordAction`. Specs: hook + browse card.

### Minor (fixed)
1. **Double-decode `starter`** — `searchParams.get` is already decoded; re-`decodeURIComponent` breaks openers containing `%`.  
   **Fix:** `starterFromSearchParam` trim-only helper.

### Accepted / non-blocking
1. Full conversation page Vitest still mocks empty `useSearchParams` — composer + draft util cover prefill/encoding; browser smoke for Agent 3.
2. Draft cleared on celebration “Send message” (not only after composer apply) — URL carries opener for the hop; acceptable vs Architect either-or.
3. Detail page has no opener block — Architect out of scope.

---

## Fixes / tests added

| Path | Change |
|------|--------|
| `use-match-actions.ts` | LIKE over PASS |
| `conversation-opener-draft.ts` | `starterFromSearchParam` |
| `conversations/[id]/page.tsx` | use helper |
| `*.spec.ts(x)` | PASS→LIKE; Like&use draft+like; starter parse |

---

## Tests / verification

```bash
cd dating-ui
npx vitest run src/lib/conversation-opener-draft.spec.ts \
  src/hooks/use-match-actions.spec.ts \
  src/app/dating/me-matches/match-opener-section.spec.tsx \
  src/app/dating/me-matches/match-browse-card.spec.tsx \
  src/components/conversation/conversation-message-composer.spec.tsx \
  src/app/dating/conversations/[id]/page.spec.tsx
```

- [x] Result: **74 passed**
- [ ] Browser Network smoke: **deferred** — Agent 3 (HIGH + `suggestedOpener`, Like&use → chat prefill)
- [ ] Socket: N/A
- [ ] migrate: N/A
- [ ] Agent 4 E2E: **N/A** — skip

---

## Remaining for Agent 3

- Manual smoke: HIGH card opener visible; Like & use → mutual → composer prefilled; edit + send.
- Confirm GOOD / null opener hide; no indigo styling.
- Spot-check dark mode + mobile layout.
- Optional: PASS then Like & use still likes.

---

## Next agent

```text
--agent 3 sprint 42 story 2
```

**Notes:** Skip Agent 4. Story 3 owns DB `used`/`edited` + effectiveness.
