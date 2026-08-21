# No-new-regex policy (agents & PRs)

**Sprint 52 Story 03**

For Cursor agents and human PRs: where to put **new** signals — **not** ad-hoc regex in frozen keyword dumps (including `enrichment-v2` and its frozen siblings).

---

## Law

Keyword dumps are **FROZEN**. Adding regex, phrase patterns, or allowlist ids to any file on the frozen list requires an **RFC exception**.

- Process / RFC / frozen file list: [KEYWORD_ENGINE_FREEZE.md](./KEYWORD_ENGINE_FREEZE.md)
- Ownership / domain collisions: [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md)

Do **not** re-list frozen paths here — use the freeze doc table.

---

## Decision tree — where new signals go

| Need | Do this | Do not |
|------|---------|--------|
| New compatibility / shadow **numeric** signal or LLM interest guidance | Register via LLM expansion path (`src/extraction/` expansion manifest). Sprint 51 `docs/sprints/ADD_EXPANSION_PLAYBOOK.md` when that branch is merged; until then follow expansion-manifest headers under `src/extraction/` / `src/matches/` | Add regex to enrichment-v2, HG `*-text.extract`, `explicit-extended-lists`, or other files listed in FREEZE.md |
| New structured profile fact/pref already modeled in HG/canonical | Prefer structured fields / existing extract consumers | New phrase dump “just for matching” |
| Must extend a frozen dump (bugfix or approved product exception) | Follow FREEZE.md **RFC exception template** + parity fixtures | Silent allowlist growth |
| “One shared taxonomy table” | **Not available** — deferred follow-up epic; do not invent a parallel dump “until taxonomy” | Start another interest/lifestyle allowlist |

---

## PR checklist

Copy into the PR description:

- [ ] Did not add regex/phrases/allowlist ids to any file listed in [KEYWORD_ENGINE_FREEZE.md](./KEYWORD_ENGINE_FREEZE.md)
- [ ] Or: RFC completed per FREEZE.md and linked from this PR
- [ ] New LLM/expansion work follows the expansion registration path (not frozen dumps)
- [ ] Updated [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md) if ownership/overlap changed (rare; RFC cases)

---

## Related

- [KEYWORD_ENGINE_FREEZE.md](./KEYWORD_ENGINE_FREEZE.md) — freeze law + RFC
- [KEYWORD_INVENTORY.md](./KEYWORD_INVENTORY.md) — who owns what
- [STORY_02_freeze_or_taxonomy.md](./STORY_02_freeze_or_taxonomy.md) — freeze shipped; taxonomy deferred
- LLM expansion playbook: `docs/sprints/ADD_EXPANSION_PLAYBOOK.md` (when Sprint 51 Story 03 is merged)
