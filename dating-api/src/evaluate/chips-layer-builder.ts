import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';

export interface ChipsOutput {
  attractionChips: string[];
  warningChips: string[];
  lifestyleChips: string[];
}

const MAX_CHIPS_PER_ARRAY = 6;

const POSITIVE_SIGNAL_KEYS = [
  'emotionalDepth',
  'directness',
  'attachmentSecurity',
  'lifestylePace',
  'intellectualCuriosity',
  'kindnessWarmth',
  'stabilityReliability',
] as const;

const LIFESTYLE_SIGNAL_KEYS = [
  'lifestylePace',
  'socialBattery',
  'healthBodyConsciousness',
  'spirituality',
] as const;

const LIFESTYLE_INTEREST_TOKENS = [
  'gym',
  'fitness',
  'hiking',
  'running',
  'yoga',
  'travel',
  'beach',
  'outdoors',
  'nightlife',
  'cooking',
  'home',
  'spiritual',
  'meditation',
  'wellness',
] as const;

function normalizeChip(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 1 || words.length > 3) return null;
  return normalized;
}

function toSignalChipKey(signalKey: string): string {
  return signalKey
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pushChip(
  target: string[],
  chip: string,
  globalSeen: Set<string>,
): void {
  if (target.length >= MAX_CHIPS_PER_ARRAY) return;
  if (globalSeen.has(chip)) return;
  target.push(chip);
  globalSeen.add(chip);
}

function hasExplicitEvidenceForSignal(domain: ExtractedSignals, key: string): boolean {
  return (domain.evidence ?? []).some((item) => item.signal === key);
}

function collectInterests(extraction: ExtractionV2Result): string[] {
  const all = [
    ...(extraction.base.self.rawInterests ?? []),
    ...(extraction.base.partner.rawInterests ?? []),
    ...(extraction.base.relationship.rawInterests ?? []),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of all) {
    const chip = normalizeChip(raw);
    if (!chip || seen.has(chip)) continue;
    seen.add(chip);
    out.push(chip);
  }
  return out;
}

function isLifestyleInterest(chip: string): boolean {
  return LIFESTYLE_INTEREST_TOKENS.some((token) => chip.includes(token));
}

export function buildChips(extraction: ExtractionV2Result): ChipsOutput {
  const attractionChips: string[] = [];
  const warningChips: string[] = [];
  const lifestyleChips: string[] = [];
  const globalSeen = new Set<string>();

  const domains = [
    extraction.base.self,
    extraction.base.partner,
    extraction.base.relationship,
  ];

  const interests = collectInterests(extraction);
  for (const interest of interests) {
    pushChip(attractionChips, interest, globalSeen);
  }

  for (const key of POSITIVE_SIGNAL_KEYS) {
    for (const domain of domains) {
      const value = domain.signals[key];
      if (value != null && value >= 7) {
        pushChip(attractionChips, toSignalChipKey(key), globalSeen);
      }
    }
  }

  for (const domain of domains) {
    for (const raw of domain.dealbreakers ?? []) {
      const chip = normalizeChip(raw);
      if (chip) pushChip(warningChips, chip, globalSeen);
    }
    for (const raw of domain.softNo ?? []) {
      const chip = normalizeChip(raw);
      if (chip) pushChip(warningChips, chip, globalSeen);
    }
  }

  for (const domain of domains) {
    for (const [key, value] of Object.entries(domain.signals)) {
      if (value == null || value > 3) continue;
      if (!hasExplicitEvidenceForSignal(domain, key)) continue;
      pushChip(warningChips, toSignalChipKey(key), globalSeen);
    }
  }

  for (const interest of interests) {
    if (isLifestyleInterest(interest)) {
      pushChip(lifestyleChips, interest, globalSeen);
    }
  }

  for (const key of LIFESTYLE_SIGNAL_KEYS) {
    for (const domain of domains) {
      const value = domain.signals[key];
      if (value != null && value >= 7) {
        pushChip(lifestyleChips, toSignalChipKey(key), globalSeen);
      }
    }
  }

  return { attractionChips, warningChips, lifestyleChips };
}
