import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import { EvaluateService } from '../evaluate/evaluate.service';
import type { ProfileJsonPayload } from './profiles.types';
import { ProfilesPrismaService } from './profiles-prisma.service';
import { AnalysisCacheService } from './analysis-cache.service';
import { AnalyzeFailuresPersistenceService } from './analyze-failures-persistence.service';
import type { LLMUsageStats } from '../extraction/extracted-signals.interface';
import { ExtractionV2Service } from '../extraction/extraction-v2.service';
import { ExtractionV2PersistenceService } from '../extraction/extraction-v2-persistence.service';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import { buildChips, type ChipsOutput } from '../evaluate/chips-layer-builder';

export interface AnalyzedProfileDto {
  id: string;
  name: string;
  texts: ProfileJsonPayload['texts'];
  signals: Record<string, number | null>;
  confidence: number;
  updatedAt: string;
}

export interface AnalyzeOneResponseDto {
  ok: true;
  profile: AnalyzedProfileDto;
  skippedCached?: boolean;
  skippedUpToDate?: boolean;
}

const EMPTY_CHIPS: ChipsOutput = {
  attractionChips: [],
  warningChips: [],
  lifestyleChips: [],
};

/** Query params for POST /api/profiles/analyze-all */
export interface AnalyzeAllQueryDto {
  limit: number; // default 25, max 200
  offset: number; // default 0
  onlyUnanalyzed: boolean; // default true
  delayMs: number; // default 150, max 2000
  continueOnError: boolean; // default true
  maxSeconds?: number; // optional: stop gracefully after N seconds
}

export interface AnalyzeAllFailureItem {
  profileId: string;
  reason: string;
}

export interface AnalyzeAllResponseDto {
  ok: true;
  profilesTotal: number;
  poolTotal: number;
  processed: number;
  analyzed: number;
  skipped: number;
  skippedCached: number;
  skippedUpToDate: number;
  failed: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
  done: boolean;
  failures: AnalyzeAllFailureItem[];
}

/** Body for POST /api/profiles/analyze-batch */
export interface AnalyzeBatchBodyDto {
  limit?: number;
  offset?: number;
  onlyUnanalyzed?: boolean;
  continueOnError?: boolean;
  delayMs?: number;
  force?: boolean;
  recomputePolicyVersion?: string;
}

export interface AnalyzeBatchResponseDto {
  ok: true;
  total: number;
  processed: number;
  skipped: number;
  skippedCached: number;
  skippedUpToDate: number;
  failed: number;
  failures: AnalyzeAllFailureItem[];
  nextOffset: number;
  done: boolean;
}

export interface AnalyzeAllSummaryStats {
  profilesAnalyzed: number;
  avgSignalsPerProfile: number;
  avgCoverage: number;
  lowCoverageCount: number;
  avgTokens: number;
  totalTokens: number;
  totalCostUSD: number;
  avgDurationMs: number;
}

export interface ProfilesStatsResponseDto {
  ok: true;
  total: number;
  analyzed: number;
  unanalyzed: number;
}

interface AnalyzeProfileResult {
  dto: AnalyzedProfileDto;
  signalCount: number;
  signalCoverage: number;
  confidence: number;
  usage: LLMUsageStats | undefined;
}

export interface AnalyzeProfileResultWithMeta extends AnalyzeProfileResult {
  skippedCached?: boolean;
  skippedUpToDate?: boolean;
}

const STUB_SUMMARY = 'Not yet analyzed.';

/** Version strings included in cache key; bump to invalidate after prompt/policy fixes. */
const PROMPT_VERSION = 'v1';
const POLICY_VERSION = 'product-score-v1';

const ANALYSIS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

/**
 * True if profile has valid analysis AND matches current policyVersion/promptVersion.
 * Skip only when this is true (no LLM). Use for onlyUnanalyzed pool and per-profile skip.
 */
function isAnalyzed(profile: ProfileJsonPayload): boolean {
  if (!profile.evaluatedAt) return false;
  const signals = profile.signals ?? profile.evaluation?.self?.signals;
  if (!signals || typeof signals !== 'object') return false;
  if (!Object.values(signals).some((v) => v != null)) return false;
  if ((profile.promptVersion ?? '') !== PROMPT_VERSION) return false;
  if ((profile.policyVersion ?? '') !== POLICY_VERSION) return false;
  return true;
}

