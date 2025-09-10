/**
 * Ordo Design System Foundation (6時間実装)
 * 
 * 包括的デザインシステム - 統一されたUI/UX体験の基盤
 * Material Design 3 + Apple Human Interface Guidelines準拠
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

// =============================================================================
// DESIGN TOKENS - 設計原則の基礎単位
// =============================================================================

/**
 * スペーシングシステム - 8pxベースグリッド
 */
export const SPACING = {
  // 基本単位 (8px base)
  xs: 4,   // 0.25rem
  sm: 8,   // 0.5rem  
  md: 16,  // 1rem (基準)
  lg: 24,  // 1.5rem
  xl: 32,  // 2rem
  xxl: 40, // 2.5rem
  xxxl: 48, // 3rem

  // セマンティックスペーシング
  gutter: 16,        // コンテンツ横幅の基本マージン
  section: 32,       // セクション間隔
  component: 12,     // コンポーネント内間隔
  element: 8,        // 要素間隔
  micro: 4,          // 微細な間隔

  // コンテナスペーシング
  container: {
    horizontal: 20,   // 画面端からのマージン
    vertical: 16,     // 上下マージン
    section: 40,      // セクション間隔
    content: 24       // コンテンツ内間隔
  }
} as const;

/**
 * ブレークポイントシステム - レスポンシブデザイン
 */
export const BREAKPOINTS = {
  mobile: {
    min: 0,
    max: 767
  },
  tablet: {
    min: 768,
    max: 1023
  },
  desktop: {
    min: 1024,
    max: 1439
  },
  large: {
    min: 1440,
    max: Infinity
  }
} as const;

/**
 * グリッドシステム
 */
export const GRID = {
  columns: 12,
  gutter: SPACING.gutter,
  margin: SPACING.container.horizontal,
  maxWidth: {
    mobile: '100%',
    tablet: 768,
    desktop: 1200,
    large: 1440
  }
} as const;

/**
 * Zインデックス階層
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  system: 1090
} as const;

/**
 * 角丸システム
 */
export const BORDER_RADIUS = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  round: 9999,

  // セマンティック角丸
  button: 8,
  card: 12,
  modal: 16,
  input: 8,
  badge: 12,
  avatar: 9999
} as const;

/**
 * シャドウシステム
 */
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16
  }
} as const;

/**
 * アニメーション・トランジション
 */
export const ANIMATION = {
  // 期間 (ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
    slowest: 700
  },

  // イージング
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },

  // React Native Animated用設定
  spring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true
  },

  timing: {
    duration: 200,
    useNativeDriver: true
  }
} as const;

/**
 * オパシティスケール
 */
export const OPACITY = {
  disabled: 0.38,
  inactive: 0.54,
  secondary: 0.74,
  primary: 0.87,
  full: 1.0,

  // セマンティックオパシティ
  overlay: 0.5,
  backdrop: 0.7,
  ghost: 0.1,
  hover: 0.08,
  pressed: 0.12,
  selected: 0.16
} as const;

// =============================================================================
// DEVICE & PLATFORM UTILITIES
// =============================================================================

/**
 * デバイス情報とユーティリティ
 */
export const DEVICE = {
  // 画面サイズ
  screen: Dimensions.get('screen'),
  window: Dimensions.get('window'),

  // プラットフォーム判定
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',

  // セーフエリア対応
  statusBarHeight: StatusBar.currentHeight || 0,

  // デバイスタイプ判定
  isTablet: () => {
    const { width, height } = Dimensions.get('screen');
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    return aspectRatio < 1.6;
  },

  // 画面密度
  pixelRatio: Platform.select({
    ios: () => {
      const { scale } = Dimensions.get('window');
      return scale;
    },
    android: () => {
      const { fontScale } = Dimensions.get('window');
      return fontScale;
    },
    default: () => 1
  })(),

  // レスポンシブヘルパー
  responsive: {
    isMobile: () => {
      const { width } = Dimensions.get('window');
      return width <= BREAKPOINTS.mobile.max;
    },
    isTablet: () => {
      const { width } = Dimensions.get('window');
      return width >= BREAKPOINTS.tablet.min && width <= BREAKPOINTS.tablet.max;
    },
    isDesktop: () => {
      const { width } = Dimensions.get('window');
      return width >= BREAKPOINTS.desktop.min;
    }
  }
} as const;

