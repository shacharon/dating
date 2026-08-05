# Beta decision framework (GREEN / YELLOW / RED)

**Checkpoint:** end of **Week 4** after invite wave (not earlier for kill/pivot).  
**Product:** Piza · ~100 Tel Aviv beta users.

Metrics alone do **not** kill — always include support mail / 1:1 feedback.

---

## Small-n rules (required)

| Metric | Healthy denominator | If below |
|--------|---------------------|----------|
| D7 retention | cohort **n ≥ 20** | Report `returned / cohort` only; **do not** band GREEN/YELLOW/RED on % |
| Opener usage | `displayed ≥ 20` | Advisory |
| Opener response | `sent ≥ 10` | Advisory |

Admin UI marks D7 as `advisory` when cohort &lt; 20.

---

## Bands (when denominators healthy)

| Band | D7 | Opener usage (`used/displayed`) | Opener response (`reply/sent`) | Feedback | Action |
|------|-----|----------------------------------|--------------------------------|----------|--------|
| **GREEN** | ≥40% | ≥30% | stable / improving | Mostly positive | Plan scale toward ~500; growth sprint |
| **YELLOW** | 20–39% | 15–29% | flat | Mixed | Fix top complaint; extend beta +4 weeks |
| **RED** | &lt;20% | &lt;15% | collapsing | Mostly negative | Diagnose (UX / algorithm / market) → pivot or graceful shutdown |

Observational (not sole kill gates): HIGH browse share, HIGH email send volume, active users 7d, sign-ups since beta start.

---

## Week 4 meeting agenda

1. Pull `/admin/beta-metrics` screenshot + cookbook CW counts.  
2. List top 5 support themes.  
3. Assign band per metric (or “n too small”).  
4. Overall: GREEN / YELLOW / RED.  
5. Decide next sprint theme or shutdown steps.

---

## Shutdown sketch (if RED)

1. Stop new invites.  
2. Email betas: honest status + data/export note (see privacy policy).  
3. Post-mortem doc in `docs/beta/` (what failed).  
4. Choose: major pivot, pause, or archive.
