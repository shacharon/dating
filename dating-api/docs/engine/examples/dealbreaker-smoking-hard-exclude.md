# Example: smoking HARD_EXCLUDE

**Input (searcher `aboutPartner`):** `I don't want smokers`

**Classifier:** `{ tag: smoking, classification: HARD_EXCLUDE, evidence: "don't want smokers", confidence: 0.95 }`

**Eligibility (NEVER_BLOCKS on UNKNOWN):**

| Counterparty `aboutMe` | Outcome |
|------------------------|---------|
| `I smoke` | FAIL on smoking → excluded from matches |
| `I love hiking` (silent on smoking) | UNKNOWN → **not** blocked |
| `I don't smoke` | PASS |
