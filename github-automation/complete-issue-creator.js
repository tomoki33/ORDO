#!/usr/bin/env node

/**
 * 完全版 GitHub Issues 一括作成スクリプト
 * 全フェーズの必要なIssueを自動作成
 * 
 * 使用方法:
 * GITHUB_TOKEN=your_token node complete-issue-creator.js
 */

const { Octokit } = require('@octokit/rest');

// 設定
const CONFIG = {
  owner: 'tomoki33',
  repo: 'ORDO',
  token: process.env.GITHUB_TOKEN
};

const octokit = new Octokit({
  auth: CONFIG.token
});

// 全フェーズの完全なタスクデータ
const ALL_TASKS = [
  // === MVP Phase 1: 画像認識コア (3ヶ月) ===
  {
    title: '[MVP-001] 商品画像認識AI実装',
    body: `## 🎯 概要
商品画像から自動的に商品を認識・分類するAI機能の実装

## 📋 タスク詳細
- [ ] TensorFlow Lite環境構築 (8h)
- [ ] 基本認識モデル実装 (16h)
- [ ] 学習データ収集・前処理 (12h)
- [ ] 精度向上チューニング (12h)
- [ ] アプリ統合・テスト (8h)

## ✅ 受入基準
- [ ] 一般商品の認識精度85%以上
- [ ] 処理時間3秒以内
- [ ] アプリクラッシュ率1%以下
- [ ] 10カテゴリ以上の商品対応
- [ ] リアルタイム認識対応

## ⏱️ 工数: 56時間
## 🔧 Epic: AI Vision Core`,
    labels: ['mvp:critical', 'epic:ai-vision', 'size:xl', 'priority:p0', 'phase:1'],
    milestone: 'MVP v0.1'
  },
  
  {
    title: '[MVP-002] 食品状態判定AI',
    body: `## 🎯 概要
食品の新鮮度をAIで自動判定する機能

## 📋 タスク詳細
- [ ] 新鮮度判定モデル構築 (12h)
- [ ] 状態分類アルゴリズム (8h)
- [ ] UI表示統合 (4h)
- [ ] 警告システム連携 (4h)

## ✅ 受入基準
- [ ] 食品状態判定精度90%以上
- [ ] 視覚的に分かりやすい表示
- [ ] 5つの食品カテゴリ対応
- [ ] 期限アラートとの連携

## ⏱️ 工数: 28時間
## 🔧 Epic: AI Vision Core`,
    labels: ['mvp:critical', 'epic:ai-vision', 'size:l', 'priority:p0', 'phase:1']
  },
  
  {
    title: '[MVP-003] 複数商品同時認識',
    body: `## 🎯 概要
1枚の画像から複数商品を同時に認識する機能

## 📋 タスク詳細
- [ ] 物体検出アルゴリズム実装 (8h)
- [ ] 複数領域切り出し (4h)
- [ ] 一括処理最適化 (4h)
- [ ] UI表示改良 (4h)

## ✅ 受入基準
- [ ] 1画像で5商品まで同時認識
- [ ] 各商品の信頼度表示
- [ ] ユーザーが修正・確認可能
- [ ] バッチ処理対応

## ⏱️ 工数: 20時間
## 🔧 Epic: AI Vision Core`,
    labels: ['mvp:critical', 'epic:ai-vision', 'size:m', 'priority:p0', 'phase:1']
  },
  
  {
    title: '[MVP-004] カメラUI実装',
    body: `## 🎯 概要
商品撮影のための直感的なカメラインターフェース

## 📋 タスク詳細
- [ ] React Native Camera統合 (8h)
- [ ] 撮影UI設計・実装 (8h)
- [ ] 認識結果表示画面 (6h)
- [ ] ガイド・ヘルプ機能 (4h)

## ✅ 受入基準
- [ ] 直感的な撮影操作
- [ ] 認識エリアのガイド表示
- [ ] 結果確認・修正機能
- [ ] 複数商品対応UI

## ⏱️ 工数: 26時間
## 🔧 Epic: UI Core`,
    labels: ['mvp:critical', 'epic:ui-core', 'size:l', 'priority:p1', 'phase:1']
  },
  
  {
    title: '[MVP-005] 商品一覧・詳細画面',
    body: `## 🎯 概要
登録した商品の一覧表示と詳細管理機能

## 📋 タスク詳細
- [ ] 商品リストコンポーネント (8h)
- [ ] 商品詳細画面 (6h)
- [ ] 編集・削除機能 (4h)
- [ ] 検索・フィルター (4h)

## ✅ 受入基準
- [ ] 写真付きリスト表示
- [ ] 基本的なソート・フィルター
- [ ] 詳細表示・編集・削除
- [ ] カテゴリ別表示

## ⏱️ 工数: 22時間
## 🔧 Epic: UI Core`,
    labels: ['mvp:high', 'epic:ui-core', 'size:m', 'priority:p1', 'phase:1']
  },
  
  {
    title: '[MVP-006] データベース設計・実装',
    body: `## 🎯 概要
商品データの永続化とデータアクセス層

## 📋 タスク詳細
- [ ] データベーススキーマ設計 (4h)
- [ ] SQLite/Realm実装 (8h)
- [ ] 画像ストレージ管理 (6h)
- [ ] データ移行機能 (4h)

## ✅ 受入基準
- [ ] 効率的なデータベーススキーマ
- [ ] 基本CRUD操作
- [ ] 画像ファイル管理
- [ ] データバックアップ機能

## ⏱️ 工数: 22時間
## 🔧 Epic: Data Management`,
    labels: ['mvp:high', 'epic:data', 'size:m', 'priority:p1', 'phase:1']
  },
  
  {
    title: '[MVP-007] 期限通知システム',
    body: `## 🎯 概要
賞味期限・消費期限の通知とアラート機能

## 📋 タスク詳細
- [ ] ローカル通知システム (8h)
- [ ] 期限計算・管理ロジック (4h)
- [ ] 通知設定画面 (4h)
- [ ] バックグラウンド処理 (4h)

## ✅ 受入基準
- [ ] 期限間近アラート
- [ ] カスタマイズ可能な通知設定
- [ ] バックグラウンド実行
- [ ] 通知履歴管理

## ⏱️ 工数: 20時間
## 🔧 Epic: Notification`,
    labels: ['mvp:high', 'epic:notification', 'size:m', 'priority:p2', 'phase:1']
  },
  
  {
    title: '[MVP-008] 基本設定・管理画面',
    body: `## 🎯 概要
アプリの基本設定と管理機能

## 📋 タスク詳細
- [ ] 設定画面UI (6h)
- [ ] カテゴリ管理 (4h)
- [ ] データエクスポート・インポート (6h)
- [ ] アプリ情報・ヘルプ (2h)

## ✅ 受入基準
- [ ] 直感的な設定インターフェース
- [ ] カテゴリのカスタマイズ
- [ ] データのバックアップ・復元
- [ ] ヘルプ・チュートリアル

## ⏱️ 工数: 18時間
## 🔧 Epic: UI Core`,
    labels: ['mvp:nice-to-have', 'epic:ui-core', 'size:s', 'priority:p3', 'phase:1']
  },

  // === Phase 2: 拡張機能 (3ヶ月) ===
  {
    title: '[EXT-001] バーコードスキャン機能',
    body: `## 🎯 概要
バーコード/QRコードスキャンによる商品情報自動取得

## 📋 タスク詳細
- [ ] バーコードスキャンライブラリ統合 (4h)
- [ ] 商品API連携 (楽天API) (8h)
- [ ] 自動情報入力システム (6h)
- [ ] UI統合 (4h)

## ✅ 受入基準
- [ ] JAN/EAN/QRコード対応
- [ ] 商品情報自動取得
- [ ] 手動修正機能
- [ ] オフライン時の対応

## ⏱️ 工数: 22時間
## 🔧 Epic: Product Recognition`,
    labels: ['enhancement', 'epic:product-info', 'size:m', 'priority:p1', 'phase:2']
  },
  
  {
    title: '[EXT-002] 音声コマンド機能',
    body: `## 🎯 概要
音声による商品追加・検索機能

## 📋 タスク詳細
- [ ] 音声認識ライブラリ統合 (6h)
- [ ] 自然言語処理 (8h)
- [ ] 音声コマンド解析 (6h)
- [ ] マルチ言語対応 (4h)

## ✅ 受入基準
- [ ] 基本的な音声コマンド対応
- [ ] 商品名・数量の音声入力
- [ ] 日本語・英語対応
- [ ] ノイズ耐性

## ⏱️ 工数: 24時間
## 🔧 Epic: Voice Interface`,
    labels: ['enhancement', 'epic:voice', 'size:l', 'priority:p2', 'phase:2']
  },
  
  {
    title: '[EXT-003] 在庫予測・推奨機能',
    body: `## 🎯 概要
使用パターンに基づく在庫予測と購入推奨

## 📋 タスク詳細
- [ ] 使用履歴分析エンジン (8h)
- [ ] 予測アルゴリズム実装 (6h)
- [ ] 推奨システムUI (4h)
- [ ] 学習データ蓄積 (4h)

## ✅ 受入基準
- [ ] 消費パターン学習
- [ ] 購入推奨リスト生成
- [ ] 季節性考慮
- [ ] ユーザー設定連携

## ⏱️ 工数: 22時間
## 🔧 Epic: Smart Prediction`,
    labels: ['enhancement', 'epic:ai-prediction', 'size:m', 'priority:p2', 'phase:2']
  },
  
  {
    title: '[EXT-004] レシート読み取りAI',
    body: `## 🎯 概要
レシートのOCR読み取りによる一括商品登録

## 📋 タスク詳細
- [ ] OCRエンジン統合 (6h)
- [ ] レシート解析ロジック (8h)
- [ ] 商品データマッピング (6h)
- [ ] UI統合・確認画面 (4h)

## ✅ 受入基準
- [ ] 主要小売店レシート対応
- [ ] 商品名・価格・日付抽出
- [ ] 手動修正機能
- [ ] 複数レシート対応

## ⏱️ 工数: 24時間
## 🔧 Epic: Receipt Processing`,
    labels: ['enhancement', 'epic:ai-vision', 'size:l', 'priority:p1', 'phase:2']
  },

  // === Phase 3: 高度な機能 (3ヶ月) ===
  {
    title: '[ADV-001] クラウド同期機能',
    body: `## 🎯 概要
複数デバイス間でのデータ同期

## 📋 タスク詳細
- [ ] Firebase/AWS設計 (8h)
- [ ] 認証システム (6h)
- [ ] 同期エンジン実装 (10h)
- [ ] コンフリクト解決 (6h)

## ✅ 受入基準
- [ ] リアルタイム同期
- [ ] オフライン対応
- [ ] データ整合性保証
- [ ] セキュリティ確保

## ⏱️ 工数: 30時間
## 🔧 Epic: Cloud Integration`,
    labels: ['advanced', 'epic:cloud', 'size:xl', 'priority:p1', 'phase:3']
  },
  
  {
    title: '[ADV-002] 家族共有機能',
    body: `## 🎯 概要
家族間での在庫情報共有

## 📋 タスク詳細
- [ ] ユーザー管理システム (8h)
- [ ] 権限管理 (6h)
- [ ] 共有UI実装 (6h)
- [ ] 通知システム連携 (4h)

## ✅ 受入基準
- [ ] 家族メンバー招待
- [ ] 権限レベル設定
- [ ] 共有在庫管理
- [ ] 活動通知

## ⏱️ 工数: 24時間
## 🔧 Epic: Family Sharing`,
    labels: ['advanced', 'epic:sharing', 'size:l', 'priority:p2', 'phase:3']
  },
  
  {
    title: '[ADV-003] 購入履歴・統計分析',
    body: `## 🎯 概要
購入パターンの詳細分析とレポート機能

## 📋 タスク詳細
- [ ] 統計エンジン実装 (8h)
- [ ] グラフ・チャートUI (6h)
- [ ] レポート生成機能 (4h)
- [ ] エクスポート機能 (4h)

## ✅ 受入基準
- [ ] 月次・年次レポート
- [ ] カテゴリ別分析
- [ ] トレンド表示
- [ ] CSV/PDF出力

## ⏱️ 工数: 22時間
## 🔧 Epic: Analytics`,
    labels: ['advanced', 'epic:analytics', 'size:m', 'priority:p3', 'phase:3']
  },

  // === 基盤・DevOps ===
  {
    title: '[INFRA-001] CI/CD パイプライン構築',
    body: `## 🎯 概要
自動ビルド・デプロイ・テストパイプライン

## 📋 タスク詳細
- [ ] GitHub Actions設定 (4h)
- [ ] 自動テスト環境 (6h)
- [ ] ビルド・配信設定 (6h)
- [ ] 品質ゲート設定 (2h)

## ✅ 受入基準
- [ ] プルリクエスト自動テスト
- [ ] ステージング自動デプロイ
- [ ] 本番リリース承認フロー
- [ ] テストカバレッジ80%以上

## ⏱️ 工数: 18時間
## 🔧 Epic: Infrastructure`,
    labels: ['infrastructure', 'epic:devops', 'size:m', 'priority:p1', 'phase:1']
  },
  
  {
    title: '[INFRA-002] テスト自動化',
    body: `## 🎯 概要
包括的なテスト戦略と自動化

## 📋 タスク詳細
- [ ] Unit Test環境構築 (4h)
- [ ] Integration Test実装 (8h)
- [ ] E2E Test設定 (6h)
- [ ] パフォーマンステスト (4h)

## ✅ 受入基準
- [ ] 各機能のテストカバレッジ
- [ ] CI/CDパイプライン統合
- [ ] 回帰テスト自動実行
- [ ] テストレポート生成

## ⏱️ 工数: 22時間
## 🔧 Epic: Quality Assurance`,
    labels: ['infrastructure', 'epic:testing', 'size:m', 'priority:p2', 'phase:1']
  }
];

