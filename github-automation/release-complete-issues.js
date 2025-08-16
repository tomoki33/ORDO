#!/usr/bin/env node

/**
 * 完全版 リリース対応 Issue作成スクリプト
 * 既存のIssueに加えて、リリースに必要な全てのタスクを追加
 */

const { Octokit } = require('@octokit/rest');

const CONFIG = {
  owner: 'tomoki33',
  repo: 'ORDO',
  token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE'
};

const octokit = new Octokit({
  auth: CONFIG.token
});

// リリースに必要な追加タスク
const ADDITIONAL_RELEASE_TASKS = [
  // === プロジェクト基盤・セットアップ ===
  {
    title: '[SETUP-001] React Native開発環境構築',
    body: `## 🎯 概要
React Nativeプロジェクトの初期セットアップと開発環境構築

## 📋 タスク詳細
- [ ] React Native CLI環境構築 (2h)
- [ ] Expo vs React Native CLI選定 (1h)
- [ ] プロジェクト初期化・設定 (3h)
- [ ] 開発用デバイス・エミュレータ設定 (2h)
- [ ] 基本ナビゲーション実装 (4h)
- [ ] アプリアイコン・スプラッシュ画面 (2h)

## ✅ 受入基準
- [ ] iOS・Android両対応
- [ ] Hot Reload動作確認
- [ ] 基本画面遷移
- [ ] デバッグ環境整備

## ⏱️ 工数: 14時間
## 🔧 Epic: Project Setup`,
    labels: ['mvp:critical', 'epic:setup', 'size:s', 'priority:p0', 'phase:0']
  },

  {
    title: '[SETUP-002] 依存関係・ライブラリ選定',
    body: `## 🎯 概要
必要なライブラリの選定とセットアップ

## 📋 タスク詳細
- [ ] UI コンポーネントライブラリ選定 (2h)
- [ ] 状態管理（Redux/Context API）設定 (4h)
- [ ] データベースライブラリ統合 (3h)
- [ ] カメラ・画像処理ライブラリ (3h)
- [ ] 通知ライブラリセットアップ (2h)
- [ ] AI/ML ライブラリ調査・設定 (4h)

## ✅ 受入基準
- [ ] 安定したライブラリ選定
- [ ] ライセンス互換性確認
- [ ] 基本動作テスト完了
- [ ] 依存関係管理

## ⏱️ 工数: 18時間
## 🔧 Epic: Project Setup`,
    labels: ['mvp:critical', 'epic:setup', 'size:m', 'priority:p0', 'phase:0']
  },

  // === UI/UX設計・実装 ===
  {
    title: '[DESIGN-001] UI/UXデザインシステム構築',
    body: `## 🎯 概要
一貫したデザインシステムとコンポーネント設計

## 📋 タスク詳細
- [ ] デザインシステム策定 (6h)
- [ ] カラーパレット・タイポグラフィ (2h)
- [ ] 共通コンポーネント設計 (8h)
- [ ] レスポンシブ対応 (4h)
- [ ] ダークモード対応 (4h)
- [ ] アクセシビリティ対応 (4h)

## ✅ 受入基準
- [ ] 統一されたデザイン言語
- [ ] 再利用可能コンポーネント
- [ ] 様々な画面サイズ対応
- [ ] ユーザビリティテスト

## ⏱️ 工数: 28時間
## 🔧 Epic: Design System`,
    labels: ['mvp:high', 'epic:design', 'size:l', 'priority:p1', 'phase:1']
  },

  {
    title: '[DESIGN-002] オンボーディング・チュートリアル',
    body: `## 🎯 概要
新規ユーザー向けのオンボーディング体験

## 📋 タスク詳細
- [ ] 初回起動フロー設計 (4h)
- [ ] チュートリアル画面実装 (6h)
- [ ] 権限許可フロー (カメラ・通知) (3h)
- [ ] スキップ機能・進捗表示 (2h)
- [ ] ユーザーガイド・ヘルプ (3h)

## ✅ 受入基準
- [ ] 直感的な初期体験
- [ ] 権限許可の適切な説明
- [ ] スキップ可能な設計
- [ ] ヘルプ・サポート機能

## ⏱️ 工数: 18時間
## 🔧 Epic: User Experience`,
    labels: ['mvp:high', 'epic:ux', 'size:m', 'priority:p2', 'phase:1']
  },

  // === セキュリティ・プライバシー ===
  {
    title: '[SECURITY-001] データ保護・プライバシー対応',
    body: `## 🎯 概要
ユーザーデータの保護とプライバシー法規制対応

## 📋 タスク詳細
- [ ] データ暗号化実装 (6h)
- [ ] ローカルデータ保護 (4h)
- [ ] プライバシーポリシー作成 (3h)
- [ ] GDPR/個人情報保護法対応 (4h)
- [ ] セキュリティ監査・テスト (4h)

## ✅ 受入基準
- [ ] 適切なデータ暗号化
- [ ] 個人情報保護法準拠
- [ ] セキュリティ脆弱性検査
- [ ] ユーザー同意管理

## ⏱️ 工数: 21時間
## 🔧 Epic: Security`,
    labels: ['mvp:critical', 'epic:security', 'size:m', 'priority:p1', 'phase:1']
  },

  // === パフォーマンス・最適化 ===
  {
    title: '[PERF-001] パフォーマンス最適化',
    body: `## 🎯 概要
アプリのパフォーマンス最適化とユーザー体験向上

## 📋 タスク詳細
- [ ] 画像処理最適化 (6h)
- [ ] メモリ使用量最適化 (4h)
- [ ] 起動時間短縮 (3h)
- [ ] AIモデル軽量化 (5h)
- [ ] バックグラウンド処理最適化 (4h)
- [ ] パフォーマンス監視実装 (3h)

## ✅ 受入基準
- [ ] 起動時間3秒以内
- [ ] 画像認識3秒以内
- [ ] メモリリーク無し
- [ ] バッテリー消費最小化

## ⏱️ 工数: 25時間
## 🔧 Epic: Performance`,
    labels: ['mvp:high', 'epic:performance', 'size:l', 'priority:p2', 'phase:2']
  },

  // === エラーハンドリング・ロギング ===
  {
    title: '[MONITOR-001] エラーハンドリング・監視システム',
    body: `## 🎯 概要
包括的なエラーハンドリングと監視システム

## 📋 タスク詳細
- [ ] エラー監視サービス統合 (Crashlytics/Sentry) (4h)
- [ ] カスタムエラーハンドリング (5h)
- [ ] ログシステム実装 (3h)
- [ ] ユーザーフィードバック機能 (4h)
- [ ] オフライン対応エラー処理 (4h)

## ✅ 受入基準
- [ ] 全エラーの適切なハンドリング
- [ ] リアルタイムエラー監視
- [ ] ユーザーに分かりやすいエラー表示
- [ ] 詳細なログ情報取得

## ⏱️ 工数: 20時間
## 🔧 Epic: Monitoring`,
    labels: ['mvp:high', 'epic:monitoring', 'size:m', 'priority:p1', 'phase:1']
  },

  // === ストア申請・配布 ===
  {
    title: '[STORE-001] App Store申請準備',
    body: `## 🎯 概要
Apple App Store申請のための準備作業

## 📋 タスク詳細
- [ ] App Store Connect設定 (2h)
- [ ] アプリメタデータ・説明文作成 (4h)
- [ ] スクリーンショット・プレビュー作成 (4h)
- [ ] App Store Review Guidelines対応 (3h)
- [ ] プライバシー情報・権限説明 (2h)
- [ ] 申請・レビュー対応 (3h)

## ✅ 受入基準
- [ ] Apple Guidelines完全準拠
- [ ] 魅力的なストアページ
- [ ] 適切なカテゴリ・キーワード
- [ ] 申請承認完了

## ⏱️ 工数: 18時間
## 🔧 Epic: Store Release`,
    labels: ['release:critical', 'epic:store', 'size:m', 'priority:p1', 'phase:3']
  },

  {
    title: '[STORE-002] Google Play Store申請準備',
    body: `## 🎯 概要
Google Play Store申請のための準備作業

## 📋 タスク詳細
- [ ] Google Play Console設定 (2h)
- [ ] ストアリスティング作成 (4h)
- [ ] グラフィックアセット作成 (4h)
- [ ] ポリシー対応・コンテンツレーティング (2h)
- [ ] リリーストラック設定 (2h)
- [ ] 申請・公開対応 (2h)

## ✅ 受入基準
- [ ] Google Play Policy完全準拠
- [ ] 効果的なストアリスティング
- [ ] 段階的リリース設定
- [ ] 申請承認・公開完了

## ⏱️ 工数: 16時間
## 🔧 Epic: Store Release`,
    labels: ['release:critical', 'epic:store', 'size:m', 'priority:p1', 'phase:3']
  },

  // === テスト・QA ===
  {
    title: '[QA-001] 包括的テスト戦略実装',
    body: `## 🎯 概要
リリース品質を保証する包括的テスト実装

## 📋 タスク詳細
- [ ] ユニットテスト実装 (12h)
- [ ] インテグレーションテスト (8h)
- [ ] E2Eテスト (10h)
- [ ] UIテスト・スナップショットテスト (6h)
- [ ] パフォーマンステスト (4h)
- [ ] デバイステスト・クロスプラットフォーム (6h)

## ✅ 受入基準
- [ ] テストカバレッジ80%以上
- [ ] 自動テスト実行環境
- [ ] リグレッションテスト
- [ ] 複数デバイス対応確認

## ⏱️ 工数: 46時間
## 🔧 Epic: Quality Assurance`,
    labels: ['release:critical', 'epic:testing', 'size:xl', 'priority:p0', 'phase:2']
  },

  {
    title: '[QA-002] ユーザビリティテスト・ベータテスト',
    body: `## 🎯 概要
実際のユーザーによるテストとフィードバック収集

## 📋 タスク詳細
- [ ] ベータテスト環境構築 (4h)
- [ ] TestFlight/Internal Testing設定 (3h)
- [ ] ユーザビリティテスト計画・実施 (8h)
- [ ] フィードバック収集・分析 (4h)
- [ ] 改善点実装 (8h)

## ✅ 受入基準
- [ ] 10名以上のベータテスター
- [ ] ユーザビリティ課題の解決
- [ ] フィードバック反映
- [ ] 最終品質確認

## ⏱️ 工数: 27時間
## 🔧 Epic: User Testing`,
    labels: ['release:high', 'epic:ux', 'size:l', 'priority:p2', 'phase:3']
  },

  // === ドキュメント・サポート ===
  {
    title: '[DOC-001] ドキュメント・サポート体制構築',
    body: `## 🎯 概要
ユーザー向けドキュメントとサポート体制

## 📋 タスク詳細
- [ ] ユーザーガイド・FAQ作成 (6h)
- [ ] 技術ドキュメント整備 (4h)
- [ ] サポートフォーム・問い合わせ対応 (4h)
- [ ] リリースノート作成 (2h)
- [ ] 多言語対応検討 (3h)

## ✅ 受入基準
- [ ] 包括的なユーザーガイド
- [ ] よくある質問への対応
- [ ] サポート体制確立
- [ ] アプリ内ヘルプ機能

## ⏱️ 工数: 19時間
## 🔧 Epic: Documentation`,
    labels: ['release:high', 'epic:support', 'size:m', 'priority:p2', 'phase:3']
  },

  // === マーケティング・アナリティクス ===
  {
    title: '[MARKET-001] アナリティクス・マーケティング設定',
    body: `## 🎯 概要
ユーザー行動分析とマーケティング施策のための設定

## 📋 タスク詳細
- [ ] Google Analytics/Firebase Analytics統合 (3h)
- [ ] イベント追跡実装 (4h)
- [ ] ユーザー行動分析設計 (3h)
- [ ] A/Bテスト基盤構築 (4h)
- [ ] マーケティング施策分析 (2h)

## ✅ 受入基準
- [ ] 主要KPI追跡可能
- [ ] ユーザー行動の可視化
- [ ] データドリブン改善基盤
- [ ] プライバシー配慮

## ⏱️ 工数: 16時間
## 🔧 Epic: Analytics`,
    labels: ['release:nice-to-have', 'epic:marketing', 'size:m', 'priority:p3', 'phase:3']
  }
];

