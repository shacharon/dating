/**
 * Extraction normalization: raw LLM output → structured ExtractedSignals, alias key mapping.
 *
 * Technical coercion only: parses JSON, maps known aliases, provides fallbacks.
 * No semantic inference or policy-based modifications.
 */

import { INTEREST_CANONICAL_TAG_SET } from './extracted-interests.interface';
import {
  EXTRACTION_SIGNAL_KEYS,
  EXTRACTION_SIGNAL_KEYS_SET,
  type ExtractedSignals,
  type ExtractionDomain,
} from './extracted-signals.interface';

/** Max interest tags kept after allowlist cleanup (aligns with extraction-v2 schema). */
export const MAX_RAW_INTERESTS = 10;

/**
 * Technical normalize of LLM interest strings → canonical allowlist ids.
 * Case/underscore cleanup only — no synonym invent / no profile-text keyword matching.
 */
export function normalizeRawInterestTags(
  raw: readonly unknown[] | undefined,
): string[] {
  if (!raw || raw.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tag || !INTEREST_CANONICAL_TAG_SET.has(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_RAW_INTERESTS) break;
  }
  return out;
}

/** Pull interests/rawInterests string array from raw LLM JSON (pre-allowlist). */
export function parseRawInterestArray(obj: Record<string, unknown>): string[] {
  const preferred = obj.rawInterests;
  const fallback = obj.interests;
  const source = Array.isArray(preferred)
    ? preferred
    : Array.isArray(fallback)
      ? fallback
      : [];
  const out: string[] = [];
  for (const item of source) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (t) out.push(t);
  }
  return out;
}

/** Alias -> official key. emotionalIntimacyPriority not mapped (lossy; skip for now). */
export const KEY_ALIASES: Record<string, string> = {
  spiritualOrientation: 'spirituality',
  appearancePriority: 'physicalPriority',
  materialAmbition: 'financialMindset',
  partnerObjectificationRisk: 'physicalPriority',
  instrumentalRelationshipView: 'statusOrientation',
  /** Expansion-06 — legacy shadow key renamed to adventureNovelty. */
  noveltyVsRoutine: 'adventureNovelty',
};

export interface NormalizeKeysTelemetry {
  aliasesSeen: string[];
  aliasesMapped: string[];
  aliasesDroppedBecauseOfficialExists: string[];
  unknownSignalKeysDropped: string[];
}

/** Normalize raw LLM JSON so we can run validateAndClean even when schema parse fails. */
export function normalizeRawExtraction(
  raw: unknown,
  requestedDomain: ExtractionDomain,
): ExtractedSignals {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let domain = obj.domain;
  if (Array.isArray(domain)) domain = domain[0];
  const domainStr =
    typeof domain === 'string' && /^(self|partner|relationship)$/i.test(domain)
      ? (domain.toLowerCase() as ExtractionDomain)
      : requestedDomain;

  const signals: Record<string, number | null> = {};
  if (
    obj.signals != null &&
    typeof obj.signals === 'object' &&
    !Array.isArray(obj.signals)
  ) {
    const s = obj.signals as Record<string, unknown>;
    for (const [k, v] of Object.entries(s)) {
      if (typeof k !== 'string') continue;
      if (v === null) signals[k] = null;
      else if (typeof v === 'number' && Number.isFinite(v)) signals[k] = v;
    }
  }

  const evidence: Array<{
    signal: string;
    quote: string;
    reason: string;
    note?: string;
  }> = [];
  if (Array.isArray(obj.evidence)) {
    for (const item of obj.evidence) {
      if (
        item &&
        typeof item === 'object' &&
        'signal' in item &&
        'quote' in item
      ) {
        const signal = String((item as { signal: unknown }).signal);
        const quote = String((item as { quote: unknown }).quote);
        const reasonRaw = (item as { reason?: unknown }).reason;
        const reason = typeof reasonRaw === 'string' ? reasonRaw : '';
        const note =
          typeof (item as { note?: unknown }).note === 'string'
            ? (item as { note: string }).note
            : undefined;
        evidence.push({ signal, quote, reason, ...(note && { note }) });
      }
    }
  }

  const version = typeof obj.version === 'string' ? obj.version : 'v1';
  let confidence = 0.5;
  if (typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)) {
    confidence = obj.confidence;
  } else if (typeof obj.confidence === 'string') {
    const c = Number(obj.confidence);
    if (Number.isFinite(c)) confidence = Math.max(0, Math.min(1, c));
  }
  const notes = typeof obj.notes === 'string' ? obj.notes : undefined;
  const rawInterests = parseRawInterestArray(obj);

  return {
    domain: domainStr,
    signals,
    evidence,
    version: version as 'v1',
    confidence,
    notes,
    ...(rawInterests.length > 0 ? { rawInterests } : {}),
  };
}

/**
 * Convert legacy/LLM-invented signal keys to official keys. If both alias and official exist, keep official.
 * Only normalizes keys; values are preserved. validateAndClean remains final authority.
 */
export function normalizeKeys(rawSignals: Record<string, number | null>): {
  normalizedSignals: Record<string, number | null>;
  telemetry: NormalizeKeysTelemetry;
} {
  const telemetry: NormalizeKeysTelemetry = {
    aliasesSeen: [],
    aliasesMapped: [],
    aliasesDroppedBecauseOfficialExists: [],
    unknownSignalKeysDropped: [],
  };
  const normalizedSignals: Record<string, number | null> = {};

  for (const [key, value] of Object.entries(rawSignals)) {
    if (EXTRACTION_SIGNAL_KEYS_SET.has(key)) {
      normalizedSignals[key] = value;
    } else if (key in KEY_ALIASES) {
      const officialKey = KEY_ALIASES[key];
      telemetry.aliasesSeen.push(key);
      if (!(officialKey in normalizedSignals)) {
        normalizedSignals[officialKey] = value;
        telemetry.aliasesMapped.push(key);
      } else {
        telemetry.aliasesDroppedBecauseOfficialExists.push(key);
      }
    } else {
      telemetry.unknownSignalKeysDropped.push(key);
    }
  }

  return { normalizedSignals, telemetry };
}
