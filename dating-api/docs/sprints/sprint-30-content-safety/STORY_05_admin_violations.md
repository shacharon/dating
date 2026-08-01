# Story 05 — Admin violations surface

**Sprint 30 · Status: PLANNED**  
**Priority:** P1 (nice-to-have for launch; P0 for post-launch ops)  
**Estimated effort:** 0.5 day  
**Dependencies:** Story 04 (violation service stats + helpers)

---

## Objective

Add admin UI to view content violations, blocked/muted users, and manually unblock users. Essential for reviewing false positives and managing enforcement exceptions.

---

## Scope / tasks

1. **Backend API:**
   - `GET /api/v1/admin/content-violations` — list violations with filters
     - Query params: `surface`, `category`, `userId`, `limit`, `offset`
     - Returns: violation rows with user info (email, nickname)
   - `GET /api/v1/admin/content-violations/stats` — dashboard summary
     - Returns: `ViolationStats` from Story 04
   - `POST /api/v1/admin/content-violations/unblock/:userId` — manual unblock
     - Body: `{ reason: string }` (admin note for audit log)
     - Clears `contentViolationStatus` + `mutedUntil`, logs action

2. **Frontend UI (dating-ui):**
   - New page: `/admin/content-violations`
   - Dashboard at top: stats cards (total violations, muted users, blocked users)
   - Filter bar: surface dropdown, category dropdown, search by userId
   - Table: timestamp, userId, email, surface, category, flagged text preview (first 100 chars), action
   - Row actions: "View user profile" (link to user), "Unblock" button (for muted/blocked users)

3. **Auth guard:**
   - Reuse existing `AdminAuthGuard` (requires `ADMIN_USER_IDS` env)
   - Same security model as `/admin/photos`

4. **Audit logging:**
   - Log admin unblock actions: `obs.trace('admin unblock userId={} adminUserId={} reason={}', ErrorCodes.ADMIN_CONTENT_UNBLOCK)`
   - Include in existing admin action logs

5. **Tests:**
   - Integration: list violations with filters
   - Integration: unblock user → status cleared
   - E2E: admin can view violations page, unblock user

---

## Acceptance criteria

- [ ] Admin can view all violations at `/admin/content-violations`
- [ ] Filters work (surface, category, userId)
- [ ] Stats dashboard shows correct counts
- [ ] Admin can unblock user (clears status + mute timestamp)
- [ ] Unblock action logged with admin user ID + reason
- [ ] UI protected by `AdminAuthGuard`
- [ ] Integration tests cover list + unblock flows

---

## API contracts

### List violations

```
GET /api/v1/admin/content-violations?surface=message&category=sexual&limit=50

Response 200:
{
  "violations": [
    {
      "id": "...",
      "userId": "...",
      "userEmail": "user@example.com",
      "userNickname": "JohnDoe",
      "surface": "message",
      "category": "sexual",
      "flaggedTextPreview": "explicit content here...", // first 100 chars
      "score": 0.98,
      "action": "blocked",
      "createdAt": "2026-08-01T10:30:00Z"
    },
    // ...
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

### Get stats

```
GET /api/v1/admin/content-violations/stats

Response 200:
{
  "totalViolations": 342,
  "violationsByCategory": {
    "sexual": 120,
    "hate": 45,
    "harassment": 89,
    "violence": 88
  },
  "violationsBySurface": {
    "profile_aboutMe": 67,
    "profile_aboutPartner": 34,
    "profile_aboutRelationship": 12,
    "message": 229
  },
  "blockedProfileUsers": 8,
  "mutedMessageUsers": 23,
  "mutedMessageUsersTemporary": 18,
  "mutedMessageUsersIndefinite": 5
}
```

### Unblock user

```
POST /api/v1/admin/content-violations/unblock/usr_xyz123
Body: {
  "reason": "False positive - medical terminology"
}

Response 200:
{
  "success": true,
  "userId": "usr_xyz123",
  "previousStatus": "messaging_muted",
  "clearedAt": "2026-08-01T11:00:00Z"
}
```

---

## UI mockup (high-level)

```
┌─────────────────────────────────────────────────────────────┐
│ Content Violations                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Dashboard                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ Blocked  │ │ Muted    │ │ Muted    │      │
│  │ Violat.  │ │ Profile  │ │ Message  │ │ Message  │      │
│  │   342    │ │ Users: 8 │ │ (temp): │ │ (indef): │      │
│  │          │ │          │ │   18     │ │   5      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  🔍 Filters                                                 │
│  Surface: [All ▼] Category: [All ▼] Search: [____]         │
│                                                             │
│  📋 Violations                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Time      │ User       │ Surface   │ Category │ Action││
│  ├───────────┼────────────┼───────────┼──────────┼───────┤│
│  │ 10:30 AM  │ john@ex.com│ message   │ sexual   │ [Unbl]││
│  │           │ (JohnDoe)  │ "explicit...│         │       ││
│  ├───────────┼────────────┼───────────┼──────────┼───────┤│
│  │ 10:15 AM  │ jane@ex.com│ profile_  │ hate     │ [Unbl]││
│  │           │ (JaneDoe)  │ aboutMe   │          │       ││
│  │           │ "hateful..." │         │          │       ││
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend implementation

### Controller

