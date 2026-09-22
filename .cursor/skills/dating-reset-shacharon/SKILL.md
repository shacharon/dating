---
name: dating-reset-shacharon
description: >-
  Deletes the local Dating user shacharon@gmail.com from Docker Postgres so the
  next Google sign-in is a first login. Use when the user says delete shacharon,
  remove shacharon, reset the local account, or reset first login. Never RDS,
  AWS, or findyouraidate.com.
---

# Reset local shacharon@gmail.com

Delete one local user so the next Google login has no profile. Run it. Do not ask for a second confirmation after the user already asked to delete this account.

## Hard limits

- Container `dating-postgres`, database `dating`, user `dating_user`. Host port is 5433.
- Email is exactly `shacharon@gmail.com`.
- Never `aws`, never RDS, never a host that is not this Docker container.
- If `docker exec dating-postgres` fails, stop and say Docker is down. Do not point the SQL at another database.

## Delete

PowerShell, from any directory. Pipe a here-string. Do not pass this SQL with `psql -c` and nested quotes.

```powershell
@'
BEGIN;
DELETE FROM "UserReport" r
USING "User" u
WHERE u.email = 'shacharon@gmail.com'
  AND (r."reporterUserId" = u.id OR r."reportedUserId" = u.id);
DELETE FROM "UserSession" s
USING "User" u
WHERE s."userId" = u.id AND u.email = 'shacharon@gmail.com';
DELETE FROM "MatchNarrativeCache" c
USING "UserProfile" p
JOIN "User" u ON u.id = p."userId"
WHERE u.email = 'shacharon@gmail.com'
  AND (c."viewerProfileId" = p.id OR c."candidateProfileId" = p.id);
DELETE FROM "UserProfileEvaluation" e
USING "UserProfile" p
JOIN "User" u ON u.id = p."userId"
WHERE u.email = 'shacharon@gmail.com'
  AND e."profileId" = p.id;
DELETE FROM "UserProfile" p
USING "User" u
WHERE p."userId" = u.id AND u.email = 'shacharon@gmail.com';
DELETE FROM "User" WHERE email = 'shacharon@gmail.com';
COMMIT;
'@ | docker exec -i dating-postgres psql -U dating_user -d dating
```

Photos, signals, interests, preferences, and match ranks cascade from `UserProfile`. Sessions tokens, match actions, and conversations cascade or null out from `User`.

## Confirm

```powershell
@'
SELECT COUNT(*) FROM "User" WHERE email = 'shacharon@gmail.com';
'@ | docker exec -i dating-postgres psql -U dating_user -d dating
```

The count must be 0. Tell the user the local account is gone and the next sign-in at http://localhost:3000 is a first login. If the count is not 0, show the SQL error and stop.
