import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { BRANDING } from '../config/branding';

// カスタムフォント設定は一旦使用せず、デフォルトフォントを使用
// const fontConfig = {
//   default: {
//     regular: {
//       fontFamily: 'System',
//       fontWeight: '400' as const,
//     },
//     medium: {
//       fontFamily: 'System',
//       fontWeight: '500' as const,
//     },
//     light: {
//       fontFamily: 'System',
//       fontWeight: '300' as const,
//     },
//     thin: {
//       fontFamily: 'System',
//       fontWeight: '100' as const,
//     },
//   },
// };

/**
 * Ordo App Material Design 3 Light Theme
 * アプリ専用のライトテーマ設定
 */
export const OrdoLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary colors - Ordoブランドカラー
    primary: BRANDING.BRAND_COLORS.PRIMARY,
    primaryContainer: BRANDING.BRAND_COLORS.PRIMARY + '20',
    onPrimary: BRANDING.BRAND_COLORS.WHITE,
    onPrimaryContainer: BRANDING.BRAND_COLORS.PRIMARY,
    
    // Secondary colors
    secondary: BRANDING.BRAND_COLORS.SECONDARY,
    secondaryContainer: BRANDING.BRAND_COLORS.SECONDARY + '20',
    onSecondary: BRANDING.BRAND_COLORS.WHITE,
    onSecondaryContainer: BRANDING.BRAND_COLORS.SECONDARY,
    
    // Tertiary colors - アクセントカラー
    tertiary: BRANDING.BRAND_COLORS.ACCENT,
    tertiaryContainer: BRANDING.BRAND_COLORS.ACCENT + '20',
    onTertiary: BRANDING.BRAND_COLORS.WHITE,
    onTertiaryContainer: BRANDING.BRAND_COLORS.ACCENT,
    
    // Error colors
    error: BRANDING.BRAND_COLORS.ERROR,
    errorContainer: BRANDING.BRAND_COLORS.ERROR + '20',
    onError: BRANDING.BRAND_COLORS.WHITE,
    onErrorContainer: BRANDING.BRAND_COLORS.ERROR,
    
    // Warning colors (カスタム追加)
    warning: BRANDING.BRAND_COLORS.WARNING,
    
    // Surface colors
    surface: BRANDING.BRAND_COLORS.WHITE,
    surfaceVariant: BRANDING.BRAND_COLORS.GRAY_LIGHT,
    onSurface: BRANDING.BRAND_COLORS.GRAY_DARK,
    onSurfaceVariant: BRANDING.BRAND_COLORS.GRAY_MEDIUM,
    
    // Background
    background: BRANDING.BRAND_COLORS.GRAY_LIGHT,
    onBackground: BRANDING.BRAND_COLORS.GRAY_DARK,
    
    // Outline
    outline: BRANDING.BRAND_COLORS.GRAY_MEDIUM,
    outlineVariant: BRANDING.BRAND_COLORS.GRAY_LIGHT,
  },
};

/**
 * Ordo App Material Design 3 Dark Theme
 * アプリ専用のダークテーマ設定
 */
export const OrdoDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    // Primary colors
    primary: BRANDING.BRAND_COLORS.PRIMARY,
    primaryContainer: BRANDING.BRAND_COLORS.PRIMARY + '40',
    onPrimary: BRANDING.BRAND_COLORS.BLACK,
    onPrimaryContainer: BRANDING.BRAND_COLORS.WHITE,
    
    // Secondary colors
    secondary: BRANDING.BRAND_COLORS.SECONDARY,
    secondaryContainer: BRANDING.BRAND_COLORS.SECONDARY + '40',
    onSecondary: BRANDING.BRAND_COLORS.BLACK,
    onSecondaryContainer: BRANDING.BRAND_COLORS.WHITE,
    
    // Tertiary colors
    tertiary: BRANDING.BRAND_COLORS.ACCENT,
    tertiaryContainer: BRANDING.BRAND_COLORS.ACCENT + '40',
    onTertiary: BRANDING.BRAND_COLORS.BLACK,
    onTertiaryContainer: BRANDING.BRAND_COLORS.WHITE,
    
    // Error colors
    error: BRANDING.BRAND_COLORS.ERROR,
    errorContainer: BRANDING.BRAND_COLORS.ERROR + '40',
    onError: BRANDING.BRAND_COLORS.BLACK,
    onErrorContainer: BRANDING.BRAND_COLORS.WHITE,
    
    // Warning colors
    warning: BRANDING.BRAND_COLORS.WARNING,
    
    // Surface colors (ダークモード対応)
    surface: '#1C1B1F',
    surfaceVariant: '#49454F',
    onSurface: BRANDING.BRAND_COLORS.WHITE,
    onSurfaceVariant: '#CAC4D0',
    
    // Background
    background: '#141218',
    onBackground: BRANDING.BRAND_COLORS.WHITE,
    
    // Outline
    outline: '#938F99',
    outlineVariant: '#49454F',
  },
};

// テーマタイプの拡張
declare global {
  namespace ReactNativePaper {
    interface Theme {
      colors: typeof OrdoLightTheme.colors;
    }
  }
}

export default {
  light: OrdoLightTheme,
  dark: OrdoDarkTheme,
};
