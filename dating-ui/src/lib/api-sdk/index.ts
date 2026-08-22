import * as conversations from './conversations';
import * as matches from './matches';
import * as profile from './profile';

export const datingApi = {
  matches,
  conversations,
  profile,
} as const;

export type DatingApiClient = typeof datingApi;

export * from './matches';
export * from './conversations';
export * from './profile';
