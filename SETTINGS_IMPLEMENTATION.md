# Ordo アプリ - 設定機能実装ドキュメント

## 概要

本ドキュメントでは、Ordoアプリの設定機能の実装について説明します。

### 実装された機能

1. **設定画面UI (6h)** - 完全実装 ✅
2. **カテゴリ管理 (4h)** - 完全実装 ✅  
3. **データエクスポート・インポート (6h)** - 完全実装 ✅
4. **アプリ情報・ヘルプ (2h)** - 完全実装 ✅

**総開発時間**: 18時間

## 1. 設定画面UI (6h)

### 実装ファイル
- `src/screens/EnhancedSettingsScreen.tsx` - メイン設定画面
- `src/screens/SettingsScreen.tsx` - 既存設定画面（拡張済み）

### 主要機能

#### 1.1 設定セクション
- **通知設定**: プッシュ通知、期限警告、在庫アラート
- **AI機能**: 自動商品認識の有効/無効
- **カテゴリ管理**: カテゴリの作成、編集、有効/無効切り替え
- **データ管理**: エクスポート、インポート、自動バックアップ
- **表示設定**: ダークモード、テーマ設定
- **アプリ情報**: バージョン情報、サポート、法的情報

#### 1.2 UI コンポーネント
```typescript
// React Native Paper コンポーネントを使用
import { Card, List, Switch, Button, Modal } from 'react-native-paper';

// カテゴリ管理モーダル
<Modal visible={categoryModalVisible} animationType="slide">
  <CategoryManagementModal />
</Modal>

// エクスポート設定モーダル  
<Modal visible={exportModalVisible} animationType="slide">
  <ExportOptionsModal />
</Modal>
```

#### 1.3 状態管理
```typescript
interface AppSettings {
  notifications: {
    enabled: boolean;
    expiryWarning: boolean;
    lowStockAlert: boolean;
    dailyReminder: boolean;
    sound: boolean;
    vibration: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    showGrid: boolean;
    compactMode: boolean;
    animations: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    dataSharing: boolean;
  };
  data: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    cloudSync: boolean;
    storageOptimization: boolean;
  };
}
```

## 2. カテゴリ管理 (4h)

### 実装ファイル
- `src/database/CategoryRepository.ts` - カテゴリデータベース操作（拡張済み）
- `src/screens/CategoryEditScreen.tsx` - カテゴリ編集画面

### 主要機能

#### 2.1 カテゴリデータモデル
```typescript
interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  icon?: string;
  color?: string;
  description?: string;
  isSystemCategory: boolean;
  displayOrder?: number;
  isActive: boolean;
  defaultExpirationDays?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.2 階層構造管理
- **親子関係**: 最大3階層までのカテゴリ階層
- **レベル計算**: 親カテゴリに基づく自動レベル設定
- **ツリー構造**: カテゴリツリーの構築と表示

#### 2.3 カテゴリ編集機能
- **基本情報**: 名前、説明、アクティブ状態
- **視覚設定**: カラー選択（15色プリセット）、アイコン選択（15種類）
- **親カテゴリ**: ドロップダウンで親カテゴリ選択
- **詳細設定**: 表示順序、デフォルト期限日数
- **プレビュー**: リアルタイムプレビュー表示

#### 2.4 データベース操作
```typescript
// カテゴリ作成
async create(categoryData: CategoryCreateInput): Promise<Category>

// 商品数付きカテゴリ取得
async getCategoriesWithProductCount(): Promise<CategoryWithCount[]>

// カテゴリ削除可能チェック
async canDeleteCategory(categoryId: string): Promise<{canDelete: boolean; reason?: string}>

// カテゴリツリー取得
async getCategoryTree(): Promise<CategoryTreeNode[]>

