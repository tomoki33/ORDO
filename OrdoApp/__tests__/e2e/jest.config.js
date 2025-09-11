/**
 * Jest configuration for E2E tests
 */

module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/__tests__/e2e/**/*.e2e.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: './e2e/globalSetup.js',
  globalTeardown: './e2e/globalTeardown.js',
  setupFilesAfterEnv: ['./e2e/setup.js'],
  testEnvironment: './e2e/environment.js',
  verbose: true,
  bail: false,
  
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/e2e',
        outputName: 'junit.xml',
        suiteName: 'Ordo E2E Tests'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/e2e',
        filename: 'report.html',
        pageTitle: 'Ordo E2E Test Report'
      }
    ]
  ],
  
  collectCoverage: false, // E2E tests don't need code coverage
  
  // Detox-specific configuration
  testRunner: 'jest-circus/runner',
  
  transform: {
    '\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  
  moduleFileExtensions: ['js', 'json'],
  
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/unit/',
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/performance/'
  ]
};
