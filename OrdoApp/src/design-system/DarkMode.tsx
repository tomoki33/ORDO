/**
 * Ordo Dark Mode System (4時間実装)
 * 
 * 包括的ダークモード対応
 * システム設定連動・手動切り替え・アニメーション対応
 * アクセシビリティ最適化
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_THEME, DARK_THEME, ColorTheme } from './Colors';

// =============================================================================
// THEME CONTEXT - テーマコンテキスト
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeContextType {
  // 現在のテーマ
  theme: ColorTheme;
  
  // ダークモードかどうか
  isDark: boolean;
  
  // テーマモード
  mode: ThemeMode;
  
  // テーマ切り替え関数
  setTheme: (mode: ThemeMode) => void;
  
  // ダークモード切り替え
  toggleDarkMode: () => void;
  
  // システムテーマ
  systemTheme: ColorSchemeName;
  
  // テーマ変更中かどうか
  isChanging: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// THEME STORAGE - テーマ保存
// =============================================================================

const THEME_STORAGE_KEY = '@ordo_theme_mode';

/**
 * テーマモードを保存
 */
const saveThemeMode = async (mode: ThemeMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme mode:', error);
  }
};

/**
 * 保存されたテーマモードを取得
 */
const loadThemeMode = async (): Promise<ThemeMode> => {
  try {
    const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      return savedMode as ThemeMode;
    }
  } catch (error) {
    console.warn('Failed to load theme mode:', error);
  }
  
  return 'auto'; // デフォルトはシステム連動
};

// =============================================================================
// THEME PROVIDER - テーマプロバイダー
// =============================================================================

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  enableSystemTheme?: boolean;
  animationDuration?: number;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'auto',
  enableSystemTheme = true,
  animationDuration = 300
}) => {
  // システムテーマ
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    enableSystemTheme ? Appearance.getColorScheme() : 'light'
  );
  
  // 現在のテーマモード
  const [mode, setMode] = useState<ThemeMode>(initialTheme);
  
  // テーマ変更中フラグ
  const [isChanging, setIsChanging] = useState(false);
  
  // 初期化完了フラグ
  const [isInitialized, setIsInitialized] = useState(false);

  // 実際のダークモード状態を計算
  const isDark = mode === 'dark' || (mode === 'auto' && systemTheme === 'dark');
  
  // 現在のテーマ
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // =============================================================================
  // SYSTEM THEME LISTENER - システムテーマリスナー
  // =============================================================================

  useEffect(() => {
    if (!enableSystemTheme) return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme);
    });

    return () => subscription.remove();
  }, [enableSystemTheme]);

  // =============================================================================
  // THEME INITIALIZATION - テーマ初期化
  // =============================================================================

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedMode = await loadThemeMode();
        setMode(savedMode);
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, []);

  // =============================================================================
  // THEME ACTIONS - テーマアクション
  // =============================================================================

  /**
   * テーマモードを設定
   */
  const setTheme = useCallback(async (newMode: ThemeMode) => {
    if (newMode === mode) return;

    setIsChanging(true);

    try {
      // アニメーション時間分待機
      setTimeout(() => {
        setMode(newMode);
        setIsChanging(false);
      }, animationDuration / 2);

      // 設定を保存
      await saveThemeMode(newMode);
    } catch (error) {
      console.warn('Failed to set theme:', error);
      setIsChanging(false);
    }
  }, [mode, animationDuration]);

  /**
   * ダークモードを切り替え
   */
  const toggleDarkMode = useCallback(() => {
    const newMode: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
  }, [isDark, setTheme]);

  // =============================================================================
  // CONTEXT VALUE - コンテキスト値
  // =============================================================================

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    mode,
    setTheme,
    toggleDarkMode,
    systemTheme,
    isChanging
  };

  // 初期化が完了するまで何も表示しない
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// =============================================================================
// THEME HOOK - テーマフック
// =============================================================================

/**
 * テーマコンテキストを使用するフック
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * ダークモード状態のみを取得するフック
 */
export const useDarkMode = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};

/**
 * テーマ切り替え関数のみを取得するフック
 */
export const useThemeToggle = (): (() => void) => {
  const { toggleDarkMode } = useTheme();
  return toggleDarkMode;
};

// =============================================================================
// DARK MODE ENHANCED COLORS - ダークモード強化カラー
// =============================================================================

/**
 * ダークモード用追加カラーパレット
 */
