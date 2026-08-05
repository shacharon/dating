# Pre-launch smoke test

~10–15 minutes. Mark each box before inviting beyond friends.

## Happy path

- [ ] Sign in with Google
- [ ] Complete onboarding (basics + story)
- [ ] Upload photo → pending/approved path understood
- [ ] Submit profile for analysis → `/profile?tab=analysis` progress
- [ ] Browse `/dating/me-matches` (HIGH / GOOD / OTHER when data exists)
- [ ] Open match detail → expand compatibility breakdown (Story 1)
- [ ] Learn how matching works → `/about/algorithm`
- [ ] HIGH opener visible → use opener → send message (Story 42)
- [ ] Mutual match email (if Resend on) and/or in-app conversation
- [ ] Notification prefs: HIGH match emails toggle present (Story 2)

## Empty / error polish (Story 3)

- [ ] Conversations empty: **no** “Keep swiping”; Browse matches works
- [ ] Filtered conversations → **Clear filters**
- [ ] Match load error → **Try again** (throttle network or break API briefly in staging)
- [ ] Photo gate (no approved photo) → Go to photos + why expand
- [ ] `/support` opens mailto with category + body

## Admin / ops

- [ ] `/admin` visible for allowlisted user (prod: `NEXT_PUBLIC_ADMIN_ENABLED=1` + gate)
- [ ] `/admin/beta-metrics` loads numbers (zeros OK on empty DB)
- [ ] `/admin/photos` + `/admin/reports` reachable

## Cross-check

- [ ] Chrome desktop
- [ ] Mobile Safari (or Chrome Android)
- [ ] Dark mode glance on matches + support

## Failures

If any happy-path box fails → **do not** send Day 1 invite wave.