// =============================================================================
// COMPONENT DESIGN SPECS
// =============================================================================

/**
 * コンポーネント設計仕様
 */
export const COMPONENT_SPECS = {
  // ボタン
  button: {
    height: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56
    },
    padding: {
      horizontal: SPACING.md,
      vertical: SPACING.sm
    },
    borderRadius: BORDER_RADIUS.button,
    minWidth: 64
  },

  // 入力フィールド
  input: {
    height: {
      sm: 36,
      md: 44,
      lg: 52
    },
    padding: {
      horizontal: SPACING.md,
      vertical: SPACING.sm
    },
    borderRadius: BORDER_RADIUS.input,
    borderWidth: 1
  },

  // カード
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.card,
    shadow: SHADOWS.md
  },

  // ヘッダー
  header: {
    height: {
      mobile: 56,
      tablet: 64,
      desktop: 72
    },
    padding: {
      horizontal: SPACING.container.horizontal,
      vertical: SPACING.sm
    }
  },

  // ナビゲーション
  navigation: {
    height: {
      bottom: 60,
      side: '100%'
    },
    iconSize: 24,
    padding: SPACING.sm
  },

  // アバター
  avatar: {
    size: {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56,
      xxl: 64
    },
    borderRadius: BORDER_RADIUS.avatar
  },

  // バッジ
  badge: {
    minSize: 20,
    padding: {
      horizontal: 6,
      vertical: 2
    },
    borderRadius: BORDER_RADIUS.badge
  }
} as const;

// =============================================================================
// INTERACTION STATES
// =============================================================================

/**
 * インタラクション状態定義
 */
export const INTERACTION_STATES = {
  default: {
    opacity: OPACITY.full,
    scale: 1
  },
  hover: {
    opacity: OPACITY.primary,
    scale: 1.02
  },
  pressed: {
    opacity: OPACITY.secondary,
    scale: 0.98
  },
  focused: {
    opacity: OPACITY.full,
    scale: 1,
    outline: true
  },
  disabled: {
    opacity: OPACITY.disabled,
    scale: 1
  },
  loading: {
    opacity: OPACITY.secondary,
    scale: 1
  }
} as const;

// =============================================================================
// ACCESSIBILITY SPECIFICATIONS
// =============================================================================

/**
 * アクセシビリティ仕様
 */
export const ACCESSIBILITY = {
  // 最小タッチターゲットサイズ (44x44pt)
  minTouchTarget: 44,

  // 推奨タッチターゲットサイズ
  recommendedTouchTarget: 48,

  // コントラスト比
  contrast: {
    AA_normal: 4.5,   // WCAG AA レベル (通常テキスト)
    AA_large: 3,      // WCAG AA レベル (大きなテキスト)
    AAA_normal: 7,    // WCAG AAA レベル (通常テキスト)
    AAA_large: 4.5    // WCAG AAA レベル (大きなテキスト)
  },

  // セマンティックマークアップ
  roles: {
    button: 'button',
    link: 'link',
    heading: 'heading',
    text: 'text',
    image: 'image',
    list: 'list',
    listItem: 'listitem',
    searchField: 'searchbox',
    textField: 'textbox',
    comboBox: 'combobox',
    tab: 'tab',
    tabList: 'tablist',
    tabPanel: 'tabpanel',
    alert: 'alert',
    dialog: 'dialog',
    menu: 'menu',
    menuItem: 'menuitem'
  },

  // スクリーンリーダー対応
  announcements: {
    polite: 'polite',
    assertive: 'assertive',
    off: 'none'
  }
} as const;

