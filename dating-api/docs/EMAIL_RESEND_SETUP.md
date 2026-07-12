# Email setup (Resend + your domain)

Transactional email for **mutual match** and **new message (offline only)**. Provider: [Resend](https://resend.com).

---

## 1. Buy domain

Use the same domain (or subdomain) for:

- App: `https://your-dating-domain.com` → `APP_PUBLIC_URL`
- Email From: `notifications@your-dating-domain.com` → `EMAIL_FROM`

---

## 2. Resend

1. Create account at [resend.com](https://resend.com).
2. **Domains** → Add `your-dating-domain.com` (or `mail.your-dating-domain.com`).
3. Add DNS records Resend shows (SPF, DKIM, etc.) at your registrar.
4. Wait until domain status is **Verified**.
5. **API Keys** → Create key → copy `re_...` → `RESEND_API_KEY`.

---

## 3. `dating-api/.env` (production)

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Piza <notifications@your-dating-domain.com>
APP_PUBLIC_URL=https://your-dating-domain.com
EMAIL_UNSUBSCRIBE_SECRET=<long-random-secret-min-32-chars>
EMAIL_MESSAGE_DEBOUNCE_MINUTES=15
```

| Variable | Required when sending | Notes |
|----------|----------------------|--------|
| `EMAIL_PROVIDER` | yes | Must be `resend` |
| `RESEND_API_KEY` | yes | From Resend dashboard |
| `EMAIL_FROM` | yes | Must use **verified** domain in Resend |
| `APP_PUBLIC_URL` | yes | Deep links in emails + unsubscribe URL |
| `EMAIL_UNSUBSCRIBE_SECRET` | yes | HMAC for unsubscribe tokens |
| `EMAIL_MESSAGE_DEBOUNCE_MINUTES` | no | Default `15` |

**Local dev:** omit `EMAIL_PROVIDER` or set `disabled` — no real sends.

---

## 4. What gets sent

| Event | When |
|-------|------|
| Mutual match | Both users, when match is created |
| New message | Recipient **offline** (no WebSocket), max 1 per conversation per 15 min |

Recipient **online** in app → **no email** (in-app WS only).

---

## 5. Smoke test (after deploy)

1. Two users like each other → both inboxes get match email.
2. User B closes app → User A sends message → B gets message email.
3. User B online in app → A sends → B gets **no** email.
4. Click unsubscribe in email → `emailNotificationsEnabled = false` for that user.

Check API logs for `EMAIL_MUTUAL_MATCH_SEND_OK`, `EMAIL_MESSAGE_SEND_OK`, or `EMAIL_SKIPPED_*`.

---

## 6. Related stories

| Sprint | Status |
|--------|--------|
| Sprint 6 Story 1 — Email | **Done** (code); operator smoke pending |
| Sprint 8 — In-app toast / nav / prefs | **Planned** (specs ready, not built) |
