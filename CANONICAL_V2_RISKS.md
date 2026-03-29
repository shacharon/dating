# Canonical V2 Profile Model - Risk Assessment

**Date**: 2026-03-29  
**Phase**: Design (Phase 1)  
**Status**: Pre-Implementation

---

## Critical Risks

### RISK-1: Loss of Nuance in Negatives (HIGH)

**Issue**: Flattening negatives to `string[]` discards:
- **Strength**: Cannot distinguish hard dealbreakers from soft preferences
- **Category**: Cannot filter by behavioral vs lifestyle vs values vs social
- **Confidence**: Cannot apply quality thresholds at query time

**Example Scenario**:
```typescript
// Raw V2 has:
{ tag: 'smoking', strength: 'hard', confidence: 0.95 }  // Absolute dealbreaker
{ tag: 'pets', strength: 'soft', confidence: 0.6 }      // Mild preference

// Canonical only has:
['pets', 'smoking']  // Equal weight, lost distinction
```

**Impact**:
- If match engine needs "hard dealbreakers only" filter → must query raw JSON
- Cannot implement "soft preference deduction" vs "hard cap" logic on canonical alone
- Future matching features constrained by oversimplification

**Probability**: 70% that Phase 2-3 matching will need strength/confidence

**Mitigation Options**:
1. **Accept limitation**: Query raw JSON when nuance needed (adds latency)
2. **Restore partial metadata**: Add `hardDealbreakers: string[]` separate from `softNegatives: string[]`
3. **Defer decision**: Keep canonical simple for Phase 1, revisit in Phase 2 after matching integration

**Recommendation**: Accept limitation for Phase 1. Monitor matching requirements during Phase 2 planning.

---

### RISK-2: Relationship Domain Loss for Interests/Negatives (MEDIUM)

**Issue**: Canonical excludes `interests.relationship` and `negatives.relationship` entirely.

**Rationale**:
- V2 initial disables relationship negatives (always `[]`)
- Relationship interests have unclear semantics

**Impact**:
- If V2 later enables relationship negatives → canonical schema outdated
- Cannot analyze "relationship prefers X" patterns
- Breaking change if added back (requires canonical_v3)

**Probability**: 30% that relationship negatives become useful

**Mitigation**:
- Document explicitly: canonical_v2 = self + partner only
- Raw V2 preserves relationship data
- Schema version bump if restored: canonical_v2 → canonical_v3

**Recommendation**: Acceptable. Low product value currently.

---

### RISK-3: Interest Strength Loss (LOW-MEDIUM)

**Issue**: Flattening interests to `string[]` loses explicit vs strong distinction.

**Example**:
```typescript
// Raw: "I LOVE hiking" → strength: 'explicit'
// Raw: "go to gym regularly" → strength: 'strong'

// Canonical: ['gym', 'hiking']  // Equal weight
```

**Impact**:
- Cannot prioritize explicit mentions in matching
- Cannot implement "strong shared interests" bonus
- Minor: most interest logic treats any match equally

**Probability**: 20% that matching needs strength

**Mitigation**: Raw JSON preserves strength. Query if needed.

**Recommendation**: Acceptable simplification.

---

## Medium Risks

### RISK-4: Schema Evolution Coordination (MEDIUM)

**Issue**: Adding new signal keys or interest tags requires updates across:
- Extraction prompts
- `ExtractionV2Result` interface
- `CanonicalProfileV2` interface
- Projection logic
- Prisma schema (Phase 2)
- Match engine consumers (Phase 3)

**Impact**: Multi-step coordination, migration complexity

**Mitigation**:
- Version canonical schema explicitly (`canonical_v2`, `canonical_v3`)
- Keep projection idempotent
- Write migration scripts for schema changes
- Test with old + new versions

**Recommendation**: Standard schema evolution process. Document version compatibility matrix.

---

### RISK-5: Coverage Formula Divergence (LOW-MEDIUM)

**Issue**: Canonical uses same formula as current `coverageScore` (14 official × 3 = 42 slots). If official keys expand, formula changes.

**Impact**:
- Coverage percentages not comparable across schema versions
- Historical coverage data ambiguous without version context

**Mitigation**:
- Document formula explicitly per version
- Store `totalSlots` in coverage object (already done)
- Include version in canonical model

**Recommendation**: Monitor official key additions. Consider normalized coverage metric.

---

### RISK-6: Duplicate Storage Cost (LOW)

**Issue**: Canonical data overlaps 80% with `extractionJson` content.

