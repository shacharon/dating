# Story 05 — Cloud verification

**Sprint 20 · Status: PLANNED**

## Objective
Prove the `dev` environment actually works end-to-end and meets the Sprint 19 performance bar — this is the sprint's exit gate.

## Why
"It deployed" ≠ "it works." Every food-project nuance surfaced only under real cloud conditions (HTTPS cookies, multi-instance sockets, S3 photos, queued analysis). This story verifies each explicitly against the live URL.

## Scope / tasks
1. **Liveness/health** — `GET /health` = 200; `GET /health/realtime` shows Redis socket adapter connected (proves L2 fix).
2. **Auth e2e (L4/L8)** — Google Sign-In on the `dev` origin; confirm session cookie is set with `Secure`, persists across requests, and `/api/v1/auth/me` returns the user. No 401 loop.
3. **Photos e2e (L1)** — upload a photo; confirm object lands in **S3** (not container disk); confirm it survives an API task restart; confirm served via CDN/authenticated URL.
4. **Moderation e2e** — upload triggers **Rekognition** (not mock); a clean photo → `APPROVED`, a flagged case → `FLAGGED_FOR_REVIEW`; admin queue at `/admin/photos` shows it; SLA cron behavior sane.
5. **Analysis e2e (L3)** — `POST /api/v1/me/profile/submit` → 202 + `analysisJobId`; polling `analysis-status` completes via the **queued** path; verify it still completes after killing/replacing a task.
6. **Chat e2e (L2)** — WebSocket chat works; with 2 API tasks + ALB stickiness, messages deliver across instances (Redis adapter fan-out).
7. **Performance (Sprint 19 bar)** — run k6:
   ```bash
   BASE_URL=https://<dev-url> SESSION_COOKIE='dating_session=...' VUS=25 DURATION=2m \
   k6 run dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js
   ```
   Assert **match-list p95 < 2000ms**.
8. **Smoke script** — adapt `dating-ui/smoke-test.sh` / `DEPLOYMENT_SMOKE_TEST.md` to the `dev` URL and wire into CI (Story 04).
9. **Observability check** — logs land in CloudWatch (stdout, `STRUCTURED_LOG_FILE=0`, fixes L7); Sentry receives events if configured.

## Acceptance criteria
- [ ] All 9 checks above pass against the live `dev` URL.
- [ ] k6 match-list **p95 < 2s** under the target VUs.
- [ ] Photos persist across task restarts (S3, not ephemeral disk).
- [ ] Analysis + chat work across a multi-task / restart scenario (queue + adapter proven).
- [ ] Login persists (cookie/CORS correct over HTTPS).
- [ ] Smoke test is automated and gates deploys in CI.
- [ ] A short "verified `dev`" note is captured (URL, date, results) for handoff.

## Notes / gotchas
- Run the multi-instance checks with API desired count ≥ 2 at least once, even if steady-state is 1.
- Keep k6 load modest on `dev` to avoid RDS/OpenAI/Rekognition cost spikes.
- If any check fails, it maps back to a specific story (photos→01/03, infra→02, config→03, deploy→04) — fix there, don't patch in prod.

## Deliverables
Verification checklist results, automated smoke script wired to CI, k6 run output, a short `dev` sign-off note.
