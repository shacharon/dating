# Technical Debt Scan - Post Sprint 67-68 (Backend P0) & FE-05/FE-06 (Frontend Android)

**Scan Date:** 2026-08-23  
**Scope:** dating-api (841 TypeScript files, 80 services) & dating-ui (419 files)  
**Excluded:** i18n files, type definitions, migrations, frozen config (regex patterns)

---

## Executive Summary

Despite recent sprint work, significant technical debt remains in the "usual suspects":
- **Test files** still giant (5 files >1000 LOC)
- **God directories** persist (matches: 111 files, me-profile: 103 files)
- **Large services** common (20 services >200 LOC)
- **Complex god files** remain (10 non-test files >500 LOC)
- **Mega-methods** in mappers (55 methods in profile-to-canonical.mapper)
- **Documentation gaps** in most modules (only 1 README in src/)

**Total Issues Identified:** 23 prioritized items

---

## 1. GIANT TEST FILES (P0 - Critical)

### Issue: Test Specs >1000 LOC

Test files have become unmaintainable monoliths, making debugging and maintenance expensive.

| File | LOC | Issue |
|------|-----|-------|
| `src/engine/compute-friction.spec.ts` | 1408 | Integration/unit hybrid, too many test cases |
| `src/me-profile/me-profile-http-crud.integration.spec.ts` | 1390 | HTTP integration suite, needs splitting |
| `src/me-profile/me-profile.service.spec.ts` | 1347 | Service unit tests, god spec |
| `src/me-profile/me-profile-http-conversations.integration.spec.ts` | 1283 | Conversations HTTP suite |
| `src/me-profile/me-matches-eligibility.spec-support.ts` | 1212 | Test harness grown into god helper |
| `src/evaluate/evaluate.service.spec.ts` | 1005 | Evaluation service tests |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | 1059 | UI component mega-test |

**Why it matters:**
- 30+ minute debugging sessions per test failure
- Parallel test execution blocked by giant files
- New developers overwhelmed
- Flaky tests hard to isolate

**Effort to fix:** 8-10 days per file (split into logical suites)

**Priority:** **P0** - These block productivity daily

---

## 2. GOD DIRECTORIES (P0 - Critical)

### Issue: Directories with >100 files at root level

Poor organization creates navigation nightmares and merge conflicts.

| Directory | File Count | Issue |
|-----------|-----------|--------|
| `dating-api/src/matches` | 111 files | Match engine, explainability, telemetry, admin all mixed |
| `dating-api/src/me-profile` | 103 files | Profile CRUD, matches, conversations, analysis, photos all flat |
| `dating-api/src/extraction` | 55 files | LLM extraction + shadow tests + telemetry |
| `dating-ui/src/lib` | 104 files | API clients, utils, i18n, analysis all flat |
| `dating-ui/src/components` | 58 files | Reusable components but no sub-organization |

**Why it matters:**
- 10-15 seconds to find files in IDE
- Merge conflicts on directory index imports
- Unclear module boundaries
- Cognitive overload

**Effort to fix:** 3-5 days per directory (create subdirectories, move files)

**Priority:** **P0** - Matches and me-profile are "regular suspects" mentioned by user

---

## 3. GOD SERVICES (P1 - High Priority)

### Issue: Services >200 LOC

Services violate SRP with multiple responsibilities.

| Service | LOC | Issue |
|---------|-----|-------|
| `match-ranking.service.ts` | 544 | Ranking + eligibility + HG gate + telemetry |
| `matches.service.ts` | 503 | Compare + list + HG diagnostics + admin |
| `me-conversations.service.ts` | 405 | List + detail + mark read + analytics |
| `match-detail.service.ts` | 357 | Detail + HG + analytics + photo resolution |
| `extraction.service.ts` | 348 | LLM calls + caching + retry + telemetry |
| `admin-match-quality.service.ts` | 348 | Admin + candidate scoring + telemetry |
| `me-profile-analysis.service.ts` | 343 | Analysis + validation + caching |
| `photo-moderation.service.ts` | 341 | Moderation + S3 + webhooks |
| `messaging-socket-registry.service.ts` | 328 | WebSocket + Redis + analytics |
| `me-conversation-messages.service.ts` | 305 | Messages + rate limit + analytics |
| `auth.service.ts` | 287 | Auth + tokens + refresh + sessions |
| `redis-cache.service.ts` | 281 | Cache + invalidation + telemetry |
| `profile-crud.service.ts` | 273 | CRUD + validation + photos |
| `simple-logger.service.ts` | 248 | Logging + Sentry + metrics |
| `profiles-prisma.service.ts` | 243 | Prisma + HG rows + bundle loading |
| `holy-grail-pair-snapshot-telemetry.service.ts` | 237 | Telemetry + persistence |
| `profile-photo.service.ts` | 233 | Photo CRUD + moderation + S3 |
| `admin-photos.service.ts` | 232 | Admin + moderation actions |
| `content-violation.service.ts` | 215 | Violations + blocking + appeals |
| `me-matches.service.ts` | 206 | Match actions + analytics |