**Storage Math**:
- Raw V2: ~15KB per profile (with evidence)
- Canonical: ~2KB per profile (stripped)
- If stored separately: +2KB per profile overhead

**Impact**: 13% storage increase if both stored

**Mitigation**:
- Phase 1: In-memory projection only (no storage)
- Phase 2: Evaluate storage tradeoff (speed vs cost)
- Phase 3: Drop redundant JSON columns after serving migration

**Recommendation**: Defer storage decision to Phase 2.

---

## Low Risks

### RISK-7: Loss of Evidence Traceability (LOW)

**Issue**: Cannot see "why" a signal was scored without fetching raw JSON.

**Impact**: Debugging requires extra lookup. Minor: evidence rarely needed at scale.

**Mitigation**: Raw JSON always available. Add helper `getEvidenceBySignal()`.

**Recommendation**: Acceptable. Evidence is UI/debug concern, not serving concern.

---

### RISK-8: Confidence Semantics Ambiguity (LOW)

**Issue**: Confidence is LLM self-reported, may not reflect true data quality.

**Example**: LLM outputs high confidence for sparse signals.

**Impact**: Confidence used as quality filter may be unreliable.

**Mitigation**:
- Keep `domainStatus` as explicit quality marker
- Document: confidence = LLM opinion, coverage = objective measure
- Use both for quality decisions

**Recommendation**: Acceptable. Matches current behavior.

---

## Risk Summary Matrix

| Risk | Severity | Probability | Impact | Mitigation Priority |
|------|----------|-------------|--------|---------------------|
| RISK-1: Negative nuance loss | High | 70% | High | Monitor in Phase 2 |
| RISK-2: Relationship domain loss | Medium | 30% | Medium | Document limitation |
| RISK-3: Interest strength loss | Low-Med | 20% | Low | Accept for Phase 1 |
| RISK-4: Schema evolution | Medium | 80% | Medium | Version explicitly |
| RISK-5: Coverage formula divergence | Low-Med | 40% | Low | Document per version |
| RISK-6: Duplicate storage | Low | 100% | Low | Defer to Phase 2 |
| RISK-7: Evidence traceability | Low | 60% | Low | Add helper function |
| RISK-8: Confidence ambiguity | Low | 50% | Low | Document semantics |

---

## Decision Log

### DEC-1: Remove Metadata Field

**Decision**: Exclude `promptVersion` and `textHash` from canonical model.

**Rationale**: 
- Metadata is extraction concern, not serving concern
- Version lives in top-level `version: 'canonical_v2'`
- Raw JSON has full provenance

**Status**: Approved

---

### DEC-2: Interests/Negatives as Flat Arrays

**Decision**: Use `string[]` instead of structured objects.

**Rationale**:
- 80% of use cases only need "does this profile have tag X?"
- Simpler to index, query, serialize
- Strength/confidence available in raw JSON if needed

**Tradeoff**: Cannot implement nuanced matching on canonical alone.

**Status**: Approved

---

### DEC-3: Exclude Relationship Domain for Interests/Negatives

**Decision**: Only store self + partner, drop relationship.

**Rationale**:
- V2 disables relationship negatives
- Relationship interests semantics unclear
- Can restore in canonical_v3 if needed

**Status**: Approved

---

### DEC-4: Keep All Signal Domains

**Decision**: Preserve self + partner + relationship signals (unchanged from V2).

**Rationale**:
- Matching uses self signals only currently, but may use partner/relationship in future
- Signals are core data, warrant full preservation
- Minimal space cost (~150 bytes per profile)

**Status**: Approved

---

## Recommendations for Phase 2

1. **Monitor matching requirements**: If RISK-1 materializes, consider adding:
   ```typescript
   negatives: {
     self: { hard: string[]; soft: string[] };
     partner: { hard: string[]; soft: string[] };
   }
   ```

2. **Evaluate storage tradeoff**: Measure query performance gain vs storage cost before committing to separate canonical table.

3. **Add version compatibility tests**: Ensure projection works with multiple V2 extraction versions.

4. **Consider denormalization strategy**: If serving layer needs fast negatives queries, consider separate `profile_hard_dealbreakers` table with foreign key.

---

## Sign-Off Checklist

- [x] All requested fields included (signals, interests, negatives, confidence, coverage)
- [x] All requested exclusions applied (summaries, chips, explanations, metadata)
- [x] Simplifications applied (flat arrays, no relationship domain)
- [x] Risks identified and assessed
- [x] Mitigation strategies documented
- [x] No DB schema changes (Phase 1)
- [x] No scoring changes
- [x] No persistence changes

**Phase 1 Status**: Design complete, ready for review.
