# Canonical Mapper Implementation - Verification Report

**Date**: 2026-03-29  
**Status**: ✓ COMPLETE  
**Test Result**: 10/10 checks passed

---

## Implementation Summary

### 1. Mapper Created

**File**: `dating-api/src/canonical/canonical-projection.ts`

**Function**: `projectToCanonicalArrays(extraction) → CanonicalArrays`

**Output**:
```typescript
interface CanonicalArrays {
  interests_self: string[];
  interests_partner: string[];
  negatives_self: string[];
  negatives_partner: string[];
  soft_no: string[];
  hard_no: string[];
}
```

---

### 2. Integration Complete

**File**: `dating-api/src/extraction/extraction-v2-persistence.service.ts`

**Changes**:
- Import `projectToCanonicalArrays`
- Project extraction to canonical arrays in `save()` method
- Write canonical arrays to 6 new DB columns
- Log array counts for observability

---

### 3. Sample Row Test Results

**Test Profile**: `canonical-test-001`

#### Input (V2 Extraction Sample)

**Interests (self)**:
- `{ tag: 'HIKING', strength: 'explicit' }` ← uppercase
- `{ tag: 'hiking', strength: 'strong' }` ← duplicate
- `{ tag: 'cooking', strength: 'explicit' }`
- `{ tag: 'YOGA', strength: 'strong' }` ← uppercase
- `{ tag: 'unknown_tag', strength: 'explicit' }` ← not canonical

**Interests (partner)**:
- `{ tag: 'gym', strength: 'explicit' }`
- `{ tag: 'GYM', strength: 'strong' }` ← duplicate, uppercase

**Negatives (self)**:
- `{ tag: 'SMOKING', strength: 'hard', confidence: 0.95 }` ← uppercase
- `{ tag: 'drama', strength: 'soft', confidence: 0.25 }` ← low confidence
- `{ tag: 'pets  ', strength: 'soft', confidence: 0.7 }` ← whitespace
- `{ tag: 'smoking', strength: 'hard', confidence: 0.9 }` ← duplicate

**Negatives (partner)**:
- `{ tag: 'NO_KIDS', strength: 'hard', confidence: 0.9 }` ← uppercase
- `{ tag: 'clingy', strength: 'soft', confidence: 0.8 }`

---

#### Output (Stored in DB)

| Column | Stored Value | Length |
|--------|--------------|--------|
| `interests_self` | `['cooking', 'hiking', 'yoga']` | 3 |
| `interests_partner` | `['gym']` | 1 |
| `negatives_self` | `['pets', 'smoking']` | 2 |
| `negatives_partner` | `['clingy', 'no_kids']` | 2 |
| `soft_no` | `['clingy', 'pets']` | 2 |
| `hard_no` | `['no_kids', 'smoking']` | 2 |

---

### 4. Normalization Rule Verification

| Rule | Status | Evidence |
|------|--------|----------|
| **Interests deduplicated** | ✓ PASS | 'HIKING' + 'hiking' → single 'hiking' |
| **Interests lowercase** | ✓ PASS | All tags lowercase: cooking, hiking, yoga, gym |
| **Interests sorted** | ✓ PASS | Alphabetical: cooking → hiking → yoga |
| **Unknown tags dropped** | ✓ PASS | 'unknown_tag' not in output |
| **Partner interests deduped** | ✓ PASS | 'gym' + 'GYM' → single 'gym' |
| **Negatives confidence filtered** | ✓ PASS | 'drama' (0.25 < 0.3) dropped |
| **Negatives lowercase** | ✓ PASS | 'SMOKING' → 'smoking', 'NO_KIDS' → 'no_kids' |
| **Negatives trimmed** | ✓ PASS | 'pets  ' → 'pets' (whitespace removed) |
| **Negatives deduped** | ✓ PASS | Two 'smoking' entries → single 'smoking' |
| **Soft/hard stratification** | ✓ PASS | soft_no has soft items, hard_no has hard items |

