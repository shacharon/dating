# Story 02 — Fat client thinning

**Sprint 56 · Done · P1 · ~2d · Depends: 01 helpful · Agent 3.5**

**Status:** Done  
**Tip:** `feature/sprint-56-story-2` @ `03049a9` (impl `68969e3`, CR `dc44980`)

Extract data hooks from conversations-page-client, onboarding forms, admin content-violations. Presentational components stay dumb.

## Definition of done

- [x] Four hooks landed (`use-conversations-list-page`, `use-onboarding-basic-form`, `use-onboarding-texts-form`, `use-admin-content-violations`); clients thinned; public form/page exports unchanged
- [x] Admin still useState/fetch (RQ → Story 04); no Story 03 error primitives
- [x] Story 01 `useConversationListRealtime` composed only from list page hook; topology unchanged
- [x] Specs green (incl. admin hook); Agent 2 approved; Agent 3.5 approved; Agent 3 closes
- [x] Browser Network smoke deferred with tracker (same residual as Story 01 → Agent 5 / operator)
