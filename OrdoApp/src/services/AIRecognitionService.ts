/**
 * Ordo App - AI Recognition Service
 * Handles image analysis and product recognition using AI APIs
 */

import { RecognitionResult, CameraCapture, ProductCategory } from '../types';
import { AI_CONFIG } from '../constants';
import { DebugUtils } from '../utils';

/**
 * Mock AI Recognition Service
 * This will be replaced with actual AI service integration
 */
export class AIRecognitionService {
  private static readonly MOCK_PRODUCTS: Array<{
    name: string;
    category: ProductCategory;
    expirationDays: number;
  }> = [
    { name: 'バナナ', category: 'fruits', expirationDays: 5 },
    { name: 'りんご', category: 'fruits', expirationDays: 14 },
    { name: 'トマト', category: 'vegetables', expirationDays: 7 },
    { name: 'にんじん', category: 'vegetables', expirationDays: 21 },
    { name: '牛乳', category: 'dairy', expirationDays: 7 },
    { name: 'ヨーグルト', category: 'dairy', expirationDays: 14 },
    { name: '鶏肉', category: 'meat', expirationDays: 3 },
    { name: '豚肉', category: 'meat', expirationDays: 3 },
    { name: 'パン', category: 'packaged', expirationDays: 5 },
    { name: 'お茶', category: 'beverages', expirationDays: 365 },
  ];

  /**
   * Analyze image and recognize product
   */
  static async recognizeProduct(imageCapture: CameraCapture): Promise<RecognitionResult> {
    DebugUtils.time('AI Recognition');
    
    try {
      if (AI_CONFIG.ENABLE_AI_MOCK) {
        return await this.mockRecognition(imageCapture);
      }
      
      // TODO: Implement real AI service integration
      // This would typically call a service like:
      // - Google Vision API
      // - AWS Rekognition
      // - Custom trained model
      // - OpenAI Vision API
      
      throw new Error('Real AI service not implemented yet');
    } catch (error) {
      DebugUtils.error('AI recognition failed', error as Error);
      throw error;
    } finally {
      DebugUtils.timeEnd('AI Recognition');
    }
  }

