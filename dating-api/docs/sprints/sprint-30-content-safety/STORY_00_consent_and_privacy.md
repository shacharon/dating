# Story 00 — User consent + privacy policy for third-party moderation

**Sprint 30 · Status: 🟡 IN PROGRESS — Agent 1 complete → run Agent 2**  
**Priority:** P0 (LEGAL BLOCKER — must complete before Stories 01-05 go live)  
**Estimated effort:** 1 day (legal review + implementation)  
**Dependencies:** None (do FIRST)  
**Handoffs:** [architect](./handoffs/STORY_00_consent_and_privacy/agent-0-architect.md) · [dev](./handoffs/STORY_00_consent_and_privacy/agent-1-dev.md)

---

## Objective

Update privacy policy, terms of service, and onboarding flow to disclose third-party content moderation (OpenAI). Ensure compliance with GDPR (EU), CCPA (US), and Israeli Privacy Protection Law.

---

## Legal context

**What's changing:**
- User text (profile fields + messages) will be sent to OpenAI for automated content safety checks
- This is a **new data processor** (though OpenAI is already processing profile text for analysis — this story extends that disclosure)

**Jurisdictions to cover:**
1. **GDPR (European Union)** — requires explicit consent for third-party data processing + data processing agreement (DPA)
2. **CCPA (California / US)** — requires disclosure of third-party sharing in privacy policy
3. **Israeli Privacy Protection Law** — requires disclosure + reasonable security measures

**Key legal requirement:** Users must be informed BEFORE their data is sent to OpenAI.

---

## Scope / tasks

### 1. Privacy policy updates

**File:** `dating-ui/src/app/privacy/page.tsx` (or separate markdown if exists)

**Sections to add/update:**

#### "How we use your information"
Add:
```
Content Safety: We use third-party AI tools (OpenAI) to automatically detect 
harmful, explicit, or abusive content in your profile text and messages. This 
helps keep our community safe. Your text is sent to OpenAI for real-time 
analysis and is not retained by them after processing.
```

#### "Third-party services"
Add OpenAI to list of processors:
```
OpenAI (content moderation):
  - Purpose: Automated safety checks for user-generated text
  - Data shared: Profile text (aboutMe, aboutPartner, aboutRelationship) and messages
  - Retention: Not retained after processing (per OpenAI Moderation API policy)
  - Legal basis: Legitimate interest in platform safety (GDPR Art. 6(1)(f))
  - Privacy policy: https://openai.com/policies/privacy-policy
```

#### "Your rights (GDPR)"
Add:
```
You have the right to object to automated content moderation. If you believe 
your content was incorrectly flagged, contact us at [support email] to request 
manual review.
```

#### "Data retention"
Add:
```
Content violation records are retained for 12 months for safety and compliance 
purposes, then automatically deleted unless required for ongoing investigations.
```

### 2. Terms of service updates

**File:** `dating-ui/src/app/terms/page.tsx`

**Section to add:** "Acceptable use policy"
```
You agree not to post content that is:
- Sexually explicit or pornographic
- Hateful, discriminatory, or harassing
- Violent or threatening
- Spam or commercial solicitation

We use automated tools to detect violations. Repeated violations may result in 
restrictions on your account, including temporary or permanent suspension of 
messaging or profile editing.
```

### 3. OpenAI Data Processing Agreement (DPA)

**Action:** Verify DPA is in place for OpenAI API usage

- If you already use OpenAI GPT-4 for profile analysis → DPA likely already signed via API platform
- Check: https://platform.openai.com/account/data-processing-addendum
- If not signed → execute DPA before going live (required for GDPR compliance)
- Save copy to `docs/legal/openai-dpa.pdf`

### 4. User consent flow (optional, depends on jurisdiction)

**GDPR strict interpretation:** Requires opt-in consent for automated decision-making

**Options:**

**Option A: No explicit consent needed (recommended)**
- Legal basis: "Legitimate interest" (Art. 6(1)(f)) — platform safety
- Rationale: Content moderation is essential for community safety, not primarily for profiling/marketing
- Precedent: Most platforms (Facebook, Twitter, Discord) use moderation without per-user consent
- Document: Add to privacy policy only

**Option B: Opt-in on signup (conservative, safest for EU users)**
- Add checkbox to onboarding: "I understand my content will be checked for safety using automated tools"
- Store consent in DB: `User.contentModerationConsentGiven: boolean`
- Skip moderation for users who don't consent (fall back to manual reports only)

**Recommendation:** Start with Option A (disclosure only). If EU regulators raise concerns post-launch, add Option B.

### 5. Compliance verification checklist

**Israeli Privacy Protection Law:**
- [x] Disclose data processor (OpenAI) in privacy policy
- [x] Ensure reasonable security (OpenAI API uses HTTPS/TLS)
- [x] Allow users to request deletion (already covered in account deletion flow)

**GDPR (EU):**
- [x] Legal basis documented (legitimate interest: safety)
- [x] Third-party processor disclosed with retention policy
- [x] DPA with OpenAI in place
- [x] User rights to object/appeal documented
- [x] Data minimization (only flagged text stored, not all text)

**CCPA (California):**
- [x] Disclose third-party sharing in privacy policy
- [x] Allow opt-out of sale (N/A — not selling data, only processing for safety)
- [x] Provide deletion mechanism (already exists)

### 6. In-app disclosure (optional but recommended)

**Where:** During profile creation or first message send

