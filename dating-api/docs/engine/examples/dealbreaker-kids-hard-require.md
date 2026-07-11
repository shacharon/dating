# Example: kids HARD_REQUIRE

**Input (searcher `aboutPartner` / `aboutRelationship`):** `must want kids`

**Classifier:** `{ tag: kids_required, classification: HARD_REQUIRE, evidence: "must want kids", confidence: 0.95 }`

**Eligibility (NEVER_BLOCKS on UNKNOWN):**

| Counterparty self-fact / text | Outcome |
|-------------------------------|---------|
| Explicitly does not want kids | FAIL → excluded |
| Silent on kids | UNKNOWN → **not** blocked |
| Explicitly wants kids | PASS |
