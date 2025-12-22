#!/bin/bash

# Fix Prisma Client in Production
# Run this script on the production server to fix the Account query error

echo "🔍 Fixing Prisma Client in Production..."
echo "=========================================="
echo ""

# Step 1: Check current Prisma client status
echo "📊 Current Prisma client status:"
if [ -d "node_modules/.pnpm" ]; then
  PRISMA_CLIENT_PATH=$(find node_modules/.pnpm -name ".prisma" -type d 2>/dev/null | head -1)
  if [ -n "$PRISMA_CLIENT_PATH" ]; then
    echo "✅ Prisma client found at: $PRISMA_CLIENT_PATH/client"
    ls -lh "$PRISMA_CLIENT_PATH/client/schema.prisma" 2>/dev/null || echo "⚠️  Schema file not found"
  else
    echo "❌ Prisma client not found!"
  fi
else
  echo "❌ node_modules not found! Are you in the project root?"
  exit 1
fi

echo ""
echo "=========================================="
echo "🔄 Step 1: Pulling latest code..."
git pull origin main || {
  echo "⚠️  Warning: Git pull failed. Continuing anyway..."
}

echo ""
echo "=========================================="
echo "🗑️  Step 2: Cleaning old Prisma client..."
rm -rf node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client
echo "✅ Old client removed"

echo ""
echo "=========================================="
echo "🏗️  Step 3: Regenerating Prisma client..."
npx prisma generate || {
  echo "❌ Error: Failed to generate Prisma client"
  exit 1
}
echo "✅ Prisma client regenerated"

echo ""
echo "=========================================="
echo "🔍 Step 4: Verifying Account model..."
PRISMA_CLIENT_PATH=$(find node_modules/.pnpm -name ".prisma" -type d 2>/dev/null | head -1)
if [ -n "$PRISMA_CLIENT_PATH" ]; then
  echo "Checking Account model definition..."
  grep -A 20 "model Account" "$PRISMA_CLIENT_PATH/client/schema.prisma" | head -22
  echo "✅ Account model verified"
else
  echo "❌ Could not find regenerated client!"
  exit 1
fi

echo ""
echo "=========================================="
echo "♻️  Step 5: Restarting application..."
if command -v pm2 &> /dev/null; then
  pm2 restart coach-wattz || pm2 restart all
  echo "✅ PM2 process restarted"
elif command -v systemctl &> /dev/null; then
  sudo systemctl restart coach-wattz
  echo "✅ Systemd service restarted"
else
  echo "⚠️  Warning: Could not detect process manager (pm2/systemd)"
  echo "Please manually restart your application"
fi

echo ""
echo "=========================================="
echo "✅ Fix complete!"
echo ""
echo "Next steps:"
echo "1. Test OAuth login at your application URL"
echo "2. Check application logs for any errors:"
echo "   pm2 logs coach-wattz --lines 50"
echo "3. If issues persist, run: npx tsx scripts/test-account-query.ts"
echo ""
echo "Documentation: docs/ACCOUNT-QUERY-ERROR-DIAGNOSIS.md"
echo "=========================================="
