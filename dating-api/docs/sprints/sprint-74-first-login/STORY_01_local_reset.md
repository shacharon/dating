# Story 1: Reset local shacharon@gmail.com

**Status:** Done (2026-09-22)  
**Depends on:** none

## Why

First-login bugs only show up when the account has no profile. The local user already had one, so localhost never matched dev.

## What

**As a** developer checking first login  
**I want** the local `shacharon@gmail.com` account removed  
**So that** the next Google sign-in on localhost starts with no profile

### Acceptance criteria

- [x] Deleted only from local Docker Postgres (`dating-postgres`, database `dating`, host port 5433)
- [x] User, profile, sessions, and blocking child rows are gone
- [x] findyouraidate.com was not changed
- [x] Repeat steps are in this story

### Out of scope

- Deleting the same account on AWS
- Fixing the first-login bugs (Stories 3 and 4)

## Definition of done

- [x] `SELECT COUNT(*) FROM "User" WHERE email = 'shacharon@gmail.com'` is 0 on local Postgres
- [x] Next local Google sign-in lands on Basics with no saved profile

## Repeat (local only)

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
