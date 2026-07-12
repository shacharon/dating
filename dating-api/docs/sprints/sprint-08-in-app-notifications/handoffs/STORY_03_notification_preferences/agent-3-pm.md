# Handoff: Agent 3 — PM — Story 3

**Agent:** 3 pm  
**Story:** [STORY_03_notification_preferences.md](../../STORY_03_notification_preferences.md)  
**Sprint:** sprint-08-in-app-notifications  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 3 closed as Done (engineering gate)** — separate `emailNotificationsEnabled` / `inAppNotificationsEnabled` prefs; profile toggles; in-app toast + nav bump wired; email path unchanged.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 8 epic complete: 3/3 stories done** (engineering gate).
- **Operator:** run migration + sprint-level manual smoke before production sign-off.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Migration `inAppNotificationsEnabled` | Done | `20260606120000_user_in_app_notifications_enabled` |
| `GET /api/v1/auth/me` both flags | Done | `auth.dto.ts` + integration tests |
| `PATCH /api/v1/me/notification-preferences` | Done | `me-profile.controller.ts` + HTTP spec |
| Profile UI two toggles | Done | `notification-preferences-section.tsx` |
| Email path unchanged | Done | CR — Sprint 6 services + unsubscribe |
| In-app toast + nav bump gated | Done | `shouldShowInAppAlert` + auth cache |
| Unread badges not gated | Done | Architect §5; list/nav API reconcile |
| Unsubscribe email-only | Done | `email-unsubscribe-http.integration.spec.ts` |
| Tests (story scope) | Done | **31/31** API + **29/29** UI (agent-2-cr.md) |
| Manual smoke | Pending operator | Toggle matrix in story file |

---

## Acceptance criteria

**7 / 7** engineering AC met.

**In-app scope (documented):** proactive alerts = toast + nav optimistic WS bump. List row live bump and API-derived badges remain read-state (not pref-gated).

**API write path:** dedicated `PATCH /api/v1/me/notification-preferences` (not profile PATCH).

---

## Sprint 8 progress

| # | Story | Status |
|---|--------|--------|
| 1 | In-app toast on new message | **Done** (manual smoke pending operator) |
| 2 | Nav unread indicator | **Done** (manual smoke pending operator) |
| 3 | Notification preferences | **Done** (manual smoke pending operator) |

**Epic:** **3/3 Done** (engineering gate).

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_03_notification_preferences.md` | Status Done, AC/DoD checked, shipped notes |
| `README.md` (sprint-08) | Epic Done (3/3) |
| `handoffs/STORY_03_notification_preferences/agent-3-pm.md` | this file |

---

## Shipped (2026-06-06) — Sprint 8 epic summary

| Story | Deliverable |
|-------|-------------|
| 1 | Global message toast via `MessagingShellProvider` / `message.new` |
| 2 | Nav unread pill; single shell socket; `ConversationUnreadProvider` |
| 3 | User prefs on `User`; profile toggles; `shouldShowInAppAlert` |

**Cross-cutting:** Channels remain independent — online = in-app alerts; offline = email (Sprint 6); prefs per channel.

Handoffs: `handoffs/STORY_0{1,2,3}_*/agent-*.md`

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator manual smoke is waiver (consistent with Stories 1–2).
- Unread **badges** are read-state, not notification prefs — disabling in-app does not hide nav/list counts from API.
- Migration must be applied on operator DB before smoke: `cd dating-api && npx prisma migrate deploy`.

---

## Tests / verification

- [x] Story 3 suite — **31/31** API + **29/29** UI
- [x] Full suites — **1318/1318** API, **201/201** UI
- [ ] Sprint manual smoke — pending operator

---

## Operator manual smoke (sprint-level)

**Prereq:** `NEXT_PUBLIC_REALTIME=ws`; migration deployed; API + UI running; two users A/B with mutual match.

1. **Story 1:** B on `/dating/me-matches`; A sends → B sees toast; no email while B online.
2. **Story 2:** B has unread → nav pill on any `/dating/*` page; live bump on `ws`.
3. **Story 3:** Profile toggles — in-app off → no toast/nav bump; email off → still toast; both off → badges remain from API.
4. **Sprint 6:** B offline; A sends → email only (if email on + Resend configured).
5. **Unsubscribe:** email off; in-app toggle unchanged.

---

## Open questions / blockers

- None blocking epic close.

---

## Next work

Sprint 8 engineering complete. Suggested follow-ups (new sprint / backlog):

- Web push / notification center (see sprint README deferred)
- Operator production smoke + Resend domain (Sprint 6)
- Optional: consolidate list inline bump with `shouldShowInAppAlert` exception for read-state
