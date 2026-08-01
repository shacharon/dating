# Quick Start: All Sprint Commands

**Overview:** 4 sprints, 18 stories, ~4 weeks  
**Created:** 2026-08-01  
**Updated:** 2026-08-01 — Sprints 34–36 use **full waterfall** (same as Sprint 33)

---

## ⚙️ Agent process (LOCKED — by the book)

Every **work unit** (story or story+phase like `backend` / `frontend` / `content`) runs:

```text
--agent 0 …   # Architect / lock
--agent 1 …   # Implement
--agent 2 …   # Code review
--agent 3 …   # PM ACCEPT + commit
```

- Run **one command at a time**. Nothing auto-chains.
- Do **not** use short “role-only” one-liners (they skip CR/PM).
- Phase suffixes (`backend`, `frontend`, `content`, `implementation`) stay in the command; agents `0–3` are always the pipeline.

---

## 📐 Mockup Strategy

**WE DON'T HAVE MOCKUPS YET** - They need to be created!

**Approach: Phase 0 (Design) before Phase 1 (Implementation)**

| Story | Needs Mockup? | Type |
|-------|---------------|------|
| 33.1 | ✅ YES | High-fidelity (Figma) - Global nav |
| 33.5 | ✅ YES | Low-fidelity (simple sketch) - Progress header |
| 33.6 | ✅ YES | High-fidelity (Figma) - Landing page |
| 34.1 | ✅ YES | Low-fidelity - Message previews |
| 34.2 | ✅ YES | Low-fidelity - Error messages |
| 34.4 | ✅ YES | Low-fidelity + content - Writing prompts |
| 35.1 | ✅ YES | High-fidelity (Figma) - Unified profile |
| Others | ❌ NO | Pure implementation |

---

## Sprint 33: Critical Fixes + Navigation (Week 1)

### Day 1 (Start Here):

```bash
# Design work (blocking - must finish before Story 33.2)
--agent 0 sprint 33 story 1

# Parallel technical fixes (can start immediately)
--agent 2 sprint 33 story 3
--agent 3 sprint 33 story 4
```

### Day 2 (After 33.1 approved):

```bash
# Navigation implementation (needs approved mockups from 33.1)
--agent 1 sprint 33 story 2

# Landing page design (parallel)
--agent 0 sprint 33 story 6 phase 0
```

### Day 3:

```bash
# Onboarding header (uses nav patterns from 33.2)
--agent 1 sprint 33 story 5

# Landing page implementation (after design approved)
--agent 1 sprint 33 story 6 phase 1
```

### Sprint 33 Summary:
- **6 stories**
- **Mockups needed:** 3 (nav, onboarding header, landing)
- **Deliverables:** Global nav, scroll fix, clean routes, better onboarding, landing page

---

## Sprint 34: Content & Messaging UX (Week 2)

Run **sequentially** (waterfall per phase). Start:

```bash
--agent 0 sprint 34 story 1 backend
```

Full command list is under **Complete Command Reference → Sprint 34** below.

### Sprint 34 Summary:
- **5 stories** (several have backend + frontend phases)
- **Mockups needed:** low-fidelity where noted in story docs
- **Deliverables:** Message previews, moderation transparency, writing prompts, filters
- **Process:** full waterfall 0→1→2→3 per phase

---

## Sprint 35: Profile Consolidation (Week 3)

Start:

```bash
--agent 0 sprint 35 story 1
```

Full list under **Complete Command Reference → Sprint 35**.

### Sprint 35 Summary:
- **4 stories**
- **Mockups needed:** unified profile design (35.1)
- **Deliverables:** Unified profile page, quality score, clean URLs
- **Process:** full waterfall 0→1→2→3 per phase

---

## Sprint 36: Component Refactoring (Week 4)

Start:

```bash
--agent 0 sprint 36 story 1
```

Full list under **Complete Command Reference → Sprint 36**.

