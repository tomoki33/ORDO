/**
 * Global Teardown for Integration Tests
 * インテグレーションテスト用グローバル終了処理
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up Integration Test Environment...');
  
  // テスト用ファイル削除
  try {
    if (global.__TEST_TEMP_DIR__ && fs.existsSync(global.__TEST_TEMP_DIR__)) {
      fs.rmSync(global.__TEST_TEMP_DIR__, { recursive: true, force: true });
      console.log('🗑️ Test temporary directory cleaned');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean test directory:', error.message);
  }
  
  // グローバル変数クリア
  delete global.__TEST_ENV__;
  delete global.__INTEGRATION_TEST__;
  delete global.__TEST_DB_NAME__;
  delete global.__TEST_STORAGE_PREFIX__;
  delete global.__MOCK_NETWORK_DELAY__;
  delete global.__MOCK_NETWORK_FAILURE_RATE__;
  delete global.__TEST_TEMP_DIR__;
  
  console.log('✅ Integration Test Environment Cleaned');
};
