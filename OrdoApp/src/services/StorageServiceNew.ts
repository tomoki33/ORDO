/**
 * Ordo App - Storage Service (SQLite + AsyncStorage Hybrid)
 * Products: SQLite Database, Settings: AsyncStorage fallback
 */

import { Product, UserPreferences, AppState } from '../types';
import { DebugUtils } from '../utils';
import { sqliteService } from './sqliteService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

/**
 * Storage Service for persisting application data
 * Products: SQLite database, Settings: AsyncStorage
 */
export class StorageService {
  /**
   * Initialize storage services
   */
  static async initialize(): Promise<void> {
    try {
      await sqliteService.initialize();
      DebugUtils.log('Storage services initialized successfully');
    } catch (error) {
      DebugUtils.error('Failed to initialize storage services', error as Error);
      throw error;
    }
  }

  /**
   * Load products from SQLite database
   */
  static async loadProducts(): Promise<Product[]> {
    try {
      const products = await sqliteService.getAllProducts();
      DebugUtils.log('Products loaded from SQLite', products.length);
      return products;
    } catch (error) {
      DebugUtils.error('Failed to load products', error as Error);
      return [];
    }
  }

  /**
   * Add a single product to database
   */
  static async saveProduct(product: Product): Promise<void> {
    try {
      await sqliteService.insertProduct(product);
      DebugUtils.log('Product saved to SQLite', product.id);
    } catch (error) {
      DebugUtils.error('Failed to save product', error as Error);
      throw error;
    }
  }

  /**
   * Update a product in database
   */
  static async updateProduct(product: Product): Promise<void> {
    try {
      await sqliteService.updateProduct(product);
      DebugUtils.log('Product updated in SQLite', product.id);
    } catch (error) {
      DebugUtils.error('Failed to update product', error as Error);
      throw error;
    }
  }

  /**
   * Delete a product from database
   */
  static async deleteProduct(productId: string): Promise<void> {
    try {
      await sqliteService.deleteProduct(productId);
      DebugUtils.log('Product deleted from SQLite', productId);
    } catch (error) {
      DebugUtils.error('Failed to delete product', error as Error);
      throw error;
    }
  }

  /**
   * Search products with filters
   */
  static async searchProducts(filters: {
    category?: string;
    location?: string;
    expiringInDays?: number;
    searchTerm?: string;
  }): Promise<Product[]> {
    try {
      const products = await sqliteService.searchProducts(filters);
      DebugUtils.log('Products search completed', products.length);
      return products;
    } catch (error) {
      DebugUtils.error('Failed to search products', error as Error);
      return [];
    }
  }

  /**
   * Save user preferences to storage
   */
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      // SQLiteにも保存
      await sqliteService.saveUserSettings(preferences);
      
      // AsyncStorageにもバックアップ保存
      const serialized = JSON.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, serialized);
      
      DebugUtils.log('Preferences saved successfully');
    } catch (error) {
      DebugUtils.error('Failed to save preferences', error as Error);
      throw error;
    }
  }

  /**
   * Load user preferences from storage
   */
  static async loadPreferences(): Promise<UserPreferences | null> {
    try {
      // まずSQLiteから読み込み
      let preferences = await sqliteService.loadUserSettings();
      
      // SQLiteにない場合はAsyncStorageから読み込み
      if (!preferences) {
        const serialized = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        if (serialized) {
          preferences = JSON.parse(serialized);
          // SQLiteにも保存
          if (preferences) {
            await sqliteService.saveUserSettings(preferences);
          }
        }
      }
      
      DebugUtils.log('Preferences loaded successfully', !!preferences);
      return preferences;
    } catch (error) {
      DebugUtils.error('Failed to load preferences', error as Error);
      return null;
    }
  }

  /**
   * Save app state to AsyncStorage (軽量データのみ)
   */
  static async saveAppState(appState: Partial<AppState>): Promise<void> {
    try {
      const serialized = JSON.stringify(appState);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, serialized);
      DebugUtils.log('App state saved to AsyncStorage');
    } catch (error) {
      DebugUtils.error('Failed to save app state', error as Error);
      throw error;
    }
  }

  /**
   * Load app state from AsyncStorage
   */
  static async loadAppState(): Promise<Partial<AppState> | null> {
    try {
      const serialized = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      const appState = serialized ? JSON.parse(serialized) : null;
      
      DebugUtils.log('App state loaded from AsyncStorage', !!appState);
      return appState;
    } catch (error) {
      DebugUtils.error('Failed to load app state', error as Error);
      return null;
    }
  }

  /**
   * Check if onboarding has been completed
   */
  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return value === 'true';
    } catch (error) {
      DebugUtils.error('Failed to check onboarding status', error as Error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      DebugUtils.log('Onboarding marked as completed');
    } catch (error) {
      DebugUtils.error('Failed to set onboarding completed', error as Error);
      throw error;
    }
  }

  /**
   * Clear all app data (for development/testing)
   */
  static async clearAllData(): Promise<void> {
    try {
      // AsyncStorageをクリア
      await AsyncStorage.clear();
      
      // SQLiteデータベースを再初期化
      await sqliteService.close();
      await sqliteService.initialize();
      
      DebugUtils.log('All storage data cleared');
    } catch (error) {
      DebugUtils.error('Failed to clear storage data', error as Error);
      throw error;
    }
  }

  /**
   * Database cleanup (old expired products, etc.)
   */
  static async cleanup(): Promise<void> {
    try {
      await sqliteService.cleanup();
      DebugUtils.log('Storage cleanup completed');
    } catch (error) {
      DebugUtils.error('Failed to cleanup storage', error as Error);
      throw error;
    }
  }
}

/**
 * Product-specific storage operations (SQLite-based)
 */
export class ProductStorage {
  /**
   * Add a new product
   */
  static async addProduct(product: Product): Promise<void> {
    try {
      await StorageService.saveProduct(product);
      DebugUtils.log('Product added', product.id);
    } catch (error) {
      DebugUtils.error('Failed to add product', error as Error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  static async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
      // 既存の商品を取得
      const products = await StorageService.loadProducts();
      const existingProduct = products.find(p => p.id === productId);
      
      if (!existingProduct) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      // 更新されたプロダクトオブジェクトを作成
      const updatedProduct: Product = { ...existingProduct, ...updates };
      
      await StorageService.updateProduct(updatedProduct);
      DebugUtils.log('Product updated', productId);
    } catch (error) {
      DebugUtils.error('Failed to update product', error as Error);
      throw error;
    }
  }

  /**
   * Remove a product
   */
  static async removeProduct(productId: string): Promise<void> {
    try {
      await StorageService.deleteProduct(productId);
      DebugUtils.log('Product removed', productId);
    } catch (error) {
      DebugUtils.error('Failed to remove product', error as Error);
      throw error;
    }
  }

  /**
   * Get a specific product by ID
   */
  static async getProduct(productId: string): Promise<Product | null> {
    try {
      const products = await StorageService.loadProducts();
      const product = products.find(p => p.id === productId);
      
      DebugUtils.log('Product retrieved', productId, !!product);
      return product || null;
    } catch (error) {
      DebugUtils.error('Failed to get product', error as Error);
      return null;
    }
  }

  /**
   * Search products with advanced filters
   */
  static async searchProducts(filters: {
    category?: string;
    location?: string;
    expiringInDays?: number;
    searchTerm?: string;
  }): Promise<Product[]> {
    try {
      return await StorageService.searchProducts(filters);
    } catch (error) {
      DebugUtils.error('Failed to search products', error as Error);
      return [];
    }
  }
}
