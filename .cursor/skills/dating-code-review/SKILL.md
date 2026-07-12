---
name: dating-code-review
description: >-
  Code review and testing for the dating app — Jest API tests, Vitest UI tests,
  security audit. Loaded by agent 2; not invoked directly.
disable-model-invocation: true
---

# Dating App Code Review + Testing (role)

Review implementations, write tests, fix issues.

## Review checklist

### Security
- Auth guards on all endpoints
- User can only access own data
- Input validation; no sensitive data in errors

### Logic
- Edge cases (null, empty, self-action)
- Idempotency (upsert where needed)
- Transactions for atomic ops

### Quality
- Type-safe, consistent patterns, no N+1 queries
- Indexes on queried columns

### Tests
- Unit tests for services
- Integration tests for API endpoints
- UI tests for interactions + error states

### Runtime / browser (mandatory when diff touches realtime, proxy, or migrations)
Load [dating-runtime-verification](../dating-runtime-verification/SKILL.md).

- Mocked `socket.io-client` / `fetch` tests **do not** satisfy transport verification alone
- Confirm architect **Runtime topology** matches code
- **Critical:** migration without `migrate deploy` note; socket via flaky Next WS proxy; duplicate socket instances
- **Do not approve** realtime stories with mocks-only transport coverage and no browser/integration gate

### Matching engine E2E (mandatory when diff touches eligibility, preference dimensions, or ranking)
Load [dating-e2e-verification](../dating-e2e-verification/SKILL.md). Deep E2E execution is **agent 4**'s job (`dating-e2e-tester`), not this step's — your job here is to flag that it's required, not to run it yourself.

- Unit tests on `eligibility.evaluator.ts` / `holy-grail-five-signal-ranking.ts` alone **do not** satisfy this — a real-HTTP scenario through the shared harness is still needed, from agent 4
- Note in your handoff that `--agent 4 story <m>` is required next for this story
- **Do not approve as fully done** eligibility/ranking stories until agent 4's handoff exists and passes — that check happens at agent 3, but don't imply this step alone cleared it

## Test patterns

### API integration (Jest + supertest)
```typescript
it('POST /api/v1/me/matches/:id/actions creates LIKE', async () => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/me/matches/profile-123/actions')
    .set('Cookie', sessionCookie)
    .send({ action: 'LIKE' })
    .expect(201);

  expect(res.body).toMatchObject({
    action: 'LIKE',
    actorUserId: expect.any(String),
    targetUserId: expect.any(String),
    targetProfileIdSnapshot: 'profile-123',
  });
});
```

### UI (Vitest + testing-library)
```typescript
it('shows Like button and handles click', async () => {
  render(<MatchDetailPage />);
  await screen.findByRole('button', { name: /like/i });
  fireEvent.click(screen.getByRole('button', { name: /like/i }));
  await waitFor(() => expect(likeMatch).toHaveBeenCalledWith('match-1'));
});
```

## Deliverables

1. Issues (Critical / Major / Minor) with fixes
2. Test files — happy path + error + edge cases
3. Run tests; report pass/fail
4. **Runtime verification** row in handoff — browser Network checklist or API `socket.io-client` integration result (pass / deferred / N/A)

## Do not

- Redesign architecture or add unrelated features
