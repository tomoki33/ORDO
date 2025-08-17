/**
 * Ordo App - Storage Service
 * Handles persistent data storage using AsyncStorage
 */

// Note: AsyncStorage will need to be installed: @react-native-async-storage/async-storage

import { STORAGE_KEYS } from '../constants';
import { Product, UserPreferences, AppState } from '../types';
import { StorageUtils, DebugUtils } from '../utils';

// Mock AsyncStorage interface for now (will be replaced with real implementation)
interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// This will be replaced with actual AsyncStorage import
const AsyncStorage: AsyncStorageInterface = {
  async getItem(key: string): Promise<string | null> {
    // Mock implementation - returns null for now
    DebugUtils.log('AsyncStorage getItem (mock)', key);
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    // Mock implementation
    DebugUtils.log('AsyncStorage setItem (mock)', key, value.length);
  },
  async removeItem(key: string): Promise<void> {
    // Mock implementation
    DebugUtils.log('AsyncStorage removeItem (mock)', key);
  },
  async clear(): Promise<void> {
    // Mock implementation
    DebugUtils.log('AsyncStorage clear (mock)');
  },
};

/**
 * Storage Service for persisting application data
 */
export class StorageService {
  /**
   * Save products to storage
   */
  static async saveProducts(products: Product[]): Promise<void> {
    try {
      const serialized = StorageUtils.stringify(products);
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, serialized);
      DebugUtils.log('Products saved to storage', products.length);
    } catch (error) {
      DebugUtils.error('Failed to save products', error as Error);
      throw error;
    }
  }

  /**
   * Load products from storage
   */
  static async loadProducts(): Promise<Product[]> {
    try {
      const serialized = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const products = StorageUtils.parseJSON<Product[]>(serialized, []);
      
      // Convert date strings back to Date objects
      const processedProducts = products.map(product => ({
        ...product,
        expirationDate: product.expirationDate ? new Date(product.expirationDate) : new Date(),
        addedDate: new Date(product.addedDate),
      }));
      
      DebugUtils.log('Products loaded from storage', processedProducts.length);
      return processedProducts;
    } catch (error) {
      DebugUtils.error('Failed to load products', error as Error);
      return [];
    }
  }

  /**
   * Save user preferences to storage
   */
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      const serialized = StorageUtils.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, serialized);
      DebugUtils.log('Preferences saved to storage');
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
      const serialized = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const preferences = StorageUtils.parseJSON<UserPreferences | null>(serialized, null);
      
      DebugUtils.log('Preferences loaded from storage', !!preferences);
      return preferences;
    } catch (error) {
      DebugUtils.error('Failed to load preferences', error as Error);
      return null;
    }
  }

  /**
   * Save app state to storage
   */
  static async saveAppState(appState: Partial<AppState>): Promise<void> {
    try {
      const serialized = StorageUtils.stringify(appState);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, serialized);
      DebugUtils.log('App state saved to storage');
    } catch (error) {
      DebugUtils.error('Failed to save app state', error as Error);
      throw error;
    }
  }

  /**
   * Load app state from storage
   */
  static async loadAppState(): Promise<Partial<AppState> | null> {
    try {
      const serialized = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      const appState = StorageUtils.parseJSON<Partial<AppState> | null>(serialized, null);
      
      DebugUtils.log('App state loaded from storage', !!appState);
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
      await AsyncStorage.clear();
      DebugUtils.log('All storage data cleared');
    } catch (error) {
      DebugUtils.error('Failed to clear storage data', error as Error);
      throw error;
    }
  }

  /**
   * Remove specific key from storage
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      DebugUtils.log('Storage item removed', key);
    } catch (error) {
      DebugUtils.error('Failed to remove storage item', error as Error);
      throw error;
    }
  }

  /**
   * Generic save method for any data
   */
  static async save<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = StorageUtils.stringify(data);
      await AsyncStorage.setItem(key, serialized);
      DebugUtils.log('Data saved to storage', key);
    } catch (error) {
      DebugUtils.error('Failed to save data', error as Error);
      throw error;
    }
  }

  /**
   * Generic load method for any data
   */
  static async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const serialized = await AsyncStorage.getItem(key);
      const data = StorageUtils.parseJSON<T>(serialized, defaultValue);
      DebugUtils.log('Data loaded from storage', key);
      return data;
    } catch (error) {
      DebugUtils.error('Failed to load data', error as Error);
      return defaultValue;
    }
  }
}

/**
 * Product-specific storage operations
 */
export class ProductStorage {
  /**
   * Add a new product
   */
  static async addProduct(product: Product): Promise<void> {
    try {
      const products = await StorageService.loadProducts();
      products.push(product);
      await StorageService.saveProducts(products);
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
      const products = await StorageService.loadProducts();
      const index = products.findIndex(p => p.id === productId);
      
      if (index === -1) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      products[index] = { ...products[index], ...updates };
      await StorageService.saveProducts(products);
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
      const products = await StorageService.loadProducts();
      const filteredProducts = products.filter(p => p.id !== productId);
      
      if (filteredProducts.length === products.length) {
        throw new Error(`Product not found: ${productId}`);
      }
      
      await StorageService.saveProducts(filteredProducts);
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
}
