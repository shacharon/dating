/**
 * Stable application error codes for logs and client payloads where applicable.
 * Do not rename values — CloudWatch queries and dashboards depend on them.
 */
export const ErrorCodes = {
  /** Google OIDC id-token login attempt started */
  AUTH_LOGIN_START: 'AUTH_LOGIN_START',
  /** Google OIDC id-token login completed and session cookie set */
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  /** Google OIDC id-token login did not complete (validation, Google, user rules, etc.) */
  AUTH_LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  /** Session cookie cleared and server-side revoke attempted */
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  /** {@link AuthGuard}: no valid session or user missing */
  AUTH_GUARD_UNAUTHORIZED: 'AUTH_GUARD_UNAUTHORIZED',

  /** Me profile: session missing or invalid on /api/v1/me/* */
  ME_PROFILE_UNAUTHORIZED: 'ME_PROFILE_UNAUTHORIZED',
  /** Me profile: GET when no row exists */
  ME_PROFILE_GET_NOT_FOUND: 'ME_PROFILE_GET_NOT_FOUND',
  /** Me profile: POST completed and row created */
  ME_PROFILE_CREATE_SUCCESS: 'ME_PROFILE_CREATE_SUCCESS',
  /** Me profile: POST when row already exists */
  ME_PROFILE_CREATE_CONFLICT: 'ME_PROFILE_CREATE_CONFLICT',
  /** Me profile: PATCH persisted */
  ME_PROFILE_PATCH_SUCCESS: 'ME_PROFILE_PATCH_SUCCESS',
  /** Me profile: body failed ValidationPipe */
  ME_PROFILE_VALIDATION_FAILED: 'ME_PROFILE_VALIDATION_FAILED',
  /** Me profile: unexpected persistence/runtime failure on create/patch */
  ME_PROFILE_SAVE_FAILED: 'ME_PROFILE_SAVE_FAILED',
  /** Me profile: POST /submit completed — status set to SUBMITTED */
  ME_PROFILE_SUBMIT_SUCCESS: 'ME_PROFILE_SUBMIT_SUCCESS',
  /** Me profile: POST /submit rejected because profile is in a non-submittable state */
  ME_PROFILE_SUBMIT_INVALID_STATE: 'ME_PROFILE_SUBMIT_INVALID_STATE',
  /** Me profile: POST /submit rejected because viewer has no approved photo */
  ME_PROFILE_PHOTO_REQUIRED: 'ME_PROFILE_PHOTO_REQUIRED',
  /** Me profile: POST /submit unexpected persistence failure */
  ME_PROFILE_SUBMIT_FAILED: 'ME_PROFILE_SUBMIT_FAILED',
  /** Me profile: analysis skipped — profile not found or not in SUBMITTED state */
  ME_PROFILE_ANALYSIS_SKIPPED: 'ME_PROFILE_ANALYSIS_SKIPPED',
  /** Me profile: status set to ANALYZING — LLM pipeline about to start */
  ME_PROFILE_ANALYSIS_START: 'ME_PROFILE_ANALYSIS_START',
  /** Me profile: analysis completed — status set to ANALYZED */
  ME_PROFILE_ANALYSIS_SUCCESS: 'ME_PROFILE_ANALYSIS_SUCCESS',
  /** Me profile: analysis failed — status set to FAILED */
  ME_PROFILE_ANALYSIS_FAILED: 'ME_PROFILE_ANALYSIS_FAILED',
  /** Me profile: GET latest UserProfileEvaluation succeeded (may be empty payload) */
  ME_PROFILE_ANALYSIS_LATEST_OK: 'ME_PROFILE_ANALYSIS_LATEST_OK',

  /** Me profile: GET /profile/matches — gender-filtered candidates returned */
  ME_PROFILE_MATCHES_OK: 'ME_PROFILE_MATCHES_OK',
  /** Me profile: GET /profile/matches — no UserProfile row for the authenticated viewer */
  ME_PROFILE_MATCHES_NO_PROFILE: 'ME_PROFILE_MATCHES_NO_PROFILE',

  /** Me matches: GET /me/matches — matches list returned (ready state) */
  ME_MATCHES_LIST_OK: 'ME_MATCHES_LIST_OK',
  /** Me matches: GET /me/matches — viewer profile not ready for matching (not found or not ANALYZED) */
  ME_MATCHES_LIST_NOT_READY: 'ME_MATCHES_LIST_NOT_READY',
  /** Me matches: GET /me/matches/:id — match detail returned */
  ME_MATCHES_DETAIL_OK: 'ME_MATCHES_DETAIL_OK',
  /** Sprint 22 — match narrative cache hit (no LLM) */
  ME_MATCHES_NARRATIVE_CACHE_HIT: 'ME_MATCHES_NARRATIVE_CACHE_HIT',
  /** Sprint 22 — match narrative cache miss before LLM */
  ME_MATCHES_NARRATIVE_CACHE_MISS: 'ME_MATCHES_NARRATIVE_CACHE_MISS',
  /** Sprint 22 — match narrative produced by LLM */
  ME_MATCHES_NARRATIVE_LLM_OK: 'ME_MATCHES_NARRATIVE_LLM_OK',
  /** Sprint 22 — match narrative used deterministic fallback (not cached) */
  ME_MATCHES_NARRATIVE_FALLBACK: 'ME_MATCHES_NARRATIVE_FALLBACK',
  /** Sprint 22 — LLM narrative persisted to cache */
  ME_MATCHES_NARRATIVE_CACHE_STORE_OK: 'ME_MATCHES_NARRATIVE_CACHE_STORE_OK',
  /** Sprint 22 — cache upsert failed after LLM success (narrative still returned) */
  ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL: 'ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL',
  /** Me matches: HG preference sourced from UserProfile legacy columns (UserProfilePreference row absent or hollow) */
  ME_MATCHES_HG_PREF_FALLBACK: 'ME_MATCHES_HG_PREF_FALLBACK',
  /**
   * Me matches: reciprocal partner-gender filter read `UserProfile.desiredPartnerGenders` JSON because
   * no `UserProfilePreference` row exists for that profile (`/api/v1/me/matches` only).
   */
  ME_MATCHES_PARTNER_GENDER_LEGACY_JSON:
    'ME_MATCHES_PARTNER_GENDER_LEGACY_JSON',
  /**
   * Sprint 16 Story 1 — per-dimension HG eligibility outcome counts (PASS/FAIL/UNKNOWN/
   * SKIPPED/SOFT_PASS) for one `/api/v1/me/matches` request, aggregated across every
   * candidate evaluated.
   */
  ME_MATCHES_HG_DIMENSION_OUTCOMES: 'ME_MATCHES_HG_DIMENSION_OUTCOMES',
  ME_MATCHES_HG_DEALBREAKER_OUTCOMES: 'ME_MATCHES_HG_DEALBREAKER_OUTCOMES',
  /** Me conversations: GET /me/conversations — list returned */
  ME_CONVERSATIONS_LIST_OK: 'ME_CONVERSATIONS_LIST_OK',
  /** Me conversations: GET /me/conversations/:id — detail returned */
  ME_CONVERSATIONS_DETAIL_OK: 'ME_CONVERSATIONS_DETAIL_OK',
  /** Sprint 2 Story 5 — soft unmatch on conversation. */
  ME_CONVERSATIONS_UNMATCH_OK: 'ME_CONVERSATIONS_UNMATCH_OK',
  /** Sprint 3 Story 1 — send message in conversation. */
  ME_CONVERSATIONS_MESSAGE_SEND_OK: 'ME_CONVERSATIONS_MESSAGE_SEND_OK',
  /** Sprint 3 Story 2 — list messages in conversation. */
  ME_CONVERSATIONS_MESSAGES_LIST_OK: 'ME_CONVERSATIONS_MESSAGES_LIST_OK',
  /** Sprint 3 Story 4 — mark conversation as read. */
  ME_CONVERSATIONS_MARK_READ_OK: 'ME_CONVERSATIONS_MARK_READ_OK',
  /** Sprint 3 Story 6 — message send rate limit exceeded. */
  ME_CONVERSATIONS_MESSAGE_RATE_LIMITED:
    'ME_CONVERSATIONS_MESSAGE_RATE_LIMITED',
  /** Sprint 3 Story 6 — profanity placeholder detected (log only). */
  ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED:
    'ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED',

  /** Sprint 42 Story 3 — opener lifecycle / send / reply tracking failed (best-effort). */
  OPENER_TRACKING_BEST_EFFORT_FAILED: 'OPENER_TRACKING_BEST_EFFORT_FAILED',
  /** Sprint 42 Story 3 — opener lifecycle endpoint accepted (always 204). */
  OPENER_LIFECYCLE_OK: 'OPENER_LIFECYCLE_OK',

  /** Sprint 4 Story 1 — messaging WebSocket connected. */
  MESSAGING_WS_CONNECT_OK: 'MESSAGING_WS_CONNECT_OK',
  /** Sprint 4 Story 1 — messaging WebSocket disconnected. */
  MESSAGING_WS_DISCONNECT_OK: 'MESSAGING_WS_DISCONNECT_OK',
  /** Sprint 4 Story 1 — messaging WebSocket handshake auth failed. */
  MESSAGING_WS_AUTH_FAILED: 'MESSAGING_WS_AUTH_FAILED',
  /** Sprint 4 Story 6 — conversation subscribe authorized. */
  MESSAGING_WS_SUBSCRIBE_OK: 'MESSAGING_WS_SUBSCRIBE_OK',
  /** Sprint 4 Story 6 — conversation subscribe denied. */
  MESSAGING_WS_SUBSCRIBE_DENIED: 'MESSAGING_WS_SUBSCRIBE_DENIED',
  /** Sprint 4 Story 6 — inbound socket event rate limit exceeded. */
  MESSAGING_WS_RATE_LIMITED: 'MESSAGING_WS_RATE_LIMITED',
  /** Sprint 4 Story 6 — session revoked/expired; socket disconnected. */
  MESSAGING_WS_SESSION_INVALIDATED: 'MESSAGING_WS_SESSION_INVALIDATED',
  /** Sprint 4 Story 2 — message.new publish failed (best-effort; HTTP send still OK). */
  MESSAGING_MESSAGE_NEW_PUBLISH_FAILED: 'MESSAGING_MESSAGE_NEW_PUBLISH_FAILED',

  /** Sprint 6 Story 1 — transactional email notifications. */
  EMAIL_MUTUAL_MATCH_SEND_OK: 'EMAIL_MUTUAL_MATCH_SEND_OK',
  EMAIL_MUTUAL_MATCH_SEND_FAILED: 'EMAIL_MUTUAL_MATCH_SEND_FAILED',
  EMAIL_MESSAGE_SEND_OK: 'EMAIL_MESSAGE_SEND_OK',
  EMAIL_MESSAGE_SEND_FAILED: 'EMAIL_MESSAGE_SEND_FAILED',
  EMAIL_SKIPPED_UNSUBSCRIBED: 'EMAIL_SKIPPED_UNSUBSCRIBED',
  EMAIL_SKIPPED_RECIPIENT_ONLINE: 'EMAIL_SKIPPED_RECIPIENT_ONLINE',
  EMAIL_SKIPPED_DEBOUNCED: 'EMAIL_SKIPPED_DEBOUNCED',
  EMAIL_SKIPPED_PROVIDER_DISABLED: 'EMAIL_SKIPPED_PROVIDER_DISABLED',
  EMAIL_UNSUBSCRIBE_OK: 'EMAIL_UNSUBSCRIBE_OK',
  EMAIL_UNSUBSCRIBE_INVALID: 'EMAIL_UNSUBSCRIBE_INVALID',
  EMAIL_PHOTO_REJECTION_SEND_OK: 'EMAIL_PHOTO_REJECTION_SEND_OK',
  EMAIL_PHOTO_REJECTION_SEND_FAILED: 'EMAIL_PHOTO_REJECTION_SEND_FAILED',

  /** Sprint 9 Story 4 — user report submitted. */
  USER_REPORT_CREATED: 'USER_REPORT_CREATED',
  USER_REPORT_OPS_EMAIL_OK: 'USER_REPORT_OPS_EMAIL_OK',
  USER_REPORT_OPS_EMAIL_FAILED: 'USER_REPORT_OPS_EMAIL_FAILED',

  /** Sprint 9 Story 5 — account deletion. */
  ACCOUNT_DELETE_SUCCESS: 'ACCOUNT_DELETE_SUCCESS',
  ACCOUNT_DELETE_PHOTO_STORAGE_FAILED: 'ACCOUNT_DELETE_PHOTO_STORAGE_FAILED',

  /** Sprint 10 Story 2 — admin photo moderation. */
  ADMIN_PHOTO_MODERATION_DECIDED: 'ADMIN_PHOTO_MODERATION_DECIDED',
  /** Sprint 19 Story 2 — ML / SLA photo moderation audit. */
  PHOTO_MODERATION_EVENT: 'PHOTO_MODERATION_EVENT',
  PHOTO_MODERATION_SLA_CAPACITY_ALERT: 'PHOTO_MODERATION_SLA_CAPACITY_ALERT',
  PHOTO_MODERATION_SLA_CAPACITY_SHORTAGE: 'PHOTO_MODERATION_SLA_CAPACITY_SHORTAGE',
  ADMIN_REPORT_STATUS_UPDATED: 'ADMIN_REPORT_STATUS_UPDATED',
  /** Sprint 30 Story 5 — admin content-violation unblock. */
  ADMIN_CONTENT_UNBLOCK: 'ADMIN_CONTENT_UNBLOCK',
  ADMIN_FORBIDDEN: 'ADMIN_FORBIDDEN',
  ADMIN_MATCH_QUALITY_SUMMARY_FETCHED: 'ADMIN_MATCH_QUALITY_SUMMARY_FETCHED',
  ADMIN_MATCH_QUALITY_AUDIT_FETCHED: 'ADMIN_MATCH_QUALITY_AUDIT_FETCHED',
  ADMIN_MATCH_QUALITY_EXPORT_FETCHED: 'ADMIN_MATCH_QUALITY_EXPORT_FETCHED',
  ADMIN_MATCH_QUALITY_COMPARE_FETCHED: 'ADMIN_MATCH_QUALITY_COMPARE_FETCHED',

  /** Sprint 10 Story 4 — match quality feedback upsert. */
  MATCH_FEEDBACK_UPSERTED: 'MATCH_FEEDBACK_UPSERTED',

  /** Sprint 10 Story 6 — new user signup attributed to referrer. */
  REFERRAL_SIGNUP_ATTRIBUTED: 'REFERRAL_SIGNUP_ATTRIBUTED',

  /** Sprint 30 — content moderation (OpenAI Moderation API). */
  CONTENT_MODERATION_CHECK: 'CONTENT_MODERATION_CHECK',
  CONTENT_MODERATION_FAIL_OPEN: 'CONTENT_MODERATION_FAIL_OPEN',
  CONTENT_MODERATION_FLAGGED: 'CONTENT_MODERATION_FLAGGED',
  CONTENT_MODERATION_DATING_POLICY: 'CONTENT_MODERATION_DATING_POLICY',
  CONTENT_MODERATION_NEAR_MISS: 'CONTENT_MODERATION_NEAR_MISS',
  CONTENT_VIOLATION_RECORDED: 'CONTENT_VIOLATION_RECORDED',
  CONTENT_USER_BLOCKED: 'CONTENT_USER_BLOCKED',
  CONTENT_PROFILE_EDIT_BLOCKED: 'CONTENT_PROFILE_EDIT_BLOCKED',
  CONTENT_MESSAGING_MUTED: 'CONTENT_MESSAGING_MUTED',
  CONTENT_USER_MUTED: 'CONTENT_USER_MUTED',
  CONTENT_MUTES_EXPIRED: 'CONTENT_MUTES_EXPIRED',

  /** Sprint 40 — Prisma query duration >= PRISMA_SLOW_QUERY_MS (structured trace). */
  PRISMA_SLOW_QUERY: 'PRISMA_SLOW_QUERY',
  /** Sprint 40 — Prisma query duration >= PRISMA_VERY_SLOW_QUERY_MS (structured error, no stack). */
  PRISMA_VERY_SLOW_QUERY: 'PRISMA_VERY_SLOW_QUERY',

  /** Generic HTTP layer */
  HTTP_EXCEPTION: 'HTTP_EXCEPTION',
  HTTP_UNHANDLED: 'HTTP_UNHANDLED',
  /** Process-level (no HTTP request) */
  PROCESS_UNCAUGHT_EXCEPTION: 'PROCESS_UNCAUGHT_EXCEPTION',
  PROCESS_UNHANDLED_REJECTION: 'PROCESS_UNHANDLED_REJECTION',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
