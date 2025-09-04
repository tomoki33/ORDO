/**
 * カメラ・画像処理ライブラリ選定評価
 * React Native向けカメラ機能比較分析
 */

export interface CameraLibraryEvaluation {
  name: string;
  type: 'Camera' | 'ImagePicker' | 'Processing';
  score: number;
  pros: string[];
  cons: string[];
  suitability: 'High' | 'Medium' | 'Low';
  installCommand: string;
  documentation: string;
  androidPermissions: string[];
  iosPermissions: string[];
}

/**
 * React Native カメラ・画像処理ライブラリ比較評価
 */
export const CAMERA_LIBRARY_COMPARISON: CameraLibraryEvaluation[] = [
  {
    name: 'react-native-vision-camera',
    type: 'Camera',
    score: 9.2,
    pros: [
      'モダンなアーキテクチャ（新しいArchitecture対応）',
      '高性能カメラ機能（4K、スローモーション等）',
      'Frame Processor API（リアルタイム画像処理）',
      'TypeScript完全サポート',
      'アクティブなメンテナンス',
      'Expo対応（Config Plugin）',
      'コードスキャン機能内蔵',
      'MLKit統合可能'
    ],
    cons: [
      'セットアップが複雑',
      'ネイティブ設定が必要',
      '学習コストが高い',
      'バンドルサイズが大きい'
    ],
    suitability: 'High',
    installCommand: 'npm install react-native-vision-camera',
    documentation: 'https://react-native-vision-camera.com/',
    androidPermissions: ['CAMERA', 'RECORD_AUDIO', 'WRITE_EXTERNAL_STORAGE'],
    iosPermissions: ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']
  },
  {
    name: 'react-native-image-picker',
    type: 'ImagePicker',
    score: 8.5,
    pros: [
      'シンプルで使いやすいAPI',
      '軽量ライブラリ',
      'ギャラリー選択とカメラ撮影両対応',
      '安定した実績',
      'TypeScript対応',
      'ExpoでもEAS Buildで利用可能',
      '権限管理が簡単'
    ],
    cons: [
      'カメラ機能が基本的',
      'リアルタイム処理不可',
      '高度なカメラ設定制限',
      'Frame Processor非対応'
    ],
    suitability: 'High',
    installCommand: 'npm install react-native-image-picker',
    documentation: 'https://github.com/react-native-image-picker/react-native-image-picker',
    androidPermissions: ['CAMERA', 'WRITE_EXTERNAL_STORAGE'],
    iosPermissions: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']
  },
  {
    name: 'expo-image-picker',
    type: 'ImagePicker',
    score: 7.8,
    pros: [
      'Expo統合で簡単セットアップ',
      'Web対応',
      'TypeScript対応',
      '軽量で高速',
      'Expo開発ワークフローに最適',
      '画像編集機能内蔵'
    ],
    cons: [
      'Expo環境依存',
      'ネイティブ機能制限',
      '高度なカメラ制御不可',
      'リアルタイム処理不可'
    ],
    suitability: 'Medium',
    installCommand: 'expo install expo-image-picker',
    documentation: 'https://docs.expo.dev/versions/latest/sdk/imagepicker/',
    androidPermissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
    iosPermissions: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']
  },
  {
    name: 'react-native-camera',
    type: 'Camera',
    score: 6.5,
    pros: [
      '豊富な機能',
      '長期実績',
      'バーコードスキャン',
      'Face Detection'
    ],
    cons: [
      'メンテナンス終了（deprecated）',
      'React Native 0.60+サポート制限',
      'パフォーマンス問題',
      '新しいArchitecture非対応',
      'セキュリティ更新なし'
    ],
    suitability: 'Low',
    installCommand: 'npm install react-native-camera （非推奨）',
    documentation: 'https://github.com/react-native-camera/react-native-camera',
    androidPermissions: ['CAMERA', 'RECORD_AUDIO'],
    iosPermissions: ['NSCameraUsageDescription']
  },
  {
    name: 'react-native-image-resizer',
    type: 'Processing',
    score: 8.0,
    pros: [
      '画像リサイズ・圧縮専門',
      '高性能処理',
      'TypeScript対応',
      '軽量ライブラリ',
      'フォーマット変換対応',
      '品質設定可能'
    ],
    cons: [
      '機能が限定的',
      'カメラ機能なし',
      '複雑な画像処理不可'
    ],
    suitability: 'High',
    installCommand: 'npm install react-native-image-resizer',
    documentation: 'https://github.com/bamlab/react-native-image-resizer',
    androidPermissions: [],
    iosPermissions: []
  },
  {
    name: 'react-native-image-crop-picker',
    type: 'ImagePicker',
    score: 7.5,
    pros: [
      'クロップ機能内蔵',
      'Multiple selection',
      'Image compression',
      'Video support',
      'TypeScript対応'
    ],
    cons: [
      'セットアップが複雑',
      'ネイティブ依存大',
      'メンテナンス頻度低下',
      '権限管理が複雑'
    ],
    suitability: 'Medium',
    installCommand: 'npm install react-native-image-crop-picker',
    documentation: 'https://github.com/ivpusic/react-native-image-crop-picker',
    androidPermissions: ['CAMERA', 'WRITE_EXTERNAL_STORAGE'],
    iosPermissions: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']
  }
];

