/**
 * Natural Language Processing Service
 * 自然言語処理とコマンド解析
 */

import { voiceRecognitionService } from './VoiceRecognitionService';

export interface ParsedCommand {
  intent: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
  confidence: number;
  originalText: string;
  language: string;
  normalizedText: string;
}

export interface ProductEntity {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
  synonyms?: string[];
}

export interface ActionEntity {
  action: 'add' | 'remove' | 'update' | 'search' | 'check' | 'delete';
  confidence: number;
  synonyms?: string[];
}

export interface NLPPattern {
  pattern: RegExp;
  intent: string;
  entities: string[];
  confidence: number;
  language: string;
}

export interface LanguageModel {
  language: string;
  patterns: NLPPattern[];
  synonyms: Record<string, string[]>;
  stopWords: string[];
  numberMappings: Record<string, number>;
  unitMappings: Record<string, string>;
}

class NaturalLanguageProcessingService {
  private languageModels: Map<string, LanguageModel> = new Map();
  private currentLanguage = 'ja-JP';
  
  // 基本的なインテント
  private intents = [
    'ADD_PRODUCT',
    'REMOVE_PRODUCT', 
    'UPDATE_PRODUCT',
    'SEARCH_PRODUCT',
    'CHECK_INVENTORY',
    'DELETE_PRODUCT',
    'SHOW_EXPIRY',
    'SHOW_ANALYTICS',
    'OPEN_SETTINGS',
    'HELP',
    'CANCEL',
  ];

  constructor() {
    this.initializeLanguageModels();
  }

  /**
   * 言語モデル初期化
   */
  private initializeLanguageModels(): void {
    console.log('🧠 Initializing NLP language models...');
    
    // 日本語モデル
    this.languageModels.set('ja-JP', this.createJapaneseModel());
    
    // 英語モデル
    this.languageModels.set('en-US', this.createEnglishModel());
    
    console.log('✅ NLP language models initialized');
  }

  /**
   * 日本語言語モデル作成
   */
  private createJapaneseModel(): LanguageModel {
    return {
      language: 'ja-JP',
      patterns: [
        // 商品追加パターン
        {
          pattern: /(.+?)\s*(?:を|が|)\s*(\d+|[一二三四五六七八九十百千万億兆]+)\s*(?:個|つ|本|枚|袋|パック|ケース|セット|)\s*(?:追加|加える|入れる|登録)/i,
          intent: 'ADD_PRODUCT',
          entities: ['product_name', 'quantity'],
          confidence: 0.9,
          language: 'ja-JP',
        },
        {
          pattern: /(\d+|[一二三四五六七八九十百千万億兆]+)\s*(?:個|つ|本|枚|袋|パック|ケース|セット|)\s*(?:の|)\s*(.+?)\s*(?:を|が|)\s*(?:追加|加える|入れる|登録)/i,
          intent: 'ADD_PRODUCT',
          entities: ['quantity', 'product_name'],
          confidence: 0.85,
          language: 'ja-JP',
        },
        
        // 商品削除パターン
        {
          pattern: /(.+?)\s*(?:を|が|)\s*(?:削除|消す|取り除く|除く)/i,
          intent: 'REMOVE_PRODUCT',
          entities: ['product_name'],
          confidence: 0.9,
          language: 'ja-JP',
        },
        
        // 商品検索パターン
        {
          pattern: /(.+?)\s*(?:を|が|)\s*(?:探す|検索|調べる|見つける|探して)/i,
          intent: 'SEARCH_PRODUCT',
          entities: ['product_name'],
          confidence: 0.85,
          language: 'ja-JP',
        },
        
        // 在庫確認パターン
        {
          pattern: /(.+?)\s*(?:の|)\s*(?:在庫|残り|数量|個数)\s*(?:を|が|は|)\s*(?:確認|チェック|見る|調べる)/i,
          intent: 'CHECK_INVENTORY',
          entities: ['product_name'],
          confidence: 0.8,
          language: 'ja-JP',
        },
        
        // 期限確認パターン
        {
          pattern: /(?:期限|消費期限|賞味期限)\s*(?:を|が|)\s*(?:確認|チェック|見る|調べる)/i,
          intent: 'SHOW_EXPIRY',
          entities: [],
          confidence: 0.9,
          language: 'ja-JP',
        },
        
        // 設定パターン
        {
          pattern: /(?:設定|せってい)\s*(?:を|が|)\s*(?:開く|開いて|見る|表示)/i,
          intent: 'OPEN_SETTINGS',
          entities: [],
          confidence: 0.9,
          language: 'ja-JP',
        },
        
        // ヘルプパターン
        {
          pattern: /(?:ヘルプ|助けて|手伝って|使い方|操作方法)/i,
          intent: 'HELP',
          entities: [],
          confidence: 0.9,
          language: 'ja-JP',
        },
        
        // キャンセルパターン
        {
          pattern: /(?:キャンセル|取り消し|やめる|中止|停止)/i,
          intent: 'CANCEL',
          entities: [],
          confidence: 0.95,
          language: 'ja-JP',
        },
      ],
      
      synonyms: {
        'りんご': ['りんご', 'アップル', 'apple', 'リンゴ'],
        'バナナ': ['バナナ', 'ばなな', 'banana'],
        'みかん': ['みかん', 'ミカン', 'オレンジ', 'orange'],
        '牛乳': ['牛乳', 'ミルク', 'milk', 'ぎゅうにゅう'],
        'パン': ['パン', 'ぱん', 'bread', 'ブレッド'],
        '卵': ['卵', 'たまご', 'egg', 'エッグ'],
        '追加': ['追加', '加える', '入れる', '登録', 'add'],
        '削除': ['削除', '消す', '取り除く', '除く', 'delete', 'remove'],
        '検索': ['検索', '探す', '調べる', '見つける', 'search', 'find'],
      },
      
      stopWords: [
        'を', 'が', 'に', 'の', 'は', 'で', 'と', 'も', 'から', 'まで',
        'について', 'により', 'によって', 'として', 'という', 'である',
        'です', 'ます', 'だ', 'である', 'ください', 'して', 'した',
      ],
      
      numberMappings: {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '百': 100, '千': 1000, '万': 10000,
        'ひとつ': 1, 'ふたつ': 2, 'みっつ': 3, 'よっつ': 4, 'いつつ': 5,
        'むっつ': 6, 'ななつ': 7, 'やっつ': 8, 'ここのつ': 9, 'とお': 10,
      },
      
      unitMappings: {
        '個': 'piece', 'つ': 'piece', '本': 'bottle', '枚': 'sheet',
        '袋': 'bag', 'パック': 'pack', 'ケース': 'case', 'セット': 'set',
        'グラム': 'gram', 'キロ': 'kilogram', 'リットル': 'liter',
      },
    };
  }