**Why it matters:**
- Hard to test (too many dependencies)
- Hard to mock in tests
- Violates SRP
- Hard to understand business logic

**Effort to fix:** 2-3 days per service (extract sub-services)

**Priority:** **P1** - Blocking refactoring and testing

---

## 4. GOD FILES (Non-Test) (P1 - High Priority)

### Issue: Production files >500 LOC (excluding data/config)

| File | LOC | Type | Issue |
|------|-----|------|-------|
| `me-matches-eligibility.spec-support.ts` | 1212 | Test support | Test harness as production code |
| `dealbreaker-signals-text.extract.ts` | 761 | Data | Frozen keyword engine (Sprint 52), intentional |
| `tension-rules.ts` | 721 | Rules | 72 tension rules array, could be modular |
| `profile-to-canonical.mapper.ts` | 704 | Mapper | 55 methods, mapper+validator+telemetry |
| `openai.client.ts` | 600 | Client | OpenAI wrapper + retry + telemetry |
| `match-explainability.ts` | 549 | Logic | Explainability engine |
| `match-ranking.service.ts` | 544 | Service | See god services |
| `me-profile-http.shared-harness.ts` | 520 | Test support | Test harness grown too large |
| `match-teaser.ts` | 512 | Logic | Match teaser generation |
| `matches.service.ts` | 503 | Service | See god services |

**Why it matters:**
- Single file changes trigger 1000+ line diffs
- Hard to code review
- Merge conflict magnets
- Unclear separation of concerns

**Effort to fix:** 2-4 days per file

**Priority:** **P1** - `profile-to-canonical.mapper.ts` with 55 methods is the worst offender

---

## 5. GOD CLASSES (P1 - High Priority)

### Issue: Classes/files with >10 methods

| File | Method Count | Issue |
|------|--------------|-------|
| `profile-to-canonical.mapper.ts` | 55 | Canonical mapper + 40+ validation helpers |
| `me-matches-eligibility.spec-support.ts` | 53 | Test harness god object |
| `messaging-socket-registry.service.ts` | 48 | WebSocket registry + connection management |
| `match-explainability.ts` | 45 | Explainability logic |
| `extracted-signals.spec.ts` | 39 | Test helpers |
| `evaluate.service.spec.ts` | 36 | Test suite |
| `profile-write.helpers.ts` | 26 | Mixed profile helpers |
| `openai.client.ts` | 21 | OpenAI client + utilities |
| `me-new-model-e2e.integration.spec.ts` | 20 | E2E test suite |
| `match-ranking.service.ts` | 20 | Ranking service |
| `simple-logger.service.ts` | 17 | Logger + formatters |
| `backfill-holy-grail-structured.ts` | 17 | Migration script |
| `dealbreaker-eligibility.ts` | 16 | Dealbreaker logic |
| `auth.service.ts` | 16 | Auth service |
| `matches.service.ts` | 15 | Matches service |

**Why it matters:**
- Violates SRP severely
- Too many responsibilities per class
- Hard to test individual behaviors
- God objects anti-pattern

**Effort to fix:** 3-5 days for profile-to-canonical.mapper.ts

**Priority:** **P1** - `profile-to-canonical.mapper.ts` needs urgent refactoring

---

## 6. CONSOLE.LOG IN PRODUCTION (P2 - Medium)

### Issue: Console.log statements found

**Backend (dating-api):**
- `src/compatibility/compatibility-score.ts`: 1 occurrence
- `src/scripts/seed-profiles.ts`: 4 occurrences
- `src/logger/simple-logger.service.ts`: 2 occurrences (intentional fallback)
- `src/holy-grail-matching/backfill-holy-grail-structured.ts`: 17 occurrences (migration script)
- `src/scripts/*.ts`: 31+ occurrences (scripts only)
- `src/observability/apm.ts`: 1 occurrence
- `src/observability/custom-metrics.ts`: 1 occurrence

**Frontend (dating-ui):**
- `src/lib/observability/product-logger.ts`: 1 occurrence (intentional logger)
- `src/components/profile/profile-overview-display.ts`: 2 occurrences (TODO markers)

**Why it matters:**
- Production logs not captured by observability
- Debugging noise in production
- No structured logging

