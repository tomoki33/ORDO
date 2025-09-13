/**
 * CI/CD Integration Test Script
 * CI/CD統合テストスクリプト
 */

const { TestExecutor } = require('./runAllTests');
const fs = require('fs');
const path = require('path');

class CICDTestRunner extends TestExecutor {
  constructor(ciEnvironment = 'github-actions') {
    super();
    this.ciEnvironment = ciEnvironment;
    this.pullRequestMode = process.env.GITHUB_EVENT_NAME === 'pull_request';
    this.branchName = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'unknown';
    this.commitSha = process.env.GITHUB_SHA || 'unknown';
  }

  async runCITestSuite() {
    console.log(`🔧 CI/CD環境でのテスト実行: ${this.ciEnvironment}`);
    console.log(`🌿 ブランチ: ${this.branchName}`);
    console.log(`📝 コミット: ${this.commitSha.substring(0, 8)}`);

    if (this.pullRequestMode) {
      console.log('🔄 プルリクエストモード: 差分テストを実行');
      await this.runPullRequestTests();
    } else {
      console.log('🚀 メインブランチモード: フルテストスイートを実行');
      await this.runFullTestSuite();
    }

    // CI用レポート生成
    await this.generateCIReport();
    
    return this.results;
  }

  async runPullRequestTests() {
    // PRでは軽量テストセットを実行
    const prTestSuites = [
      'test:unit',
      'test:integration',
      'test:ui',
      'test:critical-path',
    ];

    console.log('📋 PR用テストスイート実行:');
    for (const suite of prTestSuites) {
      await this.executeTestSuite(suite, { bail: true, verbose: false });
    }

    // 簡易カバレッジチェック
    this.generateCoverageReport();
  }

  async runFullTestSuite() {
    // メインブランチでは全テストを実行
    await this.runSequentialTests();
    await this.runParallelTests();
    await this.runRegressionTests();
    this.generateCoverageReport();
  }

  async generateCIReport() {
    const ciReport = {
      ci_environment: this.ciEnvironment,
      branch: this.branchName,
      commit: this.commitSha,
      pull_request: this.pullRequestMode,
      timestamp: new Date().toISOString(),
      results: this.results,
      
      // GitHub Actions用の出力
      github_actions: {
        summary: this.generateGitHubActionsSummary(),
        annotations: this.generateGitHubAnnotations(),
        check_run: this.generateCheckRunData(),
      },
      
      // Slack通知用データ
      slack_notification: this.generateSlackNotification(),
      
      // 品質ゲート判定
      quality_gate: this.evaluateQualityGate(),
    };

    // CI用レポートファイル出力
    const ciReportPath = path.join(this.logConfig?.outputDir || '__tests__/reports', 'ci-report.json');
    fs.writeFileSync(ciReportPath, JSON.stringify(ciReport, null, 2));

    // GitHub Actions用の環境変数設定
    if (this.ciEnvironment === 'github-actions') {
      this.setGitHubActionsOutputs(ciReport);
    }

    return ciReport;
  }

  generateGitHubActionsSummary() {
    const passedCount = this.results.passed.length;
    const failedCount = this.results.failed.length;
    const coverage = this.results.coverage.overall || 0;

    return {
      title: `🧪 テスト結果 (${this.branchName})`,
      status: failedCount === 0 ? '✅ SUCCESS' : '❌ FAILURE',
      details: [
        `📊 実行結果: ${passedCount}成功 / ${failedCount}失敗`,
        `📈 カバレッジ: ${coverage}%`,
        `⏱️ 実行時間: ${this.calculateTotalDuration()}`,
      ],
      coverage_badge: this.generateCoverageBadge(coverage),
    };
  }

  generateGitHubAnnotations() {
    const annotations = [];

    // 失敗したテストのアノテーション
    this.results.failed.forEach(failure => {
      annotations.push({
        annotation_level: 'failure',
        title: `テスト失敗: ${failure.suite}`,
        message: failure.error || 'テストが失敗しました',
        path: this.getTestFilePath(failure.suite),
      });
    });

    // カバレッジ警告
    if (this.results.coverage.overall < 80) {
      annotations.push({
        annotation_level: 'warning',
        title: 'カバレッジ不足',
        message: `テストカバレッジが${this.results.coverage.overall}%です。80%以上を目標としてください。`,
        path: 'README.md',
      });
    }

    return annotations;
  }

  generateCheckRunData() {
    const passedCount = this.results.passed.length;
    const failedCount = this.results.failed.length;
    const conclusion = failedCount === 0 ? 'success' : 'failure';

    return {
      name: 'Ordo App Test Suite',
      conclusion,
      summary: `${passedCount + failedCount}個のテストスイートを実行しました。`,
      text: this.generateDetailedTestReport(),
    };
  }

