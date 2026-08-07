# Agent 1 — Dev Handoff: Expansion-07 Story 3 (Tension Rules)

**Story:** Tension Rules  
**Sprint:** Expansion-07 Profile Gap Signals  
**Date:** 2026-08-07  
**Status:** Complete — ready for Agent 2 (Code Review)

---

## Summary

Added five Expansion-07 **shadow** friction tension rules + English chip labels. Extended `EnrichedSignals` with all five Profile Gap keys. **No** scoring promote, positive chips, i18n, or extraction changes.

---

## Files Changed

| File | Change |
|------|--------|
| `src/engine/tension-rules.ts` | `EnrichedSignals` +5 fields; append 5 rules after `novelty_routine_clash` |
| `src/matches/match-explainability.ts` | 5 `TENSION_CHIP_BY_ID` entries |
| `src/engine/compute-friction.spec.ts` | `describe('Expansion-07 shadow tension rules')` — fire / reverse / null / below / boundaries |
| `src/matches/match-explainability.spec.ts` | Label map + chip smoke for `casual_intimacy_clash` / `religious_observance_gap` |

---

## Rules Added

| Rule id | Penalty | Chip label |
|---------|---------|------------|
| `casual_intimacy_clash` | 6 | Casual vs committed intimacy |
| `support_exchange_mismatch` | 6 | Arrangement vs romance |
| `support_both_provider` | 4 | Both want to provide |
| `support_both_recipient` | 4 | Both seek support |
| `religious_observance_gap` | 5 | Religious practice gap |

---

## Verification

```text
npx jest src/engine/compute-friction.spec.ts src/matches/match-explainability.spec.ts --runInBand -t "Expansion-07|casual_intimacy|…"
→ 20 passed

npx tsc --noEmit -p tsconfig.json
→ exit 0
```

---

## Explicit Non-Goals (this story)

- No `COMPATIBILITY_SIGNAL_KEYS` / promote
- No `expansion-07-explainability.ts` / positive pair chips (`hasSupportAlignment`)
- No i18n / interest overlap
- No extraction changes

---

## Next Agent

**Agent 2 (Code Review)** — verify exact ids/penalties/thresholds, null/exchange≥7 guards, chip labels, no scoring drift.

Then: `--agent 3 expansion 07 story 3`
