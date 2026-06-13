#!/usr/bin/env bash
set -euo pipefail
API="${API_URL:-https://lifecare-l42k.onrender.com/api}"

curl -sL -o /tmp/chest_test.jpg "https://raw.githubusercontent.com/opencv/opencv/master/samples/data/baboon.jpg" --max-time 45
echo "Test image: $(file -b /tmp/chest_test.jpg 2>/dev/null || echo missing)"

echo "=== Demo login ==="
TOKEN=$(curl -s -X POST "$API/auth/demo-login" -H "Content-Type: application/json" -d '{"phone":"9876543210"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

echo "=== Existing test data (patient 9876543210) ==="
curl -s "$API/scans/my-scans" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',[]); print('stored chest scans:', len(data) if isinstance(data,list) else data)"
curl -s "$API/scans/my-reports" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',[]); print('stored mediscan reports:', len(data) if isinstance(data,list) else data)"

echo "=== MediScan ML API (/predict) ==="
curl -s -X POST "https://mediscan-api.onrender.com/predict" -F "file=@/tmp/chest_test.jpg;type=image/jpeg;filename=chest.jpg" --max-time 120 | python3 -c "import sys,json; d=json.load(sys.stdin); print('class_name:', d.get('class_name')); print('confidence:', d.get('confidence')); print('error:', d.get('detail', d.get('message',''))[:80])"

echo "=== LifeCare chest analyze (/scans/analyze) ==="
curl -s -X POST "$API/scans/analyze" -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/chest_test.jpg" --max-time 120 | python3 -c "import sys,json; d=json.load(sys.stdin); print('success:', d.get('success')); print('message:', (d.get('message') or '')[:120]); data=d.get('data') or {}; print('prediction:', data.get('prediction')); print('confidence:', data.get('confidence'))"
