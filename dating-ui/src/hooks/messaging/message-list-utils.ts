import type { MessageDto } from '@/lib/conversations-api';

export function appendUniqueMessages(
  prev: MessageDto[],
  incoming: MessageDto[],
): MessageDto[] {
  const ids = new Set(prev.map((m) => m.id));
  const append = incoming.filter((m) => !ids.has(m.id));
  if (append.length === 0) return prev;
  return [...prev, ...append];
}