// ラベル定義
const LABELS = [
  // Priority Labels
  { name: 'priority:p0', color: 'FF0000', description: '最優先 - 即座に対応が必要' },
  { name: 'priority:p1', color: 'FF8C00', description: '高優先度' },
  { name: 'priority:p2', color: 'FFD700', description: '中優先度' },
  { name: 'priority:p3', color: '32CD32', description: '低優先度' },
  
  // Phase Labels
  { name: 'phase:1', color: '0052CC', description: 'MVP Phase 1' },
  { name: 'phase:2', color: '0079BF', description: 'Extension Phase 2' },
  { name: 'phase:3', color: '00A3E0', description: 'Advanced Phase 3' },
  
  // Size Labels
  { name: 'size:xs', color: 'E6E6FA', description: '4時間以下' },
  { name: 'size:s', color: 'DDA0DD', description: '4-12時間' },
  { name: 'size:m', color: 'DA70D6', description: '12-24時間' },
  { name: 'size:l', color: 'BA55D3', description: '24-40時間' },
  { name: 'size:xl', color: '9932CC', description: '40時間以上' },
  
  // Type Labels
  { name: 'mvp:critical', color: 'D73A49', description: 'MVP必須機能' },
  { name: 'mvp:high', color: 'F85149', description: 'MVP重要機能' },
  { name: 'mvp:nice-to-have', color: 'FB8500', description: 'MVP付加機能' },
  { name: 'enhancement', color: '0E8A16', description: '機能拡張' },
  { name: 'advanced', color: '1F883D', description: '高度な機能' },
  { name: 'infrastructure', color: '6F42C1', description: 'インフラ・DevOps' },
  
  // Epic Labels
  { name: 'epic:ai-vision', color: 'FF6B6B', description: 'AI画像認識関連' },
  { name: 'epic:ui-core', color: '4ECDC4', description: 'コアUI機能' },
  { name: 'epic:data', color: '45B7D1', description: 'データ管理' },
  { name: 'epic:notification', color: 'FFA07A', description: '通知システム' },
  { name: 'epic:product-info', color: '98D8C8', description: '商品情報取得' },
  { name: 'epic:voice', color: 'F7DC6F', description: '音声インターフェース' },
  { name: 'epic:ai-prediction', color: 'BB8FCE', description: 'AI予測・推奨' },
  { name: 'epic:cloud', color: '85C1E9', description: 'クラウド統合' },
  { name: 'epic:sharing', color: 'F8C471', description: '共有機能' },
  { name: 'epic:analytics', color: 'AED6F1', description: '分析・レポート' },
  { name: 'epic:devops', color: '6C757D', description: 'DevOps・CI/CD' },
  { name: 'epic:testing', color: '868E96', description: 'テスト・品質管理' }
];

