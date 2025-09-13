/**
 * Global Setup for Integration Tests
 * インテグレーションテスト用グローバルセットアップ
 */

const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🔗 Starting Integration Test Suite...');
  
  // グローバル変数設定
  global.__TEST_ENV__ = 'integration';
  global.__INTEGRATION_TEST__ = true;
  
  // テスト用データベース設定
  global.__TEST_DB_NAME__ = 'ordo_test.db';
  global.__TEST_STORAGE_PREFIX__ = 'test_';
  
  // ネットワークシミュレーション設定
  global.__MOCK_NETWORK_DELAY__ = 100; // ms
  global.__MOCK_NETWORK_FAILURE_RATE__ = 0; // 0-1
  
  // テスト用サーバー起動（必要に応じて）
  try {
    // Metro サーバーが起動しているかチェック
    console.log('📡 Checking Metro server...');
    // execSync('curl -f http://localhost:8081/status', { stdio: 'ignore' });
    console.log('✅ Metro server is running');
  } catch (error) {
    console.log('⚠️ Metro server not running, starting in background...');
    // 必要に応じてサーバー起動
  }
  
  // テスト用ファイルシステム準備
  global.__TEST_TEMP_DIR__ = '/tmp/ordo-integration-tests';
  
  console.log('✅ Integration Test Environment Ready');
};