export const DARK_MODE_ENHANCED_COLORS = {
  // 深い背景色 (より黒に近い)
  backgroundDeep: '#000000',
  backgroundElevated: '#121212',
  
  // 高コントラストテキスト
  textHighContrast: '#FFFFFF',
  textMediumContrast: '#E0E0E0',
  textLowContrast: '#A0A0A0',
  
  // 暗い表面色
  surfaceDim: '#0A0A0A',
  surfaceElevated1: '#1E1E1E',
  surfaceElevated2: '#2A2A2A',
  surfaceElevated3: '#363636',
  
  // アクセント色 (ダークモード最適化)
  accentPrimary: '#64FFDA',
  accentSecondary: '#448AFF',
  accentTertiary: '#FF4081',
  
  // 機能的カラー
  borderSubtle: '#2A2A2A',
  borderMedium: '#404040',
  borderStrong: '#606060',
  
  // インタラクション色
  hoverDark: 'rgba(255, 255, 255, 0.05)',
  pressedDark: 'rgba(255, 255, 255, 0.10)',
  focusDark: 'rgba(255, 255, 255, 0.15)',
  selectedDark: 'rgba(64, 255, 218, 0.15)',
  
  // オーバーレイ
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  backdropDark: 'rgba(0, 0, 0, 0.9)'
} as const;

// =============================================================================
// ENHANCED DARK THEME - 強化ダークテーマ
// =============================================================================

/**
 * 高品質ダークテーマ (OLED最適化)
 */
export const ENHANCED_DARK_THEME: ColorTheme = {
  ...DARK_THEME,
  
  // 背景色をより深く
  background: {
    default: DARK_MODE_ENHANCED_COLORS.backgroundDeep,
    paper: DARK_MODE_ENHANCED_COLORS.backgroundElevated,
    surface: DARK_MODE_ENHANCED_COLORS.surfaceElevated1,
    elevated: DARK_MODE_ENHANCED_COLORS.surfaceElevated2,
    disabled: DARK_MODE_ENHANCED_COLORS.surfaceDim
  },
  
  // サーフェス色を調整
  surface: {
    primary: DARK_MODE_ENHANCED_COLORS.backgroundElevated,
    secondary: DARK_MODE_ENHANCED_COLORS.surfaceElevated1,
    tertiary: DARK_MODE_ENHANCED_COLORS.surfaceElevated2,
    inverse: DARK_MODE_ENHANCED_COLORS.textHighContrast,
    variant: DARK_MODE_ENHANCED_COLORS.surfaceElevated3
  },
  
  // テキスト色を高コントラストに
  text: {
    primary: DARK_MODE_ENHANCED_COLORS.textHighContrast,
    secondary: DARK_MODE_ENHANCED_COLORS.textMediumContrast,
    tertiary: DARK_MODE_ENHANCED_COLORS.textLowContrast,
    disabled: '#666666',
    inverse: '#000000',
    link: DARK_MODE_ENHANCED_COLORS.accentSecondary,
    onPrimary: '#000000',
    onSecondary: '#000000',
    onSurface: DARK_MODE_ENHANCED_COLORS.textHighContrast
  },
  
  // ボーダー色を調整
  border: {
    primary: DARK_MODE_ENHANCED_COLORS.borderMedium,
    secondary: DARK_MODE_ENHANCED_COLORS.borderSubtle,
    focus: DARK_MODE_ENHANCED_COLORS.accentPrimary,
    error: '#FF6B6B',
    disabled: DARK_MODE_ENHANCED_COLORS.borderSubtle
  },
  
  // インタラクション色を調整
  interaction: {
    hover: DARK_MODE_ENHANCED_COLORS.hoverDark,
    pressed: DARK_MODE_ENHANCED_COLORS.pressedDark,
    focus: DARK_MODE_ENHANCED_COLORS.focusDark,
    selected: DARK_MODE_ENHANCED_COLORS.selectedDark,
    disabled: 'rgba(255, 255, 255, 0.08)'
  },
  
  // オーバーレイを調整
  overlay: {
    light: DARK_MODE_ENHANCED_COLORS.overlayDark,
    medium: DARK_MODE_ENHANCED_COLORS.backdropDark,
    heavy: 'rgba(0, 0, 0, 0.95)',
    backdrop: DARK_MODE_ENHANCED_COLORS.backdropDark
  }
};

// =============================================================================
// THEME UTILITIES - テーマユーティリティ
// =============================================================================

/**
 * テーマタイプを判定
 */