  /**
   * Mock AI recognition for development
   */
  private static async mockRecognition(imageCapture: CameraCapture): Promise<RecognitionResult> {
    DebugUtils.log('Running mock AI recognition', imageCapture.uri);
    
    // Simulate network delay
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 + Math.random() * 2000));
    
    // Randomly select a mock product
    const randomProduct = this.MOCK_PRODUCTS[Math.floor(Math.random() * this.MOCK_PRODUCTS.length)];
    
    // Generate random confidence (but usually high for mock)
    const confidence = 0.8 + Math.random() * 0.2; // 80-100%
    
    const result: RecognitionResult = {
      productName: randomProduct.name,
      category: randomProduct.category,
      confidence: Math.round(confidence * 100) / 100,
      freshnessScore: 0.7 + Math.random() * 0.3, // 70-100%
      suggestedExpirationDays: randomProduct.expirationDays,
      alternativeNames: this.generateAlternativeNames(randomProduct.name),
    };
    
    DebugUtils.log('Mock recognition result', result);
    return result;
  }

  /**
   * Generate alternative product names for mock data
   */
  private static generateAlternativeNames(productName: string): string[] {
    const alternatives: Record<string, string[]> = {
      'バナナ': ['banana', 'ばなな', 'バナナ（房）'],
      'りんご': ['apple', 'りんご', '林檎', 'アップル'],
      'トマト': ['tomato', 'とまと', '完熟トマト', 'ミニトマト'],
      'にんじん': ['carrot', 'ニンジン', '人参', 'キャロット'],
      '牛乳': ['milk', 'ミルク', '低脂肪乳', '成分無調整'],
      'ヨーグルト': ['yogurt', 'プレーンヨーグルト', 'ヨーグルト（無糖）'],
      '鶏肉': ['chicken', 'チキン', '鶏むね肉', '鶏もも肉'],
      '豚肉': ['pork', 'ポーク', '豚バラ', '豚ロース'],
      'パン': ['bread', 'ブレッド', '食パン', '角食パン'],
      'お茶': ['tea', 'ティー', '緑茶', 'ペットボトル茶'],
    };
    
    return alternatives[productName] || [productName];
  }

  /**
   * Validate recognition result
   */
  static validateResult(result: RecognitionResult): boolean {
    if (!result.productName || result.productName.trim().length === 0) {
      DebugUtils.warn('Invalid recognition result: empty product name');
      return false;
    }
    
    if (result.confidence < AI_CONFIG.MIN_CONFIDENCE) {
      DebugUtils.warn('Recognition confidence too low', result.confidence);
      return false;
    }
    
    if (!AI_CONFIG.SUPPORTED_CATEGORIES.includes(result.category as any)) {
      DebugUtils.warn('Unsupported category', result.category);
      return false;
    }
    
    return true;
  }

  /**
   * Get confidence level description
   */
  static getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.9) return '非常に高い';
    if (confidence >= 0.8) return '高い';
    if (confidence >= 0.7) return '普通';
    if (confidence >= 0.6) return '低い';
    return '非常に低い';
  }

  /**
   * Retry recognition with different parameters
   */
  static async retryRecognition(
    imageCapture: CameraCapture,
    maxRetries: number = AI_CONFIG.MAX_RETRIES
  ): Promise<RecognitionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        DebugUtils.log(`Recognition attempt ${attempt}/${maxRetries}`);
        const result = await this.recognizeProduct(imageCapture);
        
        if (this.validateResult(result)) {
          return result;
        }
        
        throw new Error('Recognition result validation failed');
      } catch (error) {
        lastError = error as Error;
        DebugUtils.warn(`Recognition attempt ${attempt} failed`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
        }
      }
    }
    
    throw new Error(`Recognition failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Batch recognition for multiple images
   */
  static async recognizeMultipleProducts(
    imageCaptures: CameraCapture[]
  ): Promise<RecognitionResult[]> {
    DebugUtils.log('Batch recognition started', imageCaptures.length);
    
    const results: RecognitionResult[] = [];
    
    for (let i = 0; i < imageCaptures.length; i++) {
      try {
        DebugUtils.log(`Processing image ${i + 1}/${imageCaptures.length}`);
        const result = await this.recognizeProduct(imageCaptures[i]);
        results.push(result);
      } catch (error) {
        DebugUtils.error(`Failed to process image ${i + 1}`, error as Error);
        // Continue with other images, don't fail the entire batch
      }
    }
    
    DebugUtils.log('Batch recognition completed', results.length);
    return results;
  }

  /**
   * Get recognition statistics
   */
  static getRecognitionStats(results: RecognitionResult[]) {
    const stats = {
      total: results.length,
      highConfidence: results.filter(r => r.confidence >= 0.8).length,
      mediumConfidence: results.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length,
      lowConfidence: results.filter(r => r.confidence < 0.6).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length || 0,
      categories: {} as Record<string, number>,
    };
    
    // Count by category
    results.forEach(result => {
      stats.categories[result.category] = (stats.categories[result.category] || 0) + 1;
    });
    
    return stats;
  }
}

/**
 * Image processing utilities for AI recognition
 */
export class ImageProcessingService {
  /**
   * Resize image for AI processing
   */
  static async resizeImage(
    imageUri: string,
    maxWidth: number = 1024,
    maxHeight: number = 1024,
    quality: number = 0.8
  ): Promise<CameraCapture> {
    DebugUtils.log('Resizing image for AI processing', { maxWidth, maxHeight, quality });
    
    // TODO: Implement actual image resizing
    // This would use a library like react-native-image-resizer
    
    // For now, return the original image
    return {
      uri: imageUri,
      width: maxWidth,
      height: maxHeight,
    };
  }

  /**
   * Convert image to base64 for API calls
   */
  static async imageToBase64(imageUri: string): Promise<string> {
    DebugUtils.log('Converting image to base64', imageUri);
    
    // TODO: Implement actual base64 conversion
    // This would use React Native's built-in capabilities
    
    // Mock base64 for now
    return 'mock-base64-data';
  }

  /**
   * Validate image before processing
   */
  static validateImage(imageCapture: CameraCapture): boolean {
    if (!imageCapture.uri) {
      DebugUtils.warn('Image validation failed: no URI');
      return false;
    }
    
    if (imageCapture.width && imageCapture.height) {
      const minSize = 100;
      if (imageCapture.width < minSize || imageCapture.height < minSize) {
        DebugUtils.warn('Image validation failed: too small', {
          width: imageCapture.width,
          height: imageCapture.height,
        });
        return false;
      }
    }
    
    return true;
  }
}
