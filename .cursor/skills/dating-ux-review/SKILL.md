---
name: dating-ux-review
description: >-
  UI/UX reviewer for dating app — accessibility, mobile, design system.
  Loaded by agent 3.5.
disable-model-invocation: true
---

# Dating App UI/UX Review (role)

Audit frontend for accessibility, responsiveness, and design consistency.

## Checklist

### Accessibility (WCAG 2.1 AA)
- [ ] Semantic HTML (buttons are `<button>`, not `<div onclick>`)
- [ ] Alt text on images
- [ ] Form labels associated with inputs (`<label htmlFor>`)
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Focus indicators visible (outlines not removed without replacement)
- [ ] Color contrast ≥4.5:1 for text (use contrast checker)
- [ ] Screen reader friendly (test with VoiceOver/NVDA or inspect ARIA)
- [ ] Error messages linked to form fields (`aria-describedby`)

### Mobile responsiveness
Test breakpoints:
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 768px (iPad)
- 1024px (desktop)

Check:
- [ ] Text is readable (≥16px on mobile)
- [ ] Buttons are tappable (≥44x44px)
- [ ] No horizontal scroll
- [ ] Images scale/crop appropriately
- [ ] Navigation menu works on mobile (hamburger or tabs)

### Design system compliance
Dating app palette:
- Primary: emerald-500 (`#10b981`)
- Background: zinc-50 → zinc-900 (light/dark mode)
- Error: red-500
- Text: zinc-900 (light) / zinc-50 (dark)

Check:
- [ ] Colors from Tailwind config (no hardcoded hex)
- [ ] Typography: `font-sans` (Inter)
- [ ] Spacing: use Tailwind scale (`p-4`, `gap-2`, not `padding: 17px`)
- [ ] Buttons: consistent size/shape (e.g., `rounded-lg px-4 py-2`)

### States
- [ ] Loading state (spinner, skeleton, or "Loading...")
- [ ] Error state (clear message, retry button if applicable)
- [ ] Empty state ("No matches yet" with icon/illustration)
- [ ] Success state (toast, checkmark, or message)

### Forms
- [ ] Labels above/beside inputs (not placeholder-only)
- [ ] Inline validation (red border + error text on blur)
- [ ] Submit button disabled while loading
- [ ] Clear "Required" indicators
- [ ] Help text for non-obvious fields

## Severity classification

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Unusable on common device/browser, blocks core flow | Form submit button off-screen on iPhone; no keyboard access to Like button |
| **High** | Poor UX, confusing, or fails WCAG AA | No alt text on profile photos; 3:1 contrast (too low); mobile text <14px |
| **Medium** | Inconsistent design, minor UX issue | Wrong color from palette; "Loading..." text instead of spinner; button size inconsistent |
| **Low** | Polish/nice-to-have | Missing empty state illustration; could use better microcopy |

**Critical/High = send back to Agent 1.** Medium/Low = document for future polish.

## Deliverables

Write `agent-3.5-ux.md`:

```markdown
## Accessibility

### Critical
- None

### High
1. Profile photo missing `alt` text
   - **Impact:** Screen reader users don't know it's a photo
   - **Fix:** Added `alt="Profile photo of {name}"`
   - **Commit:** abc123

### Medium
- Submit button focus outline removed (fix: restore with custom ring)

### Low
- None

## Mobile responsiveness
- [x] 320px: ✅ readable
- [x] 375px: ✅ readable
- [x] 768px: ✅ readable
- [x] 1024px: ✅ readable

## Design system compliance
- [x] Colors: ✅ from Tailwind config
- [x] Typography: ✅ font-sans
- [x] Spacing: ✅ Tailwind scale
- [x] Buttons: ⚠️ one button uses `px-3` instead of `px-4` (low priority)

## States
- [x] Loading: ✅ spinner
- [x] Error: ✅ message + retry
- [x] Empty: ⚠️ text-only (could add illustration)
- [x] Success: ✅ toast

## Forms
- [x] Labels: ✅ visible
- [x] Validation: ✅ inline errors
- [x] Submit button: ✅ disabled while loading
- [x] Required indicators: ✅ present
- [x] Help text: N/A

## Verdict: Approved | Needs-fixes

**If Approved:** Proceed to Agent 4 or Agent 3
**If Needs-fixes:** Send back to Agent 1 for critical/high issues
```

## Do not
- Redesign the UI or implement features
- Approve critical/high issues with "will fix later"
