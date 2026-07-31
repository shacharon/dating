/**
 * Redact + cap profile free-text for Phase 3 match narrative excerpts.
 * Never log raw about* at info from callers.
 */

import type { MatchNarrativeProfileExcerpt } from './match-narrative.types';

export const EXCERPT_MAX_CHARS = 180;
export const EXCERPT_MAX_COUNT = 4;
const MIN_EXCERPT_CHARS = 20;

export type ProfileAboutFields = {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
};

const EMAIL_RE = /\b\S+@\S+\.\S+\b/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{5,}\d)/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const HANDLE_RE = /@[a-z0-9_]{2,}/gi;
const DENY_PHRASES = [
  'credit card',
  'bank account',
  'passport',
  'ssn',
] as const;

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Strip/replace PII + deny patterns; return cleaned string (may be empty).
 */
export function redactProfileFreeText(raw: string): string {
  let s = raw;
  s = s.replace(EMAIL_RE, ' ');
  s = s.replace(URL_RE, ' ');
  s = s.replace(PHONE_RE, ' ');
  s = s.replace(HANDLE_RE, ' ');
  s = scrubDenyPhrases(s);
  // Drop placeholder tokens so they never become grounding cues or prompt noise.
  s = s.replace(/\[redacted\]/gi, ' ');
  s = collapseWhitespace(s);
  if (s.length < MIN_EXCERPT_CHARS) return '';
  return s;
}

function scrubDenyPhrases(s: string): string {
  let out = s;
  for (const phrase of DENY_PHRASES) {
    const re = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    out = out.replace(re, ' ');
  }
  return out;
}

function truncateExcerpt(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
  );
  if (sentenceEnd >= 40) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

const FIELD_ORDER: Array<keyof ProfileAboutFields> = [
  'aboutMe',
  'aboutPartner',
  'aboutRelationship',
];

/**
 * Build ≤4 excerpts from viewer+candidate about* fields.
 * Priority: both aboutMe, then both aboutPartner, then both aboutRelationship.
 */
export function buildProfileExcerpts(input: {
  viewer: ProfileAboutFields;
  candidate: ProfileAboutFields;
}): MatchNarrativeProfileExcerpt[] {
  const out: MatchNarrativeProfileExcerpt[] = [];

  for (const field of FIELD_ORDER) {
    for (const role of ['viewer', 'candidate'] as const) {
      if (out.length >= EXCERPT_MAX_COUNT) return out;
      const raw = input[role][field];
      if (!raw?.trim()) continue;
      const cleaned = redactProfileFreeText(raw);
      if (!cleaned) continue;
      const text = truncateExcerpt(cleaned, EXCERPT_MAX_CHARS);
      if (text.length < MIN_EXCERPT_CHARS) continue;
      out.push({ role, field, text });
    }
  }

  return out;
}
