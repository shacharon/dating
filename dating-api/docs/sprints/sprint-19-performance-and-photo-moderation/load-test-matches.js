/**
 * Sprint 19 Story 1 — match list load test (k6).
 * Staging only. Do not run against production.
 *
 * Example:
 *   k6 run -e BASE_URL=https://staging-api.example -e SESSION_COOKIE='connect.sid=...' \
 *     dating-api/docs/sprints/sprint-19-performance-and-photo-moderation/load-test-matches.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';
const TOKEN = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/me/matches?limit=20`, {
    headers: { Cookie: TOKEN },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'has body': (r) => !!(r.body && r.body.length > 2),
  });
  sleep(1);
}
