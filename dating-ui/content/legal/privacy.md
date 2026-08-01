_Last updated: August 2026 (draft)_

This privacy policy describes how we collect, use, and delete personal data in the dating product.

## What we collect

- **Account:** Google sign-in provides email, display name, and profile photo URL.
- **Profile:** Information you enter during onboarding (demographics, text answers, photos).
- **Activity:** Match actions (like, pass, block), messages with mutual matches, and notification preferences.
- **Technical:** Session cookies for authentication; structured logs for operations (no message text in analytics).

## How we use data

- To show you match candidates and conversations.
- To run profile analysis and compatibility scoring.
- To run automated **content safety** checks on profile text and messages to help detect harmful, explicit, or abusive content.
- To send optional email and in-app notifications.
- To investigate user reports submitted by the community.

## AI and third-party processors

### OpenAI

We use **OpenAI** as a processor for:

1. **Profile analysis and matching features** — free-text you provide in your profile (for example about you, a partner, and a relationship) may be sent to OpenAI models so we can analyze your profile and power compatibility features.
2. **Content moderation** (when enabled) — the same kinds of profile free-text, and message text in conversations, may be sent to OpenAI’s Moderation API so we can automatically check for harmful or explicit content before it is saved or delivered.

**Data shared:** profile free-text fields; message text when content moderation is enabled.  
**How OpenAI handles that data:** processing for the purposes above is subject to OpenAI’s published policies; see [OpenAI’s privacy policy](https://openai.com/policies/privacy-policy).  
**Legal basis (where GDPR applies):** we rely on **legitimate interest** in operating a safer platform (GDPR Art. 6(1)(f)), including community safety and abuse prevention — not on selling your data or using it for unrelated marketing.

## Data retention on account deletion

When you delete your account:

| Removed from the product | Kept in anonymized form |
|--------------------------|-------------------------|
| Profile text, photos, analysis | Internal user id (no email/name) |
| Your match actions as actor | Reports you filed or received (ops) |
| Message text you sent | Placeholder messages for other users |
| Active conversations | Unmatched conversation metadata |
| Content violation records (when Sprint 30 moderation is enabled) | — |

Signing in again with the same Google account creates a **new** account; prior data is not linked in the app.

**While your account is active:** if content safety moderation is enabled, we may keep **content violation records** (including a copy of flagged text and category) for up to **12 months** for safety and compliance, then delete them unless they are needed for an active investigation.

For a full operator reference, see `dating-api/docs/legal/DATA_RETENTION.md` in the repository.

## Contact

For privacy questions during the pilot cohort, contact the product operator listed in your launch invite.

## Your choices

- Adjust notification preferences on your profile page.
- Delete your account from **Account Settings** (requires typing `DELETE` to confirm).
- Object to automated content safety processing, or request **manual review** of a blocked or flagged action, by contacting the product operator listed in your launch invite.
