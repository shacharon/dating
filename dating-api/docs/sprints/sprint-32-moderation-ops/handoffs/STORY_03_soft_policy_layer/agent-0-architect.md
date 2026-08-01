# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_soft_policy_layer.md](../../STORY_03_soft_policy_layer.md)  
**Sprint:** sprint-32-moderation-ops  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Soft / dating policy — **B + thin C** as hard blocks (no warn UX). **Skip Agent 4** (unit + existing gate/admin specs).

---

## Summary

- **Primary B:** small curated **dating blocklist** (sexual solicit spam OpenAI often leaves unflagged, e.g. `i want to fuck`).
- **Thin C:** if OpenAI returned scores and `sexual` ≥ threshold while `flagged=false`, treat as block.
- Both → same gate outcome as OpenAI flag: **400**, `action: 'blocked'`, **counts on mute ladder**. Category = `dating_policy`.
- **No Option A** (warn / softer allow) this story — reserved `warned` stays unused.
- Surfaces: **message + profile** text fields (same fields as Sprint 30 gates).
- Fail-open: **blocklist still runs**; score threshold **does not** (no scores).
- Admin: optional `action` filter on violations list.
- Near-miss obs when sexual score is elevated but under threshold / not blocklisted.

**Out of scope:** Warn UX, Hebrew blocklist expansion, per-user sensitivity, LLM rephrase, changing mute ladder numbers, Story 04 cron.

---

## Artifacts

| Path | Change |
|------|--------|
| `src/content-moderation/dating-policy.ts` | **create** — blocklist + score evaluate + helpers |
| `src/content-moderation/dating-policy.spec.ts` | **create** |
| `src/content-moderation/content-moderation.types.ts` | `sexualScore` on `ModerationResult`; `isDatingPolicyEnabled`; threshold helper; category const |
| `src/content-moderation/openai-moderation.client.ts` (+ spec) | populate `sexualScore` from `category_scores.sexual` |
| `src/logging/error-codes.ts` | `CONTENT_MODERATION_DATING_POLICY`, `CONTENT_MODERATION_NEAR_MISS` |
| `src/me-profile/me-conversation-messages.service.ts` (+ spec) | policy after OpenAI |
| `src/me-profile/me-profile.service.ts` (+ spec) | policy after OpenAI |
| `src/admin/.../list-admin-content-violations.dto.ts` | optional `action` query |
| `src/admin/.../admin-content-violations.service.ts` (+ specs) | filter by `action` |
| `.env.example` | `DATING_POLICY_ENABLED`, `DATING_POLICY_SEXUAL_SCORE_MIN` |

No Prisma migration (reuse `action` / `category` strings).

---

## Decisions (do not reverse without discussion)

### 1. Option lock (locked)

| Option | This story |
|--------|------------|
| **A Soft warn** | **Out** — no new HTTP/`warned` path |
| **B Dating blocklist** | **In** — primary |
| **C Score threshold** | **In** — thin secondary when OpenAI scores available |
| **D Defer only** | **Out** as sole approach; keep **near-miss logging** as observability |

Rationale: product gap is spam that **sends today**; warn UX needs client work; blocklist is deterministic for known phrases; score catches paraphrases when API is healthy.

### 2. Decision pipeline (locked)

Gates call OpenAI then pure evaluate (no extra network):

```ts
const moderation = await this.moderation.checkContent(text);
const decision = evaluateContentPolicy(text, moderation);

if (decision.allow) {
  // optional near-miss obs inside evaluate / caller — see §7
  return; // or continue profile loop
}

// recordViolation + enforce + 400 — same shapes as Sprint 30
```

`evaluateContentPolicy` order:

1. If `!moderation.failOpen && moderation.flagged` → reject `source: 'openai'`, category = primary/OpenAI (existing behavior).
2. Else if `isDatingPolicyEnabled()`:
   - If `matchesDatingBlocklist(text)` → reject `source: 'dating_blocklist'`, category = **`dating_policy`**, score = `moderation.sexualScore ?? moderation.score` (or `null` if fail-open).
   - Else if `!moderation.failOpen && (moderation.sexualScore ?? -1) >= sexualScoreMin()` → reject `source: 'dating_score'`, category = **`dating_policy`**, score = `sexualScore`.
3. Else allow.

**Fail-open:** step 1 skipped (not flagged); blocklist **still applies**; score rule **skipped**.

When `CONTENT_MODERATION_ENABLED` is off, gates never run (unchanged) — dating policy is not a bypass path.

### 3. Types / API shape (locked)

```ts
export const DATING_POLICY_CATEGORY = 'dating_policy';

export type ContentPolicyDecision =
  | { allow: true }
  | {
      allow: false;
      source: 'openai' | 'dating_blocklist' | 'dating_score';
      category: string;
      score: number | null;
      action: 'blocked'; // always blocked this story
    };

export type ModerationResult = {
  flagged: boolean;
  categories: string[];
  primaryCategory: string | null;
  score: number;
  /** OpenAI `category_scores.sexual`; `null` when fail-open / missing. */
  sexualScore: number | null;
  failOpen: boolean;
};
```

