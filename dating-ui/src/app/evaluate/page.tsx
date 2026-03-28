'use client';

import { useState } from 'react';

const API_PROFILES_EVALUATE_URL =
  'http://localhost:3001/api/v1/profiles/evaluate';

const SECTIONS = [
  { id: 'aboutMe' as const, label: 'About me', placeholder: 'Describe yourself…' },
  {
    id: 'aboutRelationship' as const,
    label: 'About relationship',
    placeholder: 'What you want from a relationship…',
  },
  {
    id: 'aboutPartner' as const,
    label: 'About partner',
    placeholder: 'What you look for in a partner…',
  },
] as const;

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
  version: string;
  confidence: number;
  notes?: string;
  domainStatus?: ExtractionDomainQualityStatus;
}

interface EvaluateBatchResult {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string };
}

type SectionId = (typeof SECTIONS)[number]['id'];

function formatSignalKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatDomainConfidence(s: ExtractedSignals): string {
  if (s.domainStatus === 'LOW_DATA' || s.domainStatus === 'UNRELIABLE') {
    return 'Insufficient data';
  }
  const nonNull = Object.values(s.signals).filter((v) => v != null).length;
  if (!s.domainStatus && nonNull < 2) return 'Insufficient data';
  return `${(s.confidence * 100).toFixed(0)}%`;
}

export default function EvaluatePage() {
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [aboutRelationship, setAboutRelationship] = useState('');
  const [aboutPartner, setAboutPartner] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateBatchResult | null>(null);

  const texts: Record<SectionId, string> = {
    aboutMe,
    aboutRelationship,
    aboutPartner,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmedName = name.trim();
    const trimmed: Record<SectionId, string> = {
      aboutMe: aboutMe.trim(),
      aboutRelationship: aboutRelationship.trim(),
      aboutPartner: aboutPartner.trim(),
    };

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    const empty = SECTIONS.filter((s) => !trimmed[s.id]);
    if (empty.length > 0) {
      setError(`Please fill in: ${empty.map((s) => s.label).join(', ')}.`);
      return;
    }

    setLoading(true);
    try {
      const payload: {
        name: string;
        aboutMe: string;
        aboutPartner: string;
        aboutRelationship: string;
        id?: string;
      } = {
        name: trimmedName,
        aboutMe: trimmed.aboutMe,
        aboutPartner: trimmed.aboutPartner,
        aboutRelationship: trimmed.aboutRelationship,
      };
      if (profileId.trim()) {
        payload.id = profileId.trim();
      }

      const res = await fetch(API_PROFILES_EVALUATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: {
        profileId?: string;
        evaluation?: EvaluateBatchResult;
        message?: string;
      };
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? 'Invalid response.' : `Request failed (${res.status}).`);
        return;
      }
      if (!res.ok) {
        setError(
          typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`,
        );
        return;
      }
      if (!data.profileId || !data.evaluation) {
        setError('Invalid response from server.');
        return;
      }

      setSavedProfileId(data.profileId);
      setProfileId(data.profileId);
      setResult(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  function SignalsCard({
    title,
    data,
  }: {
    title: string;
    data: ExtractedSignals;
  }) {
    const entries = Object.entries(data.signals ?? {}).filter(
      ([_, v]) => v != null,
    ) as [string, number][];
    return (
      <div className="space-y-3 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {title}
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            {(() => {
              const c = formatDomainConfidence(data);
              return c.includes('%') ? `confidence ${c}` : c;
            })()}
          </span>
        </h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {entries.map(([key, value]) => (
            <li
              key={key}
              className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800"
            >
              <span className="text-zinc-600 dark:text-zinc-400">
                {formatSignalKey(key)}
              </span>
              <span className="font-medium">{value}</span>
            </li>
          ))}
        </ul>
        {data.evidence?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Evidence
            </h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {data.evidence.map((e, i) => {
                const score = data.signals[e.signal];
                return (
                  <li key={i}>
                    <span className="font-medium">{formatSignalKey(e.signal)}</span>
                    {score != null && (
                      <span className="text-zinc-500 dark:text-zinc-500"> / {score}</span>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Profile evaluator
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="Your name"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="profileId"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Profile ID <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="profileId"
              type="text"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="Leave empty to create new"
              disabled={loading}
            />
          </div>
          {SECTIONS.map(({ id, label, placeholder }) => (
            <div key={id}>
              <label
                htmlFor={id}
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {label}
              </label>
              <textarea
                id={id}
                value={texts[id]}
                onChange={(e) => {
                  if (id === 'aboutMe') setAboutMe(e.target.value);
                  else if (id === 'aboutRelationship') setAboutRelationship(e.target.value);
                  else setAboutPartner(e.target.value);
                }}
                rows={4}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
                placeholder={placeholder}
                disabled={loading}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-zinc-900 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? 'Evaluating…' : 'Evaluate all'}
          </button>
        </form>

        {error && (
          <div
            className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {savedProfileId && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Saved. Profile ID: <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">{savedProfileId}</code>
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Summary
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {result.display.summary}
              </p>
              <h3 className="mt-3 mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Insight
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {result.display.insight}
              </p>
            </div>
            <SignalsCard title="Self" data={result.self} />
            <SignalsCard title="Partner" data={result.partner} />
            <SignalsCard title="Relationship" data={result.relationship} />
          </div>
        )}
      </div>
    </div>
  );
}
