# Sprint 75 — Three-screen onboarding and profile routes

**Status:** Done — Stories 1–8 complete
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Pipeline:** `.cursor/skills/dating-agent-run/SKILL.md`
**Repo:** `dating-api` + `dating-ui`
**Follows:** [Sprint 74 — First login](../sprint-74-first-login/README.md)

## Goal

A first-time user finishes sign-up in three screens: story, facts, photos. The profile
stops being one page with query-string tabs and becomes four real routes, with an
overview that looks like the product instead of an admin form.

## The flow we are building

| # | Route | What is on it |
|---|-------|---------------|
| 1 | `/onboarding/story` | The three story texts, written by voice or by hand |
| 2 | `/onboarding/basics` | Gender, who I want, location, birth date — one screen |
| 3 | `/onboarding/photos` | Upload, then finish |

That is the whole flow. `/onboarding/texts` is deleted — today it asks for the same
three texts the story tab already asked for, which is the worst thing in the current
sign-up. Nickname and dating chapter leave onboarding entirely.

## Decisions taken

- **Story goes first.** This product matches on what people write. The first screen
  should say so. Sprint 74's beats experiment opened with four taps and then ambushed
  the user with an essay, which mis-sold the product — it is deleted in Story 05.
- **No chips or tag pickers for the story.** A fixed vocabulary makes everyone's text
  read the same, which is poison for an engine that matches on distinctiveness. Voice
  keeps each person's own words.
- **Birth date stays**, on screen 2. Age is load-bearing for matching and
  `partnerAgeMin` / `partnerAgeMax` already exist.
- **`COMPLETED` means the facts are set**, not that the story is written. The relaxed
  rule (`onboarding_basics_incomplete`) landed already. The match list keeps
  `not_analyzed` as the net for anyone who skips the story.

## Story checklist

| # | Story | Status | Size | Depends on |
|---|--------|--------|------|------------|
| 1 | [Story screen first, delete the duplicate](./STORY_01_story_screen_first.md) | **Done** | M | — |
| 2 | [Record your story by voice](./STORY_02_voice_story.md) | **Done** | L | 1 |
| 3 | [One facts screen, four fields](./STORY_03_facts_screen.md) | **Done** | M | — |
| 4 | [Photos screen and finish](./STORY_04_photos_screen.md) | **Done** | S | 3 |
| 5 | [Delete beats, tabs and the old stepper](./STORY_05_remove_old_flow.md) | **Done** | M | 1, 3, 4 |
| 6 | [Nickname and dating chapter move to settings](./STORY_06_move_extras.md) | **Done** | S | 3 |
| 7 | [Profile tabs become routes](./STORY_07_profile_routes.md) | **Done** | M | — |
| 8 | [Redesign the profile overview](./STORY_08_overview_redesign.md) | **Done** | L | 7 |

**Order:** 1 → 3 → 4 → 5 → 6, then 7 → 8. Story 2 can run in parallel after 1.
Track A (1–6) and Track B (7–8) do not touch the same files.

## Out of scope

- Changing the matching algorithm or the analysis prompt
- Mobile/Capacitor native microphone (Story 2 covers web; native is a follow-up)
- Any AWS or production deploy work

## Decisions (Story 01)

- **Skip allowed on screen 1.** Empty texts on Continue are OK. Match-list `not_analyzed`
  remains the quality net. Locked in Agent 0 for Story 1.
