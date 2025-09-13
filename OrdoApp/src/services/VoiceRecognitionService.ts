/**
 * Voice Recognition Service
 * 音声認識ライブラリの統合とコア機能
 */

import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { performanceMonitor } from './PerformanceMonitorService';

export interface VoiceRecognitionConfig {
  language: string;
  maxResults: number;
  partialResults: boolean;
  enablePunctuation: boolean;
  enableWordTiming: boolean;
  noiseReduction: boolean;
  voiceActivityDetection: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  isFinal: boolean;
  wordTimings?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  language: string;
  processingTime: number;
}

export interface VoiceRecognitionError {
  code: string;
  message: string;
  details?: any;
}

export type VoiceRecognitionListener = {
  onResult: (result: VoiceRecognitionResult) => void;
  onError: (error: VoiceRecognitionError) => void;
  onStart: () => void;
  onEnd: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onVolumeChanged: (volume: number) => void;
};

class VoiceRecognitionService {
  private isListening = false;
  private isAvailable = false;
  private currentLanguage = 'ja-JP';
  private listeners: VoiceRecognitionListener[] = [];
  private recognitionSession?: any;
  
  // 設定
  private config: VoiceRecognitionConfig = {
    language: 'ja-JP',
    maxResults: 5,
    partialResults: true,
    enablePunctuation: true,
    enableWordTiming: true,
    noiseReduction: true,
    voiceActivityDetection: true,
  };
  
  // ノイズ耐性設定
  private noiseFilterConfig = {
    enableDenoising: true,
    aggressiveNoiseReduction: false,
    backgroundNoiseThreshold: 0.3,
    speechToNoiseRatio: 2.0,
  };

  /**
   * 音声認識サービス初期化
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Initializing voice recognition service...');
      
      // 権限チェック
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }
      
      // 音声認識の可用性チェック
      await this.checkAvailability();
      
      // ネイティブモジュール設定
      await this.setupNativeModule();
      
      // ノイズフィルター初期化
      await this.initializeNoiseFilter();
      
      this.isAvailable = true;
      console.log('✅ Voice recognition service initialized');
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize voice recognition:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * マイクロフォン権限チェック
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '音声認識権限',
            message: 'Ordoが音声コマンドを認識するためにマイクロフォンへのアクセスが必要です。',
            buttonNeutral: '後で確認',
            buttonNegative: 'キャンセル',
            buttonPositive: 'OK',
          }
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      
      // iOS の場合は自動的に権限要求される
      return true;
      
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * 音声認識可用性チェック
   */
  private async checkAvailability(): Promise<void> {
    // 実際の実装では @react-native-voice/voice や
    // @react-native-async-storage/async-storage を使用
    
    if (Platform.OS === 'ios') {
      // iOS Speech Framework の利用可能性確認
      console.log('📱 Checking iOS Speech Framework availability');
    } else if (Platform.OS === 'android') {
      // Android SpeechRecognizer の利用可能性確認
      console.log('🤖 Checking Android SpeechRecognizer availability');
    }
    
    // Web の場合のWebSpeechAPI確認
    if (Platform.OS === 'web') {
      const isWebSpeechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      if (!isWebSpeechSupported) {
        throw new Error('Web Speech API not supported');
      }
    }
  }

  /**
   * ネイティブモジュール設定
   */
  private async setupNativeModule(): Promise<void> {
    // 実際の実装では react-native-voice などのライブラリを使用
    // ここではモック実装
    
    if (Platform.OS !== 'web') {
      console.log('🔧 Setting up native voice recognition module');
      
      // ネイティブモジュールの設定
      // NativeModules.VoiceRecognition?.configure(this.config);
    } else {
      // Web Speech API の設定
      this.setupWebSpeechAPI();
    }
  }

