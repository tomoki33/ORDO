/**
 * Mock Firebase Service
 * Firebase アカウント無しでのローカル開発用モックサービス
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MockFirebaseConfig {
  enableMockMode: boolean;
  mockLatency: number;
  simulateErrors: boolean;
  errorRate: number;
}

export interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface MockDocument {
  id: string;
  data: any;
  timestamp: number;
}

class MockFirebaseService {
  private isInitialized = false;
  private currentUser: MockUser | null = null;
  private mockData: Map<string, Map<string, MockDocument>> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private authListeners: Function[] = [];
  
  private config: MockFirebaseConfig = {
    enableMockMode: true,
    mockLatency: 200, // 200ms遅延をシミュレート
    simulateErrors: false,
    errorRate: 0.1, // 10%のエラー率
  };

  /**
   * モックFirebaseサービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🔥 Initializing Mock Firebase Service...');
    
    // 遅延シミュレート
    await this.simulateLatency();
    
    // 保存済みユーザー情報復元
    await this.restoreUserSession();
    
    // モックデータ初期化
    await this.initializeMockData();
    
    this.isInitialized = true;
    console.log('✅ Mock Firebase Service initialized');
  }

  /**
   * 遅延シミュレート
   */
  private async simulateLatency(): Promise<void> {
    if (this.config.mockLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.mockLatency));
    }
  }

  /**
   * エラーシミュレート
   */
  private simulateError(): void {
    if (this.config.simulateErrors && Math.random() < this.config.errorRate) {
      throw new Error('Mock Firebase Error: Simulated network error');
    }
  }

  /**
   * ユーザーセッション復元
   */
  private async restoreUserSession(): Promise<void> {
    try {
      const savedUser = await AsyncStorage.getItem('mock_firebase_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        console.log('👤 Restored user session:', this.currentUser?.email);
      }
    } catch (error) {
      console.error('Failed to restore user session:', error);
    }
  }

  /**
   * モックデータ初期化
   */
  private async initializeMockData(): Promise<void> {
    // サンプルデータ作成
    const productsCollection = new Map<string, MockDocument>();
    
    productsCollection.set('product1', {
      id: 'product1',
      data: {
        name: 'りんご',
        quantity: 5,
        unit: '個',
        category: '果物',
        expiryDate: '2024-12-25',
        location: '冷蔵庫',
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    productsCollection.set('product2', {
      id: 'product2',
      data: {
        name: '牛乳',
        quantity: 1,
        unit: 'L',
        category: '乳製品',
        expiryDate: '2024-12-20',
        location: '冷蔵庫',
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    this.mockData.set('products', productsCollection);
    console.log('📦 Mock data initialized');
  }

  // === Auth モック ===

  /**
   * メールアドレスでサインアップ
   */
  async createUserWithEmailAndPassword(email: string, password: string): Promise<{ user: MockUser }> {
    await this.simulateLatency();
    this.simulateError();

    console.log(`👤 Mock signup: ${email}`);
    
    const user: MockUser = {
      uid: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      displayName: null,
      photoURL: null,
    };

    this.currentUser = user;
    await this.saveUserSession();
    this.notifyAuthListeners();

    return { user };
  }

  /**
   * メールアドレスでサインイン
   */
  async signInWithEmailAndPassword(email: string, password: string): Promise<{ user: MockUser }> {
    await this.simulateLatency();
    this.simulateError();

    console.log(`👤 Mock signin: ${email}`);
    
    const user: MockUser = {
      uid: `mock_${email.replace('@', '_').replace('.', '_')}`,
      email,
      displayName: null,
      photoURL: null,
    };

    this.currentUser = user;
    await this.saveUserSession();
    this.notifyAuthListeners();

    return { user };
  }

  /**
   * サインアウト
   */
  async signOut(): Promise<void> {
    await this.simulateLatency();
    
    console.log('👤 Mock signout');
    this.currentUser = null;
    await AsyncStorage.removeItem('mock_firebase_user');
    this.notifyAuthListeners();
  }

  /**
   * 現在のユーザー取得
   */
  getCurrentUser(): MockUser | null {
    return this.currentUser;
  }

  /**
   * 認証状態リスナー
   */
  onAuthStateChanged(callback: (user: MockUser | null) => void): () => void {
    this.authListeners.push(callback);
    
    // 初回コールバック実行
    setTimeout(() => callback(this.currentUser), 100);
    
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  /**
   * 認証リスナー通知
   */
  private notifyAuthListeners(): void {
    this.authListeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * ユーザーセッション保存
   */
  private async saveUserSession(): Promise<void> {
    try {
      if (this.currentUser) {
        await AsyncStorage.setItem('mock_firebase_user', JSON.stringify(this.currentUser));
      }
    } catch (error) {
      console.error('Failed to save user session:', error);
    }
  }

  // === Firestore モック ===

  /**
   * コレクション取得
   */
  collection(collectionPath: string) {
    return {
      doc: (docId?: string) => this.mockDocument(collectionPath, docId),
      add: (data: any) => this.mockAdd(collectionPath, data),
      get: () => this.mockCollectionGet(collectionPath),
      onSnapshot: (callback: Function) => this.mockCollectionOnSnapshot(collectionPath, callback),
      where: (field: string, operator: string, value: any) => this.mockWhere(collectionPath, field, operator, value),
    };
  }

  /**
   * ドキュメント操作モック
   */
  private mockDocument(collectionPath: string, docId?: string) {
    const actualDocId = docId || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      set: async (data: any) => {
        await this.simulateLatency();
        this.simulateError();
        
        const collection = this.mockData.get(collectionPath) || new Map();
        const doc: MockDocument = {
          id: actualDocId,
          data: { ...data, updatedAt: Date.now() },
          timestamp: Date.now(),
        };
        
        collection.set(actualDocId, doc);
        this.mockData.set(collectionPath, collection);
        this.notifyDocumentListeners(collectionPath, actualDocId, doc);
        
        console.log(`📄 Mock set document: ${collectionPath}/${actualDocId}`);
      },
      
      get: async () => {
        await this.simulateLatency();
        this.simulateError();
        
        const collection = this.mockData.get(collectionPath);
        const doc = collection?.get(actualDocId);
        
        return {
          id: actualDocId,
          exists: !!doc,
          data: () => doc?.data || null,
        };
      },
      
      update: async (data: any) => {
        await this.simulateLatency();
        this.simulateError();
        
        const collection = this.mockData.get(collectionPath);
        const existingDoc = collection?.get(actualDocId);
        
        if (existingDoc) {
          existingDoc.data = { ...existingDoc.data, ...data, updatedAt: Date.now() };
          existingDoc.timestamp = Date.now();
          this.notifyDocumentListeners(collectionPath, actualDocId, existingDoc);
        }
        
        console.log(`📄 Mock update document: ${collectionPath}/${actualDocId}`);
      },
      
      delete: async () => {
        await this.simulateLatency();
        this.simulateError();
        
        const collection = this.mockData.get(collectionPath);
        if (collection) {
          collection.delete(actualDocId);
          this.notifyDocumentListeners(collectionPath, actualDocId, null);
        }
        
        console.log(`📄 Mock delete document: ${collectionPath}/${actualDocId}`);
      },
      
      onSnapshot: (callback: Function) => this.mockDocumentOnSnapshot(collectionPath, actualDocId, callback),
    };
  }

  /**
   * コレクションへの追加
   */
  private async mockAdd(collectionPath: string, data: any): Promise<{ id: string }> {
    await this.simulateLatency();
    this.simulateError();
    
    const docId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const collection = this.mockData.get(collectionPath) || new Map();
    
    const doc: MockDocument = {
      id: docId,
      data: { ...data, createdAt: Date.now() },
      timestamp: Date.now(),
    };
    
    collection.set(docId, doc);
    this.mockData.set(collectionPath, collection);
    this.notifyCollectionListeners(collectionPath);
    
    console.log(`📄 Mock add document: ${collectionPath}/${docId}`);
    return { id: docId };
  }

  /**
   * コレクション取得
   */
  private async mockCollectionGet(collectionPath: string): Promise<{ docs: any[] }> {
    await this.simulateLatency();
    this.simulateError();
    
    const collection = this.mockData.get(collectionPath) || new Map();
    const docs = Array.from(collection.values()).map(doc => ({
      id: doc.id,
      data: () => doc.data,
      exists: true,
    }));
    
    return { docs };
  }

  /**
   * WHERE句モック
   */
  private mockWhere(collectionPath: string, field: string, operator: string, value: any) {
    return {
      get: async () => {
        await this.simulateLatency();
        this.simulateError();
        
        const collection = this.mockData.get(collectionPath) || new Map();
        const docs = Array.from(collection.values())
          .filter(doc => {
            const fieldValue = doc.data[field];
            switch (operator) {
              case '==': return fieldValue === value;
              case '!=': return fieldValue !== value;
              case '>': return fieldValue > value;
              case '>=': return fieldValue >= value;
              case '<': return fieldValue < value;
              case '<=': return fieldValue <= value;
              case 'in': return Array.isArray(value) && value.includes(fieldValue);
              case 'array-contains': return Array.isArray(fieldValue) && fieldValue.includes(value);
              default: return false;
            }
          })
          .map(doc => ({
            id: doc.id,
            data: () => doc.data,
            exists: true,
          }));
        
        return { docs };
      },
    };
  }

  /**
   * ドキュメントリスナー
   */
  private mockDocumentOnSnapshot(collectionPath: string, docId: string, callback: Function): () => void {
    const listenerKey = `${collectionPath}/${docId}`;
    const listeners = this.listeners.get(listenerKey) || [];
    listeners.push(callback);
    this.listeners.set(listenerKey, listeners);
    
    // 初回データ送信
    setTimeout(() => {
      const collection = this.mockData.get(collectionPath);
      const doc = collection?.get(docId);
      callback({
        id: docId,
        exists: !!doc,
        data: () => doc?.data || null,
      });
    }, 100);
    
    return () => {
      const currentListeners = this.listeners.get(listenerKey) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.listeners.set(listenerKey, currentListeners);
      }
    };
  }

  /**
   * コレクションリスナー
   */
  private mockCollectionOnSnapshot(collectionPath: string, callback: Function): () => void {
    const listenerKey = collectionPath;
    const listeners = this.listeners.get(listenerKey) || [];
    listeners.push(callback);
    this.listeners.set(listenerKey, listeners);
    
    // 初回データ送信
    setTimeout(() => {
      const collection = this.mockData.get(collectionPath) || new Map();
      const docs = Array.from(collection.values()).map(doc => ({
        id: doc.id,
        data: () => doc.data,
        exists: true,
      }));
      
      callback({
        docs,
        forEach: (fn: (doc: any) => void) => docs.forEach(fn),
      });
    }, 100);
    
    return () => {
      const currentListeners = this.listeners.get(listenerKey) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.listeners.set(listenerKey, currentListeners);
      }
    };
  }

  /**
   * ドキュメントリスナー通知
   */
  private notifyDocumentListeners(collectionPath: string, docId: string, doc: MockDocument | null): void {
    const listenerKey = `${collectionPath}/${docId}`;
    const listeners = this.listeners.get(listenerKey) || [];
    
    listeners.forEach(listener => {
      try {
        listener({
          id: docId,
          exists: !!doc,
          data: () => doc?.data || null,
        });
      } catch (error) {
        console.error('Document listener error:', error);
      }
    });
  }

  /**
   * コレクションリスナー通知
   */
  private notifyCollectionListeners(collectionPath: string): void {
    const listeners = this.listeners.get(collectionPath) || [];
    const collection = this.mockData.get(collectionPath) || new Map();
    const docs = Array.from(collection.values()).map(doc => ({
      id: doc.id,
      data: () => doc.data,
      exists: true,
    }));
    
    listeners.forEach(listener => {
      try {
        listener({
          docs,
          forEach: (fn: (doc: any) => void) => docs.forEach(fn),
        });
      } catch (error) {
        console.error('Collection listener error:', error);
      }
    });
  }

  // === その他のサービスモック ===

  /**
   * Storage モック
   */
  storage() {
    return {
      ref: (path?: string) => ({
        putFile: async (localPath: string) => {
          await this.simulateLatency();
          this.simulateError();
          console.log(`📁 Mock storage upload: ${path}`);
          return { downloadURL: `mock://storage/${path}` };
        },
        getDownloadURL: async () => {
          await this.simulateLatency();
          return `mock://storage/${path}`;
        },
        delete: async () => {
          await this.simulateLatency();
          console.log(`📁 Mock storage delete: ${path}`);
        },
      }),
    };
  }

  /**
   * Analytics モック
   */
  analytics() {
    return {
      logEvent: async (name: string, parameters?: any) => {
        console.log(`📊 Mock analytics event: ${name}`, parameters);
      },
      setUserId: async (id: string) => {
        console.log(`📊 Mock analytics user ID: ${id}`);
      },
    };
  }

  /**
   * Functions モック
   */
  functions() {
    return {
      httpsCallable: (name: string) => async (data?: any) => {
        await this.simulateLatency();
        this.simulateError();
        console.log(`⚡ Mock function call: ${name}`, data);
        return { data: { success: true, result: 'mock result' } };
      },
    };
  }

  // === 設定・状態管理 ===

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<MockFirebaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔥 Mock Firebase config updated:', this.config);
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): { isInitialized: boolean } {
    return { isInitialized: this.isInitialized };
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy' }> {
    try {
      await this.simulateLatency();
      this.simulateError();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }

  /**
   * モックデータ表示（デバッグ用）
   */
  getMockData(): Record<string, any> {
    const result: Record<string, any> = {};
    this.mockData.forEach((collection, collectionName) => {
      result[collectionName] = Array.from(collection.values()).map(doc => ({
        id: doc.id,
        data: doc.data,
      }));
    });
    return result;
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.listeners.clear();
    this.authListeners = [];
    this.mockData.clear();
    this.currentUser = null;
    this.isInitialized = false;
    console.log('🧹 Mock Firebase Service cleanup completed');
  }
}

export const mockFirebaseService = new MockFirebaseService();