**UI suggestion:**
```
┌─────────────────────────────────────────────────────┐
│ 💬 Keeping our community safe                      │
├─────────────────────────────────────────────────────┤
│ We automatically check content for safety using    │
│ AI tools. This helps prevent harassment and spam.  │
│                                                     │
│ Your privacy matters: Content checks happen in     │
│ real-time and aren't stored by our partners.       │
│                                                     │
│ [Learn more]  [Got it]                             │
└─────────────────────────────────────────────────────┘
```

Show once per user, store `User.contentModerationDisclosureShown: boolean`.

---

## Acceptance criteria

- [ ] Privacy policy updated with OpenAI disclosure + retention policy
- [ ] Terms of service include acceptable use policy
- [ ] OpenAI DPA verified/signed and saved to `docs/legal/`
- [ ] Compliance checklist completed for GDPR, CCPA, Israeli law
- [ ] (Optional) In-app disclosure banner implemented
- [ ] Legal review completed by external counsel (if available)

---

## Technical implementation

### Database migration (if adding consent/disclosure tracking)

```prisma
model User {
  // ... existing fields
  
  // Optional: track consent (if using Option B)
  contentModerationConsentGiven    Boolean   @default(false)
  contentModerationConsentDate     DateTime?
  
  // Optional: track in-app disclosure shown
  contentModerationDisclosureShown Boolean   @default(false)
  contentModerationDisclosureDate  DateTime?
}
```

### Privacy policy changes (example structure)

```typescript
// dating-ui/src/app/privacy/page.tsx

export default function PrivacyPage() {
  return (
    <div className="prose max-w-4xl mx-auto p-8">
      <h1>Privacy Policy</h1>
      <p>Last updated: August 1, 2026</p>

      {/* ... existing sections ... */}

      <h2>How we use your information</h2>
      <h3>Content Safety</h3>
      <p>
        We use third-party AI tools (OpenAI) to automatically detect harmful,
        explicit, or abusive content in your profile text and messages. This
        helps keep our community safe. Your text is sent to OpenAI for
        real-time analysis and is not retained by them after processing.
      </p>

      <h2>Third-party services</h2>
      <h3>OpenAI (Content Moderation)</h3>
      <ul>
        <li><strong>Purpose:</strong> Automated safety checks for user-generated text</li>
        <li><strong>Data shared:</strong> Profile text and messages</li>
        <li><strong>Retention:</strong> Not retained after processing</li>
        <li><strong>Legal basis:</strong> Legitimate interest in platform safety (GDPR Art. 6(1)(f))</li>
        <li><strong>Privacy policy:</strong> <a href="https://openai.com/policies/privacy-policy">openai.com/policies/privacy-policy</a></li>
      </ul>

      {/* ... rest of policy ... */}
    </div>
  );
}
```

---

## Legal review questions for counsel

1. **Legitimate interest vs. consent:** Can we rely on "legitimate interest" for content moderation under GDPR, or do we need explicit opt-in consent?
2. **Israeli law specificity:** Does Israeli Privacy Protection Law require any additional disclosures beyond what GDPR requires?
3. **Data processing agreement:** Is our existing OpenAI DPA (if any) sufficient for moderation API usage, or do we need a separate addendum?
4. **Retention period:** Is 12 months retention for violation records reasonable, or should it be shorter/longer?
5. **Minor users:** If we allow users under 18, do we need parental consent for moderation (COPPA / GDPR-K)?

---

## Rollout plan

1. **Stage 1: Update privacy policy + terms** (deploy to staging first)
2. **Stage 2: Legal review** (send to external counsel if available)
3. **Stage 3: OpenAI DPA verification** (confirm signed, save copy)
4. **Stage 4: Deploy updated policies to prod** (at least 7 days before enabling moderation)
5. **Stage 5: (Optional) Add in-app disclosure banner**
6. **Stage 6: Enable moderation** (Stories 01-05)

**Timeline:** Policies must be live at least **7 days** before moderation goes live (gives users notice period, common GDPR best practice).

---

## References

- [GDPR Art. 6 (Legal basis for processing)](https://gdpr-info.eu/art-6-gdpr/)
- [GDPR Art. 28 (Data processors)](https://gdpr-info.eu/art-28-gdpr/)
- [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
- [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum)
- [CCPA disclosure requirements](https://oag.ca.gov/privacy/ccpa)
- [Israeli Privacy Protection Law](https://www.gov.il/en/departments/policies/privacy_protection) (Hebrew: חוק הגנת הפרטיות)

---

## Deliverables

- [ ] `dating-ui/src/app/privacy/page.tsx` (updated)
- [ ] `dating-ui/src/app/terms/page.tsx` (updated)
- [ ] `docs/legal/openai-dpa.pdf` (saved copy of signed DPA)
- [ ] `docs/legal/CONTENT_MODERATION_COMPLIANCE.md` (checklist + legal basis documentation)
- [ ] (Optional) `prisma/migrations/YYYYMMDDHHMMSS_add_content_moderation_consent/migration.sql`
- [ ] (Optional) In-app disclosure banner component

---

## Notes / gotchas

- **Timing is critical:** Policies must be updated BEFORE moderation is enabled, not after
- **Don't over-lawyer:** Most dating apps use similar moderation without explicit consent — disclosure in privacy policy is typically sufficient
- **User backlash risk:** Some users may object to "AI reading my messages" — prepare support response: "We only check for safety violations, like any platform. Your data isn't used for training or marketing."
- **False positive appeals:** Privacy policy promises manual review option — ensure admin violations dashboard (Story 05) is ready to handle appeals

---

## Commit message

```
docs(legal): update privacy policy for content moderation

Disclose OpenAI content safety checks in privacy policy and terms.
Document GDPR/CCPA/Israeli law compliance for third-party processing.

Sprint 30 Story 0 (prerequisite for moderation rollout)
```
