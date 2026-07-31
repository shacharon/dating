'use client';

import {
  buildChipsForUi,
  enrichmentDebugFullChips,
  enrichmentGlanceDisplayChips,
  enrichmentPrimaryDisplayChips,
  flattenProfileChipsForMerge,
  formatChipSource,
  toLegacyDisplayChips,
} from '@/lib/profile-chip-extraction';
import {
  domainStatusLabel,
  formatDomainConfidence,
  formatSignalKey,
  isSignalsEmpty,
  SIGNAL_KEYS,
} from '@/lib/profile-signal-display';
import type { DisplayChip, Evaluation, SignalTab } from '@/lib/profile-types';
import type { ProfilePayload } from '@/lib/profiles-api';
import { useEffect, useMemo, useState } from 'react';

const ENRICHMENT_DEBUG_STORAGE = 'profilesEnrichmentDebug';

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

export function ProfileDetailPanel({
  profile,
  legacyChipsUx,
}: {
  profile: ProfilePayload;
  legacyChipsUx: boolean;
}) {
  const [signalTab, setSignalTab] = useState<SignalTab>('self');
  const [showEnrichmentChips, setShowEnrichmentChips] = useState(false);

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

  useEffect(() => {
    setSignalTab('self');
  }, [profile.id]);

  const evaluation = profile.evaluation;
  const chipsOnlyMode = evaluation ? isSignalsEmpty(evaluation) : false;
  const chipsForUi = evaluation ? buildChipsForUi(profile, evaluation) : null;
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
    if (!evaluation) return [];
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
    <div className="space-y-6">
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

      <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">Texts</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">About me</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
              {profile.texts.aboutMe || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">About partner</p>
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
          <EvaluationResultSection evaluation={evaluation} />
          {chipsForUi && (
            <ProfileChipsSection
              evaluation={evaluation}
              chipsForUi={chipsForUi}
              chipsOnlyMode={chipsOnlyMode}
              legacyChipsUx={legacyChipsUx}
              enrichmentChipsGlance={enrichmentChipsGlance}
              enrichmentChipsPrimary={enrichmentChipsPrimary}
              enrichmentChipsDebugFull={enrichmentChipsDebugFull}
              mergedProfileAndEnrichmentChips={mergedProfileAndEnrichmentChips}
              showEnrichmentChips={showEnrichmentChips}
              setShowEnrichmentChips={setShowEnrichmentChips}
            />
          )}
          <ScoresSection evaluation={evaluation} />
          <SignalsSection
            evaluation={evaluation}
            chipsOnlyMode={chipsOnlyMode}
            signalTab={signalTab}
            setSignalTab={setSignalTab}
            signalsBlock={signalsBlock}
          />
        </>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          This DB profile has not been analyzed yet, so no result/scores/signals are available.
        </div>
      )}
    </div>
  );
}

function EvaluationResultSection({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">Result</h2>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
        {evaluation.display.summary}
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{evaluation.display.insight}</p>
      {evaluation.display.note && (
        <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
          {evaluation.display.note}
        </p>
      )}
    </div>
  );
}

function ProfileChipsSection({
  evaluation,
  chipsForUi,
  chipsOnlyMode,
  legacyChipsUx,
  enrichmentChipsGlance,
  enrichmentChipsPrimary,
  enrichmentChipsDebugFull,
  mergedProfileAndEnrichmentChips,
  showEnrichmentChips,
  setShowEnrichmentChips,
}: {
  evaluation: Evaluation;
  chipsForUi: {
    self: DisplayChip[];
    partner: DisplayChip[];
    relationship: DisplayChip[];
    boundaries: DisplayChip[];
  };
  chipsOnlyMode: boolean;
  legacyChipsUx: boolean;
  enrichmentChipsGlance: DisplayChip[];
  enrichmentChipsPrimary: DisplayChip[];
  enrichmentChipsDebugFull: DisplayChip[];
  mergedProfileAndEnrichmentChips: DisplayChip[];
  showEnrichmentChips: boolean;
  setShowEnrichmentChips: (v: boolean) => void;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">Profile chips</h2>
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
            chips={toLegacyDisplayChips(evaluation.chips?.relationship ?? [], 'about relationship')}
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
  );
}

function ScoresSection({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">Scores</h2>
      <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Partner fit</span>
          <span className="font-medium">{evaluation.productScores.partnerFitScore}</span>
        </li>
        <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Relationship fit</span>
          <span className="font-medium">{evaluation.productScores.relationshipFitScore}</span>
        </li>
        <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Coverage</span>
          <span className="font-medium">{evaluation.productScores.coverageScore}</span>
        </li>
        <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Friction risk</span>
          <span className="font-medium">{evaluation.productScores.frictionRiskScore}</span>
        </li>
        <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Overall</span>
          <span className="font-medium">{evaluation.productScores.overallDecisionScore}</span>
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
  );
}

function SignalsSection({
  evaluation,
  chipsOnlyMode,
  signalTab,
  setSignalTab,
  signalsBlock,
}: {
  evaluation: Evaluation;
  chipsOnlyMode: boolean;
  signalTab: SignalTab;
  setSignalTab: (tab: SignalTab) => void;
  signalsBlock: Evaluation['self'] | false | null | undefined;
}) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">Signals</h2>
      {chipsOnlyMode && (
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Raw signal tables are shown for debugging, but chips above should be treated as the
          primary experience for this profile.
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
                  <tr key={key} className="border-b border-zinc-100 dark:border-zinc-800">
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
        </>
      )}
    </div>
  );
}
