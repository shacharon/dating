/**
 * Domain layer — types and repository interfaces only.
 * No framework decorators; safe for use across layers.
 */

export * from './users/user.types';
export * from './matches/match.types';
export * from './scoring/product-scores.types';
export * from './deriveContext';
export * from './dealbreakers';
export * from './relationshipBalance';
export * from './repositories/user-profiles.repository';
export * from './repositories/matches.repository';
