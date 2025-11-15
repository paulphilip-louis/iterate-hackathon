#!/bin/bash

# Cultural Fit Detection Test Runner
# This script runs the cultural fit simulation test

echo "🚀 Running Cultural Fit Detection Simulation..."
echo ""

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js and npm."
    exit 1
fi

# Run the test using tsx (TypeScript executor)
npx tsx tests/culturalFitTestRunner.ts

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Test completed successfully!"
else
    echo ""
    echo "❌ Test failed with exit code: $EXIT_CODE"
    exit $EXIT_CODE
fi

