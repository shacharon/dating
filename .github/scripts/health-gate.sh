#!/usr/bin/env bash
# Post-deploy health gate against the live ALB / public origin.
# Polls GET /health (200) and GET /health/realtime (redisAdapter true).
#
# Usage:
#   DEV_BASE_URL=https://dev.example.tld ./health-gate.sh
# Optional:
#   HEALTH_TIMEOUT_SECONDS=300
#   HEALTH_INTERVAL_SECONDS=10
#   REQUIRE_REDIS_ADAPTER=1   # set 0 to only require boolean redisAdapter
set -euo pipefail

BASE_URL="${DEV_BASE_URL:?DEV_BASE_URL required}"
BASE_URL="${BASE_URL%/}"
TIMEOUT="${HEALTH_TIMEOUT_SECONDS:-300}"
INTERVAL="${HEALTH_INTERVAL_SECONDS:-10}"
REQUIRE_REDIS="${REQUIRE_REDIS_ADAPTER:-1}"

echo "Health gate: base=${BASE_URL} timeout=${TIMEOUT}s interval=${INTERVAL}s"

DEADLINE=$((SECONDS + TIMEOUT))
LAST_ERR="not started"

while [ "$SECONDS" -lt "$DEADLINE" ]; do
  HEALTH_CODE="$(curl -sS -o /tmp/health.json -w "%{http_code}" \
    --connect-timeout 5 --max-time 15 \
    "${BASE_URL}/health" || echo "000")"

  RT_CODE="$(curl -sS -o /tmp/realtime.json -w "%{http_code}" \
    --connect-timeout 5 --max-time 15 \
    "${BASE_URL}/health/realtime" || echo "000")"

  if [ "$HEALTH_CODE" = "200" ] && [ "$RT_CODE" = "200" ]; then
    if python3 - "$REQUIRE_REDIS" <<'PY'
import json, os, sys
require = sys.argv[1] != "0"
try:
    h = json.load(open("/tmp/health.json"))
    r = json.load(open("/tmp/realtime.json"))
except Exception as e:
    print("json parse error:", e)
    sys.exit(1)
errs = []
if h.get("ok") is not True:
    errs.append("health.ok != true")
if h.get("service") != "dating-api":
    errs.append("health.service != dating-api")
m = (r.get("messaging") or {})
if r.get("ok") is not True:
    errs.append("realtime.ok != true")
if not isinstance(m.get("redisAdapter"), bool):
    errs.append("messaging.redisAdapter not boolean")
elif require and m.get("redisAdapter") is not True:
    errs.append("messaging.redisAdapter must be true (Redis adapter not bound)")
if errs:
    print("; ".join(errs))
    sys.exit(1)
print("ok redisAdapter=%s" % (m.get("redisAdapter"),))
sys.exit(0)
PY
    then
      echo "Health gate PASSED"
      cat /tmp/realtime.json
      echo
      exit 0
    else
      LAST_ERR="body checks failed (see python output above)"
    fi
  else
    LAST_ERR="HTTP health=${HEALTH_CODE} realtime=${RT_CODE}"
  fi

  echo "Waiting… ${LAST_ERR}"
  sleep "$INTERVAL"
done

echo "ERROR: health gate FAILED within ${TIMEOUT}s — ${LAST_ERR}" >&2
echo "See CI_CD.md § Rollback. Do not treat this deploy as live." >&2
exit 1
