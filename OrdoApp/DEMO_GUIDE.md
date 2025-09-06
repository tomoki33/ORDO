# 🚀 Ordo App デモ実行ガイド

Phase 10とPhase 11の実装済み機能をローカル環境で実行・確認する方法

## 📋 前提条件

- Node.js 18以上
- React Native開発環境（iOS/Android実行時）
- npm または yarn

## 🎯 デモ実行方法

### 1. 🖥️ Node.js環境で実行（推奨）

最も簡単で確実な方法です。コンソールでログ出力を確認できます。

```bash
# プロジェクトディレクトリに移動
cd /Users/tomoki33/Desktop/Ordo/OrdoApp

# Phase 10 デモ実行（32時間実装）
node scripts/phase10-node-demo.js

# Phase 11 デモ実行（28時間実装）
node scripts/phase11-node-demo.js

# 環境チェック・メニュー表示
node scripts/run-demo.js
```

### 2. 📱 React Native アプリ内で実行

実際のアプリUIで確認したい場合

```bash
# Metro bundler 起動
npm start

# 別ターミナルでアプリ起動
npm run ios     # iOS シミュレーター
# または
npm run android # Android エミュレーター
```

アプリ内で `DemoRunner` コンポーネントを表示してデモを実行

### 3. 🔧 npm スクリプトで実行

package.jsonに追加したスクリプトを使用

```bash
# デモメニュー表示
npm run demo

# Phase 10 デモ直接実行
npm run demo:phase10

# Phase 11 デモ直接実行
npm run demo:phase11
```

## 📊 デモ内容

### 🔬 Phase 10 拡張機能（32時間実装）

1. **学習データ収集・前処理 (12h)**
   - 画像品質検証・メタデータ生成
   - データ拡張エンジン
   - バッチ前処理システム
   - データセット品質分析

2. **AI精度向上・チューニング (12h)**
   - 包括的モデル性能評価
   - ハイパーパラメータ最適化
   - 継続学習システム
   - A/Bテスト実行

3. **アプリ統合・テスト (8h)**
   - 統合テストスイート
   - パフォーマンス監視
   - プロダクション準備チェック

### 🆕 Phase 11 新機能（28時間実装）

1. **新鮮度判定モデル構築 (12h)**
   - マルチCNN解析（色彩・テクスチャ・形状）
   - 5段階新鮮度分類
   - 賞味期限推定

2. **状態分類アルゴリズム (8h)**
   - 7段階食品状態分類
   - 4段階品質グレード
   - リスク要因分析

3. **UI表示統合 (4h)**
   - React Native統合コンポーネント
   - アニメーション付きインターフェース
   - アクセシビリティ対応

4. **警告システム連携 (4h)**
   - 5レベル警告システム
   - プッシュ通知統合
   - インテリジェントアラート

## 🎮 実行例

```bash
$ node scripts/phase10-node-demo.js

🚀 Phase 10 拡張実装デモを開始します (Node.js版)...

📚 1. 学習データ収集・前処理システム (12時間実装)
============================================================
🎯 ユーザー画像からの学習データ自動収集...
  ✓ 画像品質検証
  ✓ メタデータ自動生成
  ✓ カテゴリ自動分類
...
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

1. **`cannot find module` エラー**
   ```bash
   npm install
   ```

2. **TypeScript エラー**
   ```bash
   npm run type-check
   ```

3. **React Native関連エラー**
   ```bash
   npm run clean
   cd ios && pod install && cd ..
   npm start --reset-cache
   ```

## 📁 ファイル構成

```
OrdoApp/
├── scripts/
│   ├── run-demo.js           # メインデモランナー
│   ├── phase10-node-demo.js  # Phase 10 Node.js版
│   └── phase11-node-demo.js  # Phase 11 Node.js版
├── src/
│   ├── components/
│   │   └── DemoRunner.tsx    # React Native UI版
│   ├── services/
│   │   ├── FreshnessDetectionService.ts
│   │   ├── StateClassificationService.ts
│   │   └── AlertSystemService.ts
│   └── utils/
│       ├── Phase10ExtensionDemo.ts
│       └── Phase11NewFeaturesDemo.ts
└── package.json
```

## 🎯 技術仕様

- **AI精度**: 85%以上
- **応答時間**: 3秒以内
- **メモリ使用**: 200MB以下
- **テスト成功率**: 95%以上
- **対応プラットフォーム**: iOS, Android, Web

## 📝 ログレベル

デモ実行中は以下のログが出力されます：

- 🚀 開始・完了メッセージ
- 📊 性能指標・統計情報
- ✅ 成功ステータス
- ⚠️ 警告メッセージ
- ❌ エラー情報

## 🔗 関連ドキュメント

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - プロジェクト進捗
- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - 開発環境構築

---

**🎉 Phase 10 + Phase 11 = 60時間の実装完了！**

高度なAI食品管理システムをお楽しみください。
