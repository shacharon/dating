#!/usr/bin/env bash
# Sprint 20 Story 5 — cloud `dev` smoke (API health + realtime Redis adapter).
#
# Usage:
#   BASE_URL=https://dev.example.tld ./scripts/smoke-cloud-dev.sh
#   ./scripts/smoke-cloud-dev.sh https://dev.example.tld
#   BASE_URL=https://dev.example.tld SESSION_COOKIE='dating_session=...' ./scripts/smoke-cloud-dev.sh
#
# Env / args:
#   BASE_URL          Public origin (ALB / CloudFront). Trailing slash stripped.
#                     Positional $1 overrides env when set.
#   SESSION_COOKIE    Optional Cookie header value for authenticated probes
#                     (e.g. dating_session=...). When set, also checks
#                     GET /api/v1/auth/me expects 200.
#   REQUIRE_REDIS_ADAPTER  Default 1. Set 0 to only assert redisAdapter is boolean
#                     (local/dev without ElastiCache). Cloud gate must leave default.
#   CURL_CONNECT_TIMEOUT   Seconds (default 10).
#
# Exit 0 = all automated checks passed; exit 1 = failure (CI must fail deploy).
#
# Manual e2e (not automated here) — see VERIFICATION_CHECKLIST.md:
#   auth cookie Secure, photos/S3, Rekognition moderation, analysis queue,
#   chat multi-instance WS, k6 p95, CloudWatch/Sentry.
#
# Windows: Git Bash or WSL. Requires curl + python3 or python (stdlib JSON parse).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BASE_URL="${1:-${BASE_URL:-}}"
SESSION_COOKIE="${SESSION_COOKIE:-}"
REQUIRE_REDIS_ADAPTER="${REQUIRE_REDIS_ADAPTER:-1}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-10}"
PY_BIN="$(command -v python3 || command -v python || true)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

pass() {
  echo -e "${GREEN}PASS${NC}: $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo -e "${RED}FAIL${NC}: $1"
  if [ -n "${2:-}" ]; then
    echo "      $2"
  fi
  FAILED=$((FAILED + 1))
}

if [ -z "$BASE_URL" ]; then
  echo "Usage: BASE_URL=https://dev.example.tld $0"
  echo "   or: $0 https://dev.example.tld"
  echo ""
  echo "No live BASE_URL — cannot run cloud smoke. Set DEV_BASE_URL/BASE_URL after Story 02 apply + Story 04 deploy."
  exit 1
fi

# Trim trailing slash
BASE_URL="${BASE_URL%/}"

echo "=========================================="
echo "Sprint 20 — cloud smoke (dev)"
echo "=========================================="
echo "BASE_URL:              $BASE_URL"
echo "SESSION_COOKIE:        $([ -n "$SESSION_COOKIE" ] && echo 'set' || echo 'unset (auth probe skipped)')"
echo "REQUIRE_REDIS_ADAPTER: $REQUIRE_REDIS_ADAPTER"
echo "Date (UTC):            $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Repo:                  $REPO_ROOT"
echo ""

curl_get() {
  local url="$1"
  shift
  curl -sS -f --connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time 30 "$@" "$url"
}

curl_code() {
  local url="$1"
  shift
  curl -sS -o /dev/null -w "%{http_code}" --connect-timeout "$CURL_CONNECT_TIMEOUT" --max-time 30 "$@" "$url" || echo "000"
}

# --- 1) GET /health ---
echo "------------------------------------------"
echo "1) GET /health"
echo "------------------------------------------"
HEALTH_URL="$BASE_URL/health"
HEALTH_BODY=""
HEALTH_CODE="$(curl_code "$HEALTH_URL")"
if [ "$HEALTH_CODE" != "200" ]; then
  fail "GET /health HTTP $HEALTH_CODE (expected 200)" "url=$HEALTH_URL"
else
  if HEALTH_BODY="$(curl_get "$HEALTH_URL" 2>/dev/null)"; then
    if [ -z "$PY_BIN" ]; then
      fail "python3/python required to parse /health JSON"
    elif echo "$HEALTH_BODY" | "$PY_BIN" -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("ok") is True and d.get("service")=="dating-api" else 1)'; then
      pass "GET /health = 200 + ok/service shape"
      echo "   $HEALTH_BODY"
    else
      fail "GET /health body shape" "expected {ok:true, service:dating-api}; got: $HEALTH_BODY"
    fi
  else
    fail "GET /health body fetch failed after 200"
  fi
fi
echo ""

# --- 2) GET /health/realtime ---
echo "------------------------------------------"
echo "2) GET /health/realtime (Redis adapter)"
echo "------------------------------------------"
RT_URL="$BASE_URL/health/realtime"
RT_CODE="$(curl_code "$RT_URL")"
if [ "$RT_CODE" != "200" ]; then
  fail "GET /health/realtime HTTP $RT_CODE (expected 200)" "url=$RT_URL"
