#!/usr/bin/env node

/**
 * Test runner script for Ordo app
 * Provides various testing scenarios and configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_COMMANDS = {
  unit: 'npm run test:unit',
  integration: 'npm run test:integration',
  coverage: 'npm run test:coverage',
  watch: 'npm run test:watch',
  ci: 'npm run test:ci',
  all: 'npm test',
};

const COVERAGE_THRESHOLD = {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,
};

function runCommand(command, options = {}) {
  console.log(`\n🏃 Running: ${command}`);
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options,
    });
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

function checkCoverageThreshold(coveragePath) {
  try {
    const coverageFile = path.join(coveragePath, 'coverage-summary.json');
    if (!fs.existsSync(coverageFile)) {
      console.warn('⚠️  Coverage summary not found');
      return false;
    }

    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const total = coverage.total;

    console.log('\n📊 Coverage Report:');
    console.log(`  Statements: ${total.statements.pct}% (threshold: ${COVERAGE_THRESHOLD.statements}%)`);
    console.log(`  Branches: ${total.branches.pct}% (threshold: ${COVERAGE_THRESHOLD.branches}%)`);
    console.log(`  Functions: ${total.functions.pct}% (threshold: ${COVERAGE_THRESHOLD.functions}%)`);
    console.log(`  Lines: ${total.lines.pct}% (threshold: ${COVERAGE_THRESHOLD.lines}%)`);

    const meetsThreshold = 
      total.statements.pct >= COVERAGE_THRESHOLD.statements &&
      total.branches.pct >= COVERAGE_THRESHOLD.branches &&
      total.functions.pct >= COVERAGE_THRESHOLD.functions &&
      total.lines.pct >= COVERAGE_THRESHOLD.lines;

    if (meetsThreshold) {
      console.log('✅ Coverage threshold met!');
    } else {
      console.log('❌ Coverage threshold not met');
    }

    return meetsThreshold;
  } catch (error) {
    console.error('Error checking coverage:', error.message);
    return false;
  }
}

function generateTestReport() {
  const reportPath = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    testRun: {
      environment: process.env.NODE_ENV || 'test',
      node_version: process.version,
      platform: process.platform,
    },
    results: {},
  };

  // Save report
  const reportFile = path.join(reportPath, `test-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📋 Test report saved to: ${reportFile}`);
}

function runTestSuite(type = 'all') {
  console.log(`\n🧪 Starting ${type} tests for Ordo app\n`);

  const startTime = Date.now();
  
  if (!TEST_COMMANDS[type]) {
    console.error(`❌ Unknown test type: ${type}`);
    console.log(`Available types: ${Object.keys(TEST_COMMANDS).join(', ')}`);
    process.exit(1);
  }

  // Pre-test checks
  console.log('🔍 Running pre-test checks...');
  
  // Check if required files exist
  const requiredFiles = [
    'package.json',
    'jest.config.js',
    '__tests__/setup.js',
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }

  console.log('✅ Pre-test checks passed');

  // Run tests
  const testResult = runCommand(TEST_COMMANDS[type]);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n⏱️  Test duration: ${duration}s`);

  if (testResult.success) {
    console.log('✅ Tests completed successfully!');
    
    // Check coverage if it was a coverage run
    if (type === 'coverage' || type === 'ci') {
      const coveragePath = path.join(process.cwd(), 'coverage');
      checkCoverageThreshold(coveragePath);
    }
    
    generateTestReport();
  } else {
    console.log('❌ Tests failed');
    process.exit(1);
  }
}

function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Install test dependencies if needed
  const testDeps = [
    '@testing-library/react-native',
    '@testing-library/jest-native',
    'react-test-renderer',
  ];
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const missingDeps = testDeps.filter(dep => !allDeps[dep]);
  
  if (missingDeps.length > 0) {
    console.log(`📦 Installing missing test dependencies: ${missingDeps.join(', ')}`);
    runCommand(`npm install --save-dev ${missingDeps.join(' ')}`);
  }
  
  console.log('✅ Test environment ready');
}

function cleanTestArtifacts() {
  console.log('🧹 Cleaning test artifacts...');
  
  const artifactPaths = [
    'coverage',
    'test-results',
    '__tests__/**/*.snap',
  ];
  
  artifactPaths.forEach(artifactPath => {
    if (fs.existsSync(artifactPath)) {
      runCommand(`rm -rf ${artifactPath}`);
    }
  });
  
  console.log('✅ Test artifacts cleaned');
}

function showHelp() {
  console.log(`
🧪 Ordo App Test Runner

Usage: node scripts/test-runner.js [command] [options]

Commands:
  unit         Run unit tests only
  integration  Run integration tests only
  coverage     Run tests with coverage report
  watch        Run tests in watch mode
  ci           Run tests in CI mode
  all          Run all tests (default)
  setup        Setup test environment
  clean        Clean test artifacts
  help         Show this help

Options:
  --verbose    Show verbose output
  --bail       Stop on first test failure
  --silent     Minimize output

Examples:
  node scripts/test-runner.js unit
  node scripts/test-runner.js coverage --verbose
  node scripts/test-runner.js ci --bail
`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  switch (command) {
    case 'setup':
      setupTestEnvironment();
      break;
    case 'clean':
      cleanTestArtifacts();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      runTestSuite(command);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runTestSuite,
  setupTestEnvironment,
  cleanTestArtifacts,
  checkCoverageThreshold,
};
