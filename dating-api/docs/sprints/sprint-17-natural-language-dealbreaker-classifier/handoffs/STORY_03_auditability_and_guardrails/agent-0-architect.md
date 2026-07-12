# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_auditability_and_guardrails.md](../../STORY_03_auditability_and_guardrails.md)  
**Sprint:** sprint-17-natural-language-dealbreaker-classifier  
**Date:** 2026-07-11  
**Status:** complete  

---

## Summary

- Make Story 2’s live hard dealbreakers **safe to ship**: operator audit (evidence + confidence), production telemetry, conservative + kill-switch guardrails, and a **read-only** user-visible inferred list.
- **Do not** implement soft ranking (Option C stays deferred). **Do not** change NEVER_BLOCKS-on-silence eligibility semantics.
- **No Prisma migration.** Kill switch = env at process start. Signals remain extract-at-read; guardrails wrap extraction output once and feed matches + profile + audit.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/holy-grail-matching/dealbreaker-guardrails.ts` (new) | create — confidence floor + kill-switch demote HARD→SOFT |
| `dating-api/src/holy-grail-matching/dealbreaker-signals-text.extract.ts` | updated — call guardrails at end of extract (or callers must; prefer single choke) |
| `dating-api/src/holy-grail-matching/retrieval/holy-grail-structured-db-json.ts` | updated only if extract already returns guarded signals |
| `dating-api/src/holy-grail-matching/eligibility-audit.types.ts` | updated — dealbreaker audit rows with evidence/confidence |
| `dating-api/src/holy-grail-matching/build-eligibility-audit.ts` | updated — emit dealbreaker rows from directional eval + searcher signals |
| `dating-api/src/me-profile/match-quality-audit.ts` | updated — attach HG dealbreaker eligibility slice for viewer→candidate |
| `dating-api/src/me-profile/me-matches.service.ts` | updated — dealbreaker classification + outcome telemetry |
| `dating-api/src/me-profile/dto/me-profile-response.dto.ts` | updated — `inferredDealbreakers` |
| `dating-api/src/me-profile/me-profile.service.ts` | updated — `toResponse` runs extract+guardrails |
| `dating-api/docs/engine/examples/dealbreaker-*.md` (new) | create — ≥3 worked examples |
| `dating-api/docs/ops/dealbreaker-kill-switch.md` (new) | create — ops runbook |
| `dating-ui` preferences or profile + i18n `en`/`es`/`he` | updated — read-only inferred list |
| Soft ranking / `compareWithStatus` / five-signal | **N/A — out of scope** |
| Prisma schema | **N/A — no migration** |

---

## Decisions (do not reverse without discussion)

### 1. Soft ranking stays out of Story 3

PM Story 2 close: soft ranking is a **sprint-level** follow-up, not Story 3 scope. This story is audit + guardrails + visibility only.

### 2. Single choke point: `applyDealbreakerGuardrails`

All live consumers (matches extract-at-read, `GET /me/profile`, audits) must see the **same** post-guardrail signals.

```ts
// dealbreaker-guardrails.ts
export const DEALBREAKER_HARD_MIN_CONFIDENCE = 0.9;

/** Env: DEALBREAKER_HARD_DISABLED_TAGS=smoking,jealousy (comma-separated closed tags) */
export function readDealbreakerHardDisabledTagsFromEnv(
  env?: NodeJS.ProcessEnv,
): ReadonlySet<string>;

/**
 * Demote HARD_EXCLUDE / HARD_REQUIRE → SOFT when:
 *  - confidence < DEALBREAKER_HARD_MIN_CONFIDENCE, OR
 *  - tag ∈ kill-switch set
 * Never upgrades SOFT → HARD. Never drops tags (SOFT remains for future ranking).
 */
export function applyDealbreakerGuardrails(
  signals: readonly DealbreakerSignal[],
  opts?: { readonly hardDisabledTags?: ReadonlySet<string> },
): readonly DealbreakerSignal[];
```

**Wire:** call inside `extractDealbreakerSignalsFromFreeText` **before return** (preferred — one call site) OR immediately after every extract call. Prefer inside extract so agent 1 cannot forget a caller.

**Confidence floor today:** hard phrase hits already emit `0.95`, soft `0.65`. Floor `0.9` is a **regression gate** for future pattern edits that might emit mid-confidence HARD — not a tunable “magic float knobs” product. Document in code comment + runbook: raising recall via lower confidence is **forbidden** without a new story.

### 3. Kill switch = process env (no DB, no deploy of code)

| Env | Meaning |
|-----|---------|
| `DEALBREAKER_HARD_DISABLED_TAGS` | CSV of closed taxonomy tags forced to SOFT-only for hard eligibility |

- Pattern matches `ADMIN_USER_IDS` / `ENGINE_READ_NORMALIZED` (direct env, restart to pick up).
- “Without a code deploy” = **ops changes env + restarts API pods** (or config reload if platform supports). Do **not** build an admin UI toggle this story.
- Empty / unset = no tags disabled.
- Invalid tags in CSV: ignore + log once at startup (or first read); do not throw.

Runbook: `dating-api/docs/ops/dealbreaker-kill-switch.md`.

### 4. Operator audit — extend HG eligibility audit + attach to admin match-quality

**A. Extend Layer 4 types** (`eligibility-audit.types.ts`):

```ts
export interface HolyGrailDealbreakerAuditRow {
  readonly tag: string;
  readonly result: MatchingDimensionResult; // MATCH | NO_MATCH | UNKNOWN | SKIPPED
  readonly classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE'; // only hard rows that entered eligibility
  readonly evidence: string;
  readonly confidence: number;
  readonly reasonCode: string;
  /** true when kill-switch or confidence floor demoted this tag before eval */
  readonly guardrailDemoted?: boolean;
}

