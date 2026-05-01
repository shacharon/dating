'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/api-base';
import {
  buildEnrichmentDisplayChipsV1,
  labelAutonomy,
  labelConflict,
  labelDailyRhythm,
  labelInterest,
  labelKids,
} from '@/lib/enrichment-display-v1';

const API_ORIGIN = getApiBase();
const API_BASE = `${API_ORIGIN}/api/v1/profiles`;

const SIGNAL_KEYS = [
  'ambition',
  'socialBattery',
  'healthBodyConsciousness',
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'traditionalism',
  'financialMindset',
  'relationshipClarity',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
] as const;

interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}

interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  reason?: string;
}

type ExtractionDomainQualityStatus = 'OK' | 'LOW_DATA' | 'UNRELIABLE';

interface ExtractedSignals {
  domain: string;
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  confidence: number;
  domainStatus?: ExtractionDomainQualityStatus;
}

type ProductScorePresentationValue =
  | { kind: 'numeric'; value: number }
  | { kind: 'insufficient_data' };

interface ProductScores {
  partnerFitScore: number;
  relationshipFitScore: number;
  coverageScore: number;
  frictionRiskScore: number;
  overallDecisionScore: number;
}

interface ProductScoresPresentation {
  partnerFitScore: ProductScorePresentationValue;
  relationshipFitScore: ProductScorePresentationValue;
  coverageScore: ProductScorePresentationValue;
  frictionRiskScore: ProductScorePresentationValue;
  overallDecisionScore: ProductScorePresentationValue;
}

interface EnrichmentSignalsV1 {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
}

interface EnrichmentV1 {
  version: 'v1';
  signals: EnrichmentSignalsV1;
}

interface Evaluation {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string; note?: string };
  productScores: ProductScores;
  productScoresPresentation?: ProductScoresPresentation;
  flags: string[];
  chips?: ChipsBundle;
  enrichment?: EnrichmentV1;
}

interface EvaluationChip {
  label: string;
  source: 'interest' | 'motivation' | 'trait' | 'signal' | 'enrichment';
}
type ChipDomain = 'self' | 'partner' | 'relationship';

interface DisplayChip extends EvaluationChip {
  label: string;
  hint: string;
}

interface ChipsBundle {
  self: EvaluationChip[];
  partner: EvaluationChip[];
  relationship: EvaluationChip[];
}

interface ProfilePayload {
  id: string;
  name: string;
  texts: { aboutMe: string; aboutPartner: string; aboutRelationship: string };
  evaluation?: Evaluation;
  savedAt: string;
}

function formatSignalKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatDomainConfidence(s: ExtractedSignals): string {
  if (s.domainStatus === 'LOW_DATA' || s.domainStatus === 'UNRELIABLE') {
    return 'Insufficient data';
  }
  const nonNull = Object.values(s.signals).filter((v) => v != null).length;
  if (!s.domainStatus && nonNull < 2) return 'Insufficient data';
  return `${(s.confidence * 100).toFixed(0)}%`;
}

function domainStatusLabel(s: ExtractedSignals): ExtractionDomainQualityStatus | null {
  if (s.domainStatus) return s.domainStatus;
  const nonNull = Object.values(s.signals).filter((v) => v != null).length;
  if (nonNull < 2) return 'LOW_DATA';
  return 'OK';
}

type SignalTab = 'self' | 'partner' | 'relationship';

function countNonNullSignals(block: ExtractedSignals): number {
  return Object.values(block.signals ?? {}).filter((v) => v != null).length;
}

function isSignalsEmpty(evaluation: Evaluation): boolean {
  return (
    countNonNullSignals(evaluation.self) +
      countNonNullSignals(evaluation.partner) +
      countNonNullSignals(evaluation.relationship) ===
    0
  );
}

function formatChipSource(source: EvaluationChip['source']): string {
  if (source === 'interest') return 'Interest';
  if (source === 'motivation') return 'Motivation';
  if (source === 'trait') return 'Trait';
  if (source === 'enrichment') return 'Enrichment';
  return 'Signal';
}

const ENRICHMENT_DEBUG_STORAGE = 'profilesEnrichmentDebug';

function prefixedChipLabel(domain: ChipDomain, label: string): string {
  const prefix = domain === 'self' ? 'Self' : domain === 'partner' ? 'Partner' : 'Relationship';
  return `${prefix}: ${label}`;
}

