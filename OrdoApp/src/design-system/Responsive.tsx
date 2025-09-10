/**
 * Ordo Responsive Design System (4時間実装)
 * 
 * モバイルファーストのレスポンシブデザイン
 * React Native + Web対応
 * ブレークポイント・グリッドシステム・アダプティブタイポグラフィ
 */

import { Dimensions, Platform } from 'react-native';
import { SPACING, BORDER_RADIUS } from './DesignSystem';
import { FONT_SIZES, TYPOGRAPHY_TOKENS } from './Typography';

// =============================================================================
// SCREEN DIMENSIONS - 画面サイズ取得
// =============================================================================

/**
 * 現在の画面サイズを取得
 */
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

/**
 * 画面サイズ監視フック
 */
export const useScreenDimensions = () => {
  const [dimensions, setDimensions] = React.useState(getScreenDimensions);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// =============================================================================
// BREAKPOINTS - ブレークポイント
// =============================================================================

/**
 * Material Design 3準拠のブレークポイント
 */
export const BREAKPOINTS = {
  // モバイル
  xs: 0,      // 極小デバイス
  sm: 360,    // 小型スマートフォン
  md: 480,    // 大型スマートフォン
  
  // タブレット
  lg: 768,    // タブレット (縦)
  xl: 1024,   // タブレット (横)
  
  // デスクトップ
  xxl: 1440,  // デスクトップ
  xxxl: 1920  // 大型デスクトップ
} as const;

/**
 * ブレークポイント名
 */
export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * デバイスタイプ
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * 画面の向き
 */
export type Orientation = 'portrait' | 'landscape';

// =============================================================================
// DEVICE DETECTION - デバイス検出
// =============================================================================

/**
 * 現在のブレークポイントを取得
 */
export const getCurrentBreakpoint = (width?: number): BreakpointKey => {
  const screenWidth = width || getScreenDimensions().width;
  
  if (screenWidth >= BREAKPOINTS.xxxl) return 'xxxl';
  if (screenWidth >= BREAKPOINTS.xxl) return 'xxl';
  if (screenWidth >= BREAKPOINTS.xl) return 'xl';
  if (screenWidth >= BREAKPOINTS.lg) return 'lg';
  if (screenWidth >= BREAKPOINTS.md) return 'md';
  if (screenWidth >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

/**
 * デバイスタイプを判定
 */
export const getDeviceType = (width?: number): DeviceType => {
  const screenWidth = width || getScreenDimensions().width;
  
  if (screenWidth >= BREAKPOINTS.xxl) return 'desktop';
  if (screenWidth >= BREAKPOINTS.lg) return 'tablet';
  return 'mobile';
};

/**
 * 画面の向きを取得
 */
export const getOrientation = (): Orientation => {
  const { width, height } = getScreenDimensions();
  return width > height ? 'landscape' : 'portrait';
};

/**
 * 特定のブレークポイント以上かを判定
 */
export const isBreakpointUp = (breakpoint: BreakpointKey, width?: number): boolean => {
  const screenWidth = width || getScreenDimensions().width;
  return screenWidth >= BREAKPOINTS[breakpoint];
};

/**
 * 特定のブレークポイント以下かを判定
 */
export const isBreakpointDown = (breakpoint: BreakpointKey, width?: number): boolean => {
  const screenWidth = width || getScreenDimensions().width;
  return screenWidth <= BREAKPOINTS[breakpoint];
};

// =============================================================================
// RESPONSIVE GRID SYSTEM - レスポンシブグリッド
// =============================================================================

/**
 * グリッドシステム設定
 */
export const GRID_SYSTEM = {
  // カラム数
  columns: {
    xs: 4,   // 4カラム
    sm: 4,   // 4カラム
    md: 8,   // 8カラム
    lg: 12,  // 12カラム
    xl: 12,  // 12カラム
    xxl: 12, // 12カラム
    xxxl: 12 // 12カラム
  },
  
  // ガター (カラム間隔)
  gutters: {
    xs: SPACING.sm,   // 8px
    sm: SPACING.md,   // 16px
    md: SPACING.md,   // 16px
    lg: SPACING.lg,   // 24px
    xl: SPACING.lg,   // 24px
    xxl: SPACING.xl,  // 32px
    xxxl: SPACING.xl  // 32px
  },
  
  // マージン (画面端からの余白)
  margins: {
    xs: SPACING.md,   // 16px
    sm: SPACING.md,   // 16px
    md: SPACING.lg,   // 24px
    lg: SPACING.xl,   // 32px
    xl: SPACING.xl,   // 32px
    xxl: SPACING.xxl, // 40px
    xxxl: SPACING.xxl // 40px
  },
  
  // コンテナ最大幅
  maxWidths: {
    xs: '100%',
    sm: '100%',
    md: '100%',
    lg: 960,
    xl: 1280,
    xxl: 1440,
    xxxl: 1600
  }
} as const;

/**
 * グリッドカラム幅を計算
 */
export const calculateColumnWidth = (
  span: number,
  breakpoint?: BreakpointKey,
  containerWidth?: number
): number => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  const totalColumns = GRID_SYSTEM.columns[currentBreakpoint];
  const gutter = GRID_SYSTEM.gutters[currentBreakpoint];
  const margin = GRID_SYSTEM.margins[currentBreakpoint];
  
  const screenWidth = containerWidth || getScreenDimensions().width;
  const availableWidth = screenWidth - (margin * 2);
  const totalGutterWidth = (totalColumns - 1) * gutter;
  const columnWidth = (availableWidth - totalGutterWidth) / totalColumns;
  
  return (columnWidth * span) + (gutter * (span - 1));
};

// =============================================================================
// RESPONSIVE SPACING - レスポンシブスペーシング
// =============================================================================

/**
 * レスポンシブスペーシングスケール
 */
export const RESPONSIVE_SPACING = {
  xs: {
    micro: 2,
    xs: 4,
    sm: 6,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 24,
    component: 8
  },
  sm: {
    micro: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    section: 32,
    component: 12
  },
  md: {
    micro: 4,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    section: 40,
    component: 16
  },
  lg: {
    micro: 4,
    xs: 8,
    sm: 12,
    md: 20,
    lg: 28,
    xl: 36,
    xxl: 48,
    section: 48,
    component: 20
  },
  xl: {
    micro: 4,
    xs: 8,
    sm: 12,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 56,
    section: 56,
    component: 24
  },
  xxl: {
    micro: 4,
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
    section: 64,
    component: 24
  },
  xxxl: {
    micro: 4,
    xs: 8,
    sm: 16,
    md: 32,
    lg: 40,
    xl: 56,
    xxl: 72,
    section: 72,
    component: 32
  }
} as const;

/**
 * レスポンシブスペーシングを取得
 */
export const getResponsiveSpacing = (
  size: keyof typeof RESPONSIVE_SPACING.xs,
  breakpoint?: BreakpointKey
): number => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  return RESPONSIVE_SPACING[currentBreakpoint][size];
};

// =============================================================================
// RESPONSIVE TYPOGRAPHY - レスポンシブタイポグラフィ
// =============================================================================

/**
 * レスポンシブフォントサイズ
 */
export const RESPONSIVE_FONT_SIZES = {
  xs: {
    displayLarge: 48,
    displayMedium: 40,
    displaySmall: 32,
    headlineLarge: 28,
    headlineMedium: 24,
    headlineSmall: 20,
    titleLarge: 18,
    titleMedium: 16,
    titleSmall: 14,
    bodyLarge: 14,
    bodyMedium: 12,
    bodySmall: 11,
    labelLarge: 12,
    labelMedium: 11,
    labelSmall: 10
  },
  sm: {
    displayLarge: 52,
    displayMedium: 44,
    displaySmall: 36,
    headlineLarge: 32,
    headlineMedium: 28,
    headlineSmall: 24,
    titleLarge: 20,
    titleMedium: 18,
    titleSmall: 16,
    bodyLarge: 16,
    bodyMedium: 14,
    bodySmall: 12,
    labelLarge: 14,
    labelMedium: 12,
    labelSmall: 11
  },
  md: {
    displayLarge: 56,
    displayMedium: 48,
    displaySmall: 40,
    headlineLarge: 36,
    headlineMedium: 32,
    headlineSmall: 28,
    titleLarge: 24,
    titleMedium: 20,
    titleSmall: 18,
    bodyLarge: 18,
    bodyMedium: 16,
    bodySmall: 14,
    labelLarge: 16,
    labelMedium: 14,
    labelSmall: 12
  },
  lg: {
    displayLarge: 64,
    displayMedium: 56,
    displaySmall: 48,
    headlineLarge: 40,
    headlineMedium: 36,
    headlineSmall: 32,
    titleLarge: 28,
    titleMedium: 24,
    titleSmall: 20,
    bodyLarge: 20,
    bodyMedium: 18,
    bodySmall: 16,
    labelLarge: 18,
    labelMedium: 16,
    labelSmall: 14
  },
  xl: {
    displayLarge: 72,
    displayMedium: 64,
    displaySmall: 56,
    headlineLarge: 48,
    headlineMedium: 40,
    headlineSmall: 36,
    titleLarge: 32,
    titleMedium: 28,
    titleSmall: 24,
    bodyLarge: 22,
    bodyMedium: 20,
    bodySmall: 18,
    labelLarge: 20,
    labelMedium: 18,
    labelSmall: 16
  },
  xxl: {
    displayLarge: 80,
    displayMedium: 72,
    displaySmall: 64,
    headlineLarge: 56,
    headlineMedium: 48,
    headlineSmall: 40,
    titleLarge: 36,
    titleMedium: 32,
    titleSmall: 28,
    bodyLarge: 24,
    bodyMedium: 22,
    bodySmall: 20,
    labelLarge: 22,
    labelMedium: 20,
    labelSmall: 18
  },
  xxxl: {
    displayLarge: 88,
    displayMedium: 80,
    displaySmall: 72,
    headlineLarge: 64,
    headlineMedium: 56,
    headlineSmall: 48,
    titleLarge: 40,
    titleMedium: 36,
    titleSmall: 32,
    bodyLarge: 26,
    bodyMedium: 24,
    bodySmall: 22,
    labelLarge: 24,
    labelMedium: 22,
    labelSmall: 20
  }
} as const;

/**
 * レスポンシブフォントサイズを取得
 */
export const getResponsiveFontSize = (
  typographyToken: keyof typeof RESPONSIVE_FONT_SIZES.xs,
  breakpoint?: BreakpointKey
): number => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  return RESPONSIVE_FONT_SIZES[currentBreakpoint][typographyToken];
};

