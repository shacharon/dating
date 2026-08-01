import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';
import type {
  ConversationLastMessageDto,
  ConversationListItemDto,
  ConversationOtherUserDto,
} from '@/lib/conversations-api';

export const CONVERSATION_PREVIEW_MAX_CHARS = 60;

export function normalizePreviewText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function truncatePreviewText(
  text: string,
  max: number = CONVERSATION_PREVIEW_MAX_CHARS,
): string {
  const normalized = normalizePreviewText(text);
  const chars = [...normalized];
  if (chars.length <= max) return normalized;
  return `${chars.slice(0, max).join('')}…`;
}

export function formatConversationPreview(
  lastMessage: ConversationLastMessageDto | null | undefined,
  currentUserId: string | null | undefined,
  copy: Pick<AppCopySchema['conversations']['list'], 'youPrefix' | 'noMessagesYet'>,
): string {
  if (!lastMessage) return copy.noMessagesYet;
  const truncated = truncatePreviewText(lastMessage.text);
  if (!truncated) return copy.noMessagesYet;
  if (currentUserId && lastMessage.senderId === currentUserId) {
    return `${copy.youPrefix}${truncated}`;
  }
  return truncated;
}

function metaParts(
  gender: string | null,
  ageYears: number | null,
  locationLabel: string | null,
): string[] {
  return [
    gender,
    ageYears != null ? `${ageYears}y` : null,
    locationLabel,
  ].filter((part): part is string => Boolean(part));
}

export function conversationPrimaryLabel(
  otherUser: ConversationOtherUserDto,
): string {
  const nickname = otherUser.nickname?.trim();
  if (nickname) return nickname;
  return metaParts(
    otherUser.gender,
    otherUser.ageYears,
    otherUser.locationLabel,
  ).join(' · ');
}

export function conversationSecondaryMeta(
  otherUser: ConversationOtherUserDto,
): string | null {
  if (!otherUser.nickname?.trim()) return null;
  const meta = metaParts(
    otherUser.gender,
    otherUser.ageYears,
    otherUser.locationLabel,
  ).join(' · ');
  return meta || null;
}

function formatTimeOfDay(date: Date, locale: AppLocale): string {
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMatchedAt(
  matchedAt: string,
  format: AppCopySchema['conversations']['format'],
  locale: AppLocale,
): string {
  const date = new Date(matchedAt);
  if (Number.isNaN(date.getTime())) return matchedAt;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) {
    return format.matchedTodayAt(formatTimeOfDay(date, locale));
  }
  if (diffDays === 1) return format.matchedYesterday;
  if (diffDays < 7) return format.matchedDaysAgo(diffDays);
  return format.matchedOn(
    date.toLocaleDateString(locale, { dateStyle: 'medium' }),
  );
}

export function formatMatchedOnDate(
  matchedAt: string,
  format: AppCopySchema['conversations']['format'],
  locale: AppLocale,
): string {
  const date = new Date(matchedAt);
  if (Number.isNaN(date.getTime())) return matchedAt;
  return format.matchedOn(
    date.toLocaleDateString(locale, { dateStyle: 'medium' }),
  );
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Whole calendar days between `earlier` and `later` (local), ignoring clock time. */
function calendarDayDiff(earlier: Date, later: Date): number {
  const a = new Date(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatMessageTime(
  createdAt: string,
  format: AppCopySchema['conversations']['format'],
  locale: AppLocale,
): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return format.justNow;
  if (diffMin < 60) return format.minutesAgo(diffMin);

  const time = formatTimeOfDay(date, locale);
  if (isSameCalendarDay(date, now)) return time;

  const dayDiff = calendarDayDiff(date, now);
  if (dayDiff === 1) return format.yesterdayAt(time);

  if (dayDiff >= 2 && dayDiff <= 6) {
    const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
    return `${weekday}, ${time}`;
  }

  return `${date.toLocaleDateString(locale, { dateStyle: 'medium' })} ${time}`;
}

export function conversationListItemLabel(item: ConversationListItemDto): string {
  return conversationPrimaryLabel(item.otherUser);
}
