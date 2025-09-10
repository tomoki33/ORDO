/**
 * Ordo Typography System (2時間実装)
 * 
 * Material Design 3 + Apple HIG準拠
 * 日本語・英語対応 + レスポンシブスケーリング
 * アクセシビリティ最適化 (読みやすさ重視)
 */

import { TextStyle } from 'react-native';
import { Platform } from 'react-native';

// =============================================================================
// FONT FAMILIES - フォントファミリー
// =============================================================================

/**
 * プラットフォーム別フォントファミリー定義
 */
const FONT_FAMILIES = {
  // 日本語フォント (優先度順)
  japanese: Platform.select({
    ios: [
      'ヒラギノ角ゴ ProN',
      'Hiragino Kaku Gothic ProN',
      'Hiragino Sans',
      'SF Pro Display',
      'SF Pro Text',
      'PingFang SC',
      'sans-serif'
    ],
    android: [
      'Noto Sans CJK JP',
      'NotoSansCJK-Regular',
      'Droid Sans Fallback',
      'sans-serif'
    ],
    default: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Noto Sans CJK JP',
      'sans-serif'
    ]
  }),

  // 英語・ラテン文字フォント
  latin: Platform.select({
    ios: [
      'SF Pro Display',
      'SF Pro Text',
      '-apple-system',
      'BlinkMacSystemFont',
      'Helvetica Neue',
      'Arial',
      'sans-serif'
    ],
    android: [
      'Roboto',
      'system-ui',
      'sans-serif'
    ],
    default: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif'
    ]
  }),

  // モノスペースフォント (コード表示用)
  monospace: Platform.select({
    ios: [
      'SF Mono',
      'Monaco',
      'Menlo',
      'Consolas',
      'monospace'
    ],
    android: [
      'Roboto Mono',
      'Droid Sans Mono',
      'monospace'
    ],
    default: [
      'SF Mono',
      'Monaco',
      'Menlo',
      'Roboto Mono',
      'Consolas',
      'Courier New',
      'monospace'
    ]
  })
} as const;

// =============================================================================
// FONT WEIGHTS - フォントウェイト
// =============================================================================

/**
 * フォントウェイト定義 (Material Design 3準拠)
 */
export const FONT_WEIGHTS = {
  thin: '100' as const,
  extraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  heavy: '900' as const
} as const;

// =============================================================================
// FONT SIZES - フォントサイズ
// =============================================================================

/**
 * ベースフォントサイズとスケール比
 */
const BASE_FONT_SIZE = 16; // 16px = 1rem
const SCALE_RATIO = 1.25;  // Major Third スケール

/**
 * タイポグラフィスケール (16px基準)
 */
export const FONT_SIZES = {
  // 極小
  xs: 10,      // 0.625rem
  
  // 小
  sm: 12,      // 0.75rem
  
  // ベース
  base: 16,    // 1rem
  
  // 中
  md: 18,      // 1.125rem
  
  // 大
  lg: 20,      // 1.25rem
  xl: 24,      // 1.5rem
  '2xl': 30,   // 1.875rem
  '3xl': 36,   // 2.25rem
  
  // 特大
  '4xl': 48,   // 3rem
  '5xl': 60,   // 3.75rem
  '6xl': 72    // 4.5rem
} as const;

// =============================================================================
// LINE HEIGHTS - 行間
// =============================================================================

/**
 * 行間設定 (Material Design 3準拠)
 */
export const LINE_HEIGHTS = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2
} as const;

// =============================================================================
// LETTER SPACING - 文字間隔
// =============================================================================

/**
 * 文字間隔設定
 */
export const LETTER_SPACING = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6
} as const;

// =============================================================================
// TYPOGRAPHY TOKENS - タイポグラフィトークン
// =============================================================================

/**
 * Material Design 3タイポグラフィスケール実装
 */
const TYPOGRAPHY_TOKENS = {
  // ディスプレイ (大見出し)
  displayLarge: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES['6xl'],
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 64,
    letterSpacing: LETTER_SPACING.tight,
    color: 'inherit'
  } as TextStyle,

  displayMedium: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES['5xl'],
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 52,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  displaySmall: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 44,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // ヘッドライン (見出し)
  headlineLarge: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 40,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  headlineMedium: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES['2xl'],
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 36,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  headlineSmall: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 32,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // タイトル (中見出し)
  titleLarge: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 28,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  titleMedium: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 24,
    letterSpacing: LETTER_SPACING.wide,
    color: 'inherit'
  } as TextStyle,

  titleSmall: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING.wide,
    color: 'inherit'
  } as TextStyle,

  // ラベル (小見出し・ボタン)
  labelLarge: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING.wide,
    color: 'inherit'
  } as TextStyle,

  labelMedium: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 16,
    letterSpacing: LETTER_SPACING.wider,
    color: 'inherit'
  } as TextStyle,

  labelSmall: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 16,
    letterSpacing: LETTER_SPACING.wider,
    color: 'inherit'
  } as TextStyle,

  // ボディ (本文)
  bodyLarge: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 24,
    letterSpacing: LETTER_SPACING.wider,
    color: 'inherit'
  } as TextStyle,

  bodyMedium: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING.wide,
    color: 'inherit'
  } as TextStyle,

  bodySmall: {
    fontFamily: FONT_FAMILIES.latin.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 16,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle
} as const;

