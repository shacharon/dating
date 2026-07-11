# Follow-up: Hard-blocked match card UI polish

**Type:** UI-only  
**Depends on:** Sprint 18 Story 1 (shipped)  
**Backend:** Not required for this pass (optional later)

---

## Goal

Hard-blocked cards already work. Make hierarchy, copy, and affordances clearer so “no longer a match” doesn’t feel confusing next to Liked / Edit / arrow.

---

## Do

### 1. Reason copy
- Primary line: direct and human, e.g.  
  **“This person smokes, while your preferences exclude smokers.”**
- Prefer templates from `hardBlocked.reasons[].code` + `dimension` (i18n `en` / `es` / `he`).
- Quotes (`evidence`) as optional quieter second line — not the main sentence.
- Fall back to API `message` only if code is unknown.

### 2. Liked vs hard-block
- Keep Liked as **status**, not a competing action.
- Copy: **“You liked them”** (or equivalent), quieter than the amber “No longer a match” badge.
- Don’t invent “Previously liked” unless Like was undone.

### 3. List card chrome
- On `hardBlocked` rows:
  - Remove **“Edit your story”**
  - Remove decorative **→**
- Whole card stays clickable → detail (unchanged).

### 4. Detail CTA
- Replace “Edit your story” with **“Review preferences”** (or “Edit dealbreakers” if that surface exists).
- Link to existing prefs / story edit route — no new override UI.

### 5. Metadata
- List: change “Analyzed …” → **“Updated …”**, or hide date on list cards.
- Fix low-contrast secondary text (gender / age / location).
- Trailing junk like **“e”** after age: treat as bad/empty `locationLabel` — hide empty or single-character labels; fix source if it’s a real data bug.

### 6. Layout (light touch)
- Give badge + reason more width; Liked status under name or as a small chip, not a heavy right-column action.

---

## Out of scope

- Soft ranking
- Auto-unmatch / notify
- New API fields / Prisma
- Changing existing vs new eligibility rules

---

## Done when

- [x] Hard-blocked list card: clear badge, direct reason, quiet Liked status, no Edit/arrow clutter
- [x] Detail: same hierarchy + clearer prefs CTA
- [x] i18n updated (`en` / `es` / `he`)
- [x] Location meta doesn’t show garbage (`e`)
- [x] Quick smoke: Liked+smoke conflict still shows; never-liked still omitted

---

## Files (likely)

- `dating-ui/src/app/dating/me-matches/page.tsx`
- `dating-ui/src/app/dating/me-matches/[id]/page.tsx`
- `dating-ui/src/app/dating/me-matches/hard-block-display.ts` (+ specs)
- `dating-ui/src/lib/i18n/{types,en,es,he}.ts`
- Optional: `match-display.ts` if secondary meta is built there
