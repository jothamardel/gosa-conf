#!/bin/bash

echo "Running PDF WhatsApp Integration Test Suite"
echo "=========================================="

# Install test dependencies if not already installed
if ! command -v jest &> /dev/null; then
    echo "Installing Jest and testing dependencies..."
    npm install --save-dev jest @testing-library/jest-dom @testing-library/react @types/jest
fi

# Run PDF Generator Service tests
echo "Testing PDF Generator Service..."
npx jest __tests__/services/pdf-generator.service.test.ts --verbose

# Run PDF Download API tests
echo "Testing PDF Download API..."
npx jest __tests__/api/pdf-download.test.ts --verbose

# Run WhatsApp PDF Service tests
echo "Testing WhatsApp PDF Service..."
npx jest __tests__/services/whatsapp-pdf.service.test.ts --verbose

# Run Error Scenario tests
echo "Testing Error Scenarios..."
npx jest __tests__/services/pdf-error-scenarios.test.ts --verbose

# Generate coverage report
echo "Generating coverage report..."
npx jest --coverage --testMatch="**/__tests__/**/*.test.ts"

echo "=========================================="
echo "PDF WhatsApp Integration tests completed!"
echo "Check the coverage report in the 'coverage' directory"