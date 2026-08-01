# Sprint 30 — Content Safety & Moderation

**Status:** 🟡 **IN PROGRESS** — Stories 00–04 Done; Story 05 Agent 1 complete → run Agent 2  
**Priority:** P0 (pre-launch blocker)  
**Depends on:** None  
**Blocks:** Production launch (Sprint 20 AWS deployment should not go live without this)

---

## Goal

Gate user-generated text (profile fields + messages) through OpenAI Moderation API to detect and block explicit/harmful content before it reaches other users. Track violations, warn users, and enforce progressive blocks.

**Non-goal:** Photo moderation (already exists via Sprint 19). Self-hosted ML (use OpenAI API for MVP, migrate later if needed).

---

## Context

Current state:
- Profile fields gated via OpenAI Moderation on create/patch (Story 02)
- Messages gated on send with progressive mute thresholds (Story 03); placeholder profanity removed
- Violation storage + gates + shared enforcement live (Stories 01–04); admin UI still open (Story 05)

Risk: harassment, explicit spam, and inappropriate content can flow freely through the product.

---

## Stories

| # | Story | Priority | Est | Status |
|---|-------|----------|-----|--------|
| 00 | [User consent + privacy policy](./STORY_00_consent_and_privacy.md) | P0 | 1d | ✅ Done |
| 01 | [OpenAI moderation client + violation storage](./STORY_01_moderation_client.md) | P0 | 0.5d | ✅ Done |
| 02 | [Profile field moderation gate](./STORY_02_profile_field_gate.md) | P0 | 1d | ✅ Done |
| 03 | [Message moderation gate](./STORY_03_message_gate.md) | P0 | 1d | ✅ Done |
| 04 | [Violation counting + progressive blocks](./STORY_04_violation_enforcement.md) | P0 | 0.5d | ✅ Done |
| 05 | [Admin violations surface](./STORY_05_admin_violations.md) | P1 | 0.5d | Agent 1 done → run Agent 2 |

**Order:** 00 (legal/policy updates) → 01 → 02 → 03 → 04 → 05

**Critical:** Story 00 must be deployed to production at least **7 days before** Stories 01-05 go live (gives users notice period).

---

## Architecture decisions

### Why OpenAI Moderation API?

- **Already in use:** Profile analysis + match narratives already send text to OpenAI (GPT-4) — no new privacy boundary
- **Zero code complexity:** One HTTP POST, get back `flagged: true/false` + categories
- **Free:** No cost (vs. GPT-4 chat completions which we already pay for)
- **Fast:** ~100-200ms (acceptable for sync gates)

### Sync vs. async moderation

**Profile fields:** Sync check on save/submit — block before persisting. Users can't rapid-fire submit, so no UX concern.

**Messages:** Start with **sync check** (100-200ms added latency) for safety. If false-positive rate is low and UX complaints are high, consider async in a later sprint.

### Violation thresholds

| Surface | Daily limit | Total lifetime | Block action |
|---------|-------------|----------------|--------------|
| Profile fields | N/A (can't spam) | 3 violations | Block profile editing until manual review |
| Messages | 3/hour, 10/day | 20 lifetime | Mute messaging (can still browse matches) |

Stricter than general platforms (Discord, Slack) because dating context is more sensitive.

### DB schema

```sql
-- New table
CREATE TABLE UserContentViolation (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  userId      TEXT NOT NULL REFERENCES User(id),
  surface     TEXT NOT NULL, -- 'profile_aboutMe' | 'profile_aboutPartner' | 'profile_aboutRelationship' | 'message'
  flaggedText TEXT NOT NULL, -- Store for ops review (encrypted at rest)
  category    TEXT NOT NULL, -- OpenAI category: 'sexual', 'hate', 'harassment', 'violence', etc.
  score       FLOAT,         -- Confidence 0-1
  action      TEXT NOT NULL, -- 'warned' | 'blocked'
  createdAt   TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_content_violation_user_created 
  ON UserContentViolation(userId, createdAt DESC);

CREATE INDEX idx_user_content_violation_surface_created 
  ON UserContentViolation(surface, createdAt DESC);

-- Add to User table
ALTER TABLE User ADD COLUMN contentViolationStatus TEXT DEFAULT 'ok'; 
  -- 'ok' | 'profile_edit_blocked' | 'messaging_muted'
ALTER TABLE User ADD COLUMN contentViolationMutedUntil TIMESTAMP;
ALTER TABLE User ADD COLUMN contentViolationCount INT DEFAULT 0;
```

---

## Privacy & legal

**CRITICAL:** Story 00 (consent + privacy updates) is a **prerequisite** for this sprint. Privacy policy and terms must be updated and deployed **7 days before** enabling moderation.

**Disclosure required:** Privacy policy must state "we use third-party AI tools (OpenAI) to detect harmful content in user text."

**Existing precedent:** Profile analysis already sends all text to OpenAI GPT-4 — moderation API is same data pipe, different endpoint (and actually less retained per OpenAI policy).

**GDPR/compliance:** Data processing agreement with OpenAI must be verified/signed. Legal basis: "legitimate interest" in platform safety (GDPR Art. 6(1)(f)).

---

## Acceptance criteria (sprint-level)

- [ ] Profile fields with explicit content → blocked on save, user sees error with category
- [ ] Messages with explicit content → blocked on send, user sees error with category  
- [ ] 3 profile violations → `User.contentViolationStatus = 'profile_edit_blocked'`
- [ ] 10 message violations in one day → `User.contentViolationStatus = 'messaging_muted'`
- [ ] Admin can view all violations at `/admin/content-violations` with filters
- [ ] All gates covered by integration tests
- [ ] Observability: violations logged with category + surface + userId (no raw text in logs)

---

## Out of scope (future)

- Rewording suggestions (requires second LLM call — expensive/slow)
- Self-hosted moderation (privacy purist option — requires GPU + model maintenance)
- Appeal flow (manual review → unblock)
- Retroactive scanning of existing profiles/messages

---

## Rollout plan

### Phase 1: Legal/policy (Story 00)
1. Update privacy policy + terms of service
2. Deploy to prod
3. **Wait 7 days** (notice period for users)

### Phase 2: Technical implementation (Stories 01-05)
1. Deploy Stories 01-05 to `dev` with Feature flag `CONTENT_MODERATION_ENABLED=true`
2. Test with synthetic explicit content + real team profiles
3. Monitor false positive rate for 48 hours
4. If <5% false positives → enable in prod
5. If >5% false positives → tune thresholds or add human review step

---

## References

- [OpenAI Moderation API docs](https://platform.openai.com/docs/guides/moderation)
- Sprint 3 Story 6: message safety guardrails (placeholder profanity)
- Sprint 19 Story 2: photo moderation (Rekognition)
- `docs/legal/DATA_RETENTION.md` (add violation retention policy)
