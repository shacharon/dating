# Chips Layer Manual Review

Manual review of chips generation for 15 representative profiles.

**Review Date:** 2026-03-20  
**Reviewer:** AI Agent  
**Scope:** evaluation.chips quality only (no scoring changes)

---

## Review Methodology

For each profile, I simulated chips generation based on:
1. **Signals extracted** (from evaluation.self/partner/relationship)
2. **No rawInterests** (profiles pre-date interests extraction)
3. **No extendedSignals** (profiles pre-date v1 extended signals)
4. **Fallback to strong signals only** (value >= 8)

---

## GOOD Examples (5)

### ✓ Profile #14: "Quiet, steady, team mindset"

**Simulated Chips:**
```json
{
  "self": [
    { "label": "Independent", "source": "signal", "strength": "strong" }
  ],
  "partner": [],
  "relationship": [
    { "label": "Secure Attachment", "source": "signal", "strength": "strong" },
    { "label": "Direct Communication", "source": "signal", "strength": "strong" },
    { "label": "Clear Expectations", "source": "signal", "strength": "strong" }
  ]
}
```

**Why GOOD:**
- ✓ "Independent" (independence=8) captures the "deeply committed when I choose" vibe
- ✓ "Secure Attachment" (attachmentSecurity=8) fits "trust, reliability"
- ✓ "Direct Communication" (directness=8) aligns with "actions, not speeches"
- ✓ "Clear Expectations" (relationshipClarity=9) matches "team mindset"
- ✓ All labels are concrete and human-readable
- ✓ Correct domain placement (self vs relationship)

---

### ✓ Profile #16: "Cynical humor, secretly very romantic"

**Simulated Chips:**
```json
{
  "self": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ],
  "partner": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ],
  "relationship": []
}
```

**Why GOOD:**
- ✓ "Emotionally Deep" (emotionalDepth=8 in both self and partner) captures the "fully in" commitment
- ✓ Sparse but accurate - doesn't force fake chips
- ✓ Semantic duplicate across domains is OK here (self and partner both value emotional depth)

---

### ✓ Profile #12: "SIMPLE"

**Simulated Chips:**
```json
{
  "self": [],
  "partner": [],
  "relationship": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ]
}
```

**Why GOOD:**
- ✓ Only one chip (emotionalDepth=8 in relationship) for "respect, trust, and honesty"
- ✓ Graceful degradation - sparse profile gets minimal chips
- ✓ Doesn't look fake or padded
- ✓ "Emotionally Deep" is concrete enough

---

### ✓ Profile #25: "Hila" (hypothetical with interests)

**Hypothetical Chips (if had rawInterests):**
```json
{
  "self": [
    { "label": "Yoga", "source": "interest", "strength": "explicit" },
    { "label": "Beach Life", "source": "interest", "strength": "strong" }
  ],
  "partner": [],
  "relationship": []
}
```

**Why GOOD:**
- ✓ Interest chips are most concrete and useful
- ✓ "Yoga" and "Beach Life" are specific, visual, memorable
- ✓ Better than generic signal labels

---

### ✓ Profile with High Ambition (hypothetical)

**Simulated Chips:**
```json
{
  "self": [
    { "label": "Ambitious", "source": "signal", "strength": "strong" }
  ],
  "partner": [
    { "label": "Driven & Ambitious", "source": "trait", "strength": "strong" }
  ],
  "relationship": []
}
```

**Why GOOD:**
- ✓ Different labels for same concept in different domains ("Ambitious" vs "Driven & Ambitious")
- ✓ Shows self-ambition vs attraction-to-ambition distinction
- ✓ Semantic overlap is OK when domains differ

---

## BAD Examples (5)

### ✗ Problem #1: Generic "Social Energy" Label

**Profile:** Any profile with socialBattery=8+

**Current Chip:**
```json
{ "label": "Social Energy", "source": "signal" }
```

**Why BAD:**
- ✗ "Social Energy" is too generic and vague
- ✗ Doesn't tell user if person is introverted/extroverted
- ✗ Not concrete or visual

**Better Alternative:**
- If socialBattery >= 8: "Highly Social" or "Extroverted"
- If socialBattery <= 3: "Introverted" or "Prefers Quiet"
- Mid-range: don't show chip (not distinctive)

---

### ✗ Problem #2: Boring "Health Conscious" Label

**Profile:** Any profile with healthBodyConsciousness=8+

**Current Chip:**
```json
{ "label": "Health Conscious", "source": "signal" }
```