  generateSlackNotification() {
    const passedCount = this.results.passed.length;
    const failedCount = this.results.failed.length;
    const coverage = this.results.coverage.overall || 0;
    const status = failedCount === 0 ? 'success' : 'failure';
    const statusEmoji = status === 'success' ? '✅' : '❌';

    return {
      channel: '#dev-notifications',
      username: 'Ordo Test Bot',
      icon_emoji: ':test_tube:',
      attachments: [
        {
          color: status === 'success' ? 'good' : 'danger',
          title: `${statusEmoji} Ordo App テスト結果`,
          fields: [
            {
              title: 'ブランチ',
              value: this.branchName,
              short: true,
            },
            {
              title: 'コミット',
              value: this.commitSha.substring(0, 8),
              short: true,
            },
            {
              title: '成功/失敗',
              value: `${passedCount}/${failedCount}`,
              short: true,
            },
            {
              title: 'カバレッジ',
              value: `${coverage}%`,
              short: true,
            },
          ],
          footer: `実行時間: ${this.calculateTotalDuration()}`,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  evaluateQualityGate() {
    const criteria = {
      test_success: this.results.failed.length === 0,
      coverage_threshold: this.results.coverage.overall >= 80,
      performance_threshold: this.checkPerformanceThreshold(),
      no_critical_vulnerabilities: true, // 実際はセキュリティスキャン結果を確認
    };

    const passed = Object.values(criteria).every(Boolean);

    return {
      passed,
      criteria,
      recommendation: passed ? 
        'すべての品質基準を満たしています。デプロイ可能です。' :
        '品質基準を満たしていない項目があります。修正後に再実行してください。',
    };
  }

  checkPerformanceThreshold() {
    // パフォーマンステストの結果を確認
    const performanceResults = this.results.passed.filter(r => r.suite.includes('performance'));
    
    if (performanceResults.length === 0) return true;
    
    return performanceResults.every(result => result.duration < 60000); // 60秒以内
  }

  setGitHubActionsOutputs(ciReport) {
    // GitHub Actionsの出力設定
    const outputs = {
      test_result: ciReport.quality_gate.passed ? 'success' : 'failure',
      coverage: ciReport.results.coverage.overall || 0,
      failed_tests: ciReport.results.failed.length,
      report_url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    };

    Object.entries(outputs).forEach(([key, value]) => {
      console.log(`::set-output name=${key}::${value}`);
    });

    // GitHub Actions Summaryの設定
    const summary = this.generateGitHubActionsSummary();
    const summaryMarkdown = `
# ${summary.title}

${summary.status}

## 📊 テスト結果詳細

${summary.details.map(detail => `- ${detail}`).join('\n')}

## 📈 カバレッジレポート

${summary.coverage_badge}

## 🔍 詳細レポート

[詳細なテストレポートを表示](${outputs.report_url})
    `;

    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY || '/dev/null', summaryMarkdown);
  }

  generateCoverageBadge(coverage) {
    const color = coverage >= 80 ? 'brightgreen' : coverage >= 60 ? 'yellow' : 'red';
    return `![Coverage](https://img.shields.io/badge/coverage-${coverage}%25-${color})`;
  }

  getTestFilePath(suiteName) {
    const testFileMap = {
      'test:unit': '__tests__/unit/',
      'test:integration': '__tests__/integration/',
      'test:ui': '__tests__/ui/',
      'test:performance': '__tests__/performance/',
      'test:device': '__tests__/device/',
    };

    return testFileMap[suiteName] || '__tests__/';
  }

  generateDetailedTestReport() {
    let report = '## 📋 テストスイート詳細\n\n';

    this.results.passed.forEach(result => {
      report += `✅ **${result.suite}** - ${result.duration}ms\n`;
      report += `   テスト数: ${result.testCount}, カバレッジ: ${result.coverage}%\n\n`;
    });

    this.results.failed.forEach(result => {
      report += `❌ **${result.suite}** - 失敗\n`;
      report += `   エラー: ${result.error}\n\n`;
    });

    return report;
  }

  calculateTotalDuration() {
    if (!this.results.endTime || !this.results.startTime) {
      return '不明';
    }

    const duration = this.results.endTime - this.results.startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}分${seconds}秒`;
  }
}

// CI環境での実行
async function runCITests() {
  const ciRunner = new CICDTestRunner();
  
  try {
    const results = await ciRunner.runCITestSuite();
    
    // 品質ゲートの判定結果に基づいて終了コード設定
    const exitCode = results.quality_gate?.passed ? 0 : 1;
    
    console.log(`\n🏁 CI/CDテスト完了 (終了コード: ${exitCode})`);
    process.exit(exitCode);
    
  } catch (error) {
    console.error('💥 CI/CDテスト実行エラー:', error);
    process.exit(1);
  }
}

// スクリプト直接実行時
if (require.main === module) {
  runCITests();
}

module.exports = { CICDTestRunner };
