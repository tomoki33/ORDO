# 🏠 Ordo - AI搭載食材管理アプリ

AI画像認識を使用して食材を自動認識・管理する、次世代のホーム管理アプリケーションです。

## 🚀 アプリの立ち上げ方法

### 前提条件

開発環境が構築されていることを確認してください：
- Node.js v20.18.0+
- React Native CLI
- iOS Simulator または Android Emulator

> 詳細な環境構築については [`DEVELOPMENT_SETUP.md`](DEVELOPMENT_SETUP.md) を参照

### Step 1: Metro Bundler の起動

まず、**Metro bundler** (React NativeのJavaScriptビルドツール) を起動します：

```bash
# プロジェクトディレクトリに移動
cd /Users/tomoki33/Desktop/Ordo/OrdoApp

# Metro bundler起動 (どちらか一つ)
npm start
# または
npx react-native start
```

**成功すると以下のような画面が表示されます：**
```
Welcome to Metro v0.82.5
Fast - Scalable - Integrated

To reload the app, press "r"
To open developer menu, press "d"  
To open React DevTools, press "j"
```

### Step 2: アプリのビルド・実行

Metro bundlerを**起動したまま**、新しいターミナル/タブを開いて以下を実行：

#### iOS Simulator (推奨)

```bash
# CocoaPods依存関係のインストール (初回のみ)
cd ios && pod install && cd ..

# iOSシミュレータでアプリ実行
npm run ios
# または
npx react-native run-ios

# 特定のデバイスを指定する場合
npx react-native run-ios --simulator="iPhone 14"
```

#### Android Emulator

```bash
# Androidエミュレータでアプリ実行
npm run android
# または  
npx react-native run-android
```

### Step 3: 開発中のアプリ修正

アプリが正常に起動したら、コードを編集してみましょう！

1. **VS Codeでプロジェクトを開く：**
```bash
code /Users/tomoki33/Desktop/Ordo/OrdoApp
```

2. **メイン画面を編集：** `src/screens/HomeScreen.tsx` を開いて変更

3. **保存すると自動更新：** [Fast Refresh](https://reactnative.dev/docs/fast-refresh) により即座に反映

### 🔄 リロード方法

**自動リロード (Hot Reload):**
- ファイルを保存すると自動的に反映

**手動リロード:**
- **iOS**: シミュレータで <kbd>Cmd ⌘</kbd> + <kbd>R</kbd>
- **Android**: エミュレータで <kbd>R</kbd> を2回押す
- **Universal**: Metro bundlerで <kbd>r</kbd> を押す

**開発者メニュー:**
- **iOS**: シミュレータで <kbd>Cmd ⌘</kbd> + <kbd>D</kbd>
- **Android**: エミュレータで <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) / <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS)

## 📱 OrdoApp の機能

### 現在実装済み
- ✅ **ダッシュボード画面** - 商品統計・期限管理
- ✅ **TypeScript型安全性** - 堅牢な開発基盤
- ✅ **モック AI認識** - 10種類の日本食材対応
- ✅ **商品管理システム** - CRUD操作・新鮮度判定

### 実装予定 (MVP)
- 🔄 **リアル AI画像認識** - Google Vision / OpenAI Vision API
- 🔄 **カメラ機能** - 商品撮影・リアルタイム認識
- 🔄 **賞味期限通知** - プッシュ通知・警告システム
- 🔄 **データ永続化** - ローカルストレージ・クラウド同期

## 🛠 開発者向け情報

### プロジェクト構造
```
OrdoApp/
├── src/
│   ├── components/     # 再利用可能なUIコンポーネント
│   ├── screens/        # 画面コンポーネント
│   ├── services/       # API・データアクセス層
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   └── constants/      # 定数・設定
├── ios/               # iOS専用コード・設定
├── android/           # Android専用コード・設定
└── __tests__/         # テストファイル
```

### 使用技術スタック
- **Framework:** React Native 0.81+ with TypeScript
- **Navigation:** React Navigation 6.x (予定)
- **State Management:** React Hooks + Context API
- **AI Recognition:** Google Vision API / OpenAI Vision (予定)
- **Camera:** react-native-vision-camera (予定)
- **Storage:** AsyncStorage + SQLite (予定)

### コードの品質管理
```bash
# TypeScript型チェック
npx tsc --noEmit

# ESLint実行
npx eslint src/ --ext .ts,.tsx

# テスト実行
npm test
```

## 🚨 トラブルシューティング

### よくある問題

**1. Metro bundler起動エラー**
```bash
# キャッシュクリア
npx react-native start --reset-cache
```

**2. iOS ビルドエラー**
```bash
# CocoaPods キャッシュリセット
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

**3. Android ビルドエラー**  
```bash
# Gradle キャッシュクリア
cd android && ./gradlew clean && cd ..
```

**4. Node.js 依存関係エラー**
```bash
# node_modules 再インストール
rm -rf node_modules package-lock.json
npm install
```

### 詳細な環境設定
詳細な開発環境構築については以下を参照：
- [開発環境セットアップガイド](DEVELOPMENT_SETUP.md)
- [React Native 公式ドキュメント](https://reactnative.dev/docs/environment-setup)

## 📚 学習リソース

- [React Native 公式サイト](https://reactnative.dev) - React Nativeの詳細
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org) - TypeScript学習
- [React Navigation](https://reactnavigation.org) - ナビゲーション実装
- [React Native コミュニティ](https://github.com/react-native-community) - ライブラリ・ツール

## 🎉 おめでとうございます！

OrdoAppが正常に起動できました！これで AI搭載食材管理アプリの開発を始めることができます。

**次のステップ:**
1. 基本機能の動作確認
2. コード編集・Hot Reloadの体験  
3. 新機能の実装開始

何か問題が発生した場合は、[Issues](https://github.com/tomoki33/ordo/issues) で報告してください。

---

**Ordo App** - より良いホーム管理のために 🏠✨
