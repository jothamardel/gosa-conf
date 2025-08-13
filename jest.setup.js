import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.WASENDER_API_KEY = 'test-api-key'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock fetch globally
global.fetch = jest.fn()

// Mock PDF generation (puppeteer/playwright would be heavy for tests)
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}))

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})