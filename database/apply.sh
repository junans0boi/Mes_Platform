#!/usr/bin/env bash
# database/apply.sh — 로컬·테스트 DB에 마이그레이션을 순서대로 적용한다.
# 운영 DB 패턴(prod, .msmes., 10.0.0.)이 연결 문자열에 포함되면 중단한다.
# 사용: MES_DB_CONNECTION="Server=...;Database=...;..." ./database/apply.sh

set -euo pipefail

CONN="${MES_DB_CONNECTION:-}"
if [ -z "$CONN" ]; then
  echo "ERROR: MES_DB_CONNECTION 환경 변수가 없습니다." >&2
  exit 1
fi

PROD_PATTERNS=("prod" ".msmes." "10.0.0.")
for pat in "${PROD_PATTERNS[@]}"; do
  if echo "$CONN" | grep -qi "$pat"; then
    echo "ERROR: 연결 문자열에 운영 DB 패턴('$pat')이 포함되어 있습니다. 운영 DB에 자동 적용을 허용하지 않습니다." >&2
    exit 2
  fi
done

MIGRATIONS_DIR="$(dirname "$0")/migrations"
for sql in "$MIGRATIONS_DIR"/[0-9]*.sql; do
  echo "Applying: $sql"
  sqlcmd -C -b -S "$(echo "$CONN" | grep -oP '(?<=Server=)[^;]+')" \
         -d "$(echo "$CONN" | grep -oP '(?<=Database=)[^;]+')" \
         -i "$sql"
done
echo "Done."
