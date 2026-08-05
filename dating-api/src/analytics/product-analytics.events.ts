export const ProductAnalyticsEvents = {
  PROFILE_SUBMITTED: 'profile.submitted',
  MATCH_LIST_VIEWED: 'match.list_viewed',
  MATCH_ACTION: 'match.action',
  MATCH_MUTUAL_CREATED: 'match.mutual_created',
  CONVERSATION_OPENED: 'conversation.opened',
  MESSAGE_SENT: 'message.sent',
  OPENER_DISPLAYED: 'opener.displayed',
  OPENER_USED: 'opener.used',
  MESSAGING_WS_CONNECTED: 'messaging.ws_connected',
  MESSAGING_WS_DISCONNECTED: 'messaging.ws_disconnected',
  USER_REPORTED: 'user.reported',
  ACCOUNT_DELETED: 'account.deleted',
  PROFILE_PHOTO_GATE_BLOCKED: 'profile.photo_gate_blocked',
  PHOTO_MODERATION_PENDING: 'photo.moderation_pending',
  PHOTO_MODERATION_DECIDED: 'photo.moderation_decided',
  REPORT_OPS_RESOLVED: 'report.ops_resolved',
  MATCH_FEEDBACK: 'match.feedback',
  REFERRAL_LANDING_VIEWED: 'referral.landing_viewed',
  REFERRAL_SIGNUP_COMPLETED: 'referral.signup_completed',
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
