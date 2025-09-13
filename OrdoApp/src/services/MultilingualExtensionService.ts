/**
 * Multilingual Extension Service
 * 多言語対応の拡張サービス
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface LanguageModel {
  code: string;
  name: string;
  nativeName: string;
  voiceCode: string;
  rtl: boolean;
  patterns: {
    commands: Record<string, string[]>;
    entities: Record<string, string[]>;
    numbers: Record<string, string>;
    units: Record<string, string[]>;
    confirmations: string[];
    negations: string[];
    greetings: string[];
    farewells: string[];
  };
  responses: {
    success: Record<string, string>;
    errors: Record<string, string>;
    confirmations: Record<string, string>;
    help: Record<string, string>;
  };
  culturalAdaptations: {
    dateFormat: string;
    numberFormat: string;
    currencyFormat: string;
    timeFormat: string;
    addressFormat: string;
    nameFormat: string;
  };
}

export interface LocalizationContext {
  userId: string;
  preferredLanguage: string;
  fallbackLanguage: string;
  region: string;
  timezone: string;
  currency: string;
  measurements: 'metric' | 'imperial';
  culturalPreferences: Record<string, any>;
}

export interface TranslationMemory {
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  context: string;
  timestamp: number;
  usage_count: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

class MultilingualExtensionService {
  private languageModels: Map<string, LanguageModel> = new Map();
  private currentLanguage = 'ja-JP';
  private fallbackLanguage = 'en-US';
  private localizationContext: LocalizationContext | null = null;
  private translationMemory: TranslationMemory[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeLanguageModels();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🌏 Initializing Multilingual Extension Service...');
    
    try {
      // 保存された設定を読み込み
      await this.loadPersistedSettings();
      
      // デバイスの言語設定を検出
      await this.detectDeviceLanguage();
      
      // 翻訳メモリを読み込み
      await this.loadTranslationMemory();
      
      this.isInitialized = true;
      console.log('✅ Multilingual Extension Service initialized');
      console.log(`Current language: ${this.currentLanguage}`);
      
    } catch (error) {
      console.error('Failed to initialize multilingual service:', error);
      throw error;
    }
  }

  /**
   * 言語モデル初期化
   */
  private initializeLanguageModels(): void {
    // 日本語モデル
    const japaneseModel: LanguageModel = {
      code: 'ja-JP',
      name: 'Japanese',
      nativeName: '日本語',
      voiceCode: 'ja-JP',
      rtl: false,
      patterns: {
        commands: {
          ADD_PRODUCT: ['追加', '足す', '入れる', '登録', 'つい加', 'ついか'],
          REMOVE_PRODUCT: ['削除', '消す', '取る', '除く', 'さくじょ', 'けす'],
          SEARCH_PRODUCT: ['検索', '探す', '見つける', '調べる', 'けんさく', 'さがす'],
          CHECK_INVENTORY: ['在庫', '確認', 'チェック', '状況', 'ざいこ', 'かくにん'],
          SHOW_EXPIRY: ['期限', '賞味期限', '消費期限', 'きげん', 'しょうみきげん'],
          OPEN_SETTINGS: ['設定', 'せってい', 'オプション'],
          HELP: ['ヘルプ', '助け', '使い方', 'たすけ', 'つかいかた'],
          CANCEL: ['キャンセル', '中止', '停止', 'やめる', 'ちゅうし'],
        },
        entities: {
          PRODUCT: ['商品', '製品', '品物', 'アイテム', 'しょうひん', 'せいひん'],
          QUANTITY: ['個', 'つ', '本', '枚', '袋', 'パック', 'kg', 'g', 'L', 'ml'],
          LOCATION: ['冷蔵庫', '冷凍庫', 'パントリー', '棚', 'れいぞうこ', 'れいとうこ'],
        },
        numbers: {
          '0': 'ゼロ|零|〇',
          '1': '一|いち|ひとつ|１',
          '2': '二|に|ふたつ|２',
          '3': '三|さん|みっつ|３',
          '4': '四|よん|し|よっつ|４',
          '5': '五|ご|いつつ|５',
          '6': '六|ろく|むっつ|６',
          '7': '七|なな|しち|ななつ|７',
          '8': '八|はち|やっつ|８',
          '9': '九|きゅう|く|ここのつ|９',
          '10': '十|じゅう|とお|１０',
        },
        units: {
          PIECE: ['個', 'つ', 'コ'],
          BOTTLE: ['本', '瓶', 'ほん', 'びん'],
          SHEET: ['枚', 'まい'],
          BAG: ['袋', '包', 'ふくろ', 'つつみ'],
          PACK: ['パック', 'セット'],
          WEIGHT: ['kg', 'キロ', 'g', 'グラム'],
          VOLUME: ['L', 'リットル', 'ml', 'ミリリットル'],
        },
        confirmations: ['はい', 'そう', 'うん', 'OK', 'オーケー', 'イエス'],
        negations: ['いいえ', 'いや', 'だめ', 'ちがう', 'ノー'],
        greetings: ['こんにちは', 'おはよう', 'こんばんは', 'やあ'],
        farewells: ['さようなら', 'また', 'バイバイ', 'おつかれ'],
      },
      responses: {
        success: {
          PRODUCT_ADDED: '{product}を{quantity}{unit}追加しました。',
          PRODUCT_REMOVED: '{product}を削除しました。',
          SEARCH_COMPLETED: '{product}の検索が完了しました。',
          INVENTORY_CHECKED: '在庫を確認しました。',
          EXPIRY_CHECKED: '期限を確認しました。',
        },
        errors: {
          PRODUCT_NOT_FOUND: '{product}が見つかりませんでした。',
          INVALID_QUANTITY: '数量が無効です。',
          NETWORK_ERROR: 'ネットワークエラーが発生しました。',
          VOICE_NOT_RECOGNIZED: '音声を認識できませんでした。',
          PERMISSION_DENIED: 'マイクの権限が必要です。',
        },
        confirmations: {
          DELETE_PRODUCT: '{product}を削除しますか？',
          ADD_PRODUCT: '{product}を{quantity}{unit}追加しますか？',
          CLEAR_INVENTORY: '在庫をすべてクリアしますか？',
        },
        help: {
          VOICE_COMMANDS: '音声コマンドのヘルプ',
          BASIC_USAGE: '基本的な使い方',
          EXAMPLES: '使用例',
        },
      },
      culturalAdaptations: {
        dateFormat: 'YYYY年MM月DD日',
        numberFormat: '#,##0',
        currencyFormat: '¥#,##0',
        timeFormat: 'HH:mm',
        addressFormat: '{postal} {prefecture}{city}{address}',
        nameFormat: '{family} {given}',
      },
    };

    // 英語モデル
    const englishModel: LanguageModel = {
      code: 'en-US',
      name: 'English',
      nativeName: 'English',
      voiceCode: 'en-US',
      rtl: false,
      patterns: {
        commands: {
          ADD_PRODUCT: ['add', 'insert', 'put', 'include', 'create'],
          REMOVE_PRODUCT: ['remove', 'delete', 'take out', 'eliminate'],
          SEARCH_PRODUCT: ['search', 'find', 'look for', 'locate'],
          CHECK_INVENTORY: ['check', 'inventory', 'status', 'stock'],
          SHOW_EXPIRY: ['expiry', 'expiration', 'expire', 'best before'],
          OPEN_SETTINGS: ['settings', 'options', 'preferences', 'config'],
          HELP: ['help', 'assist', 'guide', 'tutorial'],
          CANCEL: ['cancel', 'stop', 'abort', 'quit'],
        },
        entities: {
          PRODUCT: ['product', 'item', 'thing', 'stuff'],
          QUANTITY: ['piece', 'unit', 'bottle', 'pack', 'kg', 'g', 'L', 'ml'],
          LOCATION: ['fridge', 'freezer', 'pantry', 'shelf'],
        },
        numbers: {
          '0': 'zero|none',
          '1': 'one|a|an|single',
          '2': 'two|pair|couple',
          '3': 'three',
          '4': 'four',
          '5': 'five',
          '6': 'six',
          '7': 'seven',
          '8': 'eight',
          '9': 'nine',
          '10': 'ten',
        },
        units: {
          PIECE: ['piece', 'pieces', 'unit', 'units'],
          BOTTLE: ['bottle', 'bottles'],
          SHEET: ['sheet', 'sheets'],
          BAG: ['bag', 'bags', 'package', 'packages'],
          PACK: ['pack', 'packs', 'set', 'sets'],
          WEIGHT: ['kg', 'kilogram', 'g', 'gram', 'lb', 'pound'],
          VOLUME: ['L', 'liter', 'ml', 'milliliter', 'gallon', 'cup'],
        },
        confirmations: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay'],
        negations: ['no', 'nope', 'nah', 'never'],
        greetings: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        farewells: ['goodbye', 'bye', 'see you', 'farewell'],
      },
      responses: {
        success: {
          PRODUCT_ADDED: 'Added {quantity} {unit} of {product}.',
          PRODUCT_REMOVED: 'Removed {product}.',
          SEARCH_COMPLETED: 'Search for {product} completed.',
          INVENTORY_CHECKED: 'Inventory checked.',
          EXPIRY_CHECKED: 'Expiry dates checked.',
        },
        errors: {
          PRODUCT_NOT_FOUND: '{product} not found.',
          INVALID_QUANTITY: 'Invalid quantity.',
          NETWORK_ERROR: 'Network error occurred.',
          VOICE_NOT_RECOGNIZED: 'Voice not recognized.',
          PERMISSION_DENIED: 'Microphone permission required.',
        },
        confirmations: {
          DELETE_PRODUCT: 'Delete {product}?',
          ADD_PRODUCT: 'Add {quantity} {unit} of {product}?',
          CLEAR_INVENTORY: 'Clear all inventory?',
        },
        help: {
          VOICE_COMMANDS: 'Voice Commands Help',
          BASIC_USAGE: 'Basic Usage',
          EXAMPLES: 'Examples',
        },
      },
      culturalAdaptations: {
        dateFormat: 'MM/DD/YYYY',
        numberFormat: '#,##0',
        currencyFormat: '$#,##0.00',
        timeFormat: 'h:mm a',
        addressFormat: '{address}, {city}, {state} {postal}',
        nameFormat: '{given} {family}',
      },
    };

    // 中国語（簡体字）モデル
    const chineseModel: LanguageModel = {
      code: 'zh-CN',
      name: 'Chinese (Simplified)',
      nativeName: '中文（简体）',
      voiceCode: 'zh-CN',
      rtl: false,
      patterns: {
        commands: {
          ADD_PRODUCT: ['添加', '加入', '放入', '增加'],
          REMOVE_PRODUCT: ['删除', '移除', '去掉', '拿走'],
          SEARCH_PRODUCT: ['搜索', '查找', '寻找', '找'],
          CHECK_INVENTORY: ['检查', '库存', '查看', '状态'],
          SHOW_EXPIRY: ['期限', '保质期', '有效期', '过期'],
          OPEN_SETTINGS: ['设置', '选项', '配置'],
          HELP: ['帮助', '协助', '指南'],
          CANCEL: ['取消', '停止', '中止'],
        },
        entities: {
          PRODUCT: ['产品', '商品', '物品', '东西'],
          QUANTITY: ['个', '件', '瓶', '包', 'kg', 'g', 'L', 'ml'],
          LOCATION: ['冰箱', '冷冻室', '储藏室', '架子'],
        },
        numbers: {
          '0': '零',
          '1': '一|壹',
          '2': '二|贰|两',
          '3': '三|叁',
          '4': '四|肆',
          '5': '五|伍',
          '6': '六|陆',
          '7': '七|柒',
          '8': '八|捌',
          '9': '九|玖',
          '10': '十|拾',
        },
        units: {
          PIECE: ['个', '件'],
          BOTTLE: ['瓶', '支'],
          SHEET: ['张', '片'],
          BAG: ['包', '袋'],
          PACK: ['包', '套'],
          WEIGHT: ['kg', '公斤', 'g', '克'],
          VOLUME: ['L', '升', 'ml', '毫升'],
        },
        confirmations: ['是', '对', '好', '确定'],
        negations: ['不', '否', '不是', '不对'],
        greetings: ['你好', '早上好', '下午好', '晚上好'],
        farewells: ['再见', '拜拜', '再会'],
      },
      responses: {
        success: {
          PRODUCT_ADDED: '已添加{quantity}{unit}{product}。',
          PRODUCT_REMOVED: '已删除{product}。',
          SEARCH_COMPLETED: '{product}搜索完成。',
          INVENTORY_CHECKED: '库存已检查。',
          EXPIRY_CHECKED: '保质期已检查。',
        },
        errors: {
          PRODUCT_NOT_FOUND: '未找到{product}。',
          INVALID_QUANTITY: '数量无效。',
          NETWORK_ERROR: '网络错误。',
          VOICE_NOT_RECOGNIZED: '语音未识别。',
          PERMISSION_DENIED: '需要麦克风权限。',
        },
        confirmations: {
          DELETE_PRODUCT: '删除{product}？',
          ADD_PRODUCT: '添加{quantity}{unit}{product}？',
          CLEAR_INVENTORY: '清空所有库存？',
        },
        help: {
          VOICE_COMMANDS: '语音命令帮助',
          BASIC_USAGE: '基本用法',
          EXAMPLES: '示例',
        },
      },
      culturalAdaptations: {
        dateFormat: 'YYYY年MM月DD日',
        numberFormat: '#,##0',
        currencyFormat: '¥#,##0.00',
        timeFormat: 'HH:mm',
        addressFormat: '{province}{city}{district}{address}',
        nameFormat: '{family}{given}',
      },
    };

    // 言語モデルを登録
    this.languageModels.set('ja-JP', japaneseModel);
    this.languageModels.set('en-US', englishModel);
    this.languageModels.set('zh-CN', chineseModel);
    
    console.log(`📚 Initialized ${this.languageModels.size} language models`);
  }

  /**
   * 保存された設定を読み込み
   */
  private async loadPersistedSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('@multilingual_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        this.currentLanguage = settings.currentLanguage || this.currentLanguage;
        this.fallbackLanguage = settings.fallbackLanguage || this.fallbackLanguage;
        this.localizationContext = settings.localizationContext || null;
      }
    } catch (error) {
      console.warn('Failed to load persisted multilingual settings:', error);
    }
  }

  /**
   * デバイスの言語設定を検出
   */
  private async detectDeviceLanguage(): Promise<void> {
    try {
      const deviceLanguage = 'ja-JP'; // 実際の実装では Platform.select や I18nManager を使用
      
      if (this.languageModels.has(deviceLanguage)) {
        this.currentLanguage = deviceLanguage;
        console.log(`📱 Detected device language: ${deviceLanguage}`);
      } else {
        console.log(`📱 Device language ${deviceLanguage} not supported, using ${this.currentLanguage}`);
      }
    } catch (error) {
      console.warn('Failed to detect device language:', error);
    }
  }

  /**
   * 翻訳メモリを読み込み
   */
  private async loadTranslationMemory(): Promise<void> {
    try {
      const memoryJson = await AsyncStorage.getItem('@translation_memory');
      if (memoryJson) {
        this.translationMemory = JSON.parse(memoryJson);
        console.log(`💾 Loaded ${this.translationMemory.length} translation entries`);
      }
    } catch (error) {
      console.warn('Failed to load translation memory:', error);
    }
  }

  /**
   * 設定を保存
   */
  private async persistSettings(): Promise<void> {
    try {
      const settings = {
        currentLanguage: this.currentLanguage,
        fallbackLanguage: this.fallbackLanguage,
        localizationContext: this.localizationContext,
      };
      
      await AsyncStorage.setItem('@multilingual_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to persist multilingual settings:', error);
    }
  }

  /**
   * 翻訳メモリを保存
   */
  private async persistTranslationMemory(): Promise<void> {
    try {
      await AsyncStorage.setItem('@translation_memory', JSON.stringify(this.translationMemory));
    } catch (error) {
      console.error('Failed to persist translation memory:', error);
    }
  }

  // === 公開API ===

  /**
   * 言語変更
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!this.languageModels.has(languageCode)) {
      throw new Error(`Language ${languageCode} is not supported`);
    }
    
    this.currentLanguage = languageCode;
    await this.persistSettings();
    
    console.log(`🌏 Language changed to: ${languageCode}`);
  }

  /**
   * 現在の言語取得
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * サポート言語一覧取得
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languageModels.keys());
  }

  /**
   * 言語モデル取得
   */
  getLanguageModel(languageCode?: string): LanguageModel | null {
    const code = languageCode || this.currentLanguage;
    return this.languageModels.get(code) || null;
  }

  /**
   * パターンマッチング
   */
  matchPattern(text: string, patternType: string, languageCode?: string): string[] {
    const model = this.getLanguageModel(languageCode);
    if (!model) return [];
    
    const patterns = model.patterns[patternType as keyof typeof model.patterns] as Record<string, string[]>;
    if (!patterns) return [];
    
    const matches: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const [key, values] of Object.entries(patterns)) {
      if (Array.isArray(values)) {
        for (const pattern of values) {
          if (lowerText.includes(pattern.toLowerCase())) {
            matches.push(key);
            break;
          }
        }
      }
    }
    
    return matches;
  }

  /**
   * 数値パターンマッチング
   */
  matchNumber(text: string, languageCode?: string): number | null {
    const model = this.getLanguageModel(languageCode);
    if (!model) return null;
    
    const lowerText = text.toLowerCase();
    
    for (const [numStr, patterns] of Object.entries(model.patterns.numbers)) {
      const patternList = patterns.split('|');
      for (const pattern of patternList) {
        if (lowerText.includes(pattern.toLowerCase())) {
          return parseInt(numStr, 10);
        }
      }
    }
    
    // アラビア数字のマッチング
    const arabicMatch = text.match(/\d+/);
    if (arabicMatch) {
      return parseInt(arabicMatch[0], 10);
    }
    
    return null;
  }

  /**
   * 単位パターンマッチング
   */
  matchUnit(text: string, languageCode?: string): string | null {
    const model = this.getLanguageModel(languageCode);
    if (!model) return null;
    
    const lowerText = text.toLowerCase();
    
    for (const [unitType, patterns] of Object.entries(model.patterns.units)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          return pattern;
        }
      }
    }
    
    return null;
  }

  /**
   * レスポンステンプレート取得
   */
  getResponse(key: string, category: 'success' | 'errors' | 'confirmations' | 'help', variables?: Record<string, any>, languageCode?: string): string {
    const model = this.getLanguageModel(languageCode);
    if (!model) return key;
    
    let template = model.responses[category][key];
    if (!template) {
      // フォールバック言語で再試行
      const fallbackModel = this.getLanguageModel(this.fallbackLanguage);
      template = fallbackModel?.responses[category][key] || key;
    }
    
    // 変数置換
    if (variables) {
      for (const [varName, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`{${varName}}`, 'g'), String(value));
      }
    }
    
    return template;
  }

  /**
   * 言語検出
   */
  detectLanguage(text: string): LanguageDetectionResult {
    const scores: Array<{ language: string; score: number }> = [];
    
    for (const [langCode, model] of this.languageModels.entries()) {
      let score = 0;
      let totalPatterns = 0;
      
      // コマンドパターンのマッチング
      for (const patterns of Object.values(model.patterns.commands)) {
        totalPatterns += patterns.length;
        for (const pattern of patterns) {
          if (text.toLowerCase().includes(pattern.toLowerCase())) {
            score += 10;
          }
        }
      }
      
      // エンティティパターンのマッチング
      for (const patterns of Object.values(model.patterns.entities)) {
        totalPatterns += patterns.length;
        for (const pattern of patterns) {
          if (text.toLowerCase().includes(pattern.toLowerCase())) {
            score += 5;
          }
        }
      }
      
      // 数値パターンのマッチング
      for (const patterns of Object.values(model.patterns.numbers)) {
        const patternList = patterns.split('|');
        totalPatterns += patternList.length;
        for (const pattern of patternList) {
          if (text.toLowerCase().includes(pattern.toLowerCase())) {
            score += 3;
          }
        }
      }
      
      // 正規化されたスコア
      const normalizedScore = totalPatterns > 0 ? score / totalPatterns : 0;
      scores.push({ language: langCode, score: normalizedScore });
    }
    
    // スコア順にソート
    scores.sort((a, b) => b.score - a.score);
    
    const topScore = scores[0]?.score || 0;
    const confidence = Math.min(topScore, 1.0);
    
    return {
      language: scores[0]?.language || this.currentLanguage,
      confidence,
      alternatives: scores.slice(1, 3).map(s => ({
        language: s.language,
        confidence: Math.min(s.score, 1.0),
      })),
    };
  }

  /**
   * 文化的適応
   */
  formatCultural(value: any, type: 'date' | 'number' | 'currency' | 'time' | 'address' | 'name', languageCode?: string): string {
    const model = this.getLanguageModel(languageCode);
    if (!model) return String(value);
    
    const format = model.culturalAdaptations[`${type}Format` as keyof typeof model.culturalAdaptations];
    
    switch (type) {
      case 'date':
        if (value instanceof Date) {
          return this.formatDate(value, format);
        }
        break;
      case 'number':
        if (typeof value === 'number') {
          return this.formatNumber(value, format);
        }
        break;
      case 'currency':
        if (typeof value === 'number') {
          return this.formatCurrency(value, format);
        }
        break;
      case 'time':
        if (value instanceof Date) {
          return this.formatTime(value, format);
        }
        break;
      default:
        return String(value);
    }
    
    return String(value);
  }

  /**
   * 日付フォーマット
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * 数値フォーマット
   */
  private formatNumber(num: number, format: string): string {
    return num.toLocaleString(this.currentLanguage);
  }

  /**
   * 通貨フォーマット
   */
  private formatCurrency(amount: number, format: string): string {
    const formatted = amount.toLocaleString(this.currentLanguage);
    return format.replace('#,##0', formatted).replace('#,##0.00', formatted);
  }

  /**
   * 時刻フォーマット
   */
  private formatTime(time: Date, format: string): string {
    const hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2, '0');
    
    if (format.includes('a')) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }

  /**
   * 翻訳メモリ検索
   */
  searchTranslationMemory(sourceText: string, sourceLanguage: string, targetLanguage: string): TranslationMemory | null {
    return this.translationMemory.find(entry =>
      entry.sourceText.toLowerCase() === sourceText.toLowerCase() &&
      entry.sourceLanguage === sourceLanguage &&
      entry.targetLanguage === targetLanguage
    ) || null;
  }

  /**
   * 翻訳メモリ追加
   */
  addToTranslationMemory(entry: Omit<TranslationMemory, 'timestamp' | 'usage_count'>): void {
    const existingEntry = this.searchTranslationMemory(entry.sourceText, entry.sourceLanguage, entry.targetLanguage);
    
    if (existingEntry) {
      existingEntry.usage_count++;
      existingEntry.targetText = entry.targetText;
      existingEntry.confidence = entry.confidence;
    } else {
      this.translationMemory.push({
        ...entry,
        timestamp: Date.now(),
        usage_count: 1,
      });
    }
    
    // メモリサイズ制限
    if (this.translationMemory.length > 1000) {
      this.translationMemory.sort((a, b) => b.usage_count - a.usage_count);
      this.translationMemory = this.translationMemory.slice(0, 800);
    }
    
    this.persistTranslationMemory();
  }

  /**
   * ローカライゼーションコンテキスト設定
   */
  setLocalizationContext(context: Partial<LocalizationContext>): void {
    this.localizationContext = {
      ...this.localizationContext,
      ...context,
    } as LocalizationContext;
    
    this.persistSettings();
  }

  /**
   * ローカライゼーションコンテキスト取得
   */
  getLocalizationContext(): LocalizationContext | null {
    return this.localizationContext;
  }

  /**
   * 統計情報取得
   */
  getStatistics(): {
    supportedLanguages: number;
    currentLanguage: string;
    translationMemorySize: number;
    mostUsedTranslations: TranslationMemory[];
  } {
    const sortedMemory = [...this.translationMemory]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);
    
    return {
      supportedLanguages: this.languageModels.size,
      currentLanguage: this.currentLanguage,
      translationMemorySize: this.translationMemory.length,
      mostUsedTranslations: sortedMemory,
    };
  }

  /**
   * 言語設定の自動検出とお勧め
   */
  async suggestOptimalLanguage(): Promise<{
    recommended: string;
    confidence: number;
    reasons: string[];
  }> {
    const deviceLanguage = 'ja-JP'; // 実際の実装ではデバイス設定から取得
    const userRegion = 'JP'; // 実際の実装では位置情報から取得
    const reasons: string[] = [];
    
    // デバイス言語設定
    if (this.languageModels.has(deviceLanguage)) {
      reasons.push(`Device language: ${deviceLanguage}`);
    }
    
    // 地域設定
    const regionLanguageMap: Record<string, string> = {
      'JP': 'ja-JP',
      'US': 'en-US',
      'CN': 'zh-CN',
    };
    
    const regionLanguage = regionLanguageMap[userRegion];
    if (regionLanguage && this.languageModels.has(regionLanguage)) {
      reasons.push(`Region preference: ${regionLanguage}`);
    }
    
    // 使用頻度
    const usageStats = this.getUsageStatistics();
    if (usageStats.length > 0) {
      reasons.push(`Most used: ${usageStats[0].language}`);
    }
    
    // 推奨言語決定
    const recommended = regionLanguage || deviceLanguage || this.currentLanguage;
    const confidence = reasons.length > 1 ? 0.9 : 0.7;
    
    return {
      recommended,
      confidence,
      reasons,
    };
  }

  /**
   * 使用統計取得
   */
  private getUsageStatistics(): Array<{ language: string; count: number }> {
    const stats = new Map<string, number>();
    
    this.translationMemory.forEach(entry => {
      stats.set(entry.sourceLanguage, (stats.get(entry.sourceLanguage) || 0) + entry.usage_count);
    });
    
    return Array.from(stats.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 言語検証
   */
  validateLanguageSupport(languageCode: string): {
    isSupported: boolean;
    features: {
      voiceRecognition: boolean;
      textToSpeech: boolean;
      nlp: boolean;
      culturalAdaptation: boolean;
    };
    alternatives: string[];
  } {
    const isSupported = this.languageModels.has(languageCode);
    const model = this.languageModels.get(languageCode);
    
    return {
      isSupported,
      features: {
        voiceRecognition: isSupported,
        textToSpeech: isSupported,
        nlp: isSupported && !!model?.patterns,
        culturalAdaptation: isSupported && !!model?.culturalAdaptations,
      },
      alternatives: isSupported ? [] : this.getSupportedLanguages().slice(0, 3),
    };
  }
}

export const multilingualService = new MultilingualExtensionService();
