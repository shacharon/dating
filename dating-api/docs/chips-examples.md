# Chips Layer - Sample Outputs

Display-only chips for UI explainability. No scoring impact.

---

## Example 1: Profile with Rich Interests

### Input Profile
```json
{
  "aboutMe": "I'm a fitness enthusiast who loves hiking on weekends. I go to the gym 5 times a week and enjoy yoga for mindfulness.",
  "aboutPartner": "Looking for someone kind and warm, who values deep emotional connection and is ambitious in their career.",
  "aboutRelationship": "I want a relationship built on family values. We can enjoy movie nights at home together.",
  "rawInterests": {
    "version": "v1",
    "self": [
      { "tag": "gym", "strength": "explicit", "ruleId": "llm_v1" },
      { "tag": "hiking", "strength": "strong", "ruleId": "llm_v1" },
      { "tag": "yoga", "strength": "strong", "ruleId": "llm_v1" }
    ],
    "partner": [
      { "tag": "cooking", "strength": "strong", "ruleId": "llm_v1" }
    ],
    "relationship": [
      { "tag": "home_life", "strength": "explicit", "ruleId": "llm_v1" },
      { "tag": "movies", "strength": "strong", "ruleId": "llm_v1" }
    ]
  }
}
```

### Extended Signals (v1)
```json
{
  "version": "v1",
  "relationshipMotivation": {
    "relationshipMotivation": "family_builder",
    "confidence": 0.9,
    "evidence": ["family values", "movie nights at home"]
  },
  "attractionTraits": {
    "attraction": {
      "ambition": 8,
      "statusOrientation": 4,
      "physicalPriority": 5,
      "kindnessWarmth": 10,
      "stabilityReliability": 7,
      "independenceAutonomy": 4,
      "emotionalDepth": 9,
      "traditionalismValues": 6,
      "financialPrudence": 5
    },
    "confidence": 0.85,
    "evidence": [
      { "dimension": "kindnessWarmth", "quote": "kind and warm" },
      { "dimension": "emotionalDepth", "quote": "deep emotional connection" },
      { "dimension": "ambition", "quote": "ambitious in their career" }
    ]
  }
}
```

### Output Chips
```json
{
  "chips": {
    "self": [
      { "label": "Fitness", "source": "interest", "strength": "explicit" },
      { "label": "Hiking", "source": "interest", "strength": "strong" },
      { "label": "Yoga", "source": "interest", "strength": "strong" }
    ],
    "partner": [
      { "label": "Kind & Warm", "source": "trait", "strength": "strong" },
      { "label": "Deep Talks", "source": "trait", "strength": "strong" },
      { "label": "Driven & Ambitious", "source": "trait" },
      { "label": "Cooking", "source": "interest", "strength": "strong" },
      { "label": "Stable & Reliable", "source": "trait" }
    ],
    "relationship": [
      { "label": "Homebody", "source": "interest", "strength": "explicit" },
      { "label": "Family Builder", "source": "motivation", "strength": "strong" },
      { "label": "Movies", "source": "interest", "strength": "strong" }
    ]
  }
}
```

**Notes:**
- Self chips: Primary source is rawInterests (gym, hiking, yoga)
- Partner chips: Combines attractionTraits (kindness=10, emotionalDepth=9, ambition=8) + rawInterests (cooking)
- Relationship chips: Combines rawInterests (home_life, movies) + relationshipMotivation (family_builder)
- Max 5 chips per domain enforced
- Sorted by strength: explicit > strong > undefined

---

## Example 2: Profile with Sparse Interests (Fallback to Signals)

### Input Profile
```json
{
  "aboutMe": "I'm very ambitious and emotionally deep. I value my independence.",
  "aboutPartner": "Someone stable and reliable.",
  "aboutRelationship": "Clear expectations are important to me.",
  "rawInterests": null
}
```

### Extracted Signals
```json
{
  "self": {
    "signals": {
      "ambition": 9,
      "emotionalDepth": 9,
      "independence": 8,
      "directness": 7,
      "socialBattery": 6
    }
  },
  "partner": {
    "signals": {
      "stabilityReliability": 8,
      "kindnessWarmth": 7,
      "emotionalDepth": 6
    }
  },
  "relationship": {
    "signals": {
      "relationshipClarity": 9,
      "attachmentSecurity": 8,
      "emotionalDepth": 7
    }
  }
}
```

