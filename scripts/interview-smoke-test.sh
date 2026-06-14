#!/usr/bin/env bash
# LifeCare+ interview smoke test — hits production (or API_URL) API flows.
set -euo pipefail

API="${API_URL:-https://lifecare-l42k.onrender.com/api}"
FRONTEND="${FRONTEND_URL:-https://lifecare-frontend-navy.vercel.app}"
PASS=0
FAIL=0

ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

check_http() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30)
  if [ "$code" = "$expect" ]; then ok "$label ($code)"; else bad "$label expected $expect got $code"; fi
}

demo_login() {
  local phone="$1" token_file="$2" id_file="${3:-}"
  local resp
  resp=$(curl -s -X POST "$API/auth/demo-login" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\"}" --max-time 30)
  local success
  success=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "False")
  if [ "$success" = "True" ]; then
    echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" > "$token_file"
    if [ -n "$id_file" ]; then
      echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); u=d['data']['user']; print(u.get('_id') or u.get('id',''))" > "$id_file"
    fi
    ok "Demo login $phone"
  else
    bad "Demo login $phone — $(echo "$resp" | head -c 200)"
  fi
}

read_token() { cat "$1" 2>/dev/null || true; }

auth_get() {
  local label="$1" path="$2" token="$3" expect="${4:-200}"
  local code
  code=$(curl -s -o /tmp/lc_body.json -w "%{http_code}" \
    -H "Authorization: Bearer $token" "$API$path" --max-time 30)
  if [ "$code" = "$expect" ]; then ok "$label"; else bad "$label ($code): $(head -c 120 /tmp/lc_body.json)"; fi
}

echo "========================================"
echo "LifeCare+ Interview Smoke Test"
echo "API:      $API"
echo "Frontend: $FRONTEND"
echo "========================================"

echo ""
echo "1. Infrastructure"
check_http "Frontend home" "$FRONTEND/" "200"
check_http "Backend health" "${API%/api}/health" "200"

echo ""
echo "2. Demo logins (all roles)"
demo_login "9876543210" /tmp/lc_token_patient /tmp/lc_patient_id
demo_login "9876543211" /tmp/lc_token_doctor
demo_login "9876543215" /tmp/lc_token_pharmacy
demo_login "9876543216" /tmp/lc_token_ambulance
demo_login "9999999999" /tmp/lc_token_admin

TOKEN_PATIENT=$(read_token /tmp/lc_token_patient)
TOKEN_DOCTOR=$(read_token /tmp/lc_token_doctor)
TOKEN_PHARMACY=$(read_token /tmp/lc_token_pharmacy)
TOKEN_AMBULANCE=$(read_token /tmp/lc_token_ambulance)
TOKEN_ADMIN=$(read_token /tmp/lc_token_admin)
PATIENT_ID=$(read_token /tmp/lc_patient_id)

echo ""
echo "3. Patient flows"
if [ -n "$TOKEN_PATIENT" ]; then
  auth_get "GET /auth/profile" "/auth/profile" "$TOKEN_PATIENT"
  auth_get "GET /doctors" "/doctors?limit=5" "$TOKEN_PATIENT"
  auth_get "GET /appointments" "/appointments" "$TOKEN_PATIENT"
  auth_get "GET /pharmacy/medicines" "/pharmacy/medicines?limit=5" "$TOKEN_PATIENT"
  auth_get "GET /notifications" "/notifications" "$TOKEN_PATIENT"
  auth_get "GET /health-records" "/health-records" "$TOKEN_PATIENT"
fi

echo ""
echo "4. Doctor portal"
if [ -n "$TOKEN_DOCTOR" ]; then
  auth_get "GET /doctors/care/patients" "/doctors/care/patients" "$TOKEN_DOCTOR"
fi

echo ""
echo "5. Pharmacy staff"
if [ -n "$TOKEN_PHARMACY" ]; then
  auth_get "GET /pharmacy/staff/orders" "/pharmacy/staff/orders" "$TOKEN_PHARMACY"
  auth_get "GET /pharmacy/staff/inventory" "/pharmacy/staff/inventory" "$TOKEN_PHARMACY"
fi

echo ""
echo "6. Ambulance / emergency"
if [ -n "$TOKEN_PATIENT" ] && [ -n "$PATIENT_ID" ]; then
  SOS=$(curl -s -X POST "$API/emergency/sos" \
    -H "Authorization: Bearer $TOKEN_PATIENT" \
    -H "Content-Type: application/json" \
    -d "{\"patientLat\":19.076,\"patientLng\":72.8777,\"emergencyType\":\"other\",\"patientId\":\"$PATIENT_ID\"}" \
    --max-time 45)
  SOS_OK=$(echo "$SOS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "False")
  if [ "$SOS_OK" = "True" ]; then ok "POST /emergency/sos"; else bad "POST /emergency/sos: $(echo "$SOS" | head -c 200)"; fi
fi
if [ -n "$TOKEN_AMBULANCE" ]; then
  auth_get "GET /ambulance/driver-requests" "/ambulance/driver-requests" "$TOKEN_AMBULANCE"
fi

echo ""
echo "7. Admin"
if [ -n "$TOKEN_ADMIN" ]; then
  auth_get "GET /admin/stats" "/admin/stats" "$TOKEN_ADMIN"
  auth_get "GET /admin/users" "/admin/users?limit=5" "$TOKEN_ADMIN"
fi

echo ""
echo "========================================"
echo "Results: $PASS passed, $FAIL failed"
echo "========================================"

[ "$FAIL" -eq 0 ]
