import { computeValuesAlignment } from '../../compatibility/compatibility-score';
import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type { RelationshipBalanceResult } from '../../domain/relationshipBalance';
import {
  BALANCE_RATIO_LOW,
  BALANCE_RATIO_MID,
  RELATIONSHIP_FIT_GREEN_BOOST,
  RELATIONSHIP_FIT_LOW_BALANCE_PENALTY,
  VALUES_ALIGNMENT_FOR_COMPAT_CAP,
} from '../matching-algorithm.constants';
import { clampTo100 } from './util';

export interface RelationshipFitAndValuesAlignment {
  relationshipFit: number;
  valuesAlignment: number;
  valuesAlignmentForCompat: number;
}

export function computeRelationshipFitAndValuesAlignment(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
  balance: RelationshipBalanceResult,
): RelationshipFitAndValuesAlignment {
  let relationshipFit = Math.round(
    ((profileA.evaluation?.productScores?.relationshipFitScore ?? 0) +
      (profileB.evaluation?.productScores?.relationshipFitScore ?? 0)) /
      2,
  );
  if (balance.ratio >= BALANCE_RATIO_MID) {
    relationshipFit = Math.min(
      100,
      relationshipFit + RELATIONSHIP_FIT_GREEN_BOOST,
    );
  } else if (balance.ratio < BALANCE_RATIO_LOW) {
    relationshipFit = Math.max(
      0,
      relationshipFit - RELATIONSHIP_FIT_LOW_BALANCE_PENALTY,
    );
  }
  relationshipFit = clampTo100(relationshipFit);
  const signalsA = profileA.evaluation?.self?.signals ?? {};
  const signalsB = profileB.evaluation?.self?.signals ?? {};
  const valuesAlignment = computeValuesAlignment(signalsA, signalsB);
  const valuesAlignmentForCompat = Math.min(
    VALUES_ALIGNMENT_FOR_COMPAT_CAP,
    valuesAlignment,
  );
  return { relationshipFit, valuesAlignment, valuesAlignmentForCompat };
}
