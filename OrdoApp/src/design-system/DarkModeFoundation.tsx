/**
 * Ordo Dark Mode System (4時間実装 - 基本版)
 * 
 * ダークモード対応の基本実装
 * システム設定連動・手動切り替え・テーマ保存
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, Platform, TouchableOpacity, Text } from 'react-native';
import { LIGHT_THEME, DARK_THEME, ColorTheme } from './Colors';

// =============================================================================
// STORAGE UTILITIES - ストレージユーティリティ
// =============================================================================

const THEME_STORAGE_KEY = '@ordo_theme_mode';

/**
 * テーマモードを保存 (簡易版)
 */
const saveThemeMode = (mode: string): void => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    // React Native版では AsyncStorage を使用
  } catch (error) {
    console.warn('Failed to save theme mode:', error);
  }
};

/**
 * 保存されたテーマモードを取得 (簡易版)
 */
const loadThemeMode = (): string => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
    }
    // React Native版では AsyncStorage を使用
    return 'auto';
  } catch (error) {
    console.warn('Failed to load theme mode:', error);
    return 'auto';
  }
};

// =============================================================================
// THEME TYPES - テーマ型定義
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeContextType {
  theme: ColorTheme;
  isDark: boolean;
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  systemTheme: ColorSchemeName;
}

// =============================================================================
// THEME CONTEXT - テーマコンテキスト
// =============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// THEME PROVIDER - テーマプロバイダー
// =============================================================================

export interface OrdoThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}

export const OrdoThemeProvider: React.FC<OrdoThemeProviderProps> = ({
  children,
  initialTheme = 'auto'
}) => {
  // システムテーマ
  const [systemTheme, setSystemTheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || 'light'
  );
  
  // 現在のテーマモード
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = loadThemeMode();
    return (saved === 'light' || saved === 'dark' || saved === 'auto') ? saved : initialTheme;
  });

  // 実際のダークモード状態を計算
  const isDark = mode === 'dark' || (mode === 'auto' && systemTheme === 'dark');
  
  // 現在のテーマ
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // =============================================================================
  // SYSTEM THEME LISTENER - システムテーマリスナー
  // =============================================================================

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');
    });

    return () => subscription.remove();
  }, []);

  // =============================================================================
  // THEME ACTIONS - テーマアクション
  // =============================================================================

  /**
   * テーマモードを設定
   */
  const setTheme = useCallback((newMode: ThemeMode) => {
    if (newMode === mode) return;

    setMode(newMode);
    saveThemeMode(newMode);
  }, [mode]);

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
    systemTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// =============================================================================
// THEME HOOKS - テーマフック
// =============================================================================

/**
 * テーマコンテキストを使用するフック
 */
export const useOrdoTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useOrdoTheme must be used within a OrdoThemeProvider');
  }
  
  return context;
};

/**
 * ダークモード状態のみを取得するフック
 */
export const useOrdoDarkMode = (): boolean => {
  const { isDark } = useOrdoTheme();
  return isDark;
};

/**
 * テーマ切り替え関数のみを取得するフック
 */
export const useOrdoThemeToggle = (): (() => void) => {
  const { toggleDarkMode } = useOrdoTheme();
  return toggleDarkMode;
};

// =============================================================================
// ENHANCED DARK COLORS - 強化ダークカラー
// =============================================================================

/**
 * ダークモード用追加カラーパレット
 */
export const ENHANCED_DARK_COLORS = {
  // より深い背景色
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
  
  // アクセント色
  accentPrimary: '#64FFDA',
  accentSecondary: '#448AFF',
  
  // ボーダー色
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
// THEME UTILITIES - テーマユーティリティ
// =============================================================================

/**
 * テーマタイプを判定
 */
export const getThemeType = (theme: ColorTheme): 'light' | 'dark' => {
  const backgroundColor = theme.background.default;
  return backgroundColor === '#FFFFFF' || backgroundColor.startsWith('#F') ? 'light' : 'dark';
};

/**
 * 適応的なカラーを取得
 */
export const getAdaptiveColor = (
  lightColor: string,
  darkColor: string,
  isDark: boolean
): string => {
  return isDark ? darkColor : lightColor;
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
  return {};
};

// =============================================================================
// THEME TOGGLE BUTTON - テーマ切り替えボタン
// =============================================================================

export interface OrdoThemeToggleButtonProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showLabel?: boolean;
  onPress?: () => void;
}

