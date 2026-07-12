export { conversationPhotoSrc as matchPhotoSrc } from '@/lib/conversations-api';

/** First visible character for photo placeholder initials. */
export function matchPhotoPlaceholderInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}