**Result**: 10/10 checks passed

---

### 5. Transformation Examples

#### Example 1: Interest Normalization

```
Input:  ['HIKING', 'hiking', 'cooking', 'YOGA', 'unknown_tag']
Steps:  1. Lowercase: ['hiking', 'hiking', 'cooking', 'yoga', 'unknown_tag']
        2. Filter canonical: ['hiking', 'hiking', 'cooking', 'yoga']
        3. Dedupe (Set): ['hiking', 'cooking', 'yoga']
        4. Sort: ['cooking', 'hiking', 'yoga']
Output: ['cooking', 'hiking', 'yoga']
```

#### Example 2: Negative Confidence Filtering

```
Input:  [
          { tag: 'SMOKING', confidence: 0.95 },
          { tag: 'drama', confidence: 0.25 },   ← filtered out
          { tag: 'pets  ', confidence: 0.7 }
        ]
Steps:  1. Filter conf >= 0.3: ['SMOKING', 'pets  ']
        2. Lowercase: ['smoking', 'pets  ']
        3. Trim: ['smoking', 'pets']
        4. Sort: ['pets', 'smoking']
Output: ['pets', 'smoking']
```

#### Example 3: Hard/Soft Stratification

```
Self negatives:
  - { tag: 'SMOKING', strength: 'hard', confidence: 0.95 }
  - { tag: 'pets  ', strength: 'soft', confidence: 0.7 }

Partner negatives:
  - { tag: 'NO_KIDS', strength: 'hard', confidence: 0.9 }
  - { tag: 'clingy', strength: 'soft', confidence: 0.8 }

soft_no (combined):  ['clingy', 'pets']        ← soft items from both domains
hard_no (combined):  ['no_kids', 'smoking']    ← hard items from both domains
```

---

### 6. Database Verification

**Query**: `SELECT * FROM "ProfileExtractionV2" WHERE "profileId" = 'canonical-test-001'`

**Result**: Row exists with all 6 array columns populated correctly.

**Proof**:
```
interests_self    = {cooking,hiking,yoga}
interests_partner = {gym}
negatives_self    = {pets,smoking}
negatives_partner = {clingy,no_kids}
soft_no           = {clingy,pets}
hard_no           = {no_kids,smoking}
```

---

## Mapper Logic Summary

### Interest Mapper

```typescript
function normalizeInterestTags(items: InterestItem[]): string[] {
  const tags = new Set<string>();
  
  for (const item of items) {
    const tag = item.tag.toLowerCase().trim();
    if (INTEREST_CANONICAL_TAG_SET.has(tag)) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags).sort();
}
```

**Rules Applied**:
- ✓ Lowercase normalization
- ✓ Trim whitespace
- ✓ Canonical tag allowlist filter
- ✓ Set-based deduplication
- ✓ Alphabetical sort

---

### Negative Mapper

```typescript
function normalizeNegativeTags(items: NegativeItem[]): string[] {
  const tags = new Set<string>();
  
  for (const item of items) {
    if (item.confidence < 0.3) continue;  // Quality filter
    
    const tag = item.tag.toLowerCase().trim();
    if (tag) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags).sort();
}
```

**Rules Applied**:
- ✓ Confidence filter (>= 0.3)
- ✓ Lowercase normalization
- ✓ Trim whitespace
- ✓ Set-based deduplication
- ✓ Alphabetical sort

---

### Soft/Hard Mapper

```typescript
function normalizeSoftNo(selfItems, partnerItems): string[] {
  const tags = new Set<string>();
  
  for (const item of [...selfItems, ...partnerItems]) {
    if (item.confidence < 0.3) continue;
    if (item.strength !== 'soft') continue;
    
    const tag = item.tag.toLowerCase().trim();
    if (tag) tags.add(tag);
  }
  
  return Array.from(tags).sort();
}
```

**Rules Applied**:
- ✓ Combine self + partner domains
- ✓ Filter by strength = 'soft'
- ✓ Confidence filter (>= 0.3)
- ✓ Lowercase + trim + dedupe + sort

