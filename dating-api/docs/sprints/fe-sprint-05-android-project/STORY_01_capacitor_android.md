# Story 01 — Capacitor Init + Android Project

**Sprint:** FE-05  
**Effort:** ~4-6 hours  
**Risk:** 🟢 LOW (tooling scaffold)  
**Status:** Done  
**GO_LIVE:** Frontend #1

**Handoffs:** [architect](./handoffs/STORY_01_capacitor_android/agent-0-architect.md) · [dev](./handoffs/STORY_01_capacitor_android/agent-1-dev.md) · [CR](./handoffs/STORY_01_capacitor_android/agent-2-cr.md) · [PM](./handoffs/STORY_01_capacitor_android/agent-3-pm.md)

---

## Objective

Create the Capacitor Android shell so native project exists and web assets can sync — FE-01 deferred Phase B (`cap init`, `android/`).

**Deliverable:** `capacitor.config.ts`, committed `android/` project, placeholder web bundle + prepare script, `npm run cap:sync:android` succeeds.

---

## Problem (before)

```text
dating-ui/capacitor.config.ts  → missing
dating-ui/android/             → missing
package.json                   → @capacitor/core + preferences only
```

---

## Solution

- **`capacitor.config.ts`** — `com.dating.app`, `webDir: out`, `androidScheme: https` (no `server.url`)
- **`capacitor-web-placeholder/index.html`** — minimal shell until Story 2 export
- **`scripts/prepare-cap-webdir.mjs`** — copies placeholder → `out/` before sync
- **`@capacitor/cli` + `@capacitor/android`** ^7.6.8 (devDependencies)
- **`android/`** — Capacitor 7 Gradle project (committed; synced assets gitignored)
- npm scripts: `cap:prepare-webdir`, `cap:sync`, `cap:sync:android`, `cap:open:android`

---

## Out of scope (Story 1)

- `next.config.ts` export mode (Story 2)
- `getApiBase()` Capacitor fixes (Story 3)
- Runnable APK with real Next UI (Story 2+)
- iOS platform

---

## Success criteria

- [x] `capacitor.config.ts` with appId, webDir, androidScheme
- [x] `android/` directory committed
- [x] `npm run cap:sync:android` exit 0
- [x] Placeholder web bundle flow documented
- [x] Unit tests (19 in story scope)
- [x] Agent 2 CR approved

---

## How to run

```bash
cd dating-ui
npm run cap:sync:android
npm run cap:open:android   # Android Studio, if installed
```

Optional: `cd android && ./gradlew assembleDebug` (requires Android SDK).

---

## Files changed

**New:**
- `capacitor.config.ts`
- `capacitor-web-placeholder/index.html`
- `scripts/prepare-cap-webdir.mjs`
- `android/` (Capacitor platform)
- `capacitor.config.spec.ts`
- `scripts/prepare-cap-webdir.spec.ts`

**Modified:**
- `package.json` / `package-lock.json`
- `vitest.config.ts`

**Unchanged:** `next.config.ts`, `src/lib/api-base.ts`

---

## Branch

`feature/fe-sprint-05-story-1` — ready for PR/merge; stack Story 2 from tip
