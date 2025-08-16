#!/usr/bin/env node

/**
 * GitHub Issues 一括作成スクリプト
 * 
 * 使用方法:
 * 1. GitHub Personal Access Token を取得
 * 2. npm install @octokit/rest
 * 3. node bulk-issue-creator.js
 */

const { Octokit } = require('@octokit/rest');

// 設定
const CONFIG = {
  owner: 'tomoki33',  // あなたのGitHubユーザー名
  repo: 'ORDO',               // リポジトリ名
  token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE' // 環境変数から読み取り
};

const octokit = new Octokit({
  auth: CONFIG.token
});

// 全フェーズのタスクデータ
const ALL_TASKS = [
  // === MVP Phase 1: 画像認識コア ===
  {
    title: '[MVP-001] 商品画像認識AI実装',
    body: `## 概要
商品画像から自動的に商品を認識・分類するAI機能の実装

## タスク詳細
- [ ] TensorFlow Lite統合 (8h)
- [ ] 基本認識モデル実装 (16h)
- [ ] 学習データ準備 (12h)
- [ ] 精度向上チューニング (12h)

## 受入基準
- [ ] 一般商品の認識精度85%以上
- [ ] 処理時間3秒以内
- [ ] アプリクラッシュ率1%以下
- [ ] 10カテゴリ以上の商品対応

## 工数
48時間

## 技術要件
- TensorFlow Lite
- React Native Vision
- 画像前処理パイプライン`,
    labels: ['mvp:critical', 'feature:ai-vision', 'size:xl', 'priority:p0'],
    milestone: 1, // MVP v0.1のマイルストーン番号
    assignees: [] // 自分をアサインしたい場合は['your-username']
  },
  
  {
    title: '[MVP-002] 食品状態判定AI',
    body: `## 概要
食品の新鮮度をAIで自動判定する機能

## タスク詳細
- [ ] 新鮮度判定モデル構築 (12h)
- [ ] 状態分類アルゴリズム (8h)
- [ ] UI表示統合 (4h)

## 受入基準
- [ ] 食品状態判定精度90%以上
- [ ] 視覚的に分かりやすい表示
- [ ] 5つの食品カテゴリ対応

## 工数
24時間`,
    labels: ['mvp:critical', 'feature:ai-vision', 'size:l', 'priority:p0']
  },
  
  {
    title: '[MVP-003] 複数商品同時認識',
    body: `## 概要
1枚の画像から複数商品を同時に認識する機能

## タスク詳細
- [ ] 物体検出実装 (8h)
- [ ] 複数領域切り出し (4h)
- [ ] 一括処理機能 (4h)

## 受入基準
- [ ] 1画像で5商品まで同時認識
- [ ] 各商品の信頼度表示
- [ ] ユーザーが修正可能

## 工数
16時間`,
    labels: ['mvp:critical', 'feature:ai-vision', 'size:m', 'priority:p0']
  },
  
  {
    title: '[MVP-004] カメラUI実装',
    body: `## 概要
商品撮影のためのカメラインターフェース

## タスク詳細
- [ ] カメラ機能統合 (8h)
- [ ] 撮影UI設計・実装 (8h)
- [ ] 認識結果表示 (4h)

## 受入基準
- [ ] 直感的な撮影操作
- [ ] 認識エリアのガイド表示
- [ ] 結果確認・修正機能

## 工数
20時間`,
    labels: ['mvp:critical', 'feature:ui-core', 'size:m', 'priority:p1']
  },
  
  {
    title: '[MVP-005] 商品一覧表示',
    body: `## 概要
登録した商品の一覧表示機能

## タスク詳細
- [ ] リストコンポーネント実装 (8h)
- [ ] 商品詳細画面 (4h)
- [ ] 編集・削除機能 (4h)

## 受入基準
- [ ] 写真付きリスト表示
- [ ] 基本的なソート・フィルター
- [ ] 詳細表示・編集・削除

## 工数
16時間`,
    labels: ['mvp:high', 'feature:ui-core', 'size:m', 'priority:p1']
  },
  
  {
    title: '[MVP-006] 基本データベース',
    body: `## 概要
商品データの永続化機能

## タスク詳細
- [ ] データベーススキーマ設計 (4h)
- [ ] データアクセス層実装 (8h)
- [ ] 画像ストレージ管理 (4h)

## 受入基準
- [ ] SQLite/Realm実装
- [ ] 基本CRUD操作
- [ ] 画像ファイル管理

## 工数
16時間`,
    labels: ['mvp:high', 'feature:data', 'size:m', 'priority:p1']
  },
  
  {
    title: '[MVP-007] 期限通知機能',
    body: `## 概要
賞味期限・消費期限の通知機能

## タスク詳細
- [ ] 通知システム実装 (8h)
- [ ] 期限計算ロジック (2h)
- [ ] 設定画面 (2h)

## 受入基準
- [ ] ローカル通知
- [ ] 期限間近アラート
- [ ] 通知設定管理

## 工数
12時間`,
    labels: ['mvp:high', 'feature:ui-core', 'size:s', 'priority:p2']
  },
  
  {
    title: '[MVP-008] 基本設定画面',
    body: `## 概要
アプリの基本設定機能

## タスク詳細
- [ ] 設定画面UI (4h)
- [ ] 設定値永続化 (2h)
- [ ] バックアップ機能 (2h)

## 受入基準
- [ ] 通知設定
- [ ] カテゴリ管理
- [ ] データエクスポート

## 工数
8時間`,
    labels: ['mvp:nice-to-have', 'feature:ui-core', 'size:s', 'priority:p3']
  }
];

