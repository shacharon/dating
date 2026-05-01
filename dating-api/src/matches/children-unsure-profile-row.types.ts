/** DB row shape needed for Holy Grail directional eval (matches Prisma select). */
export interface ChildrenUnsureProfileRow {
  readonly id: string;
  readonly aboutMe?: string;
  readonly aboutPartner?: string | null;
  readonly holyGrailStructuredFacts: unknown;
  readonly holyGrailStructuredPreferences: unknown;
  readonly extractionV2?: {
    interests_self: string[];
    interests: string[];
    lifestyleTraits: string[];
  } | null;
}
