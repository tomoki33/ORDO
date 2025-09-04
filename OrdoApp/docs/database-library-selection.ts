/**
 * データベースライブラリ選定評価
 * React Native向けローカルデータベース比較分析
 */

export interface DatabaseLibraryEvaluation {
  name: string;
  type: 'SQLite' | 'NoSQL' | 'Hybrid';
  score: number;
  pros: string[];
  cons: string[];
  suitability: 'High' | 'Medium' | 'Low';
  installCommand: string;
  documentation: string;
}

/**
 * React Native データベースライブラリ比較評価
 */
export const DATABASE_LIBRARY_COMPARISON: DatabaseLibraryEvaluation[] = [
  {
    name: 'react-native-sqlite-storage',
    type: 'SQLite',
    score: 8.5,
    pros: [
      'SQLiteの完全機能サポート',
      '大量データ処理に優れた性能',
      'ACID準拠のトランザクション',
      '豊富なSQL機能（JOIN、インデックス等）',
      'iOS/Androidネイティブサポート',
      '長期運用実績と安定性',
      'TypeScript型定義サポート'
    ],
    cons: [
      'SQLの学習コストが必要',
      'マイグレーション管理が複雑',
      'ネイティブモジュールのため設定が必要',
      'Web版での動作制限'
    ],
    suitability: 'High',
    installCommand: 'npm install react-native-sqlite-storage @types/react-native-sqlite-storage',
    documentation: 'https://github.com/andpor/react-native-sqlite-storage'
  },
  {
    name: 'realm',
    type: 'NoSQL',
    score: 7.8,
    pros: [
      'オブジェクト指向データベース',
      'リアルタイム同期機能',
      'SQLの知識不要',
      '優れたパフォーマンス',
      'MongoDB Atlas統合',
      '暗号化サポート'
    ],
    cons: [
      '学習コストが高い',
      'スキーマ変更時のマイグレーションが複雑',
      '大きなバンドルサイズ',
      'ライセンス制約（商用利用）',
      'アップデート時の互換性問題'
    ],
    suitability: 'Medium',
    installCommand: 'npm install realm',
    documentation: 'https://docs.mongodb.com/realm/'
  },
  {
    name: 'watermelondb',
    type: 'Hybrid',
    score: 8.2,
    pros: [
      'React Native特化設計',
      '優れたパフォーマンス（Lazy Loading）',
      'オフライン完全対応',
      'TypeScript完全サポート',
      'Redux/MobXライクなAPI',
      '同期機能の柔軟性'
    ],
    cons: [
      '相対的に新しく実績が少ない',
      '複雑なクエリに制限',
      'カスタム同期実装が必要',
      'ドキュメントがやや不足'
    ],
    suitability: 'High',
    installCommand: 'npm install @nozbe/watermelondb @nozbe/sqlite',
    documentation: 'https://watermelondb.dev/'
  },
  {
    name: 'react-native-sqlite-2',
    type: 'SQLite',
    score: 7.0,
    pros: [
      'シンプルなAPI',
      '軽量実装',
      'Expo対応',
      '基本的なSQLite機能',
      'セットアップが簡単'
    ],
    cons: [
      '機能制限が多い',
      'パフォーマンスが劣る',
      'メンテナンス頻度が低い',
      'TypeScript対応が不完全',
      '企業レベルには不向き'
    ],
    suitability: 'Low',
    installCommand: 'npm install react-native-sqlite-2',
    documentation: 'https://github.com/craftzdog/react-native-sqlite-2'
  },
  {
    name: 'expo-sqlite',
    type: 'SQLite',
    score: 7.5,
    pros: [
      'Expo統合で簡単セットアップ',
      'Web版対応',
      'TypeScript対応',
      '軽量で高速',
      'Expo開発ワークフローに最適'
    ],
    cons: [
      'Expo環境依存',
      'ネイティブ機能制限',
      '高度なSQLite機能が不足',
      'カスタマイズ性が低い'
    ],
    suitability: 'Medium',
    installCommand: 'expo install expo-sqlite',
    documentation: 'https://docs.expo.dev/versions/latest/sdk/sqlite/'
  }
];

/**
 * Ordo App要件に基づく評価基準
 */
export const EVALUATION_CRITERIA = {
  performance: {
    weight: 25,
    description: '大量の商品データ処理性能'
  },
  typescript: {
    weight: 20,
    description: 'TypeScript統合とタイプセーフティ'
  },
  maintenance: {
    weight: 20,
    description: '長期メンテナンス性と安定性'
  },
  features: {
    weight: 15,
    description: '必要機能の包括性'
  },
  learning_curve: {
    weight: 10,
    description: '開発効率とシンプルさ'
  },
  ecosystem: {
    weight: 10,
    description: 'React Nativeエコシステム統合'
  }
};

/**
 * Ordo App向け要件分析
 */
export const ORDO_DATABASE_REQUIREMENTS = {
  dataTypes: [
    'Product records (商品データ)',
    'User settings (ユーザー設定)',
    'Image metadata (画像メタデータ)',
    'AI recognition cache (AI認識キャッシュ)',
    'Notification history (通知履歴)'
  ],
  operations: [
    'CRUD operations on products',
    'Complex filtering and sorting',
    'Full-text search on product names',
    'Expiration date queries',
    'Category-based aggregations',
    'Image URI references'
  ],
  performance: [
    '1000+ products support',
    'Real-time filtering',
    'Fast startup time',
    'Background sync capability'
  ],
  constraints: [
    'Offline-first approach',
    'No network dependency',
    'Mobile storage limitations',
    'Battery efficiency'
  ]
};

/**
 * 最終推奨: react-native-sqlite-storage
 * 
 * 選定理由:
 * 1. 企業レベルの安定性と実績
 * 2. 複雑なクエリとJOIN対応
 * 3. 優れたパフォーマンス
 * 4. TypeScript完全サポート
 * 5. オフライン完全対応
 * 6. 将来的なスケーラビリティ
 */
export const SELECTED_DATABASE = DATABASE_LIBRARY_COMPARISON[0]; // react-native-sqlite-storage

/**
 * WatermelonDB検討理由
 * - React Native特化で優れた設計
 * - しかしOrdo Appには以下の理由でSQLiteを選択:
 *   1. 複雑な商品検索クエリ（期限、カテゴリ、名前等の複合条件）
 *   2. レポート機能での集計処理
 *   3. 将来的なBI/分析機能拡張
 *   4. SQLスキルの活用可能性
 */