// ラベルを作成する関数
async function createLabels() {
  const labels = [
    { name: 'mvp:critical', color: 'ff0000', description: 'MVP必須機能' },
    { name: 'mvp:high', color: 'ff8800', description: 'MVP重要機能' },
    { name: 'mvp:nice-to-have', color: 'ffff00', description: 'MVP追加検討' },
    { name: 'feature:ai-vision', color: '8b5cf6', description: '画像認識機能' },
    { name: 'feature:ui-core', color: '06b6d4', description: 'コアUI機能' },
    { name: 'feature:data', color: '92400e', description: 'データ管理' },
    { name: 'size:s', color: 'e5e7eb', description: '4-8時間' },
    { name: 'size:m', color: 'd1d5db', description: '8-16時間' },
    { name: 'size:l', color: '9ca3af', description: '16-32時間' },
    { name: 'size:xl', color: '6b7280', description: '32時間以上' },
    { name: 'priority:p0', color: 'dc2626', description: '即座対応' },
    { name: 'priority:p1', color: 'f59e0b', description: '高優先度' },
    { name: 'priority:p2', color: 'eab308', description: '中優先度' },
    { name: 'priority:p3', color: '22c55e', description: '低優先度' }
  ];

  for (const label of labels) {
    try {
      await octokit.rest.issues.createLabel({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        ...label
      });
      console.log(`✅ ラベル "${label.name}" を作成しました`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`⚠️  ラベル "${label.name}" は既に存在します`);
      } else {
        console.error(`❌ ラベル "${label.name}" の作成に失敗:`, error.message);
      }
    }
  }
}

// マイルストーンを作成する関数
async function createMilestones() {
  const milestones = [
    {
      title: 'MVP v0.1',
      description: '画像認識基本機能 - 写真撮影で商品登録',
      due_on: '2024-11-15T00:00:00Z'
    },
    {
      title: 'Beta v0.5',
      description: '音声+AI機能 - AI買い物アシスタント',
      due_on: '2025-02-15T00:00:00Z'
    },
    {
      title: 'Production v1.0',
      description: '完全版 - 生活最適化AI',
      due_on: '2025-08-15T00:00:00Z'
    }
  ];

  for (const milestone of milestones) {
    try {
      const response = await octokit.rest.issues.createMilestone({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        ...milestone
      });
      console.log(`✅ マイルストーン "${milestone.title}" を作成しました (ID: ${response.data.number})`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`⚠️  マイルストーン "${milestone.title}" は既に存在します`);
      } else {
        console.error(`❌ マイルストーン "${milestone.title}" の作成に失敗:`, error.message);
      }
    }
  }
}

// Issues を一括作成する関数
async function createIssues() {
  console.log(`🚀 ${MVP_TASKS.length}個のIssueを作成開始...`);
  
  for (let i = 0; i < MVP_TASKS.length; i++) {
    const task = MVP_TASKS[i];
    
    try {
      const response = await octokit.rest.issues.create({
        owner: CONFIG.owner,
        repo: CONFIG.repo,
        title: task.title,
        body: task.body,
        labels: task.labels,
        milestone: task.milestone,
        assignees: task.assignees
      });
      
      console.log(`✅ [${i + 1}/${MVP_TASKS.length}] "${task.title}" を作成しました (#${response.data.number})`);
      
      // API制限を回避するため少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ "${task.title}" の作成に失敗:`, error.message);
    }
  }
  
  console.log('🎉 全てのIssue作成が完了しました！');
}

// メイン実行関数
async function main() {
  try {
    console.log('🏷️  ラベルを作成中...');
    await createLabels();
    
    console.log('\n🎯 マイルストーンを作成中...');
    await createMilestones();
    
    console.log('\n📋 Issuesを作成中...');
    await createIssues();
    
    console.log('\n🎊 セットアップ完了！GitHub Projectsで確認してください。');
    console.log(`📍 https://github.com/${CONFIG.owner}/${CONFIG.repo}/issues`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

// 実行確認
if (CONFIG.token === 'YOUR_PERSONAL_ACCESS_TOKEN') {
  console.error('⚠️  設定が必要です:');
  console.error('1. GitHub Personal Access Token を取得');
  console.error('2. CONFIG の owner, repo, token を更新');
  console.error('3. npm install @octokit/rest');
  process.exit(1);
}

main();
