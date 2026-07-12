# Onboarding — manual smoke checklist

**Prerequisites:** `dating-api` and `dating-ui` running; sign in with Google in the browser so `dating_session` is set.

**API spot-checks (PowerShell):** replace `$api`, `$cookie`, and run from a shell where you can paste a real session cookie (DevTools → Application → Cookies, or Network → request headers).

```powershell
$api = 'http://127.0.0.1:3001'   # dating-api directly, or same-origin proxy URL you use
$cookie = 'dating_session=PASTE_VALUE_HERE'
$h = @{ Cookie = $cookie; Accept = 'application/json' }
Invoke-RestMethod -Uri "$api/api/v1/me/profile" -Headers $h | ConvertTo-Json -Depth 5
```

---

## Checklist

1. **New user, no profile → basics**  
   - [ ] In DevTools → Network, `GET /api/v1/me/profile` returns **404** (or UI treats empty profile as “no row”).  
   - [ ] Navigating to `/onboarding` ends on **`/onboarding/basic`** (not `/onboarding/texts`).

2. **Step 1 persistence and step advance**  
   - [ ] On `/onboarding/basic`, click **Save progress** → API row exists/updates with **`onboardingStep`: `"BASIC"`** (verify with PowerShell snippet above).  
   - [ ] Fill gender (not “prefer not to say”), pick ≥1 “open to matching”, click **Continue to story** → profile shows **`onboardingStep`: `"TEXTS"`**.

3. **Refresh with TEXTS**  
   - [ ] On `/onboarding/texts`, hard refresh (F5) → still on **`/onboarding/texts`** and text fields match server (no bounce back to basic).

4. **Complete onboarding (TEXTS → COMPLETED)**  
   - [ ] **Save progress** on texts leaves **`onboardingStep`: `"TEXTS"`** (optional check).  
   - [ ] **Finish & analyze** (all three text areas non-empty) → profile shows **`onboardingStep`: `"COMPLETED"`** and **`onboardingCompletedAt`** set (before/after submit in API response if you catch timing).

5. **Final submit triggers analysis**  
   - [ ] After **Finish & analyze**, Network shows **`POST /api/v1/me/profile/submit`** (200).  
   - [ ] UI lands on **`/dating/analysis`**; profile `status` moves through product flow (e.g. **SUBMITTED** / **ANALYZING** / **ANALYZED**) as your environment allows.

6. **Completed user skips onboarding**  
   - [ ] Open **`/onboarding`** (and `/onboarding/basic`) → redirect to **`/dating/profile`** when `onboardingStep` is **`COMPLETED`**.

7. **Matching engine unchanged**  
   - [ ] Confirm via PR scope (no engine/match scoring edits) or run focused API tests from repo root:  
     `cd ..\dating-api; npx jest --testPathPattern=me-matches --runInBand`  
     (from `dating-ui`; or `cd dating-api` from the monorepo root.)
     (or full `npm test` if you prefer).

---

## Notes

- Cookie name defaults to **`dating_session`** (`NEXT_PUBLIC_SESSION_COOKIE_NAME` can override).  
- If the UI talks to the API via Next rewrites, use the same origin you use in the browser and the cookie from that origin.