// =============================================================================
// DESIGN SYSTEM UTILITIES
// =============================================================================

/**
 * レスポンシブ値計算ユーティリティ
 */
export const responsive = {
  /**
   * 画面サイズに応じて値を返す
   */
  value: <T>(values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    const { width } = Dimensions.get('window');
    
    if (width <= BREAKPOINTS.mobile.max && values.mobile !== undefined) {
      return values.mobile;
    }
    
    if (width >= BREAKPOINTS.tablet.min && width <= BREAKPOINTS.tablet.max && values.tablet !== undefined) {
      return values.tablet;
    }
    
    if (width >= BREAKPOINTS.desktop.min && values.desktop !== undefined) {
      return values.desktop;
    }
    
    return values.default;
  },

  /**
   * スペーシングをスケールする
   */
  spacing: (multiplier: number): number => {
    return SPACING.md * multiplier;
  },

  /**
   * フォントサイズをスケールする
   */
  fontSize: (baseSize: number): number => {
    const { fontScale } = Dimensions.get('window');
    return baseSize * Math.min(fontScale, 1.3); // 最大130%までスケール
  }
};

/**
 * デザインシステムバリデーター
 */
export const validate = {
  /**
   * カラーコントラスト比を計算
   */
  contrast: (color1: string, color2: string): number => {
    // 簡易実装 - 実際のプロジェクトでは詳細な計算が必要
    return 4.5; // モック値
  },

  /**
   * タッチターゲットサイズを検証
   */
  touchTarget: (width: number, height: number): boolean => {
    return width >= ACCESSIBILITY.minTouchTarget && height >= ACCESSIBILITY.minTouchTarget;
  },

  /**
   * テキストの可読性を検証
   */
  readability: (fontSize: number, lineHeight: number): boolean => {
    const ratio = lineHeight / fontSize;
    return ratio >= 1.2 && ratio <= 1.6; // 適切な行間比率
  }
};

// =============================================================================
// DESIGN SYSTEM CONFIGURATION
// =============================================================================

/**
 * デザインシステム設定
 */
export const DESIGN_SYSTEM_CONFIG = {
  version: '1.0.0',
  
  // 基本設定
  settings: {
    strictMode: __DEV__, // 開発時のみ厳密チェック
    autoScaling: true,   // 自動スケーリング有効
    darkModeSupport: true, // ダークモード対応
    animationsEnabled: true, // アニメーション有効
    accessibilityMode: false // アクセシビリティモード
  },

  // デバッグ設定
  debug: {
    showGrid: __DEV__ && false,
    showSpacing: __DEV__ && false,
    showTouchTargets: __DEV__ && false,
    logPerformance: __DEV__ && false
  },

  // テーマ設定
  theme: {
    default: 'light',
    available: ['light', 'dark', 'auto'],
    respectSystemTheme: true
  }
} as const;

/**
 * デザインシステムの初期化
 */
export const initializeDesignSystem = (config?: Partial<typeof DESIGN_SYSTEM_CONFIG.settings>) => {
  if (config) {
    Object.assign(DESIGN_SYSTEM_CONFIG.settings, config);
  }

  // 初期化ログ
  if (__DEV__) {
    console.log('🎨 Ordo Design System initialized', {
      version: DESIGN_SYSTEM_CONFIG.version,
      platform: Platform.OS,
      dimensions: Dimensions.get('window'),
      config: DESIGN_SYSTEM_CONFIG.settings
    });
  }
};

// デフォルトエクスポート
export default {
  SPACING,
  BREAKPOINTS,
  GRID,
  Z_INDEX,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  OPACITY,
  DEVICE,
  COMPONENT_SPECS,
  INTERACTION_STATES,
  ACCESSIBILITY,
  responsive,
  validate,
  DESIGN_SYSTEM_CONFIG,
  initializeDesignSystem
};
