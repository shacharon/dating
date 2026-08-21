/**
 * Prisma selects for match candidate hydrate — adapter-only.
 * Do not import from Success services / port files.
 */
export const CANDIDATE_SELECT_LIST = {
  id: true,
  userId: true,
  name: true,
  nickname: true,
  birthDate: true,
  gender: true,
  desiredPartnerGenders: true,
  locationLabel: true,
  analyzedAt: true,
  updatedAt: true,
  childrenStatus: true,
  wantsChildren: true,
  smokingFrequency: true,
  alcoholUse: true,
  education: true,
  religion: true,
  preference: true,
  signals: {
    select: { signalKey: true, signalValue: true, evalVersion: true },
  },
  interests: {
    select: { tag: true, rank: true, evalVersion: true },
    orderBy: { rank: 'asc' as const },
  },
  photos: {
    where: { status: 'APPROVED' as const },
    select: { id: true, isPrimary: true, storageKey: true },
  },
  _count: { select: { evaluations: true } },
} as const;

/** Full select for getById / assertMatchCandidateVisible (includes about*). */
export const CANDIDATE_SELECT_DETAIL = {
  id: true,
  userId: true,
  name: true,
  nickname: true,
  status: true,
  birthDate: true,
  gender: true,
  desiredPartnerGenders: true,
  city: true,
  country: true,
  locationLabel: true,
  aboutMe: true,
  aboutPartner: true,
  aboutRelationship: true,
  analyzedAt: true,
  updatedAt: true,
  childrenStatus: true,
  wantsChildren: true,
  smokingFrequency: true,
  alcoholUse: true,
  education: true,
  religion: true,
  preference: true,
  signals: {
    select: { signalKey: true, signalValue: true, evalVersion: true },
  },
  interests: {
    select: { tag: true, rank: true, evalVersion: true },
    orderBy: { rank: 'asc' as const },
  },
  photos: {
    where: { status: 'APPROVED' as const },
    select: { id: true, isPrimary: true, storageKey: true },
  },
  _count: { select: { evaluations: true } },
  user: { select: { deletedAt: true } },
} as const;