/**
 * @deprecated LEGACY PATH — FROZEN after new-model validation passed.
 *
 * This controller writes exclusively to legacy tables:
 *   MatchmakingProfile · ProfileEvaluation · ProfileEvaluationRaw
 *   ProfileSignalSnapshot · ProfileExtractionV2
 *
 * Active product path: POST /api/v1/me/profile/submit
 *   → MeProfileAnalysisService → UserProfile + UserProfileEvaluation only.
 *
 * Checkpoint: MATCH_ENGINE_NEW_MODEL_ACTIVE__LEGACY_WRITES_STILL_DUPLICATED__CUTOVER_NEXT
 *
 * DO NOT add new writes or new callers here.
 * Delete this controller only after legacy table data has been migrated or
 * after the decision to drop legacy tables is made.
 */
@Controller('api/profiles')
export class ProfilesAnalyzeController {
  constructor(
    private readonly evaluateService: EvaluateService,
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly analysisCache: AnalysisCacheService,
    private readonly analyzeFailures: AnalyzeFailuresPersistenceService,
    private readonly logger: SimpleLogger,
    private readonly extractionV2Service: ExtractionV2Service,
    private readonly extractionV2Persistence: ExtractionV2PersistenceService,
  ) {}

  /**
   * GET /api/profiles/stats — coverage verification: total, analyzed (up-to-date), unanalyzed.
   */
  @Get('stats')
  async getStats(): Promise<ProfilesStatsResponseDto> {
    const items = await this.profilesPrisma.list();
    let total = 0;
    let unanalyzed = 0;
    for (const item of items) {
      const profile = await this.profilesPrisma.getById(item.id);
      if (profile) {
        total++;
        if (!isAnalyzed(profile)) unanalyzed++;
      }
    }
    const analyzed = total - unanalyzed;
    return { ok: true, total, analyzed, unanalyzed };
  }

