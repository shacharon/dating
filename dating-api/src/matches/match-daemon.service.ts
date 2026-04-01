import { Injectable } from '@nestjs/common';
import type { ProfileJsonPayload } from '../profiles/profiles-json.service';
import { ProfilesPrismaService } from '../profiles/profiles-prisma.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { compareWithStatus } from './match-engine';
import type { CompareGuardFailureResultDto, CompareResultDto } from './match-engine';
import type {
  MatchIndexDto,
  MatchIndexItemDto,
  MatchRecordDto,
} from './match.types';
import { MatchesJsonService } from './matches-json.service';

/** Deterministic matchId: minId__maxId (lexicographic). */
function toMatchId(aId: string, bId: string): string {
  const [minId, maxId] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${minId}__${maxId}`;
}

function recordToIndexItem(record: MatchRecordDto): MatchIndexItemDto {
  const score = record.finalScore ?? record.overall;
  return {
    matchId: record.matchId,
    a: record.a,
    b: record.b,
    overall: score,
    finalScore: record.finalScore ?? record.overall,
    coverage: record.coverage,
    frictionRisk: record.frictionRisk,
    coveragePercent: record.coveragePercent,
    scoreCoverageFactor: record.scoreCoverageFactor,
    confidence: record.confidence,
    infoFlags: record.infoFlags,
    coverageFactor: record.coverageFactor,
    friction: record.friction,
    compatibility: record.compatibility,
    rawScore: record.rawScore,
    whyTop: (record.alignments ?? []).map((a) => ({
      key: a.key,
      text: `Score ${a.pairScore}`,
      direction: 'both',
    })),
    tensionsTop: (record.tensions ?? []).map((t) => ({
      key: t.key,
      text: t.text,
      gap: t.gap,
      direction: 'both',
    })),
    tensionMatrix: record.tensionMatrix,
    updatedAt: record.updatedAt,
    ...(record.explainability != null && { explainability: record.explainability }),
  };
}

function finalScoreOf(record: MatchRecordDto): number {
  return record.finalScore ?? record.overall;
}

function formatPenaltyOrBonus(
  items: Array<{ reason: string; amount: number }> | undefined,
): string {
  if (!items || items.length === 0) return 'none';
  return items.map((i) => `${i.reason}:${i.amount.toFixed(1)}`).join(' | ');
}

export interface RebuildStatsDto {
  generatedAt: string;
  profileCount: number;
  matchCount: number;
  pairErrors: number;
}

@Injectable()
export class MatchDaemonService {
  private readonly context = 'MatchDaemonService';

  constructor(
    private readonly logger: SimpleLogger,
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly matchesJson: MatchesJsonService,
  ) {}

  /**
   * Runs the daemon once: load all profiles, compare every unique pair (i<j),
   * save/update each match file, then build and write index.json.
   * Returns stats. One bad profile pair does not break the run (try/catch per pair).
   */
  async runOnce(): Promise<RebuildStatsDto> {
    this.logger.log('Daemon run starting: loading profiles', this.context);

    const list = await this.profilesPrisma.list();
    const profiles: ProfileJsonPayload[] = [];
    for (const { id } of list) {
      const full = await this.profilesPrisma.getById(id);
      if (full) {
        profiles.push(full);
      } else {
        this.logger.warn(`Skipping profile (load failed): ${id}`, this.context);
      }
    }

    const profileCount = profiles.length;
    this.logger.log(`Loaded ${profileCount} profiles`, this.context);

    const ids = profiles.map((p) => p.id).sort((a, b) => a.localeCompare(b));
    const records: MatchRecordDto[] = [];
    let pairErrors = 0;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i];
        const bId = ids[j];
        const profileA = profiles.find((p) => p.id === aId);
        const profileB = profiles.find((p) => p.id === bId);
        if (!profileA || !profileB) continue;

        try {
          const result: CompareResultDto | CompareGuardFailureResultDto = compareWithStatus(
            profileA,
            profileB,
          );
          if (
            'status' in result &&
            (result.status === 'NOT_ANALYZED' || result.status === 'INSUFFICIENT_DATA')
          ) {
            this.logger.debug(
              `Skipping pair ${aId} / ${bId} (${result.status}): ${result.message}`,
              this.context,
            );
            continue;
          }
          const compareResult = result as CompareResultDto;
          const matchId = toMatchId(aId, bId);
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
          };

          if (compareResult.balance != null) {
            this.logger.debug(
              `balance_ratio=${compareResult.balance.ratio.toFixed(2)} tier=${compareResult.balance.tier} dealbreakers=${(compareResult.dealbreakers ?? []).map((d) => d.code).join(',') || 'none'}`,
              this.context,
            );
          }

          await this.matchesJson.save(record);
          records.push(record);
        } catch (err) {
          pairErrors++;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Pair failed ${aId} / ${bId}: ${msg}`,
            this.context,
          );
        }
      }
    }

    const matchCount = records.length;
    this.logger.log(
      `Daemon: ${matchCount} matches saved, ${pairErrors} pair errors`,
      this.context,
    );

    const items = records
      .map(recordToIndexItem)
      .sort((a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall));

    const generatedAt = new Date().toISOString();
    const index: MatchIndexDto = {
      generatedAt,
      profileCount,
      matchCount,
      items,
    };

    await this.matchesJson.saveIndex(index);
    this.logger.log('Daemon run complete: index.json written', this.context);
    this.logTopScoreAudit(records);

    return {
      generatedAt,
      profileCount,
      matchCount,
      pairErrors,
    };
  }

  /**
   * Temporary diagnostics: print top 10 highest-scoring matches with full score path observability.
   */
  private logTopScoreAudit(records: MatchRecordDto[]): void {
    const top = [...records]
      .sort((a, b) => finalScoreOf(b) - finalScoreOf(a))
      .slice(0, 10);

    if (top.length === 0) {
      this.logger.log('Top score audit: no records.', this.context);
      return;
    }

    this.logger.debug('Top score audit (top 10 highest matches):', this.context);
    for (const record of top) {
      const debug = record.debug;
      const line =
        `${record.a.name} vs ${record.b.name}` +
        ` | baseScore=${(debug?.baseScore ?? record.rawScore ?? finalScoreOf(record)).toFixed(2)}` +
        ` | scoreCoverageFactor=${(record.scoreCoverageFactor ?? debug?.scoreCoverageFactor ?? 1).toFixed(4)}` +
        ` | coverageFactor=${(record.coverageFactor ?? debug?.coverageFactor ?? 1).toFixed(4)}` +
        ` | confidence=${(record.confidence ?? debug?.confidence ?? 1).toFixed(4)}` +
        ` | penalties=${formatPenaltyOrBonus(debug?.penalties)}` +
        ` | finalScore=${finalScoreOf(record)}`;
      this.logger.debug(line, this.context);
    }
  }

  /**
   * Returns current index (sorted by overall desc). Null if not yet built.
   */
  async getAutoIndex(): Promise<MatchIndexDto | null> {
    const index = await this.matchesJson.getIndex();
    if (!index) return null;
    return {
      ...index,
      items: [...index.items].sort(
        (a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall),
      ),
    };
  }
}
