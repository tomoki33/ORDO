/**
 * OCR Engine Service
 * MLKitを使用したテキスト認識とレシート解析
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RecognizedText {
  fullText: string;
  blocks: OCRResult[];
}

export class OCRService {
  /**
   * 画像からテキストを認識
   */
  static async recognizeText(imagePath: string): Promise<RecognizedText> {
    try {
      console.log('OCR: Starting text recognition', { imagePath });
      
      const result = await TextRecognition.recognize(imagePath);
      
      const blocks: OCRResult[] = result.blocks.map((block: any) => ({
        text: block.text,
        confidence: block.confidence || 0,
        boundingBox: block.frame ? {
          x: block.frame.x,
          y: block.frame.y,
          width: block.frame.width,
          height: block.frame.height,
        } : undefined,
      }));
      
      console.log('OCR: Text recognition completed', { 
        blocksCount: blocks.length,
        fullTextLength: result.text.length 
      });
      
      return {
        fullText: result.text,
        blocks,
      };
    } catch (error) {
      console.error('OCR: Text recognition failed', { error, imagePath });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OCR recognition failed: ${errorMessage}`);
    }
  }

  /**
   * レシート専用のOCR処理
   * より高い精度でレシートのテキストを認識
   */
  static async recognizeReceipt(imagePath: string): Promise<RecognizedText> {
    try {
      console.log('OCR: Starting receipt recognition', { imagePath });
      
      // レシート用の前処理オプション
      const result = await TextRecognition.recognize(imagePath, {
        // レシート認識に最適化された設定
        recognitionLevel: 'accurate', // より高精度
      });
      
      // レシート特有の後処理
      const processedBlocks = this.postProcessReceiptBlocks(result.blocks);
      
      console.log('OCR: Receipt recognition completed', { 
        originalBlocks: result.blocks.length,
        processedBlocks: processedBlocks.length 
      });
      
      return {
        fullText: result.text,
        blocks: processedBlocks,
      };
    } catch (error) {
      console.error('OCR: Receipt recognition failed', { error, imagePath });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Receipt OCR failed: ${errorMessage}`);
    }
  }

  /**
   * レシートブロックの後処理
   * ノイズ除去と信頼度の向上
   */
  private static postProcessReceiptBlocks(blocks: any[]): OCRResult[] {
    return blocks
      .map(block => ({
        text: block.text.trim(),
        confidence: block.confidence || 0,
        boundingBox: block.frame ? {
          x: block.frame.x,
          y: block.frame.y,
          width: block.frame.width,
          height: block.frame.height,
        } : undefined,
      }))
      .filter(block => {
        // ノイズフィルタリング
        if (block.text.length < 2) return false; // 短すぎるテキスト
        if (block.confidence < 0.3) return false; // 信頼度が低い
        if (/^[^\w\d]+$/.test(block.text)) return false; // 記号のみ
        return true;
      })
      .sort((a, b) => {
        // Y座標でソート（上から下へ）
        if (!a.boundingBox || !b.boundingBox) return 0;
        return a.boundingBox.y - b.boundingBox.y;
      });
  }

  /**
   * OCRテキストの品質評価
   */
  static evaluateTextQuality(recognizedText: RecognizedText): {
    quality: 'high' | 'medium' | 'low';
    confidence: number;
    suggestions: string[];
  } {
    const { blocks } = recognizedText;
    
    if (blocks.length === 0) {
      return {
        quality: 'low',
        confidence: 0,
        suggestions: ['画像が読み取れませんでした。明るい場所で再撮影してください。'],
      };
    }
    
    const avgConfidence = blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length;
    const longTextBlocks = blocks.filter(block => block.text.length > 5).length;
    const totalTextLength = blocks.reduce((sum, block) => sum + block.text.length, 0);
    
    const suggestions: string[] = [];
    let quality: 'high' | 'medium' | 'low';
    
    if (avgConfidence > 0.8 && longTextBlocks > 5 && totalTextLength > 50) {
      quality = 'high';
    } else if (avgConfidence > 0.6 && longTextBlocks > 3 && totalTextLength > 30) {
      quality = 'medium';
      if (avgConfidence < 0.7) {
        suggestions.push('画像の解像度を上げて再撮影することをお勧めします。');
      }
    } else {
      quality = 'low';
      suggestions.push('レシートがぼやけている可能性があります。');
      suggestions.push('明るい場所でレシート全体が写るように撮影してください。');
      suggestions.push('レシートを平らに置いて撮影してください。');
    }
    
    return {
      quality,
      confidence: avgConfidence,
      suggestions,
    };
  }

  /**
   * 画像の前処理チェック
   */
  static async validateImageForOCR(imagePath: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // 基本的な画像検証を行う
      // 実際の実装では画像のメタデータや品質をチェック
      
      // ファイルサイズチェック（例）
      // const stats = await RNFS.stat(imagePath);
      // if (stats.size < 50000) { // 50KB未満
      //   issues.push('画像サイズが小さすぎます');
      //   recommendations.push('より高解像度で撮影してください');
      // }
      
      return {
        isValid: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('OCR: Image validation failed', { error, imagePath });
      return {
        isValid: false,
        issues: ['画像の読み込みに失敗しました'],
        recommendations: ['画像ファイルが破損している可能性があります'],
      };
    }
  }
}
