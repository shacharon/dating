# Canonical V2 Profile Model - Executive Summary

**Phase**: 1 (Design Only)  
**Date**: 2026-03-29  
**Status**: Ready for Review

---

## What Is This?

A **minimal, normalized projection layer** that sits between:
- **Input**: Raw `ProfileExtractionV2` JSON (with evidence, metadata, full detail)
- **Output**: Clean `CanonicalProfileV2` model (data kernel only)

**Purpose**: Prepare for indexed serving layer without changing current systems.

---

## Core Model (6 Fields)

```typescript
interface CanonicalProfileV2 {
  version: 'canonical_v2';
  profileId: string;
  extractedAt: string;
  
  signals: CanonicalSignals;      // 3 domains × 18 keys → numeric 1-10
  interests: CanonicalInterests;  // self + partner → string[] (tags only)
  negatives: CanonicalNegatives;  // self + partner → string[] (tags only)
  
  confidence: CanonicalConfidence;  // Per-domain + average (0-1)
  coverage: CanonicalCoverage;      // Fill rate + domain status
}
```

---

## Key Decisions

### What's In
- **Signals**: All 18 keys (14 official + 4 shadow), all 3 domains
- **Interests**: Self + partner only, tags as `string[]`
- **Negatives**: Self + partner only, tags as `string[]`
- **Confidence**: Per-domain (self, partner, relationship) + average
- **Coverage**: Fill rate, counts, domain status

### What's Out
- Metadata (promptVersion, textHash)
- Evidence quotes (signals, interests, negatives)
- Interest strength (explicit vs strong)
- Negative category/strength/confidence (per-item)
- Relationship domain for interests/negatives
- LLM usage/provenance
- Display text (summaries, insights, notes)

---

## Normalization Rules Summary

### Signals (SN-1 to SN-3)
- Allowlist: 18 canonical keys only
- Range: [1, 10], rounded to integers
- Nulls: Dropped (omitted from output)

### Interests (IN-1 to IN-4)
- Allowlist: 16 canonical tags
- Format: Lowercase, deduplicated `string[]`
- Domains: Self + partner only

### Negatives (NN-1 to NN-5)
- Filter: Confidence >= 0.3 only
- Format: Lowercase, deduplicated `string[]`
- Domains: Self + partner only

### Confidence (CC-1 to CC-2)
- Source: Per-domain from V2 base
- Average: Mean of 3 domains, rounded to 3 decimals

### Coverage (CC-3 to CC-4)
- Formula: (official signal count / 42) × 100
- Domain status: Copy from V2 or infer (>= 2 signals → OK)

---

## Example Transformation

### Input (V2 Extraction)
```json
{
  "base": {
    "self": {
      "signals": { "ambition": 7.8, "socialBattery": 3, "unknownKey": 5 },
      "confidence": 0.75
    }
  },
  "interests": {
    "self": [
      { "tag": "HIKING", "strength": "explicit", "evidence": "..." },
      { "tag": "hiking", "strength": "strong", "evidence": "..." }
    ]
  },
  "negatives": {
    "self": [
      { "tag": "smoking", "strength": "hard", "confidence": 0.95 },
      { "tag": "drama", "strength": "soft", "confidence": 0.25 }
    ]
  }
}
```

### Output (Canonical)
```json
{
  "signals": {
    "self": { "ambition": 8, "socialBattery": 3 }
  },
  "interests": {
    "self": ["hiking"]
  },
  "negatives": {
    "self": ["smoking"]
  },
  "confidence": {
    "self": 0.75,
    "average": 0.717
  },
  "coverage": {
    "signalFillRate": 5,
    "nonNullCount": 2
  }
}
```

**Transformations**:
- Rounded: 7.8 → 8
- Dropped: unknownKey (not canonical)
- Normalized: HIKING → hiking
- Deduped: Two hiking → one
- Filtered: drama (confidence 0.25 < 0.3)

---

## Risks (Top 3)

### 1. Loss of Negative Nuance (HIGH)
- Cannot distinguish hard dealbreakers from soft preferences
- Cannot filter by category (behavioral, lifestyle, values, social)
- Mitigation: Query raw JSON if nuance needed

### 2. Relationship Domain Loss (MEDIUM)
- Interests/negatives for relationship dropped
- Mitigation: Raw V2 preserves data, can restore in v3

### 3. Schema Evolution (MEDIUM)
- Adding keys requires multi-system updates
- Mitigation: Version schema explicitly, test compatibility

---

## Phase 1 Scope (This Document)

**What's Included**:
- ✓ TypeScript interfaces
- ✓ Normalization rules (14 rules total)
- ✓ Projection function specifications
- ✓ Mapping contract (V2 → Canonical)
- ✓ Risk assessment
- ✓ Self-check validation report

**What's NOT Included**:
- ✗ Implementation code
- ✗ Database schema
- ✗ Migrations
- ✗ Scoring integration
- ✗ Persistence changes

---

## Validation Result

| Category | Score | Status |
|----------|-------|--------|
| Requirements coverage | 24/24 | ✓ PASS |
| Mapping completeness | 25/28 | ✓ PASS |
| Rule coverage | 14/14 | ✓ PASS |
| Simplification applied | 10/10 | ✓ PASS |
| Architectural goals | 6/6 | ✓ PASS |

**Overall**: ✓ **PASS** - Design complete and validated

---

## Documents Delivered

1. **`CANONICAL_V2_DESIGN.md`** (14 sections, 600+ lines)
   - Complete interfaces
   - Projection functions
   - Mapping table
   - Example transformation
   - Architecture diagram

2. **`CANONICAL_V2_RISKS.md`** (8 risks, mitigation strategies)
   - Critical, medium, low risks
   - Decision log
   - Recommendations

3. **`CANONICAL_V2_VALIDATION.md`** (20 sections, validation report)
   - Requirements validation
   - Mapping completeness
   - Formula validation
   - Test coverage requirements
   - Final verdict: PASS

4. **Updated Plan** (`canonical_v2_profile_model_6b9ded63.plan.md`)
   - Reflects all simplifications
   - Updated mapping functions
   - Revised validation criteria

---

## Next Steps

**For Implementation** (When Ready):
1. Create `src/canonical/` directory
2. Implement types file
3. Implement projection service
4. Write unit tests (10 minimum)
5. Validate with real V2 extraction data

**For Phase 2** (Future):
1. Design Prisma schema for canonical storage
2. Plan indexing strategy
3. Design backfill migration
4. Evaluate storage tradeoffs

---

## Quick Reference

**Core Type**: `CanonicalProfileV2`  
**Projection Function**: `projectToCanonical(extraction, profileId) → CanonicalProjectionResult`  
**Size**: ~750 bytes (80% reduction vs raw V2)  
**Domains**: Signals (3), Interests (2), Negatives (2), Confidence (4), Coverage (1)  
**Version**: `canonical_v2`

**Status**: Design phase complete. Ready for approval and implementation.
