/**
 * Jest Integration Test Configuration
 * インテグレーションテスト専用設定
 */

module.exports = {
  preset: 'react-native',
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/integration/setup.js'
  ],
  testEnvironment: 'node',
  testTimeout: 30000, // インテグレーションテストは長時間
  
  // モジュールマッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/__tests__/fixtures/$1',
  },
  
  // カバレッジ設定（インテグレーション特化）
  collectCoverageFrom: [
    'src/services/**/*.{js,jsx,ts,tsx}',
    'src/utils/**/*.{js,jsx,ts,tsx}',
    'src/store/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Transform設定
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
    '<rootDir>/__tests__/unit/',
    '<rootDir>/__tests__/e2e/',
    '<rootDir>/__tests__/ui/',
    '<rootDir>/__tests__/performance/',
  ],
  
  // セットアップファイル
  globalSetup: '<rootDir>/__tests__/integration/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/integration/globalTeardown.js',
  
  // 詳細な出力
  verbose: true,
  
  // 失敗時の詳細表示
  bail: false,
  
  // モック設定
  clearMocks: true,
  resetMocks: true,
  
  // 順次実行（リソース制限のため）
  maxWorkers: 1,
};
