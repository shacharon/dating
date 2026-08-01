# Story 35.3 Backend — Profile Quality API (LOCKED)

**Sprint:** 35 — Profile Consolidation  
**Story:** 3 — Profile quality score (**backend** phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** ACCEPT  
**Prerequisite:** none (can parallel 35.2 — hub already ships client meter chrome)  
**Unblocks:** Story 35.3 **frontend** (bind meter to this API)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for **backend** only.  
**Repo:** `dating-api` (no UI in this phase)

---

## Goal

Expose authenticated **`GET /api/v1/me/profile/quality`** returning a **0–100** weighted score, boolean completeness flags, and **stable suggestion ids** (for hub deep links) — computed from real profile + **APPROVED** photos.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Module | `dating-api/src/me-profile/` — `@Controller('api/v1/me')` + class-level `AuthGuard` |
| User | `@CurrentUser() user: AuthMeResponseDto` |
| Profile fields | `nickname`, `city`/`country`/`locationLabel`, `birthDate`, `gender`, `desiredPartnerGenders`, `aboutMe`/`aboutPartner`/`aboutRelationship` |
| Photos | `viewerHasApprovedPhoto` / `countApprovedPhotosForProfile` in `me-profile-photo-gate.ts` |
| Email verified | **Not on `User`** — Google signup already required verified email; **do not score** |
| Quality API today | **None** |
| UI today | Client equal-weight buckets in `dating-ui` `profile-completeness.ts` (replaced by API in **frontend** phase) |
| Suggestion ids (35.1) | `photo`, `nickname`, `location`, `basics`, `aboutMe`, `aboutPartner`, `aboutRelationship` |

### AGENT_COMMANDS / plan corrections (outdated — ignore)

- ❌ `@Get('quality')` → would be `/api/v1/me/quality` — use **`@Get('profile/quality')`**  
- ❌ Fields `locationName`, `relationshipGoals`, `primaryPhotoUrl` — use real schema names  
- ❌ Map `aboutPartner` ← `aboutRelationship` — wrong  
- ❌ Score “email verified” / invent `hasVerifiedEmail` — omit  
- ❌ Freeform English `suggestions: string[]` — return **structured ids** for i18n + deep links  
- ❌ `@ApiProperty` / Swagger unless you add it consistently to me-profile (today: plain DTOs)  
- ❌ Photo = “any upload” — must be **≥1 APPROVED**  
- ❌ Frontend / meter UI in this phase  

---

## Locked scoring (sum = 100)

| Id / flag | Points | Pass when |
|-----------|--------|-----------|
| `nickname` / `hasNickname` | **10** | `nickname?.trim()` non-empty |
| `location` / `hasLocation` | **10** | any of `city`, `country`, `locationLabel` trim non-empty |
| `basics` / `hasBasics` | **10** | `birthDate` present **and** `gender` present and ≠ `PREFER_NOT_TO_SAY` **and** `desiredPartnerGenders.length > 0` |
| `aboutMe` / `hasAboutMe` | **20** | `aboutMe.trim().length >= 50` |
| `aboutPartner` / `hasAboutPartner` | **20** | `aboutPartner.trim().length >= 50` |
| `aboutRelationship` / `hasAboutRelationship` | **15** | `aboutRelationship.trim().length >= 50` |
| `photo` / `hasApprovedPhoto` | **15** | `viewerHasApprovedPhoto(user)` (or count ≥ 1) |

`score` = sum of points for passed criteria (integer 0–100).  
Empty / null text fields = fail that criterion. No partial credit within a row.

**Story length threshold:** **50** Unicode code units via `.trim().length` (JS string length) — same as plan; document in DTO comment.

---

## Locked response contract

`GET /api/v1/me/profile/quality`

**200** body:

```ts
{
  score: number; // 0..100
  completeness: {
    hasNickname: boolean;
    hasLocation: boolean;
    hasBasics: boolean;
    hasAboutMe: boolean;
    hasAboutPartner: boolean;
    hasAboutRelationship: boolean;
    hasApprovedPhoto: boolean;
  };
  /** Missing criteria only, highest impact / UX order first */
  suggestions: Array<{
    id:
      | 'photo'
      | 'nickname'
      | 'location'
      | 'basics'
      | 'aboutMe'
      | 'aboutPartner'
      | 'aboutRelationship';
    points: number; // points available if fixed
  }>;
}
```

**Suggestion order (stable):**  
`photo` → `basics` → `nickname` → `location` → `aboutMe` → `aboutPartner` → `aboutRelationship`  
(Only include failed criteria.)

**Errors:**

| Case | Status |
|------|--------|
| No session | **401** |
| Authenticated, **no** profile row | **404** (same spirit as other me-profile getters — match existing `getForUser` not-found behavior) |

No caching header required. Compute on each request (profile + photo count).

---

## Locked code touchpoints

| Path | Change |
|------|--------|
| `src/me-profile/profile-quality.service.ts` | **new** — pure calculate + load profile/photos |
| `src/me-profile/profile-quality.service.spec.ts` | **new** — unit: empty / partial / full / thresholds / suggestion order |
| `src/me-profile/dto/profile-quality.dto.ts` | **new** — response types |
| `src/me-profile/me-profile.controller.ts` | `GET profile/quality` → service |
| `src/me-profile/me-profile.module.ts` | register service |
| `me-profile-http.integration.spec.ts` | 401 + 200 (and 404 if easy) |

Prefer exporting a **pure** `computeProfileQuality(input)` (or package-private method) for unit tests without Nest.

Reuse `MeProfileService.getForUser` (or Prisma read) + `viewerHasApprovedPhoto` — **do not** duplicate photo APPROVED query logic.

---

## Out of scope (this phase)

| Item | Where |
|------|--------|
| UI meter binding / i18n for suggestions | **35.3 frontend** |
| Changing hub chrome layout | Already 35.2 |
| Persisting score in DB / history | Later |
| Email verified points | Not modeled |
| Admin quality views | Later |

---

## Tests (required)

- Unit: all-fail → 0; all-pass → 100; aboutMe 49 vs 50 chars; photo PENDING vs APPROVED; suggestion order + only missing  
- HTTP: unauthenticated 401; authenticated with profile 200 shape  
- Existing me-profile specs still green  

---

## Acceptance criteria

- [x] `GET /api/v1/me/profile/quality` behind `AuthGuard`  
- [x] Score 0–100 per locked weights  
- [x] Completeness flags + structured suggestions with stable ids  
- [x] Photo = APPROVED only  
- [x] No email / no Swagger drive-by  
- [x] Unit + HTTP specs green  

---

## Done

Story **35.3 backend ACCEPT**. Next: `--agent 0 sprint 35 story 3 frontend`.
