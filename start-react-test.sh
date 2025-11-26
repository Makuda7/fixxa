#!/bin/bash

echo "🚀 Fixxa React Testing Environment"
echo "==================================="
echo ""
echo "Choose testing mode:"
echo ""
echo "1) LOCAL DATABASE (Safe - use test data)"
echo "2) PRODUCTION DATABASE (View real workers - READ ONLY recommended)"
echo ""
read -p "Enter choice [1 or 2]: " choice

if [ "$choice" = "2" ]; then
    echo ""
    echo "⚠️  WARNING: You will connect to PRODUCTION database!"
    echo "    - You will see REAL workers and data"
    echo "    - Be careful with write operations"
    echo ""
    read -p "Continue? [y/N]: " confirm
    if [ "$confirm" != "y" ]; then
        echo "Cancelled."
        exit 0
    fi

    echo ""
    echo "🔄 Switching to production database..."

    # Get Railway DATABASE_URL
    DB_URL=$(railway variables --json 2>/dev/null | grep -o '"DATABASE_URL":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$DB_URL" ]; then
        echo "❌ Could not get DATABASE_URL from Railway"
        echo "Run manually: railway variables | grep DATABASE_URL"
        exit 1
    fi

    # Create .env.test with production DB
    cp .env .env.test
    echo "" >> .env.test
    echo "# PRODUCTION DATABASE (for testing)" >> .env.test
    echo "DATABASE_URL=$DB_URL" >> .env.test

    # Use .env.test
    export NODE_ENV=development
    export $(cat .env.test | grep -v '^#' | xargs)

    echo "✅ Connected to production database"
else
    echo ""
    echo "✅ Using local database (safe mode)"
    export $(cat .env | grep -v '^#' | xargs)
fi

echo ""
echo "🔍 Checking database connection..."

# Test database
if [ "$choice" = "2" ]; then
    # Production database
    railway run psql "$DATABASE_URL" -c "SELECT COUNT(*) as approved_workers FROM workers WHERE approval_status='approved';" 2>/dev/null
else
    # Local database
    psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" -c "SELECT COUNT(*) as workers FROM workers;" 2>/dev/null || echo "⚠️  Local database not running or empty"
fi

echo ""
echo "=========================================="
echo "✅ Ready to start testing!"
echo ""
echo "Open TWO terminal windows and run:"
echo ""
echo "Terminal 1 (Backend):"
echo "  npm start"
echo ""
echo "Terminal 2 (React):"
echo "  cd client && PORT=3001 npm start"
echo ""
echo "Then open: http://localhost:3001"
echo "=========================================="