// 追加ラベル
const ADDITIONAL_LABELS = [
  { name: 'phase:0', color: '001D3D', description: 'Setup Phase - プロジェクト基盤' },
  { name: 'epic:setup', color: '8D4E85', description: 'プロジェクトセットアップ' },
  { name: 'epic:design', color: 'FF6B9D', description: 'デザインシステム' },
  { name: 'epic:ux', color: 'FFB3E6', description: 'ユーザー体験' },
  { name: 'epic:security', color: 'DC143C', description: 'セキュリティ対策' },
  { name: 'epic:performance', color: 'FF8C42', description: 'パフォーマンス最適化' },
  { name: 'epic:monitoring', color: '6A994E', description: '監視・エラー処理' },
  { name: 'epic:store', color: '3A86FF', description: 'ストア申請・配布' },
  { name: 'epic:support', color: '06FFA5', description: 'サポート・ドキュメント' },
  { name: 'epic:marketing', color: 'FFBE0B', description: 'マーケティング・分析' },
  { name: 'release:critical', color: 'B91C1C', description: 'リリース必須' },
  { name: 'release:high', color: 'DC2626', description: 'リリース重要' },
  { name: 'release:nice-to-have', color: 'F97316', description: 'リリース推奨' }
];

async function createAdditionalLabels() {
  console.log('🏷️ 追加ラベルを作成中...');
  
  for (const label of ADDITIONAL_LABELS) {
    try {
      await octokit.rest.issues.createLabel({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        name: label.name,
        color: label.color,
        description: label.description
      });
      console.log(`  ✅ ラベル作成: ${label.name}`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`  ⚠️  既存ラベル: ${label.name}`);
      } else {
        console.error(`  ❌ ラベル作成失敗: ${label.name} - ${error.message}`);
      }
    }
  }
}

