# Story 35.3 Frontend — Bind Profile Quality Meter (LOCKED)

**Sprint:** 35 — Profile Consolidation  
**Story:** 3 — Profile quality score (**frontend** phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** Story **35.3 backend ACCEPT** — [STORY_03_profile_quality_backend.md](./STORY_03_profile_quality_backend.md)  
**Depends on:** Hub chrome from **35.2 ACCEPT** (meter already above tabs)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for **frontend** only.  
**Repo:** `dating-ui` (no dating-api in this phase)

---

## Goal

Replace the hub’s **client equal-weight** quality score with **`GET /api/v1/me/profile/quality`**, keeping the **compact** meter chrome from 35.1/35.2 (bar + ≤2 suggestion chips + Improve CTA). Suggestions stay **i18n + deep-linked** via stable ids.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| API | `GET /api/v1/me/profile/quality` — `{ score, completeness, suggestions: { id, points }[] }` |
| Suggestion order | Server already ranks: photo → basics → nickname → location → aboutMe → aboutPartner → aboutRelationship |
| Meter chrome | `components/profile/profile-quality-meter.tsx` above tabs in `profile-hub-client.tsx` |
| Deep links | 35.1 map — `suggestionHref` in `lib/profile-completeness.ts` |
| i18n | `copy.profile.hub.suggestion*` + `meterLabel` / `meterImprove` / `meterLoading` / `meterUnavailable` (en/he/es) |
| Client score today | Equal-weight 3 buckets in `completenessScorePercent` — **wrong vs API**; meter must stop using it |
| Story threshold | API: trimmed length **≥ 50**; client hints still use `> 0` — **do not** “fix” hints to match unless touching that component for another reason |

### AGENT_COMMANDS / sample code corrections (outdated — ignore)

- ❌ Rebuild meter as large card with ✅/⚠️ lists, blue bar, emoji, “3x matches” banners — keep **existing compact chrome** (zinc/emerald)  
- ❌ `suggestions: string[]` / English copy from API — use **ids + i18n**  
- ❌ `fetch('/api/v1/...')` without `getApiBase()` + `credentials: 'include'`  
- ❌ New page at `app/profile/page.tsx` — hub already at `(authenticated)/profile`  
- ❌ Require SWR — plain fetch + refresh key is enough  
- ❌ dating-api / weight changes  
- ❌ Expand to full “Complete:” checklist UI in this story  

---

## Locked product behavior

### Data source

| Rule | Spec |
|------|------|
| Score shown | API `score` (0–100) as `{score}%` |
| Progress bar | `aria-valuenow={score}`; width `${score}%`; emerald fill (existing) |
| Suggestions | First **2** entries of API `suggestions` (server order) |
| Chip label | Existing hub i18n for that `id` (no points required in chip text) |
| Chip href | `suggestionHref(id)` — same hashes as 35.1 |
| Improve CTA | `/profile?tab=edit` (unchanged) |
| Loading | `meterLoading` (existing) |
| Error / 404 / network | `meterUnavailable` — do **not** fall back to client score |
| Completeness object | Available for tests / future expanded UI; **not required** in compact UI |

### Meter props

Stop requiring `draft` for scoring.

```ts
type Props = {
  copy: AppCopySchema['profile']['hub'];
  /** Bump after profile/photo mutations so meter refetches */
  refreshKey?: number | string;
};
```

Hub: `<ProfileQualityMeter copy={hub} refreshKey={qualityRefreshKey} />`  
(Remove `draft={draft}` from meter.)

### Refresh after edits

Acceptance: score updates after the user saves profile fields or changes photos.

1. Hub owns `qualityRefreshKey` state (number, start `0`).  
2. Meter fetches on mount and whenever `refreshKey` changes.  
3. `ProfileEditTab` takes `onProfileMutated?: () => void` and calls it after successful mutations:
   - Add optional `onSaved?: () => void` to `OnboardingBasicForm` / `OnboardingTextsForm` (invoke after successful hub save).  
   - After successful photo upload / remove (or other mutation that changes photo list) in `ProfilePhotoSection` — either optional callback prop from Edit tab, or call the same `onProfileMutated` from a thin wrapper; **do not** invent a global event bus.  
4. Nice-to-have (not required): bump key when leaving `edit` tab.

Do **not** introduce SWR solely for this.

### API client

**New** `dating-ui/src/lib/profile-quality-api.ts`:

- `fetchProfileQuality(): Promise<ProfileQualityDto>`  
- Use `getApiBase()`, `credentials: 'include'`, `Accept: application/json`, `cache: 'no-store'` (match other me-* GETs).  
- Types mirror backend DTO (suggestion ids union + completeness flags).  
- Non-OK → throw (meter catches → unavailable).  
- Unit/spec: happy path URL + credentials; 401/404 throw.

Optional: thin re-export from `me-profile-api.ts` — **not required**.

### Mapping helper

Prefer a small pure helper (in `profile-quality-api.ts` or beside meter) so chips stay testable:

```ts
qualitySuggestionChips(
  suggestions: { id: ProfileQualitySuggestionId; points: number }[],
  labels: Partial<Record<ProfileQualitySuggestionId, string>>,
  limit = 2,
): { id; label; href }[]
```

Reuse `suggestionHref` from `profile-completeness.ts`.  
Do **not** keep calling `suggestionChips(flags, …)` / `completenessScorePercent` from the meter.

`profile-completeness.ts` may remain for `ProfileCompletenessHints` / legacy — no drive-by delete.

---

## Locked code touchpoints

| Path | Change |
|------|--------|
| `src/lib/profile-quality-api.ts` | **new** — fetch + types (+ chip helper OK) |
| `src/lib/profile-quality-api.spec.ts` | **new** — fetch contract |
| `src/components/profile/profile-quality-meter.tsx` | Bind API; drop draft/photo-list client score |
| `src/components/profile/profile-quality-meter.spec.tsx` | **new or extend** — loading / score / chips / unavailable |
| `src/app/(authenticated)/profile/profile-hub-client.tsx` | `refreshKey` + pass `onProfileMutated` into Edit |
| `src/components/profile/profile-edit-tab.tsx` | Forward `onProfileMutated` |
| `src/components/onboarding-basic-form.tsx` | Optional `onSaved` |
| `src/components/onboarding-texts-form.tsx` | Optional `onSaved` |
| `src/components/profile-photo-section.tsx` | Optional `onMutated` (or equivalent) after successful mutate |

i18n: **no new keys required** if existing `suggestion*` / meter strings suffice.

---

## Out of scope

| Item | Where |
|------|--------|
| Changing API weights / suggestion order | Backend (done) |
| Full “Complete / To improve” checklist UI | Later / optional |
| Marketing “3x matches” copy | Not in 35.1 lock |
| Aligning `ProfileCompletenessHints` to ≥50 / API weights | Later |
| Redirect QA matrix | **35.4** |
| dating-api | Done |

---

## Tests (required)

- API client: 200 parse; non-OK throws; URL path includes `/api/v1/me/profile/quality`  
- Meter: loading → score + bar; shows ≤2 chips with correct `data-testid` / hrefs; error → unavailable  
- Chip helper: respects limit + href map  
- Existing hub/form specs still green  

---

## Acceptance criteria

- [x] Hub meter shows **API** score, not client equal-weight %  
- [x] Progress bar + a11y progressbar attrs use that score  
- [x] Up to **2** suggestion chips from API ids → i18n → deep links  
- [x] Loading / unavailable states via existing copy  
- [x] After basic/story save or photo mutation, meter **refetches** (refresh key)  
- [x] No emoji / no blue meter chrome / no dating-api edits  
- [x] Specs green for new API client + meter behavior  

---

## Agent 1 implementation order

1. `profile-quality-api.ts` + spec  
2. Chip helper (or inline in meter with pure export for tests)  
3. Rewrite `ProfileQualityMeter` to fetch API  
4. Hub refresh key + Edit tab / forms / photos callbacks  
5. Component specs  
6. Handoff `agent-1-implement.md`

---

## Done

Story **35.3 frontend ACCEPT**. Next: `--agent 0 sprint 35 story 4`.