/**
 * Ordo App要件に基づく評価基準
 */
export const CAMERA_EVALUATION_CRITERIA = {
  ease_of_use: {
    weight: 25,
    description: '実装のしやすさと学習コスト'
  },
  features: {
    weight: 20,
    description: '必要機能の包括性'
  },
  performance: {
    weight: 20,
    description: '画像処理とカメラのパフォーマンス'
  },
  maintenance: {
    weight: 15,
    description: 'ライブラリの保守性と将来性'
  },
  typescript: {
    weight: 10,
    description: 'TypeScript統合とタイプセーフティ'
  },
  setup_complexity: {
    weight: 10,
    description: 'セットアップと設定の複雑さ'
  }
};

/**
 * Ordo App向けカメラ要件分析
 */
export const ORDO_CAMERA_REQUIREMENTS = {
  primary_features: [
    '商品撮影（静止画）',
    'ギャラリーからの画像選択',
    '画像のリサイズ・圧縮',
    '基本的な画像品質調整'
  ],
  secondary_features: [
    'バーコードスキャン（将来）',
    'リアルタイム画像解析（AI機能）',
    '複数画像選択',
    'カメラプレビュー'
  ],
  technical_requirements: [
    'TypeScript完全サポート',
    'iOS/Android対応',
    'パフォーマンス効率',
    '適切なファイルサイズ圧縮',
    '権限管理の簡単さ'
  ],
  constraints: [
    'バッテリー効率',
    'ストレージ容量',
    'ネットワーク使用量',
    'ユーザビリティ'
  ]
};

/**
 * 選定した組み合わせ
 */
export const SELECTED_CAMERA_STACK = {
  primary: {
    name: 'react-native-image-picker',
    purpose: 'メインの画像取得（カメラ撮影＋ギャラリー選択）',
    reason: '使いやすさ、安定性、TypeScript対応'
  },
  processing: {
    name: 'react-native-image-resizer',
    purpose: '画像処理（リサイズ・圧縮・最適化）',
    reason: '高性能処理、軽量、Ordo要件に最適'
  },
  future: {
    name: 'react-native-vision-camera',
    purpose: '将来のリアルタイムAI解析機能',
    reason: 'Frame Processor、高性能、将来性'
  }
};

/**
 * Phase 9実装方針
 * 
 * 1. react-native-image-picker（メイン）
 *    - 商品撮影機能
 *    - ギャラリー選択機能
 *    - シンプルなUI/UX
 * 
 * 2. react-native-image-resizer（サポート）
 *    - 画像最適化
 *    - ストレージ節約
 *    - 表示パフォーマンス向上
 * 
 * 3. 将来拡張性確保
 *    - vision-cameraへの移行準備
 *    - AI機能との統合設計
 *    - バーコードスキャン対応
 */
export const IMPLEMENTATION_PLAN = {
  phase1: 'react-native-image-picker + react-native-image-resizer',
  phase2: 'react-native-vision-camera integration（AI機能）',
  phase3: 'Advanced camera features (barcode, real-time analysis)'
};

export default {
  libraries: CAMERA_LIBRARY_COMPARISON,
  criteria: CAMERA_EVALUATION_CRITERIA,
  requirements: ORDO_CAMERA_REQUIREMENTS,
  selected: SELECTED_CAMERA_STACK,
  plan: IMPLEMENTATION_PLAN
};
