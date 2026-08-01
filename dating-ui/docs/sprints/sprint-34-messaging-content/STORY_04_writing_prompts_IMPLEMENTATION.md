# Story 34.4 Implementation — Onboarding Writing Prompts UI (LOCKED)

**Sprint:** 34 — Messaging & Content  
**Story:** 4 — Writing prompts (implementation phase)  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** **ACCEPT** (implementation complete; Story 34.4 done)  
**Skip Agent 4:** yes  
**Process:** Waterfall `0 → 1 → 2 → 3` for this phase only.  
**Prerequisite:** Content phase **ACCEPT** (`4e23788`) — `STORY_04_writing_prompts.md`.  
**Needs mockup:** no (content + this lock).

---

## Goal

Wire accepted English writing-prompt content into `/onboarding/texts` under each textarea: soft word guidance, always-visible idea questions, collapsed examples, collapsed tips — without clutter, emoji, or inventing a hard character max.

---

## Baseline (do not reverse)

| Fact | Detail |
|------|--------|
| Form | `onboarding-texts-form.tsx` — three fields + moderation alert |
| Content source | `STORY_04_writing_prompts.md` (EN) |
| i18n tree | `src/lib/i18n/{types,en,he,es}.ts` |
| Onboarding components dir | `src/components/onboarding/` already exists |
| API | No `@MaxLength` on `about*` — do **not** invent a hard 500 cap |

### AGENT_COMMANDS corrections (outdated — ignore)

- ❌ Emoji (💡)  
- ❌ Path `i18n/copy/en.ts`  
- ❌ Mandatory “0 / 500 characters” hard max  
- ❌ Character-based recommended 50–200 (content locked **words** 50–150)  
- ❌ Mandatory two separate files if one clearer component fits  
- ❌ Blue-link-only chrome if existing zinc underline patterns fit better  

---

## Locked UX (per field)

Order under each textarea (label → textarea → help):

```
[ Label ]
[ Textarea ]
N words · About 50–150 recommended     ← soft meter (not a hard limit)

Ideas to write about
• question 1
• question 2
• …

[ Show examples ]                       ← collapsed by default
  Example 1: …
  Example 2: …
  Example 3: …

[ Writing tips ]                        ← collapsed by default
  Include / Avoid / Tone (from content)
```

| Rule | Lock |
|------|------|
| Questions | Always visible; compact `text-sm` zinc; all 3–4 from content |
| Examples | **Collapsed by default**; one control toggles all 3 for that field |
| Tips | **Collapsed by default**; include + avoid + tone from content |
| Count | **Word count** (whitespace-split trim); soft recommended line shared chrome |
| Hard max | **None** — do not block save/finish on length |
| Emoji | **None** |
| Density | Keep zinc hierarchy; no cards in the always-visible questions block; light border OK inside expanded examples |
| Mobile | Stack vertically; expand panels full width |
| Dark mode | Existing zinc tokens |
| Independence | Each field has its own expand state (examples/tips) |

Preserve existing save/finish/moderation behavior.

---

## Locked i18n shape

Under `onboarding` (exact nesting OK as long as typed):

### Chrome (`textsForm.writingHelp` or sibling)

| Key | EN intent |
|-----|-----------|
| `ideasHeading` | Ideas to write about |
| `showExamples` | Show examples |
| `hideExamples` | Hide examples |
| `showTips` | Writing tips |
| `hideTips` | Hide writing tips |
| `exampleLabel` | `(n) => Example ${n}` |
| `includeHeading` | What to include |
| `avoidHeading` | What to avoid |
| `toneHeading` | Tone |
| `wordCountLine` | `(words) => `${words} words · About 50–150 recommended`` (or split count + recommended if cleaner) |

### Field bodies (`onboarding.writingPrompts.{aboutMe\|aboutPartner\|aboutRelationship}`)

```typescript
{
  questions: string[];      // 3–4 from content
  examples: string[];       // exactly 3, full paragraphs
  include: string[];
  avoid: string[];
  tone: string[];
}
```

**EN:** Port copy from `STORY_04_writing_prompts.md` faithfully (no rewrite of intent).  
**he / es:** Same schema; translate chrome + bodies (not leave English in he/es).

---

## Locked implementation touchpoints

| Path | Change |
|------|--------|
| `src/components/onboarding/onboarding-text-field-help.tsx` (+ spec) | **new** — count + questions + examples/tips disclosures |
| `src/components/onboarding-texts-form.tsx` (+ spec) | Render help under each textarea |
| `src/lib/i18n/types.ts` | Types for chrome + field bodies |
| `src/lib/i18n/en.ts` | EN from content doc |
| `src/lib/i18n/he.ts` / `es.ts` | Translations |

Optional tiny pure helper: `countWords(text: string): number` colocated in help component file or `lib/` — fine either way.

**Prefer one help component** over two (`writing-prompts` + `example-profiles`) unless split clearly improves tests.

No dating-api changes. Do not change content markdown intent (UI may omit Meta/implementation notes sections).

---

## Out of scope

- Hard character/word max enforcement  
- Message composer prompts  
- Basic-form fields  
- Changing moderation  
- Photo tips  
- Re-authoring EN examples for “style”  

---

## Tests (required)

- Word count updates as user types  
- Questions visible for each field without expand  
- Examples toggle show/hide (default hidden)  
- Tips toggle show/hide (default hidden)  
- he or es smoke: chrome heading localized when locale set (optional but preferred)  
- Specs green  

---

## Acceptance criteria

- [x] Each of 3 fields shows soft word guidance + idea questions  
- [x] Examples expandable (default collapsed); 3 examples from content  
- [x] Writing tips expandable (default collapsed)  
- [x] No emoji; no hard 500 max; no cluttered always-open walls of text  
- [x] en/he/es wired  
- [x] Mobile + dark mode OK  
- [x] Specs green  

---

## Agent 1 status

**Complete** — see `handoffs/STORY_04_writing_prompts_implementation/agent-1-implement.md`

## Agent 2 status

**PASS** — see `handoffs/STORY_04_writing_prompts_implementation/agent-2-cr.md`

## Agent 3 status

**ACCEPT** — see `handoffs/STORY_04_writing_prompts_implementation/agent-3-pm.md`

## Next

```
--agent 0 sprint 34 story 5
```
