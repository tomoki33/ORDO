/**
 * Product Data Mapping Service
 * レシート解析結果を商品データベースにマッピング
 */

import { ParsedReceiptItem, ParsedReceipt } from './ReceiptAnalysisService';

export interface ProductMapping {
  receiptItem: ParsedReceiptItem;
  suggestedProduct?: {
    id?: string;
    name: string;
    category: string;
    brand?: string;
    standardPrice?: number;
    confidence: number;
  };
  mappingStatus: 'matched' | 'suggested' | 'unknown';
  alternatives?: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
}

export interface MappedReceiptData {
  originalReceipt: ParsedReceipt;
  productMappings: ProductMapping[];
  summary: {
    totalItems: number;
    matchedItems: number;
    suggestedItems: number;
    unknownItems: number;
    overallConfidence: number;
  };
}

export class ProductMappingService {
  /**
   * レシート解析結果を商品データにマッピング
   */
  static async mapReceiptToProducts(receipt: ParsedReceipt): Promise<MappedReceiptData> {
    try {
      console.log('Product Mapping: Starting mapping process', {
        itemsCount: receipt.items.length,
        storeName: receipt.storeName,
      });

      const productMappings: ProductMapping[] = [];

      for (const item of receipt.items) {
        const mapping = await this.mapSingleItem(item, receipt.storeName);
        productMappings.push(mapping);
      }

      const summary = this.calculateMappingSummary(productMappings);

      const result: MappedReceiptData = {
        originalReceipt: receipt,
        productMappings,
        summary,
      };

      console.log('Product Mapping: Mapping completed', summary);

      return result;
    } catch (error) {
      console.error('Product Mapping: Mapping failed', { error });
      throw new Error(`Product mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 単一アイテムのマッピング
   */
  private static async mapSingleItem(
    item: ParsedReceiptItem,
    storeName?: string
  ): Promise<ProductMapping> {
    // 商品名の正規化
    const normalizedName = this.normalizeProductName(item.name);
    
    // カテゴリ推定
    const suggestedCategory = this.inferCategory(normalizedName, storeName);
    
    // ブランド抽出
    const brand = this.extractBrand(normalizedName);
    
    // 商品データベースマッチング（モック実装）
    const matchResult = await this.findProductMatch(normalizedName, suggestedCategory);

    let mappingStatus: 'matched' | 'suggested' | 'unknown';
    let confidence = 0;

    if (matchResult.exactMatch) {
      mappingStatus = 'matched';
      confidence = 0.9;
    } else if (matchResult.suggestions.length > 0) {
      mappingStatus = 'suggested';
      confidence = 0.7;
    } else {
      mappingStatus = 'unknown';
      confidence = 0.3;
    }

    return {
      receiptItem: item,
      suggestedProduct: matchResult.exactMatch || matchResult.suggestions[0] ? {
        name: matchResult.exactMatch?.name || matchResult.suggestions[0]?.name || normalizedName,
        category: suggestedCategory,
        brand,
        confidence,
      } : undefined,
      mappingStatus,
      alternatives: matchResult.suggestions.slice(1, 4), // 最大3つの代替案
    };
  }

  /**
   * 商品名の正規化
   */
  private static normalizeProductName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // 複数スペースを1つに
      .replace(/[【】（）()]/g, '') // 括弧除去
      .replace(/\d+[個本袋枚缶]$/, '') // 末尾の数量単位除去
      .replace(/^[★☆※]/g, '') // 先頭の記号除去
      .trim();
  }

  /**
   * カテゴリ推定
   */
  private static inferCategory(productName: string, storeName?: string): string {
    const categoryPatterns = [
      // 食品・飲料
      { pattern: /牛乳|ミルク|乳製品/, category: '乳製品' },
      { pattern: /パン|食パン|ロール/, category: 'パン類' },
      { pattern: /米|ご飯|白米/, category: '米・穀物' },
      { pattern: /肉|ビーフ|ポーク|チキン|鶏/, category: '肉類' },
      { pattern: /魚|さかな|サーモン|まぐろ/, category: '魚類' },
      { pattern: /野菜|キャベツ|にんじん|トマト/, category: '野菜' },
      { pattern: /果物|りんご|バナナ|オレンジ/, category: '果物' },
      { pattern: /お茶|茶|コーヒー|ジュース|飲料/, category: '飲料' },
      { pattern: /お菓子|スナック|チョコ|クッキー/, category: 'お菓子' },
      { pattern: /冷凍|アイス/, category: '冷凍食品' },
      
      // 生活用品
      { pattern: /洗剤|石鹸|シャンプー|ボディソープ/, category: '日用品' },
      { pattern: /トイレット|ティッシュ|タオル/, category: '衛生用品' },
      { pattern: /薬|サプリ|ビタミン/, category: '医薬品・サプリ' },
      { pattern: /化粧|コスメ|美容/, category: '化粧品' },
      
      // その他
      { pattern: /文具|ペン|ノート/, category: '文房具' },
      { pattern: /電池|バッテリー/, category: '電子機器' },
    ];

    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(productName)) {
        return category;
      }
    }

    // 店舗タイプによる推定
    if (storeName) {
      if (/薬局|ドラッグ/.test(storeName)) {
        return '医薬品・日用品';
      } else if (/コンビニ/.test(storeName)) {
        return '食品・飲料';
      } else if (/スーパー/.test(storeName)) {
        return '食品・生活用品';
      }
    }

    return 'その他';
  }

  /**
   * ブランド抽出
   */
  private static extractBrand(productName: string): string | undefined {
    const brandPatterns = [
      /明治|森永|雪印|キリン|アサヒ|サントリー/,
      /ネスレ|ロッテ|カルビー|ヤマザキ/,
      /ユニリーバ|P&G|花王|ライオン/,
      /セブンプレミアム|トップバリュ|ファミマ/,
    ];

    for (const pattern of brandPatterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * 商品データベースマッチング（モック実装）
   */
  private static async findProductMatch(
    productName: string,
    category: string
  ): Promise<{
    exactMatch?: {
      id: string;
      name: string;
      category: string;
    };
    suggestions: Array<{
      name: string;
      category: string;
      confidence: number;
    }>;
  }> {
    // 実際の実装では、商品データベースやAPIに問い合わせ
    // ここではモックデータを返す
    
    const mockProducts = [
      { id: '1', name: '明治おいしい牛乳', category: '乳製品' },
      { id: '2', name: 'キリン午後の紅茶', category: '飲料' },
      { id: '3', name: 'ヤマザキ食パン', category: 'パン類' },
      { id: '4', name: 'カルビーポテトチップス', category: 'お菓子' },
    ];

    // 完全一致チェック
    const exactMatch = mockProducts.find(product => 
      product.name.includes(productName) || productName.includes(product.name)
    );

    // 部分一致の候補
    const suggestions = mockProducts
      .filter(product => 
        product.category === category && product !== exactMatch
      )
      .map(product => ({
        name: product.name,
        category: product.category,
        confidence: Math.random() * 0.3 + 0.5, // 0.5-0.8の範囲
      }))
      .slice(0, 3);

    return {
      exactMatch,
      suggestions,
    };
  }

  /**
   * マッピング結果のサマリー計算
   */
  private static calculateMappingSummary(mappings: ProductMapping[]): {
    totalItems: number;
    matchedItems: number;
    suggestedItems: number;
    unknownItems: number;
    overallConfidence: number;
  } {
    const totalItems = mappings.length;
    const matchedItems = mappings.filter(m => m.mappingStatus === 'matched').length;
    const suggestedItems = mappings.filter(m => m.mappingStatus === 'suggested').length;
    const unknownItems = mappings.filter(m => m.mappingStatus === 'unknown').length;

    const overallConfidence = mappings.reduce((sum, mapping) => {
      return sum + (mapping.suggestedProduct?.confidence || 0);
    }, 0) / totalItems;

    return {
      totalItems,
      matchedItems,
      suggestedItems,
      unknownItems,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
    };
  }

  /**
   * マッピング結果の検証
   */
  static validateMappingResults(mappedData: MappedReceiptData): {
    isReliable: boolean;
    confidence: number;
    recommendations: string[];
  } {
    const { summary } = mappedData;
    const recommendations: string[] = [];

    // 信頼性の計算
    const matchRate = summary.matchedItems / summary.totalItems;
    const suggestionRate = summary.suggestedItems / summary.totalItems;
    
    let confidence = summary.overallConfidence;
    
    // 調整ファクター
    if (matchRate > 0.7) {
      confidence += 0.1;
    } else if (matchRate < 0.3) {
      confidence -= 0.1;
      recommendations.push('商品名の認識精度が低い可能性があります');
    }

    if (summary.unknownItems > summary.totalItems * 0.5) {
      recommendations.push('多くの商品が特定できませんでした');
      recommendations.push('手動で商品情報を確認することをお勧めします');
    }

    if (summary.overallConfidence < 0.6) {
      recommendations.push('OCRの精度が低い可能性があります');
      recommendations.push('より鮮明な画像で再撮影してください');
    }

    return {
      isReliable: confidence > 0.7 && matchRate > 0.5,
      confidence,
      recommendations,
    };
  }

  /**
   * 商品カテゴリの統計を取得
   */
  static getCategoryStatistics(mappedData: MappedReceiptData): Array<{
    category: string;
    count: number;
    totalPrice: number;
    averagePrice: number;
  }> {
    const categoryMap = new Map<string, { count: number; totalPrice: number }>();

    for (const mapping of mappedData.productMappings) {
      const category = mapping.suggestedProduct?.category || 'その他';
      const price = mapping.receiptItem.price;
      
      const existing = categoryMap.get(category) || { count: 0, totalPrice: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        totalPrice: existing.totalPrice + price,
      });
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      totalPrice: data.totalPrice,
      averagePrice: Math.round(data.totalPrice / data.count),
    }));
  }
}
