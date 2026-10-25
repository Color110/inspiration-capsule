#!/usr/bin/env bash
# 用法: 先 go run . 启动服务器，再运行 bash smoke_http.sh
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
echo '1/5 GET health'
curl --fail-with-body -sS "$BASE/api/health"
echo
echo '2/5 POST idea'
result=$(curl --fail-with-body -sS -X POST "$BASE/api/ideas" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Go 接口冒烟测试","category":"编程练习"}')
echo "$result"
# 由 JSON 响应获取服务端生成的唯一 ID（使用系统已有的 Python）。
id=$(printf '%s' "$result" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
echo '3/5 PATCH done=true'
curl --fail-with-body -sS -X PATCH "$BASE/api/ideas/$id" \
  -H 'Content-Type: application/json' -d '{"done":true}'
echo
echo '4/5 GET list'
curl --fail-with-body -sS "$BASE/api/ideas"
echo
echo '5/5 DELETE test idea'
curl --fail-with-body -sS -o /dev/null -w 'HTTP %{http_code}\n' -X DELETE "$BASE/api/ideas/$id"
echo 'smoke test passed'
