#!/bin/bash
# Marketing cron jobs for Poby.ai
# Add to crontab on VPS:
#   crontab -e
#   # Weekly content generation — every Sunday at 14:00 Istanbul (11:00 UTC)
#   0 11 * * 0 /var/www/klinik-asistan/scripts/cron-marketing.sh generate
#   # Auto-publish — every 15 minutes
#   */15 * * * * /var/www/klinik-asistan/scripts/cron-marketing.sh publish

CRON_SECRET="poby-cron-secret-2026"
BASE_URL="http://localhost:3000"
LOG_FILE="/var/log/poby-marketing-cron.log"

case "$1" in
  generate)
    echo "[$(date)] Running weekly content generation..." >> "$LOG_FILE"
    curl -s -X POST "$BASE_URL/api/admin/marketing/generate-weekly" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" >> "$LOG_FILE" 2>&1
    echo "" >> "$LOG_FILE"
    ;;
  publish)
    curl -s -X POST "$BASE_URL/api/admin/marketing/auto-publish" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" >> "$LOG_FILE" 2>&1
    ;;
  *)
    echo "Usage: $0 {generate|publish}"
    exit 1
    ;;
esac
