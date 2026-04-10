/** DB row shape needed for Holy Grail directional eval (matches Prisma select). */
export interface ChildrenUnsureProfileRow {
  readonly id: string;
  readonly aboutMe?: string;
  readonly aboutPartner?: string | null;
  readonly holyGrailStructuredFacts: unknown;
  readonly holyGrailStructuredPreferences: unknown;
  readonly extractionV2: {
    interests_self: string[];
    interests: string[];
    lifestyleTraits: string[];
  } | null;
  /**
   * When loaded (see `CHILDREN_UNSURE_PROFILE_ROW_SELECT`), self row includes HG ranking typed columns
   * (`HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`), same as `PrismaHolyGrailProfileSourceRepository`.
   */
  readonly signalSnapshots?: {
    readonly lifestylePace: number | null;
    readonly conflictStyle: number | null;
    readonly hgRankingDailyRhythm: string | null;
    readonly hgRankingAutonomyTogetherness: string | null;
    readonly hgRankingInterestsTop: string[];
  }[];
}