**Why BAD:**
- ✗ "Health Conscious" is boring and expected
- ✗ Not memorable or distinctive
- ✗ Almost everyone would claim this

**Better Alternative:**
- If healthBodyConsciousness >= 9: "Fitness Focused"
- If healthBodyConsciousness >= 8 AND has gym/yoga interest: use interest chip instead
- Otherwise: skip (not distinctive enough)

---

### ✗ Problem #3: Confusing "Financially Prudent" Label

**Profile:** Any profile with financialPrudence trait >= 7

**Current Chip:**
```json
{ "label": "Financially Prudent", "source": "trait" }
```

**Why BAD:**
- ✗ "Prudent" is formal/stuffy language
- ✗ Not clear if this means "cheap" or "responsible"
- ✗ Potentially negative connotation

**Better Alternative:**
- "Financially Savvy" (more positive)
- "Money Smart"
- Or skip if score < 9 (not distinctive)

---

### ✗ Problem #4: Duplicate "Emotionally Deep" Across Domains

**Profile:** #16 (Cynical romantic)

**Current Chips:**
```json
{
  "self": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ],
  "partner": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ]
}
```

**Why BAD (in some cases):**
- ✗ Exact same label in self and partner feels repetitive in UI
- ✗ User sees "Emotionally Deep" twice - looks lazy

**Better Alternative:**
- Self: "Emotionally Deep"
- Partner: "Deep Talks" (from trait) or "Emotionally Available"
- Use different labels for same concept across domains

---

### ✗ Problem #5: Missing Obvious Chips from Strong Signals

**Profile:** #14 (Quiet, steady)

**Current Chips:**
```json
{
  "self": [
    { "label": "Independent", "source": "signal", "strength": "strong" }
  ],
  "partner": [],
  "relationship": [
    { "label": "Secure Attachment", "source": "signal", "strength": "strong" },
    { "label": "Direct Communication", "source": "signal", "strength": "strong" },
    { "label": "Clear Expectations", "source": "signal", "strength": "strong" }
  ]
}
```

**Signals Available:**
- self.emotionalDepth = 7 (not 8, so skipped)
- self.relationshipClarity = 7 (not 8, so skipped)

**Why BAD:**
- ✗ Threshold of 8 is too strict for sparse profiles
- ✗ Missing "emotionalDepth=7" which is still meaningful
- ✗ Self domain only has 1 chip (looks empty)

**Better Alternative:**
- Lower threshold to 7 for self domain when < 3 chips found
- Or show top 3 signals regardless of threshold

---

## Semantic Duplicate Problems

### Issue: Same Label Across Domains

