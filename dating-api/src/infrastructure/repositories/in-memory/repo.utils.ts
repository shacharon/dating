/**
 * Small helpers for in-memory repositories (ids, timestamps, normalization).
 * Pure functions only; no framework dependencies.
 */

import type { UserId } from '../../../domain/users/user.types';
import type { MatchId } from '../../../domain/matches/match.types';

let userIdCounter = 0;
let matchIdCounter = 0;

export function nextUserId(): UserId {
  userIdCounter += 1;
  return `user_${userIdCounter}`;
}

export function nextMatchId(): MatchId {
  matchIdCounter += 1;
  return `match_${matchIdCounter}`;
}

export function now(): Date {
  return new Date();
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