// カテゴリ検索
async searchCategories(query: string): Promise<Category[]>
```

## 3. データエクスポート・インポート (6h)

### 実装ファイル
- `src/services/DataExportImportService.ts` - メインサービス

### 主要機能

#### 3.1 エクスポート機能
```typescript
interface ExportOptions {
  includeProducts: boolean;
  includeCategories: boolean;
  includeLocations: boolean;
  includeSettings: boolean;
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: { from: Date; to: Date };
  categories?: string[];
  locations?: string[];
}
```

#### 3.2 データ形式
```typescript
interface ExportData {
  version: string;
  exportDate: string;
  appVersion: string;
  data: {
    products: any[];
    categories: any[];
    locations: any[];
    settings: any;
  };
  metadata: {
    productCount: number;
    categoryCount: number;
    locationCount: number;
    totalSize: number;
  };
}
```

#### 3.3 ファイル共有
- **React Native Share**: ファイル共有機能
- **ドキュメントディレクトリ**: ローカルファイル保存
- **メール添付**: メールアプリとの連携

#### 3.4 インポート機能
```typescript
interface ImportOptions {
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeLocations?: boolean;
  includeSettings?: boolean;
  mode?: 'replace' | 'update' | 'skip';
}
```

#### 3.5 バリデーション
- **データ構造検証**: エクスポートファイルの形式チェック
- **バージョン互換性**: アプリバージョンとの互換性確認
- **必須フィールド**: 必要なデータフィールドの存在確認

## 4. アプリ情報・ヘルプ (2h)

### 実装ファイル
- `src/screens/HelpScreen.tsx` - ヘルプ画面

### 主要機能

#### 4.1 アプリ情報
- **バージョン情報**: アプリバージョン表示
- **アプリ説明**: 機能概要
- **開発者情報**: 開発チーム情報

#### 4.2 ヘルプコンテンツ
```typescript
interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
}
```

**ヘルプトピック**:
- 始め方
- AI商品認識
- カテゴリ管理
- 保存場所管理
- 通知設定
- データ管理

#### 4.3 サポート機能
- **メール問い合わせ**: `mailto:` URLスキーム
- **公式ウェブサイト**: 外部リンク
- **アプリレビュー**: App Store リンク

#### 4.4 法的情報
- **プライバシーポリシー**: プライバシー情報
- **利用規約**: 利用条件
- **ライセンス情報**: オープンソースライセンス

## 技術仕様

### 依存関係
```json
{
  "react-native-fs": "^2.20.0",
  "react-native-share": "^7.9.0", 
  "react-native-document-picker": "^8.2.0",
  "@react-native-async-storage/async-storage": "^1.19.0",
  "react-native-vector-icons": "^9.2.0",
  "react-native-paper": "^5.10.0"
}
```

### パフォーマンス最適化
- **遅延読み込み**: カテゴリデータの遅延取得
- **メモ化**: React.memo によるコンポーネント最適化
- **非同期処理**: ファイル操作の非同期実行
- **エラーハンドリング**: 包括的なエラー処理

### セキュリティ
- **ファイル検証**: インポートファイルの検証
- **データサニタイズ**: 入力データのサニタイズ
- **権限管理**: ファイルアクセス権限
- **設定保護**: 機密設定の暗号化

## 今後の拡張予定

### Phase 17: 高度な設定機能
- **カスタムテーマ**: ユーザー定義テーマ
- **高度な通知**: 条件付き通知設定
- **データ同期**: クラウド同期機能
- **設定バックアップ**: 設定の自動バックアップ

### Phase 18: 管理機能
- **ユーザー管理**: 複数ユーザー対応
- **権限管理**: 機能別アクセス制御
- **監査ログ**: 設定変更履歴
- **統計情報**: 使用状況統計

## まとめ

設定機能の実装により、Ordoアプリは以下の機能を獲得しました：

1. **包括的な設定管理**: すべてのアプリ設定を一元管理
2. **柔軟なカテゴリ管理**: 階層構造対応のカテゴリシステム
3. **データポータビリティ**: エクスポート・インポート機能
4. **ユーザーサポート**: 包括的なヘルプシステム

これらの機能により、ユーザーはアプリを自分のニーズに合わせてカスタマイズし、データを安全に管理できるようになりました。

**実装状況**: 
- 設定画面UI: ✅ 完了
- カテゴリ管理: ✅ 完了  
- データエクスポート・インポート: ✅ 完了
- アプリ情報・ヘルプ: ✅ 完了

**総開発時間**: 18時間（予定通り完了）
