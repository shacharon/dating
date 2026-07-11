# Example: commitment_phobic HARD_EXCLUDE

**Input (searcher `aboutPartner`):** `I don't want someone who is afraid of commitment`

**Classifier:** `{ tag: commitment_phobic, classification: HARD_EXCLUDE, … }` (social / exclude-only family)

**Eligibility (NEVER_BLOCKS on UNKNOWN):**

| Counterparty text | Outcome |
|-------------------|---------|
| Explicit self-affirmation of commitment phobia (rare) | FAIL |
| Silent | UNKNOWN → **not** blocked |

Values/social tags usually stay UNKNOWN on the counterparty because there is no structured self-fact column — silence never excludes.
