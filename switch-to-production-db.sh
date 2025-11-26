#!/bin/bash

echo "🔄 Switching to Production Database"
echo "===================================="
echo ""
echo "⚠️  WARNING: You will connect to PRODUCTION database!"
echo "   - You will see REAL workers and users"
echo "   - All data operations affect production"
echo ""
read -p "Continue? [y/N]: " confirm

if [ "$confirm" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

# Get production DATABASE_URL from Railway
echo ""
echo "📡 Getting production database URL from Railway..."
PROD_DB_URL=$(railway run env | grep DATABASE_URL | cut -d'=' -f2-)

if [ -z "$PROD_DB_URL" ]; then
    echo "❌ Could not get DATABASE_URL from Railway"
    echo "Make sure you're logged in: railway login"
    exit 1
fi

# Backup current .env
cp .env .env.backup
echo "✅ Backed up current .env to .env.backup"

# Replace DATABASE_URL in .env
if grep -q "^DATABASE_URL=" .env; then
    # Comment out existing DATABASE_URL lines
    sed -i '' 's/^DATABASE_URL=/#DATABASE_URL=/' .env
fi

# Add production DATABASE_URL
echo "" >> .env
echo "# PRODUCTION DATABASE (added by switch script)" >> .env
echo "DATABASE_URL=$PROD_DB_URL" >> .env

echo "✅ Switched to production database"
echo ""
echo "🔍 Verifying connection..."

# Test connection
railway run psql "$PROD_DB_URL" -c "SELECT COUNT(*) as approved_workers FROM workers WHERE approval_status='approved';" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ Production database connected!"
echo ""
echo "Now restart your server:"
echo "  1. Stop server (Ctrl+C)"
echo "  2. Run: npm start"
echo ""
echo "To switch back to local database:"
echo "  mv .env.backup .env"
echo "=========================================="
