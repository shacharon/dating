# Story 02 — Redis email debounce + online-skip

**Sprint 49 · Status: Planned · P0 · ~1d · Depends: Story 01 · Agent 2.5**

## Objective

Move `MessageEmailDebounceService` off process-local Map to Redis. Wire online-skip through shared presence from Story 01.

## Acceptance criteria

- [ ] Debounce works across instances (no duplicate emails within window)
- [ ] Online users on other node skipped for new-message email
