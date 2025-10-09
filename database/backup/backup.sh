#!/bin/bash
# Database backup script

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="database/backups"
BACKUP_FILE="$BACKUP_DIR/fixxa_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."
PGPASSWORD=Maktentankee7! pg_dump -U fixxa_user -h localhost -d fixxa_messages > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    
    # Keep only last 10 backups
    cd $BACKUP_DIR
    ls -t fixxa_backup_*.sql | tail -n +11 | xargs rm -f 2>/dev/null
    echo "🗑️  Old backups cleaned up (keeping last 10)"
else
    echo "❌ Backup failed!"
    exit 1
fi