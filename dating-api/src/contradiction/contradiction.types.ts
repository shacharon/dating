/**
 * Contradiction detection between two raw profiles.
 * Returns flags and reasoning.
 */

export const CONTRADICTION_FLAGS = [
  'stability_nomad',
  'family_vs_freedom',
  'depth_vs_surface',
  'commitment_vs_exploration',
] as const;

export type ContradictionFlag = (typeof CONTRADICTION_FLAGS)[number];

export interface RawProfileInput {
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

export interface ContradictionDetectionResult {
  flags: ContradictionFlag[];
  reasoning: string;
}
