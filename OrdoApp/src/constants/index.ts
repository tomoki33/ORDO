/**
 * Ordo App - Application Constants
 * Centralized constants for the entire application
 */

// App Configuration
export const APP_CONFIG = {
  NAME: 'Ordo',
  VERSION: '0.1.0',
  DESCRIPTION: 'AI-powered Home Management',
  
  // Development flags
  IS_DEV: __DEV__,
  ENABLE_LOGGING: __DEV__,
  ENABLE_AI_MOCK: true, // Mock AI responses during development
} as const;

// AI Recognition Settings
export const AI_CONFIG = {
  MIN_CONFIDENCE: 0.7, // Minimum confidence for AI recognition
  MAX_RETRIES: 3, // Max retries for failed AI requests
  TIMEOUT: 10000, // AI request timeout (10 seconds)
  ENABLE_AI_MOCK: true, // Mock AI responses during development
  
  // Supported product categories
  SUPPORTED_CATEGORIES: [
    'fruits',
    'vegetables',
    'dairy',
    'meat',
    'packaged',
    'beverages',
  ] as const,
} as const;

// Camera Settings
export const CAMERA_CONFIG = {
  QUALITY: 0.8, // Image quality (0-1)
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  FORMAT: 'jpeg',
  
  // Recognition guide overlay
  GUIDE_OVERLAY: {
    WIDTH_RATIO: 0.8,
    HEIGHT_RATIO: 0.6,
    BORDER_COLOR: '#4A90E2',
    BORDER_WIDTH: 2,
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  PRODUCTS: 'ordo_products',
  USER_PREFERENCES: 'ordo_user_preferences',
  APP_STATE: 'ordo_app_state',
  ONBOARDING_COMPLETED: 'ordo_onboarding_completed',
} as const;

// Colors (Theme)
export const COLORS = {
  // Primary colors
  PRIMARY: '#4A90E2',
  PRIMARY_DARK: '#357ABD',
  PRIMARY_LIGHT: '#7BB3F0',
  
  // Secondary colors
  SECONDARY: '#50C878',
  SECONDARY_DARK: '#3DA360',
  SECONDARY_LIGHT: '#7FD99A',
  
  // Semantic colors
  SUCCESS: '#28A745',
  WARNING: '#FFC107',
  ERROR: '#DC3545',
  INFO: '#17A2B8',
  
  // Neutrals
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GRAY_DARK: '#333333',
  GRAY_MEDIUM: '#666666',
  GRAY_LIGHT: '#999999',
  GRAY_LIGHTER: '#CCCCCC',
  GRAY_LIGHTEST: '#F8F9FA',
  
  // Background
  BACKGROUND_PRIMARY: '#FFFFFF',
  BACKGROUND_SECONDARY: '#F8F9FA',
  
  // Text
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
  TEXT_DISABLED: '#999999',
  
  // Borders
  BORDER_LIGHT: '#E5E5E7',
  BORDER_MEDIUM: '#D1D1D6',
  
  // Freshness indicators
  FRESH: '#28A745',
  MODERATE: '#FFC107',
  EXPIRED: '#DC3545',
} as const;

// Typography
export const TYPOGRAPHY = {
  // Font sizes
  FONT_SIZE_SMALL: 12,
  FONT_SIZE_MEDIUM: 14,
  FONT_SIZE_LARGE: 16,
  FONT_SIZE_XLARGE: 18,
  FONT_SIZE_XXLARGE: 22,
  FONT_SIZE_TITLE: 28,
  FONT_SIZE_HERO: 36,
  
  // Font weights
  FONT_WEIGHT_NORMAL: '400',
  FONT_WEIGHT_MEDIUM: '500',
  FONT_WEIGHT_SEMIBOLD: '600',
  FONT_WEIGHT_BOLD: '700',
  
  // Line heights
  LINE_HEIGHT_TIGHT: 1.2,
  LINE_HEIGHT_NORMAL: 1.5,
  LINE_HEIGHT_RELAXED: 1.8,
} as const;

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

// Animation durations
export const ANIMATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Product expiration warning thresholds
export const EXPIRATION_WARNINGS = {
  URGENT: 1, // 1 day
  WARNING: 3, // 3 days
  NOTICE: 7, // 1 week
} as const;

// Default user preferences
export const DEFAULT_PREFERENCES = {
  notifications: true,
  expirationWarningDays: EXPIRATION_WARNINGS.WARNING,
  defaultLocation: 'pantry',
  theme: 'auto' as const,
} as const;