  /**
   * Web Speech API設定
   */
  private setupWebSpeechAPI(): void {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognitionSession = new SpeechRecognition();
        this.recognitionSession.continuous = true;
        this.recognitionSession.interimResults = true;
        this.recognitionSession.lang = this.config.language;
        this.recognitionSession.maxAlternatives = this.config.maxResults;
        
        console.log('🌐 Web Speech API configured');
      }
    }
  }

  /**
   * ノイズフィルター初期化
   */
  private async initializeNoiseFilter(): Promise<void> {
    if (this.noiseFilterConfig.enableDenoising) {
      console.log('🔇 Initializing noise filter');
      
      // 実際の実装では音声処理ライブラリを使用
      // 例: react-native-audio-processor
      
      // ノイズリダクション設定
      const filterSettings = {
        noiseReduction: this.noiseFilterConfig.aggressiveNoiseReduction ? 0.8 : 0.5,
        backgroundThreshold: this.noiseFilterConfig.backgroundNoiseThreshold,
        speechRatio: this.noiseFilterConfig.speechToNoiseRatio,
      };
      
      console.log('🎵 Noise filter configured:', filterSettings);
    }
  }

  /**
   * 音声認識開始
   */
  async startListening(customConfig?: Partial<VoiceRecognitionConfig>): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('Voice recognition not available');
    }
    
    if (this.isListening) {
      console.warn('Voice recognition already in progress');
      return;
    }
    
    try {
      performanceMonitor.startTimer('voiceRecognition');
      
      // 設定をマージ
      const activeConfig = { ...this.config, ...customConfig };
      
      console.log(`🎤 Starting voice recognition with language: ${activeConfig.language}`);
      
      this.isListening = true;
      this.notifyListeners('onStart');
      
      if (Platform.OS === 'web') {
        await this.startWebSpeechRecognition(activeConfig);
      } else {
        await this.startNativeSpeechRecognition(activeConfig);
      }
      
    } catch (error) {
      this.isListening = false;
      console.error('Failed to start voice recognition:', error);
      this.notifyListeners('onError', {
        code: 'START_FAILED',
        message: 'Failed to start voice recognition',
        details: error,
      });
    }
  }

  /**
   * Web Speech API による認識開始
   */
  private async startWebSpeechRecognition(config: VoiceRecognitionConfig): Promise<void> {
    if (!this.recognitionSession) {
      throw new Error('Web Speech API not initialized');
    }
    
    this.recognitionSession.lang = config.language;
    this.recognitionSession.maxAlternatives = config.maxResults;
    
    this.recognitionSession.onstart = () => {
      console.log('🎤 Web speech recognition started');
      this.notifyListeners('onSpeechStart');
    };
    
    this.recognitionSession.onresult = (event: any) => {
      const result = this.processWebSpeechResult(event, config);
      this.notifyListeners('onResult', result);
    };
    
    this.recognitionSession.onerror = (event: any) => {
      console.error('Web speech recognition error:', event.error);
      this.notifyListeners('onError', {
        code: event.error.toUpperCase(),
        message: `Speech recognition error: ${event.error}`,
      });
    };
    
    this.recognitionSession.onend = () => {
      console.log('🎤 Web speech recognition ended');
      this.isListening = false;
      this.notifyListeners('onEnd');
    };
    
    this.recognitionSession.start();
  }

  /**
   * ネイティブ音声認識開始
   */
  private async startNativeSpeechRecognition(config: VoiceRecognitionConfig): Promise<void> {
    // 実際の実装では react-native-voice などを使用
    // ここではモック実装
    
    console.log('📱 Starting native speech recognition');
    
    // モック: 3秒後に結果を返す
    setTimeout(() => {
      const mockResult: VoiceRecognitionResult = {
        transcript: 'りんご を 3つ 追加',
        confidence: 0.95,
        alternatives: [
          { transcript: 'りんご を 3つ 追加', confidence: 0.95 },
          { transcript: 'りんご 3個 追加', confidence: 0.87 },
        ],
        isFinal: true,
        language: config.language,
        processingTime: performanceMonitor.endTimer('voiceRecognition'),
        wordTimings: [
          { word: 'りんご', startTime: 0, endTime: 0.5, confidence: 0.98 },
          { word: 'を', startTime: 0.5, endTime: 0.6, confidence: 0.85 },
          { word: '3つ', startTime: 0.6, endTime: 1.0, confidence: 0.92 },
          { word: '追加', startTime: 1.0, endTime: 1.4, confidence: 0.97 },
        ],
      };
      
      this.notifyListeners('onResult', mockResult);
      this.stopListening();
    }, 3000);
  }

  /**
   * Web Speech APIの結果処理
   */
  private processWebSpeechResult(event: any, config: VoiceRecognitionConfig): VoiceRecognitionResult {
    const results = event.results;
    const lastResult = results[results.length - 1];
    
    const alternatives = [];
    for (let i = 0; i < lastResult.length; i++) {
      alternatives.push({
        transcript: lastResult[i].transcript,
        confidence: lastResult[i].confidence || 0.5,
      });
    }
    
    const processingTime = performanceMonitor.endTimer('voiceRecognition');
    
    return {
      transcript: lastResult[0].transcript,
      confidence: lastResult[0].confidence || 0.5,
      alternatives,
      isFinal: lastResult.isFinal,
      language: config.language,
      processingTime,
    };
  }

  /**
   * 音声認識停止
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    
    console.log('🛑 Stopping voice recognition');
    
    try {
      if (Platform.OS === 'web' && this.recognitionSession) {
        this.recognitionSession.stop();
      } else {
        // ネイティブ音声認識停止
        // NativeModules.VoiceRecognition?.stop();
      }
      
      this.isListening = false;
      this.notifyListeners('onEnd');
      
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  /**
   * 言語設定変更
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
    this.config.language = language;
    
    if (this.recognitionSession) {
      this.recognitionSession.lang = language;
    }
    
    console.log(`🌐 Voice recognition language set to: ${language}`);
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<VoiceRecognitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.recognitionSession) {
      this.recognitionSession.continuous = this.config.partialResults;
      this.recognitionSession.interimResults = this.config.partialResults;
      this.recognitionSession.maxAlternatives = this.config.maxResults;
    }
    
    console.log('⚙️ Voice recognition config updated:', this.config);
  }

  /**
   * ノイズフィルター設定更新
   */
  updateNoiseFilter(settings: Partial<typeof this.noiseFilterConfig>): void {
    this.noiseFilterConfig = { ...this.noiseFilterConfig, ...settings };
    console.log('🔇 Noise filter settings updated:', this.noiseFilterConfig);
  }

  /**
   * リスナー登録
   */
  addListener(listener: VoiceRecognitionListener): void {
    this.listeners.push(listener);
  }

  /**
   * リスナー削除
   */
  removeListener(listener: VoiceRecognitionListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 全リスナーに通知
   */
  private notifyListeners(eventType: keyof VoiceRecognitionListener, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        const handler = listener[eventType] as Function;
        if (handler) {
          handler(data);
        }
      } catch (error) {
        console.error(`Error in voice recognition listener ${eventType}:`, error);
      }
    });
  }

  /**
   * 音声認識状態取得
   */
  getStatus(): {
    isListening: boolean;
    isAvailable: boolean;
    currentLanguage: string;
    config: VoiceRecognitionConfig;
  } {
    return {
      isListening: this.isListening,
      isAvailable: this.isAvailable,
      currentLanguage: this.currentLanguage,
      config: { ...this.config },
    };
  }

  /**
   * サポート言語一覧取得
   */
  getSupportedLanguages(): string[] {
    return [
      'ja-JP', // 日本語
      'en-US', // 英語（アメリカ）
      'en-GB', // 英語（イギリス）
      'zh-CN', // 中国語（簡体字）
      'ko-KR', // 韓国語
      'es-ES', // スペイン語
      'fr-FR', // フランス語
      'de-DE', // ドイツ語
    ];
  }

  /**
   * マイク音量レベル取得（モック）
   */
  getMicrophoneLevel(): number {
    // 実際の実装では音声入力の音量レベルを返す
    return Math.random() * 100;
  }

  /**
   * サービス破棄
   */
  destroy(): void {
    this.stopListening();
    this.listeners = [];
    this.isAvailable = false;
    
    if (this.recognitionSession) {
      this.recognitionSession = null;
    }
    
    console.log('🎤 Voice recognition service destroyed');
  }
}

export const voiceRecognitionService = new VoiceRecognitionService();
