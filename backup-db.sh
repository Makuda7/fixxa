#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Create backup directory if it doesn't exist
mkdir -p backups

# Generate filename with timestamp
BACKUP_FILE="backups/fixxa_backup_$(date +%Y%m%d_%H%M%S).sql"

# Create backup
pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find backups/ -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