### Sprint 36 Summary:
- **3 stories**
- **Mockups needed:** 0 (refactoring only)
- **Deliverables:** Clean code, documentation, maintainability
- **Process:** full waterfall 0→1→2→3 per story (no parallel skip of CR/PM)

---

## 📊 Complete Command Reference

### Sprint 33 (6 stories):

```bash
--agent 0 sprint 33 story 1          # Design global nav (4-6h)
--agent 1 sprint 33 story 2          # Implement global nav (8-10h) - DEPENDS ON 33.1
--agent 2 sprint 33 story 3          # Preserve scroll position (2-3h)
--agent 3 sprint 33 story 4          # Kill redundant routes (2-3h)
--agent 1 sprint 33 story 5          # Fixed onboarding progress (4-5h) - DEPENDS ON 33.2
--agent 0 sprint 33 story 6 phase 0  # Landing page design (3h)
--agent 1 sprint 33 story 6 phase 1  # Landing page implementation (5h) - DEPENDS ON 33.6 phase 0
```

### Sprint 34 (5 stories — waterfall per phase):

```bash
# --- 34.1 Message previews ---
--agent 0 sprint 34 story 1 backend
--agent 1 sprint 34 story 1 backend
--agent 2 sprint 34 story 1 backend
--agent 3 sprint 34 story 1 backend
--agent 0 sprint 34 story 1 frontend
--agent 1 sprint 34 story 1 frontend
--agent 2 sprint 34 story 1 frontend
--agent 3 sprint 34 story 1 frontend

# --- 34.2 Moderation errors ---
--agent 0 sprint 34 story 2 backend
--agent 1 sprint 34 story 2 backend
--agent 2 sprint 34 story 2 backend
--agent 3 sprint 34 story 2 backend
--agent 0 sprint 34 story 2 frontend
--agent 1 sprint 34 story 2 frontend
--agent 2 sprint 34 story 2 frontend
--agent 3 sprint 34 story 2 frontend

# --- 34.3 Timestamps ---
--agent 0 sprint 34 story 3
--agent 1 sprint 34 story 3
--agent 2 sprint 34 story 3
--agent 3 sprint 34 story 3

# --- 34.4 Writing prompts ---
--agent 0 sprint 34 story 4 content
--agent 1 sprint 34 story 4 content
--agent 2 sprint 34 story 4 content
--agent 3 sprint 34 story 4 content
--agent 0 sprint 34 story 4 implementation
--agent 1 sprint 34 story 4 implementation
--agent 2 sprint 34 story 4 implementation
--agent 3 sprint 34 story 4 implementation

# --- 34.5 Conversation filters (after 34.1) ---
--agent 0 sprint 34 story 5
--agent 1 sprint 34 story 5
--agent 2 sprint 34 story 5
--agent 3 sprint 34 story 5
```

### Sprint 35 (4 stories — waterfall per phase):

```bash
# --- 35.1 Design unified profile ---
--agent 0 sprint 35 story 1
--agent 1 sprint 35 story 1
--agent 2 sprint 35 story 1
--agent 3 sprint 35 story 1

# --- 35.2 Implement unified profile (after 35.1) ---
--agent 0 sprint 35 story 2
--agent 1 sprint 35 story 2
--agent 2 sprint 35 story 2
--agent 3 sprint 35 story 2

# --- 35.3 Profile quality ---
--agent 0 sprint 35 story 3 backend
--agent 1 sprint 35 story 3 backend
--agent 2 sprint 35 story 3 backend
--agent 3 sprint 35 story 3 backend
--agent 0 sprint 35 story 3 frontend
--agent 1 sprint 35 story 3 frontend
--agent 2 sprint 35 story 3 frontend
--agent 3 sprint 35 story 3 frontend

# --- 35.4 Test and migrate routes (after 35.2) ---
--agent 0 sprint 35 story 4
--agent 1 sprint 35 story 4
--agent 2 sprint 35 story 4
--agent 3 sprint 35 story 4
```

### Sprint 36 (3 stories — waterfall each):

