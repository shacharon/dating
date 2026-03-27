import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileJsonPayload } from '../profiles/profiles-json.service';
import { ProfilesJsonService } from '../profiles/profiles-json.service';
import { compareWithStatus } from './match-engine';
import type {
  CompareGuardFailureResultDto,
  CompareResultDto,
} from './match-engine';
import type { MatchListItemDto, MatchRecordDto } from './match.types';
import { MatchesJsonService } from './matches-json.service';

export type { CompareResultDto } from './match-engine';
export type { MatchListItemDto } from './match.types';

export interface CompareBodyDto {
  aId: string;
  bId: string;
}

export interface CompareGuardMatchDto {
  matchId: string;
  aId: string;
  bId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  overall: null;
  finalScore: null;
}

/** @deprecated Use CompareGuardMatchDto */
export type CompareNotAnalyzedMatchDto = CompareGuardMatchDto;

export type CompareServiceResult =
  | { status: 'READY'; matchId: string; match: MatchRecordDto }
  | { status: 'NOT_ANALYZED'; matchId: string; match: CompareGuardMatchDto }
  | { status: 'INSUFFICIENT_DATA'; matchId: string; match: CompareGuardMatchDto };

/** Deterministic matchId: minId__maxId (lexicographic). */
function toMatchId(aId: string, bId: string): string {
  const [minId, maxId] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${minId}__${maxId}`;
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly profilesJson: ProfilesJsonService,
    private readonly matchesJson: MatchesJsonService,
  ) {}

  async compare(body: CompareBodyDto): Promise<CompareServiceResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const [profileA, profileB] = await Promise.all([
      this.profilesJson.getById(aId),
      this.profilesJson.getById(bId),
    ]);

    if (!profileA) throw new NotFoundException(`Profile not found: ${aId}`);
    if (!profileB) throw new NotFoundException(`Profile not found: ${bId}`);

    const result: CompareResultDto | CompareGuardFailureResultDto = compareWithStatus(
      profileA as ProfileJsonPayload,
      profileB as ProfileJsonPayload,
    );

    const matchId = toMatchId(aId, bId);
    if ('status' in result && result.status === 'NOT_ANALYZED') {
      return {
        status: 'NOT_ANALYZED',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'NOT_ANALYZED',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          overall: null,
          finalScore: null,
        },
      };
    }
    if ('status' in result && result.status === 'INSUFFICIENT_DATA') {
      return {
        status: 'INSUFFICIENT_DATA',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'INSUFFICIENT_DATA',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          overall: null,
          finalScore: null,
        },
      };
    }
    const compareResult = result as CompareResultDto;

    const now = new Date().toISOString();

    const record: MatchRecordDto = {
      matchId,
      aId,
      bId,
      a: { id: profileA.id, name: profileA.name },
      b: { id: profileB.id, name: profileB.name },
      overall: compareResult.finalScore,
      createdAt: now,
      updatedAt: now,
      aToB: compareResult.aToB,
      bToA: compareResult.bToA,
      relationshipStyle: compareResult.relationshipStyle,
      coverage: compareResult.coverage,
      frictionRisk: compareResult.frictionRisk,
      compatibility: compareResult.compatibility,
      finalScore: compareResult.finalScore,
      rawScore: compareResult.rawScore,
      friction: compareResult.friction,
      frictionPenalty: compareResult.frictionPenalty,
      coveragePercent: compareResult.coveragePercent,
      scoreCoverageFactor: compareResult.scoreCoverageFactor,
      coverageFactor: compareResult.coverageFactor,
      confidence: compareResult.confidence,
      infoFlags: compareResult.infoFlags,
      alignments: compareResult.alignments,
      tensions: compareResult.tensions,
      tensionMatrix: compareResult.tensionMatrix,
      derived: compareResult.derived,
      dealbreakers: compareResult.dealbreakers,
      balance: compareResult.balance,
      debug: compareResult.debug,
      explainability: compareResult.explainability,
      recommendation: compareResult.recommendation,
    };

    await this.matchesJson.save(record);

    return { status: 'READY', matchId, match: record };
  }

  async list(): Promise<MatchListItemDto[]> {
    return this.matchesJson.list();
  }

  async listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    return this.matchesJson.listFull(opts);
  }

  async getById(matchId: string): Promise<MatchRecordDto | null> {
    return this.matchesJson.getById(matchId);
  }
}
