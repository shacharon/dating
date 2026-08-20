# Engine vs Holy Grail ownership

**Sprint 53 Story 03.** Short map of who owns product matching after `PairMatchPolicy`. Deep ranking rules live in code — do not treat this doc as a second contract.

Canonical contract comment: [`src/matches/match-ranking-contract.ts`](../../src/matches/match-ranking-contract.ts) (`HG_GATE_LEGACY_RANK_V1`).

---

## Product source of truth (after PairMatchPolicy)

| Concern | Owner / SoT |
|---------|-------------|
| Product pair eval entry | `PairMatchPolicy` → default `HgGateLegacyRankPolicy` ([`src/matching-policy/`](../../src/matching-policy/)) |
| Contract id | `HG_GATE_LEGACY_RANK_V1` (`MATCH_RANKING_CONTRACT`) |
| List / detail ranking score | Legacy engine `compareWithStatus` / `finalScore` via policy — **not** HG rank as sort key |
| HG role in product | Hard eligibility / gate + diagnostics — **not** production list sort key |
| Product HTTP | `/api/v1/me/*` (especially matches) |
| Lab HTTP | `/api/evaluate`, `/api/matches` — [LEGACY_HTTP_QUARANTINE.md](./LEGACY_HTTP_QUARANTINE.md) — **not** product |
| Engine change process | [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md) |

**Code entry points:** [`pair-match-policy.ts`](../../src/matching-policy/pair-match-policy.ts), [`hg-gate-legacy-rank.policy.ts`](../../src/matching-policy/hg-gate-legacy-rank.policy.ts), [`match-ranking.service.ts`](../../src/me-profile/matches/match-ranking.service.ts) (injects `PAIR_MATCH_POLICY`).

**Not chosen:** `HG_GATE_HG_RANK` (HG as list sort key) — see contract file; out of scope until product asks.

Also: [PUBLIC_HTTP_ALLOWLIST.md](./PUBLIC_HTTP_ALLOWLIST.md).

---

## What `holy-grail-matching/` owns

- Hard eligibility / gate, dealbreakers, HG diagnostics and pair directions
- Inputs to the policy **gate** — not the production list **sort key**
- Product UI may show HG diagnostics; ranking score remains legacy via policy

---

## What `engine/` (legacy compare) owns

- Compatibility score used for ranking (`compareWithStatus` → `finalScore`), surfaced through `PairMatchPolicy`
- Explainability / recommendation returned on that score path
- Scoring changes still follow [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md)

---

## Lab / non-product surfaces

See [LEGACY_HTTP_QUARANTINE.md](./LEGACY_HTTP_QUARANTINE.md).

`GET /api/matches` and `POST /api/evaluate/*` are **admin/lab only**, not product dual-paths. Product matches stay on `/api/v1/me/*`. Ownership SoT above **reconfirms** there is no product dependency on those lab routes; **hard-delete remains a follow-up** (not this story).

---

## Do not

- Treat `GET /api/matches` or `POST /api/evaluate` as product HTTP
- Sort product lists by `hgRankScore` (or other HG rank fields) under the current contract
- Add new product pair-eval call sites that bypass `PairMatchPolicy`
