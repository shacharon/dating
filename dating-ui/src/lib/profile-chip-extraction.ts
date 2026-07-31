/**
 * Pure chip / boundary heuristics for the internal profiles viewer.
 * Extracted as-is from the profiles page — no behavior change.
 */

import {
  buildEnrichmentDisplayChipsV1,
  labelAutonomy,
  labelConflict,
  labelDailyRhythm,
  labelInterest,
  labelKids,
} from '@/lib/enrichment-display-v1';
import type {
  ChipDomain,
  DisplayChip,
  EnrichmentV1,
  Evaluation,
  EvaluationChip,
  ProfileTexts,
} from '@/lib/profile-types';

export function formatChipSource(source: EvaluationChip['source']): string {
  if (source === 'interest') return 'Interest';
  if (source === 'motivation') return 'Motivation';
  if (source === 'trait') return 'Trait';
  if (source === 'enrichment') return 'Enrichment';
  return 'Signal';
}

export function prefixedChipLabel(domain: ChipDomain, label: string): string {
  const prefix = domain === 'self' ? 'Self' : domain === 'partner' ? 'Partner' : 'Relationship';
  return `${prefix}: ${label}`;
}

export function dedupeByLabel(chips: EvaluationChip[]): EvaluationChip[] {
  const out: EvaluationChip[] = [];
  const seen = new Set<string>();
  for (const chip of chips) {
    const key = chip.label.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(chip);
  }
  return out;
}

export function diversifyPartnerChips(chips: EvaluationChip[]): EvaluationChip[] {
  const trait = chips.filter((c) => c.source === 'trait');
  const rest = chips.filter((c) => c.source !== 'trait');
  return [...trait.slice(0, 3), ...rest, ...trait.slice(3)].slice(0, 6);
}

export function fallbackSelfChips(aboutMe: string): EvaluationChip[] {
  const text = aboutMe.toLowerCase();
  const out: EvaluationChip[] = [];
  if (/\b(spiritual|faith|tradition)\b/.test(text)) out.push({ label: 'Spiritual', source: 'signal' });
  if (/\b(direct|clear|honest)\b/.test(text)) out.push({ label: 'Direct Communication', source: 'signal' });
  if (/\b(ambitious|driven|career|goals?)\b/.test(text)) out.push({ label: 'Ambitious', source: 'signal' });
  if (/\b(quiet|routine|slow|steady|fast|spontaneous)\b/.test(text)) out.push({ label: 'Lifestyle Pace', source: 'signal' });
  return dedupeByLabel(out).slice(0, 2);
}

export function boundaryChipsFromTexts(texts: ProfileTexts): DisplayChip[] {
  const joined = `${texts.aboutMe} ${texts.aboutPartner} ${texts.aboutRelationship}`.toLowerCase();
  const rules: Array<{ label: string; pattern: RegExp; hint: string }> = [
    { label: 'Boundary: Childfree', pattern: /\bchildfree\b/, hint: 'Explicit family boundary in profile text.' },
    { label: 'Boundary: No Drama', pattern: /\bno drama\b|\bavoids drama\b/, hint: 'Explicit preference to avoid drama.' },
    { label: 'Boundary: Not Rushed', pattern: /\bnot rushing\b|\bnot rushed\b|\bno rush\b/, hint: 'Explicit pacing boundary.' },
    { label: 'Boundary: Repair Over Blame', pattern: /\brepair over blame\b|\brepair is normal\b/, hint: 'Explicit conflict repair preference.' },
  ];
  const out: DisplayChip[] = [];
  for (const rule of rules) {
    if (!rule.pattern.test(joined)) continue;
    out.push({ label: rule.label, source: 'signal', hint: rule.hint });
  }
  return out;
}

export function toDisplayChips(domain: ChipDomain, chips: EvaluationChip[], sourceHint: string): DisplayChip[] {
  return chips.map((chip) => ({
    ...chip,
    label: prefixedChipLabel(domain, chip.label),
    hint: `${formatChipSource(chip.source)} from ${sourceHint}.`,
  }));
}

export function toLegacyDisplayChips(chips: EvaluationChip[], sourceHint: string): DisplayChip[] {
  return chips.map((chip) => ({
    ...chip,
    hint: `${formatChipSource(chip.source)} from ${sourceHint}.`,
  }));
}

