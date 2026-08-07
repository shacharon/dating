# Phase 6: Relationship Psychology — Roadmap

## Overview

**14 new compatibility signals** across **6 sprints** (~3 months), completing the psychological/EQ coverage identified in the Aug 2026 gap review. This is the deepest layer yet: how people fight, recover, feel heard, grow, and balance family/friends/alone-time.

**CRITICAL: LLM-FIRST EXTRACTION — NO HARDCODED PATTERNS.**  
Read `docs/sprints/LLM_FIRST_PRINCIPLE.md` before every sprint.

**Depends on:** Sprint Expansion-09 (interest taxonomy complete; ~34 tracked signals + shadow extras)

---

## Why This Phase Exists

Prior phases covered values, lifestyle, activity-style, and a first EQ wave (empathy, vulnerability, regulation, humor, affection). What's still missing is **relationship skill under pressure** — the patterns that predict whether a couple lasts, per Gottman/attachment research:

- How they **fight and recover** (repair, forgiveness)
- How they behave **under stress** (pursue/withdraw, jealousy/security)
- Whether partners **feel heard** (listening, emotional expression)
- Whether they **grow** together (growth mindset, self-awareness)
- **Tolerance and intimacy pacing** (patience, intimacy speed, monogamy expectations)
- **Family/social ecosystem fit** (family closeness, friends vs couple, alone-time need)

---

## The Extraction Challenge — and the Fix

These signals are **harder to extract from a generic bio** than "I love travel." Nobody spontaneously writes "I have great repair skills." Two mitigations, used together:

1. **LLM-first semantic inference** from whatever text exists (as always — no keywords/regex)
2. **Guided onboarding prompts** — short, optional prompt questions shown during profile creation that elicit signal-rich answers. **You (product) will present these to users; this doc gives you the exact prompt text per signal.**

Both self-domain and partner-domain answers feed the same LLM extractor — no new pipeline, just richer input text.

---

## Sprint Breakdown

| Sprint | Theme | Signals | Duration |
|--------|-------|---------|----------|
| **10** | Conflict Recovery | `repairSkills`, `forgivenessStyle` | 2 weeks |
| **11** | Stress & Security | `stressResponse`, `jealousySecurity` | 2 weeks |
| **12** | Feeling Heard | `listeningPresence`, `emotionalExpression` | 2 weeks |
| **13** | Growth & Self-Awareness | `growthMindset`, `selfAwareness` | 2 weeks |
| **14** | Tolerance & Intimacy Pacing | `patienceTolerance`, `intimacyPacing`, `monogamyAlignment` | 2 weeks |
| **15** | Family & Social Ecosystem | `familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed` | 2 weeks |

**Total: 14 signals, 12 weeks (~3 months)**

Each sprint follows the same 5-story pattern as Sprints 01–09: Schema → LLM Extraction → Tension Rules → Chips/i18n → Testing.

---

## Master Onboarding Prompt Reference

Give these to users as **optional** short-answer prompts (self domain) during profile setup or as "add more to your profile" nudges. Keep them conversational, not clinical. One or two per screen, not all at once.

| Prompt (EN) | Prompt (HE) | Signals it feeds |
|-------------|--------------|-------------------|
| "When we disagree, I usually…" | "כשיש לנו חילוקי דעות, אני בדרך כלל..." | `repairSkills`, `stressResponse` |
| "After a fight, I tend to…" | "אחרי ריב, אני נוטה..." | `repairSkills`, `forgivenessStyle` |
| "When I'm stressed, I need my partner to…" | "כשאני לחוץ/ה, אני צריך/ה שבן/בת הזוג..." | `stressResponse` |
| "I feel most loved when my partner…" | "אני מרגיש/ה הכי אהוב/ה כש..." | `emotionalExpression`, `listeningPresence` |
| "A partner really listens to me when they…" | "בן/בת זוג באמת מקשיב/ה לי כש..." | `listeningPresence` |
| "A time I changed my mind about something important…" | "פעם ששיניתי את דעתי בנושא חשוב..." | `growthMindset` |
| "One thing I'm working on about myself…" | "דבר אחד שאני עובד/ת עליו בעצמי..." | `selfAwareness`, `growthMindset` |
| "Something about my partner that would test my patience, and how I'd handle it…" | "משהו בבן/בת הזוג שהיה מאתגר את הסבלנות שלי, ואיך הייתי מתמודד/ת..." | `patienceTolerance` |
| "How fast do you like to move emotionally/physically in a new relationship?" | "כמה מהר את/ה אוהב/ת להתקדם רגשית/פיזית בקשר חדש?" | `intimacyPacing` |
| "What does an exclusive relationship mean to you?" | "מה זוגיות בלעדית אומרת עבורך?" | `monogamyAlignment` |
| "How involved is your family in your day-to-day decisions?" | "כמה המשפחה שלך מעורבת בהחלטות היומיומיות שלך?" | `familyEnmeshment` |
| "A great weekend for me balances friends, alone time, and us time like…" | "סוף שבוע מושלם בשבילי מאזן בין חברים, זמן לבד וזמן ביחד ב..." | `friendCoupleBalance`, `aloneTimeNeed` |
| "How do you recharge after a long week?" | "איך את/ה נטען/ת מחדש אחרי שבוע ארוך?" | `aloneTimeNeed` |
| "Do you get jealous easily? What helps you feel secure?" | "את/ה מתקנא/ת בקלות? מה עוזר לך להרגיש בטוח/ה?" | `jealousySecurity` |

**Product note:** these are optional add-ons to existing "About me / About my ideal partner / About the relationship" fields — not a new required form. Users who skip them simply get `null` on these signals (sparse, as always).

---

## Cross-Cutting Rules (apply to all 6 sprints)

1. **LLM-first only** — no keyword/regex extraction, ever.
2. **Null when unclear** — do not force scores from onboarding-prompt silence.
3. **Shadow mode first** — extract → validate (>85% agreement) → promote to scoring.
4. **i18n from day 1** — EN/HE/ES evidence strings + onboarding prompt translations together.
5. **No duplication** — each new signal must be checked against all 34 existing signals in its sprint's "Distinctions" section before Story 2 starts.
6. **Chip diversity** — respect `SIGNAL_DOMAIN` grouping so chip picker doesn't over-select psychology chips over lifestyle/values.

---

## Signal Count Progression

| After sprint | Total tracked signals |
|---------------|------------------------|
| Expansion-09 (baseline) | 34 |
| Sprint 10 | 36 |
| Sprint 11 | 38 |
| Sprint 12 | 40 |
| Sprint 13 | 42 |
| Sprint 14 | 45 |
| Sprint 15 | 48 |

---

## Sprint Docs

1. `sprint-expansion-10-conflict-recovery/README.md`
2. `sprint-expansion-11-stress-security/README.md`
3. `sprint-expansion-12-feeling-heard/README.md`
4. `sprint-expansion-13-growth-self-awareness/README.md`
5. `sprint-expansion-14-tolerance-intimacy-pacing/README.md`
6. `sprint-expansion-15-family-social-ecosystem/README.md`

Agent commands: `EXPANSION_AGENT_COMMANDS.md` — Sprint Expansion-10 through 15 sections.