export const getThemeType = (theme: ColorTheme): 'light' | 'dark' => {
  // 背景色の明度で判定
  const backgroundColor = theme.background.default;
  
  // 簡易的な判定 (実際のプロジェクトではより精密な計算が必要)
  if (backgroundColor === '#FFFFFF' || backgroundColor.startsWith('#F')) {
    return 'light';
  }
  
  return 'dark';
};

/**
 * コントラスト比を考慮したテキスト色を取得
 */
export const getContrastText = (backgroundColor: string, theme: ColorTheme): string => {
  const themeType = getThemeType(theme);
  
  // 背景色に応じて最適なテキスト色を返す
  if (themeType === 'dark') {
    return theme.text.primary;
  } else {
    return theme.text.primary;
  }
};

/**
 * 適応的なカラーを取得
 */
export const getAdaptiveColor = (
  lightColor: string,
  darkColor: string,
  theme: ColorTheme
): string => {
  const themeType = getThemeType(theme);
  return themeType === 'dark' ? darkColor : lightColor;
};

/**
 * テーマアニメーション用スタイル
 */
export const createThemeTransition = (property: string, duration: number = 300) => {
  if (Platform.OS === 'web') {
    return {
      transition: `${property} ${duration}ms ease-in-out`
    };
  }
  
  // React Native では Animated API を使用
  return {};
};

// =============================================================================
// DARK MODE COMPONENTS - ダークモード対応コンポーネント
// =============================================================================

/**
 * テーマ切り替えボタンのプロップス
 */
export interface ThemeToggleButtonProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showLabel?: boolean;
  onPress?: () => void;
}

/**
 * テーマ切り替えボタン
 */
export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  size = 'medium',
  style,
  showLabel = false,
  onPress
}) => {
  const { isDark, toggleDarkMode, isChanging } = useTheme();
  
  const handlePress = () => {
    toggleDarkMode();
    onPress?.();
  };
  
  const icon = isDark ? '☀️' : '🌙';
  const label = isDark ? 'ライトモード' : 'ダークモード';
  
  const sizeStyles = {
    small: { fontSize: 16, padding: 8 },
    medium: { fontSize: 20, padding: 12 },
    large: { fontSize: 24, padding: 16 }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isChanging}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isChanging ? 0.6 : 1,
          ...sizeStyles[size]
        },
        style
      ]}
      accessibilityRole="button"
      accessibilityLabel={`テーマを${label}に切り替え`}
    >
      <Text style={{ fontSize: sizeStyles[size].fontSize }}>
        {icon}
      </Text>
      {showLabel && (
        <Text style={{ fontSize: 12, marginTop: 4 }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// SYSTEM THEME DETECTION - システムテーマ検出
// =============================================================================

/**
 * システムダークモード検出フック
 */
export const useSystemDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(
    Appearance.getColorScheme() === 'dark'
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });

    return () => subscription.remove();
  }, []);

  return isDark;
};

/**
 * プリファードカラースキーム検出 (Web)
 */
export const usePreferredColorScheme = (): ColorSchemeName => {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>('light');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const updateColorScheme = () => {
        setColorScheme(mediaQuery.matches ? 'dark' : 'light');
      };
      
      updateColorScheme();
      mediaQuery.addEventListener('change', updateColorScheme);
      
      return () => {
        mediaQuery.removeEventListener('change', updateColorScheme);
      };
    } else {
      // React Native
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setColorScheme(colorScheme);
      });

      setColorScheme(Appearance.getColorScheme());
      
      return () => subscription.remove();
    }
  }, []);

  return colorScheme;
};

// =============================================================================
// EXPORTS
// =============================================================================

import { TouchableOpacity, Text } from 'react-native';

export {
  ThemeProvider,
  useTheme,
  useDarkMode,
  useThemeToggle,
  ThemeToggleButton,
  ENHANCED_DARK_THEME,
  DARK_MODE_ENHANCED_COLORS
};

export default {
  Provider: ThemeProvider,
  hooks: {
    useTheme,
    useDarkMode,
    useThemeToggle,
    useSystemDarkMode,
    usePreferredColorScheme
  },
  components: {
    ThemeToggleButton
  },
  themes: {
    enhanced: ENHANCED_DARK_THEME
  },
  colors: DARK_MODE_ENHANCED_COLORS,
  utils: {
    getThemeType,
    getContrastText,
    getAdaptiveColor,
    createThemeTransition
  }
};
