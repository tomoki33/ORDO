/**
 * Firebase Configuration
 * Firebase設定とクラウドインフラストラクチャ
 */

import { FirebaseApp, initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import messaging from '@react-native-firebase/messaging';
import remoteConfig from '@react-native-firebase/remote-config';
import perf from '@react-native-firebase/perf';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface CloudEnvironment {
  environment: 'development' | 'staging' | 'production';
  region: string;
  enableAnalytics: boolean;
  enableCrashlytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableRemoteConfig: boolean;
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private isInitialized = false;
  private environment: CloudEnvironment;

  constructor() {
    this.environment = this.getEnvironmentConfig();
  }

  /**
   * Firebase初期化
   */
  async initialize(): Promise<void> {
    console.log('🔥 Initializing Firebase services...');

    try {
      // Firebase App初期化
      if (!this.app) {
        const config = this.getFirebaseConfig();
        this.app = await initializeApp(config);
      }

      // Analytics初期化
      if (this.environment.enableAnalytics) {
        await analytics().setAnalyticsCollectionEnabled(true);
        await analytics().setUserId('user_' + Date.now());
        console.log('📊 Firebase Analytics initialized');
      }

      // Crashlytics初期化
      if (this.environment.enableCrashlytics) {
        await crashlytics().setCrashlyticsCollectionEnabled(true);
        console.log('💥 Firebase Crashlytics initialized');
      }

      // Performance Monitoring初期化
      if (this.environment.enablePerformanceMonitoring) {
        await perf().setPerformanceCollectionEnabled(true);
        console.log('📈 Firebase Performance initialized');
      }

      // Remote Config初期化
      if (this.environment.enableRemoteConfig) {
        await this.initializeRemoteConfig();
        console.log('🎛️ Firebase Remote Config initialized');
      }

      // Cloud Messaging初期化
      await this.initializeMessaging();

      // Firestore設定
      await this.configureFirestore();

      // Cloud Storage設定
      await this.configureStorage();

      // Cloud Functions設定
      await this.configureFunctions();

      this.isInitialized = true;
      console.log('✅ Firebase services initialization complete');

    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw new Error(`Firebase initialization failed: ${error}`);
    }
  }

  /**
   * 環境設定取得
   */
  private getEnvironmentConfig(): CloudEnvironment {
    const env = __DEV__ ? 'development' : 'production';
    
    return {
      environment: env,
      region: 'asia-northeast1', // 東京リージョン
      enableAnalytics: env !== 'development',
      enableCrashlytics: env !== 'development',
      enablePerformanceMonitoring: true,
      enableRemoteConfig: true,
    };
  }

  /**
   * Firebase設定取得
   */
  private getFirebaseConfig(): FirebaseConfig {
    // 環境別設定
    const configs = {
      development: {
        apiKey: "your-dev-api-key",
        authDomain: "ordo-app-dev.firebaseapp.com",
        projectId: "ordo-app-dev",
        storageBucket: "ordo-app-dev.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:android:dev",
      },
      staging: {
        apiKey: "your-staging-api-key", 
        authDomain: "ordo-app-staging.firebaseapp.com",
        projectId: "ordo-app-staging",
        storageBucket: "ordo-app-staging.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:android:staging",
      },
      production: {
        apiKey: "your-prod-api-key",
        authDomain: "ordo-app.firebaseapp.com", 
        projectId: "ordo-app",
        storageBucket: "ordo-app.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:android:prod",
        measurementId: "G-MEASUREMENT_ID",
      },
    };

    return configs[this.environment.environment];
  }

  /**
   * Remote Config初期化
   */
  private async initializeRemoteConfig(): Promise<void> {
    const config = remoteConfig();
    
    // デフォルト値設定
    await config.setDefaults({
      feature_voice_commands_enabled: true,
      feature_ai_recommendations_enabled: true,
      feature_advanced_analytics_enabled: false,
      sync_interval_minutes: 5,
      max_offline_storage_days: 30,
      image_compression_quality: 0.8,
      voice_confidence_threshold: 0.7,
      enable_background_sync: true,
      max_product_history: 1000,
    });

    // フェッチ間隔設定（開発環境では短く）
    const fetchInterval = __DEV__ ? 0 : 3600; // 1時間
    await config.setConfigSettings({
      minimumFetchIntervalMillis: fetchInterval * 1000,
    });

    // 初回フェッチ
    await config.fetchAndActivate();
  }

  /**
   * Cloud Messaging初期化
   */
  private async initializeMessaging(): Promise<void> {
    const messaging_instance = messaging();

    // 通知権限リクエスト
    const authStatus = await messaging_instance.requestPermission();
    const enabled = authStatus === messaging().AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging().AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // FCMトークン取得
      const fcmToken = await messaging_instance.getToken();
      console.log('📱 FCM Token:', fcmToken);

      // トークン更新リスナー
      messaging_instance.onTokenRefresh(token => {
        console.log('🔄 FCM Token refreshed:', token);
        this.updateUserFCMToken(token);
      });

      // フォアグラウンドメッセージ処理
      messaging_instance.onMessage(async remoteMessage => {
        console.log('📨 Foreground message received:', remoteMessage);
        this.handleForegroundMessage(remoteMessage);
      });

      // バックグラウンドメッセージ処理は index.js で設定
      messaging_instance.setBackgroundMessageHandler(async remoteMessage => {
        console.log('📨 Background message received:', remoteMessage);
        return this.handleBackgroundMessage(remoteMessage);
      });
    }
  }

  /**
   * Firestore設定
   */
  private async configureFirestore(): Promise<void> {
    const db = firestore();

    // オフライン永続化有効化
    await db.settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });

    // オフラインでも利用可能なコレクション設定
    await db.enableNetwork();
    
    console.log('🗃️ Firestore configured with offline persistence');
  }

  /**
   * Cloud Storage設定
   */
  private async configureStorage(): Promise<void> {
    const storage_instance = storage();
    
    // カスタムメタデータ設定
    const defaultMetadata = {
      cacheControl: 'public,max-age=31536000', // 1年キャッシュ
      contentType: 'image/jpeg',
    };

    console.log('📦 Cloud Storage configured');
  }

  /**
   * Cloud Functions設定
   */
  private async configureFunctions(): Promise<void> {
    const functions_instance = functions();

    // エミュレーター使用（開発環境）
    if (__DEV__) {
      functions_instance.useEmulator('localhost', 5001);
      console.log('🔧 Cloud Functions using emulator');
    }

    // リージョン設定
    functions_instance.useFunctionsEmulator('http://localhost:5001');

    console.log('⚡ Cloud Functions configured');
  }

  /**
   * フォアグラウンドメッセージ処理
   */
  private handleForegroundMessage(remoteMessage: any): void {
    // カスタム通知表示ロジック
    console.log('Processing foreground message:', remoteMessage);
  }

  /**
   * バックグラウンドメッセージ処理
   */
  private async handleBackgroundMessage(remoteMessage: any): Promise<void> {
    // バックグラウンド処理ロジック
    console.log('Processing background message:', remoteMessage);
  }

  /**
   * FCMトークン更新
   */
  private async updateUserFCMToken(token: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (user) {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .update({
            fcmToken: token,
            fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
          });
      }
    } catch (error) {
      console.error('FCM token update failed:', error);
    }
  }

  // === 公開API ===

  /**
   * Analytics イベント送信
   */
  async logEvent(eventName: string, parameters?: Record<string, any>): Promise<void> {
    if (this.environment.enableAnalytics) {
      await analytics().logEvent(eventName, parameters);
    }
  }

  /**
   * Crashlytics エラーログ
   */
  async logError(error: Error, context?: Record<string, any>): Promise<void> {
    if (this.environment.enableCrashlytics) {
      if (context) {
        await crashlytics().setAttributes(context);
      }
      await crashlytics().recordError(error);
    }
  }

  /**
   * Performance監視開始
   */
  async startTrace(traceName: string): Promise<any> {
    if (this.environment.enablePerformanceMonitoring) {
      const trace = perf().startTrace(traceName);
      return trace;
    }
    return null;
  }

  /**
   * Remote Config値取得
   */
  async getRemoteConfigValue(key: string): Promise<any> {
    if (this.environment.enableRemoteConfig) {
      const config = remoteConfig();
      return config.getValue(key);
    }
    return null;
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    environment: CloudEnvironment;
    services: {
      auth: boolean;
      firestore: boolean;
      storage: boolean;
      functions: boolean;
      analytics: boolean;
      crashlytics: boolean;
      messaging: boolean;
      remoteConfig: boolean;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      environment: this.environment,
      services: {
        auth: !!auth().app,
        firestore: !!firestore().app,
        storage: !!storage().app,
        functions: !!functions().app,
        analytics: this.environment.enableAnalytics,
        crashlytics: this.environment.enableCrashlytics,
        messaging: !!messaging().app,
        remoteConfig: this.environment.enableRemoteConfig,
      },
    };
  }
}

export const firebaseService = new FirebaseService();
