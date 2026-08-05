/**
 * Human browse-card one-liner for matches.
 * Priority: shared interest → place → tension caution → score decide.
 * Sounds like a friend, not product UX. Deterministic, no LLM.
 */

export const LIST_TLDR_MAX_CHARS = 120;

export type BuildPlainMatchListTldrInput = {
  finalScore: number;
  positiveChips: readonly string[];
  /** e.g. "You both enjoy hiking, cooking." from explainability */
  sharedInterestNote?: string;
  /** Short place label for candidate (city), optional */
  candidatePlace?: string;
  /** Short place label for viewer (city), optional */
  viewerPlace?: string;
  /** Explainability tension chip label, optional */
  tensionChip?: string;
};

function normalizePlace(place: string | undefined): string | null {
  const t = place?.trim() ?? '';
  if (t.length <= 1) return null;
  return t.replace(/,\s*IL\s*$/i, '').trim() || null;
}

/** Pull hobby labels out of "You both enjoy hiking, cooking." */
function parseSharedInterestLabels(note: string): string[] {
  const m = note.match(/you both enjoy\s+(.+?)\.?$/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/_/g, ' '));
}

function interestOpener(sharedInterestNote: string): string {
  const labels = parseSharedInterestLabels(sharedInterestNote);
  if (labels.length >= 2) {
    return `You're both into ${labels[0]} and ${labels[1]} — ask about that.`;
  }
  if (labels.length === 1) {
    return `You're both into ${labels[0]} — ask about that first.`;
  }
  const note = sharedInterestNote.trim().replace(/\.$/, '');
  if (!note) return '';
  return `${note} — ask about that.`;
}

function placeOpener(
  viewerPlace: string,
  candidatePlace: string,
): string | null {
  const a = normalizePlace(viewerPlace);
  const b = normalizePlace(candidatePlace);
  if (!a || !b) return null;
  if (a.toLowerCase() === b.toLowerCase()) {
    return `You're both in ${a} — coffee wouldn't be hard.`;
  }
  return null;
}

function tensionLine(tensionChip: string): string {
  const t = tensionChip.trim().toLowerCase();
  return `Heads up on ${t} — read their profile before you write.`;
}

function decideLine(finalScore: number): string {
  if (finalScore >= 80) {
    return 'This one feels like a real match — say hello.';
  }
  if (finalScore >= 60) {
    return "There's something here — open their profile and see.";
  }
  if (finalScore >= 40) {
    return "Thin fit so far — only dig in if you're curious.";
  }
  return "Not much clicking yet — skip unless something pulls you in.";
}

/** Exported for unit tests — hard-cap helper. */
export function truncateListTldrLine(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

/**
 * One short human line for match list cards.
 */
export function buildPlainMatchListTldr(
  input: BuildPlainMatchListTldrInput,
): string {
  const shared = input.sharedInterestNote?.trim();
  let line: string;

  if (shared) {
    line = interestOpener(shared);
  } else {
    const place = placeOpener(
      input.viewerPlace ?? '',
      input.candidatePlace ?? '',
    );
    if (place) {
      line = place;
    } else if (input.tensionChip?.trim()) {
      line = tensionLine(input.tensionChip);
    } else {
      line = decideLine(input.finalScore);
    }
  }

  return truncateListTldrLine(line, LIST_TLDR_MAX_CHARS);
}
