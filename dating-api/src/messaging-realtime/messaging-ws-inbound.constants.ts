/** Per-user inbound socket event rate limit (subscribe / unsubscribe / future). */
export const WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW = 30;
export const WS_INBOUND_RATE_LIMIT_WINDOW_MS = 60_000;

/** Periodic session re-validation interval on open sockets. */
export const WS_SESSION_REVALIDATE_MS = 60_000;
