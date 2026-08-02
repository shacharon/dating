import { resolveDerivedContext } from '../../domain/deriveContext';
import {
  computeDealbreakers,
  type CoreSignals,
  type Dealbreaker,
} from '../../domain/dealbreakers';
import {
  computeRelationshipBalance,
  type RelationshipBalanceResult,
} from '../../domain/relationshipBalance';

export interface DealbreakersAndBalance {
  dealbreakers: Dealbreaker[];
  balance: RelationshipBalanceResult;
}

export function computeDealbreakersAndBalance(
  signalsA: Record<string, number | null>,
  ctxA: ReturnType<typeof resolveDerivedContext>,
  signalsB: Record<string, number | null>,
  ctxB: ReturnType<typeof resolveDerivedContext>,
): DealbreakersAndBalance {
  const dealbreakers = computeDealbreakers({
    a: { signals: signalsA as CoreSignals, ctx: ctxA },
    b: { signals: signalsB as CoreSignals, ctx: ctxB },
  });
  const balance = computeRelationshipBalance({
    signalsA: signalsA as CoreSignals,
    signalsB: signalsB as CoreSignals,
    dealbreakers,
  });
  return { dealbreakers, balance };
}