export function buildChipsForUi(
  profile: { texts: ProfileTexts },
  evaluation: Evaluation,
): {
  self: DisplayChip[];
  partner: DisplayChip[];
  relationship: DisplayChip[];
  boundaries: DisplayChip[];
} {
  const rawSelf = dedupeByLabel(evaluation.chips?.self ?? []);
  const rawPartner = dedupeByLabel(evaluation.chips?.partner ?? []);
  let rawRelationship = dedupeByLabel(evaluation.chips?.relationship ?? []);

  // De-duplicate overlapping meaning: keep Family Builder over Traditional Values.
  const relLabels = new Set(rawRelationship.map((c) => c.label.toLowerCase()));
  if (relLabels.has('family builder') && relLabels.has('traditional values')) {
    rawRelationship = rawRelationship.filter((c) => c.label.toLowerCase() !== 'traditional values');
  }

  const selfFilled =
    rawSelf.length >= 1 || !profile.texts.aboutMe?.trim()
      ? rawSelf
      : dedupeByLabel([...rawSelf, ...fallbackSelfChips(profile.texts.aboutMe)]);

  const partnerDiversified = diversifyPartnerChips(rawPartner);
  return {
    self: toDisplayChips('self', selfFilled, 'about me'),
    partner: toDisplayChips('partner', partnerDiversified, 'about partner'),
    relationship: toDisplayChips('relationship', rawRelationship, 'about relationship'),
    boundaries: boundaryChipsFromTexts(profile.texts),
  };
}

export function enrichmentFieldHint(field: string): string {
  const m: Record<string, string> = {
    dailyRhythm: 'Routine and pace of day',
    autonomyTogethernessDepth: 'Togetherness vs personal space',
    kidsTimeline: 'Children intent and timing',
    conflictStyleDetail: 'How they handle disagreement',
    interestsTop3: 'Stated hobbies and interests',
  };
  return m[field] ?? 'Profile enrichment';
}

export function pushEnrichmentChip(out: DisplayChip[], label: string, hintKey: string): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  out.push({
    label: trimmed,
    source: 'enrichment',
    hint: enrichmentFieldHint(hintKey),
  });
}

/** DISPLAY_LAYER_V1 — human labels, max 5 chips (interests combined). */
export function enrichmentGlanceDisplayChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
  if (!enrichment || enrichment.version !== 'v1' || !enrichment.signals) return [];
  return buildEnrichmentDisplayChipsV1(enrichment.signals).map((c) => ({
    label: c.label,
    source: 'enrichment',
    hint: enrichmentFieldHint(c.field),
  }));
}

/** Debug: same glance row as default (human labels). */
export function enrichmentPrimaryDisplayChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
  return enrichmentGlanceDisplayChips(enrichment);
}

/** Debug: structural fields + each interest as its own chip (still human-readable). */
export function enrichmentDebugFullChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
  if (!enrichment || enrichment.version !== 'v1' || !enrichment.signals) return [];
  const s = enrichment.signals;
  const out: DisplayChip[] = [];
  const r = labelDailyRhythm(s.dailyRhythm);
  if (r) pushEnrichmentChip(out, r, 'dailyRhythm');
  const a = labelAutonomy(s.autonomyTogethernessDepth);
  if (a) pushEnrichmentChip(out, a, 'autonomyTogethernessDepth');
  const k = labelKids(s.kidsTimeline);
  if (k) pushEnrichmentChip(out, k, 'kidsTimeline');
  const c = labelConflict(s.conflictStyleDetail);
  if (c) pushEnrichmentChip(out, c, 'conflictStyleDetail');
  for (const item of s.interestsTop3 ?? []) {
    const L = labelInterest(typeof item === 'string' ? item : '');
    if (L) pushEnrichmentChip(out, L, 'interestsTop3');
  }
  return out;
}

export function flattenProfileChipsForMerge(
  evaluation: Evaluation,
  profile: { texts: ProfileTexts },
  legacyChipsUx: boolean,
): DisplayChip[] {
  if (legacyChipsUx) {
    return [
      ...toLegacyDisplayChips(evaluation.chips?.self ?? [], 'about me'),
      ...toLegacyDisplayChips(evaluation.chips?.partner ?? [], 'about partner'),
      ...toLegacyDisplayChips(evaluation.chips?.relationship ?? [], 'about relationship'),
      ...boundaryChipsFromTexts(profile.texts),
    ];
  }
  const built = buildChipsForUi(profile, evaluation);
  return [...built.self, ...built.partner, ...built.relationship, ...built.boundaries];
}