export interface HolyGrailEligibilityAuditV1 {
  // ...existing fields...
  readonly dimensions: readonly HolyGrailDimensionAuditRow[];
  /** Present when searcher had hard dealbreaker dims (post-guardrail). */
  readonly dealbreakerDimensions?: readonly HolyGrailDealbreakerAuditRow[];
}
```

Bump is **additive** on same `auditVersion: 'holy_grail_eligibility_audit_v1'` **or** introduce `holy_grail_eligibility_audit_v1_1` if agent 1 prefers strict consumers — prefer **additive optional field** to avoid churn.

**B. `buildHolyGrailEligibilityAuditV1`:** accept searcher post-guardrail hard signals + `dealbreakerDimensions` from `HolyGrailDirectionalEvaluationResult`; join evidence/confidence by tag.

**C. Admin path:** extend `MatchQualityAuditReport` with optional:

```ts
holyGrailEligibility?: {
  overallHardEligibility: 'PASS' | 'FAIL';
  dealbreakerDimensions: HolyGrailDealbreakerAuditRow[];
};
```

Populate in `buildMatchQualityAuditJson` / `AdminMatchQualityService.getCandidateAudit` by running the same pair evaluation used for live list (viewer = admin-selected viewerUserId, candidate = profileId). Reuse `evaluateHolyGrailPairDirections` — do not invent a second eligibility path.

Admin UI (`/admin/match-quality/[profileId]`): show dealbreaker rows (tag, result, quote, confidence) when present — minimal table, no redesign.

### 5. Production telemetry

**Keep** existing `event=hg_dimension_outcomes` for GENDER/AGE/PROXIMITY.

**Add** parallel aggregate log on each `MeMatchesService.list` (bounded, not per-candidate spam):

```
event=hg_dealbreaker_outcomes profileId=<viewer>
  tags=smoking:PASS=n,FAIL=n,UNKNOWN=n;kids_required:PASS=n,...
  classifications=HARD_EXCLUDE=n,HARD_REQUIRE=n,SOFT=n
  confidenceHard=p50:0.95,p90:0.95
  killSwitchTags=<csv or none>
```

- New error code: `ME_MATCHES_HG_DEALBREAKER_OUTCOMES`.
- Classification volume: count **searcher’s post-guardrail signals** once per list request (not × candidates).
- Outcome counts: accumulate from `dealbreakerDimensions` both directions (same as Sprint 16 fixed dims).
- Confidence distribution: only HARD_* signals that survived guardrails (or include demoted as SOFT — document choice; prefer **post-guardrail** so ops sees what eligibility used).

### 6. Ambiguous-phrasing regression suite (API)

New spec: `dealbreaker-ambiguous-guardrails.spec.ts` (next to extract specs).

Must **not** emit HARD_EXCLUDE/HARD_REQUIRE for literals such as:

- "Not really into smokers, but not a dealbreaker"
- "used to smoke, quit two years ago" (self-fact / soft at most — not partner HARD)
- "I don't care about smoking"
- "prefer non-smokers if possible"
- "open to smokers"
- at least one kids + one values/social ambiguous case

File header comment: **breaking these tests = you made a dealbreaker fire on ambiguous text — do not delete**.

### 7. User visibility — read-only on profile API + preferences UI

**API** (`MeProfileResponseDto`):

```ts
export type InferredDealbreakerDto = {
  tag: string;
  classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  evidence: string;
  // confidence optional for UI; include for parity with audit
  confidence: number;
};

