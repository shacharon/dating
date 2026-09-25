# Story 2: Top links when DEMO is on

**Status:** Done
**Depends on:** Story 1, and a decision on landing flags vs these links
**Shipped on main:** `ff13956b`
**Feature tip ahead of main:** 0

## Goal

When `DEMO` is on, the top of the page shows the two other languages. A click opens that language on the right domain. When `DEMO` is off, those links are not rendered.

## Scope

- Render the two links from Story 1’s function. Labels: Hebrew, English, Spanish.
- Place them in the top bar on the landing page and, if the same header exists after login, there too.
- `DEMO` off: do not render them. Landing flags stay as they are today (same-host locale change).
- `DEMO` on: do not also run the in-place flag switch for the same click. One control only. The open decision in the sprint README picks which control is visible.
- Link href is a full URL (`https://…`) so the browser changes domain. Locale is in the query or path so the other host does not depend on the cookie.

## Acceptance criteria

- [x] `DEMO` off on `.il`: no English/Spanish links; page stays Hebrew-capable only through the existing same-host control
- [x] `DEMO` off on `.com`: no cross-domain links
- [x] `DEMO` on, Hebrew `.il`: links to English `.com` and Spanish `.com`, and those URLs are absolute
- [x] `DEMO` on, English `.com`: links to Hebrew `.il` and Spanish `.com`
- [x] `DEMO` on, Spanish `.com`: links to Hebrew `.il` and English `.com`
- [x] Tests render the links and the hidden state without a real browser navigation

## Affected files

- `dating-ui/src/components/language-picker.tsx` or a sibling used by `public-landing-client.tsx`
- App header only if the links must show after login (`authenticated-app-shell` / `AppNav`)
- i18n `en` / `he` / `es` only if new labels are required

## Dependencies

- Story 1
- Landing-flag conflict resolved

## Validation

`npx vitest run` for the landing spec and the new link spec, from `dating-ui`.

## Definition of done

- [x] The three host/locale cases and the off switch are tested. No matching or auth-cookie changes.
