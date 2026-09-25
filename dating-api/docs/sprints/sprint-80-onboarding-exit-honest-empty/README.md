# Sprint 80 — First-run exit + honest empty Matches

**Status:** Story 1 Done. Stories 2–5 parked.
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Repo:** `dating-ui`
**Follows:** [Sprint 79 — One Facts editor](../sprint-79-unify-facts-editor/README.md)

## Goal

Finish first login without a dead-end Preferences step. Matches empty copy must tell the truth: not analyzed vs nobody in the pool.

## Why (recheck Sep 2026)

Already in (not this sprint): login `postLoginPath`, Facts tiles on Update details, photo gate for pending photos.

Done in story 1: first-run Photos Finish sets `COMPLETED`, then opens Preferences. Preferences has Done.

Still wrong:

1. `not_analyzed` uses the same invite empty as an empty pool.
2. Nickname is edited on Facts and Settings.
3. Smoking hard-block copy says “your preferences.”
4. Dead `OnboardingBasicForm` still embeds photos.

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Mark first-run complete + Preferences Done](./STORY_01_first_run_complete_and_preferences_done.md) | **Done** | — |
| 2 | [Distinct empty Matches for not analyzed](./STORY_02_not_analyzed_empty_matches.md) | Parked | — |
| 3 | [One nickname editor](./STORY_03_one_nickname_editor.md) | Parked | — |
| 4 | [Honest smoking hard-block copy](./STORY_04_honest_smoking_hard_block_copy.md) | Parked | — |
| 5 | [Delete dead Basic form](./STORY_05_delete_dead_onboarding_basic_form.md) | Parked | — |

## Out of scope

- Login vs Matches redirects (`postLoginPath` stays landing-only). Never redirect away from Matches.
- Distance as a real km filter (parked)
- Dating chapter teaching
