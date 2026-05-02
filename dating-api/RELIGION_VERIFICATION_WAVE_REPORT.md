# Religion Verification Wave Report

**Date**: 2026-05-02  
**Duration**: ~45 minutes  
**Status**: COMPLETE ✅

---

## Executive Summary

This wave verified the stability of the previous Signals & Interests normalization and assessed the `religion` field for normalization candidacy.

**Key Findings**:
- ✅ Signals & Interests normalization remains stable (0% drift)
- ✅ Religion field assessed: **NO normalization needed**
- ✅ Religion is user input, not evaluation-derived
- ✅ All validation scripts pass

---

## Phase 1: Signals & Interests Verification

### Status: STABLE ✅

| Metric | Value |
|--------|-------|
| Total ANALYZED profiles | 14 |
| Drift rate | 0.0% |
| Signal mismatch | 0 |
| Interest mismatch | 0 |
| Casing drift | 0 |
| Missing denorm | 0 |
| Missing normalized | 0 |
| Tests passing | 34/34 |

### Validation Evidence

```
[validate-drift] Starting validation...

=== DRIFT VALIDATION REPORT ===

Total ANALYZED profiles: 14
Profiles checked: 14

Drift Counts:
  Signal mismatch: 0 (0.0%)
  Interest mismatch: 0 (0.0%)
  Casing drift: 0 (0.0%)
  Missing denorm: 0 (0.0%)
  Missing normalized: 0 (0.0%)

=== END REPORT ===

✓ No drift detected. All columns in sync.
```

### Spot-Check Results

```
=== SPOT CHECK: Denorm vs Normalized Columns ===

Profile: cmo5ms15z0005t5ocbng6g0zq
  Denorm interests: [walking, travel]
  Normalized interests: [walking, travel]  ← MATCH ✓
  Denorm signals: ED=5 LP=5 CS=null I=4 SB=6
  Normalized signals: emotionalDepth=5 lifestylePace=5 independence=4 socialBattery=6  ← MATCH ✓

=== COUNTS ===
Total ANALYZED: 14
Profiles with signals (normalized): 2
Profiles with denorm signals: 2  ← Perfect alignment
```

### Test Results

```
Test Suites: 1 passed, 1 total
Tests:       34 passed, 34 total
```

### Build Status

```
✓ npm run build
  Build completed successfully
```

### Recommendation

- ✅ Continue weekly drift monitoring
- ✅ No backfill needed
- ✅ Previous wave normalization is **stable and production-ready**

---

## Phase 2: Religion Field Assessment

### Status: NO ACTION REQUIRED ✅

| Metric | Value |
|--------|-------|
| Total profiles | 14 |
| ANALYZED profiles | 14 |
| Profiles with religion | 0 (0.0%) |
| Null religion | 14 (100.0%) |
| Valid ReligionSelf values | 0 |
| Invalid/legacy values | 0 |

### Key Findings

#### 1. Religion is User Input, NOT Evaluation-Derived

**Written by**:
- `MeProfileService` (POST/PATCH `/api/v1/me/profile`)
- Source: User form submission
- Validation: `@IsEnum(ReligionSelf)` at API layer

**NOT written by**:
- ❌ `MeProfileAnalysisService` (does not touch religion)
- ❌ Derived from `UserProfileEvaluation.evaluationJson`
- ❌ Extracted from text via LLM

#### 2. Religion is Already Canonical

**Source of truth**: `UserProfile.religion` column itself
- No denormalization needed (not derived from elsewhere)
- No normalized table needed (already in canonical form)
- Partner preferences already normalized: `UserProfilePreference.acceptedPartnerReligions` (Phase F)

#### 3. Religion Follows Different Pattern than Signals

| Aspect | Signals (emotionalDepth, etc.) | Religion |
|--------|--------------------------------|----------|
| **Source** | `evaluationJson` (LLM evaluation) | User form input |
| **Written by** | `MeProfileAnalysisService` | `MeProfileService` |
| **Pattern** | Evaluation → Denorm cache + Normalized table | User input → Direct storage |
| **Dual-write** | Yes (3 places: evaluationJson, denorm, normalized) | No (single column) |
| **Normalization need** | Yes (sync denorm/normalized with evaluationJson) | No (already canonical) |

#### 4. Read Paths

Religion is read by:
- Profile GET endpoint (`me-profile.service.ts` → `toResponse`)
- HG eligibility filter (`eligibility.evaluator.ts` → `evalReligion`)
- Match engine mapper (`me-profile-engine.mapper.ts` → `facts.religion`)

**Engine scoring**: Religion is NOT used in semantic matching payload (only in HG eligibility)

### Validation Evidence

```
=== RELIGION CONSISTENCY REPORT ===

Total profiles: 14
ANALYZED profiles: 14

Religion Field Status:
  With religion: 0 (0.0%)
  Null religion: 14 (100.0%)

Enum Validation:
  Valid ReligionSelf values: 0
  Invalid values: 0

✓ CONCLUSION: Religion does NOT need normalization
  Reason: Religion is user input stored in canonical form
  Pattern: User API → UserProfile.religion (source of truth)
  Different from signals: Signals are evaluation-derived → denorm cache + normalized table
  Religion is NOT evaluation-derived, NOT denormalized, NOT duplicated
```

### Valid ReligionSelf Enum Values

