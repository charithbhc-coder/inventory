#!/bin/bash
# KTMG-VAULT — PostgreSQL → S3 backup script
# Place on server at ~/scripts/backup-db.sh
# Cron: 0 2 * * * /home/ubuntu/scripts/backup-db.sh >> /home/ubuntu/scripts/backup.log 2>&1

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DB_CONTAINER="inventory-db"
DB_NAME="${DB_NAME:-inventory}"
DB_USER="${DB_USERNAME:-postgres}"
S3_BUCKET="aws-s3-acibhub"
S3_PREFIX="ktmg-vault-backups"
KEEP_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="/tmp/ktmg-vault-${TIMESTAMP}.sql.gz"

# ── Dump ──────────────────────────────────────────────────────────────────────
echo "[$(date)] Starting backup..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
echo "[$(date)] Dump complete: $(du -sh "$BACKUP_FILE" | cut -f1)"

# ── Upload to S3 ──────────────────────────────────────────────────────────────
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_PREFIX}/ktmg-vault-${TIMESTAMP}.sql.gz" \
  --storage-class STANDARD_IA
echo "[$(date)] Uploaded to s3://${S3_BUCKET}/${S3_PREFIX}/ktmg-vault-${TIMESTAMP}.sql.gz"

# ── Cleanup local temp ────────────────────────────────────────────────────────
rm -f "$BACKUP_FILE"

# ── Remove old backups from S3 (older than KEEP_DAYS) ─────────────────────────
CUTOFF=$(date -d "-${KEEP_DAYS} days" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-${KEEP_DAYS}d +%Y-%m-%dT%H:%M:%S)
echo "[$(date)] Removing backups older than ${KEEP_DAYS} days..."
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1"T"$2}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [[ -n "$FILE_NAME" ]] && [[ "$FILE_DATE" < "$CUTOFF" ]]; then
    aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${FILE_NAME}"
    echo "[$(date)] Deleted old backup: $FILE_NAME"
  fi
done

echo "[$(date)] Backup complete."