  /**
   * @deprecated LEGACY PATH — writes to MatchmakingProfile + related tables.
   * Called only from frozen legacy endpoints (POST /api/profiles/...analyze*).
   * New product analysis runs via MeProfileAnalysisService.runForUser.
   */
  private async analyzeAndPersist(
    profile: ProfileJsonPayload,
    opts?: { force?: boolean; recomputePolicyVersion?: string },
  ): Promise<AnalyzeProfileResultWithMeta> {
    this.logger.warn(
      `[LEGACY] analyzeAndPersist called for profileId=${profile.id} — legacy write path is frozen; use MeProfileAnalysisService for new users`,
      'ProfilesAnalyze',
    );
    const force = opts?.force === true;
    const recomputePolicyVersion = opts?.recomputePolicyVersion?.trim();
    const textConcat =
      (profile.texts.aboutMe ?? '') +
      '|' +
      (profile.texts.aboutPartner ?? '') +
      '|' +
      (profile.texts.aboutRelationship ?? '');
    const textHash = hashText(textConcat);
    const policyVersion = recomputePolicyVersion ?? POLICY_VERSION;
    const cacheKey = this.analysisCache.buildKey(
      profile.id,
      textHash,
      PROMPT_VERSION,
      policyVersion,
    );

    if (!force && !recomputePolicyVersion) {
      if (isAnalyzed(profile)) {
        const ev = profile.evaluation;
        const confidence =
          (ev.self.confidence +
            ev.partner.confidence +
            ev.relationship.confidence) /
          3;
        return {
          dto: {
            id: profile.id,
            name: profile.name,
            texts: profile.texts,
            signals: profile.signals ?? ev.self.signals,
            confidence,
            updatedAt: profile.evaluatedAt ?? profile.savedAt,
          },
          signalCount:
            Object.values(ev.self.signals ?? {}).filter((v) => v != null)
              .length +
            Object.values(ev.partner.signals ?? {}).filter((v) => v != null)
              .length +
            Object.values(ev.relationship.signals ?? {}).filter(
              (v) => v != null,
            ).length,
          signalCoverage: ev.productScores?.coverageScore ?? 0,
          confidence,
          usage: ev._usage,
          skippedUpToDate: true,
        };
      }
      const cached = this.analysisCache.get(cacheKey);
      if (cached) {
        this.logger.log(
          `[Analyze] cache hit id=${profile.id}`,
          'ProfilesAnalyze',
        );
        const updatedAt = new Date().toISOString();
        await this.profilesPrisma.save(profile.id, {
          id: profile.id,
          name: profile.name,
          texts: profile.texts,
          evaluation: cached,
          evaluationStatus: 'DONE',
          evaluatedAt: updatedAt,
          promptVersion: PROMPT_VERSION,
          policyVersion: cached.productScores?.policyVersion ?? POLICY_VERSION,
          textHash,
          signals: cached.self.signals,
        });
        const confidence =
          (cached.self.confidence +
            cached.partner.confidence +
            cached.relationship.confidence) /
          3;
        return {
          dto: {
            id: profile.id,
            name: profile.name,
            texts: profile.texts,
            signals: cached.self.signals,
            confidence: cached.self.confidence,
            updatedAt,
          },
          signalCount:
            Object.values(cached.self.signals).filter((v) => v != null).length +
            Object.values(cached.partner.signals).filter((v) => v != null)
              .length +
            Object.values(cached.relationship.signals).filter((v) => v != null)
              .length,
          signalCoverage: cached.productScores.coverageScore,
          confidence,
          usage: cached._usage,
          skippedCached: true,
        };
      }
    }

    this.logger.log(`[Analyze] start id=${profile.id}`, 'ProfilesAnalyze');

    const { result: evaluation }: { result: EvaluateBatchResult } =
      await this.evaluateService.evaluateBatch({
        aboutMe: profile.texts.aboutMe,
        aboutRelationship: profile.texts.aboutRelationship,
        aboutPartner: profile.texts.aboutPartner,
        profileId: profile.id,
      });

    const signalCoverage = evaluation.productScores.coverageScore;
    const confidence =
      (evaluation.self.confidence +
        evaluation.partner.confidence +
        evaluation.relationship.confidence) /
      3;

    const signalCount =
      Object.values(evaluation.self.signals).filter((v) => v != null).length +
      Object.values(evaluation.partner.signals).filter((v) => v != null)
        .length +
      Object.values(evaluation.relationship.signals).filter((v) => v != null)
        .length;
    const cost = evaluation._usage?.estimatedCostUSD ?? 0;

    this.logger.log(
      `[Analyze] ok id=${profile.id} signalsNonNull=${signalCount} coverage=${signalCoverage} cost=${cost}`,
      'ProfilesAnalyze',
    );

    const updatedAt = new Date().toISOString();
    const policyVersionSaved =
      evaluation.productScores?.policyVersion ?? POLICY_VERSION;

    await this.profilesPrisma.save(profile.id, {
      id: profile.id,
      name: profile.name,
      texts: profile.texts,
      evaluation,
      evaluationStatus: 'DONE',
      evaluatedAt: updatedAt,
      promptVersion: PROMPT_VERSION,
      policyVersion: policyVersionSaved,
      textHash,
      signals: evaluation.self.signals,
    });
    // LEGACY_RETIREMENT_PLAN.md Slice 1: ProfileExtractionV2 writes removed (2026-04-24)
    // await this.extractionV2Persistence.saveExtendedSignalsFromEvaluation({
    //   profileId: profile.id,
    //   aboutMe: profile.texts.aboutMe,
    //   aboutPartner: profile.texts.aboutPartner,
    //   aboutRelationship: profile.texts.aboutRelationship,
    //   evaluation,
    // });

    this.analysisCache.set(cacheKey, evaluation, ANALYSIS_CACHE_TTL_MS);

    return {
      dto: {
        id: profile.id,
        name: profile.name,
        texts: profile.texts,
        signals: evaluation.self.signals,
        confidence: evaluation.self.confidence,
        updatedAt,
      },
      signalCount,
      signalCoverage,
      confidence,
      usage: evaluation._usage,
    };
  }

