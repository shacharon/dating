import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';

function takeString(v: unknown, ...keys: string[]): string {
  const obj = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string')
      return val[0].trim();
  }
  return '';
}

/** Normalize raw LLM output; accept common key variants and provide sensible fallbacks. */
function normalizeDisplay(raw: unknown): { summary: string; insight: string } {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const summary =
    takeString(obj, 'summary', 'Summary') ||
    'Profile and relationship view based on the extracted signals.';
  const insight =
    takeString(obj, 'insight', 'Insight') ||
    'Signals reflect how self, partner, and relationship preferences align.';
  return { summary, insight };
}

const SUMMARY_SYSTEM_PROMPT = `
You receive extracted relationship data: signals (scores 1-10 or null) and evidence (quotes from the profile) for self, partner, and relationship.

Reply with ONLY a single JSON object. No markdown.

Required keys (both must be non-empty strings):
- "summary": 2–3 sentences describing the person and what they want.
  Use signals when available.
  If signals are mostly null but evidence contains meaningful statements, derive traits directly from the evidence text.
  You may infer obvious psychological tendencies from explicit statements (e.g., "one soul in two bodies" implies strong emotional fusion and low independence preference).
  Do not mention numbers or scores.
  Do not invent traits beyond what can be logically inferred.

- "insight": one short sentence connecting self, partner, and relationship orientation.

Never return generic text like "insufficient information" if meaningful evidence exists.
Always extract the strongest visible relational theme.
`;

export interface EvaluateBatchInput {
  aboutMe: string;
  aboutRelationship: string;
  aboutPartner: string;
  modelKey?: string;
  temperature?: number;
}

export interface EvaluateBatchResult {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: {
    summary: string;
    insight: string;
  };
}

@Injectable()
export class EvaluateService {
  constructor(
    private readonly extractionService: ExtractionService,
    private readonly llm: LLMRouterService,
  ) { }

  /**
   * Generate display summary and insight from the three extracted signal sets only.
   * Does not re-analyze original text. No numeric scores in output. No hallucinated traits.
   */
  private async generateSummaryFromSignals(
    self: ExtractedSignals,
    partner: ExtractedSignals,
    relationship: ExtractedSignals,
  ): Promise<{ summary: string; insight: string }> {
    const payload = JSON.stringify(
      {
        self: {
          signals: self.signals,
          evidence: self.evidence,
          confidence: self.confidence,
        },
        partner: {
          signals: partner.signals,
          evidence: partner.evidence,
          confidence: partner.confidence,
        },
        relationship: {
          signals: relationship.signals,
          evidence: relationship.evidence,
          confidence: relationship.confidence,
        },
      },
      null,
      2,
    );
    const requestId = randomUUID();
    const { value } = await this.llm.completeJSON<Record<string, unknown>>({
      modelKey: 'fast',
      system: SUMMARY_SYSTEM_PROMPT,
      user: `Extracted data:\n${payload}`,
      schema: z.any(),
      temperature: 0.3,
      maxTokens: 3000,
      timeoutMs: 20_000,
      requestId,
      purpose: 'evaluate-summary',
    });
    const normalized = normalizeDisplay(value);
    if (
      normalized.summary ===
      'Profile and relationship view based on the extracted signals.' &&
      normalized.insight ===
      'Signals reflect how self, partner, and relationship preferences align.'
    ) {
      return this.fallbackSummaryFromEvidence(self, partner, relationship);
    }
    return normalized;
  }

  /** Build a short summary and insight from evidence when the LLM returns nothing useful. */
  private fallbackSummaryFromEvidence(
    self: ExtractedSignals,
    partner: ExtractedSignals,
    relationship: ExtractedSignals,
  ): { summary: string; insight: string } {
    const quotes: string[] = [];
    for (const block of [self, partner, relationship]) {
      for (const e of block.evidence ?? []) {
        if (e.quote?.trim()) quotes.push(e.quote.trim());
      }
    }
    const summary =
      quotes.length > 0
        ? `Based on the profile: ${quotes.slice(0, 3).join('; ')}${quotes.length > 3 ? '...' : ''}`
        : 'Profile is brief; add more detail for a richer summary.';
    const insight =
      quotes.length > 0
        ? 'Summary is based on the quoted highlights from your self, partner, and relationship descriptions.'
        : 'Add more to each section to get a clearer picture.';
    return { summary, insight };
  }

  async evaluateBatch(
    input: EvaluateBatchInput,
  ): Promise<{ ok: true; result: EvaluateBatchResult }> {
    const { aboutMe, aboutRelationship, aboutPartner } = input;

    const { self, relationship, partner } =
      await this.extractionService.extractAllThree(
        aboutMe.trim(),
        aboutRelationship.trim(),
        aboutPartner.trim(),
      );

    const display = await this.generateSummaryFromSignals(
      self,
      partner,
      relationship,
    );

    return {
      ok: true,
      result: {
        self,
        partner,
        relationship,
        display: {
          summary: display.summary,
          insight: display.insight,
        },
      },
    };
  }
}
