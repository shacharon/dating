import {
  LlmDerivedContextRawSchema,
  OCCUPATION_CLASS_VALUES,
  type OccupationClass,
} from './evaluate-inference-schemas';
import type { DerivedContextV1 } from './evaluate-batch.types';

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function parseOccupationClass(raw: unknown): OccupationClass | null {
  if (raw == null) return null;
  if (
    typeof raw === 'string' &&
    (OCCUPATION_CLASS_VALUES as readonly string[]).includes(raw)
  ) {
    return raw as OccupationClass;
  }
  return null;
}

/**
 * Normalize LLM derived-context output for persistence on evaluationJson.
 * Invalid fields fall back to defaults (5 for numerics, null for occupation).
 */
export function sanitizeDerivedContextForPersist(
  raw: unknown,
): DerivedContextV1 {
  const parsed = LlmDerivedContextRawSchema.safeParse(raw);
  const src = parsed.success ? parsed.data : {};

  const occupationClass = parseOccupationClass(src.occupationClass);

  const visibilityNeed =
    typeof src.visibilityNeed === 'number' && Number.isFinite(src.visibilityNeed)
      ? clampInt(src.visibilityNeed, 0, 10)
      : 5;

  const lifeStage =
    typeof src.lifeStage === 'number' && Number.isFinite(src.lifeStage)
      ? clampInt(src.lifeStage, 0, 10)
      : 5;

  const out: DerivedContextV1 = {
    version: 'v1',
    occupationClass,
    visibilityNeed,
    lifeStage,
  };

  if (typeof src.confidence === 'number' && Number.isFinite(src.confidence)) {
    out.confidence = Math.max(0, Math.min(1, src.confidence));
  }

  if (Array.isArray(src.evidence)) {
    out.evidence = src.evidence
      .filter((e): e is string => typeof e === 'string')
      .slice(0, 5);
  }

  return out;
}