  @Post('analyze-all')
  async analyzeAll(
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
    @Query('onlyUnanalyzed') onlyUnanalyzedParam?: string,
    @Query('delayMs') delayMsParam?: string,
    @Query('continueOnError') continueOnErrorParam?: string,
    @Query('force') forceParam?: string,
    @Query('maxSeconds') maxSecondsParam?: string,
    @Query('recomputePolicyVersion') recomputePolicyVersionParam?: string,
  ): Promise<AnalyzeAllResponseDto> {
    const limit = Math.max(
      1,
      Math.min(200, parseInt(String(limitParam ?? '25'), 10) || 25),
    );
    const offset = Math.max(0, parseInt(String(offsetParam ?? '0'), 10) || 0);
    const onlyUnanalyzed =
      onlyUnanalyzedParam !== 'false' && onlyUnanalyzedParam !== '0';
    const delayMsBetween = Math.max(
      0,
      Math.min(2000, parseInt(String(delayMsParam ?? '150'), 10) || 150),
    );
    const continueOnError =
      continueOnErrorParam !== 'false' && continueOnErrorParam !== '0';
    const force = forceParam === '1' || forceParam === 'true';
    const maxSeconds =
      maxSecondsParam != null && maxSecondsParam !== ''
        ? Math.max(1, parseInt(String(maxSecondsParam), 10) || 0)
        : undefined;
    const recomputePolicyVersion =
      recomputePolicyVersionParam?.trim() || undefined;

    const items = await this.profilesPrisma.list();
    const profilesTotal = items.length;
    const profiles: ProfileJsonPayload[] = [];
    for (const item of items) {
      const profile = await this.profilesPrisma.getById(item.id);
      if (profile) profiles.push(profile);
    }
    const pool = onlyUnanalyzed
      ? profiles.filter((p) => !isAnalyzed(p))
      : profiles;
    const poolTotal = pool.length;
    const batch = pool.slice(offset, offset + limit);

    this.logger.log(
      JSON.stringify({
        poolTotal,
        profilesTotal,
        msg: 'analyze_all_pool_size',
      }),
      'ProfilesAnalyze',
    );

    this.logger.log(
      `analyze_all_batch_start offset=${offset} limit=${limit} poolTotal=${poolTotal} batchSize=${batch.length} maxSeconds=${maxSeconds ?? 'none'}`,
      'ProfilesAnalyze',
    );

    const failures: AnalyzeAllFailureItem[] = [];
    let analyzed = 0;
    const skipped = 0;
    let skippedCached = 0;
    let skippedUpToDate = 0;
    const startTimeMs = Date.now();

    for (let i = 0; i < batch.length; i++) {
      if (
        maxSeconds != null &&
        (Date.now() - startTimeMs) / 1000 >= maxSeconds
      ) {
        this.logger.log(
          `analyze_all_max_seconds_reached elapsed=${Math.round((Date.now() - startTimeMs) / 1000)}s nextOffset=${offset + i}`,
          'ProfilesAnalyze',
        );
        return {
          ok: true,
          profilesTotal,
          poolTotal,
          processed: i,
          analyzed,
          skipped,
          skippedCached,
          skippedUpToDate,
          failed: failures.length,
          offset,
          limit,
          nextOffset: offset + i,
          done: false,
          failures,
        };
      }

      const profile = batch[i];
      if (i > 0) await delayMs(delayMsBetween);

      if (!force && isAnalyzed(profile)) {
        skippedUpToDate++;
        this.logger.log(
          JSON.stringify({
            profileId: profile.id,
            action: 'SKIP',
            durationMs: 0,
            model: '-',
            tokens: 0,
          }),
          'ProfilesAnalyze',
        );
        continue;
      }

      try {
        const meta = await this.analyzeAndPersist(profile, {
          force,
          recomputePolicyVersion,
        });
        if (meta.skippedCached) skippedCached++;
        else if (meta.skippedUpToDate) skippedUpToDate++;
        else analyzed++;
        const u = meta.usage;
        this.logger.log(
          JSON.stringify({
            profileId: profile.id,
            action: 'ANALYZE',
            durationMs: u?.durationMs ?? 0,
            model: (u as LLMUsageStats & { model?: string })?.model ?? '-',
            tokens: u?.totalTokens ?? 0,
          }),
          'ProfilesAnalyze',
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ profileId: profile.id, reason });
        await this.analyzeFailures.append(profile.id, reason);
        this.logger.log(
          JSON.stringify({
            profileId: profile.id,
            action: 'FAIL',
            durationMs: 0,
            model: '-',
            tokens: 0,
            reason,
          }),
          'ProfilesAnalyze',
        );
        if (!continueOnError) {
          return {
            ok: true,
            profilesTotal,
            poolTotal,
            processed: i + 1,
            analyzed,
            skipped,
            skippedCached,
            skippedUpToDate,
            failed: failures.length,
            offset,
            limit,
            nextOffset: offset + i + 1,
            done: offset + i + 1 >= poolTotal,
            failures,
          };
        }
      }
    }

