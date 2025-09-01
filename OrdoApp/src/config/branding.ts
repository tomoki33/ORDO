/**
 * Branding Configuration for Ordo App
 * アプリアイコン、スプラッシュ画面、ブランディング設定
 */

export const BRANDING = {
  // アプリ基本情報
  APP_NAME: 'Ordo',
  APP_TAGLINE: 'AI Home Management',
  APP_VERSION: '0.1.0',
  
  // ブランドカラー
  BRAND_COLORS: {
    PRIMARY: '#6366F1',      // インディゴブルー - メイン
    SECONDARY: '#8B5CF6',    // パープル - アクセント
    ACCENT: '#10B981',       // エメラルドグリーン - 成功/新鮮
    WARNING: '#F59E0B',      // アンバー - 警告/期限間近
    ERROR: '#EF4444',        // レッド - エラー/期限切れ
    
    // グラデーション
    GRADIENT_START: '#6366F1',
    GRADIENT_END: '#8B5CF6',
    
    // ニュートラル
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    GRAY_LIGHT: '#F3F4F6',
    GRAY_MEDIUM: '#9CA3AF',
    GRAY_DARK: '#374151',
  },
  
  // アイコンサイズ定義（Android & iOS）
  ICON_SIZES: {
    ANDROID: {
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192,
    },
    IOS: {
      '20x20': 20,
      '29x29': 29,
      '40x40': 40,
      '58x58': 58,
      '60x60': 60,
      '80x80': 80,
      '87x87': 87,
      '120x120': 120,
      '180x180': 180,
    },
  },
  
  // スプラッシュ画面設定
  SPLASH_SCREEN: {
    BACKGROUND_COLOR: '#6366F1',
    LOGO_SIZE: 120,
    FADE_DURATION: 2000,
    AUTO_HIDE_DELAY: 3000,
  },
};

export default BRANDING;
