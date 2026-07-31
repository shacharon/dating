# Sprint 25: Match detail UX polish

**Epic:** Detail page is photo → name → long why. Make that why breathe, and demote chrome that fights it.
**Status:** Done  
**Depends on:** Sprint 23 Done (chips / why-list / about-them already removed)

---

## Outcome

Match detail feels like a dating moment, not a report card:

1. Long why breaks into short paragraphs (even when API returns one block).
2. Match score is gone from detail (why already explains).
3. When mutual, **View conversation** is the primary CTA; Undo / Block / Report stay quiet.

---

## Story checklist

| # | Story | Status |
|---|-------|--------|
| 1 | [Narrative breathes — paragraph breaks](./STORY_01_narrative_paragraphs.md) | Done |
| 2 | [Remove match score from detail](./STORY_02_remove_detail_score.md) | Done |
| 3 | [Promote View conversation CTA](./STORY_03_promote_conversation_cta.md) | Done |

## Out of scope

- Changing narrative LLM prompt / `v4` length
- Redesigning feedback thumbs or removing `analyzedAt`
- List card score (list can keep score)
