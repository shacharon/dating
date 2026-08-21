import type { IMatchRepository } from './repositories/match.repository';

export async function countApprovedPhotosForProfile(
  matches: Pick<IMatchRepository, 'countApprovedPhotosForProfile'>,
  profileId: string,
): Promise<number> {
  return matches.countApprovedPhotosForProfile(profileId);
}

export async function viewerHasApprovedPhoto(
  matches: Pick<IMatchRepository, 'countApprovedPhotosForProfile'>,
  profileId: string,
): Promise<boolean> {
  return (await countApprovedPhotosForProfile(matches, profileId)) >= 1;
}

/** True when candidate profile has ≥1 APPROVED photo (browse eligibility). */
export async function candidateHasApprovedPhoto(
  matches: Pick<IMatchRepository, 'countApprovedPhotosForProfile'>,
  profileId: string,
): Promise<boolean> {
  return viewerHasApprovedPhoto(matches, profileId);
}
