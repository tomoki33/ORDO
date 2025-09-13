/**
 * Automated Test Execution Master Script
 * 自動テスト実行マスタースクリプト
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// テスト実行設定
const testConfig = {
  sequential: [
    'test:unit',
    'test:integration', 
    'test:ui',
    'test:performance',
    'test:device',
  ],
  parallel: [
    'test:e2e:ios',
    'test:e2e:android',
  ],
  coverage: {
    threshold: 80,
    collectFrom: [
      'src/**/*.{js,jsx,ts,tsx}',
      '!src/**/*.test.{js,jsx,ts,tsx}',
      '!src/**/*.stories.{js,jsx,ts,tsx}',
    ],
  },
  regression: [
    'test:critical-path',
    'test:smoke',
  ],
};

// ログ出力設定
const logConfig = {
  outputDir: './__tests__/reports',
  formats: ['json', 'html', 'lcov'],
  detailedLogs: true,
};

class TestExecutor {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      coverage: {},
      performance: {},
      startTime: new Date(),
      endTime: null,
    };
    
    this.setupOutputDirectory();
  }

  setupOutputDirectory() {
    if (!fs.existsSync(logConfig.outputDir)) {
      fs.mkdirSync(logConfig.outputDir, { recursive: true });
    }
    
    // サブディレクトリ作成
    ['unit', 'integration', 'e2e', 'ui', 'performance', 'device', 'coverage'].forEach(dir => {
      const dirPath = path.join(logConfig.outputDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async executeTestSuite(suiteName, options = {}) {
    console.log(`\n🚀 テストスイート実行開始: ${suiteName}`);
    
    try {
      const startTime = Date.now();
      
      // テスト実行コマンド構築
      const command = this.buildTestCommand(suiteName, options);
      console.log(`📋 実行コマンド: ${command}`);
      
      // テスト実行
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 結果解析
      const result = this.parseTestOutput(output, suiteName, duration);
      this.results.passed.push(result);
      
      console.log(`✅ ${suiteName} 完了 (${duration}ms)`);
      console.log(`   テスト数: ${result.testCount}, 成功: ${result.passCount}, 失敗: ${result.failCount}`);
      
      return result;
      
    } catch (error) {
      console.log(`❌ ${suiteName} 失敗`);
      console.error(error.message);
      
      const failedResult = {
        suite: suiteName,
        status: 'failed',
        error: error.message,
        output: error.stdout || '',
      };
      
      this.results.failed.push(failedResult);
      return failedResult;
    }
  }

  buildTestCommand(suiteName, options) {
    const baseCommands = {
      'test:unit': 'npm run test:unit -- --coverage --coverageDirectory=__tests__/reports/coverage/unit',
      'test:integration': 'npm run test:integration -- --coverage --coverageDirectory=__tests__/reports/coverage/integration',
      'test:ui': 'npm run test:ui -- --updateSnapshot',
      'test:performance': 'npm run test:performance -- --runInBand',
      'test:device': 'npm run test:device -- --runInBand --maxWorkers=1',
      'test:e2e:ios': 'npm run test:e2e:ios',
      'test:e2e:android': 'npm run test:e2e:android',
      'test:critical-path': 'npm run test:unit -- --testNamePattern="critical"',
      'test:smoke': 'npm run test:e2e -- --testNamePattern="smoke"',
    };

    let command = baseCommands[suiteName] || `npm run ${suiteName}`;
    
    // オプション追加
    if (options.verbose) {
      command += ' --verbose';
    }
    
    if (options.bail) {
      command += ' --bail';
    }
    
    if (options.updateSnapshots) {
      command += ' --updateSnapshot';
    }
    
    return command;
  }

  parseTestOutput(output, suiteName, duration) {
    // Jest出力解析
    const testCountMatch = output.match(/Tests:\s+(\d+)\s+passed/);
    const failCountMatch = output.match(/(\d+)\s+failed/);
    const coverageMatch = output.match(/All files[^|]*\|\s*(\d+\.?\d*)/);
    
    return {
      suite: suiteName,
      status: 'passed',
      duration,
      testCount: testCountMatch ? parseInt(testCountMatch[1]) : 0,
      passCount: testCountMatch ? parseInt(testCountMatch[1]) : 0,
      failCount: failCountMatch ? parseInt(failCountMatch[1]) : 0,
      coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0,
      output: output,
      timestamp: new Date().toISOString(),
    };
  }

  async runSequentialTests() {
    console.log('\n📊 シーケンシャルテスト実行開始');
    
    for (const testSuite of testConfig.sequential) {
      await this.executeTestSuite(testSuite, { verbose: true });
      
      // 失敗時の継続判定
      const lastResult = this.results.failed[this.results.failed.length - 1];
      if (lastResult && lastResult.suite === testSuite) {
        console.log(`⚠️  ${testSuite} が失敗しましたが、継続します...`);
      }
    }
  }

  async runParallelTests() {
    console.log('\n🔄 パラレルテスト実行開始');
    
    const promises = testConfig.parallel.map(testSuite => 
      this.executeTestSuite(testSuite, { bail: false })
    );
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('パラレルテスト実行中にエラー:', error);
    }
  }

  async runRegressionTests() {
    console.log('\n🔍 リグレッションテスト実行開始');
    
    for (const testSuite of testConfig.regression) {
      await this.executeTestSuite(testSuite, { bail: true });
    }
  }

  generateCoverageReport() {
    console.log('\n📈 カバレッジレポート生成中...');
    
    try {
      // 統合カバレッジレポート生成
      execSync('npx nyc merge __tests__/reports/coverage .nyc_output/coverage.json', { stdio: 'pipe' });
      execSync('npx nyc report --reporter=html --reporter=text --reporter=lcov --report-dir=__tests__/reports/coverage/combined', { stdio: 'pipe' });
      
      // カバレッジ情報取得
      const coverageData = this.parseCoverageData();
      this.results.coverage = coverageData;
      
      console.log(`📊 総合カバレッジ: ${coverageData.overall}%`);
      
      if (coverageData.overall < testConfig.coverage.threshold) {
        console.log(`⚠️  カバレッジが閾値 ${testConfig.coverage.threshold}% を下回っています`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('カバレッジレポート生成エラー:', error.message);
      return false;
    }
  }

  parseCoverageData() {
    try {
      const coverageFile = path.join(process.cwd(), '.nyc_output', 'coverage.json');
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        
        let totalStatements = 0;
        let coveredStatements = 0;
        
        Object.values(coverage).forEach(file => {
          if (file.s) {
            totalStatements += Object.keys(file.s).length;
            coveredStatements += Object.values(file.s).filter(count => count > 0).length;
          }
        });
        
        const overallCoverage = totalStatements > 0 ? 
          Math.round((coveredStatements / totalStatements) * 100) : 0;
        
        return {
          overall: overallCoverage,
          statements: Math.round((coveredStatements / totalStatements) * 100),
          totalFiles: Object.keys(coverage).length,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('カバレッジデータ解析エラー:', error);
    }
    
    return { overall: 0, statements: 0, totalFiles: 0 };
  }

  generateFinalReport() {
    this.results.endTime = new Date();
    const totalDuration = this.results.endTime - this.results.startTime;
    
    const report = {
      summary: {
        totalDuration: `${Math.round(totalDuration / 1000)}秒`,
        passedSuites: this.results.passed.length,
        failedSuites: this.results.failed.length,
        skippedSuites: this.results.skipped.length,
        overallCoverage: this.results.coverage.overall || 0,
        timestamp: this.results.endTime.toISOString(),
      },
      details: {
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        coverage: this.results.coverage,
      },
      recommendations: this.generateRecommendations(),
    };
    
    // レポートファイル出力
    const reportPath = path.join(logConfig.outputDir, 'test-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // コンソール出力
    this.printFinalSummary(report);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // カバレッジ推奨事項
    if (this.results.coverage.overall < testConfig.coverage.threshold) {
      recommendations.push({
        type: 'coverage',
        message: `カバレッジを ${testConfig.coverage.threshold}% 以上に向上させてください`,
        priority: 'high',
      });
    }
    
    // 失敗したテスト
    if (this.results.failed.length > 0) {
      recommendations.push({
        type: 'failed-tests',
        message: `${this.results.failed.length}個のテストスイートが失敗しています`,
        details: this.results.failed.map(f => f.suite),
        priority: 'high',
      });
    }
    
    // パフォーマンス推奨事項
    const slowTests = this.results.passed.filter(r => r.duration > 30000);
    if (slowTests.length > 0) {
      recommendations.push({
        type: 'performance',
        message: '実行時間が長いテストがあります',
        details: slowTests.map(t => `${t.suite}: ${t.duration}ms`),
        priority: 'medium',
      });
    }
    
    return recommendations;
  }

  printFinalSummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 テスト実行完了サマリー');
    console.log('='.repeat(80));
    console.log(`⏱️  実行時間: ${report.summary.totalDuration}`);
    console.log(`✅ 成功: ${report.summary.passedSuites}スイート`);
    console.log(`❌ 失敗: ${report.summary.failedSuites}スイート`);
    console.log(`⏭️  スキップ: ${report.summary.skippedSuites}スイート`);
    console.log(`📊 カバレッジ: ${report.summary.overallCoverage}%`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 推奨事項:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        if (rec.details) {
          rec.details.forEach(detail => console.log(`   - ${detail}`));
        }
      });
    }
    
    console.log(`\n📁 詳細レポート: ${path.join(logConfig.outputDir, 'test-execution-report.json')}`);
    console.log('='.repeat(80));
  }
}

// メイン実行関数
async function main() {
  const executor = new TestExecutor();
  
  try {
    console.log('🎬 Ordo アプリ 自動テスト実行開始');
    console.log(`📅 開始時刻: ${executor.results.startTime.toLocaleString('ja-JP')}`);
    
    // 1. シーケンシャルテスト実行
    await executor.runSequentialTests();
    
    // 2. パラレルテスト実行
    await executor.runParallelTests();
    
    // 3. リグレッションテスト実行
    await executor.runRegressionTests();
    
    // 4. カバレッジレポート生成
    const coverageSuccess = executor.generateCoverageReport();
    
    // 5. 最終レポート生成
    const finalReport = executor.generateFinalReport();
    
    // 6. 終了ステータス決定
    const hasFailures = executor.results.failed.length > 0;
    const coverageInsufficient = !coverageSuccess;
    
    if (hasFailures || coverageInsufficient) {
      console.log('\n❌ テスト実行が完了しましたが、問題があります');
      process.exit(1);
    } else {
      console.log('\n✅ すべてのテストが正常に完了しました！');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 テスト実行中に予期しないエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

// スクリプト直接実行時のみmain()を呼び出し
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestExecutor, testConfig, logConfig };
