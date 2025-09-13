/**
 * Voice Command Analysis Service
 * 音声コマンドの解析と実行処理
 */

import { Alert } from 'react-native';
import { voiceRecognitionService, VoiceRecognitionResult } from './VoiceRecognitionService';
import { nlpService, ParsedCommand, ProductEntity, ActionEntity } from './NaturalLanguageProcessingService';
import { performanceMonitor } from './PerformanceMonitorService';

export interface VoiceCommand {
  id: string;
  timestamp: number;
  originalText: string;
  parsedCommand: ParsedCommand;
  productEntity?: ProductEntity;
  actionEntity?: ActionEntity;
  executionStatus: 'pending' | 'executing' | 'completed' | 'failed';
  executionResult?: any;
  processingTime: number;
}

export interface VoiceCommandConfig {
  confidenceThreshold: number;
  autoExecute: boolean;
  confirmationRequired: boolean;
  language: string;
  enableContextMemory: boolean;
  maxHistorySize: number;
}

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: string[];
}

export interface VoiceCommandAnalytics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageProcessingTime: number;
  topCommands: Array<{
    intent: string;
    count: number;
    averageConfidence: number;
  }>;
  languageDistribution: Record<string, number>;
}

class VoiceCommandAnalysisService {
  private commandHistory: VoiceCommand[] = [];
  private isActive = false;
  private contextMemory: Map<string, any> = new Map();
  
  private config: VoiceCommandConfig = {
    confidenceThreshold: 0.7,
    autoExecute: false,
    confirmationRequired: true,
    language: 'ja-JP',
    enableContextMemory: true,
    maxHistorySize: 100,
  };
  
  // コマンド実行ハンドラー
  private commandHandlers: Map<string, (command: VoiceCommand) => Promise<CommandExecutionResult>> = new Map();
  
  // 製品管理の参照（実際の実装では適切なサービスを注入）
  private productService: any = null;

  constructor() {
    this.initializeCommandHandlers();
    this.setupVoiceRecognitionListeners();
  }

  /**
   * サービス初期化
   */
  async initialize(productService?: any): Promise<void> {
    console.log('🎙️ Initializing Voice Command Analysis Service...');
    
    this.productService = productService;
    
    // 音声認識サービス初期化
    await voiceRecognitionService.initialize();
    
    // NLPサービスの言語設定
    nlpService.setLanguage(this.config.language);
    
    console.log('✅ Voice Command Analysis Service initialized');
  }

  /**
   * コマンドハンドラー初期化
   */
  private initializeCommandHandlers(): void {
    // 商品追加
    this.commandHandlers.set('ADD_PRODUCT', this.handleAddProduct.bind(this));
    
    // 商品削除
    this.commandHandlers.set('REMOVE_PRODUCT', this.handleRemoveProduct.bind(this));
    
    // 商品検索
    this.commandHandlers.set('SEARCH_PRODUCT', this.handleSearchProduct.bind(this));
    
    // 在庫確認
    this.commandHandlers.set('CHECK_INVENTORY', this.handleCheckInventory.bind(this));
    
    // 期限確認
    this.commandHandlers.set('SHOW_EXPIRY', this.handleShowExpiry.bind(this));
    
    // 設定表示
    this.commandHandlers.set('OPEN_SETTINGS', this.handleOpenSettings.bind(this));
    
    // ヘルプ
    this.commandHandlers.set('HELP', this.handleHelp.bind(this));
    
    // キャンセル
    this.commandHandlers.set('CANCEL', this.handleCancel.bind(this));
  }

  /**
   * 音声認識リスナー設定
   */
  private setupVoiceRecognitionListeners(): void {
    voiceRecognitionService.addListener({
      onResult: this.handleVoiceResult.bind(this),
      onError: this.handleVoiceError.bind(this),
      onStart: () => {
        console.log('🎤 Voice recognition started');
      },
      onEnd: () => {
        console.log('🎤 Voice recognition ended');
      },
      onSpeechStart: () => {
        console.log('🗣️ Speech detected');
      },
      onSpeechEnd: () => {
        console.log('🤐 Speech ended');
      },
      onVolumeChanged: (volume: number) => {
        // 音量レベルの処理（必要に応じて）
      },
    });
  }

