# Story 1: DEMO flag and host map

**Status:** Done
**Depends on:** —
**Repo:** `dating-ui`
**Shipped on main:** `7fb331d2`
**Feature tip ahead of main:** 0

## Goal

One switch, `NEXT_PUBLIC_DEMO=1`, using the same build-arg pattern as `NEXT_PUBLIC_ADMIN_ENABLED`. A small host map turns the current hostname plus locale into the two other language URLs. No new config file.

## Scope

- Add the flag next to the other `NEXT_PUBLIC_*` gates. Default off.
- Add a pure function: given host, locale, and flag, return the two link targets or none.
- Hebrew host → `.il`. English and Spanish hosts → `.com`.
- Do not read a second env file. Do not add domain logic to a new middleware until Story 2 needs it.

## Acceptance criteria

- [x] `NEXT_PUBLIC_DEMO` unset or not `1` → the function returns no links
- [x] Hebrew on the `.il` host → English `.com` and Spanish `.com`
- [x] English on `.com` → Hebrew `.il` and Spanish `.com`
- [x] Spanish on `.com` → Hebrew `.il` and English `.com`
- [x] Unknown host → no links
- [x] Unit tests cover the four cases above

## Affected files

- New helper beside `dating-ui/src/lib/admin/admin-routes-gate.ts` (same `NEXT_PUBLIC_*` style)
- `dating-ui` Dockerfile build-arg list, only if the image must bake the flag
- Unit spec next to the helper

## Dependencies

- Confirmed hostnames
- Decision: one image with runtime host detection, or two builds

## Validation

`npx vitest run` on the new spec, from `dating-ui`.

## Definition of done

- [x] Tests pass. Flag defaults off. No UI change in this story.
