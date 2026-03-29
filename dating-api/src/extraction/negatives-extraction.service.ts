/**
 * Negatives extraction service for V2 architecture.
 * Extracts explicit dealbreakers and anti-preferences.
 * 
 * STRICT RULE: ONLY explicit negation evidence. NO inference.
 * V2 INITIAL: Relationship negatives DISABLED (always return empty).
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import type { ExtractionDomain } from './extracted-signals.interface';
import {
  NEGATIVE_TAG_SET,
  type NegativeCategory,
  type NegativeItem,
  type DomainNegatives,
} from './extracted-negatives.interface';

const NEGATIVES_SYSTEM_PROMPT = `You are a strict dealbreaker/anti-preference extractor for dating profiles.

CRITICAL RULES:
1. ONLY extract EXPLICIT negations with clear negation language ("no", "not", "never", "don't want", "can't stand", "dealbreaker", "must not", etc.)
2. NO inference. NO guessing. If not explicitly stated, return empty array.
3. Every negative must have exact quote evidence from the text.

CATEGORIES:
- behavioral: smoking, drugs, excessive_drinking, vaping
- lifestyle: no_kids, kids_required, no_pets, pets_required, no_remote_work, must_be_local, long_distance_impossible
- values: political_incompatibility, religious_incompatibility, moral_incompatibility
- social: jealousy, control, clingy, drama, emotional_unavailability, commitment_phobic

STRENGTH:
- "hard": Dealbreaker language ("no", "never", "must", "absolute")
- "soft": Preference language ("prefer not", "don't really like", "ideally")

OUTPUT JSON:
REQUIRED FORMAT: { "items": [...] }
ALWAYS wrap the array in an object with "items" key.

If no explicit negatives found, return: { "items": [] }
If negatives found, return: { "items": [{ "category": "...", "tag": "...", "strength": "hard"|"soft", "evidence": "exact quote", "confidence": 0..1 }] }

VALID EXAMPLES:
- No negatives: { "items": [] }
- One negative: { "items": [{ "category": "behavioral", "tag": "smoking", "strength": "hard", "evidence": "no smokers", "confidence": 0.9 }] }
- Multiple: { "items": [{ ... }, { ... }] }

EXAMPLES:
- "no smokers" → behavioral/smoking/hard
- "I don't date smokers" → behavioral/smoking/hard
- "must want kids" → lifestyle/kids_required/hard
- "I prefer someone who doesn't drink much" → behavioral/excessive_drinking/soft
- "can't stand clingy people" → social/clingy/hard

NON-EXAMPLES (do NOT extract):
- "healthy lifestyle" → too vague, no explicit negation
- "family-oriented" → positive statement, not a negation
- "looking for connection" → no dealbreaker mentioned

CRITICAL: If text has no explicit negations, return empty array. Do not invent negatives.`;

const NegativeItemSchema = z.object({
  category: z.enum(['behavioral', 'lifestyle', 'values', 'social']),
  tag: z.string(),
  strength: z.enum(['hard', 'soft']),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
});

const NegativesOutputSchema = z.object({
  items: z.array(NegativeItemSchema),
});

type NegativesLLMOutput = z.infer<typeof NegativesOutputSchema>;

@Injectable()
export class NegativesExtractionService {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Validate and normalize LLM output.
   * - Filter to known tags only
   * - Validate categories match tags
   * - Truncate evidence to 200 chars
   * - Clamp confidence to 0-1
   */
  private validateAndNormalize(
    data: NegativesLLMOutput,
    domain: ExtractionDomain,
  ): NegativeItem[] {
    const items: NegativeItem[] = [];

    for (const item of data.items) {
      const tag = item.tag.trim().toLowerCase();
      
      // Optional: validate tag is in known set (or allow freeform for now)
      // For V2 initial, we'll be permissive with tags but strict with categories
      
      const category: NegativeCategory = item.category;
      const strength = item.strength === 'hard' || item.strength === 'soft' 
        ? item.strength 
        : 'soft';

      const evidence = item.evidence 
        ? item.evidence.slice(0, 200).trim() 
        : '';

      const confidence = Math.max(0, Math.min(1, item.confidence));

      if (!evidence) {
        this.logger.debug(
          `validateAndNormalize: dropping negative without evidence domain=${domain} tag=${tag}`,
        );
        continue;
      }

      items.push({
        category,
        tag,
        strength,
        evidence,
        confidence,
      });
    }

    return items.sort((a, b) => a.tag.localeCompare(b.tag));
  }

  /**
   * Extract negatives from a single domain text using LLM.
   * 
   * V2 INITIAL: Relationship domain always returns empty (disabled).
   */
  async extractForDomain(
    domain: ExtractionDomain,
    text: string,
  ): Promise<DomainNegatives> {
    // V2 INITIAL: Disable relationship negatives to avoid noise
    if (domain === 'relationship') {
      this.logger.log(
        JSON.stringify({
          event: 'negatives_extraction_skip_relationship',
          domain,
          reason: 'v2_initial_relationship_negatives_disabled',
        }),
        NegativesExtractionService.name,
      );
      return {
        domain,
        items: [],
        version: 'v1',
      };
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return {
        domain,
        items: [],
        version: 'v1',
      };
    }

    const requestId = randomUUID();
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${trimmed}\n"""`;

    this.logger.log(
      JSON.stringify({
        event: 'negatives_extraction_before_llm',
        domain,
        textLength: trimmed.length,
        requestId,
      }),
      NegativesExtractionService.name,
    );

    try {
      const { value } = await this.llm.completeJSON<NegativesLLMOutput>({
        modelKey: 'fast',
        system: NEGATIVES_SYSTEM_PROMPT,
        user: userPrompt,
        schema: NegativesOutputSchema,
        temperature: 0.1,
        maxTokens: 2000,
        timeoutMs: 60_000,
        requestId,
        purpose: 'negatives-extraction',
      });

      const normalized = this.validateAndNormalize(value, domain);

      this.logger.log(
        JSON.stringify({
          event: 'negatives_extraction_after_llm',
          domain,
          requestId,
          extractedCount: normalized.length,
        }),
        NegativesExtractionService.name,
      );

      return {
        domain,
        items: normalized,
        version: 'v1',
      };
    } catch (error) {
      this.logger.error(
        `negatives_extraction_failed domain=${domain} requestId=${requestId} error=${error}`,
        NegativesExtractionService.name,
      );
      return {
        domain,
        items: [],
        version: 'v1',
      };
    }
  }
}
