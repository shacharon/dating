# Story 04 — Violation counting + progressive blocks

**Sprint 30 · Status: 🟡 IN PROGRESS — Agent 0 complete → run Agent 1**  
**Priority:** P0  
**Estimated effort:** 0.5 day  
**Dependencies:** Stories 01, 02, 03 (enforcement logic split from those stories)  
**Handoffs:** [architect](./handoffs/STORY_04_violation_enforcement/agent-0-architect.md)

---

## Objective

Consolidate violation counting, threshold checking, and block enforcement into a single service. Clean up duplication between profile/message paths. Add helper methods for checking user status across the app.

---

## Scope / tasks

1. **Refactor ContentViolationService:**
   - Move threshold/muting logic from `MeConversationMessagesService` into `ContentViolationService`
   - Add method: `enforceViolationThreshold(userId, surface): Promise<EnforcementResult>`
   - Returns: `{ shouldBlock: boolean, mutedUntil?: Date, reason: string }`

2. **Add status check helpers:**
   - `isUserBlocked(userId, surface: 'profile' | 'message'): Promise<boolean>`
   - `getUserBlockStatus(userId): Promise<UserBlockStatus>` — returns current status + expiry

3. **Unify status enum:**
   - Ensure `User.contentViolationStatus` covers all states consistently:
     - `'ok'` (default)
     - `'profile_edit_blocked'` (3 profile violations)
     - `'messaging_muted'` (3/hour, 10/day, or 20 lifetime message violations)

4. **Add unmute logic:**
   - Method: `clearExpiredMutes(): Promise<number>` — finds all users with `mutedUntil < now`, clears status
   - Called by a lightweight cron (or checked on-demand in Stories 02/03)
   - Returns count of users unmuted (for observability)

5. **Observability dashboard data:**
   - Add method: `getViolationStats(): Promise<ViolationStats>` for admin/ops
   - Returns: total violations by surface/category, muted user count, blocked user count

6. **Tests:**
   - Unit: threshold enforcement returns correct action for each count
   - Unit: expired mutes cleared correctly
   - Integration: violation → enforcement → status change flows end-to-end

---

## Acceptance criteria

- [ ] Threshold logic consolidated in `ContentViolationService`
- [ ] Profile + message services use shared enforcement method
- [ ] `isUserBlocked()` returns correct status for all surfaces
- [ ] Expired mutes cleared by `clearExpiredMutes()`
- [ ] Stats method returns correct counts
- [ ] Unit + integration tests green
- [ ] No code duplication between profile/message enforcement

---

## Technical details

### Refactored service interface

```typescript
// src/content-moderation/content-violation.service.ts

interface EnforcementResult {
  shouldBlock: boolean;
  mutedUntil?: Date;
  reason: string; // '3_profile_violations' | '3_hourly' | '10_daily' | '20_lifetime'
}

interface UserBlockStatus {
  status: 'ok' | 'profile_edit_blocked' | 'messaging_muted';
  mutedUntil?: Date;
  violationCount: number;
}

interface ViolationStats {
  totalViolations: number;
  violationsByCategory: Record<string, number>;
  violationsBySurface: Record<string, number>;
  blockedProfileUsers: number;
  mutedMessageUsers: number;
  mutedMessageUsersTemporary: number;
  mutedMessageUsersIndefinite: number;
}

export class ContentViolationService {
  // Existing methods from Story 01
  async recordViolation(args: { ... }): Promise<void>;
  async getViolationCount(userId: string, options?: { ... }): Promise<number>;

  // NEW: consolidated enforcement
  async enforceViolationThreshold(
    userId: string, 
    surface: 'profile' | 'message'
  ): Promise<EnforcementResult> {
    if (surface === 'profile') {
      const count = await this.getViolationCount(userId, { 
        surface: 'profile_' // prefix match
      });
      
      if (count >= 3) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            contentViolationStatus: 'profile_edit_blocked',
            contentViolationCount: count,
          },
        });
        
        return { 
          shouldBlock: true, 
          reason: '3_profile_violations' 
        };
      }
      
      return { shouldBlock: false, reason: 'under_threshold' };
    }

    if (surface === 'message') {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [hourly, daily, lifetime] = await Promise.all([
        this.getViolationCount(userId, { surface: 'message', since: oneHourAgo }),
        this.getViolationCount(userId, { surface: 'message', since: oneDayAgo }),
        this.getViolationCount(userId, { surface: 'message' }),
      ]);

      let mutedUntil: Date | null = null;
      let reason = '';

      if (lifetime >= 20) {
        mutedUntil = null; // indefinite
        reason = '20_lifetime';
      } else if (daily >= 10) {
        mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        reason = '10_daily';
      } else if (hourly >= 3) {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
        reason = '3_hourly';
      }

      if (reason) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            contentViolationStatus: 'messaging_muted',
            contentViolationMutedUntil: mutedUntil,
            contentViolationCount: lifetime,
          },
        });

        return { 
          shouldBlock: true, 
          mutedUntil: mutedUntil ?? undefined, 
          reason 
        };
      }

      return { shouldBlock: false, reason: 'under_threshold' };
    }

    throw new Error(`Unknown surface: ${surface}`);
  }

  // NEW: status check helpers
  async isUserBlocked(
    userId: string, 
    surface: 'profile' | 'message'
  ): Promise<boolean> {
    const status = await this.getUserBlockStatus(userId);
    
    if (surface === 'profile') {
      return status.status === 'profile_edit_blocked';
    }
    
    if (surface === 'message') {
      if (status.status !== 'messaging_muted') return false;
      
      // Check if mute expired
      if (status.mutedUntil && status.mutedUntil <= new Date()) {
        await this.clearExpiredMute(userId);
        return false;
      }
      
      return true;
    }
    
    return false;
  }

  async getUserBlockStatus(userId: string): Promise<UserBlockStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentViolationStatus: true,
        contentViolationMutedUntil: true,
        contentViolationCount: true,
      },
    });

    return {
      status: (user?.contentViolationStatus as any) ?? 'ok',
      mutedUntil: user?.contentViolationMutedUntil ?? undefined,
      violationCount: user?.contentViolationCount ?? 0,
    };
  }

  // NEW: cleanup expired mutes
  async clearExpiredMutes(): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: {
          lte: new Date(),
        },
      },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });

    if (result.count > 0) {
      this.obs.trace(
        `cleared ${result.count} expired mutes`,
        ErrorCodes.CONTENT_MUTES_EXPIRED,
      );
    }

    return result.count;
  }

  private async clearExpiredMute(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });
  }

  // NEW: stats for admin/ops
  async getViolationStats(): Promise<ViolationStats> {
    const [
      allViolations,
      blockedProfiles,
      mutedUsers,
    ] = await Promise.all([
      this.prisma.userContentViolation.findMany({
        select: { category: true, surface: true },
      }),
      this.prisma.user.count({
        where: { contentViolationStatus: 'profile_edit_blocked' },
      }),
      this.prisma.user.findMany({
        where: { contentViolationStatus: 'messaging_muted' },
        select: { contentViolationMutedUntil: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    const bySurface: Record<string, number> = {};

    for (const v of allViolations) {
      byCategory[v.category] = (byCategory[v.category] ?? 0) + 1;
      bySurface[v.surface] = (bySurface[v.surface] ?? 0) + 1;
    }

    const mutedTemporary = mutedUsers.filter(
      u => u.contentViolationMutedUntil != null
    ).length;
    const mutedIndefinite = mutedUsers.length - mutedTemporary;

    return {
      totalViolations: allViolations.length,
      violationsByCategory: byCategory,
      violationsBySurface: bySurface,
      blockedProfileUsers: blockedProfiles,
      mutedMessageUsers: mutedUsers.length,
      mutedMessageUsersTemporary: mutedTemporary,
      mutedMessageUsersIndefinite: mutedIndefinite,
    };
  }
}
```

