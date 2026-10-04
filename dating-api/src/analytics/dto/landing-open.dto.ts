import { IsIn } from 'class-validator';

/** Known tracked landing prefixes (e.g. /reg). Extend when adding links. */
export const LANDING_ENTRIES = ['reg'] as const;
export type LandingEntry = (typeof LANDING_ENTRIES)[number];

export class LandingOpenDto {
  @IsIn(LANDING_ENTRIES)
  entry!: LandingEntry;
}
