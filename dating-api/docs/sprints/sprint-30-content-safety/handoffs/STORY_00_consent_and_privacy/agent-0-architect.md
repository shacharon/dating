# Handoff: Agent 0 — Architect — Story 0

**Agent:** 0 architect  
**Story:** [STORY_00_consent_and_privacy.md](../../STORY_00_consent_and_privacy.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Legal/docs + product disclosure (not Nest moderation gates). Skip Agent 4 (no e2e harness; unit/spec for markdown render if needed).

---

## Summary

- **Extend existing legal markdown** (not invent new React page trees) so `/privacy` and `/terms` disclose OpenAI content-safety processing before Stories 01–05 go live.
- **Legal basis for MVP:** GDPR Art. 6(1)(f) **legitimate interest** (platform safety) — **Option A** disclosure-only. **No** signup opt-in checkbox and **no** Prisma consent columns in this story.
- **Operator compliance pack:** add `CONTENT_MODERATION_COMPLIANCE.md`; extend `DATA_RETENTION.md` for future `UserContentViolation` rows (Stories 01+).
- **OpenAI DPA:** ops checklist item (verify/sign + store copy) — Agent 1 does **not** invent a fake PDF.
- **In-app safety banner / DB disclosure flags:** **out of scope** for Story 0 (optional follow-up after Story 05).
- **Go-live rule:** ship policy/terms updates to the environment that will host moderation **≥7 days** before enabling `CONTENT_MODERATION_ENABLED` / Stories 01–05 prod.

---

## Artifacts (Agent 1 must touch)

| Path | Change |
|------|--------|
| `dating-ui/content/legal/privacy.md` | **Update** — content safety, OpenAI processor, rights/object, violation retention summary |
| `dating-ui/content/legal/terms.md` | **Update** — expand acceptable use + automated enforcement language |
| `dating-api/docs/legal/DATA_RETENTION.md` | **Update** — violation records on account delete + retention window |
| `dating-api/docs/legal/CONTENT_MODERATION_COMPLIANCE.md` | **Create** — GDPR / CCPA / Israeli checklist + LIA notes + DPA ops steps |
| `dating-ui/src/app/(public)/privacy/page.spec.tsx` | Update if assertions depend on old copy; keep draft-footer check |
| Story / README status | Agent 3 updates after accept |

**Do not change in Story 0:**

| Path | Why |
|------|-----|
| `dating-ui/src/app/(public)/privacy/page.tsx` / `terms/page.tsx` | Already load markdown via `LegalDocumentPage` — leave as-is |
| Prisma / Nest moderation modules | Stories 01–05 |
| `User.contentModerationConsent*` / disclosure flags | Option B / banner deferred |
| Fake `openai-dpa.pdf` in git | Ops stores signed DPA offline or in secrets vault; compliance doc links checklist only |

---

## Decisions (do not reverse without discussion)

### 1. Consent model — Option A only (locked)

| Option | Verdict |
|--------|---------|
| **A — Disclosure in privacy/terms; legitimate interest** | **Chosen** |
| **B — Opt-in checkbox + skip moderation if declined** | **Rejected for Story 0 / MVP** |

**Rationale (locked for product + Agent 1 copy):**

- Profile analysis already sends free-text to OpenAI (GPT). Moderation is the **same processor class**, different endpoint — extending disclosure, not inventing a new processor relationship from zero.
- Content safety is a **core platform function**, not marketing profiling → Art. 6(1)(f) is the intended MVP basis.
- Story text that says GDPR “requires explicit consent for third-party processing” is **too absolute** — Agent 1 copy must **not** claim “we always need consent for any third-party processing.” Document legitimate interest + right to object instead.
- Option B remains a **future escape hatch** if counsel requires it (document in compliance MD as “escalation path”).

**No Agent 1 schema migration for consent.**

---

### 2. Source of truth for legal UX (locked)

| Concern | Lock |
|---------|------|
| User-facing policy body | `dating-ui/content/legal/privacy.md` |
| User-facing terms body | `dating-ui/content/legal/terms.md` |
| Routes | Existing `/privacy`, `/terms` |
| Language | English body only (same as Sprint 9 Story 5) |
| Draft marker | Keep `LegalDocumentPage` **`[DRAFT — legal review pending]`** footer until counsel clears |
| Last-updated line | Bump to **August 2026 (draft)** (or exact ship date when Agent 1 commits) |

Do **not** hardcode long legal HTML in `page.tsx` (story examples were illustrative only).

---

### 3. Privacy.md sections (locked outline)

Agent 1 must add/adjust these sections (wording may be polished; meaning locked):

1. **How we use data** — add bullet: automated **content safety** checks on profile text and messages to detect harmful/explicit/abusive content.
2. **AI / third-party processors** (new H2 or H3 under use/processors):
   - Name: **OpenAI**
   - Purposes: (a) profile analysis / match features (existing behavior — make explicit), (b) **content moderation** of profile free-text and messages (upcoming / when enabled)
   - Data shared: profile free-text fields; message text when moderation is enabled
   - Retention by OpenAI for Moderation API: describe per OpenAI’s published moderation/API policies (do not invent “never retained forever” if policy differs — prefer “processed for safety checks; see OpenAI privacy policy”)
   - Link: `https://openai.com/policies/privacy-policy`
   - Legal basis language: platform safety / legitimate interest (GDPR Art. 6(1)(f)) where that law applies
3. **Your rights / choices** — right to **object** to automated content safety processing and request **manual review** of a blocked/flagged action by contacting the operator (same contact pattern as current Privacy “Contact” section — pilot invite / operator; do not invent a fake `support@` domain unless already used elsewhere).
4. **Data retention** — short user-facing note: **content violation records** may be kept up to **12 months** for safety/compliance, then deleted unless needed for an active investigation; on account deletion they are deleted with other personal content per table below (see DATA_RETENTION.md).
5. Keep existing account-deletion table; add a row or footnote for violation records once Stories 01+ exist conceptually.

---

### 4. Terms.md sections (locked outline)

Expand **Acceptable use** (existing section — do not create a second conflicting section):

- Explicitly forbid: sexually explicit/pornographic content, hate, harassment, violence/threats, spam/commercial solicitation (align with Sprint 30 gates).
- State that we may use **automated tools** to detect violations.
- State that repeated violations may lead to **restrictions**, including temporary or permanent limits on **messaging** and/or **profile editing**, up to suspension.

Keep existing report-flow language; enforcement is **in addition to** reports, not a replacement.

---

### 5. DATA_RETENTION.md (locked deltas)

Add sections/rows:

| Topic | Lock |
|-------|------|
| When moderation ships | `UserContentViolation` rows store flagged text + category for ops |
| On account delete | **Hard-delete** all `UserContentViolation` for that `userId` (same txn as other personal data once Story 01 schema exists) |
| Retention while account active | **12 months** from `createdAt`, then purge job (implement later; document intent now) |
| Not sold | Violations are for safety/ops — not a “sale” under CCPA |

Agent 1 updates the markdown now even if the table does not exist yet — mark as “when Sprint 30 Stories 01+ are enabled.”

---

### 6. CONTENT_MODERATION_COMPLIANCE.md (locked outline)

Create `dating-api/docs/legal/CONTENT_MODERATION_COMPLIANCE.md` with:

1. **Purpose** — text moderation via OpenAI Moderation API; relation to existing GPT analysis.
2. **Jurisdictions checklist**
   - **Israel (Privacy Protection Law):** disclose processor; HTTPS; deletion path exists.
   - **GDPR:** Art. 6(1)(f) LIA summary (safety vs privacy; necessity; safeguards: fail-open logging without raw text in traces, admin review path Story 05, retention limit).
   - **CCPA:** disclose sharing/processing with OpenAI; not a sale; deletion already available.
3. **DPA ops steps**
   - Verify OpenAI Data Processing Addendum at platform account.
   - Store signed/accepted evidence **outside** the public UI repo if it contains account identifiers (path suggestion: ops vault; optional `docs/legal/openai-dpa-README.md` noting “copy held by ops” — **no** committed secrets).
4. **Counsel questions** — paste the five questions from the story (legitimate interest vs consent; Israeli extras; DPA coverage for Moderation API; 12-month retention; minors).
5. **7-day notice** — policies must be live before moderation feature flag on in that environment.
6. **Escalation** — Option B opt-in if counsel requires.

Agent 1 fills checkboxes as **pending** where ops has not verified DPA yet — do not mark DPA “done” without human confirmation.

---

### 7. In-app disclosure banner (locked: out of scope)

| Item | Story 0 |
|------|---------|
| One-time “Got it” banner | **No** |
| `contentModerationDisclosureShown` column | **No** |

Rationale: public `/privacy` + `/terms` + draft footer already exist; banner can wait until after Story 05 when appeal path is real. Avoid schema churn before moderation client exists.

---

### 8. Contact / support copy (locked)

Reuse current privacy contact pattern:

> For privacy questions during the pilot cohort, contact the product operator listed in your launch invite.

Do not hardcode a new email unless one already exists in product config/docs. Manual-review request language may say “contact the product operator” / Account Settings path later.

---

### 9. Rollout / Agent 3 acceptance gate (locked)

| Gate | Required |
|------|----------|
| Privacy + terms copy merged | Yes |
| Compliance MD created | Yes |
| DATA_RETENTION updated | Yes |
| DPA verified by human ops | **Required before prod moderation**, may remain open at Story 0 Agent 3 if documented as pending |
| External counsel sign-off | Optional; keep DRAFT footer until then |
| Stories 01–05 prod enable | Only after **≥7 days** of published disclosure in that env |

Agent 3 may **accept Story 0** with DPA still “pending ops” if the compliance doc clearly flags it as a **prod go-live blocker** for moderation, not a Story 0 code blocker.

---

## Tests / verification (Agents 1–2)

| Layer | Scope |
|-------|--------|
| UI | Existing privacy page spec still sees draft footer; optionally assert new headings/phrases exist in loaded markdown (if easy) |
| Docs | Compliance MD present; DATA_RETENTION mentions violations |
| Manual | Open `/privacy` and `/terms` in browser — content safety + OpenAI visible; acceptable use expanded |
| Regression | No Nest/Prisma changes expected |

---

## Open questions / blockers

- **None blocking Agent 1** for markdown/docs.
- **Human ops:** OpenAI DPA verification before moderation prod.
- **Counsel (optional):** confirm legitimate interest vs Option B for EU users; minors policy if under-18 ever allowed.

---

## Next agent

```text
--agent 1 sprint 30 story 0
```

**Notes for next agent:**

1. Edit `dating-ui/content/legal/privacy.md` and `terms.md` per §3–§4 — do **not** rewrite `page.tsx`.
2. Create `dating-api/docs/legal/CONTENT_MODERATION_COMPLIANCE.md` per §6; leave DPA checkbox pending unless ops already confirmed.
3. Extend `dating-api/docs/legal/DATA_RETENTION.md` per §5.
4. **No** Prisma migration; **no** moderation Nest code; **no** banner UI.
5. Keep draft footer behavior unchanged.
6. Commit with story’s suggested message (docs/legal focus).
7. Write `handoffs/STORY_00_consent_and_privacy/agent-1-dev.md`.
