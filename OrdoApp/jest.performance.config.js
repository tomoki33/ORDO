/**
 * Performance Test Configuration
 * パフォーマンステスト専用設定
 */

module.exports = {
  preset: 'react-native',
  displayName: 'Performance Tests',
  testMatch: ['<rootDir>/__tests__/performance/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/performance/setup.js'
  ],
  testEnvironment: 'node',
  testTimeout: 60000, // 1 minute for performance tests
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
  },
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*)/)',
  ],
  
  // Test path exclusions
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/__tests__/unit/',
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/e2e/',
    '<rootDir>/__tests__/ui/',
  ],
  
  // Globals for performance testing
  globals: {
    '__PERFORMANCE_TEST__': true,
    '__PERFORMANCE_THRESHOLD__': {
      cpu: 80, // CPU usage %
      memory: 512, // Memory usage MB
      responseTime: 1000, // Response time ms
      renderTime: 16, // Render time ms (60fps)
    },
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/performance/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/performance/globalTeardown.js',
  
  // Verbose output
  verbose: true,
  
  // Sequential execution for accurate performance measurement
  maxWorkers: 1,
  
  // Clear mocks for clean performance tests
  clearMocks: true,
  resetMocks: true,
  
  // Custom reporters for performance data
  reporters: [
    'default',
    ['<rootDir>/__tests__/performance/performanceReporter.js'],
  ],
};
