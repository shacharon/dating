# LLM-FIRST EXTRACTION PRINCIPLE

## ⚠️ READ THIS BEFORE EVERY SIGNAL EXTRACTION CODE ⚠️

**RULE:** All compatibility signal extraction uses LLM semantic inference.

**NEVER:** Hardcode patterns, keywords, regex, or if/else logic for signals.

---

## ❌ WRONG (Hardcoded Patterns)

```typescript
// ❌ DO NOT DO THIS
function extractEmpathy(text: string): number {
  if (text.includes('empathy') || text.includes('care about feelings')) {
    return 8;
  }
  if (text.includes('emotions') && text.includes('understand')) {
    return 7;
  }
  if (text.includes('logic') || text.includes('not emotional')) {
    return 3;
  }
  return 5; // default
}
```

**Why wrong:**
- Keywords don't capture semantic meaning
- "I don't care about emotions" would score HIGH (has "care" + "emotions")
- Context-blind
- Brittle
- Gaming-prone

---

## ✅ RIGHT (LLM Semantic)

```typescript
// ✅ DO THIS
const EMPATHY_DEFINITION = `
Rate empathyCompassion on 0-10 scale.

DEFINITION:
Understanding and caring about partner's feelings, emotional attunement,
noticing when others are upset, compassionate responses.

SCALE:
0-2:  Little awareness or care for others' emotions
3-4:  Basic empathy, sometimes misses cues
5-6:  Moderate empathy, generally attuned
7-8:  High empathy, deeply cares about feelings
9-10: Exceptional empathy, highly attuned

INSTRUCTIONS:
- Infer from context, tone, examples, implications
- Look for HOW they talk about relationships, not keywords
- Rate based on semantic meaning, not word matching

Rate this text 0-10:
`;

async function extractEmpathy(text: string): Promise<number | null> {
  const prompt = EMPATHY_DEFINITION + text;
  const score = await llm.extractNumericSignal(prompt, { min: 0, max: 10 });
  return score;
}
```

**Why right:**
- LLM understands context and negation
- Captures semantic meaning
- Can handle "I struggle with empathy" correctly (low score)
- Robust to different phrasings
- Hard to game

---

## Checklist: Before Writing Extraction Code

Every time you write signal extraction code, verify:

- [ ] **NO regex patterns** for signal scoring
- [ ] **NO keyword matching** (includes, indexOf, etc.)
- [ ] **NO if/else branching** based on words
- [ ] **YES semantic definition** for LLM
- [ ] **YES clear 0-10 scale** with examples
- [ ] **YES context-aware** instructions

---

## When Hardcoding IS Allowed

**Allowed hardcoding:**
- ✅ Hard filters (binary gates): smoking status, age, gender
- ✅ Structured fields: occupation class, children status (from dropdowns)
- ✅ Tag extraction: interest tags (music, hiking) — binary presence

**Not allowed hardcoding:**
- ❌ Compatibility signals (0-10 scored dimensions)
- ❌ Emotional/psychological traits
- ❌ Personality dimensions
- ❌ Relationship style signals

---

## LLM Prompt Template

Use this template for EVERY new signal:

```typescript
const SIGNAL_NAME_DEFINITION = `
Rate {signalName} on 0-10 scale based on semantic meaning.

DEFINITION:
{Clear 1-2 sentence definition of what this measures}

SCALE:
0-2:  {Description of very low}
3-4:  {Description of low}
5-6:  {Description of moderate}
7-8:  {Description of high}
9-10: {Description of very high}

INSTRUCTIONS:
- Infer from context, tone, examples, and implications
- Look for HOW they express this, not just keywords
- Consider {domain-specific guidance}
- Rate based on semantic meaning, not word matching

Examples of HIGH (7-9):
- "{example 1}"
- "{example 2}"
- "{example 3}"

Examples of MODERATE (4-6):
- "{example 1}"
- "{example 2}"

Examples of LOW (1-3):
- "{example 1}"
- "{example 2}"

Rate the following text 0-10:
`;
```

---

## Code Review Checklist

Reviewer must verify:

- [ ] No hardcoded signal extraction patterns
- [ ] LLM semantic definitions are clear
- [ ] Scale has good examples for each range
- [ ] Instructions guide LLM appropriately
- [ ] Edge cases handled (null, empty, unclear)
- [ ] Tests verify semantic extraction works

**If you see hardcoded patterns → REJECT THE PR**

---

## Why LLM-First Matters

**Accuracy:**
- LLM understands context, negation, implications
- Hardcoded patterns miss nuance

**Robustness:**
- Users phrase things differently
- LLM handles variety, patterns don't

**Gaming-Resistant:**
- Hard to game semantic meaning
- Easy to game keyword lists

**Maintainability:**
- One semantic definition
- No regex soup to maintain

**Scalability:**
- Add new signals = add new definitions
- No pattern explosion

---

## Exception Process

**If you believe a signal MUST use patterns:**

1. Write a design doc explaining why LLM won't work
2. Get architect approval
3. Document the exception in code
4. Plan migration to LLM when possible

**Default answer: Use LLM.**

---

## Remember

🚨 **Before every signal extraction:**
1. Ask: "Can this be inferred semantically?"
2. Answer: "Yes" (it always can)
3. Write LLM definition
4. Test semantic extraction
5. Deploy

**NO HARDCODED SIGNAL PATTERNS.**