```bash
# --- 36.1 Match detail refactor ---
--agent 0 sprint 36 story 1
--agent 1 sprint 36 story 1
--agent 2 sprint 36 story 1
--agent 3 sprint 36 story 1

# --- 36.2 Conversation detail refactor ---
--agent 0 sprint 36 story 2
--agent 1 sprint 36 story 2
--agent 2 sprint 36 story 2
--agent 3 sprint 36 story 2

# --- 36.3 Cleanup and docs ---
--agent 0 sprint 36 story 3
--agent 1 sprint 36 story 3
--agent 2 sprint 36 story 3
--agent 3 sprint 36 story 3
```

---

## 🎯 Critical Path (Must Complete in Order)

```
Sprint 33:
  Story 33.1 (design nav) → 33.2 (implement nav) → 33.5 (onboarding)
  Story 33.6 phase 0 (design landing) → 33.6 phase 1 (implement landing)
  
Sprint 34:
  Each phase: agent 0 → 1 → 2 → 3 (explicit, sequential)
  34.1 backend → 34.1 frontend → … → 34.5
  34.5 depends on 34.1 complete
  
Sprint 35:
  Each phase: agent 0 → 1 → 2 → 3
  35.1 → 35.2 → 35.4
  35.3 backend → 35.3 frontend
  
Sprint 36:
  Each story: agent 0 → 1 → 2 → 3 (prefer sequential; no skipping CR/PM)
```

---

## 🚀 Getting Started

### To start the entire 4-sprint plan:

```bash
# Week 1 - Day 1
--agent 0 sprint 33 story 1  # Start here - design global nav
```

### To resume from a specific sprint:

```bash
# Sprint 34 — start waterfall
--agent 0 sprint 34 story 1 backend

# Sprint 35 — start waterfall
--agent 0 sprint 35 story 1

# Sprint 36 — start waterfall
--agent 0 sprint 36 story 1
```

---

## 📋 Checklist: Before Starting Each Sprint

### Sprint 33:
- [ ] Review UX_UI_PAGE_REVIEW.md
- [ ] Confirm design tool access (Figma or similar)
- [ ] Confirm 3-4 agents can run in parallel

### Sprint 34:
- [ ] Sprint 33 stories 33.2 and 33.3 complete (nav and scroll)
- [ ] Content writer available for Story 34.4
- [ ] Backend and frontend agents coordinated

### Sprint 35:
- [ ] Sprint 34 message previews complete
- [ ] Design approved for unified profile
- [ ] Plan for testing all old route redirects

### Sprint 36:
- [ ] All user-facing features complete (33-35)
- [ ] Ready for code cleanup and documentation
- [ ] Storybook set up (optional but recommended)

---

## 📊 Expected Outcomes

### After Sprint 33:
✅ Users can navigate between sections easily (global nav)  
✅ Scroll position preserved in match list  
✅ Cleaner route structure (40% fewer routes)  
✅ Better onboarding experience  
✅ Compelling landing page  

### After Sprint 34:
✅ Conversation list is useful (previews, timestamps)  
✅ Users understand what was flagged in moderation  
✅ Profile writing is guided  
✅ Conversations are searchable  

### After Sprint 35:
✅ One unified profile page  
✅ Profile quality guidance  
✅ All profile features in one place  

### After Sprint 36:
✅ Clean, maintainable codebase  
✅ Components < 200 lines  
✅ 0 linter warnings  
✅ Comprehensive documentation  

---

## 📝 Notes

1. **Waterfall:** Always `0 → 1 → 2 → 3` per phase (Sprints 33–36). One command at a time.
2. **Dependencies:** Finish a phase’s agent 3 before starting the next phase that depends on it.
3. **Testing:** Manual QA after each story ACCEPT.
4. **Agent numbers:** `0` architect, `1` implement, `2` CR, `3` PM — not “backend vs frontend roles”.

---

## 🎉 Completion

After all 4 sprints:
- **18 stories complete**
- **7 mockups created**
- **~100-130 hours of work**
- **Production-ready UX improvements**

Good luck! 🚀
