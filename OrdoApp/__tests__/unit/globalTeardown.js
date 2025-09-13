/**
 * Global Teardown for Unit Tests
 * ユニットテスト用グローバル終了処理
 */

module.exports = async () => {
  console.log('🧹 Cleaning up Unit Test Environment...');
  
  // グローバル変数クリア
  delete global.__TEST_ENV__;
  delete global.__COVERAGE_ENABLED__;
  delete global.__TEST_DB_PATH__;
  delete global.__PERFORMANCE_MARKS__;
  
  console.log('✅ Unit Test Environment Cleaned');
};
