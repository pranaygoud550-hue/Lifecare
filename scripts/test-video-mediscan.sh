#!/usr/bin/env bash
# Test video consult + MediScan on production or local API.
set -euo pipefail

API="${API_URL:-https://lifecare-l42k.onrender.com/api}"
FIXTURE="${1:-$(dirname "$0")/../backend/tests/fixtures/sample-chest.png}"

echo "=== LifeCare+ Video + MediScan test ==="
echo "API: $API"

login() {
  curl -s -X POST "$API/auth/demo-login" -H "Content-Type: application/json" -d "{\"phone\":\"$1\"}"
}

echo ""
echo "1. Demo login (patient + doctor) — seeds live video appointment"
PATIENT_JSON=$(login "9876543210")
DOCTOR_JSON=$(login "9876543211")
PATIENT_TOKEN=$(echo "$PATIENT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
DOCTOR_TOKEN=$(echo "$DOCTOR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
echo "  ✓ Patient and doctor tokens obtained"

echo ""
echo "2. Live Checkup — list appointments"
APPTS=$(curl -s -H "Authorization: Bearer $PATIENT_TOKEN" "$API/appointments")
LIVE_ID=$(echo "$APPTS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
appts=d.get('data',{}).get('appointments',[])
live=[a for a in appts if a.get('consultationType') in ('video','audio') and a.get('status') in ('confirmed','in-progress')]
print(live[0]['_id'] if live else '')
")
if [ -z "$LIVE_ID" ]; then
  echo "  ✗ No joinable video appointment found"
  exit 1
fi
echo "  ✓ Found appointment $LIVE_ID"

echo ""
echo "3. Join consultation (patient + doctor)"
for role in patient doctor; do
  TOK=$PATIENT_TOKEN
  [ "$role" = "doctor" ] && TOK=$DOCTOR_TOKEN
  CODE=$(curl -s -o /tmp/join.json -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOK" "$API/appointments/$LIVE_ID/join")
  if [ "$CODE" = "200" ]; then
    ROOM=$(python3 -c "import json; print(json.load(open('/tmp/join.json'))['data']['roomId'])")
    echo "  ✓ $role joined room: $ROOM"
  else
    echo "  ✗ $role join failed ($CODE): $(head -c 150 /tmp/join.json)"
    exit 1
  fi
done

echo ""
echo "4. MediScan chest analyze"
if [ ! -f "$FIXTURE" ]; then
  echo "  ✗ Fixture not found: $FIXTURE"
  exit 1
fi
SCAN=$(curl -s -X POST "$API/scans/analyze" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -F "image=@$FIXTURE;type=image/png")
SCAN_OK=$(echo "$SCAN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "False")
if [ "$SCAN_OK" = "True" ]; then
  LABEL=$(echo "$SCAN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('prediction','?'))")
  echo "  ✓ Chest scan analyzed — prediction: $LABEL"
else
  echo "  ✗ Scan failed: $(echo "$SCAN" | head -c 200)"
  exit 1
fi

echo ""
echo "=== All video + MediScan checks passed ==="
