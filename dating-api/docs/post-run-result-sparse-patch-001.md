# Post-run result: SPARSE_PATCH_001

**Experiment:** EXTRACTION_BATCH_PATCH, target SPARSE_PROFILE, profiles 16, 18, 21, 8.

## Patch execution status

- **Reanalyze (16, 18, 21, 8):** Not completed — OpenAI API returned 429 (quota exceeded). No profile JSONs were updated.
- **Recompute / Validate:** Not run (blocked on reanalyze).
- **Verdict:** **DEFERRED** — run the commands below once API quota is available, then fill the gates and set KEEP or REVERT.

## Commands run (execute in order from `dating-api`)

```bash
# 1. Reanalyze only touched profiles (uses LLM; requires OPENAI_API_KEY and quota)
npm run reanalyze-ids -- 16 18 21 8

# 2. Recompute all matches
npm run recompute-matches

# 3. Golden validation
npm run validate:golden-pairs
```

## Success gates (from ticket)

| Gate | Baseline | Post-run | Pass? |
|------|----------|----------|-------|
| 1. CORE_KPI pass count does not decrease | 5 | _fill_ | _Y/N_ |
| 2. SPARSE_PROFILE improved pairs > worse pairs | — | _fill_ | _Y/N_ |
| 3. No obvious collateral outside sparse class | — | _check golden pairs 1–4, 7–8, 11–15, 17–20_ | _Y/N_ |
| 4. No obvious inflation: P95/P99/count(90+) | P95=72, P99=77 | _fill_ | _Y/N_ |

## Verdict

**KEEP** if all four gates pass.  
**REVERT** if any gate fails (revert extraction-sparse-profile-patch, EvaluateBatchInput profileId, reanalyze-ids profileId, analyze controller profileId; re-run reanalyze 16/18/21/8, recompute, validate).

---

_Fill this file after running the three commands and comparing to `docs/baseline-freeze-snapshot.json`._