  /**
   * 音声認識結果処理
   */
  private async handleVoiceResult(result: VoiceRecognitionResult): Promise<void> {
    if (!result.isFinal) {
      // 中間結果の場合は処理をスキップ
      return;
    }
    
    console.log(`🎙️ Processing voice command: "${result.transcript}"`);
    performanceMonitor.startTimer('voiceCommandAnalysis');
    
    try {
      // NLP解析
      const parsedCommand = await nlpService.parseText(result.transcript, result.language);
      
      if (!parsedCommand) {
        console.warn('Failed to parse voice command');
        this.showErrorMessage('音声コマンドを理解できませんでした。');
        return;
      }
      
      // 信頼度チェック
      if (!nlpService.isConfidenceAcceptable(parsedCommand, this.config.confidenceThreshold)) {
        console.warn(`Low confidence command: ${parsedCommand.confidence}`);
        await this.handleLowConfidenceCommand(parsedCommand, result);
        return;
      }
      
      // コマンドオブジェクト作成
      const voiceCommand = this.createVoiceCommand(result, parsedCommand);
      
      // コマンド実行
      await this.executeCommand(voiceCommand);
      
    } catch (error) {
      console.error('Voice command processing error:', error);
      this.showErrorMessage('音声コマンドの処理中にエラーが発生しました。');
    } finally {
      performanceMonitor.endTimer('voiceCommandAnalysis');
    }
  }

  /**
   * 音声認識エラー処理
   */
  private handleVoiceError(error: any): void {
    console.error('Voice recognition error:', error);
    
    const errorMessages: Record<string, string> = {
      'NO_MATCH': '音声を認識できませんでした。もう一度お試しください。',
      'NETWORK_ERROR': 'ネットワークエラーが発生しました。',
      'INSUFFICIENT_PERMISSIONS': 'マイクロフォンの権限が必要です。',
      'AUDIO_ERROR': '音声入力でエラーが発生しました。',
    };
    
    const message = errorMessages[error.code] || '音声認識でエラーが発生しました。';
    this.showErrorMessage(message);
  }

