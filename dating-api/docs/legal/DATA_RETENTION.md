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
| Sessions | All sessions revoked |
| Message bodies from deleted user | Replaced with `[deleted user]`; status `DELETED` |
| Active mutual matches | Set to `UNMATCHED` |

## Retained (anonymized or for ops)

| Data | Reason |
|------|--------|
| `User.id` | FK integrity; row scrubbed (`email`, `googleId`, names removed) |
| `UserReport` rows | Moderation / ops triage |
| `MutualMatch` metadata | Analytics; status `UNMATCHED` |
| Messages as placeholders | Other participant conversation history |
| `MatchAction` where user is target | Other users' action history |

## Re-signup

After deletion, `email` and `googleId` are scrubbed to free unique constraints. The same Google account may sign in again and receive a **new** `User` row. The product does not link the new account to the prior id in the UI.

## Ops access

Query `UserReport` and anonymized `User` rows directly in the database. No admin triage UI in v1.
