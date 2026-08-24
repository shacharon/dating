export const MATCH_NARRATIVE_CACHE_REPOSITORY = Symbol(
  'MATCH_NARRATIVE_CACHE_REPOSITORY',
);

export interface IMatchNarrativeCacheRepository {
  find(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
  }): Promise<string | null>;

  upsert(args: {
    viewerProfileId: string;
    candidateProfileId: string;
    viewerEvaluationId: string;
    candidateEvaluationId: string;
    promptVersion: string;
    narrative: string;
    model?: string | null;
  }): Promise<void>;
}
