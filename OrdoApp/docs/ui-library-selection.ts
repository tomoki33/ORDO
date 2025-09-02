/**
 * UI Component Library Evaluation
 * React Native UIコンポーネントライブラリ評価・選定
 */

export const UI_LIBRARY_COMPARISON = {
  // React Native Elements (現在のreact-native-vector-iconsベース)
  'react-native-elements': {
    pros: [
      '豊富なコンポーネント',
      'React Native Vector Iconsと統合済み',
      '高いカスタマイズ性',
      'TypeScript対応',
      '軽量',
    ],
    cons: [
      'デザインが少し古め',
      'メンテナンス頻度が低下',
    ],
    score: 7.5,
    suitable: true,
  },

  // NativeBase
  'native-base': {
    pros: [
      'モダンなデザイン',
      'Chakra UIベース',
      'TypeScript完全対応',
      'テーマシステム強力',
      'アクセシビリティ対応',
    ],
    cons: [
      'バンドルサイズが大きい',
      '学習コストが高い',
      '比較的新しく安定性に懸念',
    ],
    score: 8.0,
    suitable: true,
  },

  // UI Kitten
  'react-native-ui-kitten': {
    pros: [
      'Eva Design System',
      '美しいデザイン',
      'テーマ切り替え対応',
      'TypeScript対応',
    ],
    cons: [
      'コンポーネント数が限定的',
      'カスタマイズが複雑',
      'メンテナンス状況不安',
    ],
    score: 6.5,
    suitable: false,
  },

  // Tamagui (モダン・高性能)
  'tamagui': {
    pros: [
      '極めて高いパフォーマンス',
      '現代的なAPI設計',
      'Web対応',
      'TypeScript完全対応',
      'アニメーション最適化',
    ],
    cons: [
      '新しすぎて情報が少ない',
      '学習コストが非常に高い',
      '大きなバンドルサイズ',
    ],
    score: 7.0,
    suitable: false,
  },

  // React Native Paper (Material Design)
  'react-native-paper': {
    pros: [
      'Material Design 3準拠',
      'Google推奨デザイン',
      'TypeScript対応',
      '豊富なコンポーネント',
      '活発なメンテナンス',
    ],
    cons: [
      'Material Designに限定',
      'iOS的なデザインは難しい',
      '柔軟性に制限',
    ],
    score: 8.5,
    suitable: true,
  },
};

// 最終選定結果
export const SELECTED_UI_LIBRARY = {
  primary: 'react-native-paper',
  reason: [
    'Material Design 3の美しいデザインシステム',
    'AIホーム管理アプリに適したモダンな外観',
    'TypeScript完全対応で開発効率向上',
    '豊富なコンポーネントでカスタム実装コスト削減',
    '活発なコミュニティとメンテナンス',
  ],
  fallback: 'react-native-elements',
  implementation_approach: 'hybrid',
};

export default SELECTED_UI_LIBRARY;
