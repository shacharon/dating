import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { LLMRouterService } from '../llm/llm-router.service';
import type {
  ContradictionDetectionResult,
  RawProfileInput,
} from './contradiction.types';
import { CONTRADICTION_FLAGS } from './contradiction.types';

const FLAGS_SET = new Set<string>(CONTRADICTION_FLAGS);

const CONTRADICTION_SCHEMA = z.object({
  flags: z.array(z.string()),
  reasoning: z.string(),
});

const SYSTEM_PROMPT = `You analyze two dating profiles (Profile A and Profile B) and detect relational contradictions between them.

Return ONLY a JSON object with:
- "flags": array of contradiction codes that apply (use only these exact strings, or empty array if none):
  - stability_nomad: one seeks stability/roots/same place, the other seeks movement/nomadism/travel or frequent change.
  - family_vs_freedom: one is strongly family-oriented or wants kids/commitment, the other prioritizes freedom/solo exploration or no kids.
  - depth_vs_surface: one seeks deep emotional connection/vulnerability, the other prefers light/fun/surface-level or avoids heavy topics.
  - commitment_vs_exploration: one wants clear commitment/monogamy/serious relationship, the other wants to explore/keep options open/casual.
- "reasoning": a short paragraph (2-4 sentences) explaining which contradictions you see and why, based on specific cues in the texts. If no flags, briefly say why the pair does not show these contradictions.

Use only the four flag values above. If multiple apply, include all. If none apply, flags must be [] and reasoning should explain the absence of these contradictions.
Output valid JSON only. No markdown.`;

@Injectable()
export class ContradictionService {
  constructor(private readonly llm: LLMRouterService) {}

  async detect(
    profileA: RawProfileInput,
    profileB: RawProfileInput,
  ): Promise<ContradictionDetectionResult> {
    const textA = [
      profileA.aboutMe?.trim(),
      profileA.aboutPartner?.trim(),
      profileA.aboutRelationship?.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');
    const textB = [
      profileB.aboutMe?.trim(),
      profileB.aboutPartner?.trim(),
      profileB.aboutRelationship?.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    const userContent = `Profile A:\n"""\n${textA || '(empty)'}\n"""\n\nProfile B:\n"""\n${textB || '(empty)'}\n"""`;

    const requestId = randomUUID();
    const { value } = await this.llm.completeJSON<{
      flags: string[];
      reasoning: string;
    }>({
      modelKey: 'fast',
      system: SYSTEM_PROMPT,
      user: userContent,
      schema: CONTRADICTION_SCHEMA,
      temperature: 0.2,
      maxTokens: 800,
      timeoutMs: 30_000,
      requestId,
      purpose: 'contradiction-detection',
    });

    const parsed = CONTRADICTION_SCHEMA.safeParse(value);
    if (!parsed.success) {
      return {
        flags: [],
        reasoning: `Detection parse failed: ${parsed.error.message}. Raw: ${JSON.stringify(value)}`,
      };
    }

    const validFlags = parsed.data.flags.filter((f) => FLAGS_SET.has(f));
    return {
      flags: validFlags as ContradictionDetectionResult['flags'],
      reasoning: parsed.data.reasoning.trim(),
    };
  }
}
