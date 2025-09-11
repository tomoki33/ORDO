module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  transform: {},
  transformIgnorePatterns: [],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js}',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
};