// =============================================================================
// RESPONSIVE LAYOUT UTILITIES - レスポンシブレイアウトユーティリティ
// =============================================================================

/**
 * レスポンシブ値型
 */
export type ResponsiveValue<T> = T | {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  xxxl?: T;
};

/**
 * レスポンシブ値を解決
 */
export const resolveResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  breakpoint?: BreakpointKey
): T => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const currentBreakpoint = breakpoint || getCurrentBreakpoint();
    const breakpointOrder: BreakpointKey[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    
    // 現在のブレークポイント以下で定義されている値を探す
    for (let i = breakpointOrder.indexOf(currentBreakpoint); i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (value[bp] !== undefined) {
        return value[bp] as T;
      }
    }
    
    // 見つからない場合は最小値を返す
    return value.xs as T;
  }
  
  return value as T;
};

/**
 * レスポンシブスタイルを生成
 */
export const createResponsiveStyle = (
  styleFunction: (breakpoint: BreakpointKey) => any,
  breakpoint?: BreakpointKey
) => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  return styleFunction(currentBreakpoint);
};

// =============================================================================
// ADAPTIVE COMPONENTS - アダプティブコンポーネント
// =============================================================================

/**
 * アダプティブコンテナのプロップス
 */
export interface AdaptiveContainerProps {
  children: React.ReactNode;
  maxWidth?: ResponsiveValue<number | string>;
  padding?: ResponsiveValue<number>;
  margin?: ResponsiveValue<number>;
  breakpoint?: BreakpointKey;
}