```typescript
// src/admin/admin-content-violations.controller.ts

import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminContentViolationsService } from './admin-content-violations.service';

@Controller('api/v1/admin/content-violations')
@UseGuards(AdminAuthGuard)
export class AdminContentViolationsController {
  constructor(private readonly service: AdminContentViolationsService) {}

  @Get()
  async list(@Query() query: {
    surface?: string;
    category?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.service.listViolations(query);
  }

  @Get('stats')
  async stats() {
    return this.service.getStats();
  }

  @Post('unblock/:userId')
  async unblock(
    @Param('userId') userId: string,
    @Body() body: { reason: string },
    @Req() req: { user: { userId: string } }, // from AdminAuthGuard
  ) {
    return this.service.unblockUser(userId, req.user.userId, body.reason);
  }
}
```

### Service

```typescript
// src/admin/admin-content-violations.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentViolationService } from '../content-moderation/content-violation.service';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ErrorCodes } from '../logging/error-codes';

@Injectable()
export class AdminContentViolationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly violations: ContentViolationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async listViolations(filters: {
    surface?: string;
    category?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;

    const where: any = {};
    if (filters.surface) where.surface = filters.surface;
    if (filters.category) where.category = filters.category;
    if (filters.userId) where.userId = filters.userId;

    const [violations, total] = await Promise.all([
      this.prisma.userContentViolation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { email: true, profile: { select: { nickname: true } } },
          },
        },
      }),
      this.prisma.userContentViolation.count({ where }),
    ]);

    return {
      violations: violations.map(v => ({
        id: v.id,
        userId: v.userId,
        userEmail: v.user.email,
        userNickname: v.user.profile?.nickname ?? null,
        surface: v.surface,
        category: v.category,
        flaggedTextPreview: v.flaggedText.slice(0, 100),
        score: v.score,
        action: v.action,
        createdAt: v.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  async getStats() {
    return this.violations.getViolationStats();
  }

  async unblockUser(userId: string, adminUserId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { contentViolationStatus: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousStatus = user.contentViolationStatus ?? 'ok';

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });

    this.obs.trace(
      `admin content unblock userId=${userId} adminUserId=${adminUserId} previousStatus=${previousStatus} reason=${reason}`,
      ErrorCodes.ADMIN_CONTENT_UNBLOCK,
    );

    return {
      success: true,
      userId,
      previousStatus,
      clearedAt: new Date().toISOString(),
    };
  }
}
```

---

## Frontend implementation (dating-ui)

### Page

```typescript
// dating-ui/src/app/admin/content-violations/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { listViolations, getViolationStats, unblockUser } from '@/lib/admin-content-api';

export default function AdminContentViolationsPage() {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ surface: '', category: '' });

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    const [v, s] = await Promise.all([
      listViolations(filters),
      getViolationStats(),
    ]);
    setViolations(v.violations);
    setStats(s);
  }

  async function handleUnblock(userId: string) {
    const reason = prompt('Reason for unblock:');
    if (!reason) return;
    
    await unblockUser(userId, reason);
    await loadData();
  }

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Content Violations</h1>

      {/* Stats dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Violations" value={stats.totalViolations} />
        <StatCard label="Blocked Profile Users" value={stats.blockedProfileUsers} />
        <StatCard label="Muted (Temp)" value={stats.mutedMessageUsersTemporary} />
        <StatCard label="Muted (Indefinite)" value={stats.mutedMessageUsersIndefinite} />
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={filters.surface}
          onChange={e => setFilters({ ...filters, surface: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">All Surfaces</option>
          <option value="message">Message</option>
          <option value="profile_aboutMe">Profile: About Me</option>
          {/* ... more options */}
        </select>

        <select
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">All Categories</option>
          <option value="sexual">Sexual</option>
          <option value="hate">Hate</option>
          {/* ... more options */}
        </select>
      </div>

      {/* Table */}
      <table className="w-full border">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Surface</th>
            <th>Category</th>
            <th>Text Preview</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {violations.map(v => (
            <tr key={v.id}>
              <td>{new Date(v.createdAt).toLocaleString()}</td>
              <td>
                {v.userEmail}<br />
                ({v.userNickname ?? 'no nickname'})
              </td>
              <td>{v.surface}</td>
              <td>{v.category}</td>
              <td className="max-w-xs truncate">{v.flaggedTextPreview}</td>
              <td>
                <button
                  onClick={() => handleUnblock(v.userId)}
                  className="text-blue-600 hover:underline"
                >
                  Unblock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border p-4 rounded">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
```

---

## Notes / gotchas

- **Flagged text storage:** Full text is stored for admin review (encrypted at rest per DB config)
- **Privacy:** Admin sees full violation details — document this in ops access policy
- **Manual unblock:** No automated appeal flow yet — all unblocks are admin-initiated
- **Future enhancement:** Add "appeal" button for users (Story 06 in future sprint)

---

## Deliverables

- `src/admin/admin-content-violations.controller.ts` (new)
- `src/admin/admin-content-violations.service.ts` (new)
- `src/admin/admin-content-violations.service.spec.ts` (tests)
- `dating-ui/src/app/admin/content-violations/page.tsx` (new)
- `dating-ui/src/lib/admin-content-api.ts` (add new API methods)
- `src/logging/error-codes.ts` (add `ADMIN_CONTENT_UNBLOCK`)

---

## Commit message

```
feat(admin): add content violations dashboard

Admin can view violations, filter by surface/category, and manually
unblock users. Essential for reviewing false positives post-launch.

Sprint 30 Story 5
```