Update `emptyClean` / all mocks to include `sexualScore: null` (or `0` only when real scores map has sexual).

### 4. Blocklist (locked)

- Module-local constant array of **case-insensitive RegExp** (EN MVP only).
- Normalize: trim; match against original text with `/i` (do **not** strip punctuation aggressively — keep regex word boundaries).
- Starter patterns (Agent 1 may add 1–2 synonyms if tests need; do not grow into a dump):

```ts
/\bi\s+want\s+to\s+fuck\b/i
/\bwanna\s+fuck\b/i
/\bwant\s+to\s+fuck\b/i
/\bsend\s+nudes?\b/i
```

- **No** admin CRUD / DB table this story.
- **No** Hebrew patterns this story (document follow-up).

### 5. Score threshold (locked)

| Knob | Default | Env |
|------|---------|-----|
| Sexual min | **0.85** | `DATING_POLICY_SEXUAL_SCORE_MIN` (parse float; invalid → 0.85) |
| Enabled | **on** when unset | `DATING_POLICY_ENABLED` — same truthy rules as `isContentModerationEnabled` (`0|false|off|no` → off) |

Only `sexual` category score (not hate/violence) for this thin C.

### 6. Mute ladder / action (locked)

- Dating policy rejects use `action: 'blocked'` (same as OpenAI).
- **Do count** toward mute / profile block ladder (`getViolationCount` unchanged — all rows).
- Do **not** write `warned` this story.
- Obs: use `CONTENT_MODERATION_DATING_POLICY` for blocklist/score rejects (include `source=`; **no** raw text / emails). Keep `CONTENT_MODERATION_FLAGGED` for OpenAI `source: 'openai'`.

### 7. Near-miss observability (locked)

When decision would **allow**, dating policy on, `!failOpen`, not flagged, not blocklist, and `sexualScore != null` and `sexualScore >= 0.5` and `sexualScore < sexualScoreMin()`:

```text
CONTENT_MODERATION_NEAR_MISS sexualScore=… threshold=… surface=…
```

No DB row. No text in log.

### 8. HTTP / UX (locked)

Reuse existing errors — **no** new client contract:

| Surface | Status | `error` |
|---------|--------|---------|
| Message | 400 | `message_content_moderation_failed` |
| Profile | 400 | `content_moderation_failed` |

`details.category` may be `dating_policy`. Same suggestion copy as today.

### 9. Surfaces (locked)

| Surface | Apply policy |
|---------|--------------|
| `message` | Yes |
| `profile_aboutMe` / `aboutPartner` / `aboutRelationship` | Yes |

Refactor shared helper optional but preferred: e.g. private method or small `applyContentPolicyReject(...)` to avoid duplicating record/enforce/throw — Agent 1 judgment; behavior lock above is mandatory.

### 10. Admin filter (locked)

`ListAdminContentViolationsQueryDto` + service `where.action` when `action` query present (trim; exact match `blocked` | `warned`).

UI: optional Action dropdown on `/admin/content-violations` feed (**nice-to-have** if cheap; API filter is required). Blocked-users endpoint unchanged.

### 11. Tests (locked)

| Spec | Cover |
|------|-------|
| `dating-policy.spec.ts` | clean allow; blocklist hit; score≥min; fail-open + blocklist still blocks; fail-open + high sexualScore does **not** score-block; near-miss helper if exported |
| `openai-moderation.client.spec.ts` | `sexualScore` mapped |
| Message + profile service specs | dating_policy reject path records `category: dating_policy`, `action: 'blocked'`; clean still allows |
| Admin unit/HTTP | `action=blocked` filter |

Skip Playwright / Agent 4.

### 12. Agent 4

**Skip.**

---

## Runtime topology

```text
Gate (message | profile field)
  → OpenAI checkContent (+ sexualScore)
  → evaluateContentPolicy
       ├─ openai flagged     → record blocked → enforce → 400
       ├─ dating_blocklist   → record dating_policy → enforce → 400
       ├─ dating_score       → record dating_policy → enforce → 400
       └─ allow (+ optional NEAR_MISS)
```

---

## Mute ladder rules (acceptance doc)

| Event | Counts toward ladder? |
|-------|------------------------|
| OpenAI `flagged` → `blocked` | Yes |
| Dating blocklist / score → `blocked` | **Yes** |
| Near-miss log only | No |
| `warned` (future) | N/A this story |

---

## Open questions / blockers

- None blocking Agent 1.
- Follow-up (not this story): HE/RTL blocklist; tune 0.85 from production near-miss metrics; optional warn tier.

---

## Next agent

```text
--agent 1 sprint 32 story 3
```

**Notes for next agent:**

1. Implement `dating-policy.ts` + extend `ModerationResult` first; then wire both gates; then admin `action` filter.
2. Update **all** moderation mocks with `sexualScore`.
3. Do not introduce `warned` writes or new 400 error codes.
4. Commit + write `agent-1-dev.md`.
