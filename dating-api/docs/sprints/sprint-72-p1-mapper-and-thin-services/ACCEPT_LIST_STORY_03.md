# Sprint 72 Story 03 — Accept list

Services left intentional (not thinned in this story).

| File | ~LOC | Accept reason |
|------|------|----------------|
| `extraction/extraction.service.ts` | 348 | Already factored over collaborators; remaining LOC is pipeline/telemetry glue |
| `messaging-realtime/messaging-socket-registry.service.ts` | 338 | Cohesive presence index; realtime multi-module risk — defer |
| `me-profile/profile/me-profile-analysis.service.ts` | 343 | Single public `runForUser`; submit already peeled; optional mapper peel later |

**In scope (thinned):** conversation messages, admin match-quality, photo moderation — see story file.
