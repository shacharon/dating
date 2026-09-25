# Sprint 78 — Demo language links across .il and .com

**Status:** Done — Stories 1–2 complete. Hebrew hostname stays parked in env.
**Commands:** [AGENT_COMMANDS.md](./AGENT_COMMANDS.md)
**Repo:** `dating-ui`
**Follows:** [Sprint 77 — Skippable preferences](../sprint-77-preferences-step/README.md)

## Goal

A `DEMO` flag shows two cross-language links at the top of the site. Each link opens the other language on the correct domain. When `DEMO` is off, those links are absent: Hebrew stays on `.il`, and `.com` keeps only its normal language behavior.

## What exists today (mapped before any code)

| Piece | Active path | What it does |
|---|---|---|
| Language choice | `LanguagePicker` on the logged-out landing page | Three flags. Click stores `he` / `en` / `es` in `localStorage` and a `locale` cookie. The page stays on the **same host**. |
| Locale read | `readStoredLocale` / `useAppLocale` | Browser only. Server render starts as English until the client reads storage. |
| Routing | `dating-ui/src/middleware.ts` | Auth gate and a few `/dating` aliases. **No host check. No locale check.** |
| Public host in code | `findyouraidate.com` in the messaging socket helper | No `.il` host. No second brand domain. |
| Flags | `NEXT_PUBLIC_*` build args (`NEXT_PUBLIC_ADMIN_ENABLED`, `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES`, `NEXT_PUBLIC_AUTH_TEST`) | On/off is `"1"` vs unset. Baked in at Docker build. No `DEMO` flag yet. Reuse this pattern: `NEXT_PUBLIC_DEMO=1`. |
| Legacy | `/settings/language` | The account menu link was removed. The page can still exist. It is not the landing control. |

## Stop — do not write code until these are decided

1. **There is no domain detection.** Hebrew is not tied to `.il`. English and Spanish are not tied to `.com`. The real hostnames are not in the repo. Implementation needs the exact `.il` host and the exact `.com` host, or the links will be guessed.
2. **The landing flags and the demo links do different things.** Flags change language in place. Demo links must leave the site. Showing both on the landing page will fight. Demo links replace the flags while `DEMO` is on, or they sit in the app header and the flags stay. Pick one.
3. **Cookies do not cross `.il` and `.com`.** The locale cookie and the login cookie stay on the host that set them. A link must carry the language in the URL (or the other host must default from its own name). A signed-in user who follows a demo link will land logged out.
4. **`NEXT_PUBLIC_DEMO` is fixed at build time.** One image cannot be demo on `.il` and off on `.com` unless the hosts are separate builds, or the flag is read from the request host at runtime. Say which.

## Decisions to lock

- Hebrew link → same brand, `.il`, locale `he`.
- English link → same brand, `.com`, locale `en`.
- Spanish link → `.com`, locale `es`.
- `.il` + Hebrew shows English and Spanish only.
- `.com` + English shows Hebrew and Spanish only.
- `.com` + Spanish shows Hebrew and English only.
- `DEMO` off: no cross-domain links. `.il` is Hebrew only. `.com` uses the production language behavior that already exists (flags on the landing page, same host).

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [DEMO flag and host map](./STORY_01_demo_flag_and_hosts.md) | **Done** | Host via `NEXT_PUBLIC_HEBREW_HOST` |
| 2 | [Top links when DEMO is on](./STORY_02_demo_language_links.md) | **Done** | 1, and the flag-vs-link decision |

## Out of scope

- Changing matching, analysis, or preferences
- Sharing login cookies across `.il` and `.com`
- A new config system beside `NEXT_PUBLIC_*`