/**
 * アダプティブコンテナ
 */
export const AdaptiveContainer: React.FC<AdaptiveContainerProps> = ({
  children,
  maxWidth,
  padding,
  margin,
  breakpoint
}) => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  
  const containerStyle = {
    maxWidth: maxWidth ? resolveResponsiveValue(maxWidth, currentBreakpoint) : GRID_SYSTEM.maxWidths[currentBreakpoint],
    padding: padding ? resolveResponsiveValue(padding, currentBreakpoint) : GRID_SYSTEM.margins[currentBreakpoint],
    margin: margin ? resolveResponsiveValue(margin, currentBreakpoint) : 'auto',
    width: '100%'
  };

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

/**
 * レスポンシブテキストのプロップス
 */
export interface ResponsiveTextProps {
  children: React.ReactNode;
  variant: keyof typeof RESPONSIVE_FONT_SIZES.xs;
  breakpoint?: BreakpointKey;
  style?: any;
}

/**
 * レスポンシブテキスト
 */
export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant,
  breakpoint,
  style
}) => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  const fontSize = getResponsiveFontSize(variant, currentBreakpoint);
  
  const textStyle = {
    fontSize,
    ...style
  };

  return (
    <Text style={textStyle}>
      {children}
    </Text>
  );
};

