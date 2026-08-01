# Story 02 — Profile field moderation gate

**Sprint 30 · Status: 🟡 IN PROGRESS — Agent 0 complete → run Agent 1**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Dependencies:** Story 01 (moderation client + violation service)  
**Handoffs:** [architect](./handoffs/STORY_02_profile_field_gate/agent-0-architect.md)

---

## Objective

Gate `aboutMe`, `aboutPartner`, and `aboutRelationship` fields through OpenAI moderation on save/patch. Block explicit content before it persists to DB or shows in match results.

---

## Scope / tasks

1. **Inject moderation into MeProfileService:**
   - Add `ContentModerationService` to `MeProfileService` constructor
   - On `create()` / `update()` → check all three text fields before save
   - If any field is flagged → throw `BadRequestException` with category
   - If clean → proceed with normal save logic

2. **Error response shape:**
   ```json
   {
     "error": "content_moderation_failed",
     "message": "Your profile contains inappropriate content",
     "details": {
       "field": "aboutMe",  // or 'aboutPartner' / 'aboutRelationship'
       "category": "sexual", // or 'hate' / 'harassment' / etc.
       "suggestion": "Please rephrase without explicit content"
     }
   }
   ```

3. **Violation tracking:**
   - On moderation failure → `ContentViolationService.recordViolation(userId, 'profile_{field}', text, category, score, 'blocked')`
   - Check violation count after recording: if ≥3 total profile violations → set `User.contentViolationStatus = 'profile_edit_blocked'`
   - If user is already blocked → return `403` instead of `400`, with message "Profile editing is currently restricted"

