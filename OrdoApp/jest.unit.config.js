/**
 * Jest Unit Test Configuration
 * ユニットテスト専用設定
 */

module.exports = {
  preset: 'react-native',
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/__tests__/unit/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/unit/setup.js'
  ],
  testEnvironment: 'node',
  testTimeout: 10000,
  
  // モジュールマッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/__tests__/fixtures/$1',
  },
  
  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/types/**',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // サービス層は高いカバレッジを要求
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // ユーティリティは最高レベル
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // モック設定
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*)/)',
  ],
  
  // テストパスの除外
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/e2e/',
    '<rootDir>/__tests__/ui/',
    '<rootDir>/__tests__/performance/',
  ],
  
  // セットアップファイル
  globalSetup: '<rootDir>/__tests__/unit/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/unit/globalTeardown.js',
  
  // 詳細な出力
  verbose: true,
  silent: false,
  
  // 失敗時の詳細表示
  errorOnDeprecated: true,
  bail: false,
  
  // モック自動クリア
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