// =============================================================================
// JAPANESE TYPOGRAPHY - 日本語タイポグラフィ
// =============================================================================

/**
 * 日本語専用タイポグラフィ設定
 */
const JAPANESE_TYPOGRAPHY = {
  // 大見出し
  headingPrimary: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 52,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // 中見出し
  headingSecondary: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semiBold,
    lineHeight: 36,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // 小見出し
  headingTertiary: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 30,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // 本文 (標準)
  bodyPrimary: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 26,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // 本文 (小)
  bodySecondary: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // キャプション
  caption: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 16,
    letterSpacing: LETTER_SPACING.normal,
    color: 'inherit'
  } as TextStyle,

  // ボタンテキスト
  button: {
    fontFamily: FONT_FAMILIES.japanese.join(', '),
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING.wide,
    color: 'inherit'
  } as TextStyle
} as const;

// =============================================================================
// RESPONSIVE TYPOGRAPHY - レスポンシブタイポグラフィ
// =============================================================================

/**
 * レスポンシブスケーリング
 */
export const RESPONSIVE_SCALES = {
  mobile: {
    multiplier: 0.875,  // 87.5%
    minSize: 12,
    maxSize: 48
  },
  tablet: {
    multiplier: 1,      // 100%
    minSize: 14,
    maxSize: 60
  },
  desktop: {
    multiplier: 1.125,  // 112.5%
    minSize: 16,
    maxSize: 72
  }
} as const;

/**
 * 画面サイズに応じたフォントサイズ計算
 */
export const calculateResponsiveSize = (
  baseSize: number,
  screenType: 'mobile' | 'tablet' | 'desktop'
): number => {
  const scale = RESPONSIVE_SCALES[screenType];
  const scaledSize = Math.round(baseSize * scale.multiplier);
  return Math.min(Math.max(scaledSize, scale.minSize), scale.maxSize);
};

// =============================================================================
// ACCESSIBILITY TYPOGRAPHY - アクセシビリティ対応
// =============================================================================

/**
 * アクセシビリティ強化設定
 */
export const ACCESSIBILITY_TYPOGRAPHY = {
  // 高コントラスト
  highContrast: {
    fontWeight: FONT_WEIGHTS.semiBold,
    letterSpacing: LETTER_SPACING.wide
  },

  // 大文字
  largeText: {
    multiplier: 1.25,
    lineHeightMultiplier: 1.4
  },

  // ディスレクシア対応
  dyslexiaFriendly: {
    fontFamily: Platform.select({
      ios: ['SF Pro Text', 'system'],
      android: ['Roboto', 'system'],
      default: ['system-ui', 'sans-serif']
    }),
    letterSpacing: LETTER_SPACING.wide,
    lineHeight: LINE_HEIGHTS.loose
  }
} as const;

// =============================================================================
// UTILITY FUNCTIONS - ユーティリティ関数
// =============================================================================

/**
 * タイポグラフィユーティリティ
 */
export const typographyUtils = {
  /**
   * 文字数に基づく最適な行幅計算
   */
  getOptimalLineLength: (fontSize: number): number => {
    // 理想的な行長: 45-75文字 (日本語は30-50文字)
    const charactersPerLine = 60;
    const averageCharWidth = fontSize * 0.6;
    return charactersPerLine * averageCharWidth;
  },

  /**
   * 読みやすさスコア計算
   */
  calculateReadabilityScore: (
    fontSize: number,
    lineHeight: number,
    letterSpacing: number
  ): number => {
    // 簡易読みやすさスコア (0-100)
    const fontSizeScore = Math.min(fontSize / 16, 1) * 40;
    const lineHeightScore = Math.min(lineHeight / fontSize, 2) * 30;
    const spacingScore = Math.abs(letterSpacing) < 0.5 ? 30 : 20;
    
    return Math.round(fontSizeScore + lineHeightScore + spacingScore);
  },

  /**
   * アクセシブルなコントラスト確認
   */
  meetsAccessibilityStandards: (
    fontSize: number,
    fontWeight: string,
    contrastRatio: number
  ): { AA: boolean; AAA: boolean } => {
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= '700');
    
    return {
      AA: isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5,
      AAA: isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7
    };
  }
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type TypographyToken = keyof typeof TYPOGRAPHY_TOKENS;
export type JapaneseTypographyToken = keyof typeof JAPANESE_TYPOGRAPHY;
export type FontWeight = keyof typeof FONT_WEIGHTS;
export type FontSize = keyof typeof FONT_SIZES;
export type LineHeight = keyof typeof LINE_HEIGHTS;
export type LetterSpacing = keyof typeof LETTER_SPACING;

/**
 * タイポグラフィスタイル型
 */
export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
  letterSpacing: number;
  color?: string;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  FONT_FAMILIES,
  TYPOGRAPHY_TOKENS,
  JAPANESE_TYPOGRAPHY
};

export default {
  tokens: TYPOGRAPHY_TOKENS,
  japanese: JAPANESE_TYPOGRAPHY,
  weights: FONT_WEIGHTS,
  sizes: FONT_SIZES,
  lineHeights: LINE_HEIGHTS,
  letterSpacing: LETTER_SPACING,
  families: FONT_FAMILIES,
  responsive: RESPONSIVE_SCALES,
  accessibility: ACCESSIBILITY_TYPOGRAPHY,
  utils: typographyUtils
};