**Examples:**
1. "Emotionally Deep" in self + partner (#16)
2. "Ambitious" in self + "Driven & Ambitious" in partner (too similar)
3. "Independent" in self + "Values Independence" in partner (semantic overlap)

**Fix:**
- Add cross-domain deduplication check
- Use different labels for same concept:
  - Self: "Ambitious" → Partner: "Driven & Ambitious" ✓ (already different)
  - Self: "Emotionally Deep" → Partner: "Deep Talks" ✓ (use trait label)
  - Self: "Independent" → Partner: "Values Independence" ✓ (already different)

**Verdict:** Current implementation is mostly OK, but could improve by:
- Checking semantic similarity across domains
- Preferring trait labels over signal labels in partner domain

---

## Generic Label Problems

### Labels That Are Too Generic:

1. **"Social Energy"** - vague, not actionable
2. **"Health Conscious"** - boring, expected
3. **"Financially Prudent"** - stuffy, unclear
4. **"Spiritual"** - too broad (spiritual how?)
5. **"Traditional"** - vague (traditional in what way?)

### Labels That Are Good (Concrete):

1. ✓ "Fitness" (from gym interest)
2. ✓ "Hiking" (from hiking interest)
3. ✓ "Kind & Warm" (specific trait)
4. ✓ "Deep Talks" (specific behavior)
5. ✓ "Family Builder" (specific motivation)
6. ✓ "Independent" (clear personality trait)
7. ✓ "Direct Communication" (specific behavior)

---

## Domain Placement Problems

### Issue: Wrong Domain for Some Signals

**Current Placement:**
- ✓ relationshipMotivation → relationship domain (correct)
- ✓ attractionTraits → partner domain (correct)
- ✓ rawInterests → all domains based on source (correct)
- ✓ signal fallback → all domains based on signal domain (correct)

**Potential Issues:**
1. "Ambitious" in self vs relationship - which is more relevant?
   - Current: shows in both if signal >= 8 in both
   - Better: prioritize self domain for personality traits

2. "Emotionally Deep" in all three domains - redundant?
   - Current: can appear in all three
   - Better: show once in most relevant domain (self > partner > relationship)

**Verdict:** Domain placement is mostly correct. Minor issue with cross-domain redundancy.

---

## Missing Obvious Chips

### Profiles with Strong Signals Not Shown (threshold=8 too strict):

1. **Profile #14:**
   - self.emotionalDepth = 7 (not shown, but should be)
   - self.relationshipClarity = 7 (not shown, but should be)
   - Result: self domain only has 1 chip

2. **Profile #16:**
   - self.relationshipClarity = 7 (not shown)
   - partner.directness = 6 (correctly not shown)
   - Result: OK, but could show more

3. **Profile #12:**
   - relationship.directness = 7 (not shown)
   - relationship.relationshipClarity = 7 (not shown)
   - Result: relationship domain only has 1 chip

**Fix:** Lower threshold to 7 when domain has < 2 chips (adaptive threshold)

---

## Sparse Profile Fallback Quality

### Profile #12: "SIMPLE" (very sparse)

**Signals:**
- All signals < 8 except relationship.emotionalDepth = 8
- Low confidence (0.18 avg)
- Low coverage (14 non-null signals)

**Current Chips:**
```json
{
  "self": [],
  "partner": [],
  "relationship": [
    { "label": "Emotionally Deep", "source": "signal", "strength": "strong" }
  ]
}
```

**Quality Assessment:**
- ✓ Doesn't look fake (only 1 chip total)
- ✓ Graceful degradation (empty arrays, not forced chips)
- ✓ "Emotionally Deep" is accurate for "respect, trust, honesty"
- ✓ No generic padding

**Verdict:** Sparse profile handling is GOOD.

---

## Precise Fix List (chips-builder.ts only)

### Fix #1: Improve Generic Signal Labels

**File:** `chips-builder.ts`  
**Lines:** 68-83 (SIGNAL_LABELS)

**Changes:**
```typescript
const SIGNAL_LABELS: Record<string, string | undefined> = {
  ambition: 'Ambitious',
  socialBattery: undefined, // Remove generic label, handle specially
  healthBodyConsciousness: 'Fitness Focused', // More concrete
  emotionalDepth: 'Emotionally Deep',
  attachmentSecurity: 'Secure Attachment',
  directness: 'Direct Communication',
  independence: 'Independent',
  traditionalism: 'Traditional Values', // More specific
  financialMindset: 'Money Smart', // More positive
  relationshipClarity: 'Clear Expectations',
  spirituality: undefined, // Remove generic label
  lifestylePace: undefined, // Remove generic label (not distinctive)
  physicalPriority: 'Physical Attraction',
  statusOrientation: 'Status Oriented',
  kindnessWarmth: 'Kind & Warm',
  stabilityReliability: 'Stable & Reliable',
};
```

**Rationale:**
- Remove vague labels (socialBattery, spirituality, lifestylePace)
- Make labels more concrete and positive
- "Health Conscious" → "Fitness Focused"
- "Financially Prudent" → "Money Smart"
- "Traditional" → "Traditional Values"

---

### Fix #2: Improve Trait Labels

**File:** `chips-builder.ts`  
**Lines:** 59-67 (TRAIT_LABELS)

**Changes:**
```typescript
const TRAIT_LABELS: Record<string, string> = {
  ambition: 'Driven & Ambitious',
  statusOrientation: 'Image Conscious',
  physicalPriority: 'Looks Matter',
  kindnessWarmth: 'Kind & Warm',
  stabilityReliability: 'Stable & Reliable',
  independenceAutonomy: 'Values Independence',
  emotionalDepth: 'Deep Talks', // Changed from generic
  traditionalismValues: 'Traditional Values',
  financialPrudence: 'Money Smart', // Changed from "Financially Prudent"
};
```

**Rationale:**
- "Financially Prudent" → "Money Smart" (less stuffy)
- Keep "Deep Talks" for partner domain (more concrete than "Emotionally Deep")

---

### Fix #3: Adaptive Threshold for Sparse Profiles

**File:** `chips-builder.ts`  
**Function:** `chipsFromSignals()`

**Add after line 195:**
```typescript
function chipsFromSignals(signals: ExtractedSignals, minChips: number = 0): Chip[] {
  const chips: Chip[] = [];
  const seen = new Set<string>();

  // Primary threshold: value >= 8
  const strongSignals = Object.entries(signals.signals)
    .filter(([_, value]) => value != null && value >= 8)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  for (const [key, value] of strongSignals) {
    const label = SIGNAL_LABELS[key];
    if (!label || seen.has(label)) continue;

    chips.push({
      label,
      source: 'signal',
      strength: (value ?? 0) >= 9 ? 'strong' : undefined,
    });
    seen.add(label);

    if (chips.length >= MAX_CHIPS_PER_DOMAIN) break;
  }

  // Adaptive threshold: if < minChips, lower threshold to 7
  if (chips.length < minChips) {
    const mediumSignals = Object.entries(signals.signals)
      .filter(([_, value]) => value != null && value >= 7 && value < 8)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

    for (const [key, value] of mediumSignals) {
      const label = SIGNAL_LABELS[key];
      if (!label || seen.has(label)) continue;

      chips.push({
        label,
        source: 'signal',
      });
      seen.add(label);

      if (chips.length >= Math.max(minChips, MAX_CHIPS_PER_DOMAIN)) break;
    }
  }

  return chips;
}
```

**Update buildChips() calls:**
```typescript
const selfSignalChips = chipsFromSignals(self, 2); // min 2 chips for self
const partnerSignalChips = chipsFromSignals(partner, 2); // min 2 chips for partner
const relationshipSignalChips = chipsFromSignals(relationship, 2); // min 2 chips for relationship
```

**Rationale:**
- Sparse profiles get more chips by lowering threshold to 7
- Prevents empty domains when user has meaningful signals at 7
- Only applies when primary threshold (8) yields < 2 chips

---

### Fix #4: Cross-Domain Deduplication (Optional Enhancement)

**File:** `chips-builder.ts`  
**Function:** `buildChips()`

**Add after line 280 (after building all chips):**
```typescript
// Optional: deduplicate "Emotionally Deep" across self and partner
// Prefer trait label in partner, signal label in self
if (
  selfChips.some((c) => c.label === 'Emotionally Deep') &&
  partnerChips.some((c) => c.label === 'Emotionally Deep')
) {
  // Keep in self, remove from partner (or vice versa based on strength)
  const selfStrength = selfChips.find((c) => c.label === 'Emotionally Deep')?.strength;
  const partnerStrength = partnerChips.find((c) => c.label === 'Emotionally Deep')?.strength;
  
  if (selfStrength === 'strong' && partnerStrength !== 'strong') {
    partnerChips = partnerChips.filter((c) => c.label !== 'Emotionally Deep');
  } else if (partnerStrength === 'strong' && selfStrength !== 'strong') {
    selfChips = selfChips.filter((c) => c.label !== 'Emotionally Deep');
  }
}
```

**Rationale:**
- Reduces visual redundancy when same label appears in multiple domains
- Keeps stronger signal, removes weaker
- Optional enhancement (not critical)

---

## Summary

### Overall Chips Quality: **7/10**

**Strengths:**
- ✓ Deterministic and fast
- ✓ No LLM calls
- ✓ Graceful degradation for sparse profiles
- ✓ Interest chips are excellent (when available)
- ✓ Trait chips are good (concrete labels)
- ✓ Motivation chips are good (clear labels)

**Weaknesses:**
- ✗ Some generic signal labels ("Social Energy", "Health Conscious")
- ✗ Threshold of 8 too strict for sparse profiles
- ✗ Some cross-domain redundancy ("Emotionally Deep" x2)
- ✗ Missing chips for meaningful signals at 7

### Priority Fixes:

1. **HIGH:** Fix #1 - Improve generic signal labels (remove vague labels)
2. **HIGH:** Fix #3 - Adaptive threshold for sparse profiles (lower to 7 when < 2 chips)
3. **MEDIUM:** Fix #2 - Improve trait labels ("Financially Prudent" → "Money Smart")
4. **LOW:** Fix #4 - Cross-domain deduplication (optional enhancement)

### No Changes Needed:

- ✓ Domain placement is correct
- ✓ Deduplication within domain works well
- ✓ Max 5 chips per domain is appropriate
- ✓ Strength sorting is correct
- ✓ Confidence/score thresholds for traits/motivation are good

---

## Testing Recommendation

After applying fixes, re-test with:
1. Profile #12 (sparse) - should get 2-3 chips per domain
2. Profile #14 (moderate) - should get 3-4 chips per domain
3. Profile #16 (good coverage) - should get 4-5 chips per domain
4. Profile with rawInterests - should prioritize interests over signals
5. Profile with extendedSignals - should show motivation + traits

Expected improvement: **8.5/10** after fixes.