    const processed = batch.length;
    const failed = failures.length;
    const nextOffset = offset + processed;
    const done = nextOffset >= poolTotal;

    this.logger.log(
      `analyze_all_batch_done offset=${offset} limit=${limit} processed=${processed} analyzed=${analyzed} skippedCached=${skippedCached} skippedUpToDate=${skippedUpToDate} failed=${failed} nextOffset=${done ? 'null' : nextOffset}`,
      'ProfilesAnalyze',
    );

    return {
      ok: true,
      profilesTotal,
      poolTotal,
      processed,
      analyzed,
      skipped,
      skippedCached,
      skippedUpToDate,
      failed,
      offset,
      limit,
      nextOffset: done ? null : nextOffset,
      done,
      failures,
    };
  }

  /**
   * POST /api/profiles/analyze-batch — batch+resume pipeline with stable order by id.
   * Body: { limit?, offset?, onlyUnanalyzed?, continueOnError?, delayMs? }
   */
  @Post('analyze-batch')
  async analyzeBatch(
    @Body() body: AnalyzeBatchBodyDto,
  ): Promise<AnalyzeBatchResponseDto> {
    const limit = Math.max(1, Math.min(200, Number(body?.limit) || 25));
    const offset = Math.max(0, Number(body?.offset) || 0);
    const onlyUnanalyzed = body?.onlyUnanalyzed !== false;
    const continueOnError = body?.continueOnError !== false;
    const delayMsBetween = Math.max(
      0,
      Math.min(2000, Number(body?.delayMs) ?? 150),
    );
    const force = body?.force === true;
    const recomputePolicyVersion =
      typeof body?.recomputePolicyVersion === 'string'
        ? body.recomputePolicyVersion.trim() || undefined
        : undefined;

    const items = await this.profilesPrisma.list();
    const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const profiles: ProfileJsonPayload[] = [];
    for (const item of sortedItems) {
      const profile = await this.profilesPrisma.getById(item.id);
      if (profile) profiles.push(profile);
    }
    const pool = onlyUnanalyzed
      ? profiles.filter((p) => !isAnalyzed(p))
      : profiles;
    const total = pool.length;
    const batch = pool.slice(offset, offset + limit);

    this.logger.log(
      `analyze_batch_start offset=${offset} limit=${limit} total=${total} batchSize=${batch.length}`,
      'ProfilesAnalyze',
    );

    let processed = 0;
    const skipped = 0;
    let skippedCached = 0;
    let skippedUpToDate = 0;
    const failures: AnalyzeAllFailureItem[] = [];

    for (let i = 0; i < batch.length; i++) {
      if (i > 0 && delayMsBetween > 0) await delayMs(delayMsBetween);

      const profile = batch[i];
      if (isAnalyzed(profile)) {
        skippedUpToDate++;
        continue;
      }

      try {
        const meta = await this.analyzeAndPersist(profile, {
          force,
          recomputePolicyVersion,
        });
        if (meta.skippedCached) skippedCached++;
        else if (meta.skippedUpToDate) skippedUpToDate++;
        else processed++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ profileId: profile.id, reason });
        if (!continueOnError) {
          this.logger.log(
            `analyze_batch_stop_on_error profileId=${profile.id} reason=${reason}`,
            'ProfilesAnalyze',
          );
          const nextOffset = offset + i + 1;
          return {
            ok: true,
            total,
            processed,
            skipped,
            skippedCached,
            skippedUpToDate,
            failed: failures.length,
            failures,
            nextOffset,
            done: nextOffset >= total,
          };
        }
      }
    }

    const failed = failures.length;
    const nextOffset = offset + batch.length;
    const done = nextOffset >= total;

    this.logger.log(
      `analyze_batch_done offset=${offset} limit=${limit} processed=${processed} skipped=${skipped} skippedCached=${skippedCached} skippedUpToDate=${skippedUpToDate} failed=${failed} nextOffset=${nextOffset}`,
      'ProfilesAnalyze',
    );

    return {
      ok: true,
      total,
      processed,
      skipped,
      skippedCached,
      skippedUpToDate,
      failed,
      failures,
      nextOffset,
      done,
    };
  }

  @Post(':id/analyze-v2')
  async analyzeOneV2(
    @Param('id') id: string,
    @Query('force') forceParam?: string,
  ): Promise<{
    ok: true;
    extraction: ExtractionV2Result | null;
    profileId: string;
    chips: ChipsOutput;
  }> {
    const profile = await this.profilesPrisma.getById(id);
    if (!profile) {
      throw new NotFoundException(`Profile not found: ${id}`);
    }

    const force = forceParam === '1' || forceParam === 'true';

    // Check if already extracted (unless force=true)
    if (!force) {
      const existing = await this.extractionV2Persistence.getByProfileId(id);
      if (existing) {
        this.logger.log(
          `[AnalyzeV2] skipped (exists) id=${id}`,
          'ProfilesAnalyze',
        );
        // Derived UI-facing layer from extraction only (non-persistent).
        return {
          ok: true,
          extraction: existing,
          profileId: id,
          chips: buildChips(existing),
        };
      }
    }

    this.logger.log(`[AnalyzeV2] start id=${id}`, 'ProfilesAnalyze');

    // Run V2 extraction (9 calls)
    const extraction = await this.extractionV2Service.extractAll(
      profile.texts.aboutMe,
      profile.texts.aboutPartner,
      profile.texts.aboutRelationship,
      id,
    );

    // LEGACY_RETIREMENT_PLAN.md Slice 1: ProfileExtractionV2 writes removed (2026-04-24)
    // await this.extractionV2Persistence.save({
    //   profileId: id,
    //   aboutMe: profile.texts.aboutMe,
    //   aboutPartner: profile.texts.aboutPartner,
    //   aboutRelationship: profile.texts.aboutRelationship,
    //   extraction,
    // });

    this.logger.log(
      `[AnalyzeV2] done id=${id} cost=${extraction._usage.estimatedCostUSD.toFixed(5)}`,
      'ProfilesAnalyze',
    );

    // Derived UI-facing layer from extraction only (non-persistent).
    return {
      ok: true,
      extraction,
      profileId: id,
      chips: extraction ? buildChips(extraction) : EMPTY_CHIPS,
    };
  }

  @Post(':id/analyze')
  async analyzeOne(
    @Param('id') id: string,
    @Query('force') forceParam?: string,
    @Query('recomputePolicyVersion') recomputePolicyVersionParam?: string,
  ): Promise<AnalyzeOneResponseDto> {
    const profile = await this.profilesPrisma.getById(id);
    if (!profile) {
      throw new NotFoundException(`Profile not found: ${id}`);
    }

    const force = forceParam === '1' || forceParam === 'true';
    const recomputePolicyVersion =
      recomputePolicyVersionParam?.trim() || undefined;
    const { dto, skippedCached, skippedUpToDate } =
      await this.analyzeAndPersist(profile, {
        force,
        recomputePolicyVersion,
      });
    const response: AnalyzeOneResponseDto = { ok: true, profile: dto };
    if (skippedCached) response.skippedCached = true;
    if (skippedUpToDate) response.skippedUpToDate = true;
    return response;
  }
}
