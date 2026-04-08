#!/bin/bash
set -e

# HomeBase AI Restore Script
# Usage: bash scripts/restore.sh <backup_dir>

BACKUP_PATH="${1:?Usage: restore.sh <backup_dir>}"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "ERROR: Backup directory not found: $BACKUP_PATH"
  exit 1
fi

echo "==> HomeBase AI Restore from $BACKUP_PATH"

# 1. Restore database
if [ -f "$BACKUP_PATH/homebase.dump" ]; then
  echo "  Restoring database..."
  docker compose exec -T postgres pg_restore -U homebase -d homebase \
    --clean --if-exists --no-owner \
    < "$BACKUP_PATH/homebase.dump" 2>/dev/null || {
      echo "  WARNING: Some restore errors (may be normal for clean DB)"
    }
  echo "  Database restored."
else
  echo "  No database dump found, skipping."
fi

# 2. Restore config
if [ -d "$BACKUP_PATH/config" ]; then
  echo "  Restoring config..."
  cp -r "$BACKUP_PATH/config/" config/
fi

# 3. Restore documents
if [ -d "$BACKUP_PATH/documents" ]; then
  echo "  Restoring documents..."
  mkdir -p data/documents
  cp -r "$BACKUP_PATH/documents/"* data/documents/
fi

echo "==> Restore complete."