async function createAdditionalIssues() {
  console.log(`🚀 ${ADDITIONAL_RELEASE_TASKS.length}個の追加リリースタスクを作成中...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [index, task] of ADDITIONAL_RELEASE_TASKS.entries()) {
    try {
      console.log(`\n[${index + 1}/${ADDITIONAL_RELEASE_TASKS.length}] ${task.title}`);
      
      const issue = await octokit.rest.issues.create({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        title: task.title,
        body: task.body,
        labels: task.labels || [],
        assignees: task.assignees || []
      });
      
      console.log(`  ✅ Issue作成成功: #${issue.data.number}`);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ❌ Issue作成失敗: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n🎉 追加タスク作成完了! 成功: ${successCount}個, 失敗: ${failCount}個`);
}

async function main() {
  console.log('🎯 Ordo プロジェクト - リリース対応完全版タスク作成');
  console.log(`📊 追加タスク数: ${ADDITIONAL_RELEASE_TASKS.length}個\n`);
  
  try {
    await createAdditionalLabels();
    await createAdditionalIssues();
    
    console.log('\n🎊 リリース対応タスクの追加が完了しました!');
    console.log('\n📋 全タスク概要:');
    console.log('✅ 既存17個 + 追加14個 = 合計31個のタスク');
    console.log('\n📈 フェーズ別内訳:');
    console.log('- Phase 0 (Setup): 2タスク - プロジェクト基盤');
    console.log('- Phase 1 (MVP): 8+6タスク - 基本機能+品質');  
    console.log('- Phase 2 (Extension): 4+2タスク - 拡張機能+最適化');
    console.log('- Phase 3 (Advanced): 3+4タスク - 高度機能+リリース準備');
    console.log('- Infrastructure: 2タスク - DevOps');
    console.log('\n🚀 これで完全にリリース可能な状態になります!');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ADDITIONAL_RELEASE_TASKS, ADDITIONAL_LABELS };
