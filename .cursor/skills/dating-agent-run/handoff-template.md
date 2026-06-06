# Handoff: Agent [N] — [ROLE] — Story [M]

**Agent:** 0 architect | 1 dev | 2 code-review | 3 pm  
**Story:** [link to story file]  
**Sprint:** [sprint folder name]  
**Date:** YYYY-MM-DD  
**Status:** complete | blocked  

---

## Summary

- Bullet 1
- Bullet 2
- Bullet 3

---

## Artifacts

| Path | Change |
|------|--------|
| `path/to/file` | created / updated / N/A (design only) |

---

## Decisions (do not reverse without discussion)

- Decision 1
- Decision 2

---

## Runtime topology (architect — realtime / proxy / cookies only)

- REST browser target:
- Socket browser target:
- Cookie host rule:
- Connection policy (singleton / per-page):
- Expected Network tab:

---

## Tests / verification

- [ ] Unit/integration command: `...`
- [ ] Result: pass / fail / not run (architect/pm)
- [ ] `prisma migrate deploy` (if schema changed): yes / N/A
- [ ] Browser Network smoke (dev/CR): pass / deferred / N/A
- [ ] Socket transport: WebSocket 101 / polling-only / not checked

---

## Open questions / blockers

- None | ...

---

## Next agent

```text
--agent [N] story [M]
```

**Notes for next agent:**

- ...
