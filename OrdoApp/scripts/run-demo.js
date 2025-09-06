#!/usr/bin/env node

/**
 * Ordo App - デモ実行スクリプト
 * 
 * Phase 10とPhase 11のデモ機能をローカルで実行
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// ログ出力関数
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log('='.repeat(60), colors.cyan);
  log(`🚀 ${message}`, colors.bright + colors.blue);
  log('='.repeat(60), colors.cyan);
  console.log('');
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// メインデモ実行関数
async function runDemo() {
  try {
    logHeader('Ordo App デモ実行開始');

    // 1. 環境確認
    await checkEnvironment();

    // 2. 依存関係確認
    await checkDependencies();

    // 3. TypeScript コンパイル確認
    await checkTypeScript();

    // 4. デモ選択メニュー
    await showDemoMenu();

  } catch (error) {
    logError(`デモ実行中にエラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// 環境確認
async function checkEnvironment() {
  logHeader('環境確認');

  try {
    // Node.js バージョン確認
    const nodeVersion = process.version;
    logInfo(`Node.js バージョン: ${nodeVersion}`);

    const requiredNodeVersion = 18;
    const currentNodeVersion = parseInt(nodeVersion.slice(1));
    
    if (currentNodeVersion >= requiredNodeVersion) {
      logSuccess(`Node.js バージョン要件を満たしています (>= ${requiredNodeVersion})`);
    } else {
      throw new Error(`Node.js ${requiredNodeVersion}以上が必要です`);
    }

    // npm バージョン確認
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      logInfo(`npm バージョン: ${npmVersion}`);
      logSuccess('npm が利用可能です');
    } catch (error) {
      logWarning('npm が見つかりません');
    }

    // React Native CLI 確認
    try {
      const rnVersion = execSync('npx react-native --version', { encoding: 'utf8' }).trim();
      logInfo(`React Native CLI: ${rnVersion.split('\n')[0]}`);
      logSuccess('React Native CLI が利用可能です');
    } catch (error) {
      logWarning('React Native CLI が見つかりません');
    }

  } catch (error) {
    throw new Error(`環境確認エラー: ${error.message}`);
  }
}

// 依存関係確認
async function checkDependencies() {
  logHeader('依存関係確認');

  try {
    // package.json 確認
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json が見つかりません');
    }
    logSuccess('package.json を確認しました');

    // node_modules 確認
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      logWarning('node_modules が見つかりません。依存関係をインストールします...');
      execSync('npm install', { stdio: 'inherit' });
      logSuccess('依存関係のインストールが完了しました');
    } else {
      logSuccess('node_modules を確認しました');
    }

    // 主要な依存関係確認
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = [
      '@tensorflow/tfjs',
      'react-native',
      'react'
    ];

    for (const dep of requiredDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        logWarning(`${dep} が見つかりません`);
      }
    }

  } catch (error) {
    throw new Error(`依存関係確認エラー: ${error.message}`);
  }
}

// TypeScript コンパイル確認
async function checkTypeScript() {
  logHeader('TypeScript コンパイル確認');

  try {
    logInfo('TypeScript 型チェックを実行中...');
    execSync('npm run type-check', { stdio: 'pipe' });
    logSuccess('TypeScript コンパイルが成功しました');
  } catch (error) {
    logWarning('TypeScript コンパイルエラーがあります');
    logInfo('デモは続行しますが、一部機能が正常に動作しない可能性があります');
  }
}

// デモ選択メニュー
async function showDemoMenu() {
  logHeader('デモ選択メニュー');

  console.log('利用可能なデモ:');
  console.log('');
  log('1. Phase 10 拡張機能デモ (32時間実装)', colors.cyan);
  log('   🔬 学習データ収集・前処理 (12h)', colors.blue);
  log('   🎯 AI精度向上・チューニング (12h)', colors.blue);
  log('   🧪 アプリ統合・テスト (8h)', colors.blue);
  console.log('');
  log('2. Phase 11 新機能デモ (28時間実装)', colors.magenta);
  log('   🔬 新鮮度判定モデル構築 (12h)', colors.blue);
  log('   🔍 状態分類アルゴリズム (8h)', colors.blue);
  log('   🎨 UI表示統合 (4h)', colors.blue);
  log('   🚨 警告システム連携 (4h)', colors.blue);
  console.log('');
  log('3. 統合システムデモ (両フェーズ)', colors.green);
  log('4. 個別機能デモ', colors.yellow);
  log('5. 終了', colors.red);
  console.log('');

  // 実際の環境では readline を使用してユーザー入力を受け取りますが、
  // ここでは各デモを順次実行する方法を示します
  logInfo('デモ実行方法:');
  console.log('');
  log('📋 Method 1: Node.js スクリプトで実行', colors.bright);
  console.log('  cd /Users/tomoki33/Desktop/Ordo/OrdoApp');
  console.log('  node scripts/demo-runner.js');
  console.log('');
  log('📋 Method 2: React Native アプリ内で実行', colors.bright);
  console.log('  npm start');
  console.log('  # 別ターミナル:');
  console.log('  npm run ios   # または npm run android');
  console.log('');
  log('📋 Method 3: 直接インポートして実行', colors.bright);
  console.log('  import { phase10ExtensionDemo } from "./src/utils/Phase10ExtensionDemo";');
  console.log('  import { phase11NewFeaturesDemo } from "./src/utils/Phase11NewFeaturesDemo";');
  console.log('  phase10ExtensionDemo.runCompleteDemo();');
  console.log('  phase11NewFeaturesDemo.runCompleteDemo();');
}

// スクリプト実行
if (require.main === module) {
  runDemo().catch(error => {
    logError(`予期しないエラー: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runDemo,
  checkEnvironment,
  checkDependencies,
  checkTypeScript
};
