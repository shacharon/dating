# Story 02 — Light FE lib/ Folders

**Sprint:** 73  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done  
**Repo:** `dating-ui`

**Handoffs:** [preflight](./handoffs/STORY_02_fe_lib_folders/agent--1-preflight.md) · [architect](./handoffs/STORY_02_fe_lib_folders/agent-0-architect.md) · [dev](./handoffs/STORY_02_fe_lib_folders/agent-1-dev.md) · [CR](./handoffs/STORY_02_fe_lib_folders/agent-2-cr.md) · [PM](./handoffs/STORY_02_fe_lib_folders/agent-3-pm.md)

---

## Objective

Organize `dating-ui/src/lib/` (~104 flat files) into domain folders. **Do not** rewrite APIs.

---

## Shipped layout

```text
dating-ui/src/lib/
  README.md
  lib-directory.wiring.spec.ts

  api-sdk/ api-types/ i18n/ observability/ push/   # kept (untouched internals)

  auth/        (21) — extended (token/session/fetch)
  matches/     (19) — extended (display/forms/enrichment)
  api/         (19)
  admin/       (11)
  messaging/   (17)
  profile/     (11)
  platform/    (13)
  query/       (5)
  moderation/  (2)
  referral/    (2)
```

Root **2** files (≤25). Imports use `@/lib/<domain>/<module>`.

---

## Success

- [x] `src/lib/` root ≤25 files (**2**)
- [x] Short `src/lib/README.md`
- [x] `npm test` green in `dating-ui` (Agent 2: **145** files / **889** tests, `--maxWorkers=4`)

---

## Shipped

`feature/sprint-73-story-2` @ `a29d680`

- `4e949b8` — refactor: organize dating-ui src/lib into domain folders
- `a29d680` — test: harden dating-ui lib directory wiring guards

**Shipped on main:** _(filled after merge)_  
**Feature tip ahead of main:** 0

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agents 2.5, 3.5, 4 N/A)

**Velocity win:** FE helpers land in ≤21-file domain folders instead of a 104-file flat root.

---

## SOLID / KISS

- **SRP:** api ≠ auth ≠ messaging ≠ profile ≠ platform.
- **KISS:** Move-only; no root shims; no new barrels.

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
