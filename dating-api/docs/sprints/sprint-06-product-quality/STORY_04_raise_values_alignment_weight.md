# Story 4: Raise valuesAlignment weight

**Sprint:** 6  
**Status:** Not started  
**Depends on:** Story 2 (optional)

---

## Why

The final compatibility formula weights `valuesAlignment` at only **5%**:

```
0.35·aToB + 0.35·bToA + 0.25·relationshipFit + 0.05·valuesAlignment
```

Tier 1 values signals (traditionalism, spirituality, financialMindset, relationshipClarity, lifestylePace, attachmentSecurity) are among the most predictive for long-term compatibility but barely move the final score.

---

## What

**As a** user seeking values-aligned matches  
**I want** core values differences to meaningfully affect my match score  
**So that** spiritually or financially mismatched pairs rank lower

### Acceptance criteria

- [ ] **Formula updated** in `engine/scoring.ts`:
  - Proposed: `0.30·aToB + 0.30·bToA + 0.25·relationshipFit + 0.15·valuesAlignment`
  - Architect may adjust ±0.05 if tests show better calibration; must document final weights
- [ ] **Weights sum to 1.0** — verified in unit test
- [ ] **Match engine tests updated** — golden/fixture scores recalculated
- [ ] **Regression test** — pair with large Tier 1 gap scores lower than pair with large Tier 3 gap (lifestylePace vs physicalPriority)
- [ ] **Document in match-engine-overview.md** — formula section updated
- [ ] **No change to computeValuesAlignment()** — only the weight in `compatibility()` changes
- [ ] **Explain output** — if match explain includes component breakdown, valuesAlignment contribution visible

### Out of scope (this story)

- Changing Tier 1 key list
- Changing pair score curve `(1−gap/10)²`
- A/B test infrastructure

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_04_raise_values_alignment_weight/agent-0-architect.md` after architect run.

Current code (`dating-api/src/engine/scoring.ts`):

```typescript
return 0.35 * aToB + 0.35 * bToA + 0.25 * relationshipFit + 0.05 * valuesAlignment;
```

Impact: existing match rankings will shift. PM handoff should note this as expected behavior change.

---

## Definition of done

- [ ] New weights in `scoring.ts`
- [ ] `scoring.spec.ts` + `match-engine.spec.ts` pass with updated expectations
- [ ] Documentation updated
- [ ] Sample compare output attached in PM handoff showing values-sensitive pair delta

---

## Manual smoke

1. Compare two pairs in dev: (A) high spirituality gap, (B) high physicalPriority gap → A ranks lower after change  
2. Identical profiles still score ~100

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Data-driven weight calibration | future, needs analytics (Sprint 7) |