  /**
   * 英語言語モデル作成
   */
  private createEnglishModel(): LanguageModel {
    return {
      language: 'en-US',
      patterns: [
        // Add product patterns
        {
          pattern: /add\s+(\d+)\s+(.+?)(?:\s+to\s+(?:inventory|list|cart))?/i,
          intent: 'ADD_PRODUCT',
          entities: ['quantity', 'product_name'],
          confidence: 0.9,
          language: 'en-US',
        },
        {
          pattern: /add\s+(.+?)(?:\s+(\d+))?(?:\s+to\s+(?:inventory|list|cart))?/i,
          intent: 'ADD_PRODUCT',
          entities: ['product_name', 'quantity'],
          confidence: 0.85,
          language: 'en-US',
        },
        
        // Remove product patterns
        {
          pattern: /(?:remove|delete)\s+(.+?)(?:\s+from\s+(?:inventory|list|cart))?/i,
          intent: 'REMOVE_PRODUCT',
          entities: ['product_name'],
          confidence: 0.9,
          language: 'en-US',
        },
        
        // Search patterns
        {
          pattern: /(?:search|find|look\s+for)\s+(.+)/i,
          intent: 'SEARCH_PRODUCT',
          entities: ['product_name'],
          confidence: 0.85,
          language: 'en-US',
        },
        
        // Check inventory patterns
        {
          pattern: /(?:check|show)\s+(?:inventory|stock)\s+(?:of\s+)?(.+)/i,
          intent: 'CHECK_INVENTORY',
          entities: ['product_name'],
          confidence: 0.8,
          language: 'en-US',
        },
        
        // Expiry patterns
        {
          pattern: /(?:check|show)\s+(?:expiry|expiration)\s*(?:dates?)?/i,
          intent: 'SHOW_EXPIRY',
          entities: [],
          confidence: 0.9,
          language: 'en-US',
        },
        
        // Settings patterns
        {
          pattern: /(?:open|show)\s+settings/i,
          intent: 'OPEN_SETTINGS',
          entities: [],
          confidence: 0.9,
          language: 'en-US',
        },
        
        // Help patterns
        {
          pattern: /(?:help|assist|guide)/i,
          intent: 'HELP',
          entities: [],
          confidence: 0.9,
          language: 'en-US',
        },
        
        // Cancel patterns
        {
          pattern: /(?:cancel|stop|abort|quit)/i,
          intent: 'CANCEL',
          entities: [],
          confidence: 0.95,
          language: 'en-US',
        },
      ],
      
      synonyms: {
        'apple': ['apple', 'apples'],
        'banana': ['banana', 'bananas'],
        'orange': ['orange', 'oranges'],
        'milk': ['milk'],
        'bread': ['bread', 'loaf'],
        'egg': ['egg', 'eggs'],
        'add': ['add', 'insert', 'put', 'place'],
        'remove': ['remove', 'delete', 'take out', 'eliminate'],
        'search': ['search', 'find', 'look for', 'locate'],
      },
      
      stopWords: [
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'about', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
        'over', 'under', 'again', 'further', 'then', 'once',
      ],
      
      numberMappings: {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      },
      
      unitMappings: {
        'piece': 'piece', 'pieces': 'piece', 'bottle': 'bottle', 'bottles': 'bottle',
        'bag': 'bag', 'bags': 'bag', 'pack': 'pack', 'packs': 'pack',
        'case': 'case', 'cases': 'case', 'set': 'set', 'sets': 'set',
        'gram': 'gram', 'grams': 'gram', 'kilogram': 'kilogram', 'kg': 'kilogram',
        'liter': 'liter', 'liters': 'liter', 'ml': 'milliliter',
      },
    };
  }

