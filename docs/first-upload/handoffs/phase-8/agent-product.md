# Handoff: first-upload — product — phase 8

**Agent:** product  
**Phase:** `8` Google login  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- What: turn on **Sign in with Google** on the live site so the operator can open inner pages and upload a photo.
- Why: Google will not issue tokens for a hostname we do not control. HTTPS + `findyouraidate.com` now exist. Home Wi‑Fi may still show GoDaddy; **phone / Google DNS already loads the dating app.**
- Not yet: CloudFront (5b still parked). Do not reopen NAT vs public-IP. Do not grow RDS/ECS.

---

## Prior phase

- Phase 6 QA **pass** (migrations + `/health/ready`).
- Phase 7 pipeline files were **parked** then the operator bought **findyouraidate.com** and HTTPS was applied anyway. Formal `phase-7/agent-qa.md` was never written.
- Operator check (this session): **https://findyouraidate.com** on the phone shows the dating UI, not GoDaddy. That is the phase 7 exit test. Product treats HTTPS as **unparked / done**. Do not park phase 8.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Domain: `findyouraidate.com` (and `www` if already aliased)
- Public origin: `https://findyouraidate.com`
- Same Google **Web** OAuth client as local (do not invent a second product unless architect says the live client must be separate)
- Names stay `dating-*`. Do not touch `food-*`.

---

## Operator must do (Google Console)

Google Cloud Console → APIs & Services → Credentials → the **Web** client:

- Authorized JavaScript origins: `https://findyouraidate.com` and `https://www.findyouraidate.com`
- Authorized redirect URIs: same two HTTPS URLs (plus whatever architect lists if the app uses a path)

Paste client id / secret into gitignored `terraform.tfvars` (or give devops **out of chat**). Never paste secrets in Slack/chat/handoffs.

---

## Money

- Google OAuth: **$0**.
- Secrets update + possible UI rebuild / ECS restart: **pennies** (same Fargate/NAT/RDS bill). Not a new expensive resource. No extra consent for RDS/NAT.

---

## Exit test

From the plan — do not invent another:

- Operator **logs in with Google** on **https://findyouraidate.com** and **uploads a photo**.

QA uses a real browser (phone is fine). Login fail on Cellcom-cached GoDaddy page is not a product fail — use phone or `8.8.8.8`.

---

## Do not

- Print or commit Google client secret
- Treat ALB hostname Google login as done
- Touch Going2Eat / `food-*` / root
- Enable CloudFront in this phase
- Skip filling secrets because “UI already shows a Google button”

---

## Architect notes (scope only)

- Fill Google id/secret in AWS (Secrets Manager / tfvars). Cookie + CORS already aimed at this domain; **running tasks may still have old env** — force a new deploy if needed.
- UI image from phase 4 baked **empty** `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Live Sign-In likely needs a **UI rebuild + ECR push** with the real web client id. Architect designs that; devops does it.

---

## Next

```text
--upload-agent architect phase 8
```
