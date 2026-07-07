#!/usr/bin/env bash
# Copy local unisync DB to Atlas via mongodump/mongorestore (requires Atlas port 27017 reachable).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

LOCAL_URI="${MONGODB_URI_FALLBACK:-mongodb://localhost:27017/unisync}"
ATLAS_URI="${MONGODB_URI:?Set MONGODB_URI in backend/.env}"
DUMP_DIR="/tmp/unisync-atlas-dump"

echo "Dumping local database..."
rm -rf "$DUMP_DIR"
mongodump --uri="$LOCAL_URI" --out="$DUMP_DIR" --quiet

echo "Restoring to Atlas (unisync)..."
mongorestore --uri="$ATLAS_URI" --drop --nsInclude='unisync.*' "$DUMP_DIR/unisync" 2>/dev/null \
  || mongorestore --uri="$ATLAS_URI" --drop "$DUMP_DIR" 

echo "Done. Verify in Compass: $ATLAS_URI"