  /**
   * テキスト解析
   */
  async parseText(text: string, language?: string): Promise<ParsedCommand | null> {
    const targetLanguage = language || this.currentLanguage;
    const model = this.languageModels.get(targetLanguage);
    
    if (!model) {
      console.warn(`Language model not found for: ${targetLanguage}`);
      return null;
    }
    
    console.log(`🧠 Parsing text: "${text}" (${targetLanguage})`);
    
    // テキスト正規化
    const normalizedText = this.normalizeText(text, model);
    
    // パターンマッチング
    for (const pattern of model.patterns) {
      const match = normalizedText.match(pattern.pattern);
      
      if (match) {
        console.log(`✅ Pattern matched: ${pattern.intent}`);
        
        const entities = this.extractEntities(match, pattern, model);
        
        return {
          intent: pattern.intent,
          entities,
          confidence: pattern.confidence,
          originalText: text,
          language: targetLanguage,
          normalizedText,
        };
      }
    }
    
    // フォールバック: 基本的なキーワード検索
    return this.fallbackParsing(normalizedText, model, text, targetLanguage);
  }

  /**
   * テキスト正規化
   */
  private normalizeText(text: string, model: LanguageModel): string {
    let normalized = text.toLowerCase().trim();
    
    // 同義語置換
    for (const [canonical, synonyms] of Object.entries(model.synonyms)) {
      for (const synonym of synonyms) {
        const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
        normalized = normalized.replace(regex, canonical);
      }
    }
    
    // 数字の正規化
    for (const [word, number] of Object.entries(model.numberMappings)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, number.toString());
    }
    
    // 不要な文字を除去
    normalized = normalized.replace(/[。、！？\.\,\!\?]/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  /**
   * エンティティ抽出
   */
  private extractEntities(match: RegExpMatchArray, pattern: NLPPattern, model: LanguageModel): ParsedCommand['entities'] {
    const entities: ParsedCommand['entities'] = [];
    
    for (let i = 0; i < pattern.entities.length && i + 1 < match.length; i++) {
      const entityType = pattern.entities[i];
      const entityValue = match[i + 1];
      
      if (entityValue) {
        let processedValue = entityValue.trim();
        let confidence = 0.8;
        
        // 数量の処理
        if (entityType === 'quantity') {
          const quantity = this.parseQuantity(processedValue, model);
          processedValue = quantity.toString();
          confidence = 0.9;
        }
        
        // 商品名の処理
        if (entityType === 'product_name') {
          processedValue = this.normalizeProductName(processedValue, model);
          confidence = 0.85;
        }
        
        entities.push({
          type: entityType,
          value: processedValue,
          confidence,
          startIndex: match.index || 0,
          endIndex: (match.index || 0) + entityValue.length,
        });
      }
    }
    
    return entities;
  }

  /**
   * 数量解析
   */
  private parseQuantity(text: string, model: LanguageModel): number {
    // 数字の場合
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
      return parseInt(numberMatch[0], 10);
    }
    
    // 文字の数字の場合
    const wordNumber = model.numberMappings[text.toLowerCase()];
    if (wordNumber) {
      return wordNumber;
    }
    
    // デフォルト
    return 1;
  }

  /**
   * 商品名正規化
   */
  private normalizeProductName(name: string, model: LanguageModel): string {
    let normalized = name.toLowerCase().trim();
    
    // ストップワード除去
    const words = normalized.split(' ');
    const filteredWords = words.filter(word => !model.stopWords.includes(word));
    
    return filteredWords.join(' ');
  }

