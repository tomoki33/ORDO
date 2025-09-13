/**
 * Image Optimization Service
 * 画像処理の最適化とメモリ効率化
 */

import { Image, Dimensions, Platform } from 'react-native';
import { performanceMonitor } from './PerformanceMonitorService';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'JPEG' | 'PNG' | 'WEBP';
  enableProgressive?: boolean;
  enableLazyLoading?: boolean;
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  processingTime: number;
}

export interface ImageCacheItem {
  uri: string;
  timestamp: number;
  fileSize: number;
  accessCount: number;
}

class ImageOptimizationService {
  private imageCache = new Map<string, ImageCacheItem>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private maxCacheItems = 100;
  
  // 画面サイズを取得
  private screenDimensions = Dimensions.get('window');

  /**
   * 画像を最適化
   */
  async optimizeImage(
    imageUri: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    performanceMonitor.startTimer('imageOptimization');
    
    try {
      // デフォルト設定
      const {
        maxWidth = this.screenDimensions.width,
        maxHeight = this.screenDimensions.height,
        quality = 0.8,
        format = 'JPEG',
        enableProgressive = true,
      } = options;

      // キャッシュチェック
      const cacheKey = this.generateCacheKey(imageUri, options);
      const cachedImage = this.getCachedImage(cacheKey);
      
      if (cachedImage) {
        const processingTime = performanceMonitor.endTimer('imageOptimization');
        console.log('📷 Using cached optimized image');
        
        return {
          uri: cachedImage.uri,
          width: maxWidth,
          height: maxHeight,
          fileSize: cachedImage.fileSize,
          processingTime,
        };
      }

      // 画像情報を取得
      const imageInfo = await this.getImageInfo(imageUri);
      
      // リサイズが必要かチェック
      const shouldResize = imageInfo.width > maxWidth || imageInfo.height > maxHeight;
      
      let optimizedUri = imageUri;
      let finalWidth = imageInfo.width;
      let finalHeight = imageInfo.height;
      
      if (shouldResize) {
        // 縦横比を保持してリサイズ
        const aspectRatio = imageInfo.width / imageInfo.height;
        
        if (imageInfo.width > imageInfo.height) {
          finalWidth = Math.min(maxWidth, imageInfo.width);
          finalHeight = finalWidth / aspectRatio;
        } else {
          finalHeight = Math.min(maxHeight, imageInfo.height);
          finalWidth = finalHeight * aspectRatio;
        }
        
        // 画像リサイズ実行
        optimizedUri = await this.resizeImage(imageUri, {
          width: Math.round(finalWidth),
          height: Math.round(finalHeight),
          quality,
          format,
          enableProgressive,
        });
      }

      // ファイルサイズを取得
      const fileSize = await this.getImageFileSize(optimizedUri);
      
      // キャッシュに保存
      this.cacheOptimizedImage(cacheKey, {
        uri: optimizedUri,
        timestamp: Date.now(),
        fileSize,
        accessCount: 1,
      });

      const processingTime = performanceMonitor.endTimer('imageOptimization');
      
      console.log(`📷 Image optimized: ${imageInfo.width}x${imageInfo.height} → ${Math.round(finalWidth)}x${Math.round(finalHeight)}`);
      
      return {
        uri: optimizedUri,
        width: Math.round(finalWidth),
        height: Math.round(finalHeight),
        fileSize,
        processingTime,
      };
      
    } catch (error) {
      performanceMonitor.endTimer('imageOptimization');
      console.error('Failed to optimize image:', error);
      throw error;
    }
  }

