export type AuthSessionRevokedHandler = () => void | Promise<void>;

let handler: AuthSessionRevokedHandler | null = null;

export function registerAuthSessionRevokedHandler(
  next: AuthSessionRevokedHandler | null,
): void {
  handler = next;
}

export async function notifyAuthSessionRevoked(): Promise<void> {
  await handler?.();
}

export function resetAuthSessionRevocationForTests(): void {
  handler = null;
}