// ラベル作成関数
async function createLabels() {
  console.log('🏷️ ラベルを作成中...');
  
  for (const label of LABELS) {
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

// マイルストーン作成関数
async function createMilestones() {
  console.log('🎯 マイルストーンを作成中...');
  
  const milestones = [
    {
      title: 'MVP v0.1',
      description: 'MVP Phase 1 - 基本的な画像認識と在庫管理機能',
      due_on: '2025-11-16T23:59:59Z' // 3ヶ月後
    },
    {
      title: 'Extension v0.2', 
      description: 'Phase 2 - 機能拡張と利便性向上',
      due_on: '2026-02-16T23:59:59Z' // 6ヶ月後
    },
    {
      title: 'Advanced v1.0',
      description: 'Phase 3 - 高度な機能とクラウド連携',
      due_on: '2026-05-16T23:59:59Z' // 9ヶ月後
    }
  ];
  
  for (const milestone of milestones) {
    try {
      await octokit.rest.issues.createMilestone({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        title: milestone.title,
        description: milestone.description,
        due_on: milestone.due_on
      });
      console.log(`  ✅ マイルストーン作成: ${milestone.title}`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`  ⚠️  既存マイルストーン: ${milestone.title}`);
      } else {
        console.error(`  ❌ マイルストーン作成失敗: ${milestone.title} - ${error.message}`);
      }
    }
  }
}

// Issues作成関数
async function createAllIssues() {
  console.log(`🚀 ${ALL_TASKS.length}個のIssueを作成中...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [index, task] of ALL_TASKS.entries()) {
    try {
      console.log(`\n[${index + 1}/${ALL_TASKS.length}] ${task.title}`);
      
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
      
      // APIレート制限を避けるために少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ❌ Issue作成失敗: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n🎉 作成完了! 成功: ${successCount}個, 失敗: ${failCount}個`);
}

// メイン実行関数
async function main() {
  console.log('🎯 Ordo プロジェクト - 全Issue自動作成開始');
  console.log(`📊 合計タスク数: ${ALL_TASKS.length}個\n`);
  
  try {
    // 1. ラベル作成
    await createLabels();
    
    // 2. マイルストーン作成
    await createMilestones();
    
    // 3. 全Issue作成
    await createAllIssues();
    
    console.log('\n🎊 全ての設定が完了しました!');
    console.log('\n📋 次のステップ:');
    console.log('1. GitHub Projects でプロジェクトボードを作成');
    console.log('2. カスタムフィールド (Priority, Epic, Size) を設定');
    console.log('3. GitHub Actions でIssue自動追加を有効化');
    console.log('4. 開発開始! 🚀');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.log('\n🔧 トラブルシューティング:');
    console.log('- GITHUB_TOKEN環境変数が設定されているか確認');
    console.log('- トークンに repo 権限があるか確認');
    console.log('- リポジトリ名とオーナー名が正しいか確認');
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { ALL_TASKS, LABELS, createAllIssues };