else
  RT_BODY="$(curl_get "$RT_URL" 2>/dev/null || true)"
  if [ -z "$RT_BODY" ]; then
    fail "GET /health/realtime empty body"
  else
    # Expected shape (health.controller + MessagingRealtimeHealthService):
    # {
    #   "ok": true,
    #   "service": "dating-api",
    #   "ts": "...",
    #   "messaging": {
    #     "namespace": "/ws/messaging",
    #     "socketIoPath": "/socket.io",
    #     "redisAdapter": true,   # must be true on cloud (L2)
    #     "wsRateLimitRedis": true|false,
    #     "sessionCookieName": "dating_session"
    #   }
    # }
    if [ -z "$PY_BIN" ]; then
      fail "python3/python required to parse /health/realtime JSON"
      PARSE_OUT=""
    else
      PARSE_OUT="$(echo "$RT_BODY" | REQUIRE_REDIS_ADAPTER="$REQUIRE_REDIS_ADAPTER" "$PY_BIN" -c '
import json, os, sys
body = sys.stdin.read()
require = os.environ.get("REQUIRE_REDIS_ADAPTER", "1") != "0"
try:
    d = json.loads(body)
except Exception as e:
    print("PARSE_ERROR|" + str(e))
    raise SystemExit(0)
errs = []
if d.get("ok") is not True:
    errs.append("ok !== true")
if d.get("service") != "dating-api":
    errs.append("service != dating-api")
m = d.get("messaging") or {}
if m.get("namespace") != "/ws/messaging":
    errs.append("namespace expected /ws/messaging got %r" % (m.get("namespace"),))
if m.get("socketIoPath") != "/socket.io":
    errs.append("socketIoPath expected /socket.io got %r" % (m.get("socketIoPath"),))
if not isinstance(m.get("redisAdapter"), bool):
    errs.append("redisAdapter must be boolean")
elif require and m.get("redisAdapter") is not True:
    errs.append("redisAdapter must be true on cloud (got false — Redis adapter not bound; L2)")
if not (m.get("sessionCookieName") or "").strip():
    errs.append("sessionCookieName missing")
if errs:
    print("FAIL|" + "; ".join(errs))
else:
    print("OK|redisAdapter=%s wsRateLimitRedis=%s sessionCookieName=%s" % (
        m.get("redisAdapter"), m.get("wsRateLimitRedis"), m.get("sessionCookieName")))
' || true)"
    fi
    case "$PARSE_OUT" in
      OK\|*)
        pass "GET /health/realtime shape + redisAdapter"
        echo "   ${PARSE_OUT#OK|}"
        echo "   $RT_BODY"
        ;;
      FAIL\|*)
        fail "GET /health/realtime checks" "${PARSE_OUT#FAIL|}"
        echo "   $RT_BODY"
        ;;
      PARSE_ERROR\|*)
        fail "GET /health/realtime JSON parse" "${PARSE_OUT#PARSE_ERROR|}"
        echo "   $RT_BODY"
        ;;
      *)
        fail "GET /health/realtime unexpected parser output" "$PARSE_OUT"
        ;;
    esac
  fi
fi
echo ""

# --- 3) Optional authenticated probe ---
echo "------------------------------------------"
echo "3) Optional auth probe (SESSION_COOKIE)"
echo "------------------------------------------"
if [ -z "$SESSION_COOKIE" ]; then
  echo -e "${YELLOW}SKIP${NC}: SESSION_COOKIE unset — manual auth e2e still required (checklist §2)"
else
  ME_URL="$BASE_URL/api/v1/auth/me"
  ME_CODE="$(curl_code "$ME_URL" -H "Cookie: $SESSION_COOKIE")"
  if [ "$ME_CODE" = "200" ]; then
    pass "GET /api/v1/auth/me = 200 with SESSION_COOKIE"
  else
    fail "GET /api/v1/auth/me with SESSION_COOKIE" "expected 200, got HTTP $ME_CODE"
  fi
fi
echo ""

# --- Summary ---
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo "Manual remaining (not covered by this script):"
echo "  - Auth e2e: Google Sign-In, Secure cookie, no 401 loop"
echo "  - Photos e2e: upload → S3 object, survives task restart"
echo "  - Moderation e2e: Rekognition APPROVED / FLAGGED_FOR_REVIEW"
echo "  - Analysis e2e: submit → 202 + queued analysisJobId completes"
echo "  - Chat WS e2e: multi-instance fan-out (desired count ≥ 2)"
echo "  - k6: match-list p95 < 2000ms (see VERIFICATION_CHECKLIST.md)"
echo "  - Observability: CloudWatch logs + Sentry event"
echo ""
echo "Checklist: dating-api/docs/sprints/sprint-20-aws-dev-deployment/VERIFICATION_CHECKLIST.md"
echo "Sign-off:  dating-api/docs/sprints/sprint-20-aws-dev-deployment/VERIFIED_DEV.md"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}Automated cloud smoke passed.${NC}"
  exit 0
fi

echo -e "${RED}Automated cloud smoke FAILED — do not call deploy verified.${NC}"
exit 1
