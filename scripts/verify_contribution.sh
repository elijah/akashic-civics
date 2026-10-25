#!/bin/bash
set -e

echo "🔍 Verifying contribution..."

# Check formatting
echo "Checking format..."
npm run format:check

# Check linting
echo "Checking lint..."
npm run lint

# Type check
echo "Type checking..."
npx tsc --noEmit

# Run tests
echo "Running tests..."
npm test -- --coverage=false

# Check mutation threshold
echo "Checking mutation score..."
npm run test:mutation -- --threshold-low=50

echo "✅ All checks passed!"