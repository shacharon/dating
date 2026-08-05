/**
 * Pure helpers for HIGH-priority browse-match email selection (Sprint 43 Story 2).
 */

import { PRIORITY_HIGH_MIN } from '../me-profile/match-priority';

export type RankRowLike = {
  candidateProfileId: string;
  matchScore: number;
  hardBlocked: boolean;
};

export function isHighPriorityRankScore(score: number): boolean {
  return Number.isFinite(score) && score >= PRIORITY_HIGH_MIN;
}

/**
 * Newly HIGH = in new set (≥85, not hard-blocked) and was absent / below HIGH /
 * hard-blocked in prior ranks. Excludes blockedIds (PASS/BLOCK targets as profile ids).
 * Skips alreadyNotifiedIds. Picks highest score, then candidateProfileId asc.
 */
export function pickNewHighPriorityCandidate(args: {
  priorRows: RankRowLike[];
  newRows: RankRowLike[];
  excludedCandidateProfileIds: ReadonlySet<string>;
  alreadyNotifiedCandidateProfileIds: ReadonlySet<string>;
}): RankRowLike | null {
  const priorById = new Map(
    args.priorRows.map((r) => [r.candidateProfileId, r] as const),
  );

  const newlyHigh: RankRowLike[] = [];
  for (const row of args.newRows) {
    if (row.hardBlocked) continue;
    if (!isHighPriorityRankScore(row.matchScore)) continue;
    if (args.excludedCandidateProfileIds.has(row.candidateProfileId)) continue;
    if (args.alreadyNotifiedCandidateProfileIds.has(row.candidateProfileId)) {
      continue;
    }

    const prior = priorById.get(row.candidateProfileId);
    const wasNewlyHigh =
      prior == null ||
      prior.hardBlocked ||
      !isHighPriorityRankScore(prior.matchScore);
    if (!wasNewlyHigh) continue;
    newlyHigh.push(row);
  }

  if (newlyHigh.length === 0) return null;

  newlyHigh.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.candidateProfileId.localeCompare(b.candidateProfileId);
  });
  return newlyHigh[0] ?? null;
}

export const HIGH_PRIORITY_MATCH_EMAIL_SUBJECT =
  'High compatibility match on Piza';

export function buildHighPriorityMatchEmailBodies(args: {
  matchLabel: string;
  ageYears: number | null;
  matchScore: number;
  reason: string | null;
  opener: string | null;
  matchUrl: string;
  settingsUrl: string;
}): { textBody: string; htmlBody: string } {
  const agePart =
    args.ageYears != null && Number.isFinite(args.ageYears)
      ? `, ${Math.floor(args.ageYears)}`
      : '';
  const score = Math.round(args.matchScore);
  const reasonLine = args.reason?.trim() || null;
  const openerLine = args.opener?.trim() || null;

  const textParts = [
    `New high-compatibility match: ${args.matchLabel}${agePart} (${score}% compatible).`,
    reasonLine,
    openerLine ? `Suggested opener: "${openerLine}"` : null,
    `View profile: ${args.matchUrl}`,
    `Notification settings: ${args.settingsUrl}`,
  ].filter(Boolean);

  const openerHtml = openerLine
    ? `<p style="margin:16px 0;padding:12px 16px;background:#ecfdf5;border-left:3px solid #059669;color:#064e3b"><strong>Try this opener:</strong><br/><em>"${escapeHtml(openerLine)}"</em></p>`
    : '';
  const reasonHtml = reasonLine
    ? `<p>${escapeHtml(reasonLine)}</p>`
    : '';

  const htmlBody = [
    `<p>New high-compatibility match:</p>`,
    `<p><strong>${escapeHtml(args.matchLabel)}${escapeHtml(agePart)}</strong> (${score}% compatible).</p>`,
    reasonHtml,
    openerHtml,
    `<p><a href="${escapeHtml(args.matchUrl)}" style="display:inline-block;padding:12px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:6px">View profile</a></p>`,
    `<p style="font-size:12px;color:#71717a"><a href="${escapeHtml(args.settingsUrl)}">Update notification settings</a></p>`,
  ].join('\n');

  return { textBody: textParts.join('\n\n'), htmlBody };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
