export function withChipsBody(
  finalScore: number,
  chipsJoined: string,
  variant: number,
  chipCount: number,
): string {
  const p = chipCount >= 2;
  const i = variant % 3;
  if (finalScore >= 80) {
    if (i === 0) {
      return `Clearest fit shows up around ${chipsJoined}; overall this reads as a strong, clear match.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} are where you line up most convincingly—a strong match overall.`
        : `${chipsJoined} is where you line up most convincingly—a strong match overall.`;
    }
    return `You both trend together on ${chipsJoined}, which supports a clear overall fit.`;
  }
  if (finalScore >= 60) {
    if (i === 0) {
      return `Clearest fit shows up around ${chipsJoined}; overall this reads as a solid, good fit.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} are where your profiles align most; the overall read is solid.`
        : `${chipsJoined} is where your profiles align most; the overall read is solid.`;
    }
    return `You both trend together on ${chipsJoined}—a solid match, not a fluke.`;
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return p
        ? `The match is mixed overall, but ${chipsJoined} show moderate areas of overlap.`
        : `The match is mixed overall, but ${chipsJoined} shows a moderate area of overlap.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} stand out for moderate alignment; the rest of the profile mix is uneven.`
        : `${chipsJoined} stands out as a moderate alignment; the rest of the profile mix is uneven.`;
    }
    return `You share real overlap on ${chipsJoined}, even though the overall picture stays moderate.`;
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return p
        ? `There's only partial overlap so far—${chipsJoined} are the main places where some alignment shows up.`
        : `There's only partial overlap so far—${chipsJoined} is the main place some alignment shows up.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} capture a partial fit; elsewhere the signals look thin or conflicting.`
        : `${chipsJoined} captures a partial fit; elsewhere the signals look thin or conflicting.`;
    }
    return `A few signals converge on ${chipsJoined}, but overall this still reads as a partial match.`;
  }
  if (i === 0) {
    return p
      ? `Overall alignment looks limited; ${chipsJoined} are among the few clearer touchpoints.`
      : `Overall alignment looks limited; ${chipsJoined} is one of the few clearer touchpoints.`;
  }
  if (i === 1) {
    return p
      ? `${chipsJoined} hint at narrow pockets of overlap in an otherwise weak match.`
      : `${chipsJoined} hints at a narrow pocket of overlap in an otherwise weak match.`;
  }
  return p
    ? `The fit is weak overall—${chipsJoined} are about the clearest threads to point to.`
    : `The fit is weak overall—${chipsJoined} is about the clearest thread to point to.`;
}

export function fallbackHintsBody(
  finalScore: number,
  hintsJoined: string,
  variant: number,
  hintCount: number,
): string {
  const hp = hintCount >= 2;
  const i = variant % 2;
  if (finalScore >= 80) {
    if (i === 0) {
      return `Several dimensions land in a good-not-great band—especially ${hintsJoined}—while the headline match still reads strong overall.`;
    }
    return `There is meaningful alignment around ${hintsJoined}; taken together with the rest of the signals, the overall fit reads strong.`;
  }
  if (finalScore >= 60) {
    if (i === 0) {
      return `Mid-level signal around ${hintsJoined} helps anchor a solid overall fit, even if nothing hit the top highlight tier.`;
    }
    return `Quiet alignment around ${hintsJoined} adds weight to a solid match—steady rather than flashy.`;
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return `You see moderate signal around ${hintsJoined}; the overall match stays mixed but not empty.`;
    }
    return `Some alignment clusters around ${hintsJoined}, which keeps the overall read moderate rather than sharp.`;
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return hp
        ? `Only partial overlap shows up so far—${hintsJoined} are the main places you can point to for some shared signal.`
        : `Only partial overlap shows up so far—${hintsJoined} is the main place you can point to for some shared signal.`;
    }
    return `A partial fit surfaces around ${hintsJoined}; elsewhere the picture stays thin.`;
  }
  if (i === 0) {
    return hp
      ? `Overall fit looks limited; ${hintsJoined} are among the few dimensions with any clear shared signal.`
      : `Overall fit looks limited; ${hintsJoined} is one of the few dimensions with any clear shared signal.`;
  }
  return hp
    ? `Weak alignment overall—${hintsJoined} are narrow lanes where anything lines up at all.`
    : `Weak alignment overall—${hintsJoined} is a narrow lane where anything lines up at all.`;
}

export function emptyBody(finalScore: number, variant: number): string {
  const i = variant % 2;
  if (finalScore >= 60) {
    if (i === 0) {
      return 'The picture is mixed—no single lane reads as an obvious headline strength yet, so this deserves a slower read.';
    }
    return 'Signals are uneven; nothing jumps out as a clear shared anchor, even though the overall score still has room to breathe.';
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return 'The story stays moderate: no clear shared headline yet, and the mix feels uneven.';
    }
    return 'Overlap is patchy—hard to name one convincing shared lane from what is on the page.';
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return 'Only partial signal shows through; nothing is reading as a convincing shared story yet.';
    }
    return 'The match looks thin on obvious common ground—mostly partial hints rather than a clear fit.';
  }
  if (i === 0) {
    return 'Overall alignment looks weak; nothing is surfacing as a believable shared strength.';
  }
  return 'Signals stay cautious and limited—this one reads as a weak fit on what we can see.';
}

export function tensionSuffix(tensionChip: string, variant: number): string {
  const t = tensionChip.toLowerCase();
  if (variant % 2 === 0) {
    return ` Main tension: ${t}.`;
  }
  return ` The friction point to watch is ${t}.`;
}