  /**
   * フォールバック解析
   */
  private fallbackParsing(text: string, model: LanguageModel, originalText: string, language: string): ParsedCommand | null {
    console.log('🔍 Attempting fallback parsing');
    
    // キーワードベース解析
    const addKeywords = ['追加', '加える', '入れる', '登録', 'add', 'insert'];
    const removeKeywords = ['削除', '消す', '取り除く', 'remove', 'delete'];
    const searchKeywords = ['検索', '探す', '調べる', 'search', 'find'];
    
    let intent = 'UNKNOWN';
    let confidence = 0.5;
    
    if (addKeywords.some(keyword => text.includes(keyword))) {
      intent = 'ADD_PRODUCT';
      confidence = 0.6;
    } else if (removeKeywords.some(keyword => text.includes(keyword))) {
      intent = 'REMOVE_PRODUCT';
      confidence = 0.6;
    } else if (searchKeywords.some(keyword => text.includes(keyword))) {
      intent = 'SEARCH_PRODUCT';
      confidence = 0.6;
    }
    
    // 基本的な商品名抽出
    const productWords = text.split(' ').filter(word => 
      !model.stopWords.includes(word) && 
      !addKeywords.includes(word) &&
      !removeKeywords.includes(word) &&
      !searchKeywords.includes(word)
    );
    
    const entities: ParsedCommand['entities'] = [];
    
    if (productWords.length > 0) {
      entities.push({
        type: 'product_name',
        value: productWords.join(' '),
        confidence: 0.5,
        startIndex: 0,
        endIndex: productWords.join(' ').length,
      });
    }
    
    return {
      intent,
      entities,
      confidence,
      originalText,
      language,
      normalizedText: text,
    };
  }

  /**
   * 商品エンティティ抽出
   */
  extractProductEntity(command: ParsedCommand): ProductEntity | null {
    const productNameEntity = command.entities.find(e => e.type === 'product_name');
    const quantityEntity = command.entities.find(e => e.type === 'quantity');
    
    if (!productNameEntity) {
      return null;
    }
    
    const quantity = quantityEntity ? parseInt(quantityEntity.value, 10) : 1;
    
    return {
      name: productNameEntity.value,
      quantity: isNaN(quantity) ? 1 : quantity,
      unit: 'piece', // デフォルト単位
      confidence: productNameEntity.confidence,
    };
  }

  /**
   * アクションエンティティ抽出
   */
  extractActionEntity(command: ParsedCommand): ActionEntity | null {
    const actionMap: Record<string, ActionEntity['action']> = {
      'ADD_PRODUCT': 'add',
      'REMOVE_PRODUCT': 'remove',
      'UPDATE_PRODUCT': 'update',
      'SEARCH_PRODUCT': 'search',
      'CHECK_INVENTORY': 'check',
      'DELETE_PRODUCT': 'delete',
    };
    
    const action = actionMap[command.intent];
    
    if (!action) {
      return null;
    }
    
    return {
      action,
      confidence: command.confidence,
    };
  }

  /**
   * 言語設定
   */
  setLanguage(language: string): void {
    if (this.languageModels.has(language)) {
      this.currentLanguage = language;
      console.log(`🌐 NLP language set to: ${language}`);
    } else {
      console.warn(`Language not supported: ${language}`);
    }
  }

  /**
   * サポート言語取得
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languageModels.keys());
  }

  /**
   * インテント信頼度しきい値チェック
   */
  isConfidenceAcceptable(command: ParsedCommand, threshold = 0.6): boolean {
    return command.confidence >= threshold;
  }

  /**
   * コマンド候補生成
   */
  generateSuggestions(partialText: string, language?: string): string[] {
    const targetLanguage = language || this.currentLanguage;
    const model = this.languageModels.get(targetLanguage);
    
    if (!model) {
      return [];
    }
    
    const suggestions: string[] = [];
    
    // よく使われるコマンドパターンに基づく提案
    if (targetLanguage === 'ja-JP') {
      suggestions.push(
        'りんごを3つ追加',
        'バナナを削除',
        '牛乳を検索',
        '期限を確認',
        '設定を開く'
      );
    } else if (targetLanguage === 'en-US') {
      suggestions.push(
        'add 3 apples',
        'remove banana',
        'search milk',
        'check expiry',
        'open settings'
      );
    }
    
    // 部分一致によるフィルタリング
    return suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(partialText.toLowerCase())
    );
  }
}

export const nlpService = new NaturalLanguageProcessingService();
