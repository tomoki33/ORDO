/**
 * Global Setup for Unit Tests
 * ユニットテスト用グローバルセットアップ
 */

module.exports = async () => {
  console.log('🧪 Starting Unit Test Suite...');
  
  // グローバル変数設定
  global.__TEST_ENV__ = 'unit';
  global.__COVERAGE_ENABLED__ = process.env.COVERAGE === 'true';
  
  // テスト用データベース初期化
  global.__TEST_DB_PATH__ = ':memory:';
  
  // パフォーマンス測定初期化
  global.__PERFORMANCE_MARKS__ = new Map();
  
  console.log('✅ Unit Test Environment Ready');
};
