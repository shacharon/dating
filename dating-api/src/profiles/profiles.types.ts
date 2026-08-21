import type { EvaluateBatchResult } from '../evaluate/evaluate-public-api';
import type { RawInterests } from '../extraction/extracted-interests.interface';

export interface ProfileJsonPayload {
  id: string;
  name: string;
  texts: {
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
  };
  evaluation: EvaluateBatchResult;
  savedAt: string;
  evaluationStatus?: 'DONE' | 'FAILED';
  lastError?: string;
  evaluatedAt?: string;
  promptVersion?: string;
  policyVersion?: string;
  textHash?: string;
  signals?: Record<string, number | null>;
  rawInterests?: RawInterests;
}

export interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}
