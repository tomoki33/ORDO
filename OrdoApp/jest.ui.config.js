/**
 * UI Test Configuration
 * UIテスト専用設定
 */

module.exports = {
  preset: 'react-native',
  displayName: 'UI Tests',
  testMatch: ['<rootDir>/__tests__/ui/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/ui/setup.js'
  ],
  testEnvironment: 'jsdom',
  testTimeout: 15000,
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/mocks/imageMock.js',
  },
  
  // Snapshot configuration
  snapshotSerializers: [
    'react-native-paper/src/serializers',
  ],
  
  // Coverage for UI components
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx,ts,tsx}',
    'src/screens/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  
  coverageDirectory: 'coverage/ui',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
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
    '<rootDir>/__tests__/performance/',
  ],
  
  // Verbose output
  verbose: true,
  
  // Mock settings
  clearMocks: true,
  resetMocks: true,
};
