/**
 * Receipt Analysis Service
 * レシートのOCRテキストから商品情報を抽出・解析
 */

import { OCRResult, RecognizedText } from './OCRService';

export interface ParsedReceiptItem {
  name: string;
  price: number;
  quantity: number;
  unitPrice?: number;
  category?: string;
  confidence: number;
  rawText: string;
}

export interface ParsedReceipt {
  storeName?: string;
  storeAddress?: string;
  date?: Date;
  totalAmount?: number;
  taxAmount?: number;
  items: ParsedReceiptItem[];
  confidence: number;
  rawData: {
    fullText: string;
    processedLines: string[];
  };
}

export class ReceiptAnalysisService {
  /**
   * レシートテキストを解析して構造化データに変換
   */
  static async analyzeReceipt(recognizedText: RecognizedText): Promise<ParsedReceipt> {
    try {
      console.log('Receipt Analysis: Starting analysis', { 
        textLength: recognizedText.fullText.length,
        blocksCount: recognizedText.blocks.length 
      });

      const lines = this.extractLines(recognizedText);
      const storeName = this.extractStoreName(lines);
      const storeAddress = this.extractStoreAddress(lines);
      const date = this.extractDate(lines);
      const { totalAmount, taxAmount } = this.extractAmounts(lines);
      const items = this.extractItems(lines);

      const confidence = this.calculateOverallConfidence(recognizedText, items);

      const result: ParsedReceipt = {
        storeName,
        storeAddress,
        date,
        totalAmount,
        taxAmount,
        items,
        confidence,
        rawData: {
          fullText: recognizedText.fullText,
          processedLines: lines,
        },
      };

      console.log('Receipt Analysis: Analysis completed', {
        storeName,
        itemsCount: items.length,
        totalAmount,
        confidence,
      });

      return result;
    } catch (error) {
      console.error('Receipt Analysis: Analysis failed', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Receipt analysis failed: ${errorMessage}`);
    }
  }

  /**
   * OCRブロックから行を抽出
   */
  private static extractLines(recognizedText: RecognizedText): string[] {
    // Y座標でソートされたブロックを行にグループ化
    const sortedBlocks = [...recognizedText.blocks].sort((a, b) => {
      if (!a.boundingBox || !b.boundingBox) return 0;
      return a.boundingBox.y - b.boundingBox.y;
    });

    const lines: string[] = [];
    let currentLine = '';
    let lastY = -1;
    const lineThreshold = 20; // Y座標の差がこの値以下なら同じ行とみなす

    for (const block of sortedBlocks) {
      const currentY = block.boundingBox?.y || 0;
      
      if (lastY >= 0 && Math.abs(currentY - lastY) > lineThreshold) {
        // 新しい行
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = block.text;
      } else {
        // 同じ行に追加
        currentLine += (currentLine ? ' ' : '') + block.text;
      }
      
      lastY = currentY;
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.filter(line => line.length > 0);
  }

  /**
   * 店舗名を抽出
   */
  private static extractStoreName(lines: string[]): string | undefined {
    // 最初の数行から店舗名を探す
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // 一般的な店舗名パターン
      if (this.isStoreName(line)) {
        return line.trim();
      }
    }
    
    return undefined;
  }

  /**
   * 店舗名かどうかを判定
   */
  private static isStoreName(line: string): boolean {
    const storePatterns = [
      /コンビニ|スーパー|マート|ストア|ショップ|薬局|ドラッグ/,
      /セブン|ローソン|ファミマ|イオン|西友|ライフ|マルエツ/,
      /株式会社|有限会社|\(株\)|\(有\)/,
    ];

    return storePatterns.some(pattern => pattern.test(line));
  }

  /**
   * 店舗住所を抽出
   */
  private static extractStoreAddress(lines: string[]): string | undefined {
    for (const line of lines) {
      if (this.isAddress(line)) {
        return line.trim();
      }
    }
    return undefined;
  }

  /**
   * 住所かどうかを判定
   */
  private static isAddress(line: string): boolean {
    const addressPatterns = [
      /〒\d{3}-\d{4}/,
      /[都道府県][市区町村]/,
      /東京都|大阪府|京都府|北海道|\w+県/,
      /\d+-\d+-\d+/,
    ];

    return addressPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 日付を抽出
   */
  private static extractDate(lines: string[]): Date | undefined {
    const datePatterns = [
      /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})[日]?/,
      /(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      /令和(\d+)年(\d{1,2})月(\d{1,2})日/,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            let year, month, day;
            
            if (pattern.source.includes('令和')) {
              // 令和年号の処理
              year = 2018 + parseInt(match[1]); // 令和元年 = 2019年
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else if (match[1].length === 4) {
              // 4桁年
              year = parseInt(match[1]);
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            } else {
              // 2桁年（現在の年代を想定）
              year = 2000 + parseInt(match[1]);
              month = parseInt(match[2]);
              day = parseInt(match[3]);
            }

            return new Date(year, month - 1, day);
          } catch (error) {
            console.warn('Receipt Analysis: Date parsing failed', { line, match });
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 金額情報を抽出
   */
  private static extractAmounts(lines: string[]): { 
    totalAmount?: number; 
    taxAmount?: number; 
  } {
    let totalAmount: number | undefined;
    let taxAmount: number | undefined;

    const amountPatterns = [
      { pattern: /合計[：:\s]*[¥￥]?(\d{1,3}(?:,\d{3})*)/i, type: 'total' },
      { pattern: /小計[：:\s]*[¥￥]?(\d{1,3}(?:,\d{3})*)/i, type: 'subtotal' },
      { pattern: /税[：:\s]*[¥￥]?(\d{1,3}(?:,\d{3})*)/i, type: 'tax' },
      { pattern: /消費税[：:\s]*[¥￥]?(\d{1,3}(?:,\d{3})*)/i, type: 'tax' },
      { pattern: /総計[：:\s]*[¥￥]?(\d{1,3}(?:,\d{3})*)/i, type: 'total' },
    ];

    for (const line of lines) {
      for (const { pattern, type } of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          
          if (type === 'total' && !totalAmount) {
            totalAmount = amount;
          } else if (type === 'tax' && !taxAmount) {
            taxAmount = amount;
          }
        }
      }
    }

    return { totalAmount, taxAmount };
  }

  /**
   * 商品アイテムを抽出
   */
  private static extractItems(lines: string[]): ParsedReceiptItem[] {
    const items: ParsedReceiptItem[] = [];
    
    // 商品行のパターン
    const itemPatterns = [
      // "商品名 数量 単価 金額" パターン
      /^(.+?)\s+(\d+)個?\s*[¥￥]?(\d{1,3}(?:,\d{3})*)\s*[¥￥]?(\d{1,3}(?:,\d{3})*)$/,
      // "商品名 金額" パターン
      /^(.+?)\s+[¥￥]?(\d{1,3}(?:,\d{3})*)$/,
      // "商品名" + 次行に金額
      /^(.+?)$/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // スキップするパターン
      if (this.shouldSkipLine(line)) {
        continue;
      }

      // パターンマッチング
      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
        if (match) {
          const item = this.parseItemFromMatch(match, lines, i);
          if (item) {
            items.push(item);
            break;
          }
        }
      }
    }

    return this.deduplicateItems(items);
  }

  /**
   * スキップすべき行かどうかを判定
   */
  private static shouldSkipLine(line: string): boolean {
    const skipPatterns = [
      /^[\s\-\*=]+$/, // 装飾線
      /領収書|レシート|お買上票/,
      /ありがとう|またお越し/,
      /店舗|電話|TEL|FAX/,
      /営業時間|定休日/,
      /合計|小計|税|釣銭|預り/,
      /クレジット|現金|カード/,
      /ポイント|会員/,
    ];

    return skipPatterns.some(pattern => pattern.test(line));
  }

  /**
   * マッチ結果から商品アイテムを解析
   */
  private static parseItemFromMatch(
    match: RegExpMatchArray,
    lines: string[],
    lineIndex: number
  ): ParsedReceiptItem | null {
    try {
      if (match.length >= 5) {
        // "商品名 数量 単価 金額" パターン
        const name = match[1].trim();
        const quantity = parseInt(match[2]);
        const unitPrice = parseInt(match[3].replace(/,/g, ''));
        const price = parseInt(match[4].replace(/,/g, ''));

        return {
          name,
          price,
          quantity,
          unitPrice,
          confidence: 0.9,
          rawText: match[0],
        };
      } else if (match.length >= 3) {
        // "商品名 金額" パターン
        const name = match[1].trim();
        const price = parseInt(match[2].replace(/,/g, ''));

        return {
          name,
          price,
          quantity: 1,
          confidence: 0.8,
          rawText: match[0],
        };
      } else {
        // 商品名のみ、次行に金額がある可能性
        const name = match[1].trim();
        const nextLine = lines[lineIndex + 1];
        
        if (nextLine) {
          const priceMatch = nextLine.match(/[¥￥]?(\d{1,3}(?:,\d{3})*)$/);
          if (priceMatch) {
            const price = parseInt(priceMatch[1].replace(/,/g, ''));
            return {
              name,
              price,
              quantity: 1,
              confidence: 0.7,
              rawText: `${match[0]} ${nextLine}`,
            };
          }
        }
      }
    } catch (error) {
      console.warn('Receipt Analysis: Item parsing failed', { match, error });
    }

    return null;
  }

  /**
   * 重複アイテムを除去
   */
  private static deduplicateItems(items: ParsedReceiptItem[]): ParsedReceiptItem[] {
    const uniqueItems = new Map<string, ParsedReceiptItem>();

    for (const item of items) {
      const key = `${item.name}_${item.price}`;
      const existing = uniqueItems.get(key);

      if (!existing || item.confidence > existing.confidence) {
        uniqueItems.set(key, item);
      }
    }

    return Array.from(uniqueItems.values());
  }

  /**
   * 全体的な信頼度を計算
   */
  private static calculateOverallConfidence(
    recognizedText: RecognizedText,
    items: ParsedReceiptItem[]
  ): number {
    const textQuality = recognizedText.blocks.reduce(
      (sum, block) => sum + block.confidence, 0
    ) / (recognizedText.blocks.length || 1);

    const itemsQuality = items.reduce(
      (sum, item) => sum + item.confidence, 0
    ) / (items.length || 1);

    const structureBonus = items.length > 0 ? 0.1 : 0;

    return Math.min(0.95, (textQuality * 0.4 + itemsQuality * 0.5 + structureBonus));
  }

  /**
   * 解析結果の検証
   */
  static validateReceiptData(receipt: ParsedReceipt): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 基本的な検証
    if (!receipt.items || receipt.items.length === 0) {
      issues.push('商品が検出されませんでした');
    }

    if (receipt.confidence < 0.5) {
      warnings.push('OCRの精度が低い可能性があります');
    }

    // 金額の整合性チェック
    if (receipt.totalAmount && receipt.items.length > 0) {
      const itemsTotal = receipt.items.reduce((sum, item) => sum + item.price, 0);
      const diff = Math.abs(itemsTotal - receipt.totalAmount);
      
      if (diff > receipt.totalAmount * 0.1) { // 10%以上の差
        warnings.push('商品の合計金額とレシートの合計金額に差があります');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }
}
