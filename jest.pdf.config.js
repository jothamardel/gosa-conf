const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'PDF WhatsApp Integration Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.pdf.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/utils/',
    '<rootDir>/__tests__/fixtures/'
  ],
  collectCoverageFrom: [
    'lib/services/pdf-*.ts',
    'lib/services/whatsapp-pdf.service.ts',
    'lib/utils/pdf-whatsapp.utils.ts',
    'app/api/v1/pdf/**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './lib/services/pdf-generator.service.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './lib/services/whatsapp-pdf.service.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  testTimeout: 30000, // 30 seconds for performance tests
  maxWorkers: 4, // Limit workers for consistent performance testing
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage/pdf-integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/pdf-integration/html-report',
      filename: 'report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'PDF WhatsApp Integration Test Report'
    }]
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)