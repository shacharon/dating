'use client';

import Link from 'next/link';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildEnrichmentDisplayChipsV1 } from '@/lib/enrichment-display-v1';

const API_BASE = 'http://localhost:3001/api/v1/profiles';

/** When URL has no `ids`, load this sample set so /profiles/compare works without query params. */
const DEFAULT_COMPARE_IDS =
  'handmade_202604_01,handmade_202604_04,handmade_202604_26,handmade_202604_29';

interface EnrichmentSignalsV1 {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
}

interface Evaluation {
  enrichment?: { version: 'v1'; signals: EnrichmentSignalsV1 };
}

interface ProfilePayload {
  id: string;
  name: string;
  texts: { aboutMe: string; aboutPartner: string; aboutRelationship: string };
  evaluation?: Evaluation;
}

function parseIdsParam(param: string): string[] {
  return param
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function enrichmentGlanceLabels(s: EnrichmentSignalsV1): string[] {
  return buildEnrichmentDisplayChipsV1(s).map((c) => c.label);
}

export function ProfilesCompareClient() {
  const searchParams = useSearchParams();
  /** Primitive-only dep: avoids unstable `searchParams` reference breaking useMemo/useCallback. */
  const idsFromUrl = searchParams.get('ids')?.trim() ?? '';
  const effectiveIdsParam = idsFromUrl || DEFAULT_COMPARE_IDS;
  const usingDefaultPreset = !idsFromUrl;

  const ids = useMemo(() => parseIdsParam(effectiveIdsParam), [effectiveIdsParam]);

  const [rows, setRows] = useState<
    { id: string; profile: ProfilePayload | null; error: string | null }[]
  >([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const load = useCallback(async () => {
    const idList = parseIdsParam(effectiveIdsParam);
    if (!idList.length) {
      setRows([]);
      return;
    }
    setLoadingAll(true);
    setRows(idList.map((id) => ({ id, profile: null, error: null })));

    const results = await Promise.all(
      idList.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            profile?: ProfilePayload;
            message?: string;
          } | null;
          if (!res.ok || !data?.ok || !data?.profile) {
            const msg =
              typeof data?.message === 'string' ? data.message : `HTTP ${res.status} or invalid JSON`;
            return { id, profile: null, error: msg };
          }
          return { id, profile: data.profile, error: null };
        } catch (e) {
          return {
            id,
            profile: null,
            error: e instanceof Error ? e.message : 'Request failed',
          };
        }
      }),
    );
    setRows(results);
    setLoadingAll(false);
  }, [effectiveIdsParam]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Profile compare (enrichment)
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Side-by-side enrichment at a glance (human-readable chips, max five per profile).
              Optional query{' '}
              <span className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-800">
                ?ids=id1,id2
              </span>{' '}
              (max 5). Without it, a default sample loads.
            </p>
          </div>
          <Link
            href="/profiles"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Profile viewer
          </Link>
        </div>

        {usingDefaultPreset && (
          <p className="rounded border border-zinc-200 bg-zinc-100/80 p-3 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
            Showing default sample (4 profiles). Use{' '}
            <Link
              href={`/profiles/compare?ids=${DEFAULT_COMPARE_IDS}`}
              className="font-medium text-blue-600 underline dark:text-blue-400"
            >
              explicit ids in the URL
            </Link>{' '}
            to share this view.
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Other presets:</span>
          <Link
            href="/profiles/compare?ids=handmade_202604_02,handmade_202604_06,handmade_202604_18,handmade_202604_28"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            brewery · single dad · bassist · paragliding
          </Link>
        </div>

        {loadingAll && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}

        {!loadingAll && ids.length > 0 && (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(ids.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {row.profile?.name ?? row.id}
                </h2>
                <p className="mb-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">#{row.id}</p>
                {row.error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{row.error}</p>
                )}
                {row.profile?.evaluation?.enrichment?.signals ? (
                  (() => {
                    const labels = enrichmentGlanceLabels(row.profile.evaluation.enrichment.signals);
                    if (!labels.length) return null;
                    return (
                      <div className="mb-3">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          At a glance
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {labels.map((t, i) => (
                            <li
                              key={`${row.id}-glance-${i}`}
                              className="rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium leading-snug text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                            >
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()
                ) : row.profile ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No enrichment on evaluation.</p>
                ) : null}
                <Link
                  href={`/profiles?profileId=${encodeURIComponent(row.id)}&enrichmentDebug=1`}
                  className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open in viewer →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
