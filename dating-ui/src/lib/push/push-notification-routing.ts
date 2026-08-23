export type PushNotificationData = {
  type?: string;
  conversationId?: string;
};

/** Map FCM data payload from Sprint 67 backend to an in-app route. */
export function resolvePushNotificationPath(
  data: PushNotificationData | undefined,
): string {
  const id = data?.conversationId?.trim();
  if (!id) {
    return "/dating/conversations";
  }
  if (data?.type === "mutual_match") {
    return `/dating/me-matches/${encodeURIComponent(id)}`;
  }
  if (data?.type === "new_message") {
    return `/dating/conversations/${encodeURIComponent(id)}`;
  }
  return "/dating/conversations";
}
