/**
 * Firebase Service Switcher
 * Firebase アカウントの有無に応じて本物/モックを切り替え
 */

import { mockFirebaseService } from './MockFirebaseService';

// 開発設定
const DEVELOPMENT_CONFIG = {
  // Firebase プロジェクトが設定されているかどうか
  FIREBASE_PROJECT_CONFIGURED: false, // ←　ここをtrueにするとリアルFirebaseを使用
  
  // モックモード設定
  ENABLE_MOCK_MODE: true,
  MOCK_LATENCY: 300, // ms
  SIMULATE_ERRORS: false,
  ERROR_RATE: 0.05, // 5%
};

/**
 * Firebase サービスの動的インポートと初期化
 */
class FirebaseServiceSwitcher {
  private service: any = null;
  private isInitialized = false;
  private usingMock = false;

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🔥 Initializing Firebase Service Switcher...');

    try {
      if (DEVELOPMENT_CONFIG.FIREBASE_PROJECT_CONFIGURED) {
        // 本物のFirebaseを使用
        await this.initializeRealFirebase();
      } else {
        // モックFirebaseを使用
        await this.initializeMockFirebase();
      }
      
      this.isInitialized = true;
      console.log(`✅ Firebase Service initialized (${this.usingMock ? 'Mock' : 'Real'} mode)`);
      
    } catch (error) {
      console.error('❌ Firebase Service initialization failed:', error);
      
      // リアルFirebaseで失敗した場合、モックにフォールバック
      if (!this.usingMock) {
        console.log('🔄 Falling back to Mock Firebase...');
        await this.initializeMockFirebase();
        this.isInitialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * 本物のFirebase初期化
   */
  private async initializeRealFirebase(): Promise<void> {
    try {
      // 実際のFirebaseサービスをインポート（静的インポートに変更）
      const FirebaseServiceModule = require('./FirebaseService');
      const firebaseService = FirebaseServiceModule.firebaseService;
      
      await firebaseService.initialize();
      
      this.service = firebaseService;
      this.usingMock = false;
      
      console.log('✅ Real Firebase Service initialized');
      
    } catch (error) {
      console.error('❌ Real Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * モックFirebase初期化
   */
  private async initializeMockFirebase(): Promise<void> {
    try {
      // モック設定適用
      mockFirebaseService.updateConfig({
        enableMockMode: DEVELOPMENT_CONFIG.ENABLE_MOCK_MODE,
        mockLatency: DEVELOPMENT_CONFIG.MOCK_LATENCY,
        simulateErrors: DEVELOPMENT_CONFIG.SIMULATE_ERRORS,
        errorRate: DEVELOPMENT_CONFIG.ERROR_RATE,
      });
      
      await mockFirebaseService.initialize();
      
      this.service = mockFirebaseService;
      this.usingMock = true;
      
      console.log('✅ Mock Firebase Service initialized');
      
    } catch (error) {
      console.error('❌ Mock Firebase initialization failed:', error);
      throw error;
    }
  }

  // === プロキシメソッド ===

  /**
   * 認証 - メールアドレスでサインアップ
   */
  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> {
    this.ensureInitialized();
    return await this.service.createUserWithEmailAndPassword(email, password);
  }

  /**
   * 認証 - メールアドレスでサインイン
   */
  async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    this.ensureInitialized();
    return await this.service.signInWithEmailAndPassword(email, password);
  }

  /**
   * 認証 - サインアウト
   */
  async signOut(): Promise<void> {
    this.ensureInitialized();
    return await this.service.signOut();
  }

  /**
   * 認証 - 現在のユーザー取得
   */
  getCurrentUser(): any {
    this.ensureInitialized();
    return this.service.getCurrentUser();
  }

  /**
   * 認証 - 認証状態リスナー
   */
  onAuthStateChanged(callback: (user: any) => void): () => void {
    this.ensureInitialized();
    return this.service.onAuthStateChanged(callback);
  }

  /**
   * Firestore - コレクション取得
   */
  collection(collectionPath: string): any {
    this.ensureInitialized();
    return this.service.collection(collectionPath);
  }

  /**
   * Storage - ストレージ参照取得
   */
  storage(): any {
    this.ensureInitialized();
    return this.service.storage();
  }

  /**
   * Analytics - アナリティクス取得
   */
  analytics(): any {
    this.ensureInitialized();
    return this.service.analytics();
  }

  /**
   * Functions - Functions取得
   */
  functions(): any {
    this.ensureInitialized();
    return this.service.functions();
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): { isInitialized: boolean; usingMock: boolean } {
    return { 
      isInitialized: this.isInitialized,
      usingMock: this.usingMock,
    };
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; usingMock: boolean }> {
    this.ensureInitialized();
    
    try {
      const result = await this.service.healthCheck();
      return {
        status: result.status,
        usingMock: this.usingMock,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        usingMock: this.usingMock,
      };
    }
  }

  /**
   * モードの確認
   */
  isMockMode(): boolean {
    return this.usingMock;
  }

  /**
   * モックデータ取得（モックモード時のみ）
   */
  getMockData(): Record<string, any> | null {
    if (this.usingMock && this.service.getMockData) {
      return this.service.getMockData();
    }
    return null;
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo(): {
    isInitialized: boolean;
    usingMock: boolean;
    config: typeof DEVELOPMENT_CONFIG;
    mockData?: Record<string, any>;
  } {
    return {
      isInitialized: this.isInitialized,
      usingMock: this.usingMock,
      config: DEVELOPMENT_CONFIG,
      mockData: this.getMockData() || undefined,
    };
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.service && this.service.cleanup) {
      await this.service.cleanup();
    }
    
    this.service = null;
    this.isInitialized = false;
    this.usingMock = false;
    
    console.log('🧹 Firebase Service Switcher cleanup completed');
  }

  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.service) {
      throw new Error('Firebase Service not initialized. Call initialize() first.');
    }
  }
}

// シングルトンインスタンス
export const firebaseServiceSwitcher = new FirebaseServiceSwitcher();

// 旧FirebaseServiceとの互換性のためのエクスポート
export const firebaseService = firebaseServiceSwitcher;