// =============================================================================
// PLATFORM SPECIFIC UTILITIES - プラットフォーム固有ユーティリティ
// =============================================================================

/**
 * プラットフォーム別レスポンシブ値
 */
export const createPlatformResponsiveValue = <T>(values: {
  web?: ResponsiveValue<T>;
  ios?: ResponsiveValue<T>;
  android?: ResponsiveValue<T>;
  default?: ResponsiveValue<T>;
}): ResponsiveValue<T> => {
  const platformValue = Platform.select({
    web: values.web,
    ios: values.ios,
    android: values.android,
    default: values.default
  });
  
  return platformValue || values.default!;
};

/**
 * セーフエリア対応の余白
 */
export const getSafeAreaPadding = (breakpoint?: BreakpointKey) => {
  const currentBreakpoint = breakpoint || getCurrentBreakpoint();
  const deviceType = getDeviceType();
  
  // デスクトップでは追加の余白は不要
  if (deviceType === 'desktop') {
    return {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
    };
  }
  
  // モバイル・タブレットではプラットフォーム固有の処理
  return Platform.select({
    ios: {
      paddingTop: 44, // iOS status bar
      paddingBottom: 34, // iOS home indicator
      paddingLeft: 0,
      paddingRight: 0
    },
    android: {
      paddingTop: 24, // Android status bar
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
    },
    default: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
    }
  });
};

// =============================================================================
// RESPONSIVE HOOKS - レスポンシブフック
// =============================================================================

/**
 * ブレークポイント監視フック
 */
export const useBreakpoint = () => {
  const { width } = useScreenDimensions();
  const [breakpoint, setBreakpoint] = React.useState<BreakpointKey>(getCurrentBreakpoint(width));

  React.useEffect(() => {
    setBreakpoint(getCurrentBreakpoint(width));
  }, [width]);

  return breakpoint;
};

/**
 * デバイスタイプ監視フック
 */
export const useDeviceType = () => {
  const { width } = useScreenDimensions();
  const [deviceType, setDeviceType] = React.useState<DeviceType>(getDeviceType(width));

  React.useEffect(() => {
    setDeviceType(getDeviceType(width));
  }, [width]);

  return deviceType;
};

/**
 * 向き監視フック
 */
export const useOrientation = () => {
  const [orientation, setOrientation] = React.useState<Orientation>(getOrientation());

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setOrientation(getOrientation());
    });

    return () => subscription?.remove();
  }, []);

  return orientation;
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  BREAKPOINTS,
  GRID_SYSTEM,
  RESPONSIVE_SPACING,
  RESPONSIVE_FONT_SIZES,
  AdaptiveContainer,
  ResponsiveText
};

export default {
  breakpoints: BREAKPOINTS,
  grid: GRID_SYSTEM,
  spacing: RESPONSIVE_SPACING,
  typography: RESPONSIVE_FONT_SIZES,
  utils: {
    getCurrentBreakpoint,
    getDeviceType,
    getOrientation,
    isBreakpointUp,
    isBreakpointDown,
    calculateColumnWidth,
    getResponsiveSpacing,
    getResponsiveFontSize,
    resolveResponsiveValue,
    createResponsiveStyle,
    createPlatformResponsiveValue,
    getSafeAreaPadding
  },
  components: {
    AdaptiveContainer,
    ResponsiveText
  },
  hooks: {
    useScreenDimensions,
    useBreakpoint,
    useDeviceType,
    useOrientation
  }
};
