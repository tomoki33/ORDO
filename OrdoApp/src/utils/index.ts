/**
 * Ordo App - Utility Functions
 * Common utility functions used throughout the application
 */

import { Product, FreshnessLevel } from '../types';

// Export specific utilities from separate files
export { DebugUtils } from './DebugUtils';
export { TestRunner } from './TestRunner';
export { AcceptanceCriteriaValidator } from './AcceptanceCriteriaValidator';
export { IntegrationTestSuite } from './IntegrationTestSuite';
export { TensorFlowDemo } from './TensorFlowDemo';
export { phase10ExtensionDemo } from './Phase10ExtensionDemo';
export { phase11NewFeaturesDemo } from './Phase11NewFeaturesDemo';

/**
 * Date utilities
 */
export const DateUtils = {
  /**
   * Format date to readable string
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  },

  /**
   * Format date to relative string (e.g., "2日後", "今日", "1日前")
   */
  formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays === -1) return '昨日';
    if (diffDays > 0) return `${diffDays}日後`;
    return `${Math.abs(diffDays)}日前`;
  },

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(expirationDate: Date): number {
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  /**
   * Add days to date
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
};

/**
 * Product utilities
 */
export const ProductUtils = {
  /**
   * Calculate freshness level based on expiration date
   */
  getFreshnessLevel(product: Product): FreshnessLevel {
    if (!product.expirationDate) return 'moderate'; // Default for products without expiration
    
    const daysUntilExpiration = DateUtils.getDaysUntilExpiration(product.expirationDate);
    
    if (daysUntilExpiration < 0) return 'expired';
    if (daysUntilExpiration <= 1) return 'urgent';
    if (daysUntilExpiration <= 3) return 'warning';
    if (daysUntilExpiration <= 7) return 'moderate';
    return 'fresh';
  },

  /**
   * Get freshness color
   */
  getFreshnessColor(level: FreshnessLevel): string {
    const colors = {
      fresh: '#28A745',
      moderate: '#17A2B8',
      warning: '#FFC107',
      urgent: '#FD7E14',
      expired: '#DC3545',
    };
    return colors[level];
  },

  /**
   * Sort products by expiration date
   */
  sortByExpiration(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      // Products without expiration date go to the end
      if (!a.expirationDate && !b.expirationDate) return 0;
      if (!a.expirationDate) return 1;
      if (!b.expirationDate) return -1;
      
      return a.expirationDate.getTime() - b.expirationDate.getTime();
    });
  },

  /**
   * Filter products by freshness level
   */
  filterByFreshness(products: Product[], level: FreshnessLevel): Product[] {
    return products.filter(product => 
      ProductUtils.getFreshnessLevel(product) === level
    );
  },

  /**
   * Get products expiring soon
   */
  getExpiringProducts(products: Product[], days: number = 3): Product[] {
    return products.filter(product => {
      if (!product.expirationDate) return false; // Skip products without expiration
      
      const daysUntilExpiration = DateUtils.getDaysUntilExpiration(product.expirationDate);
      return daysUntilExpiration >= 0 && daysUntilExpiration <= days;
    });
  },

  /**
   * Generate unique product ID
   */
  generateId(): string {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create default product object
   */
  createProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: ProductUtils.generateId(),
      name: '',
      category: 'packaged',
      expirationDate: DateUtils.addDays(new Date(), 7),
      addedDate: new Date(),
      location: 'pantry',
      confidence: 1.0,
      imageUri: '',
      ...overrides,
    };
  },
};

/**
 * String utilities
 */
export const StringUtils = {
  /**
   * Capitalize first letter
   */
  capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Truncate string with ellipsis
   */
  truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },

  /**
   * Remove extra whitespace and normalize string
   */
  normalize(str: string): string {
    return str.trim().replace(/\s+/g, ' ');
  },

  /**
   * Convert to slug (URL-friendly string)
   */
  slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};

/**
 * Number utilities
 */
export const NumberUtils = {
  /**
   * Format number with commas
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('ja-JP').format(num);
  },

  /**
   * Clamp number between min and max
   */
  clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Round to specified decimal places
   */
  round(num: number, decimals: number = 2): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Format percentage
   */
  formatPercentage(num: number): string {
    return `${Math.round(num * 100)}%`;
  },
};

/**
 * Array utilities
 */
export const ArrayUtils = {
  /**
   * Group array by key
   */
  groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Remove duplicates from array
   */
  unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  },

  /**
   * Shuffle array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Check if string is valid email
   */
  isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if string is empty or whitespace
   */
  isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  },

  /**
   * Check if date is valid
   */
  isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  },

  /**
   * Check if product name is valid
   */
  isValidProductName(name: string): boolean {
    return !ValidationUtils.isEmpty(name) && name.trim().length >= 2;
  },
};

/**
 * Storage utilities
 */
export const StorageUtils = {
  /**
   * Safely parse JSON from storage
   */
  parseJSON<T>(jsonString: string | null, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  },

  /**
   * Safely stringify object for storage
   */
  stringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return '';
    }
  },
};

// Simple timer storage for performance measurement
let timers: Record<string, number> = {};

/**
 * Timer utilities for performance measurement
 */
export const TimerUtils = {
  /**
   * Performance timer
   */
  time(label: string): void {
    timers[label] = Date.now();
  },

  /**
   * End performance timer
   */
  timeEnd(label: string): number {
    if (timers[label]) {
      const elapsed = Date.now() - timers[label];
      delete timers[label];
      return elapsed;
    }
    return 0;
  },
};
