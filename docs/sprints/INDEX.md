# Compatibility Signals Expansion - Documentation Index

## Quick Start

**New to this project? Read in this order:**

1. **Executive Summary** (5 min read)  
   `EXPANSION_SUMMARY.md`  
   What we're building, why, and timeline.

2. **⚠️ LLM-First Principle** (3 min read) **MANDATORY**  
   `LLM_FIRST_PRINCIPLE.md`  
   **Read this before EVERY coding session.**  
   NO hardcoded patterns rule.

3. **Current State Analysis** (10 min read)  
   `../COMPATIBILITY_SIGNALS_SUMMARY.md`  
   What we have (15 signals), what's missing (10 signals), research basis.

4. **Full Roadmap** (15 min read)  
   `EXPANSION_NEW_SIGNALS_ROADMAP.md`  
   15 sprints, detailed breakdown, migration strategy.

4b. **Phase 6 Roadmap** (10 min read) — Relationship Psychology  
   `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md`  
   14 signals, 6 sprints, master onboarding prompt reference.

5. **Sprint 1 Details** (20 min read)  
   `sprint-expansion-01-empathy-vulnerability/README.md`  
   Story-level tasks, acceptance criteria, testing.

---

## Documents by Purpose

### Planning & Strategy
- `EXPANSION_SUMMARY.md` — Executive summary
- `EXPANSION_NEW_SIGNALS_ROADMAP.md` — 6-sprint roadmap
- `../COMPATIBILITY_SIGNALS_SUMMARY.md` — Gap analysis & research

### Development Rules
- `LLM_FIRST_PRINCIPLE.md` — **MANDATORY READ** before coding
- Code review checklist
- LLM prompt template

### Sprint Details
- `sprint-expansion-01-empathy-vulnerability/` — Sprint 1: Empathy & Vulnerability ✅
- `sprint-expansion-02-regulation-affection/` — Sprint 2: Emotional Regulation & Affection ✅
- `sprint-expansion-03-humor-playfulness/` — Sprint 3: Humor & Playfulness ✅
- `sprint-expansion-04-intellectual-creative/` — Sprint 4: Intellectual & Creative ✅
- `sprint-expansion-05-activity-domestic/` — Sprint 5: Activity & Domestic ✅
- `sprint-expansion-06-adventure-novelty/` — Sprint 6: Adventure & Novelty ✅
- `sprint-expansion-07-profile-gap-signals/` — Sprint 7: Profile Gap Signals (Hebrew samples) ✅
- `sprint-expansion-08-education-integrity-lifestyle/` — Sprint 8: Education, Integrity, Chronotype & Physical Type
- `sprint-expansion-09-interest-taxonomy/` — Sprint 9: Interest Taxonomy (`biking`, `camping`, `nature`)
- `sprint-expansion-10-conflict-recovery/` — Sprint 10: Conflict Recovery (`repairSkills`, `forgivenessStyle`)
- `sprint-expansion-11-stress-security/` — Sprint 11: Stress & Security (`stressResponse`, `jealousySecurity`)
- `sprint-expansion-12-feeling-heard/` — Sprint 12: Feeling Heard (`listeningPresence`, `emotionalExpression`)
- `sprint-expansion-13-growth-self-awareness/` — Sprint 13: Growth & Self-Awareness (`growthMindset`, `selfAwareness`)
- `sprint-expansion-14-tolerance-intimacy-pacing/` — Sprint 14: Tolerance & Intimacy Pacing (`patienceTolerance`, `intimacyPacing`, `monogamyAlignment`)
- `sprint-expansion-15-family-social-ecosystem/` — Sprint 15: Family & Social Ecosystem (`familyEnmeshment`, `friendCoupleBalance`, `aloneTimeNeed`)
- `PHASE6_RELATIONSHIP_PSYCHOLOGY_ROADMAP.md` — Phase 6 overview + master onboarding prompts
- `EXPANSION_AGENT_COMMANDS.md` — All agent commands (copy-paste)