  /**
   * 低信頼度コマンド処理
   */
  private async handleLowConfidenceCommand(parsedCommand: ParsedCommand, voiceResult: VoiceRecognitionResult): Promise<void> {
    console.log(`🤔 Low confidence command detected: ${parsedCommand.confidence}`);
    
    // 候補を生成
    const suggestions = nlpService.generateSuggestions(voiceResult.transcript, voiceResult.language);
    
    if (suggestions.length > 0) {
      Alert.alert(
        '音声コマンド確認',
        `「${voiceResult.transcript}」\n\nもしかして以下のコマンドですか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          ...suggestions.slice(0, 2).map(suggestion => ({
            text: suggestion,
            onPress: () => this.processAlternativeCommand(suggestion),
          })),
        ]
      );
    } else {
      this.showErrorMessage('音声コマンドを理解できませんでした。もう一度お試しください。');
    }
  }

  /**
   * 代替コマンド処理
   */
  private async processAlternativeCommand(commandText: string): Promise<void> {
    try {
      const parsedCommand = await nlpService.parseText(commandText, this.config.language);
      
      if (parsedCommand) {
        const mockVoiceResult: VoiceRecognitionResult = {
          transcript: commandText,
          confidence: 0.9,
          alternatives: [],
          isFinal: true,
          language: this.config.language,
          processingTime: 0,
        };
        
        const voiceCommand = this.createVoiceCommand(mockVoiceResult, parsedCommand);
        await this.executeCommand(voiceCommand);
      }
    } catch (error) {
      console.error('Alternative command processing error:', error);
    }
  }

  /**
   * VoiceCommandオブジェクト作成
   */
  private createVoiceCommand(voiceResult: VoiceRecognitionResult, parsedCommand: ParsedCommand): VoiceCommand {
    const command: VoiceCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      originalText: voiceResult.transcript,
      parsedCommand,
      executionStatus: 'pending',
      processingTime: voiceResult.processingTime,
    };
    
    // エンティティ抽出
    command.productEntity = nlpService.extractProductEntity(parsedCommand);
    command.actionEntity = nlpService.extractActionEntity(parsedCommand);
    
    // コマンド履歴に追加
    this.addToHistory(command);
    
    return command;
  }

  /**
   * コマンド実行
   */
  private async executeCommand(command: VoiceCommand): Promise<void> {
    console.log(`⚡ Executing command: ${command.parsedCommand.intent}`);
    
    command.executionStatus = 'executing';
    
    try {
      const handler = this.commandHandlers.get(command.parsedCommand.intent);
      
      if (!handler) {
        throw new Error(`No handler found for intent: ${command.parsedCommand.intent}`);
      }
      
      // 確認が必要な場合
      if (this.config.confirmationRequired && this.requiresConfirmation(command)) {
        const confirmed = await this.showConfirmationDialog(command);
        if (!confirmed) {
          command.executionStatus = 'failed';
          command.executionResult = { success: false, message: 'User cancelled' };
          return;
        }
      }
      
      // コマンド実行
      const result = await handler(command);
      
      command.executionStatus = result.success ? 'completed' : 'failed';
      command.executionResult = result;
      
      // 実行結果の表示
      this.showExecutionResult(result);
      
      // コンテキストメモリ更新
      if (this.config.enableContextMemory) {
        this.updateContextMemory(command, result);
      }
      
    } catch (error) {
      console.error('Command execution error:', error);
      command.executionStatus = 'failed';
      command.executionResult = {
        success: false,
        message: 'Command execution failed',
        data: error,
      };
      
      this.showErrorMessage('コマンドの実行に失敗しました。');
    }
  }

  /**
   * 確認が必要かチェック
   */
  private requiresConfirmation(command: VoiceCommand): boolean {
    const destructiveIntents = ['REMOVE_PRODUCT', 'DELETE_PRODUCT'];
    return destructiveIntents.includes(command.parsedCommand.intent);
  }

  /**
   * 確認ダイアログ表示
   */
  private async showConfirmationDialog(command: VoiceCommand): Promise<boolean> {
    return new Promise((resolve) => {
      const action = command.actionEntity?.action || '操作';
      const product = command.productEntity?.name || 'アイテム';
      
      Alert.alert(
        'コマンド確認',
        `${product}を${action}しますか？`,
        [
          { text: 'キャンセル', onPress: () => resolve(false), style: 'cancel' },
          { text: '実行', onPress: () => resolve(true) },
        ]
      );
    });
  }

  // === コマンドハンドラー実装 ===

  /**
   * 商品追加ハンドラー
   */
  private async handleAddProduct(command: VoiceCommand): Promise<CommandExecutionResult> {
    const productEntity = command.productEntity;
    
    if (!productEntity) {
      return {
        success: false,
        message: '商品名が指定されていません。',
        suggestions: ['「りんごを3つ追加」のように商品名と数量を指定してください。'],
      };
    }
    
    try {
      // 実際の実装では productService を使用
      console.log(`Adding product: ${productEntity.name} x ${productEntity.quantity}`);
      
      // モック実装
      const result = {
        id: `product_${Date.now()}`,
        name: productEntity.name,
        quantity: productEntity.quantity,
        unit: productEntity.unit,
      };
      
      return {
        success: true,
        message: `${productEntity.name}を${productEntity.quantity}${productEntity.unit}追加しました。`,
        data: result,
      };
      
    } catch (error) {
      return {
        success: false,
        message: '商品の追加に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * 商品削除ハンドラー
   */
  private async handleRemoveProduct(command: VoiceCommand): Promise<CommandExecutionResult> {
    const productEntity = command.productEntity;
    
    if (!productEntity) {
      return {
        success: false,
        message: '削除する商品名が指定されていません。',
      };
    }
    
    try {
      console.log(`Removing product: ${productEntity.name}`);
      
      return {
        success: true,
        message: `${productEntity.name}を削除しました。`,
      };
      
    } catch (error) {
      return {
        success: false,
        message: '商品の削除に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * 商品検索ハンドラー
   */
  private async handleSearchProduct(command: VoiceCommand): Promise<CommandExecutionResult> {
    const productEntity = command.productEntity;
    
    if (!productEntity) {
      return {
        success: false,
        message: '検索する商品名が指定されていません。',
      };
    }
    
    try {
      console.log(`Searching product: ${productEntity.name}`);
      
      // モック検索結果
      const searchResults = [
        { id: '1', name: productEntity.name, quantity: 5, location: '冷蔵庫' },
        { id: '2', name: `${productEntity.name}ジュース`, quantity: 2, location: 'パントリー' },
      ];
      
      return {
        success: true,
        message: `${productEntity.name}の検索結果: ${searchResults.length}件見つかりました。`,
        data: searchResults,
      };
      
    } catch (error) {
      return {
        success: false,
        message: '商品の検索に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * 在庫確認ハンドラー
   */
  private async handleCheckInventory(command: VoiceCommand): Promise<CommandExecutionResult> {
    try {
      console.log('Checking inventory');
      
      // モック在庫情報
      const inventory = {
        totalItems: 25,
        lowStock: 3,
        expiringSoon: 2,
      };
      
      return {
        success: true,
        message: `在庫状況: 全${inventory.totalItems}品目、在庫少：${inventory.lowStock}品目、期限切れ間近：${inventory.expiringSoon}品目`,
        data: inventory,
      };
      
    } catch (error) {
      return {
        success: false,
        message: '在庫確認に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * 期限確認ハンドラー
   */
  private async handleShowExpiry(command: VoiceCommand): Promise<CommandExecutionResult> {
    try {
      console.log('Checking expiry dates');
      
      // モック期限情報
      const expiringItems = [
        { name: '牛乳', expiryDate: '2024-12-20', daysLeft: 2 },
        { name: 'ヨーグルト', expiryDate: '2024-12-18', daysLeft: 0 },
      ];
      
      const message = expiringItems.length > 0
        ? `期限切れ間近: ${expiringItems.map(item => `${item.name}(${item.daysLeft}日)`).join(', ')}`
        : '期限切れ間近の商品はありません。';
      
      return {
        success: true,
        message,
        data: expiringItems,
      };
      
    } catch (error) {
      return {
        success: false,
        message: '期限確認に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * 設定表示ハンドラー
   */
  private async handleOpenSettings(command: VoiceCommand): Promise<CommandExecutionResult> {
    try {
      console.log('Opening settings');
      
      // 実際の実装ではナビゲーションサービスを使用
      // navigationService.navigate('Settings');
      
      return {
        success: true,
        message: '設定画面を開きました。',
      };
      
    } catch (error) {
      return {
        success: false,
        message: '設定画面の表示に失敗しました。',
        data: error,
      };
    }
  }

  /**
   * ヘルプハンドラー
   */
  private async handleHelp(command: VoiceCommand): Promise<CommandExecutionResult> {
    const helpMessage = `
音声コマンドの使い方:
• 「りんごを3つ追加」- 商品を追加
• 「バナナを削除」- 商品を削除
• 「牛乳を検索」- 商品を検索
• 「在庫を確認」- 在庫状況を確認
• 「期限を確認」- 期限切れ間近の商品を確認
• 「設定を開く」- 設定画面を表示
    `.trim();
    
    return {
      success: true,
      message: helpMessage,
    };
  }

  /**
   * キャンセルハンドラー
   */
  private async handleCancel(command: VoiceCommand): Promise<CommandExecutionResult> {
    // 音声認識停止
    await voiceRecognitionService.stopListening();
    
    return {
      success: true,
      message: '音声コマンドをキャンセルしました。',
    };
  }

  // === ユーティリティメソッド ===

  /**
   * 実行結果表示
   */
  private showExecutionResult(result: CommandExecutionResult): void {
    if (result.success) {
      Alert.alert('音声コマンド', result.message);
    } else {
      this.showErrorMessage(result.message);
    }
  }

  /**
   * エラーメッセージ表示
   */
  private showErrorMessage(message: string): void {
    Alert.alert('エラー', message);
  }

  /**
   * コマンド履歴追加
   */
  private addToHistory(command: VoiceCommand): void {
    this.commandHistory.push(command);
    
    // 履歴サイズ制限
    if (this.commandHistory.length > this.config.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  /**
   * コンテキストメモリ更新
   */
  private updateContextMemory(command: VoiceCommand, result: CommandExecutionResult): void {
    if (result.success && command.productEntity) {
      this.contextMemory.set('lastProduct', command.productEntity.name);
      this.contextMemory.set('lastAction', command.actionEntity?.action);
    }
  }

  // === 公開API ===

  /**
   * 音声認識開始
   */
  async startListening(): Promise<void> {
    if (!this.isActive) {
      this.isActive = true;
      await voiceRecognitionService.startListening({
        language: this.config.language,
        partialResults: true,
        maxResults: 3,
      });
    }
  }

  /**
   * 音声認識停止
   */
  async stopListening(): Promise<void> {
    if (this.isActive) {
      this.isActive = false;
      await voiceRecognitionService.stopListening();
    }
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<VoiceCommandConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.language) {
      nlpService.setLanguage(newConfig.language);
      voiceRecognitionService.setLanguage(newConfig.language);
    }
    
    console.log('🎙️ Voice command config updated:', this.config);
  }

  /**
   * コマンド履歴取得
   */
  getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  /**
   * 分析データ取得
   */
  getAnalytics(): VoiceCommandAnalytics {
    const totalCommands = this.commandHistory.length;
    const successfulCommands = this.commandHistory.filter(cmd => cmd.executionStatus === 'completed').length;
    const failedCommands = this.commandHistory.filter(cmd => cmd.executionStatus === 'failed').length;
    
    const processingTimes = this.commandHistory.map(cmd => cmd.processingTime);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;
    
    // インテント別統計
    const intentStats = new Map<string, { count: number; totalConfidence: number }>();
    this.commandHistory.forEach(cmd => {
      const intent = cmd.parsedCommand.intent;
      const stats = intentStats.get(intent) || { count: 0, totalConfidence: 0 };
      stats.count++;
      stats.totalConfidence += cmd.parsedCommand.confidence;
      intentStats.set(intent, stats);
    });
    
    const topCommands = Array.from(intentStats.entries()).map(([intent, stats]) => ({
      intent,
      count: stats.count,
      averageConfidence: stats.totalConfidence / stats.count,
    })).sort((a, b) => b.count - a.count);
    
    // 言語別統計
    const languageDistribution: Record<string, number> = {};
    this.commandHistory.forEach(cmd => {
      const lang = cmd.parsedCommand.language;
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    });
    
    return {
      totalCommands,
      successfulCommands,
      failedCommands,
      averageProcessingTime,
      topCommands,
      languageDistribution,
    };
  }

  /**
   * 状態取得
   */
  getStatus(): {
    isActive: boolean;
    config: VoiceCommandConfig;
    supportedLanguages: string[];
  } {
    return {
      isActive: this.isActive,
      config: { ...this.config },
      supportedLanguages: nlpService.getSupportedLanguages(),
    };
  }
}

export const voiceCommandService = new VoiceCommandAnalysisService();
