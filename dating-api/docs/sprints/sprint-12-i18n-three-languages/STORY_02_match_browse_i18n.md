# Story 2: Match browse i18n

**Sprint:** 12  
**Status:** Done  
**Depends on:** Story 0  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

Wire `/dating/me-matches` to i18n:

- Page title, subtitle, nav links
- Loading / errors / stale analysis banner / refresh messages
- Action badges (Liked, Passed, Blocked)
- “Analyzed {date}” label

---

## Out of scope

- API `reasonShort` / chips (English from server)
- Match detail page (`/dating/me-matches/[id]`) — Story 3

---

## Definition of done

- [x] All user-visible strings on match list use `getCopy(locale)`
- [x] UI tests pass with default English locale
- [x] Hebrew list copy tested; API `reasonShort` remains EN (337/337 full suite)
