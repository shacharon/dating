# Performance & photo moderation runbook

**Sprint:** 19  
**Owner:** Ops / on-call  
**Last updated:** 2026-07-12

Engineering closed both stories under Agent 0 remaps. This runbook covers operator workflows and deferred production gates.

---

## Photo moderation — human review

1. Ensure your user id is in `ADMIN_USER_IDS` (and network gate if enabled).
2. Open `/admin/photos`.
3. Queue includes **`PENDING`** and **`FLAGGED_FOR_REVIEW`**, oldest first.
4. Review ML labels + confidence; **Approve**, **Reject** (pick reason code), or **Skip** (UI-only, next row).
5. Reject sends best-effort email when `emailNotificationsEnabled`; user also sees status on profile photos.

### Reason codes

| Code | When to use |
|------|-------------|
| `no_face` | No clear face / not a person selfie |
| `explicit_content` | NSFW / policy violation |
| `low_quality` | Unusable resolution / blur |
| `not_real_person` | Celebrity, meme, stock |
| `other` | Catch-all; optional free-text |

---

## Drivers & env

| Driver | Behavior |
|--------|----------|
| `rekognition` | Real AWS ML (required for production NSFW) |
| `mock` | Local default without AWS — auto-approve safe path |
| `stub` | Leave `PENDING` for full manual queue |
| Unset | `rekognition` if AWS credentials present, else `mock` |

Production: set `PHOTO_MODERATION_DRIVER=rekognition` + IAM (`DetectModerationLabels`, optional `DetectFaces`). Never leave `PHOTO_MODERATION_AUTO_APPROVE=1` in prod.

Thresholds (defaults): `NSFW_FLAG_THRESHOLD=50`, `NSFW_AUTO_REJECT_THRESHOLD=80`.

---

## SLA alerts

Hourly enforcer:

- **Rule A:** `FLAGGED_FOR_REVIEW` older than 6h with NSFW mid-band low confidence → auto-approve. Does **not** auto-approve `no_face` / quality / API-error flags.
- **Rule B:** flagged older than 24h → auto-approve + capacity alert log.
- **Capacity:** &gt;20 SLA auto-approvals in 24h → structured `sla_capacity_shortage` log → page ops / add reviewers.

Stuck `PENDING` with provider `rekognition` older than ~15m → promote to `FLAGGED_FOR_REVIEW` (`ml_timeout`).

---

## Metrics SQL

```sql
SELECT status, COUNT(*) AS count
FROM "UserProfilePhoto"
GROUP BY status;

-- Queue depth
SELECT COUNT(*) FROM "UserProfilePhoto"
WHERE status IN ('PENDING', 'FLAGGED_FOR_REVIEW');
```

Week-1 targets: auto-approve rate &gt;85% (ml source), queue &lt;50, NSFW reaching users = 0.

---

## Performance (Story 1) — ops follow-ups

1. Staging browser smoke: infinite scroll, submit → 202 → analysis-status, Redis hit on second match list.
2. Load test (`load-test-matches` / k6); record p95 vs &lt;2s target.
3. Enable Datadog; confirm custom metrics helpers.
4. Provision CloudFront + set `PHOTO_CDN_ENABLED=1` when ready.

Cache key: `match:list:{userId}` (TTL 1h). Invalidate on ranking recompute paths already wired in engineering.

---

## Escalation

| Symptom | Action |
|---------|--------|
| Queue &gt;100 | Add admins; check SLA capacity logs; verify Rekognition health |
| All photos stuck PENDING | Check Redis/Bull worker; driver; AWS credentials |
| False rejects spike | Raise reject threshold temporarily; review mid-band flags manually |
| NSFW report on approved photo | Reject via support; consider re-moderation follow-up epic |

---

## Privacy / legal (tracked)

- Disclose photo ML + human review in privacy policy before public launch (legal).
- Appeal flow deferred (user contests via support until dedicated story).
