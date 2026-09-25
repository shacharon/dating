# Sprint 79 — One Facts editor

**Status:** Done — Stories 1–2 complete.
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Repo:** `dating-ui`
**Follows:** [Sprint 78 — Demo language links](../sprint-78-demo-language-domains/README.md)

## Goal

First login Facts and Update details Facts show the **same** UI. On Update details, **each tab shows only that step** — photos are not stacked under Facts.

## Why

Today there are two skins for the same profile data:

| Screen | Route | UI |
|--------|--------|----|
| Onboarding **Facts** | `/onboarding/basics` | Tiles: I am, I'm looking for, country, birth date (`OnboardingFactsForm`) |
| Update details **Basic** | `/profile/edit` `#basic` | Old dropdowns and “Open to matching with” checkboxes (`OnboardingBasicForm`) |

People think they are different settings. They are not.

## What to reuse

Keep the **Facts tiles** (`OnboardingFactsForm` / looking-for Men · Women · Everyone). Put that on Update details. Drop the old Basic fields UI for gender and who you match with.

Rename the Update details nav label **Basic** → **Facts**.

On Update details, save in place (existing hub save). Do **not** Continue to Photos.

The Photos tab is the only photo editor on `/profile/edit`. Facts must not embed `ProfilePhotoSection`.

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Reuse Facts UI on Update details](./STORY_01_reuse_facts_on_update_details.md) | **Done** | — |
| 2 | [One pane per Update details tab](./STORY_02_one_pane_per_update_details_tab.md) | **Done** | 1 |

## Out of scope

- Matching / eligibility
- Age range and distance (Preferences step). Distance stays parked for go-live
- Dating chapter teaching
- Login vs Matches redirects
