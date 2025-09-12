/**
 * ProductAutoFill Service
 * Handles automatic product information filling from barcode scanning and API integration
 */

import { LoggingService, LogCategory } from './LoggingService';
import { BarcodeScannerService, ScanResult, BarcodeFormat } from './BarcodeScannerService';
import { RakutenAPIService, ProductInfo, SearchOptions } from './RakutenAPIService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProductData {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  brand?: string;
  shopName?: string;
  shopUrl?: string;
  reviewCount?: number;
  reviewAverage?: number;
  availability?: boolean;
  lastUpdated: Date;
  source: 'rakuten' | 'manual' | 'cache';
  confidence: number;
  alternativeProducts?: ProductInfo[];
}

export interface AutoFillOptions {
  useCache?: boolean;
  cacheTimeout?: number; // minutes
  maxAlternatives?: number;
  requireMinConfidence?: number;
  preferredSources?: ('rakuten')[];
  enableFallback?: boolean;
}

export interface AutoFillResult {
  success: boolean;
  product?: ProductData;
  error?: string;
  alternatives?: ProductInfo[];
  confidence: number;
  source: string;
  processTime: number;
}

export class ProductAutoFillService {
  private static instance: ProductAutoFillService;
  private logger: LoggingService;
  private barcodeScanner: BarcodeScannerService;
  private rakutenAPI: RakutenAPIService;
  private cache: Map<string, ProductData> = new Map();

  private constructor() {
    this.logger = new LoggingService();
    this.barcodeScanner = new BarcodeScannerService();
    this.rakutenAPI = RakutenAPIService.getInstance();
  }

  public static getInstance(): ProductAutoFillService {
    if (!ProductAutoFillService.instance) {
      ProductAutoFillService.instance = new ProductAutoFillService();
    }
    return ProductAutoFillService.instance;
  }

  /**
   * Initialize the auto-fill service
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info(LogCategory.SYSTEM, 'Initializing product auto-fill service');

      // Initialize dependencies (already initialized in constructors)
      // await this.barcodeScanner.initialize();
      
      // Load cached products
      await this.loadCachedProducts();

      this.logger.info(LogCategory.SYSTEM, 'Product auto-fill service initialized successfully');
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to initialize product auto-fill service', 
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Scan barcode and auto-fill product information
   */
  public async scanAndFill(options: AutoFillOptions = {}): Promise<AutoFillResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(LogCategory.BUSINESS, 'Starting scan and auto-fill process', { options });

      // Step 1: Scan barcode
      const scanResult = await this.barcodeScanner.scanBarcode({
        allowedFormats: [
          BarcodeFormat.EAN13,
          BarcodeFormat.EAN8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE128,
        ],
      });

      if (!scanResult || !scanResult.barcode) {
        throw new Error('Failed to scan barcode');
      }

      this.logger.info(LogCategory.BUSINESS, 'Barcode scanned successfully', {
        barcode: scanResult.barcode,
        format: scanResult.format,
      });

      // Step 2: Auto-fill product information
      const autoFillResult = await this.fillProductInfo(scanResult.barcode, options);

      const processTime = Date.now() - startTime;

      const result: AutoFillResult = {
        success: autoFillResult.success,
        product: autoFillResult.product,
        error: autoFillResult.error,
        alternatives: autoFillResult.alternatives,
        confidence: autoFillResult.confidence,
        source: autoFillResult.source,
        processTime,
      };

      this.logger.info(LogCategory.BUSINESS, 'Scan and auto-fill completed', {
        success: result.success,
        processTime,
        confidence: result.confidence,
        source: result.source,
      });