### Usage in profile/message services (simplified)

```typescript
// src/me-profile/me-profile.service.ts
async checkProfileFieldsForModeration(...) {
  const result = await this.moderation.checkContent(text);
  
  if (result.flagged) {
    await this.violations.recordViolation({ ... });
    
    const enforcement = await this.violations.enforceViolationThreshold(
      userId, 
      'profile'
    );
    
    if (enforcement.shouldBlock) {
      this.obs.trace(
        `profile edit blocked userId=${userId} reason=${enforcement.reason}`,
        ErrorCodes.CONTENT_PROFILE_EDIT_BLOCKED,
      );
    }
    
    throw new BadRequestException({ ... });
  }
}

// src/me-profile/me-conversation-messages.service.ts  
async checkMessageForModeration(...) {
  const result = await this.moderation.checkContent(text);
  
  if (result.flagged) {
    await this.violations.recordViolation({ ... });
    
    const enforcement = await this.violations.enforceViolationThreshold(
      userId,
      'message'
    );
    
    if (enforcement.shouldBlock) {
      const duration = enforcement.mutedUntil 
        ? `until ${enforcement.mutedUntil.toISOString()}`
        : 'indefinitely';
      
      this.obs.trace(
        `messaging muted userId=${userId} duration=${duration} reason=${enforcement.reason}`,
        ErrorCodes.CONTENT_USER_MUTED,
      );
    }
    
    throw new BadRequestException({ ... });
  }
}
```

---

## Observability

New error codes:
- `CONTENT_MUTES_EXPIRED` — log when cron clears expired mutes
- `CONTENT_ENFORCEMENT_PROFILE_BLOCKED` — log profile block
- `CONTENT_ENFORCEMENT_MESSAGE_MUTED` — log message mute

---

## Notes / gotchas

- **Why separate this story:** Stories 02 + 03 already implement enforcement inline; Story 04 refactors to remove duplication + add helpers for future features (e.g. admin unblock, appeal flow)
- **Cron for expired mutes:** Optional; could run hourly or be on-demand only (checked on every send attempt)
- **Stats method:** Useful for admin dashboard (Story 05) and ops monitoring

---

## Deliverables

- `src/content-moderation/content-violation.service.ts` (refactored)
- `src/content-moderation/content-violation.service.spec.ts` (updated tests)
- `src/me-profile/me-profile.service.ts` (simplified enforcement calls)
- `src/me-profile/me-conversation-messages.service.ts` (simplified enforcement calls)
- `src/logging/error-codes.ts` (add `CONTENT_MUTES_EXPIRED`)

---

## Commit message

```
refactor(moderation): consolidate enforcement into violation service

Move threshold/muting logic into ContentViolationService to eliminate
duplication between profile/message paths. Add status helpers and stats.

Sprint 30 Story 4
```