**Effort to fix:** 1-2 days (replace with proper logger)

**Priority:** **P2** - Scripts are acceptable, but production code should use logger

---

## 7. DOCUMENTATION GAPS (P1 - High Priority)

### Issue: Missing README files for modules

**Backend modules without README:**
- `src/matches/` (111 files) - NO README
- `src/me-profile/` (103 files) - NO README
- `src/extraction/` (55 files) - NO README
- `src/holy-grail-matching/` (48 files) - NO README
- `src/evaluate/` (46 files) - NO README
- `src/messaging-realtime/` (37 files) - NO README
- `src/notifications/` (30 files) - NO README
- `src/auth/` (29 files) - NO README

**Only 1 README found:** `src/llm/README.md`

**Frontend:**
- `src/lib/` (104 files) - NO README
- `src/components/` (58 files) - NO README
- `src/app/dating/me-matches/` - NO README
- `src/hooks/` - NO README

**Why it matters:**
- New developers lost
- No architecture documentation
- No troubleshooting guides
- Business logic undocumented

**Effort to fix:** 2-3 hours per README (8-12 needed)

**Priority:** **P1** - Matches and me-profile READMEs critical for onboarding

---

## 8. POOR DIRECTORY ORGANIZATION (P1 - High Priority)

### Specific Issues:

#### `dating-api/src/matches/` (111 files)
**Problem:** Match engine + explainability + telemetry + admin + HG + diagnostics all flat

**Recommended structure:**
```
src/matches/
├── README.md
├── core/           # Match engine logic
├── explainability/ # Explainability + recommendations
├── telemetry/      # HG pair snapshots + metrics
├── admin/          # Admin pair evaluator
├── diagnostics/    # HG diagnostics + compare
└── expansion/      # Shadow expansion tests (separate?)
```

#### `dating-api/src/me-profile/` (103 files)
**Problem:** Profile CRUD + matches + conversations + analysis + photos all mixed

**Recommended structure:**
```
src/me-profile/
├── README.md
├── profile/        # Profile CRUD + photos
├── matches/        # Match list + ranking + eligibility (already exists!)
├── conversations/  # Conversation list + messages (partial)
├── analysis/       # Profile analysis
├── repositories/   # Data access (already exists!)
└── validators/     # Validation pipes (already exists!)
```

**Note:** Some subdirectories exist but not consistently used!

#### `dating-ui/src/lib/` (104 files)
**Problem:** API clients + utils + i18n + analysis all flat

**Recommended structure:**
```
src/lib/
├── README.md
├── api-sdk/        # API clients (already partially exists!)
├── auth/           # Auth utilities (already exists!)
├── i18n/           # Translations (already exists!)
├── observability/  # Logging + metrics (already exists!)
├── analysis/       # Analysis presentation
├── matches/        # Match display utilities (already exists!)
└── utils/          # Shared utilities
```

**Why it matters:**
- Files at root level still too many
- Partial organization creates confusion
- No consistent pattern

**Effort to fix:** 5-7 days (complete organization)

**Priority:** **P1**

---

## 9. DUPLICATE TEST HARNESS CODE (P2 - Medium)

### Issue: Test support files grown too large

| File | LOC | Issue |
|------|-----|-------|
| `me-matches-eligibility.spec-support.ts` | 1212 | Test harness as production-size code |
| `me-profile-http.shared-harness.ts` | 520 | HTTP test harness |
| `match-engine.spec-support.ts` | 270 | Engine test helpers |
| `me-matches.spec-support.ts` | 234 | Match test helpers |

**Why it matters:**
- Test code harder to maintain than production code
- Duplicate test setup logic
- God helper objects

**Effort to fix:** 3-4 days (refactor into reusable test utilities)

**Priority:** **P2** - Important but not blocking

---

## 10. MISSING API DOCUMENTATION (P2 - Medium)

### Issue: No API documentation generated

**Observations:**
- No OpenAPI/Swagger setup detected
- No API.md in docs/
- Controllers have no JSDoc decorators
- No Postman collections
- No integration guide for frontend

**Why it matters:**
- Frontend developers must read controller code
- No API contract versioning
- No automated API testing from docs
- External integration impossible

**Effort to fix:** 3-5 days (add Swagger + generate docs)

**Priority:** **P2** - Nice to have, not blocking development

---

## 11. MAGIC NUMBERS IN CODE (P2 - Medium)

### Examples Found:

**Backend:**
- `DEFAULT_TIMEOUT_MS = 30_000` (openai.client.ts)
- `DEFAULT_MAX_TOKENS = 4096` (openai.client.ts)
- `DEFAULT_CONVERSATION_LIST_LIMIT` (various)
- Hardcoded age calculations without named constants
- Match score thresholds (0.6, 0.7, 0.8) scattered
- Penalty values in tension-rules.ts (intentionally data-driven)

