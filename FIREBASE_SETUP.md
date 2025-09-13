/**
 * Development Setup Guide
 * 開発環境セットアップガイド
 */

# Firebase アカウント無しでの開発方法

## 🚀 クイックスタート

現在の実装では **Firebase アカウント無し** でも完全に動作します！

### 1. 現在の設定確認

`src/services/FirebaseServiceSwitcher.ts` で以下の設定を確認してください：

```typescript
const DEVELOPMENT_CONFIG = {
  FIREBASE_PROJECT_CONFIGURED: false, // ← falseのままでOK
  ENABLE_MOCK_MODE: true,             // ← trueのままでOK
  MOCK_LATENCY: 300,                  // ← 300ms の遅延シミュレート
  SIMULATE_ERRORS: false,             // ← エラーシミュレートは無効
  ERROR_RATE: 0.05,                   // ← エラー率5%
};
```

### 2. モックFirebaseの機能

✅ **認証システム**
- メールアドレスでの仮想サインアップ/サインイン
- セッション管理（AsyncStorage使用）
- 認証状態の永続化

✅ **データベース（Firestore モック）**
- ドキュメントの作成・読み取り・更新・削除
- リアルタイムリスナー
- WHERE句によるクエリ
- コレクションの監視

✅ **その他のサービス**
- Cloud Storage（モック）
- Cloud Functions（モック）
- Analytics（モック）

### 3. 使用方法

```typescript
import { firebaseService } from './services/FirebaseServiceSwitcher';

// 初期化
await firebaseService.initialize();

// 認証
const result = await firebaseService.signInWithEmailAndPassword(
  'test@example.com', 
  'password123'
);

// データベース操作
const doc = firebaseService.collection('products').doc('product1');
await doc.set({ name: 'りんご', quantity: 5 });

// リアルタイムリスナー
const unsubscribe = firebaseService.collection('products').onSnapshot((snapshot) => {
  console.log('Products updated:', snapshot.docs.length);
});
```

## 🔄 本物のFirebaseに切り替える場合

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Authentication、Firestore、Storageを有効化
3. React Native用の設定ファイル（`google-services.json`）をダウンロード

### 2. 設定ファイル配置

```bash
# Android
android/app/google-services.json

# iOS  
ios/Runner/GoogleService-Info.plist
```

### 3. 設定変更

`FirebaseServiceSwitcher.ts` で設定を変更：

```typescript
const DEVELOPMENT_CONFIG = {
  FIREBASE_PROJECT_CONFIGURED: true, // ← trueに変更
  // 他の設定はそのまま
};
```

### 4. 自動フォールバック

本物のFirebaseでエラーが発生した場合、自動的にモックFirebaseにフォールバックします。

## 🛠️ デバッグとテスト

### モックデータの確認

```typescript
import { firebaseService } from './services/FirebaseServiceSwitcher';

// デバッグ情報取得
const debugInfo = firebaseService.getDebugInfo();
console.log('Firebase Debug Info:', debugInfo);

// モックデータ表示（モードモード時のみ）
const mockData = firebaseService.getMockData();
console.log('Mock Data:', mockData);
```

### サンプルデータ

モックFirebaseには以下のサンプルデータが含まれています：

```json
{
  "products": [
    {
      "id": "product1",
      "name": "りんご",
      "quantity": 5,
      "unit": "個",
      "category": "果物",
      "expiryDate": "2024-12-25",
      "location": "冷蔵庫"
    },
    {
      "id": "product2", 
      "name": "牛乳",
      "quantity": 1,
      "unit": "L",
      "category": "乳製品",
      "expiryDate": "2024-12-20",
      "location": "冷蔵庫"
    }
  ]
}
```

## 📊 モニタリング

### クラウドサービス監視

```typescript
import { useCloudService } from './hooks/useCloudService';

function App() {
  const {
    isInitialized,
    healthStatus,
    overallHealth,
    stats
  } = useCloudService();

  // モック/リアルの判定
  const debugInfo = firebaseService.getDebugInfo();
  console.log('Using Mock Firebase:', debugInfo.usingMock);
}
```

## 🚨 重要な注意事項

### 1. データの永続性
- モックFirebaseのデータは **AsyncStorage** に保存されます
- アプリを削除するとデータも消失します
- 本物のFirebaseではクラウドに永続化されます

### 2. パフォーマンス
- モックFirebaseは意図的に遅延を追加しています（300ms）
- 本物のFirebaseの体験に近づけるための設定です

### 3. エラーハンドリング
- モックモードでもエラーを シミュレートできます
- `SIMULATE_ERRORS: true` でランダムエラーが発生します

## 🎯 推奨開発フロー

1. **モックFirebaseで機能開発** （現在の状態）
2. **ローカルテストで動作確認**
3. **必要に応じて本物のFirebaseプロジェクト作成**
4. **設定切り替えでリアルFirebase検証**
5. **本番環境デプロイ**

この方法により、Firebase アカウント無しでも完全な開発が可能です！
