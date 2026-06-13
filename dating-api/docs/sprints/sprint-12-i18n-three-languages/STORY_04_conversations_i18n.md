# Story 4: Conversations i18n

**Sprint:** 12  
**Status:** Done  
**Depends on:** Story 0  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

- `/dating/conversations` list page
- `/dating/conversations/[id]` messaging UI
- `conversation-display.ts` date/time strings via locale + copy

---

## Out of scope

- Message bodies (user/API text)
- Participant display meta (`gender`, `29y`) — English v1
- Socket/poll transport behavior

---

## Definition of done

- [x] Empty state, composer, unmatch confirm localized
- [x] Relative dates use locale-aware `Intl` where applicable
- [x] Hebrew list/composer tested; message bodies and meta remain EN (344/344 full suite)
