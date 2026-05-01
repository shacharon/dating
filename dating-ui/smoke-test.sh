#!/usr/bin/env bash
# Post-deployment smoke test — legacy matches UI removal
#
# Repository facts (see next.config.ts, src/lib/api-base.ts):
# - Next rewrites /api/* to API_PROXY_TARGET (default http://localhost:3001).
# - When NEXT_PUBLIC_API_URL is unset, the browser uses same-origin /api (rewrites apply).
#
# Usage:
#   ./smoke-test.sh <ui-base-url> [api-base-url]
#
# Examples (canonical in-repo stack):
#   ./smoke-test.sh http://127.0.0.1:3000
#       → API checks use http://127.0.0.1:3000/api/... (Next rewrites to API_PROXY_TARGET)
#   ./smoke-test.sh http://127.0.0.1:3000 http://127.0.0.1:3001
#       → split origin: UI vs direct dating-api (optional parity check)
#
# Windows: use Git Bash or WSL; PowerShell equivalents are in DEPLOYMENT_SMOKE_TEST.md

set -euo pipefail

DOMAIN="${1:-http://127.0.0.1:3000}"
# Default: same origin as UI (matches next.config rewrites). Override for split deploy.
API_BASE="${2:-$DOMAIN}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Legacy Matches UI Removal — Smoke Test"
echo "=========================================="
echo "UI base:    $DOMAIN"
echo "API base:   $API_BASE  (same as UI unless second arg set)"
echo "Date:       $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

FAILED_TESTS=0
PASSED_TESTS=0

test_result() {
  if [ "$1" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    echo "   Error: $3"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

echo "=========================================="
echo "Test 1: /dating/matches (expect redirect or auth prelude)"
echo "=========================================="
# First hop only — do not follow redirects
REDIRECT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" --max-redirs 0 "$DOMAIN/dating/matches" || true)
if [[ "$REDIRECT_STATUS" == "307" ]] || [[ "$REDIRECT_STATUS" == "302" ]] || [[ "$REDIRECT_STATUS" == "200" ]]; then
  test_result 0 "/dating/matches first response (HTTP $REDIRECT_STATUS)"
else
  test_result 1 "/dating/matches unexpected status" "Got HTTP $REDIRECT_STATUS (expected 302/307/200)"
fi
echo ""

echo "=========================================="
echo "Test 2: /dating/me-matches (list)"
echo "=========================================="
ME_MATCHES_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$DOMAIN/dating/me-matches" || true)
if [[ "$ME_MATCHES_STATUS" == "200" ]] || [[ "$ME_MATCHES_STATUS" == "307" ]] || [[ "$ME_MATCHES_STATUS" == "302" ]]; then
  test_result 0 "/dating/me-matches (HTTP $ME_MATCHES_STATUS)"
else
  test_result 1 "/dating/me-matches failed" "Expected 200 or redirect, got $ME_MATCHES_STATUS"
fi
echo ""

# Test 3 removed: /poc/matches deleted (Decision Gate 0: Option C, 2026-04-24)
# Test 4 removed: GET /api/matches was for POC/tooling only (deleted 2026-04-24)

echo "=========================================="
echo "Test 5: GET /api/v1/me/matches (active — auth)"
echo "=========================================="
ACTIVE_MATCHES_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$API_BASE/api/v1/me/matches" || true)
if [[ "$ACTIVE_MATCHES_STATUS" == "200" ]] || [[ "$ACTIVE_MATCHES_STATUS" == "401" ]]; then
  test_result 0 "Active GET /api/v1/me/matches (HTTP $ACTIVE_MATCHES_STATUS)"
else
  test_result 1 "Active GET /api/v1/me/matches" "Expected 200 or 401, got $ACTIVE_MATCHES_STATUS"
fi
echo ""

echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
  echo -e "${GREEN}All automated checks passed.${NC}"
  echo "Manual: open /dating/me-matches/[id] in a browser with a real match id."
  exit 0
else
  echo -e "${RED}Some checks failed — investigate before calling deploy stable.${NC}"
  exit 1
fi
