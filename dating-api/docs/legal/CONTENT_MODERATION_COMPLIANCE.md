# Content moderation — compliance checklist

Operator reference for Sprint 30 text content safety (OpenAI Moderation API).  
User-facing disclosure lives in `/privacy` and `/terms` (`dating-ui/content/legal/`).

**Related:** [DATA_RETENTION.md](./DATA_RETENTION.md) · Sprint 30 README · Stories 01–05

---

## 1. Purpose

| Processing | Processor | Notes |
|------------|-----------|--------|
| Profile analysis / match features | OpenAI (chat/completions-style models) | **Already live** — profile free-text |
| Content safety (flag harmful/explicit text) | OpenAI **Moderation API** | Sprint 30 Stories 01–05 — profile fields + messages when enabled |

Same third-party processor class; Story 00 extends disclosure so users are informed **before** moderation gates go live.

**MVP consent model:** Option A — disclosure only; GDPR Art. 6(1)(f) **legitimate interest** (platform safety). No per-user opt-in checkbox in Story 0.

---

## 2. Jurisdictions checklist

### Israel (Privacy Protection Law / חוק הגנת הפרטיות)

| Item | Status |
|------|--------|
| Disclose OpenAI as processor in privacy policy | Done (Story 0 — `/privacy`) |
| Reasonable security (HTTPS/TLS to OpenAI API) | Done (existing API usage) |
| User deletion path | Done (`DELETE /api/v1/me/account`) |

### GDPR (EU / EEA)

| Item | Status |
|------|--------|
| Legal basis documented (Art. 6(1)(f) legitimate interest — safety) | Done (privacy + this doc) |
| Third-party processor disclosed + link to OpenAI privacy policy | Done |
| Right to object / request manual review documented | Done (`/privacy` Your choices) |
| Data minimization (ops: no raw flagged text in structured traces) | Pending Stories 01+ implementation |
| Admin review / unblock path | Pending Story 05 |
| Violation retention limit (12 months) documented | Done (privacy + DATA_RETENTION) |
| OpenAI DPA / Data Processing Addendum accepted | **Pending ops** — **prod go-live blocker for moderation** |

#### Legitimate interest assessment (summary)

| Factor | Notes |
|--------|--------|
| Interest | Safer community; reduce harassment / explicit spam on a dating product |
| Necessity | Automated checks scale better than reports-only; aligned with existing OpenAI analysis use |
| Balancing | Users already send profile text to OpenAI for analysis; moderation adds safety with disclosure, appeal path, retention limit |
| Safeguards | Feature flag; fail-open on moderation timeout (Stories 01+); no PII/raw text in logs; admin unblock (Story 05); 12-month retention |

### CCPA (California / US)

| Item | Status |
|------|--------|
| Disclose third-party processing (OpenAI) in privacy policy | Done |
| “Sale” of personal information | N/A — safety processing only, not sold |
| Deletion mechanism | Done (account deletion) |

---

## 3. OpenAI DPA — ops steps

**Status: PENDING OPS** — required before enabling content moderation in **production**.

1. Sign in to the OpenAI platform account used by `OPENAI_API_KEY`.
2. Review/accept the [Data Processing Addendum](https://openai.com/policies/data-processing-addendum) (or account DPA flow).
3. Confirm coverage includes **API** usage that will call **Moderation** as well as existing chat/completions.
4. Store acceptance evidence in the **ops vault** (not in this public repo). Do **not** commit account IDs or signed PDFs with secrets.
5. When done, update this section’s status to **Done** and note the date + who verified.

Optional local pointer (no secrets): ops may keep a one-line note in their vault: “OpenAI DPA accepted YYYY-MM-DD for dating API project.”

---

## 4. Counsel questions (optional external review)

1. Can we rely on legitimate interest for content moderation under GDPR, or do we need explicit opt-in consent?
2. Does Israeli Privacy Protection Law require disclosures beyond what GDPR-style disclosure already covers?
3. Is our existing OpenAI DPA sufficient for Moderation API usage, or do we need a separate addendum?
4. Is **12 months** retention for violation records reasonable?
5. If we ever allow users under 18, do we need parental consent for moderation (COPPA / GDPR-K)?

Keep the UI **`[DRAFT — legal review pending]`** footer until counsel clears the draft.

---

## 5. Seven-day notice (go-live rule)

| Step | Rule |
|------|------|
| Publish updated `/privacy` + `/terms` | In the environment that will run moderation |
| Wait | **≥ 7 days** after publish |
| Then | Enable Stories 01–05 / `CONTENT_MODERATION_ENABLED` in that environment |

Story 0 can be **accepted** with DPA still pending ops; **prod moderation** must not enable until DPA is Done **and** the 7-day notice has elapsed.

---

## 6. Escalation path (Option B)

If counsel requires opt-in consent:

- Add signup/settings checkbox + `User.contentModerationConsent*` fields.
- Skip automated moderation for users who decline (reports-only).
- Revisit Story 00 / product legal before EU-wide launch.

Not in scope for Sprint 30 Story 0 implementation.
