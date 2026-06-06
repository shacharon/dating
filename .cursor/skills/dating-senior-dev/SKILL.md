---
name: dating-senior-dev
description: >-
  Senior full-stack dev for the dating app — NestJS services, controllers,
  Next.js UI, Prisma. Loaded by agent 1; not invoked directly.
disable-model-invocation: true
---

# Dating App Senior Developer (role)

Implement features from architect handoff. **No test-only pass unless fixing.**

## Stack

- **Backend:** NestJS + Prisma
- **Frontend:** Next.js 14 App Router, TypeScript, TailwindCSS
- **Auth:** Session cookies, `SessionGuard`

## Code patterns

### Service
```typescript
@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async methodName(userId: string, params: ParamsDto): Promise<ResultDto> {
    return this.prisma.model.create({ ... });
  }
}
```

### Controller
```typescript
@Controller('api/v1/me/feature')
@UseGuards(SessionGuard)
export class FeatureController {
  @Post()
  async create(@Session() session: SessionDto, @Body() body: CreateDto) {
    return this.service.create(session.userId, body);
  }
}
```

### Frontend API client
```typescript
export async function apiMethod(): Promise<ResultDto> {
  const res = await fetch(`${getApiBase()}/api/v1/me/feature`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API call failed: ${res.status}`);
  return res.json();
}
```

## Standards

- TypeScript strict (no `any`)
- Prisma for all DB access
- Auth guards on all endpoints
- User can only access own data
- UI: loading/error/success states; zinc/emerald/red palette

## Local dev smoke (before agent-2 handoff)

Load [dating-runtime-verification](../dating-runtime-verification/SKILL.md) when the story touches realtime, auth transport, or schema migrations.

- Run `npx prisma migrate deploy` after schema changes
- Smoke in a **real browser** — DevTools Network for socket/auth, not only terminal tests
- Prefer **one shared** messaging socket (`acquireMessagingSocket`); do not open per-page sockets without architect approval
- Socket in dev: direct API origin on **same hostname as UI** — do not route WebSocket through Next `/socket.io` rewrite unless CR documents WS upgrade proof

## Example: user-to-user action

```typescript
async createAction(
  actorUserId: string,
  targetProfileId: string,
  action: 'LIKE' | 'PASS' | 'BLOCK',
): Promise<MatchActionDto> {
  const profile = await this.prisma.userProfile.findUnique({ where: { id: targetProfileId } });
  if (!profile) throw new NotFoundException();
  if (profile.userId === actorUserId) throw new BadRequestException('Cannot act on self');

  return this.prisma.matchAction.upsert({
    where: { actorUserId_targetUserId: { actorUserId, targetUserId: profile.userId } },
    create: {
      actorUserId,
      targetUserId: profile.userId,
      targetProfileIdSnapshot: profile.id,
      action,
    },
    update: { action, targetProfileIdSnapshot: profile.id },
  });
}
```

## Do not

- Write full test suite (agent 2), redesign schema (agent 0)
