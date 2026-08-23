import { applyKeywordTriggers } from '../../../engine/compute-friction';
import type { EnrichedSignals } from '../../../engine/tension-rules';
import type { ProfileJsonPayload } from '../../../profiles/profiles.types';
import { resolveDerivedContext } from '../../../domain/deriveContext';

export interface ProfileContextsAndEnriched {
  signalsA: Record<string, number | null>;
  signalsB: Record<string, number | null>;
  ctxA: ReturnType<typeof resolveDerivedContext>;
  ctxB: ReturnType<typeof resolveDerivedContext>;
  enrichedA: EnrichedSignals;
  enrichedB: EnrichedSignals;
}

export function deriveProfileContextsAndEnrichedSignals(
  profileA: ProfileJsonPayload,
  profileB: ProfileJsonPayload,
): ProfileContextsAndEnriched {
  const signalsA = profileA.evaluation?.self?.signals ?? {};
  const signalsB = profileB.evaluation?.self?.signals ?? {};
  const ctxA = resolveDerivedContext(profileA.evaluation, profileA.texts ?? {});
  const ctxB = resolveDerivedContext(profileB.evaluation, profileB.texts ?? {});
  const enrichedA = applyKeywordTriggers(signalsA, {
    aboutMe: profileA.texts?.aboutMe,
    aboutRelationship: profileA.texts?.aboutRelationship,
  });
  const enrichedB = applyKeywordTriggers(signalsB, {
    aboutMe: profileB.texts?.aboutMe,
    aboutRelationship: profileB.texts?.aboutRelationship,
  });
  return { signalsA, signalsB, ctxA, ctxB, enrichedA, enrichedB };
}
