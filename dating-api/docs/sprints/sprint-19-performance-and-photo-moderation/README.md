# Sprint 19: Performance optimization + real photo moderation

**Epic:** Scale readiness — fix performance bottlenecks and replace stub photo auto-approve with real moderation before public launch  
**Duration:** ~2 weeks (2 stories)  
**Goal:** Match list loads in <2s (p95), profile analysis is async and non-blocking, photos are moderated by ML + human review with 24hr SLA, zero NSFW content reaches users  
**Status:** Done (engineering gate; ops smoke / staging Rekognition tracked)
**Depends on:** [Sprint 18](../sprint-18-existing-match-hard-block-visibility/README.md) (hard block visibility complete)

---

## Why this sprint

**Performance gap discovered:** Match list loads all matches at once (no pagination), photos aren't optimized (no CDN/lazy loading), profile analysis is synchronous (risk of timeouts), no caching layer. This works for 100 users; breaks at 1,000+.

**Trust/safety liability:** [Sprint 9 Story 2](../sprint-09-product-mvp/STORY_02_photo_gate_profile_completeness.md) shipped stub auto-approve for photos with explicit "manual ops for small cohort" callout. That was acceptable for closed beta. **Not acceptable for public launch.** Without real moderation, the platform is exposed to explicit content, catfishing, spam profiles, and legal liability.

These are **both MVP-blocking** for any marketing push or public launch.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Caching layer | **Redis** — match scores (1hr TTL), profile analysis results (until stale flag) |
| Pagination strategy | **Cursor-based** on `analyzedAt` timestamp — stable sort, efficient, no page drift |
| Image delivery | **CloudFront CDN** + Next.js Image component with `priority`/`loading` hints |
| Profile analysis | **Bull queue** (async, non-blocking) — user submits profile → immediate 202 response → background processing |
| Photo moderation ML | **AWS Rekognition** — detect NSFW, explicit content, face count, image quality |
| Photo moderation flow | ML auto-approve (low risk) → human review queue (flagged) → reject with reason (high risk) |
| Human review SLA | **24 hours max**; auto-approve low-confidence after 6hr if no reviewer capacity |
| Photo states | `pending` → `approved` / `rejected` / `flagged_for_review` — single state machine |
| User notification | Email + in-app when photo rejected (with reason: "no face visible", "explicit content", "low quality") |
| Admin review UI | **Extends existing `/admin` path** from Sprint 10–11 — photo queue with approve/reject/flag actions |
| Rekognition thresholds | Conservative: NSFW >80% = auto-reject; 50–80% = flag for human; <50% = auto-approve |
| Performance targets | Match list <2s (p95), image bandwidth -60%, profile analysis doesn't block API response |

---

## Story checklist

| # | Story | Priority | Depends on | Status |
|---|--------|----------|------------|--------|
| 1 | [Performance overhaul: caching, pagination, image optimization, async analysis](./STORY_01_performance_overhaul.md) | **P0** | — | **Done** |
| 2 | [Real photo moderation: ML + human review](./STORY_02_real_photo_moderation.md) | **P0** | — | **Done** |

**Order:** Stories 1 and 2 can run in parallel (different surface areas). Recommended: start both, finish Performance first (unblocks load testing), then close Photo Moderation.

---

## Sprint-level definition of done

- [x] Match list API supports cursor pagination (20 per page); UI implements infinite scroll
- [x] Redis caching for match list (`match:list:{userId}`); analysis via profile status (remap)
- [x] CDN helper + Next.js Image path (CloudFront provision = ops follow-up)
- [x] Profile analysis moved to Bull queue; API returns 202 immediately, user polls status
- [x] AWS Rekognition integration (mock default without AWS; rekognition when creds present)
- [x] Admin photo review queue UI (`/admin/photos`) with approve/reject/skip actions
- [x] Photo state machine (`FLAGGED_FOR_REVIEW`); non-approved excluded from match flow
- [x] Email + profile rejection copy when photo rejected (with reason codes)
- [x] 24hr moderation SLA + 6hr mid-band auto-approve (Agent 2 Rule A safety)
- [ ] APM dashboards / p95 alerts — **deferred** ops
- [ ] Performance targets measured in staging load test — **deferred** ops
- [x] Full `dating-api` integration.spec green (Story 2: **309** tests at Agent 4)

---

## Performance baseline (capture before sprint start)

Run these and record results in Story 1 handoff:

```bash
# API load test (k6 or Artillery)
cd dating-api
npm run load-test:matches -- --duration 60s --vus 50

# Match list page speed
cd dating-ui
npm run lighthouse -- --url /dating/me-matches

# Database slow query log
# (Enable in PostgreSQL config; capture top 10 queries by avg_time)

# Image bandwidth audit
# (Chrome DevTools Network tab; measure total KB for match list page)
```

**Expected baseline (before Sprint 19):**
- Match list load: 3–5s (no pagination, no cache)
- Profile analysis: 2–4s synchronous (blocks API)
- Image bandwidth: ~5–10MB for 20 matches (unoptimized)
- Database queries: N+1 on match list (photo URLs, user metadata)