```
NONE, CHRISTIAN, JEWISH, MUSLIM, HINDU, BUDDHIST, 
SPIRITUAL_NON_AFFILIATED, OTHER, PREFER_NOT_TO_SAY
```

### Recommendation

- ✅ **NO normalization needed** for religion
- ✅ Religion is already in canonical form
- ✅ No drift risk (single source, no duplication)
- 💡 Optional enhancement: Add enum constraint at DB level (Prisma enum)
- 💡 Monitor for invalid values if legacy data exists in production

---

## Conclusion

### Completed Actions

| Phase | Action | Result |
|-------|--------|--------|
| **Phase 1** | Verify Signals & Interests drift | ✅ 0% drift, stable |
| **Phase 1** | Run spot-check validation | ✅ Perfect sync |
| **Phase 1** | Execute test suite | ✅ 34/34 passing |
| **Phase 1** | Verify build | ✅ Success |
| **Phase 2** | Create religion validation script | ✅ Created |
| **Phase 2** | Run religion consistency check | ✅ Executed |
| **Phase 2** | Assess normalization need | ✅ Not needed |
| **Phase 2** | Document source of truth pattern | ✅ Documented |

### No Schema Changes Required

- ✅ No migrations created
- ✅ No tables added
- ✅ No columns modified
- ✅ No code refactored
- ✅ Schema remains unchanged

### No Behavior Changes

- ✅ Matching/scoring logic unchanged
- ✅ Engine read source unchanged (still evaluationJson)
- ✅ HG eligibility logic unchanged
- ✅ API contracts unchanged

### Validation Scripts Created

1. ✅ `scripts/validate-signal-interest-drift.ts` (already existed)
2. ✅ `scripts/spot-check-db.ts` (already existed)
3. ✅ `scripts/validate-religion-consistency.ts` (new)

---

## Architecture Documentation

### Normalization Pattern (Signals & Interests)

```
User submits texts
    ↓
MeProfileAnalysisService.runForUser()
    ↓
EvaluateService.evaluateBatch() [LLM]
    ↓
EvaluateBatchResult (in-memory)
    ↓
$transaction [
    1. UserProfile.update (status + denorm columns)
    2. UserProfileEvaluation.create (evaluationJson) ← SOURCE OF TRUTH
    3. UserProfileSignal.deleteMany + upserts
    4. UserProfileInterest.deleteMany + creates
]
    ↓
Read path: Engine uses evaluationJson only (not denorm/normalized)
```

### User Input Pattern (Religion)

```
User submits form
    ↓
MeProfileService.update()
    ↓
Validation (@IsEnum(ReligionSelf))
    ↓
UserProfile.update (religion column) ← SOURCE OF TRUTH (already canonical)
    ↓
Read paths:
    - Profile GET endpoint
    - HG eligibility filter
    - Match engine mapper (facts.religion)
```

---

## Monitoring Plan

### Weekly Drift Check (Signals & Interests)

```bash
# Run every week
npx ts-node --project tsconfig.json scripts/validate-signal-interest-drift.ts

# If drift detected:
npx ts-node --project tsconfig.json scripts/backfill-normalized-tables.ts --apply
```

### Religion Consistency (As Needed)

```bash
# Run when investigating data quality issues
npx ts-node --project tsconfig.json scripts/validate-religion-consistency.ts
```

### Test Suite (CI/CD)

```bash
# Run on every PR
npm run build
npm test
```

---

## Next Steps

### No Immediate Action Required

This wave confirmed:
1. ✅ Signals & Interests normalization is stable
2. ✅ Religion does not need normalization

### Future Considerations (If Approved)

**Other HG Structured Facts** (similar to religion):
- `childrenStatus` (user input, not evaluation-derived)
- `wantsChildren` (user input, not evaluation-derived)
- `smokingFrequency` (user input, not evaluation-derived)
- `alcoholUse` (user input, not evaluation-derived)
- `education` (user input, not evaluation-derived)

**Assessment**: These follow the same pattern as religion (user input → direct storage). No normalization needed unless:
- They become evaluation-derived in the future
- Duplication/denormalization is introduced
- Read-path optimization requires indexed tables

**Read-Path Optimization** (Phase F+ pattern):
- Create query-optimized views/indexes on normalized tables
- Gradually migrate engine reads from evaluationJson to normalized tables
- Requires performance testing and feature flagging

---

## Files Changed

### New Files (1)

1. `scripts/validate-religion-consistency.ts` - Religion validation script

### Modified Files (0)

- No code changes
- No schema changes
- No migrations

---

## Commands Run

```bash
# Phase 1: Verification
✓ npx ts-node scripts/validate-signal-interest-drift.ts
✓ npx ts-node scripts/spot-check-db.ts
✓ npm test -- me-profile-analysis.service.spec.ts
✓ npm run build

# Phase 2: Religion Assessment
✓ npx ts-node scripts/validate-religion-consistency.ts
```

---

## Exit Criteria Met

- [x] Signals/Interests drift report confirms stable (0%)
- [x] Religion valid/invalid/null report exists
- [x] Report states religion does NOT need normalization
- [x] No behavior/schema changes (evidence-based decision)
- [x] Build passes
- [x] Tests pass (34/34)
- [x] All validation scripts execute successfully

---

**Wave Status**: ✅ COMPLETE  
**Recommendation**: Monitor Signals & Interests drift weekly. No action needed for religion.