function dedupeByLabel(chips: EvaluationChip[]): EvaluationChip[] {
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

function diversifyPartnerChips(chips: EvaluationChip[]): EvaluationChip[] {
  const trait = chips.filter((c) => c.source === 'trait');
  const rest = chips.filter((c) => c.source !== 'trait');
  return [...trait.slice(0, 3), ...rest, ...trait.slice(3)].slice(0, 6);
}

function fallbackSelfChips(aboutMe: string): EvaluationChip[] {
  const text = aboutMe.toLowerCase();
  const out: EvaluationChip[] = [];
  if (/\b(spiritual|faith|tradition)\b/.test(text)) out.push({ label: 'Spiritual', source: 'signal' });
  if (/\b(direct|clear|honest)\b/.test(text)) out.push({ label: 'Direct Communication', source: 'signal' });
  if (/\b(ambitious|driven|career|goals?)\b/.test(text)) out.push({ label: 'Ambitious', source: 'signal' });
  if (/\b(quiet|routine|slow|steady|fast|spontaneous)\b/.test(text)) out.push({ label: 'Lifestyle Pace', source: 'signal' });
  return dedupeByLabel(out).slice(0, 2);
}

function boundaryChipsFromTexts(texts: ProfilePayload['texts']): DisplayChip[] {
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

function toDisplayChips(domain: ChipDomain, chips: EvaluationChip[], sourceHint: string): DisplayChip[] {
  return chips.map((chip) => ({
    ...chip,
    label: prefixedChipLabel(domain, chip.label),
    hint: `${formatChipSource(chip.source)} from ${sourceHint}.`,
  }));
}

function toLegacyDisplayChips(chips: EvaluationChip[], sourceHint: string): DisplayChip[] {
  return chips.map((chip) => ({
    ...chip,
    hint: `${formatChipSource(chip.source)} from ${sourceHint}.`,
  }));
}

function buildChipsForUi(profile: ProfilePayload, evaluation: Evaluation): {
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

function enrichmentFieldHint(field: string): string {
  const m: Record<string, string> = {
    dailyRhythm: 'Routine and pace of day',
    autonomyTogethernessDepth: 'Togetherness vs personal space',
    kidsTimeline: 'Children intent and timing',
    conflictStyleDetail: 'How they handle disagreement',
    interestsTop3: 'Stated hobbies and interests',
  };
  return m[field] ?? 'Profile enrichment';
}

function pushEnrichmentChip(out: DisplayChip[], label: string, hintKey: string): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  out.push({
    label: trimmed,
    source: 'enrichment',
    hint: enrichmentFieldHint(hintKey),
  });
}

/** DISPLAY_LAYER_V1 — human labels, max 5 chips (interests combined). */
function enrichmentGlanceDisplayChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
  if (!enrichment || enrichment.version !== 'v1' || !enrichment.signals) return [];
  return buildEnrichmentDisplayChipsV1(enrichment.signals).map((c) => ({
    label: c.label,
    source: 'enrichment',
    hint: enrichmentFieldHint(c.field),
  }));
}

/** Debug: same glance row as default (human labels). */
function enrichmentPrimaryDisplayChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
  return enrichmentGlanceDisplayChips(enrichment);
}

