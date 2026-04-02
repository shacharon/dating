/**
 * LLM-first interests extraction service.
 * Extracts raw interests from profile text using structured LLM output only.
 * No regex fallback, no deterministic inference, no hybrid mode.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import {
  INTEREST_CANONICAL_TAGS,
  type InterestStrength,
  type InterestItem,
  type RawInterests,
  type ProfileTextsForInterests,
  type ExtractionDomain,
} from './extracted-interests.interface';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
} from '../evaluate/evaluate-llm-pipeline';

const CANONICAL_TAGS_LIST = INTEREST_CANONICAL_TAGS.join(', ');

const INTERESTS_SYSTEM_PROMPT = `You are a professional interests/hobbies extractor for dating profiles.
Extract explicit interests and hobbies from the provided text.

CANONICAL TAGS (use exactly these, no others):
${CANONICAL_TAGS_LIST}

RULES:
- Only extract interests that are explicitly mentioned or strongly implied in the text
- Use "explicit" strength for direct mentions (e.g., "I love hiking", "אוהב לרקוד")
- Use "strong" strength for clear habitual activities (e.g., "at the gym 3x a week", "חדר כושר")
- Ignore negated mentions (e.g., "I don't like dancing", "לא אוהב כדורגל")
- Ignore weak qualifiers (e.g., "maybe", "might try", "someday", "אולי")
- Include a short evidence quote (max 60 chars) from the text for each interest
- Return empty array if no clear interests are found
- DO NOT invent or guess interests without textual support

CANONICAL TAG MEANINGS:
- art: museums, galleries, painting, drawing, sculpture
- beach: beach life, surfing, ocean activities
- books: reading, literature, book clubs
- cooking: cooking, baking, culinary activities
- dancing: dancing, salsa, tango, ballet, hip-hop
- football: football, soccer
- gaming: video games, gaming, esports
- gym: gym, working out, fitness training
- hiking: hiking, trekking, nature walks, trails
- home_life: homebody, staying in, cozy nights at home
- movies: movies, films, cinema
- music: music, concerts, playing instruments, DJ
- nightlife: nightlife, clubs, bars, going out
- spirituality: spirituality, meditation, mindfulness, retreats
- travel: traveling, backpacking, exploring new places
- yoga: yoga practice, yoga classes

Return JSON only. No explanations.
Output: { "items": [{ "tag": "<canonical_tag>", "strength": "explicit"|"strong", "evidence": "<short quote>", "ruleId": "llm_v1" }] }
`;

const InterestItemSchema = z.object({
  tag: z.string(),
  strength: z.enum(['explicit', 'strong']),
  evidence: z.string().optional(),
  ruleId: z.string().optional(),
});

const InterestsOutputSchema = z.object({
  items: z.array(InterestItemSchema),
});

type InterestsLLMOutput = z.infer<typeof InterestsOutputSchema>;

@Injectable()
export class InterestsExtractionService {
  constructor(
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Validate and normalize LLM output (format only; keep non-canonical tags).
   */
  private validateAndNormalize(
    data: InterestsLLMOutput,
    _domain: ExtractionDomain,
  ): InterestItem[] {
    const items: InterestItem[] = [];

    for (const item of data.items) {
      const tag = item.tag.trim().toLowerCase();
      if (!tag) continue;

      const strength = item.strength === 'explicit' || item.strength === 'strong' 
        ? item.strength 
        : 'explicit';

      const evidence = item.evidence 
        ? item.evidence.slice(0, 60).trim() 
        : undefined;

      const ruleId = item.ruleId || 'llm_v1';

      items.push({
        tag,
        strength,
        evidence,
        ruleId,
      });
    }

    return items.sort((a, b) => a.tag.localeCompare(b.tag));
  }

  /**
   * Extract interests from a single domain text using LLM.
   */
  async extractForDomain(
    domain: ExtractionDomain,
    text: string,
  ): Promise<InterestItem[]> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const requestId = randomUUID();
    const userPrompt = `Domain: ${domain}\nText:\n"""\n${trimmed}\n"""`;

    this.logger.log(
      JSON.stringify({
        event: 'interests_extraction_before_llm',
        domain,
        textLength: trimmed.length,
        requestId,
      }),
      InterestsExtractionService.name,
    );

    try {
      const { value, rawText } = await this.llm.completeJSON<InterestsLLMOutput>({
        modelKey: 'fast',
        system: INTERESTS_SYSTEM_PROMPT,
        user: userPrompt,
        schema: InterestsOutputSchema,
        temperature: 0.1,
        maxTokens: 2000,
        timeoutMs: 60_000,
        requestId,
        purpose: 'interests-extraction',
      });

      this.logger.log(
        JSON.stringify(
          buildEvaluateRawLlmLogPayload(
            { purpose: 'interests-extraction', domain, requestId },
            value,
            rawText,
          ),
        ),
        InterestsExtractionService.name,
      );

      const normalized = this.validateAndNormalize(value, domain);
      const auxTrace = buildEvaluateLlmTrace({
        purpose: 'interests-extraction',
        requestId,
        parsedJson: value,
        rawText,
        afterStages: [{ name: 'after_validateAndNormalize', value: { items: normalized } }],
      });
      this.logger.log(
        JSON.stringify({
          event: 'evaluate_llm_pipeline_stage_diffs',
          ...auxTrace,
        }),
        InterestsExtractionService.name,
      );

      this.logger.log(
        JSON.stringify({
          event: 'interests_extraction_after_llm',
          domain,
          requestId,
          extractedCount: normalized.length,
        }),
        InterestsExtractionService.name,
      );

      return normalized;
    } catch (error) {
      this.logger.error(
        `interests_extraction_failed domain=${domain} requestId=${requestId} error=${error}`,
        InterestsExtractionService.name,
      );
      return [];
    }
  }

  /**
   * Extract interests from all three profile text blocks.
   * Returns RawInterests with separate arrays per domain.
   */
  async extractFromProfile(
    texts: ProfileTextsForInterests,
  ): Promise<RawInterests> {
    const [self, partner, relationship] = await Promise.all([
      this.extractForDomain('self', texts.aboutMe),
      this.extractForDomain('partner', texts.aboutPartner),
      this.extractForDomain('relationship', texts.aboutRelationship),
    ]);

    return {
      version: 'v1',
      self,
      partner,
      relationship,
    };
  }
}
