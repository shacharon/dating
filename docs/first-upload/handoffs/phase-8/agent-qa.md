# Handoff: first-upload — qa — phase 8

**Agent:** qa  
**Phase:** `8` Google login  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** blocked

---

## Summary

- Product exit test is **operator Google login + photo upload** on `https://findyouraidate.com`. That was **not** done in this QA run.
- AWS wiring looks in place: UI `google8`, task `dating-dev-ui:2` / `dating-dev-api:5`, Google client ID **baked** in the JS bundle (length 72, value not printed), `/health` 200, unauthenticated `/api/v1/me/profile` **401**.
- This agent’s browser hit **GoDaddy Website Builder** (Cellcom DNS `13.248.243.5`). That is the known cache, not a dating-app fail. Forced Google-DNS IP shows Next.js, not GoDaddy.
- food-backend-service still 1/1. No CloudFront check required this phase.

---

## Exit test evidence

| Check | Result |
|-------|--------|
| Operator Google login | **not run** |
| Photo upload | **not run** |
| `https://findyouraidate.com/health` (8.8.8.8 A) | 200 `dating-api` |
| HTML via AWS IP | Next.js (`_next/static`) |
| GIS client id in UI bundle | present |
| `GET /api/v1/me/profile` no cookie | 401 Express |
| Browser on this PC (system DNS) | GoDaddy builder — ignore |
| dating-dev-ui | desired 1, running 1, image `dating-ui:google8` |
| dating-dev-api | desired 1, running **2** (rollout leftover; not the login test) |
| food-backend-service eu-north-1 | desired 1, running 1 |

---

## Blockers

- Need **your** Google click on the real site (phone / `8.8.8.8`). QA cannot complete OAuth as you.
- Google Console origins must include `https://findyouraidate.com` (and www). If the popup errors `origin_mismatch` / `redirect_uri_mismatch`, that is Console, not ECS.

---

## Do not

- Mark pass because Terraform/ECS apply succeeded.
- Treat GoDaddy-on-home-Wi‑Fi as a dating deploy fail.

---

## Next

You: phone → https://findyouraidate.com → Google → upload a photo. Then re-run QA.

```text
--upload-agent qa phase 8
```

If login fails with a Google origin error after Console is set, send:

```text
--upload-agent devops phase 8
```
