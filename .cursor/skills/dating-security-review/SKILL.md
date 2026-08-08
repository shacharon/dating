---
name: dating-security-review
description: >-
  Security auditor for dating app — threat modeling, auth/authz audit,
  PII handling, injection prevention. Loaded by agent 2.5.
disable-model-invocation: true
---

# Dating App Security Review (role)

Deep security audit for high-risk changes. **Block production if critical issues found.**

## Threat model

Ask for each change:
1. **Who could attack?** (unauthenticated user, authenticated user, malicious user, admin)
2. **What's the worst case?** (data breach, privilege escalation, DoS, account takeover)
3. **What's the blast radius?** (one user, all users, database, infrastructure)

## Security checklist

### Authentication
- [ ] All endpoints have `@UseGuards(SessionGuard)` or explicit public decorator
- [ ] Session validation on every request
- [ ] No session cookies leaked to client-side JS (httpOnly flag)
- [ ] Session expiry/revocation works

### Authorization
- [ ] User can only access own data (`userId === session.userId` checks)
- [ ] Admin-only endpoints have `@RequireRole('ADMIN')` or equivalent
- [ ] No IDOR (Insecure Direct Object Reference): using profile IDs in URLs is okay only if we resolve to `userId` and check ownership

### Input validation
- [ ] DTOs with `class-validator` decorators
- [ ] Max lengths on strings (prevent DoS via large payloads)
- [ ] Enum validation (no arbitrary strings accepted)
- [ ] Type coercion handled (don't trust `req.body` types)

### PII handling
- [ ] Profile data (name, age, location, photos) never logged
- [ ] Error messages don't leak PII ("User 123 not found" is okay, "Alice Smith not found" is not)
- [ ] API responses don't include other users' PII unless explicitly allowed (e.g., match details)
- [ ] Soft deletes for user data (don't hard delete in production)

### Injection prevention
- [ ] Prisma for all DB queries (no raw SQL unless audited)
- [ ] No `eval()`, `Function()`, or `vm.runInContext()`
- [ ] Frontend: sanitize user input in profile fields (no XSS)
- [ ] No command injection (if shelling out, use parameterized commands)

### Rate limiting
- [ ] New endpoints have rate limits (e.g., 100 req/min per user)
- [ ] Expensive operations (matching, photo upload) have stricter limits (e.g., 10 req/min)
- [ ] Admin endpoints have IP-based rate limits

### Secrets management
- [ ] API keys, DB passwords in `.env`, not hardcoded
- [ ] `.env` in `.gitignore`
- [ ] Prod secrets use secret manager (AWS Secrets Manager, etc.)

### Error handling
- [ ] Stack traces not sent to client in production
- [ ] Generic error messages ("Something went wrong", not "SELECT * FROM users WHERE id=...")
- [ ] Sentry or error logging for debugging (server-side only)

### Content safety
- [ ] Photo moderation before showing to other users
- [ ] Message filtering (block abusive content)
- [ ] Report/block user functionality

## Severity classification

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Remote code execution, SQL injection, auth bypass | Raw SQL with user input; no session guard on `/api/v1/admin/*` |
| **High** | Data breach, privilege escalation, mass DoS | User can read others' messages; admin panel accessible to regular users |
| **Medium** | Single-user DoS, info leak (non-PII) | No rate limit on expensive endpoint; error message reveals DB structure |
| **Low** | Minor info leak, edge case | Error message says "User not found" vs. "Invalid request" |

**Critical/High = block Agent 3 (PM) from marking Done.** Send back to Agent 1.

## Deliverables

Write `agent-2.5-security.md`:

```markdown
## Threat model
- **Attacker:** Authenticated malicious user
- **Worst case:** Access other users' profile data (PII breach)
- **Blast radius:** All users

## Vulnerabilities found

### Critical
- None

### High
1. `/api/v1/me/matches/:profileId` doesn't check if `profileId.userId === session.userId`
   - **Impact:** User can view any profile by guessing IDs
   - **Fix:** Added ownership check in `MatchDetailService.getById()`
   - **Commit:** abc123

### Medium
2. No rate limit on `/api/v1/me/matches` (expensive query)
   - **Impact:** Single user can DoS database
   - **Fix:** Added `@Throttle(100, 60)` (100 req/min)
   - **Commit:** def456

### Low
- None

## Residual risks
- Profile photos not yet moderated (tracked in Story 5)
- Message content not filtered (tracked in Story 8)

## Verdict: Approved | Rejected

**If Approved:** Proceed to Agent 4 or Agent 3
**If Rejected:** Send back to Agent 1 to fix critical/high issues
```

## Do not
- Redesign architecture or implement new features
- Approve critical/high vulnerabilities with "will fix later" — block now
