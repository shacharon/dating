/**
 * Shared stubs for Sprint 22 match-narrative wiring in Nest HTTP / E2E harnesses.
 * Keeps integration tests off the live OpenAI path while still exercising cache DI.
 */
import { MATCH_NARRATIVE_PROMPT_VERSION } from '../../../matches/match-narrative';

const COMPOUND_UNIQUE =
  'viewerProfileId_candidateProfileId_viewerEvaluationId_candidateEvaluationId_promptVersion';

function cacheKey(parts: {
  viewerProfileId: string;
  candidateProfileId: string;
  viewerEvaluationId: string;
  candidateEvaluationId: string;
  promptVersion: string;
}): string {
  return [
    parts.viewerProfileId,
    parts.candidateProfileId,
    parts.viewerEvaluationId,
    parts.candidateEvaluationId,
    parts.promptVersion,
  ].join('\0');
}

/** In-memory Prisma delegate for `MatchNarrativeCache`. */
export function createMatchNarrativeCachePrismaMock() {
  const store = new Map<string, string>();
  return {
    store,
    matchNarrativeCache: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: Record<string, {
            viewerProfileId: string;
            candidateProfileId: string;
            viewerEvaluationId: string;
            candidateEvaluationId: string;
            promptVersion: string;
          }>;
        }) => {
          const parts = where[COMPOUND_UNIQUE];
          if (!parts) return null;
          const narrative = store.get(cacheKey(parts));
          return narrative != null ? { narrative } : null;
        },
      ),
      upsert: jest.fn(
        async ({
          where,
          create,
        }: {
          where: Record<string, {
            viewerProfileId: string;
            candidateProfileId: string;
            viewerEvaluationId: string;
            candidateEvaluationId: string;
            promptVersion: string;
          }>;
          create: {
            viewerProfileId: string;
            candidateProfileId: string;
            viewerEvaluationId: string;
            candidateEvaluationId: string;
            promptVersion: string;
            narrative: string;
            model?: string | null;
          };
        }) => {
          const parts = where[COMPOUND_UNIQUE] ?? create;
          store.set(cacheKey(parts), create.narrative);
          return { id: 'narr_cache_row', ...create };
        },
      ),
    },
  };
}

/** Deterministic generator stub — `source: 'fallback'` so tests do not require cache upserts. */
export function createMatchNarrativeGeneratorStub(overrides?: {
  narrative?: string;
  source?: 'llm' | 'fallback';
}) {
  return {
    generate: jest.fn().mockResolvedValue({
      narrative:
        overrides?.narrative ??
        'Stub match narrative for integration tests.',
      source: overrides?.source ?? 'fallback',
      promptVersion: MATCH_NARRATIVE_PROMPT_VERSION,
    }),
  };
}
