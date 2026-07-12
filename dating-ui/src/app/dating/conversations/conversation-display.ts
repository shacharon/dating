import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';
import type { ConversationListItemDto, ConversationOtherUserDto } from '@/lib/conversations-api';

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

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return format.yesterdayAt(time);

  return `${date.toLocaleDateString(locale, { dateStyle: 'medium' })} ${time}`;
}

export function conversationListItemLabel(item: ConversationListItemDto): string {
  return conversationPrimaryLabel(item.otherUser);
}