// on MeProfileResponseDto:
inferredDealbreakers: InferredDealbreakerDto[]; // hard only, post-guardrail; [] if none
```

- Compute in `toResponse` / `getForUser` via `extractDealbreakerSignalsFromFreeText` + filter HARD_* (same choke as matches).
- Copy framing is UI-owned; API returns structured facts only.
- **Do not** expose SOFT on this list this story (keeps mental model = “dealbreaker/requirement”).

**UI hang point (locked):** `/settings/preferences` — section below editable gender/age/distance, titled via i18n as inferred-from-your-text (mirror analysis “How we read”). Secondary optional one-liner link from `/dating/profile`.

**i18n:** new `AppCopySchema` section e.g. `inferredDealbreakers` in `en.ts` / `es.ts` / `he.ts` — TypeScript parity. Include:

- section title
- empty state
- dealbreaker vs requirement line templates (with `{quote}` / `{tag}` if needed)
- disclaimer: inferred from your profile text, not a setting you configured; edit story text to change

### 8. Worked examples (docs)

Under `dating-api/docs/engine/examples/`:

1. `dealbreaker-smoking-hard-exclude.md` (behavioral)
2. `dealbreaker-kids-hard-require.md` (lifestyle)
3. `dealbreaker-commitment-phobic-hard-exclude.md` (values/social)

Each: synthetic input text → classification → evidence → eligibility outcome vs silent / conflicting counterparty (cite NEVER_BLOCKS).

### 9. Eligibility semantics unchanged

- Kill switch / confidence floor only demote HARD→SOFT.
- `evaluateDealbreakerDimensions` + NEVER_BLOCKS unchanged.
- Soft ranking still deferred.

### 10. Prisma / persistence

**No migration.** Optional future: persist signals at analysis time for audit history — out of scope unless agent 1 finds a trivial existing JSON column; do not invent one.

---

## Service / function signatures

```ts
// dealbreaker-guardrails.ts — see Decision 2

// eligibility-audit
export function buildHolyGrailEligibilityAuditV1(args: {
  searcherProfileId: string;
  counterpartyProfileId: string;
  evaluatedAt: Date;
  dimensions: Record<HolyGrailDimensionKey, MatchingDimensionResult>;
  dealbreakerDimensions?: Readonly<Record<string, HolyGrailDimensionEvaluation>>;
  searcherHardSignals?: readonly DealbreakerSignal[]; // post-guardrail HARD_* only
}): HolyGrailEligibilityAuditV1;

// me-matches.service.ts helpers (new file ok)
export function accumulateDealbreakerOutcomeCounts(...): void;
export function formatDealbreakerOutcomeCountsForLog(...): string;
```

---

## Migration plan

- **Forward:** none (env var only)
- **Backfill:** none
- **Rollback:** unset `DEALBREAKER_HARD_DISABLED_TAGS`; revert code; eligibility returns to Story 2 behavior

---

## Integration points

| Component | Action |
|-----------|--------|
| Extract / HG mapping input | Guardrails on every signal list |
| `evaluateHolyGrailDirectional` | Unchanged contract; receives already-guarded signals |
| `MeMatchesService.list` | New dealbreaker telemetry log |
| `buildHolyGrailEligibilityAuditV1` + admin match-quality | Surface evidence + confidence |
| `GET /api/v1/me/profile` | `inferredDealbreakers` |
| dating-ui preferences + i18n | Read-only list |
| Soft ranking / compareWithStatus | **Do not touch** |

---

## Runtime topology

N/A — no cookie/proxy/socket changes. REST only (`/me/profile`, `/me/matches`, admin match-quality).

---

## E2E verification plan

**Affects:** eligibility **gating** (kill switch / confidence demotion) + profile **API** surface. **Not** ranking order.

| Item | Plan |
|------|------|
| Baseline keep green | `me-new-model-e2e.integration.spec.ts`, `me-new-model-e2e-eligibility.integration.spec.ts`, `me-new-model-e2e-ranking.integration.spec.ts`, `me-new-model-e2e-dealbreaker.integration.spec.ts` — **unmodified** assertions |
| New harness scenarios (Agent 4) | Extend dealbreaker E2E or sibling: (1) with kill switch env `DEALBREAKER_HARD_DISABLED_TAGS=smoking`, searcher “don’t want smokers” + counterparty “I smoke” → candidate **included** (HARD demoted); (2) `GET /api/v1/me/profile` returns `inferredDealbreakers` containing smoking HARD_EXCLUDE + evidence quote when aboutPartner has “don’t want smokers” |
| Ambiguous suite | Unit/regression — Agent 1; Agent 4 does not own it |
| Agent 4 | **Required** after agent 2 (kill switch changes live matches) |

---

## Tests / verification (for agent 1)

- [ ] Guardrails unit: confidence floor + kill switch demote; SOFT unchanged; invalid env tags ignored
- [ ] Ambiguous phrasing suite green + documented
- [ ] Eligibility audit includes evidence/confidence for hard FAIL/PASS/UNKNOWN rows
- [ ] Profile GET includes `inferredDealbreakers` (hard only)
- [ ] UI i18n en/es/he compile; preferences section renders empty + non-empty
- [ ] Baseline + Story 2 dealbreaker E2E stay green
- [ ] `prisma migrate deploy`: **N/A**
- [ ] Browser Network: N/A for sockets; optional manual preferences page smoke

---

## Open questions / blockers

- None blocking. Soft ranking remains deferred outside this story.
- Admin UI depth: minimum is show rows in existing candidate audit page; polish optional.

---

## Next agent

```text
--agent 1 sprint 17 story 3
```

**Notes for next agent:**

- Implement guardrails choke + audit + telemetry + profile DTO + UI read-only list + docs/runbook + ambiguous suite.
- Do **not** reconnect soft ranking or edit `compareWithStatus`.
- Preserve NEVER_BLOCKS; kill switch only demotes HARD→SOFT.
- After CR → `--agent 4 sprint 17 story 3` (required).