**Note**: `hard_no` uses identical logic with `strength === 'hard'` filter.

---

## Self-Check Report

### Compliance Validation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Lowercase normalization | ✓ PASS | All tags lowercase in output |
| Trim whitespace | ✓ PASS | 'pets  ' → 'pets' |
| Deduplication | ✓ PASS | Duplicate tags merged |
| Alphabetical sort | ✓ PASS | Arrays sorted consistently |
| Confidence filtering | ✓ PASS | Items < 0.3 dropped |
| Canonical tag allowlist | ✓ PASS | Unknown interests dropped |
| Self + partner only | ✓ PASS | Relationship domain ignored |
| Soft/hard stratification | ✓ PASS | Separate arrays by strength |

---

### Integration Validation

| Integration Point | Status | Evidence |
|-------------------|--------|----------|
| Import in persistence service | ✓ DONE | Added to extraction-v2-persistence.service.ts |
| Called in save() method | ✓ DONE | `projectToCanonicalArrays()` invoked |
| Arrays written to DB | ✓ DONE | All 6 columns populated in create/update |
| Logging added | ✓ DONE | Array counts logged per save |

---

### Data Quality Validation

**Sample Data Transformations**:

1. ✓ `'HIKING'` (uppercase) → `'hiking'` (lowercase)
2. ✓ Duplicate `'hiking'` entries → single `'hiking'`
3. ✓ Unknown `'unknown_tag'` → dropped (not canonical)
4. ✓ `'pets  '` (trailing spaces) → `'pets'` (trimmed)
5. ✓ `'SMOKING'` (uppercase) → `'smoking'` (lowercase)
6. ✓ `'drama'` (confidence 0.25) → dropped (< 0.3 threshold)
7. ✓ Duplicate `'smoking'` → single `'smoking'`
8. ✓ `'NO_KIDS'` (uppercase) → `'no_kids'` (lowercase)
9. ✓ Soft items → `soft_no` array
10. ✓ Hard items → `hard_no` array

---

## Files Modified/Created

### Modified
1. `dating-api/prisma/schema.prisma` - Added 6 array columns + 2 GIN indexes
2. `dating-api/src/extraction/extraction-v2-persistence.service.ts` - Integrated mapper

### Created
1. `dating-api/src/canonical/canonical-projection.ts` - Mapper implementation
2. `dating-api/scripts/test-canonical-mapper.ts` - Test script
3. `dating-api/prisma/migrations/20260329192542_add_canonical_arrays/migration.sql` - Migration

---

## Stored Array Examples

**Profile**: `canonical-test-001`

```json
{
  "interests_self": ["cooking", "hiking", "yoga"],
  "interests_partner": ["gym"],
  "negatives_self": ["pets", "smoking"],
  "negatives_partner": ["clingy", "no_kids"],
  "soft_no": ["clingy", "pets"],
  "hard_no": ["no_kids", "smoking"]
}
```

**Verification**:
- ✓ All lowercase
- ✓ All trimmed
- ✓ All deduplicated
- ✓ All sorted
- ✓ Relationship domain excluded
- ✓ Low-confidence items filtered

---

## STOP POINT REACHED

**Completed**:
- ✓ Prisma schema updated (6 columns + 2 indexes)
- ✓ Migration applied successfully
- ✓ Mapper implemented (`canonical-projection.ts`)
- ✓ Integrated with persistence service
- ✓ Sample row written and verified
- ✓ All normalization rules validated

**NOT Implemented** (awaiting approval):
- Repository query functions (`findByPreferences`)
- Query examples with filters
- Bulk data population
- Advanced query tests

---

## Next Steps (When Approved)

1. Implement `findByPreferences()` repository function
2. Add query support for:
   - Include interests filter
   - Exclude interests filter
   - Min signal thresholds
3. Test query performance with GIN indexes
4. Bulk populate existing 528 profiles

Awaiting your approval to proceed.
