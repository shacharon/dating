export interface StoryVoiceDraftRateLimitStore {
  consume(userId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
  isUsingRedisStore(): boolean;
}