---

## Photo moderation baseline (capture before sprint start)

Record in Story 2 handoff:

```sql
-- Current photo state distribution (UserProfilePhoto — not fictional Photo)
SELECT status, COUNT(*) AS count
FROM "UserProfilePhoto"
GROUP BY status;
```

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time** per story:

```text
--agent 0 sprint 19 story 1   → dating-architect
--agent 1 sprint 19 story 1   → dating-senior-dev
--agent 2 sprint 19 story 1   → dating-code-review
--agent 3 sprint 19 story 1   → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

| Agent | Role |
|-------|------|
| 0 | Architect |
| 1 | Senior dev |
| 2 | Code review |
| 3 | PM / close |

---

## Manual smoke (sprint-level)

### Performance (Story 1)
1. Match list with 50+ matches loads in <2s; scroll triggers pagination automatically
2. Submit profile for analysis → immediate 202 response; poll `/api/v1/me/profile/analysis-status` → complete in background
3. Images load progressively (lazy); first 3 prioritized; bandwidth reduced vs. baseline
4. Redis keys visible (`match:scores:{userId}`, `profile:analysis:{profileId}`)
5. APM dashboard shows p95 latency <2s for match list endpoint

### Photo Moderation (Story 2)
1. Upload NSFW test image (`PHOTO_MODERATION_DRIVER=rekognition`) → auto-rejected; user sees rejection reason
2. Upload normal photo → auto-approved if max NSFW confidence **&lt;50%**; flagged if **50–80%**; reject if **≥80%**
3. Admin opens `/admin/photos` → sees PENDING + FLAGGED queue; approves/rejects one → state updates
4. Approved photo appears in match flow; pending/flagged/rejected do not
5. Check email + profile status copy for rejected photo (with reason)
6. Verify SLA: mid-band flagged &gt;6h low conf auto-approve; any flagged &gt;24h auto-approve + alert log
7. Local without AWS: default `mock` driver auto-approves (safe path); explicit `stub` = full manual queue

---

## Deferred (Sprint 20+)

- **A/B testing framework** for performance changes
- **Video profile moderation** (separate story)
- **Advanced ML**: face recognition for duplicate accounts, deepfake detection
- **Photo appeal flow** (user contests rejection)
- **Proactive re-moderation** (re-scan approved photos periodically)
- **Browse mode** (decoupled from performance; now Sprint 20 Story 1)

---

## Pre-sprint checklist

- [ ] Capture performance baseline (load test results, Lighthouse scores, DB slow queries)
- [ ] Capture photo moderation baseline (current state distribution from Prisma)
- [ ] Provision Redis instance (AWS ElastiCache or local for dev)
- [ ] Provision CloudFront distribution (or equivalent CDN)
- [ ] AWS Rekognition API access (credentials, budget alerts)
- [ ] APM tool account (New Relic free tier or Datadog trial)
- [ ] Load testing tool installed (`k6` or `artillery`)
- [ ] Database backup before migration (photo states, new indexes)

---

## Dependencies (external services)

| Service | Purpose | Vendor | Setup required |
|---------|---------|--------|----------------|
| Redis | Caching layer | AWS ElastiCache or self-hosted | Connection string in `.env` |
| CDN | Image delivery | CloudFront (AWS) | Origin pointing to photo storage (S3?) |
| Bull | Job queue | Self-hosted (Redis-backed) | Redis connection |
| Rekognition | ML photo moderation | AWS | API credentials, IAM role |
| APM | Performance monitoring | New Relic or Datadog | Agent installed, API key |

---

## Success metrics (track week 1 post-deploy)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Match list load time (p95) | <2s | APM dashboard |
| Profile analysis blocking time | 0s (async) | API response time histogram |
| Image bandwidth per match list page | <2MB (down from ~8MB) | Chrome DevTools Network tab |
| Photo auto-approval rate | >85% | `SELECT COUNT(*) ... WHERE auto_approved=true` |
| Human review queue size | <50 at any time | Admin dashboard |
| Photo moderation SLA adherence | >95% within 24hr | `SELECT ... WHERE reviewed_at - created_at < 24hr` |
| False positive rate (good photos rejected) | <2% | User support tickets |
| NSFW content reaching users | 0 | User reports |

Track in [PERFORMANCE_AND_MODERATION_RUNBOOK.md](../../ops/PERFORMANCE_AND_MODERATION_RUNBOOK.md) (create in Story 3 PM handoff).

---

## Notes

- **Cost impact:** Redis + CDN + Rekognition add ~$50–200/month for 1,000 DAU; budget accordingly
- **Load testing:** Do NOT run load tests against production; use staging with realistic data volume
- **Photo backfill:** Existing approved photos can stay as-is; only new uploads flow through Rekognition (optional: batch re-moderate existing photos in Story 2 follow-up)
- **Admin access:** Photo review queue reuses Sprint 10–11 admin auth (`ADMIN_USER_IDS` + network gate)
