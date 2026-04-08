#!/bin/bash
set -e

# HomeBase AI Backup Script
# Usage: bash scripts/backup.sh [backup_dir]

BACKUP_DIR="${1:-./data/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

echo "==> HomeBase AI Backup — $TIMESTAMP"

mkdir -p "$BACKUP_PATH"

# 1. Database dump
echo "  Dumping database..."
docker compose exec -T postgres pg_dump -U homebase -d homebase \
  --format=custom --no-owner \
  > "$BACKUP_PATH/homebase.dump" 2>/dev/null || {
    echo "  WARNING: Database dump failed (is postgres running?)"
  }

# 2. Config files
echo "  Backing up config..."
cp -r config/ "$BACKUP_PATH/config/" 2>/dev/null || true

# 3. Uploaded documents
echo "  Backing up documents..."
if [ -d "data/documents" ]; then
  cp -r data/documents/ "$BACKUP_PATH/documents/"
fi

# 4. Environment (without secrets)
echo "  Backing up .env template..."
if [ -f ".env" ]; then
  grep -v "PASSWORD\|TOKEN\|SECRET\|KEY" .env > "$BACKUP_PATH/env.filtered" 2>/dev/null || true
fi

# 5. Calculate size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)
echo ""
echo "==> Backup complete: $BACKUP_PATH ($BACKUP_SIZE)"

# 6. Clean old backups (keep last 7)
echo "  Cleaning old backups (keeping last 7)..."
ls -dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +8 | xargs rm -rf 2>/dev/null || true

echo "==> Done."
