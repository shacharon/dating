# Data retention on account deletion

Factual summary for operators and legal review. User-facing summary lives in the privacy policy (`/privacy`).

## Deleted when a user deletes their account

| Data | Action |
|------|--------|
| Profile text and demographics | Cleared on `UserProfile` row |
| Profile photos | DB rows removed; storage blobs deleted (best effort) |
| Analysis output | `UserProfileEvaluation`, signals, interests deleted |
| Match preferences | `UserProfilePreference` row deleted |
| Match actions by deleted user | `MatchAction` rows where user is actor deleted |
| Match feedback by deleted user | `MatchFeedback` rows where user is actor deleted |
| Sessions | All sessions revoked |
| Message bodies from deleted user | Replaced with `[deleted user]`; status `DELETED` |
| Active mutual matches | Set to `UNMATCHED` |
| Content violation records | **Hard-delete** all `UserContentViolation` rows for that `userId` (when Sprint 30 Stories 01+ schema is enabled; same account-delete transaction as other personal data) |

## Retained (anonymized or for ops)

| Data | Reason |
|------|--------|
| `User.id` | FK integrity; row scrubbed (`email`, `googleId`, names removed) |
| `User.referredByUserId` | Referral attribution on anonymized user row (no export in v1) |
| `UserReport` rows | Moderation / ops triage |
| `MutualMatch` metadata | Analytics; status `UNMATCHED` |
| Messages as placeholders | Other participant conversation history |
| `MatchAction` where user is target | Other users' action history |

## Content violations (when Sprint 30 moderation is enabled)

When Stories 01+ are enabled, `UserContentViolation` rows may store flagged text + category for ops review.

| Topic | Policy |
|-------|--------|
| While account is active | Retain up to **12 months** from `createdAt`, then purge (purge job may land after Story 01; document intent now) |
| On account delete | Hard-delete all rows for that user (see table above) |
| CCPA / “sale” | Violations are for **safety/ops only** — not sold; not a “sale” of personal information |

## Re-signup

After deletion, `email` and `googleId` are scrubbed to free unique constraints. The same Google account may sign in again and receive a **new** `User` row. The product does not link the new account to the prior id in the UI.

## Ops access

- **User reports:** Triage OPEN reports at **`/admin/reports`** (requires `ADMIN_USER_IDS` + session). Ops email (`REPORT_OPS_EMAIL`) remains a backup alert.
- **Content violations (Sprint 30 Story 05):** Triage at **`/admin/content-violations`** when that surface ships.
- **Other retained data:** Query anonymized `User` rows directly in the database when needed.
