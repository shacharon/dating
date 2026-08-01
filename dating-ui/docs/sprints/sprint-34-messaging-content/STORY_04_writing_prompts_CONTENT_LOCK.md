# Story 34.4 Content — Profile Writing Prompts (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 4 — Writing prompts (content phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** **ACCEPT** (content phase complete)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for **content only**.  
**Next phase after ACCEPT:** `--agent 0 sprint 34 story 4 implementation`  
**Needs mockup:** content brief (this lock) — not Figma.

---

## Goal

Produce **English source copy** that reduces blank-canvas anxiety on `/onboarding/texts` for the three profile text fields — prompt questions, example answers, and short guidance — ready for the later implementation phase to wire into UI/i18n.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Surface | `onboarding-texts-form.tsx` — three textareas |
| Field keys | `aboutMe`, `aboutPartner`, `aboutRelationship` |
| EN labels today | “About me” / “About partner” / “About relationship” |
| Placeholders today | Short ellipsis hints only — no prompts/examples |
| Moderation | Profile text moderated on save (Story 34.2) — examples must be policy-safe |
| API | `about*` strings optional; **no** `@MaxLength` on those fields today |
| Character UI | Form currently has **no** live character counter (UX review / AGENT_COMMANDS “0 / 500” is aspirational) |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ Emoji (💡) in content or UI specs this story  
- ❌ Path `src/lib/i18n/copy/en.ts` — real tree is `src/lib/i18n/{en,he,es,types}.ts` (**implementation** phase)  
- ❌ Writing React components / wiring forms in **content** phase  
- ❌ Mandatory hard max of 500 characters in content (API has no about* max yet)  
- ❌ Translating he/es in content phase — **EN source only** here  

---

## Locked field map

| Key | Content section title | Intent |
|-----|----------------------|--------|
| `aboutMe` | About me | Who I am day-to-day |
| `aboutPartner` | About my ideal partner | Who I’m hoping to meet (not “about my current partner”) |
| `aboutRelationship` | About the relationship | What I want from a relationship |

Use these titles in the markdown. Do **not** invent a fourth field.

---

## Locked deliverable

**Single file (Agent 1 creates/fills):**

`dating-ui/docs/sprints/sprint-34-messaging-content/STORY_04_writing_prompts.md`

### Required structure (exact sections)

```markdown
# Profile Writing Prompts

## Meta
- Locale: en (source of truth)
- Field keys: aboutMe | aboutPartner | aboutRelationship
- Recommended length (soft): …

## aboutMe — About me
### Prompt questions
1–4 numbered questions
### Example profiles
Example 1 / 2 / 3 (labeled; full paragraphs)
### Guidance
- Recommended length: …
- What to include: (bullets)
- What to avoid: (bullets)
- Tone tips: (bullets)

## aboutPartner — About my ideal partner
(same subsections)

## aboutRelationship — About the relationship
(same subsections)
```

### Quantity locks

| Block | Count |
|-------|-------|
| Prompt questions per field | **3 or 4** |
| Example profiles per field | **exactly 3** |
| Guidance include bullets | **3–5** |
| Guidance avoid bullets | **3–5** |
| Tone tips | **2–4** |

### Length locks

| Item | Rule |
|------|------|
| Soft recommended length (guidance) | **~50–150 words** per field answer (user-facing guidance line) |
| Each example body | **~40–90 words** (readable in an expandable UI; not essays) |
| Prompt questions | One sentence each; open-ended; no yes/no |

---

## Locked voice & quality

### Voice

- Warm, encouraging, adult dating product — not corporate, not meme-y.  
- Inclusive: all genders, orientations, relationship styles that fit product; no assumed religion, kids, or income.  
- Specific over generic (“weekend trails + coffee shop reading” > “I like to have fun”).  
- **English only** in this file.

### Must avoid (content)

- Sexual solicitation, explicit sex, fetish laundry lists (will trip moderation).  
- Insults, hate, or demeaning “dealbreaker” rants.  
- Medical/trauma dumping as the whole example.  
- Celebrity-polished resume tone / influencer clichés.  
- Emoji in the source markdown.  
- Referring to other product brands.

### Example diversity (required)

Across the **9** examples total, vary:

- Indoor vs outdoor interests  
- Social energy (quiet / social)  
- At least one example that is not “outdoorsy hiker” stereotype  
- No two examples that are near-duplicates  

### Prompt question criteria

- Specific enough to spark an answer  
- Open-ended  
- Encouraging, not intimidating  
- Inclusive  

---

## Out of scope (this content phase)

- UI components, i18n wiring, character counters  
- he/es translation  
- Changing API max lengths  
- Message-composer prompts  
- Photo tips  

---

## Acceptance criteria (content)

- [x] `STORY_04_writing_prompts.md` exists with locked structure  
- [x] All three field keys covered with 3–4 questions + 3 examples + guidance  
- [x] Examples ~40–90 words; policy-safe; diverse  
- [x] Soft recommended length stated (~50–150 words)  
- [x] No emoji; EN only  
- [x] Ready for implementation phase to consume without rewriting intent  

---

## Agent 1 status

**Complete** — see `handoffs/STORY_04_writing_prompts_content/agent-1-implement.md`

## Agent 2 status

**PASS** — see `handoffs/STORY_04_writing_prompts_content/agent-2-cr.md`

## Agent 3 status

**ACCEPT** — see `handoffs/STORY_04_writing_prompts_content/agent-3-pm.md`

## Next

```
--agent 0 sprint 34 story 4 implementation
```