export const OrdoThemeToggleButton: React.FC<OrdoThemeToggleButtonProps> = ({
  size = 'medium',
  style,
  showLabel = false,
  onPress
}) => {
  const { isDark, toggleDarkMode } = useOrdoTheme();
  
  const handlePress = () => {
    toggleDarkMode();
    onPress?.();
  };
  
  const icon = isDark ? '☀️' : '🌙';
  const label = isDark ? 'ライト' : 'ダーク';
  
  const sizeStyles = {
    small: { fontSize: 16, padding: 8 },
    medium: { fontSize: 20, padding: 12 },
    large: { fontSize: 24, padding: 16 }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: isDark ? ENHANCED_DARK_COLORS.surfaceElevated1 : '#F5F5F5',
          ...sizeStyles[size]
        },
        style
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}モードに切り替え`}
    >
      <Text style={{ fontSize: sizeStyles[size].fontSize }}>
        {icon}
      </Text>
      {showLabel && (
        <Text style={{ 
          fontSize: 12, 
          marginTop: 4,
          color: isDark ? ENHANCED_DARK_COLORS.textMediumContrast : '#666666'
        }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// SYSTEM THEME HOOKS - システムテーマフック
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
 * プリファードカラースキーム検出
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
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setColorScheme(colorScheme || 'light');
      });

      setColorScheme(Appearance.getColorScheme() || 'light');
      
      return () => subscription.remove();
    }
  }, []);

  return colorScheme;
};

// =============================================================================
// DARK MODE STYLES - ダークモードスタイル
// =============================================================================

/**
 * ダークモード対応スタイルヘルパー
 */
export const createDarkModeStyles = (lightStyles: any, darkStyles: any) => {
  return (isDark: boolean) => isDark ? darkStyles : lightStyles;
};

/**
 * 条件付きスタイル
 */
export const conditionalStyle = (condition: boolean, trueStyle: any, falseStyle: any = {}) => {
  return condition ? trueStyle : falseStyle;
};

// =============================================================================
// THEME-AWARE COMPONENTS - テーマ対応コンポーネント
// =============================================================================

/**
 * テーマ対応テキストコンポーネント
 */
export interface ThemeAwareTextProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export const ThemeAwareText: React.FC<ThemeAwareTextProps> = ({
  children,
  style,
  variant = 'primary'
}) => {
  const { theme } = useOrdoTheme();
  
  const textColor = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary
  }[variant];
  
  return (
    <Text style={[{ color: textColor }, style]}>
      {children}
    </Text>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  OrdoThemeProvider as ThemeProvider,
  useOrdoTheme as useTheme,
  useOrdoDarkMode as useDarkMode,
  useOrdoThemeToggle as useThemeToggle,
  OrdoThemeToggleButton as ThemeToggleButton,
  ThemeAwareText,
  ENHANCED_DARK_COLORS
};

export default {
  Provider: OrdoThemeProvider,
  hooks: {
    useTheme: useOrdoTheme,
    useDarkMode: useOrdoDarkMode,
    useThemeToggle: useOrdoThemeToggle,
    useSystemDarkMode,
    usePreferredColorScheme
  },
  components: {
    ThemeToggleButton: OrdoThemeToggleButton,
    ThemeAwareText
  },
  colors: ENHANCED_DARK_COLORS,
  utils: {
    getThemeType,
    getAdaptiveColor,
    createThemeTransition,
    createDarkModeStyles,
    conditionalStyle
  }
};
