#!/bin/bash
# Run database sync on Railway production database

echo "🔄 Running database sync on Railway production..."
echo ""

# Use Railway CLI to run the sync script with production environment variables
/Users/kudadunbetter/.npm-global/bin/railway run node run_db_sync.js

echo ""
echo "✅ Database sync completed!"