4. **Pre-flight check on request:**
   - Before moderation check, verify `User.contentViolationStatus !== 'profile_edit_blocked'`
   - If blocked → short-circuit with `403` (don't waste moderation API call)

5. **Observability:**
   - Log moderation check for each field (no raw text, just `fieldName` + `flagged` + `category`)
   - Log violation recordings
   - Log when user gets blocked (status transition)

6. **Tests:**
   - Unit: moderation service returns flagged → service throws with correct error shape
   - Unit: 3rd violation → user status transitions to `profile_edit_blocked`
   - Integration: POST/PATCH profile with explicit `aboutMe` → 400 + correct error
   - Integration: 3 flagged profile edits → 4th attempt returns 403

---

## Acceptance criteria

- [ ] POST/PATCH `/api/v1/me/profile` with flagged text → 400 with category in response
- [ ] Clean text → saves normally (no behavior change)
- [ ] 3rd profile violation → `User.contentViolationStatus = 'profile_edit_blocked'`
- [ ] Blocked user attempts edit → 403 "Profile editing is currently restricted"
- [ ] All three fields checked (`aboutMe`, `aboutPartner`, `aboutRelationship`)
- [ ] Integration tests cover flagged/clean/blocked scenarios
- [ ] Observability: violations logged with field + category (no raw text)

---

## Technical details

### Service changes

```typescript
// src/me-profile/me-profile.service.ts

import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { ContentViolationService } from '../content-moderation/content-violation.service';

export class MeProfileService {
  constructor(
    // ... existing deps
    private readonly moderation: ContentModerationService,
    private readonly violations: ContentViolationService,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<ProfileDto> {
    await this.assertUserNotBlocked(userId);
    await this.checkProfileFieldsForModeration(userId, dto);
    
    // ... existing create logic
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileDto> {
    await this.assertUserNotBlocked(userId);
    await this.checkProfileFieldsForModeration(userId, dto);
    
    // ... existing update logic
  }

  private async assertUserNotBlocked(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { contentViolationStatus: true },
    });
    
    if (user?.contentViolationStatus === 'profile_edit_blocked') {
      throw new ForbiddenException({
        error: 'profile_edit_blocked',
        message: 'Profile editing is currently restricted due to previous content violations',
      });
    }
  }

  private async checkProfileFieldsForModeration(
    userId: string,
    dto: { aboutMe?: string | null; aboutPartner?: string | null; aboutRelationship?: string | null }
  ): Promise<void> {
    const fieldsToCheck: Array<[string, string]> = [
      ['aboutMe', dto.aboutMe],
      ['aboutPartner', dto.aboutPartner],
      ['aboutRelationship', dto.aboutRelationship],
    ].filter(([_, text]) => typeof text === 'string' && text.trim().length > 0);

    for (const [field, text] of fieldsToCheck) {
      const result = await this.moderation.checkContent(text);
      
      if (result.flagged) {
        await this.violations.recordViolation({
          userId,
          surface: `profile_${field}`,
          flaggedText: text,
          category: result.primaryCategory,
          score: result.score,
          action: 'blocked',
        });

        const totalProfileViolations = await this.violations.getViolationCount(userId, {
          surface: 'profile_', // prefix match for all profile fields
        });

        if (totalProfileViolations >= 3) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { 
              contentViolationStatus: 'profile_edit_blocked',
              contentViolationCount: totalProfileViolations,
            },
          });
        }

        throw new BadRequestException({
          error: 'content_moderation_failed',
          message: 'Your profile contains inappropriate content',
          details: {
            field,
            category: result.primaryCategory,
            suggestion: 'Please rephrase without explicit or harmful content',
          },
        });
      }
    }
  }
}
```

### Error codes to add

```typescript
// src/logging/error-codes.ts

export const ErrorCodes = {
  // ... existing codes
  
  // Sprint 30: content moderation
  CONTENT_MODERATION_CHECK: 'CONTENT_MODERATION_CHECK',
  CONTENT_MODERATION_FLAGGED: 'CONTENT_MODERATION_FLAGGED',
  CONTENT_VIOLATION_RECORDED: 'CONTENT_VIOLATION_RECORDED',
  CONTENT_USER_BLOCKED: 'CONTENT_USER_BLOCKED',
  CONTENT_PROFILE_EDIT_BLOCKED: 'CONTENT_PROFILE_EDIT_BLOCKED',
};
```

---

## User experience flow

**Clean content:**
```
User saves profile with "I love hiking and reading sci-fi" 
  → Moderation check (100ms)
  → Clean
  → Saves to DB
  → Returns 200
```

**First violation:**
```
User saves profile with explicit text
  → Moderation check (150ms)
  → Flagged: category='sexual'
  → Record violation (1st)
  → Returns 400: "Your profile contains inappropriate content (sexual)"
  → Profile NOT saved
  → User can retry with different text
```

**Third violation:**
```
User attempts 3rd flagged save
  → Moderation check (120ms)
  → Flagged: category='hate'
  → Record violation (3rd)
  → Set contentViolationStatus='profile_edit_blocked'
  → Returns 400 with block notice
```

**Fourth attempt (already blocked):**
```
User attempts edit (any text)
  → Check user status
  → Status='profile_edit_blocked'
  → Returns 403: "Profile editing is currently restricted"
  → No moderation check happens (short-circuit)
```

---

## Notes / gotchas

- **Empty/null fields skip check:** If user clears a field (sets to `null`), don't run moderation — allow clearing
- **Whitespace-only:** Trim before checking; if empty after trim → skip moderation
- **Partial updates:** PATCH only checks fields present in DTO — don't re-check unchanged fields
- **Latency:** Adds ~100-200ms to profile save — acceptable for this use case (not rapid-fire like chat)
- **False positives:** If user hits false positive (e.g. medical terms), they'll file support ticket — admin can manually unblock via future Story 05

---

## Deliverables

- `src/me-profile/me-profile.service.ts` (updated)
- `src/me-profile/me-profile.service.spec.ts` (updated unit tests)
- `src/me-profile/me-profile-http.integration.spec.ts` (updated integration tests)
- `src/logging/error-codes.ts` (add moderation codes)

---

## Commit message

```
feat(moderation): gate profile fields through OpenAI moderation

Block explicit/harmful content in aboutMe/aboutPartner/aboutRelationship
on save. Track violations and block editing after 3 strikes.

Sprint 30 Story 2
```
