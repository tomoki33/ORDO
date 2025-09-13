/**
 * Cross-Platform Device Test Configuration
 * クロスプラットフォーム・デバイステスト設定
 */

const { devices } = require('./deviceConfigurations');

module.exports = {
  preset: 'react-native',
  displayName: 'Device Tests',
  testMatch: ['<rootDir>/__tests__/device/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/device/setup.js'
  ],
  testEnvironment: 'node',
  testTimeout: 180000, // 3 minutes for device tests
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@device/(.*)$': '<rootDir>/__tests__/device/$1',
  },
  
  // Transform settings
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|detox)/)',
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
    '<rootDir>/__tests__/performance/',
  ],
  
  // Global settings for device testing
  globals: {
    '__DEVICE_TEST__': true,
    '__TARGET_DEVICES__': devices,
    '__PLATFORM_FEATURES__': {
      ios: {
        faceId: true,
        touchId: true,
        nfc: true,
        camera: true,
        microphone: true,
      },
      android: {
        fingerprint: true,
        nfc: true,
        camera: true,
        microphone: true,
        backButton: true,
      },
    },
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/device/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/device/globalTeardown.js',
  
  // Custom reporters for device testing
  reporters: [
    'default',
    ['<rootDir>/__tests__/device/deviceTestReporter.js'],
  ],
  
  // Verbose output
  verbose: true,
  
  // Sequential execution for device tests
  maxWorkers: 1,
  
  // Clear mocks
  clearMocks: true,
  resetMocks: true,
};
