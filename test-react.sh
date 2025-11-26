#!/bin/bash

echo "🚀 Starting Fixxa React Test Environment"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env with your Railway variables"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if node_modules exist
if [ ! -d node_modules ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d client/node_modules ]; then
    echo "📦 Installing React dependencies..."
    cd client && npm install && cd ..
fi

echo ""
echo "✅ Dependencies installed"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT COUNT(*) as workers FROM workers WHERE approval_status = \\'approved\\'')
  .then(result => {
    console.log('✅ Database connected!');
    console.log('📊 Approved workers in database:', result.rows[0].workers);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
" || exit 1

echo ""
echo "=========================================="
echo "🎉 Setup complete! Ready to test."
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  Start Backend Server (Terminal 1):"
echo "   npm start"
echo "   (Server will run on http://localhost:3000)"
echo ""
echo "2️⃣  Start React App (Terminal 2 - NEW WINDOW):"
echo "   cd client && PORT=3001 npm start"
echo "   (React will run on http://localhost:3001)"
echo ""
echo "3️⃣  Open Browser:"
echo "   http://localhost:3001"
echo ""
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: You'll be testing with REAL PRODUCTION DATA"
echo "    - View operations are safe (browse workers, profiles)"
echo "    - Be careful with write operations (bookings, messages)"
echo "    - Use a test account if possible"
echo ""
echo "📚 For detailed testing guide, see:"
echo "   TEST_REACT_LOCALLY.md"
echo ""