**Frontend:**
- Hardcoded viewport breakpoints
- Magic timeouts (3000ms, 5000ms)
- Pagination limits

**Why it matters:**
- Hard to understand business rules
- Can't change thresholds easily
- No single source of truth

**Effort to fix:** 2-3 days (extract to constants)

**Priority:** **P2** - Code smell but not critical

---

## 12. INCOMPLETE SOLID VIOLATIONS (P2 - Medium)

### Dependency Inversion Principle (DIP)

**Good:** Most services use interface injection
```typescript
@Inject(CONVERSATION_REPOSITORY)
private readonly repo: IConversationRepository
```

**Good:** Repository pattern consistently used

**Issue:** Some direct external dependencies without interfaces:
- Direct Prisma imports in some services
- Direct OpenAI SDK usage (wrapped but not interface-based)
- Direct Redis client usage in some places

**Why it matters:**
- Harder to test (can't easily mock)
- Tight coupling to external libraries
- Difficult to swap implementations

**Effort to fix:** 4-5 days (add abstraction layers)

**Priority:** **P2** - Not urgent, architecture is mostly good

---

## Summary Statistics

### Backend (dating-api)
- **Total TS files:** 841
- **Total services:** 80
- **Test files:** ~400
- **God directories (>100 files):** 2
- **God directories (>50 files):** 3
- **Services >200 LOC:** 20
- **Test files >1000 LOC:** 5
- **Non-test files >500 LOC:** 10
- **Files with >10 methods:** 15
- **console.log instances:** ~50 (mostly in scripts)
- **Module READMEs:** 1

### Frontend (dating-ui)
- **Total files:** 419
- **Test files:** ~150
- **God directories (>50 files):** 2
- **Test files >1000 LOC:** 1
- **Large component files (>200 LOC):** 15
- **console.log instances:** 4
- **Module READMEs:** 0

---

## Prioritized Action Plan

### P0 - Critical (Do First)
1. **Split giant test files** (matches, me-profile) - 8-10 days per file
2. **Reorganize god directories** (matches: 111 files, me-profile: 103 files) - 3-5 days each
3. **Fix test discoverability** - Add test organization

### P1 - High Priority (Do Next)
4. **Refactor god services** (20 services >200 LOC) - 2-3 days each
5. **Split profile-to-canonical.mapper.ts** (55 methods) - 3-5 days
6. **Add module READMEs** (8 critical modules) - 2-3 hours each
7. **Complete directory organization** (lib/, components/) - 5-7 days
8. **Document architecture** (match engine, HG system) - 3-4 days

### P2 - Medium Priority (Do Eventually)
9. **Replace console.log** (production code only) - 1-2 days
10. **Refactor test harnesses** - 3-4 days
11. **Add API documentation** (Swagger) - 3-5 days
12. **Extract magic numbers** - 2-3 days
13. **Add more DIP abstraction** - 4-5 days

---

## Recommendations

### Immediate Actions (This Sprint)
1. Create READMEs for `matches/` and `me-profile/` (4 hours)
2. Split one giant test file as proof-of-concept (2 days)
3. Create subdirectories in matches/ and me-profile/ (1 day)

### Short-term (Next 2 Sprints)
4. Refactor top 5 god services (10-15 days)
5. Complete directory reorganization (5-7 days)
6. Split remaining giant test files (10 days)

### Long-term (Technical Debt Backlog)
7. Add Swagger documentation (3-5 days)
8. Refactor test harnesses (3-4 days)
9. Add SOLID abstraction layers where missing (4-5 days)

---

## Notes

### Good Patterns Observed
- **Repository pattern** consistently used ✅
- **Dependency injection** via NestJS ✅
- **Interface-based abstractions** for most core services ✅
- **Test coverage** appears high (400+ test files) ✅
- **No translation file bloat** in analysis (correctly excluded) ✅
- **Frozen keyword engine** is intentional tech debt (Sprint 52) ✅
- **Console.log mostly in scripts** (acceptable) ✅

### Areas of Excellence
- Strong separation between data access (repositories) and business logic
- Good use of DTOs and response mappers
- Consistent error handling with custom error classes
- Structured logging infrastructure exists (just not used everywhere)

### Debt That's "By Design"
- `dealbreaker-signals-text.extract.ts` (761 LOC) - Frozen keyword engine
- `tension-rules.ts` (721 LOC) - Data-driven rule array
- Test harness files - Could be production packages instead

---

**End of Report**
