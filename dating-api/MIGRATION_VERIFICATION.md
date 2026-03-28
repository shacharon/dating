# Hybrid Migration Verification

## Test Scenarios

### 1. JSON Mode (Legacy Behavior)
Set `STORAGE_MODE=json` in .env

**Test:**
```bash
# Create/evaluate a profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test JSON Mode",
    "aboutMe": "I am ambitious and social",
    "aboutPartner": "Looking for someone kind and stable",
    "aboutRelationship": "Want deep connection and family"
  }'
```

**Expected:**
- Profile saved to `data/profiles/<id>.json`
- Full evaluation in JSON file
- NO database write

**Verify:**
```bash
# Check JSON file exists
ls data/profiles/<id>.json

# Check DB (should be old data or empty)
npx prisma studio
```

---

### 2. Postgres Mode (DB-Only)
Set `STORAGE_MODE=postgres` in .env, restart server

**Test:**
```bash
# Create/evaluate a profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Postgres Mode",
    "aboutMe": "I am independent and direct",
    "aboutPartner": "Looking for someone ambitious",
    "aboutRelationship": "Want clarity and growth"
  }'
```

**Expected:**
- Profile saved to PostgreSQL `UserProfile` table
- Evaluation JSON stored in `evaluation` column
- Signals stored in `signals` column
- Metadata fields populated (evaluatedAt, promptVersion, policyVersion, textHash)
- NO JSON file created

**Verify:**
```sql
SELECT 
  id, 
  name, 
  evaluation IS NOT NULL as has_evaluation,
  signals IS NOT NULL as has_signals,
  evaluated_at,
  prompt_version,
  policy_version
FROM "UserProfile"
WHERE name = 'Test Postgres Mode';
```

---

### 3. Dual Mode (Write Both, Read Postgres First)
Set `STORAGE_MODE=dual` in .env, restart server

**Test:**
```bash
# Create/evaluate a profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dual-test-001",
    "name": "Test Dual Mode",
    "aboutMe": "I am traditional and caring",
    "aboutPartner": "Looking for emotional depth",
    "aboutRelationship": "Want stability and home life"
  }'
```

**Expected:**
- Profile saved to BOTH PostgreSQL AND JSON file
- Both contain full evaluation data
- Read operations prefer Postgres
- Fallback to JSON if DB miss

**Verify:**
```bash
# Check both exist
ls data/profiles/dual-test-001.json

# Check DB
SELECT id, name, evaluation IS NOT NULL FROM "UserProfile" WHERE id = 'dual-test-001';

# Verify read preference: stop DB, restart server
# Request should still work (fallback to JSON)
```

---

### 4. Migration Safety
**Verify existing data is not lost:**
```bash
# Count profiles before
ls data/profiles/*.json | wc -l  # Should be 521

# After switching to postgres mode, old JSON profiles should remain readable
# Switch to dual mode and verify existing profiles are still accessible
```

---

## Quick Verification Commands

```bash
# 1. Start server with json mode (default)
STORAGE_MODE=json npm run start:dev

# 2. Create test profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate -H "Content-Type: application/json" -d '{"name":"JSON Test","aboutMe":"test","aboutPartner":"test","aboutRelationship":"test"}'

# 3. Check JSON file created
ls data/profiles/*.json | tail -1

# 4. Switch to postgres mode, restart
STORAGE_MODE=postgres npm run start:dev

# 5. Create another test profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate -H "Content-Type: application/json" -d '{"name":"Postgres Test","aboutMe":"test","aboutPartner":"test","aboutRelationship":"test"}'

# 6. Check DB
npx prisma studio

# 7. Switch to dual mode, restart
STORAGE_MODE=dual npm run start:dev

# 8. Create final test profile
curl -X POST http://localhost:3000/api/v1/profiles/evaluate -H "Content-Type: application/json" -d '{"name":"Dual Test","aboutMe":"test","aboutPartner":"test","aboutRelationship":"test"}'

# 9. Verify both JSON and DB have the profile
ls data/profiles/*.json | tail -1
# Check npx prisma studio
```
