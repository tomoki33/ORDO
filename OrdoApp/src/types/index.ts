/**
 * Ordo App - Type Definitions
 * Central type definitions for the entire application
 */

// Product-related types
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  expirationDate: Date; // Required for freshness calculations
  addedDate: Date;
  location: ProductLocation;
  quantity?: number;
  unit?: string;
  brand?: string;
  barcode?: string;
  imageUri?: string;
  notes?: string;
  // AI recognition metadata
  confidence?: number; // 0-1, confidence level from AI recognition
  aiRecognized?: boolean;
}

export type ProductCategory = 
  | 'fruits'
  | 'vegetables'
  | 'dairy'
  | 'meat'
  | 'packaged'
  | 'beverages'
  | 'other';

export type ProductLocation = 
  | 'fridge'
  | 'pantry'
  | 'freezer'
  | 'counter'
  | 'other';

// Freshness levels based on expiration date
export type FreshnessLevel = 'fresh' | 'moderate' | 'warning' | 'urgent' | 'expired';

// AI Recognition types
export interface RecognitionResult {
  productName: string;
  category: ProductCategory;
  confidence: number; // 0-1
  freshnessScore?: number;
  suggestedExpirationDays?: number;
  alternativeNames?: string[];
}

export interface CameraCapture {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  ProductList: undefined;
  Camera: undefined;
  ProductDetail: { productId: string };
  Settings: undefined;
  AIRecognition: { imageUri: string };
};

// App State types
export interface AppState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  user?: User;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: boolean;
  expirationWarningDays: number;
  defaultLocation: string;
  theme: 'light' | 'dark' | 'auto';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Storage types
export interface StorageInterface {
  save: <T>(key: string, value: T) => Promise<void>;
  load: <T>(key: string) => Promise<T | null>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}
