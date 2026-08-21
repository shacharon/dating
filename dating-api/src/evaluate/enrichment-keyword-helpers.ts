/**
 * Sprint 52 keyword engine: enrichment-v2 (structural split — Sprint 57 Story 02)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 *
 * This module: Shared text/match helpers (joinBlocks, negation, firstMatching*).
 */

export function joinBlocks(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): string {
  return [aboutMe, aboutPartner, aboutRelationship]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

export function isNegatedBefore(
  text: string,
  matchIndex: number,
  window = 48,
): boolean {
  const start = Math.max(0, matchIndex - window);
  const prefix = text.slice(start, matchIndex);
  return /\b(not|never|isn'?t|aren'?t|without|no\s+longer|am\s+not|wasn'?t)\s*$/i.test(
    prefix,
  );
}

export function firstMatching(
  text: string,
  rules: { value: string; patterns: RegExp[] }[],
): string | null {
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(text))) return rule.value;
  }
  return null;
}

/** Earliest match in combined text wins; ties break by rule order (ENRICHMENT_V3 for autonomy). */
export function firstMatchingEarliest(
  text: string,
  rules: { value: string; patterns: RegExp[] }[],
): string | null {
  let best: { index: number; ruleOrder: number; value: string } | null = null;
  for (let ri = 0; ri < rules.length; ri++) {
    const rule = rules[ri];
    for (const p of rule.patterns) {
      const m = p.exec(text);
      if (m && m.index >= 0) {
        const idx = m.index;
        if (
          !best ||
          idx < best.index ||
          (idx === best.index && ri < best.ruleOrder)
        ) {
          best = { index: idx, ruleOrder: ri, value: rule.value };
        }
      }
    }
  }
  return best?.value ?? null;
}
