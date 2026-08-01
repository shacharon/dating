export interface MessageRateLimitStore {
  consumeSendSlot(sessionUserId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
}
