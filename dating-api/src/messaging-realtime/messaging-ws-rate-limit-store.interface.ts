export interface WsRateLimitStore {
  consumeInboundSlot(sessionUserId: string): void | Promise<void>;
  resetForTests(): void | Promise<void>;
}
