# Match quality audit — manual review template

Use together with the admin drill-down UI (`/admin/match-quality` → **View audit**) or `scripts/match-quality-audit.ts` JSON output ([V1 contract](./MATCH_ENGINE_V1_CONTRACT.md)).

## Row template (markdown)

| Field | Your notes |
|-------|------------|
| viewerProfileId | |
| candidateProfileId | |
| verdict | GOOD / OK / BAD |
| why | |
| score_vs_expectation | lower / higher / same |
| explanation_accurate | yes / no |
| chips_and_tension | Do positive chips and tension match real friction? |
| recommendation_fair | Does primary takeaway / caution feel fair? |
| stale_flag | Did `profileAnalysisStale` match your sense of outdated text? |
| engineInputSource (copy from JSON) | viewer: … / candidate: … |

## JSONL example (one object per reviewed pair)

```jsonl
{"viewerProfileId":"prof_viewer_1","candidateProfileId":"prof_cand_1","verdict":"OK","why":"Strong lifestyle overlap; religion unclear from bios.","score_vs_expectation":"same","explanation_accurate":"yes","chips_and_tension":"Tension chip matches pace difference we see.","recommendation_fair":"yes","stale_flag":"n/a","engineInputSource":{"viewer":"evaluationJson","candidate":"normalized"}}
{"viewerProfileId":"prof_viewer_1","candidateProfileId":"prof_cand_2","verdict":"BAD","why":"Dealbreaker on kids not reflected.","score_vs_expectation":"higher","explanation_accurate":"no","chips_and_tension":"Positive chips too generic.","recommendation_fair":"no","stale_flag":"no","engineInputSource":{"viewer":"evaluationJson","candidate":"evaluationJson"}}
```

After each line, keep the matching `match-quality-audit-*.json` artifact path in your notes for reproducibility.