---

## By Role

### Backend Engineer
**Must read:**
1. `LLM_FIRST_PRINCIPLE.md` ⚠️
2. `EXPANSION_NEW_SIGNALS_ROADMAP.md`
3. Current sprint README

**Focus on:**
- LLM semantic extraction (Story 2 in every sprint)
- Schema updates (Story 1)
- Tension rules (Story 3)

### Frontend Engineer
**Must read:**
1. `EXPANSION_SUMMARY.md`
2. Current sprint README (Story 4)

**Focus on:**
- Chip display in UI
- i18n (EN/HE/ES)
- Visual QA in all locales

### QA Engineer
**Must read:**
1. `EXPANSION_SUMMARY.md`
2. Current sprint README (Story 5)

**Focus on:**
- LLM extraction validation
- Integration testing
- Manual quality checks

### Prompt Engineer
**Must read:**
1. `LLM_FIRST_PRINCIPLE.md` ⚠️
2. Current sprint README (Story 2)

**Focus on:**
- Semantic definitions
- Prompt optimization
- Extraction quality validation

---

## Key Principles

### 1. LLM-First Extraction
**NO hardcoded patterns, keywords, or regex for signals.**

All extraction uses semantic LLM definitions.

### 2. Comprehensive i18n
Every signal must have evidence strings in:
- English (EN)
- Hebrew (HE)
- Spanish (ES)

### 3. Research-Backed
All signals come from published relationship research:
- Gottman Institute (40+ years)
- Attachment theory
- Emotional intelligence framework
- Meta-analyses

### 4. Gradual Rollout
- Shadow mode (extract, don't score)
- A/B test (10% of users)
- Full rollout (monitor quality)

---

## Current Status

**Phase:** Planning → Sprint 1 Ready to Start

**Next Sprint:** Expansion-01 (Empathy & Vulnerability)

**Timeline:**
- Sprint 1-3: Phase 1 (Emotional Intelligence) — 6 weeks
- Sprint 4-6: Phase 2 (Activity-Style) — 6 weeks
- Sprint 7: Phase 3 (Profile Gap Signals) — 2 weeks
- Sprint 8: Phase 4 (Education, Integrity, Lifestyle) — 2 weeks
- Sprint 9: Interest Taxonomy Gaps — 1 week
- Sprint 10-15: Phase 6 (Relationship Psychology) — 12 weeks
- Total: ~7 months

---

## Resources

### Research Papers
- Gottman, J. & Silver, N. (1999). *The Seven Principles for Making Marriage Work*
- Levine, A. & Heller, R. (2010). *Attached: The New Science of Adult Attachment*
- Karney & Bradbury (1995). Meta-analysis of relationship predictors
- Goleman, D. (1995). *Emotional Intelligence*

### Internal Docs
- Match engine overview: `dating-api/docs/MATCH_ENGINE_DEEP_DIVE.md`
- Current signals: `dating-api/src/compatibility/compatibility-score.ts`
- Tension rules: `dating-api/src/engine/tension-rules.ts`

---

## Questions?

**Where do I start?**  
Read `EXPANSION_SUMMARY.md` then `LLM_FIRST_PRINCIPLE.md`.

**What's the most important rule?**  
NO HARDCODED PATTERNS. LLM semantic extraction only.

**How do I add a new signal?**  
Follow the pattern in `sprint-expansion-01-empathy-vulnerability/README.md` Story 2.

**Where do I ask questions?**  
Team channel / sprint standup / create a doc in this folder.

---

## Contributing

When adding sprint details:
1. Create folder: `sprint-expansion-XX-description/`
2. Create `README.md` with 5 stories
3. Use Sprint 1 as template
4. Update this INDEX.md

When updating principles:
1. Edit `LLM_FIRST_PRINCIPLE.md`
2. Get team review
3. Announce in team channel

---

**Last Updated:** Aug 7, 2026  
**Maintained By:** Product / Engineering Team