      return result;
    } catch (error) {
      const processTime = Date.now() - startTime;
      
      this.logger.error(LogCategory.ERROR, 'Scan and auto-fill failed', error as Error, { 
        processTime 
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        source: 'error',
        processTime,
      };
    }
  }

  /**
   * Fill product information from barcode
   */
  public async fillProductInfo(barcode: string, options: AutoFillOptions = {}): Promise<AutoFillResult> {
    const startTime = Date.now();

    try {
      this.logger.info(LogCategory.BUSINESS, 'Filling product information', { 
        barcode, 
        options 
      });

      // Step 1: Check cache first
      if (options.useCache !== false) {
        const cachedProduct = await this.getCachedProduct(barcode, options.cacheTimeout);
        if (cachedProduct) {
          this.logger.info(LogCategory.BUSINESS, 'Product found in cache', { barcode });
          
          return {
            success: true,
            product: cachedProduct,
            confidence: cachedProduct.confidence,
            source: 'cache',
            processTime: Date.now() - startTime,
          };
        }
      }

      // Step 2: Search via Rakuten API
      const rakutenResults = await this.searchViaRakuten(barcode, options);
      
      if (rakutenResults.length > 0) {
        const bestMatch = rakutenResults[0];
        const confidence = this.calculateConfidence(barcode, bestMatch);

        if (confidence >= (options.requireMinConfidence || 0.5)) {
          const productData = await this.convertToProductData(barcode, bestMatch, 'rakuten', confidence);
          
          // Cache the result
          await this.cacheProduct(productData);

          return {
            success: true,
            product: productData,
            alternatives: rakutenResults.slice(1, options.maxAlternatives || 5),
            confidence,
            source: 'rakuten',
            processTime: Date.now() - startTime,
          };
        }
      }

      // Step 3: Fallback options
      if (options.enableFallback !== false) {
        const fallbackResult = await this.performFallbackSearch(barcode, options);
        if (fallbackResult) {
          return {
            ...fallbackResult,
            processTime: Date.now() - startTime,
          };
        }
      }

      // No results found
      this.logger.warn(LogCategory.BUSINESS, 'No product information found', { barcode });

      return {
        success: false,
        error: 'Product not found',
        confidence: 0,
        source: 'none',
        processTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to fill product information', error as Error, { 
        barcode 
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        source: 'error',
        processTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Search product via Rakuten API
   */
  private async searchViaRakuten(barcode: string, options: AutoFillOptions): Promise<ProductInfo[]> {
    try {
      this.logger.info(LogCategory.NETWORK, 'Searching product via Rakuten API', { barcode });

      // First try exact barcode search
      let results = await this.rakutenAPI.searchByBarcode(barcode);

      // If no exact match, try broader search
      if (results.length === 0) {
        const searchOptions: SearchOptions = {
          keyword: barcode,
          hits: options.maxAlternatives || 10,
          sort: 'standard',
          availability: 1,
          imageFlag: 1,
        };

        const searchResult = await this.rakutenAPI.searchProducts(searchOptions);
        results = searchResult.items;
      }

      this.logger.info(LogCategory.NETWORK, 'Rakuten search completed', {
        barcode,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Rakuten search failed', error as Error, { barcode });
      return [];
    }
  }

  /**
   * Perform fallback search when primary methods fail
   */
  private async performFallbackSearch(barcode: string, options: AutoFillOptions): Promise<AutoFillResult | null> {
    try {
      this.logger.info(LogCategory.BUSINESS, 'Performing fallback search', { barcode });

      // Try partial barcode matches
      const partialBarcode = barcode.substring(0, Math.min(barcode.length, 8));
      
      const searchOptions: SearchOptions = {
        keyword: partialBarcode,
        hits: 5,
        sort: 'sales',
        availability: 1,
      };

      const searchResult = await this.rakutenAPI.searchProducts(searchOptions);
      
      if (searchResult.items.length > 0) {
        const bestMatch = searchResult.items[0];
        const confidence = 0.3; // Lower confidence for fallback results

        const productData = await this.convertToProductData(barcode, bestMatch, 'rakuten', confidence);

        return {
          success: true,
          product: productData,
          alternatives: searchResult.items.slice(1),
          confidence,
          source: 'rakuten-fallback',
          processTime: 0, // Fallback doesn't track timing separately
        };
      }

      return null;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Fallback search failed', error as Error, { barcode });
      return null;
    }
  }

  /**
   * Calculate confidence score for product match
   */
  private calculateConfidence(barcode: string, product: ProductInfo): number {
    let confidence = 0.5; // Base confidence

    // Check if barcode appears in item code
    if (product.itemCode.includes(barcode)) {
      confidence += 0.3;
    }

    // Check if barcode appears in item name or caption
    const searchText = `${product.itemName} ${product.itemCaption}`.toLowerCase();
    if (searchText.includes(barcode.toLowerCase())) {
      confidence += 0.2;
    }

    // Bonus for high review scores
    if (product.reviewAverage && product.reviewAverage >= 4.0) {
      confidence += 0.1;
    }

    // Bonus for availability
    if (product.availability === 1) {
      confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Convert ProductInfo to ProductData
   */
  private async convertToProductData(
    barcode: string,
    productInfo: ProductInfo,
    source: 'rakuten' | 'manual' | 'cache',
    confidence: number
  ): Promise<ProductData> {
    const productData: ProductData = {
      id: this.generateProductId(barcode, productInfo.itemCode),
      barcode,
      name: productInfo.itemName,
      description: productInfo.itemCaption,
      price: productInfo.itemPrice,
      imageUrl: productInfo.imageUrl,
      category: productInfo.genreId,
      brand: this.extractBrand(productInfo.itemName),
      shopName: productInfo.shopName,
      shopUrl: productInfo.itemUrl,
      reviewCount: productInfo.reviewCount,
      reviewAverage: productInfo.reviewAverage,
      availability: productInfo.availability === 1,
      lastUpdated: new Date(),
      source,
      confidence,
    };

    return productData;
  }

  /**
   * Extract brand from product name
   */
  private extractBrand(productName: string): string | undefined {
    // Simple brand extraction logic
    // In production, this could be more sophisticated
    const words = productName.split(/[\s\[\]【】]/);
    const firstWord = words[0];
    
    if (firstWord && firstWord.length > 1 && firstWord.length < 20) {
      return firstWord;
    }

    return undefined;
  }

  /**
   * Generate unique product ID
   */
  private generateProductId(barcode: string, itemCode: string): string {
    return `${barcode}_${itemCode}_${Date.now()}`;
  }

  /**
   * Get cached product
   */
  private async getCachedProduct(barcode: string, timeoutMinutes?: number): Promise<ProductData | null> {
    try {
      // Check memory cache first
      if (this.cache.has(barcode)) {
        const cachedProduct = this.cache.get(barcode)!;
        
        if (this.isCacheValid(cachedProduct, timeoutMinutes)) {
          return cachedProduct;
        } else {
          this.cache.delete(barcode);
        }
      }

      // Check persistent storage
      const cachedData = await AsyncStorage.getItem(`product_cache_${barcode}`);
      if (cachedData) {
        const productData = JSON.parse(cachedData) as ProductData;
        productData.lastUpdated = new Date(productData.lastUpdated);

        if (this.isCacheValid(productData, timeoutMinutes)) {
          this.cache.set(barcode, productData);
          return productData;
        } else {
          await AsyncStorage.removeItem(`product_cache_${barcode}`);
        }
      }

      return null;
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to get cached product', error as Error, { 
        barcode 
      });
      return null;
    }
  }

  /**
   * Cache product data
   */
  private async cacheProduct(productData: ProductData): Promise<void> {
    try {
      // Store in memory cache
      this.cache.set(productData.barcode, productData);

      // Store in persistent cache
      await AsyncStorage.setItem(
        `product_cache_${productData.barcode}`,
        JSON.stringify(productData)
      );

      this.logger.info(LogCategory.BUSINESS, 'Product cached successfully', {
        barcode: productData.barcode,
        id: productData.id,
      });
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to cache product', error as Error);
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(productData: ProductData, timeoutMinutes?: number): boolean {
    if (!timeoutMinutes) {
      timeoutMinutes = 60; // Default 1 hour
    }

    const now = new Date();
    const lastUpdated = new Date(productData.lastUpdated);
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

    return diffMinutes < timeoutMinutes;
  }

  /**
   * Load cached products from storage
   */
  private async loadCachedProducts(): Promise<void> {
    try {
      this.logger.info(LogCategory.SYSTEM, 'Loading cached products');

      const keys = await AsyncStorage.getAllKeys();
      const productKeys = keys.filter((key: string) => key.startsWith('product_cache_'));

      let loadedCount = 0;
      for (const key of productKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const productData = JSON.parse(cachedData) as ProductData;
            productData.lastUpdated = new Date(productData.lastUpdated);

            if (this.isCacheValid(productData)) {
              this.cache.set(productData.barcode, productData);
              loadedCount++;
            } else {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          this.logger.error(LogCategory.ERROR, 'Failed to load cached product', error as Error, { 
            key 
          });
          await AsyncStorage.removeItem(key);
        }
      }

      this.logger.info(LogCategory.SYSTEM, 'Cached products loaded', {
        loadedCount,
        totalKeys: productKeys.length,
      });
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to load cached products', error as Error);
    }
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    try {
      this.logger.info(LogCategory.SYSTEM, 'Clearing product cache');

      // Clear memory cache
      this.cache.clear();

      // Clear persistent cache
      const keys = await AsyncStorage.getAllKeys();
      const productKeys = keys.filter((key: string) => key.startsWith('product_cache_'));

      for (const key of productKeys) {
        await AsyncStorage.removeItem(key);
      }

      this.logger.info(LogCategory.SYSTEM, 'Product cache cleared', {
        clearedKeys: productKeys.length,
      });
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to clear cache', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    memoryCount: number;
    totalCached: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const memoryCount = this.cache.size;
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const product of this.cache.values()) {
      const lastUpdated = new Date(product.lastUpdated);
      
      if (!oldestEntry || lastUpdated < oldestEntry) {
        oldestEntry = lastUpdated;
      }
      
      if (!newestEntry || lastUpdated > newestEntry) {
        newestEntry = lastUpdated;
      }
    }

    return {
      memoryCount,
      totalCached: memoryCount,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    try {
      this.cache.clear();
      await this.barcodeScanner.cleanup();
      await this.rakutenAPI.cleanup();
      
      this.logger.info(LogCategory.SYSTEM, 'Product auto-fill service cleaned up');
    } catch (error) {
      this.logger.error(LogCategory.ERROR, 'Failed to cleanup product auto-fill service', error as Error);
    }
  }
}