  /**
   * 複数画像の一括最適化
   */
  async optimizeImages(
    imageUris: string[],
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult[]> {
    performanceMonitor.startTimer('batchImageOptimization');
    
    try {
      // 並列処理で最適化（ただし同時実行数を制限）
      const batchSize = 3; // 同時に3枚まで処理
      const results: OptimizedImageResult[] = [];
      
      for (let i = 0; i < imageUris.length; i += batchSize) {
        const batch = imageUris.slice(i, i + batchSize);
        const batchPromises = batch.map(uri => this.optimizeImage(uri, options));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const processingTime = performanceMonitor.endTimer('batchImageOptimization');
      console.log(`📷 Batch optimized ${imageUris.length} images in ${processingTime}ms`);
      
      return results;
      
    } catch (error) {
      performanceMonitor.endTimer('batchImageOptimization');
      console.error('Failed to batch optimize images:', error);
      throw error;
    }
  }

  /**
   * レシート画像専用最適化
   */
  async optimizeReceiptImage(imageUri: string): Promise<OptimizedImageResult> {
    return this.optimizeImage(imageUri, {
      maxWidth: 800, // レシート読み取りに最適なサイズ
      maxHeight: 1200,
      quality: 0.9, // 高品質（文字認識のため）
      format: 'JPEG',
      enableProgressive: false, // レシートは高速読み込み優先
    });
  }

  /**
   * サムネイル画像生成
   */
  async generateThumbnail(imageUri: string, size: number = 100): Promise<OptimizedImageResult> {
    return this.optimizeImage(imageUri, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.6, // サムネイルは軽量化優先
      format: 'JPEG',
      enableProgressive: false,
    });
  }

  /**
   * 画像情報取得
   */
  private async getImageInfo(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  }

  /**
   * 画像リサイズ（ネイティブ実装の代替）
   */
  private async resizeImage(
    imageUri: string,
    options: {
      width: number;
      height: number;
      quality: number;
      format: string;
      enableProgressive: boolean;
    }
  ): Promise<string> {
    // 実際の実装では react-native-image-resizer などを使用
    // ここではモック実装
    console.log(`📷 Resizing image: ${options.width}x${options.height}, quality: ${options.quality}`);
    
    // Canvas APIを使用した画像リサイズ（Web版）
    if (Platform.OS === 'web') {
      return this.resizeImageCanvas(imageUri, options);
    }
    
    // ネイティブ版では適切なライブラリを使用
    return imageUri; // モック実装
  }

  /**
   * Canvas APIを使用した画像リサイズ（Web版）
   */
  private async resizeImageCanvas(
    imageUri: string,
    options: { width: number; height: number; quality: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== 'web') {
        reject(new Error('Canvas API is only available on web platform'));
        return;
      }
      
      try {
        // Web環境でのCanvas操作（型チェックを回避）
        const canvas = (globalThis as any).document?.createElement('canvas');
        const ctx = canvas?.getContext('2d');
        const img = new (globalThis as any).Image();
        
        if (!canvas || !ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        
        img.onload = () => {
          canvas.width = options.width;
          canvas.height = options.height;
          
          // 高品質リサイズ設定
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 画像を描画
          ctx.drawImage(img, 0, 0, options.width, options.height);
          
          // Base64データURLとして出力
          const resizedDataUrl = canvas.toDataURL('image/jpeg', options.quality);
          resolve(resizedDataUrl);
        };
        
        img.onerror = reject;
        img.src = imageUri;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 画像ファイルサイズ取得（モック実装）
   */
  private async getImageFileSize(imageUri: string): Promise<number> {
    // 実際の実装では react-native-fs などを使用
    // Base64データURLの場合はサイズを計算
    if (imageUri.startsWith('data:')) {
      const base64Data = imageUri.split(',')[1];
      return Math.round((base64Data.length * 3) / 4);
    }
    
    // モック実装
    return Math.random() * 1024 * 1024; // 0-1MB
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(imageUri: string, options: ImageOptimizationOptions): string {
    const optionsHash = JSON.stringify(options);
    return `${imageUri}_${btoa(optionsHash)}`;
  }

  /**
   * キャッシュから画像取得
   */
  private getCachedImage(cacheKey: string): ImageCacheItem | null {
    const cached = this.imageCache.get(cacheKey);
    
    if (cached) {
      // アクセス回数を更新
      cached.accessCount++;
      cached.timestamp = Date.now();
      return cached;
    }
    
    return null;
  }

  /**
   * 最適化された画像をキャッシュ
   */
  private cacheOptimizedImage(cacheKey: string, item: ImageCacheItem): void {
    // キャッシュサイズ制限チェック
    this.ensureCacheSize();
    
    this.imageCache.set(cacheKey, item);
    console.log(`📷 Cached optimized image: ${Math.round(item.fileSize / 1024)}KB`);
  }

  /**
   * キャッシュサイズ管理
   */
  private ensureCacheSize(): void {
    // アイテム数制限
    if (this.imageCache.size >= this.maxCacheItems) {
      this.evictOldestCacheItems(Math.floor(this.maxCacheItems * 0.2)); // 20%削除
    }
    
    // サイズ制限
    const totalSize = Array.from(this.imageCache.values())
      .reduce((sum, item) => sum + item.fileSize, 0);
    
    if (totalSize > this.maxCacheSize) {
      this.evictLargestCacheItems();
    }
  }

  /**
   * 古いキャッシュアイテムを削除
   */
  private evictOldestCacheItems(count: number): void {
    const sortedEntries = Array.from(this.imageCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < Math.min(count, sortedEntries.length); i++) {
      const [key] = sortedEntries[i];
      this.imageCache.delete(key);
    }
    
    console.log(`📷 Evicted ${count} old cache items`);
  }

  /**
   * 大きなキャッシュアイテムを削除
   */
  private evictLargestCacheItems(): void {
    const sortedEntries = Array.from(this.imageCache.entries())
      .sort(([, a], [, b]) => b.fileSize - a.fileSize);
    
    let freedSize = 0;
    const targetSize = this.maxCacheSize * 0.2; // 20%分のサイズを解放
    
    for (const [key, item] of sortedEntries) {
      if (freedSize >= targetSize) break;
      
      this.imageCache.delete(key);
      freedSize += item.fileSize;
    }
    
    console.log(`📷 Evicted large cache items: ${Math.round(freedSize / 1024)}KB freed`);
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.imageCache.clear();
    console.log('📷 Image cache cleared');
  }

  /**
   * キャッシュ統計取得
   */
  getCacheStats(): {
    itemCount: number;
    totalSize: number;
    hitRate: number;
  } {
    const items = Array.from(this.imageCache.values());
    const totalSize = items.reduce((sum, item) => sum + item.fileSize, 0);
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const hitRate = totalAccess > 0 ? (items.length / totalAccess) : 0;
    
    return {
      itemCount: items.length,
      totalSize,
      hitRate,
    };
  }

  /**
   * メモリ使用量最適化
   */
  optimizeMemoryUsage(): void {
    // 使用頻度の低いキャッシュアイテムを削除
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分
    
    for (const [key, item] of this.imageCache.entries()) {
      if (now - item.timestamp > maxAge && item.accessCount < 2) {
        this.imageCache.delete(key);
      }
    }
    
    console.log('📷 Memory usage optimized');
  }
}

export const imageOptimizer = new ImageOptimizationService();

// 定期的なメモリ最適化
setInterval(() => {
  imageOptimizer.optimizeMemoryUsage();
}, 5 * 60 * 1000); // 5分ごと
