export const ProductAnalyticsEvents = {
  PROFILE_SUBMITTED: 'profile.submitted',
  MATCH_LIST_VIEWED: 'match.list_viewed',
  MATCH_ACTION: 'match.action',
  MATCH_MUTUAL_CREATED: 'match.mutual_created',
  CONVERSATION_OPENED: 'conversation.opened',
  MESSAGE_SENT: 'message.sent',
  MESSAGING_WS_CONNECTED: 'messaging.ws_connected',
  MESSAGING_WS_DISCONNECTED: 'messaging.ws_disconnected',
} as const;

export type ProductAnalyticsEventName =
  (typeof ProductAnalyticsEvents)[keyof typeof ProductAnalyticsEvents];

export type ProductAnalyticsProperties = Record<
  string,
  string | number | boolean
>;

export type ProductAnalyticsLogLine = {
  timestamp: string;
  logKind: 'product_analytics';
  service: string;
  env: string;
  event: ProductAnalyticsEventName;
  userId: string;
  properties: ProductAnalyticsProperties;
  requestId?: string | null;
};
