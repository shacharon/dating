# Sprint 76 — Tell people about analysis without nagging

**Status:** In progress — Stories 1–2 done
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Pipeline:** `.cursor/skills/dating-agent-run/SKILL.md`
**Repo:** `dating-ui` (copy only; no matching-engine change)
**Follows:** [Sprint 75 — Onboarding and profile routes](../sprint-75-onboarding-profile/README.md)

## Goal

Analysis is the product. A visitor should hear that before they log in. A signed-in
user should see it on Profile: a hint while the profile is thin, a button when it is
ready, and the result after it runs. Nowhere else should ask them to analyze.

## Decisions

- **One line before login.** On the public landing page, under the title, next to the
  language flags. No button. A visitor cannot run analysis.
- **One block on Profile.** Three states, same place:
  1. Story or the four facts are missing — say what analysis is and what is left. No button.
  2. Story is written (at least 40 characters across the three texts) and gender, who
     they want, location, and birth date are saved — **Analyze your profile**.
  3. A result exists — show it. The button is gone.
- **Do not nag.** No banner on Matches, Conversations, or the account menu. Do not
  auto-redirect to onboarding or to analysis. An empty “who you are looking for” list
  must not surface an API error while facts are still optional.
- **Do not change the algorithm** or the analysis prompt.

## Story checklist

| # | Story | Status | Size | Depends on |
|---|--------|--------|------|------------|
| 1 | [Hint on the page before login](./STORY_01_landing_hint.md) | **Done** | S | — |
| 2 | [Profile: hint, button, result](./STORY_02_profile_analyze_block.md) | **Done** | M | — |
| 3 | [No nag anywhere else](./STORY_03_no_nag.md) | Not started | S | 2 |

**Order:** 1 and 2 can run in parallel. 3 starts after 2 is on `main`.

## Out of scope

- Changing who gets matched or the analysis model
- AWS or production deploy
- Putting the button on Matches