### Extended Signals (v1)
```json
{
  "version": "v1",
  "relationshipMotivation": {
    "relationshipMotivation": "freedom_independence",
    "confidence": 0.75,
    "evidence": ["independence", "clear expectations"]
  },
  "attractionTraits": {
    "attraction": {
      "ambition": 5,
      "statusOrientation": 3,
      "physicalPriority": 4,
      "kindnessWarmth": 6,
      "stabilityReliability": 9,
      "independenceAutonomy": 4,
      "emotionalDepth": 6,
      "traditionalismValues": 5,
      "financialPrudence": 5
    },
    "confidence": 0.7,
    "evidence": []
  }
}
```

### Output Chips
```json
{
  "chips": {
    "self": [
      { "label": "Ambitious", "source": "signal", "strength": "strong" },
      { "label": "Emotionally Deep", "source": "signal", "strength": "strong" },
      { "label": "Independent", "source": "signal" }
    ],
    "partner": [
      { "label": "Stable & Reliable", "source": "trait", "strength": "strong" },
      { "label": "Stable & Reliable", "source": "signal" }
    ],
    "relationship": [
      { "label": "Independent Spirit", "source": "motivation" },
      { "label": "Clear Expectations", "source": "signal", "strength": "strong" },
      { "label": "Secure Attachment", "source": "signal" }
    ]
  }
}
```

**Notes:**
- No rawInterests → fallback to strong signals (value >= 8)
- Self chips: ambition=9, emotionalDepth=9, independence=8 (all strong)
- Partner chips: stabilityReliability from both trait (9) and signal (8) - deduplicated to one chip
- Relationship chips: motivation (freedom_independence) + strong signals
- Only signals >= 8 are included as fallback

---

## Example 3: Empty Profile (No Chips)

### Input Profile
```json
{
  "aboutMe": "",
  "aboutPartner": "",
  "aboutRelationship": "",
  "rawInterests": null
}
```

### Extended Signals (v1)
```json
{
  "version": "v1",
  "relationshipMotivation": {
    "relationshipMotivation": "emotional_connection",
    "confidence": 0.3,
    "evidence": []
  },
  "attractionTraits": {
    "attraction": {
      "ambition": 2,
      "statusOrientation": 3,
      "physicalPriority": 4,
      "kindnessWarmth": 5,
      "stabilityReliability": 6,
      "independenceAutonomy": 4,
      "emotionalDepth": 5,
      "traditionalismValues": 2,
      "financialPrudence": 3
    },
    "confidence": 0.4,
    "evidence": []
  }
}
```

### Output Chips
```json
{
  "chips": {
    "self": [],
    "partner": [],
    "relationship": []
  }
}
```

**Notes:**
- No rawInterests
- Low confidence extended signals (< 0.6) → ignored
- Low attraction trait scores (all < 7) → ignored
- No strong signals (all null or < 8) → no fallback
- Result: empty chips arrays (graceful degradation)

---

## Chip Priority Rules

1. **Interest chips** (primary): From rawInterests, explicit > strong
2. **Motivation chips** (relationship only): From relationshipMotivation, confidence >= 0.6
3. **Trait chips** (partner only): From attractionTraits, score >= 7, confidence >= 0.6
4. **Signal chips** (fallback): From ExtractedSignals, value >= 8

## Deduplication

Chips are deduplicated by label (case-insensitive):
- "Stable & Reliable" from trait + "Stable & Reliable" from signal → 1 chip (first wins)
- "Fitness" + "fitness" → 1 chip

## Max Chips Per Domain

Each domain (self, partner, relationship) has max 5 chips. Priority order is preserved.

## Scoring Impact

**ZERO.** Chips are computed AFTER productScores and have no input to scoring functions.

See tests:
- `productScores remain unchanged when chips are present (display-only proof)`
- `chips are populated from rawInterests and extendedSignals`
