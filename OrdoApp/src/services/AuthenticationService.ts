/**
 * Authentication Service
 * 統合認証システム（Firebase Auth + AWS Cognito + Biometric）
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { signIn, signUp, signOut, getCurrentUser, confirmSignUp } from 'aws-amplify/auth';
import Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  createdAt: string;
  lastSignInAt: string;
  provider: 'firebase' | 'cognito' | 'biometric';
  metadata: {
    deviceId: string;
    platform: string;
    appVersion: string;
    lastSyncAt?: string;
  };
}

export interface AuthConfig {
  enableBiometric: boolean;
  enableRememberMe: boolean;
  sessionTimeout: number; // minutes
  maxFailedAttempts: number;
  enableMFA: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  biometricAvailable: boolean;
  biometricType: string | null;
  sessionExpiry: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  useBiometric?: boolean;
}

export interface SignUpData extends LoginCredentials {
  username?: string;
  displayName?: string;
  phoneNumber?: string;
}

class AuthenticationService {
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    biometricAvailable: false,
    biometricType: null,
    sessionExpiry: null,
  };

  private config: AuthConfig = {
    enableBiometric: true,
    enableRememberMe: true,
    sessionTimeout: 60, // 1時間
    maxFailedAttempts: 5,
    enableMFA: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  };

  private listeners: Array<(state: AuthState) => void> = [];
  private sessionTimer: NodeJS.Timeout | null = null;
  private failedAttempts = 0;
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
    this.initializeAuth();
  }

  /**
   * 認証サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🔐 Initializing Authentication Service...');

    try {
      this.setLoading(true);

      // 生体認証対応チェック
      await this.checkBiometricAvailability();

      // セッション復元試行
      await this.restoreSession();

      // Firebase Auth状態監視
      this.setupFirebaseAuthListener();

      // セッション管理開始
      this.startSessionManagement();

      console.log('✅ Authentication Service initialized');
      this.setLoading(false);

    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      this.setError(`Authentication initialization failed: ${error}`);
      this.setLoading(false);
    }
  }

  /**
   * 初期化処理
   */
  private async initializeAuth(): Promise<void> {
    // デバイス情報取得
    const deviceId = await DeviceInfo.getDeviceId();
    const platform = await DeviceInfo.getSystemName();
    const appVersion = await DeviceInfo.getVersion();

    console.log(`🔐 Auth initialized for device: ${deviceId} (${platform})`);
  }

  /**
   * 生体認証対応チェック
   */
  private async checkBiometricAvailability(): Promise<void> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      
      this.authState.biometricAvailable = available;
      this.authState.biometricType = biometryType;

      if (available) {
        console.log(`🔒 Biometric available: ${biometryType}`);
      } else {
        console.log('🔒 Biometric not available');
      }

    } catch (error) {
      console.error('Biometric check failed:', error);
      this.authState.biometricAvailable = false;
    }
  }

  /**
   * Firebase Auth状態監視
   */
  private setupFirebaseAuthListener(): void {
    auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        console.log('👤 Firebase user state changed:', firebaseUser.uid);
        await this.handleFirebaseUserChange(firebaseUser);
      } else {
        console.log('👤 Firebase user signed out');
        await this.handleSignOut();
      }
    });
  }

  /**
   * Firebase ユーザー状態変更処理
   */
  private async handleFirebaseUserChange(firebaseUser: FirebaseAuthTypes.User): Promise<void> {
    try {
      const user = await this.createUserFromFirebase(firebaseUser);
      await this.setAuthenticatedUser(user);
      
      // セッション開始
      this.startSession();

    } catch (error) {
      console.error('Firebase user change handling failed:', error);
      this.setError('User authentication failed');
    }
  }

  /**
   * Firebase ユーザーからUser オブジェクト作成
   */
  private async createUserFromFirebase(firebaseUser: FirebaseAuthTypes.User): Promise<User> {
    const deviceId = await DeviceInfo.getDeviceId();
    const platform = await DeviceInfo.getSystemName();
    const appVersion = await DeviceInfo.getVersion();

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      username: firebaseUser.displayName || undefined,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      emailVerified: firebaseUser.emailVerified,
      phoneNumber: firebaseUser.phoneNumber || undefined,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      lastSignInAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
      provider: 'firebase',
      metadata: {
        deviceId,
        platform,
        appVersion,
      },
    };
  }

  // === 認証操作 ===

  /**
   * ユーザーサインアップ
   */
  async signUp(signUpData: SignUpData): Promise<{ success: boolean; requiresVerification?: boolean }> {
    console.log('📝 Starting user sign up...');
    this.setLoading(true);
    this.setError(null);

    try {
      // パスワード検証
      const passwordValidation = this.validatePassword(signUpData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Firebase でサインアップ
      const firebaseResult = await auth().createUserWithEmailAndPassword(
        signUpData.email,
        signUpData.password
      );

      if (firebaseResult.user) {
        // プロフィール更新
        if (signUpData.displayName) {
          await firebaseResult.user.updateProfile({
            displayName: signUpData.displayName,
          });
        }

        // 認証情報保存
        if (signUpData.rememberMe) {
          await this.saveCredentials(signUpData.email, signUpData.password);
        }

        // 生体認証設定
        if (signUpData.useBiometric && this.authState.biometricAvailable) {
          await this.setupBiometricAuth(signUpData.email, signUpData.password);
        }

        console.log('✅ User sign up successful');
        this.setLoading(false);

        return {
          success: true,
          requiresVerification: !firebaseResult.user.emailVerified,
        };
      }

      throw new Error('Sign up failed');

    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      this.setError(this.getAuthErrorMessage(error.code));
      this.setLoading(false);
      return { success: false };
    }
  }

  /**
   * ユーザーサインイン
   */
  async signIn(credentials: LoginCredentials): Promise<{ success: boolean; user?: User }> {
    console.log('🔑 Starting user sign in...');
    this.setLoading(true);
    this.setError(null);

    try {
      // 失敗回数チェック
      if (this.failedAttempts >= this.config.maxFailedAttempts) {
        throw new Error('Too many failed attempts. Please try again later.');
      }

      let authResult: any = null;

      // 生体認証試行
      if (credentials.useBiometric && this.authState.biometricAvailable) {
        const biometricCredentials = await this.authenticateWithBiometric();
        if (biometricCredentials) {
          credentials.email = biometricCredentials.email;
          credentials.password = biometricCredentials.password;
        }
      }

      // Firebase でサインイン
      authResult = await auth().signInWithEmailAndPassword(
        credentials.email,
        credentials.password
      );

      if (authResult.user) {
        const user = await this.createUserFromFirebase(authResult.user);

        // 認証情報保存
        if (credentials.rememberMe) {
          await this.saveCredentials(credentials.email, credentials.password);
        }

        // 失敗回数リセット
        this.failedAttempts = 0;

        console.log('✅ User sign in successful');
        this.setLoading(false);

        return { success: true, user };
      }

      throw new Error('Sign in failed');

    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      
      this.failedAttempts++;
      this.setError(this.getAuthErrorMessage(error.code));
      this.setLoading(false);
      
      return { success: false };
    }
  }

  /**
   * 生体認証でサインイン
   */
  async signInWithBiometric(): Promise<{ success: boolean; user?: User }> {
    console.log('🔒 Starting biometric sign in...');

    if (!this.authState.biometricAvailable) {
      return { success: false };
    }

    try {
      const credentials = await this.authenticateWithBiometric();
      
      if (credentials) {
        return await this.signIn({
          email: credentials.email,
          password: credentials.password,
          useBiometric: true,
        });
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Biometric sign in failed:', error);
      this.setError('Biometric authentication failed');
      return { success: false };
    }
  }

  /**
   * ユーザーサインアウト
   */
  async signOut(): Promise<void> {
    console.log('👋 Starting user sign out...');
    this.setLoading(true);

    try {
      // Firebase からサインアウト
      await auth().signOut();

      // セッション情報クリア
      await this.clearSession();

      console.log('✅ User sign out successful');

    } catch (error) {
      console.error('❌ Sign out failed:', error);
      this.setError('Sign out failed');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * パスワードリセット
   */
  async resetPassword(email: string): Promise<{ success: boolean }> {
    console.log('📧 Sending password reset email...');
    this.setLoading(true);

    try {
      await auth().sendPasswordResetEmail(email);
      
      console.log('✅ Password reset email sent');
      this.setLoading(false);
      
      return { success: true };

    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      this.setError(this.getAuthErrorMessage(error.code));
      this.setLoading(false);
      
      return { success: false };
    }
  }

  // === 生体認証関連 ===

  /**
   * 生体認証設定
   */
  async setupBiometricAuth(email: string, password: string): Promise<boolean> {
    if (!this.authState.biometricAvailable) {
      return false;
    }

    try {
      // 生体認証プロンプト表示
      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: '生体認証を設定しますか？',
        cancelButtonText: 'キャンセル',
      });

      if (success) {
        // 認証情報を暗号化して保存
        await Keychain.setInternetCredentials(
          'ordo_biometric_auth',
          email,
          password,
          {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
            authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          }
        );

        console.log('🔒 Biometric authentication setup successful');
        return true;
      }

      return false;

    } catch (error) {
      console.error('Biometric setup failed:', error);
      return false;
    }
  }

  /**
   * 生体認証実行
   */
  private async authenticateWithBiometric(): Promise<{ email: string; password: string } | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('ordo_biometric_auth');
      
      if (credentials && credentials.password) {
        return {
          email: credentials.username,
          password: credentials.password,
        };
      }

      return null;

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }

  /**
   * 生体認証削除
   */
  async removeBiometricAuth(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials('ordo_biometric_auth');
      console.log('🔒 Biometric authentication removed');
      return true;

    } catch (error) {
      console.error('Biometric removal failed:', error);
      return false;
    }
  }

  // === セッション管理 ===

  /**
   * セッション開始
   */
  private startSession(): void {
    const expiryTime = Date.now() + (this.config.sessionTimeout * 60 * 1000);
    this.authState.sessionExpiry = expiryTime;

    // セッションタイマー設定
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      console.log('⏰ Session expired');
      this.handleSessionExpiry();
    }, this.config.sessionTimeout * 60 * 1000);

    console.log(`⏱️ Session started, expires at: ${new Date(expiryTime).toLocaleString()}`);
  }

  /**
   * セッション期限切れ処理
   */
  private async handleSessionExpiry(): Promise<void> {
    console.log('⚠️ Session has expired');
    
    await this.signOut();
    this.setError('Session expired. Please sign in again.');
  }

  /**
   * セッション延長
   */
  async extendSession(): Promise<void> {
    if (this.authState.isAuthenticated) {
      this.startSession();
      console.log('🔄 Session extended');
    }
  }

  /**
   * セッション復元
   */
  private async restoreSession(): Promise<void> {
    try {
      // 保存された認証情報チェック
      const savedCredentials = await this.getSavedCredentials();
      if (savedCredentials) {
        console.log('🔄 Attempting to restore session...');
        
        const result = await this.signIn({
          email: savedCredentials.email,
          password: savedCredentials.password,
          rememberMe: true,
        });

        if (result.success) {
          console.log('✅ Session restored successfully');
        }
      }

    } catch (error) {
      console.error('Session restoration failed:', error);
    }
  }

  /**
   * セッションクリア
   */
  private async clearSession(): Promise<void> {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    this.authState.sessionExpiry = null;
    await this.handleSignOut();
  }

  /**
   * セッション管理開始
   */
  private startSessionManagement(): void {
    // バックグラウンド/フォアグラウンド状態監視は別途実装
    console.log('📱 Session management started');
  }

  // === 認証情報管理 ===

  /**
   * 認証情報保存
   */
  private async saveCredentials(email: string, password: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        'ordo_auth_credentials',
        email,
        password
      );
      console.log('💾 Credentials saved');

    } catch (error) {
      console.error('Credential save failed:', error);
    }
  }

  /**
   * 保存された認証情報取得
   */
  private async getSavedCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('ordo_auth_credentials');
      
      if (credentials && credentials.password) {
        return {
          email: credentials.username,
          password: credentials.password,
        };
      }

      return null;

    } catch (error) {
      console.error('Credential retrieval failed:', error);
      return null;
    }
  }

  /**
   * 認証情報削除
   */
  async clearSavedCredentials(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials('ordo_auth_credentials');
      console.log('🗑️ Saved credentials cleared');

    } catch (error) {
      console.error('Credential clearing failed:', error);
    }
  }

  // === ユーティリティ ===

  /**
   * パスワード検証
   */
  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 認証エラーメッセージ取得
   */
  private getAuthErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています。',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
      'auth/user-not-found': 'ユーザーが見つかりません。',
      'auth/wrong-password': 'パスワードが正しくありません。',
      'auth/weak-password': 'パスワードが弱すぎます。',
      'auth/too-many-requests': 'リクエストが多すぎます。しばらく待ってから再試行してください。',
      'auth/network-request-failed': 'ネットワークエラーが発生しました。',
      'auth/user-disabled': 'このアカウントは無効化されています。',
    };

    return errorMessages[errorCode] || '認証エラーが発生しました。';
  }

  // === 状態管理 ===

  /**
   * 認証済みユーザー設定
   */
  private async setAuthenticatedUser(user: User): Promise<void> {
    this.authState.user = user;
    this.authState.isAuthenticated = true;
    this.authState.error = null;

    // ユーザー情報をローカルストレージに保存
    await AsyncStorage.setItem('ordo_current_user', JSON.stringify(user));

    this.notifyListeners();
  }

  /**
   * サインアウト処理
   */
  private async handleSignOut(): Promise<void> {
    this.authState.user = null;
    this.authState.isAuthenticated = false;
    this.authState.error = null;
    this.authState.sessionExpiry = null;

    // ローカルストレージからユーザー情報削除
    await AsyncStorage.removeItem('ordo_current_user');

    this.notifyListeners();
  }

  /**
   * ローディング状態設定
   */
  private setLoading(loading: boolean): void {
    this.authState.isLoading = loading;
    this.notifyListeners();
  }

  /**
   * エラー設定
   */
  private setError(error: string | null): void {
    this.authState.error = error;
    this.notifyListeners();
  }

  /**
   * リスナー通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  // === 公開API ===

  /**
   * 認証状態リスナー追加
   */
  addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 現在の認証状態取得
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 現在のユーザー取得
   */
  getCurrentUser(): User | null {
    return this.authState.user;
  }

  /**
   * 認証済みかチェック
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.user;
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔐 Auth config updated:', this.config);
  }

  /**
   * 統計情報取得
   */
  getAuthStats(): {
    isInitialized: boolean;
    biometricAvailable: boolean;
    biometricType: string | null;
    sessionActive: boolean;
    sessionExpiry: number | null;
    failedAttempts: number;
    config: AuthConfig;
  } {
    return {
      isInitialized: true,
      biometricAvailable: this.authState.biometricAvailable,
      biometricType: this.authState.biometricType,
      sessionActive: this.authState.isAuthenticated,
      sessionExpiry: this.authState.sessionExpiry,
      failedAttempts: this.failedAttempts,
      config: { ...this.config },
    };
  }
}

export const authService = new AuthenticationService();