/** Debug: structural fields + each interest as its own chip (still human-readable). */
function enrichmentDebugFullChips(enrichment: EnrichmentV1 | undefined): DisplayChip[] {
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

function flattenProfileChipsForMerge(
  evaluation: Evaluation,
  profile: ProfilePayload,
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

function ChipsDomainBlock({
  title,
  chips,
  maxChips = 6,
  hideSourceTag = false,
}: {
  title: string;
  chips: DisplayChip[];
  /** Default 6; use a high number for merged test rows. */
  maxChips?: number;
  /** Strip “Enrichment” suffix for compact at-a-glance rows. */
  hideSourceTag?: boolean;
}) {
  if (!chips.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <ul className="flex flex-wrap gap-2">
        {chips.slice(0, maxChips).map((chip, i) => (
          <li
            key={`${title}-${chip.label}-${i}`}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
            title={chip.hint}
          >
            {chip.label}
            {!hideSourceTag && (
              <span className="ml-1 text-[10px] font-normal uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {formatChipSource(chip.source)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfilesPage() {
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<ProfileListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);

  const [signalTab, setSignalTab] = useState<SignalTab>('self');
  /** POC: filter text for profile autocomplete (not the canonical selected label). */
  const [profileSearch, setProfileSearch] = useState('');
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);
  const [showEnrichmentChips, setShowEnrichmentChips] = useState(false);

  const preferredProfileId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('profileId')?.trim() || ''
      : '';
  const legacyChipsUx =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('chipsUx') === 'old';

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (!res.ok) {
        setListError(typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`);
        setItems([]);
        return;
      }
      if (data?.ok && Array.isArray(data?.items)) {
        setItems(data.items);
        const preferredExists = preferredProfileId
          ? data.items.some((item: ProfileListItem) => item.id === preferredProfileId)
          : false;
        setSelectedId((prev) =>
          prev ? prev : preferredExists ? preferredProfileId : data.items[0]?.id ?? '',
        );
      } else {
        setItems([]);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Request failed.');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [preferredProfileId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('enrichmentDebug');
    if (q === '1' || q === 'true') {
      setShowEnrichmentChips(true);
      return;
    }
    if (q === '0' || q === 'false') {
      setShowEnrichmentChips(false);
      return;
    }
    setShowEnrichmentChips(window.sessionStorage.getItem(ENRICHMENT_DEBUG_STORAGE) === '1');
  }, []);

  const filteredProfileItems = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return items.slice(0, 80);
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [items, profileSearch]);

  const selectedListItem = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    fetch(`${API_BASE}/${encodeURIComponent(selectedId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !data?.profile) {
          setProfileError('Profile not found.');
          setProfile(null);
          return;
        }
        setProfile(data.profile);
        setProfileError(null);
        setSignalTab('self');
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err.message : 'Request failed.');
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function analyzeSelectedProfile(): Promise<void> {
    if (!selectedId || analyzing) return;
    setAnalyzeMessage(null);
    setAnalyzing(true);
    try {
      const res = await fetch(
        `${API_ORIGIN}/api/profiles/${encodeURIComponent(selectedId)}/analyze`,
        { method: 'POST' },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof data?.message === 'string'
            ? data.message
            : `Analyze failed (${res.status})`;
        setAnalyzeMessage(msg);
        return;
      }

      // Refresh the selected profile after analysis so UI shows latest result.
      const profileRes = await fetch(`${API_BASE}/${encodeURIComponent(selectedId)}`);
      const profileData = await profileRes.json().catch(() => null);
      if (profileRes.ok && profileData?.ok && profileData?.profile) {
        setProfile(profileData.profile as ProfilePayload);
      }
      setAnalyzeMessage('Analysis complete.');
    } catch (err) {
      setAnalyzeMessage(err instanceof Error ? err.message : 'Analyze failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  const evaluation = profile?.evaluation;
  const chipsOnlyMode = evaluation ? isSignalsEmpty(evaluation) : false;
  const chipsForUi = profile && evaluation ? buildChipsForUi(profile, evaluation) : null;
  const enrichmentChipsGlance = useMemo(
    () => enrichmentGlanceDisplayChips(evaluation?.enrichment),
    [evaluation?.enrichment],
  );
  const enrichmentChipsPrimary = useMemo(
    () => enrichmentPrimaryDisplayChips(evaluation?.enrichment),
    [evaluation?.enrichment],
  );
  const enrichmentChipsDebugFull = useMemo(
    () => enrichmentDebugFullChips(evaluation?.enrichment),
    [evaluation?.enrichment],
  );
  const mergedProfileAndEnrichmentChips = useMemo(() => {
    if (!evaluation || !profile) return [];
    return [
      ...flattenProfileChipsForMerge(evaluation, profile, legacyChipsUx),
      ...enrichmentChipsGlance,
    ];
  }, [evaluation, profile, legacyChipsUx, enrichmentChipsGlance]);
  const signalsBlock =
    evaluation &&
    (signalTab === 'self'
      ? evaluation.self
      : signalTab === 'partner'
        ? evaluation.partner
        : evaluation.relationship);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Profile Viewer
          </h1>
          <Link
            href="/profiles/compare"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Compare enrichment (side-by-side)
          </Link>
        </div>

        <div>
          <label
            htmlFor="profile-search"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Saved profile
          </label>
          {listLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved profiles found.
            </p>
          ) : (
            <div className="relative">
              <input
                id="profile-search"
                type="search"
                autoComplete="off"
                value={profileSearch}
                onChange={(e) => {
                  setProfileSearch(e.target.value);
                  setProfilePickerOpen(true);
                }}
                onFocus={() => setProfilePickerOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setProfilePickerOpen(false), 120);
                }}
                placeholder="Type name or id…"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                aria-autocomplete="list"
                aria-expanded={profilePickerOpen}
                aria-controls="profile-picker-list"
              />
              {selectedListItem && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Selected: {selectedListItem.name} (#{selectedListItem.id})
                </p>
              )}
              {profilePickerOpen && filteredProfileItems.length > 0 && (
                <ul
                  id="profile-picker-list"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
                >
                  {filteredProfileItems.map((item) => (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={item.id === selectedId}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedId(item.id);
                          setProfileSearch('');
                          setProfilePickerOpen(false);
                        }}
                      >
                        <span className="font-medium">{item.name}</span>{' '}
                        <span className="text-zinc-500 dark:text-zinc-400">
                          (#{item.id})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {selectedId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={analyzeSelectedProfile}
                disabled={analyzing || profileLoading}
                className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {analyzing ? 'Analyzing…' : 'Analyze selected profile'}
              </button>
              <Link
                href={`/profiles?profileId=${encodeURIComponent(selectedId)}`}
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Open profile route
              </Link>
              <a
                href={`${API_BASE}/${encodeURIComponent(selectedId)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Go to profile API URL
              </a>
            </div>
          )}
          {selectedId && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              URL: {`${API_BASE}/${selectedId}`}
            </p>
          )}
          {analyzeMessage && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {analyzeMessage}
            </p>
          )}
        </div>

        {profileError && (
          <div
            className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {profileError}
          </div>
        )}

        {profileLoading && selectedId && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}

        {profile && !profileLoading && (
          <div className="space-y-6">
            {/* 1) Header */}
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-lg">
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {profile.name}
                </strong>{' '}
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  #{profile.id}
                </strong>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                savedAt: {profile.savedAt}
              </p>
            </div>

            {/* 2) Texts */}
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Texts
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    About me
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {profile.texts.aboutMe || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    About partner
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {profile.texts.aboutPartner || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    About relationship
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {profile.texts.aboutRelationship || '—'}
                  </p>
                </div>
              </div>
            </div>

            {evaluation ? (
              <>
                {/* 3) User-facing result */}
                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Result
                  </h2>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {evaluation.display.summary}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {evaluation.display.insight}
                  </p>
                  {evaluation.display.note && (
                    <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
                      {evaluation.display.note}
                    </p>
                  )}
                </div>

                {/* 4) Chips-first profile lens */}
                {chipsForUi && (
                  <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                      Profile chips
                    </h2>
                    {chipsOnlyMode ? (
                      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Signals are empty for this profile, so chips are the primary output.
                      </p>
                    ) : (
                      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Quick read of the strongest profile cues.
                      </p>
                    )}
                    {legacyChipsUx ? (
                      <div className="space-y-4">
                        <ChipsDomainBlock
                          title="About me"
                          chips={toLegacyDisplayChips(evaluation.chips?.self ?? [], 'about me')}
                        />
                        <ChipsDomainBlock
                          title="Partner preference"
                          chips={toLegacyDisplayChips(evaluation.chips?.partner ?? [], 'about partner')}
                        />
                        <ChipsDomainBlock
                          title="Relationship style"
                          chips={toLegacyDisplayChips(
                            evaluation.chips?.relationship ?? [],
                            'about relationship',
                          )}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ChipsDomainBlock title="About me" chips={chipsForUi.self} />
                        <ChipsDomainBlock title="Partner preference" chips={chipsForUi.partner} />
                        <ChipsDomainBlock title="Relationship style" chips={chipsForUi.relationship} />
                        <ChipsDomainBlock title="Boundary chips" chips={chipsForUi.boundaries} />
                      </div>
                    )}
                    {enrichmentChipsGlance.length > 0 ? (
                      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <ChipsDomainBlock
                          title="At a glance"
                          chips={enrichmentChipsGlance}
                          maxChips={5}
                          hideSourceTag
                        />
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Routine, togetherness, kids, conflict, and top interests (up to five chips).
                        </p>
                      </div>
                    ) : null}
                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={showEnrichmentChips}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setShowEnrichmentChips(v);
                          if (typeof window !== 'undefined') {
                            window.sessionStorage.setItem(ENRICHMENT_DEBUG_STORAGE, v ? '1' : '0');
                          }
                        }}
                      />
                      Show enrichment chips (debug)
                    </label>
                    {showEnrichmentChips && (
                      <div className="mt-4 space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        {!evaluation.enrichment ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            No enrichment data on this evaluation.
                          </p>
                        ) : (
                          <>
                            {enrichmentChipsPrimary.length > 0 ? (
                              <ChipsDomainBlock
                                title="Enrichment — same as at-a-glance (debug)"
                                chips={enrichmentChipsPrimary}
                                maxChips={5}
                                hideSourceTag
                              />
                            ) : (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                No enrichment chips for this profile.
                              </p>
                            )}
                            {enrichmentChipsDebugFull.length > 0 ? (
                              <ChipsDomainBlock
                                title="Enrichment — expanded interests (debug)"
                                chips={enrichmentChipsDebugFull}
                                maxChips={12}
                                hideSourceTag
                              />
                            ) : null}
                          </>
                        )}
                        {mergedProfileAndEnrichmentChips.length > 0 ? (
                          <ChipsDomainBlock
                            title="Merged: profile + structural enrichment (preview)"
                            chips={mergedProfileAndEnrichmentChips}
                            maxChips={200}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* 5) Scores + flags */}
                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Scores
                  </h2>
                  <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Partner fit
                      </span>
                      <span className="font-medium">
                        {evaluation.productScores.partnerFitScore}
                      </span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Relationship fit
                      </span>
                      <span className="font-medium">
                        {evaluation.productScores.relationshipFitScore}
                      </span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">Coverage</span>
                      <span className="font-medium">
                        {evaluation.productScores.coverageScore}
                      </span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Friction risk
                      </span>
                      <span className="font-medium">
                        {evaluation.productScores.frictionRiskScore}
                      </span>
                    </li>
                    <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Overall
                      </span>
                      <span className="font-medium">
                        {evaluation.productScores.overallDecisionScore}
                      </span>
                    </li>
                  </ul>
                  {evaluation.flags?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {evaluation.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6) Signals: Tabs + table + Evidence */}
                <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Signals
                  </h2>
                  {chipsOnlyMode && (
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      Raw signal tables are shown for debugging, but chips above should be treated as the primary experience for this profile.
                    </p>
                  )}
                  <div className="mb-3 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
                    {(['self', 'partner', 'relationship'] as const).map((tab) => {
                      const block =
                        tab === 'self'
                          ? evaluation.self
                          : tab === 'partner'
                            ? evaluation.partner
                            : evaluation.relationship;
                      const st = domainStatusLabel(block);
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSignalTab(tab)}
                          className={`border-b-2 px-3 py-2 text-sm font-medium ${
                            signalTab === tab
                              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          {st && st !== 'OK' ? (
                            <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-300">
                              ({st})
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {signalsBlock && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[280px] text-sm">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                              <th className="py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                                Signal
                              </th>
                              <th className="py-2 text-right font-medium text-zinc-700 dark:text-zinc-300">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {SIGNAL_KEYS.map((key) => (
                              <tr
                                key={key}
                                className="border-b border-zinc-100 dark:border-zinc-800"
                              >
                                <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                                  {formatSignalKey(key)}
                                </td>
                                <td className="py-1.5 text-right font-medium">
                                  {signalsBlock.signals?.[key] ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {(() => {
                          const c = formatDomainConfidence(signalsBlock);
                          return c.includes('%') ? `confidence ${c}` : c;
                        })()}
                      </p>
                      {signalsBlock.evidence?.length > 0 && (
                        <div className="mt-4">
                          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Evidence
                          </h3>
                          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {signalsBlock.evidence.map((e, i) => {
                              const score = signalsBlock.signals?.[e.signal];
                              return (
                                <li key={i}>
                                  <span className="font-medium">
                                    {formatSignalKey(e.signal)}
                                  </span>
                                  {score != null && (
                                    <span className="text-zinc-500 dark:text-zinc-500">
                                      {' '}
                                      / {score}
                                    </span>
                                  )}
                                  <span className="block">&ldquo;{e.quote}&rdquo;</span>
                                  {e.reason ? (
                                    <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                      {e.reason}
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                This DB profile has not been analyzed yet, so no result/scores/signals are available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
