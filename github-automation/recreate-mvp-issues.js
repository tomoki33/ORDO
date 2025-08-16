#!/usr/bin/env node

/**
 * MVP-001~003 再生成スクリプト
 * 消えてしまったMVPの最重要Issueを再作成
 */

const { Octokit } = require('@octokit/rest');

const CONFIG = {
  owner: 'tomoki33',
  repo: 'ORDO',
  token: process.env.GITHUB_TOKEN
};

const octokit = new Octokit({
  auth: CONFIG.token
});

// MVP-001~003の復旧データ
const MVP_CORE_TASKS = [
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
## 🔧 Epic: AI Vision Core

## 🚀 差別化ポイント
このタスクがOrdoアプリの**最大の差別化機能**です：
- 従来アプリ: バーコード+手動入力（30秒〜2分）
- Ordo: 写真撮影のみ（3秒で完了）
- **99%の手間削減を実現**

## 🛠 技術実装詳細

### Phase 1: 環境構築 (8h)
\`\`\`bash
# React Native TensorFlow.js セットアップ
npm install @tensorflow/tfjs-react-native
npm install @tensorflow/tfjs-platform-react-native
npm install react-native-fs  # ファイルシステム操作

# iOS Core ML 対応
pod install  # Xcode設定
\`\`\`

### Phase 2: 基本モデル実装 (16h)
\`\`\`javascript
// 商品認識モデルの基本構造
import * as tf from '@tensorflow/tfjs';

class ProductRecognizer {
  constructor() {
    this.model = null;
    this.categories = ['food', 'beverage', 'cosmetics', 'medicine', 'other'];
  }
  
  async loadModel() {
    this.model = await tf.loadLayersModel('path/to/model.json');
  }
  
  async recognizeProduct(imageUri) {
    // 画像前処理 → モデル推論 → 結果解析
    const predictions = await this.model.predict(preprocessedImage);
    return this.postProcess(predictions);
  }
}
\`\`\`

### Phase 3: 学習データ準備 (12h)
- 商品画像データセット収集（1000枚以上）
- アノテーション・ラベリング作業
- データ拡張（回転、明度変更、ノイズ付加）
- 学習用・検証用・テスト用の分割

### Phase 4: 精度チューニング (12h)
- モデルアーキテクチャの最適化
- ハイパーパラメータ調整
- 誤認識ケースの分析・改善
- リアルタイム処理の最適化

### Phase 5: アプリ統合 (8h)
- カメラ機能との連携
- 認識結果の表示・確認UI
- エラーハンドリング・フォールバック機能
- パフォーマンス監視・ログ機能`,
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
- [ ] 5つの食品カテゴリ対応（野菜・果物・肉・魚・乳製品）
- [ ] 期限アラートとの連携

## ⏱️ 工数: 28時間
## 🔧 Epic: AI Vision Core

## 🎨 状態判定の視覚化

### 判定結果の表示
\`\`\`
🟢 新鮮 (Fresh)    - 緑色背景、チェックマーク
🟡 注意 (Caution)  - 黄色背景、注意マーク  
🔴 期限切れ (Expired) - 赤色背景、警告マーク
\`\`\`

## 🛠 技術実装詳細

### 判定対象食品カテゴリ
1. **野菜類**: レタス、トマト、きゅうり、にんじん
2. **果物類**: りんご、バナナ、オレンジ、いちご
3. **肉類**: 牛肉、豚肉、鶏肉（色の変化で判定）
4. **魚類**: 鮮魚、刺身（目の濁り、色の変化）
5. **乳製品**: 牛乳、ヨーグルト（パッケージの変形等）

### AI判定アルゴリズム
\`\`\`javascript
class FreshnesDetector {
  async analyzeFreshness(imageUri, productCategory) {
    const features = await this.extractVisualFeatures(imageUri);
    const freshness = await this.classifyFreshness(features, productCategory);
    
    return {
      status: freshness.label,  // 'fresh', 'caution', 'expired'
      confidence: freshness.confidence,
      daysRemaining: this.estimateShelfLife(freshness),
      recommendations: this.generateRecommendations(freshness)
    };
  }
  
  extractVisualFeatures(image) {
    // 色相・彩度・明度の分析
    // テクスチャ・形状の特徴抽出
    // しおれ・腐敗の兆候検出
    return features;
  }
}
\`\`\`

### ユーザーインターフェース
- 商品撮影と同時に新鮮度判定を実行
- 判定結果をリアルタイムでオーバーレイ表示
- 状態に応じた保存方法・調理方法の提案
- 期限切れ予測に基づくアラート設定`,
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
## 🔧 Epic: AI Vision Core

## 🎯 機能の価値提案
- **従来**: 商品1個ずつ撮影・登録（5商品 = 5回撮影）
- **Ordo**: 1回撮影で5商品まとめて認識
- **効率**: **5倍の作業効率向上**

## 🛠 技術実装詳細

### Object Detection アーキテクチャ
\`\`\`javascript
class MultiProductDetector {
  constructor() {
    this.detector = null;  // YOLO or MobileNet SSD
    this.classifier = null; // 商品分類モデル
  }
  
  async detectMultipleProducts(imageUri) {
    // Step 1: 物体検出で商品領域を特定
    const detections = await this.detector.detect(imageUri);
    
    // Step 2: 各領域を切り出して分類
    const results = [];
    for (const detection of detections) {
      const croppedImage = await this.cropImage(imageUri, detection.bbox);
      const classification = await this.classifier.classify(croppedImage);
      
      results.push({
        bbox: detection.bbox,
        product: classification.product,
        confidence: classification.confidence,
        freshness: await this.analyzeFreshness(croppedImage)
      });
    }
    
    return results;
  }
}
\`\`\`

### UI/UX 設計

#### 撮影時
- カメラプレビューに検出枠をリアルタイム表示
- 「5個まで同時認識可能」のガイド表示
- 最適な撮影角度・距離のアドバイス

#### 認識結果表示
\`\`\`
┌─────────────────────────────────┐
│  📸 認識結果 (3商品検出)          │
├─────────────────────────────────┤
│ 🥛 牛乳 (信頼度: 95%) ✅        │
│ 🍞 パン (信頼度: 87%) ✅        │  
│ 🥕 ？商品 (信頼度: 65%) ❓      │ ← 手動修正可能
├─────────────────────────────────┤
│ [一括登録] [個別修正] [再撮影]    │
└─────────────────────────────────┘
\`\`\`

### パフォーマンス最適化
- **並列処理**: 複数商品の分類を同時実行
- **メモリ効率**: 大きな画像を分割処理
- **キャッシュ機能**: 類似商品の認識結果を再利用
- **バックグラウンド処理**: UI応答性を維持

### エラーハンドリング
- 信頼度が低い商品は手動修正を促す
- 商品が重なって認識できない場合の再撮影ガイド
- 光の条件が悪い場合の改善アドバイス`,
    labels: ['mvp:critical', 'epic:ai-vision', 'size:m', 'priority:p0', 'phase:1']
  }
];

async function recreateMVPIssues() {
  console.log('🔄 MVP-001~003 Issue復旧開始...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [index, task] of MVP_CORE_TASKS.entries()) {
    try {
      console.log(`\n[${index + 1}/3] ${task.title} を再作成中...`);
      
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
      
      // APIレート制限回避
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  ❌ Issue作成失敗: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n🎉 MVP復旧完了! 成功: ${successCount}個, 失敗: ${failCount}個`);
  console.log('\n📋 復旧されたタスク:');
  console.log('• [MVP-001] 商品画像認識AI実装 (56h) - 最重要差別化機能');
  console.log('• [MVP-002] 食品状態判定AI (28h) - 独自性の証明');  
  console.log('• [MVP-003] 複数商品同時認識 (20h) - 利便性の向上');
  console.log('\n🚀 これらがOrdoの核心機能です！');
}

async function main() {
  try {
    await recreateMVPIssues();
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.log('\n🔧 トラブルシューティング:');
    console.log('- GITHUB_TOKEN環境変数が設定されているか確認');
    console.log('- トークンに repo 権限があるか確認');
  }
}

if (require.main === module) {
  main();
}

module.exports = { MVP_CORE_TASKS };
