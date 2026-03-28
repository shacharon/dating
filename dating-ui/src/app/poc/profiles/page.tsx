'use client';

import { useCallback, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3001/api/v1/profiles';

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

interface Evaluation {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string; note?: string };
  productScores: ProductScores;
  productScoresPresentation?: ProductScoresPresentation;
  flags: string[];
}

interface ProfilePayload {
  id: string;
  name: string;
  texts: { aboutMe: string; aboutPartner: string; aboutRelationship: string };
  evaluation: Evaluation;
  savedAt: string;
}

function formatSignalKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatProductScoreCell(
  presentation: ProductScorePresentationValue | undefined,
  rawFallback: number,
): string {
  if (presentation?.kind === 'insufficient_data') return 'Insufficient data';
  if (presentation?.kind === 'numeric') return String(presentation.value);
  return String(rawFallback);
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

export default function ProfilesPage() {
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<ProfileListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [signalTab, setSignalTab] = useState<SignalTab>('self');

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
        setSelectedId((prev) => (prev ? prev : data.items[0]?.id ?? ''));
      } else {
        setItems([]);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Request failed.');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, []);

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

  const evaluation = profile?.evaluation;
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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Profile Viewer
        </h1>

        <div>
          <label
            htmlFor="profile-select"
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
            <select
              id="profile-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (#{item.id})
                </option>
              ))}
            </select>
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

            {/* 3) User-facing result */}
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Result
              </h2>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {evaluation!.display.summary}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {evaluation!.display.insight}
              </p>
              {evaluation!.display.note && (
                <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
                  {evaluation!.display.note}
                </p>
              )}
            </div>

            {/* 4) Scores + flags */}
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
                    {formatProductScoreCell(
                      evaluation!.productScoresPresentation?.partnerFitScore,
                      evaluation!.productScores.partnerFitScore,
                    )}
                  </span>
                </li>
                <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Relationship fit
                  </span>
                  <span className="font-medium">
                    {formatProductScoreCell(
                      evaluation!.productScoresPresentation?.relationshipFitScore,
                      evaluation!.productScores.relationshipFitScore,
                    )}
                  </span>
                </li>
                <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Coverage</span>
                  <span className="font-medium">
                    {formatProductScoreCell(
                      evaluation!.productScoresPresentation?.coverageScore,
                      evaluation!.productScores.coverageScore,
                    )}
                  </span>
                </li>
                <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Friction risk
                  </span>
                  <span className="font-medium">
                    {formatProductScoreCell(
                      evaluation!.productScoresPresentation?.frictionRiskScore,
                      evaluation!.productScores.frictionRiskScore,
                    )}
                  </span>
                </li>
                <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Overall
                  </span>
                  <span className="font-medium">
                    {formatProductScoreCell(
                      evaluation!.productScoresPresentation?.overallDecisionScore,
                      evaluation!.productScores.overallDecisionScore,
                    )}
                  </span>
                </li>
              </ul>
              {evaluation!.flags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evaluation!.flags.map((f) => (
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

            {/* 5) Signals: Tabs + table + Evidence */}
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Signals
              </h2>
              <div className="mb-3 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
                {(['self', 'partner', 'relationship'] as const).map((tab) => {
                  const block =
                    tab === 'self'
                      ? evaluation!.self
                      : tab === 'partner'
                        ? evaluation!.partner
                        : evaluation!.relationship;
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
          </div>
        )}
      </div>
    </div>
  );
}
