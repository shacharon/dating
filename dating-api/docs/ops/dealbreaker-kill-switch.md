# Dealbreaker kill switch (ops)

**Env var:** `DEALBREAKER_HARD_DISABLED_TAGS`

**Format:** comma-separated closed taxonomy tags, e.g.

```bash
DEALBREAKER_HARD_DISABLED_TAGS=smoking,jealousy
```

**Effect:** For listed tags, any `HARD_EXCLUDE` / `HARD_REQUIRE` classification is demoted to `SOFT` before eligibility and before user-visible `inferredDealbreakers`. Soft signals do not gate `/api/v1/me/matches`. Silence still never blocks (`NEVER_BLOCKS`).

**Apply without a code deploy:** set the env on API processes and **restart** workers (k8s/pod restart). Within a running Node process the env is re-read on each extract call, but process managers typically only inject env at start.

**Invalid tags** in the CSV are ignored (warned once). Empty / unset = no kill switch.

**Rollback:** unset the var and restart.

**Do not** lower `DEALBREAKER_HARD_MIN_CONFIDENCE` (0.9) to raise recall — that requires a product story.
