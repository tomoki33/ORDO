/**
 * Beta Test Environment Service
 * ベータテスト環境の構築と管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

export interface BetaTester {
  id: string;
  email: string;
  name: string;
  deviceInfo: DeviceInfo;
  joinedAt: number;
  testGroup: 'A' | 'B' | 'Control';
  isActive: boolean;
  feedbackCount: number;
  crashReports: number;
  lastActiveAt: number;
  testingPermissions: string[];
  notes?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  systemName: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  brand: string;
  model: string;
  uniqueId: string;
  isTablet: boolean;
  hasNotch: boolean;
  screenDimensions: {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };
  network: {
    type: string;
    isConnected: boolean;
    isWifi: boolean;
  };
  memory: {
    totalMemory: number;
    usedMemory: number;
    freeMemory: number;
  };
  storage: {
    totalStorage: number;
    usedStorage: number;
    freeStorage: number;
  };
}

export interface TestConfiguration {
  environment: 'development' | 'staging' | 'beta' | 'production';
  features: {
    [featureName: string]: {
      enabled: boolean;
      rolloutPercentage: number;
      targetGroups: string[];
      experimentId?: string;
    };
  };
  analytics: {
    enabled: boolean;
    crashReporting: boolean;
    performanceMonitoring: boolean;
    userBehaviorTracking: boolean;
    detailedLogging: boolean;
  };
  debugging: {
    showDebugMenu: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    enableMockData: boolean;
    simulateSlowNetwork: boolean;
    enablePerformanceOverlay: boolean;
  };
  testingTools: {
    shakeToBugReport: boolean;
    screenshotFeedback: boolean;
    touchVisualization: boolean;
    memoryLeakDetection: boolean;
    networkInspector: boolean;
  };
}

export interface BetaEnvironmentMetrics {
  activeTesters: number;
  totalSessions: number;
  averageSessionDuration: number;
  crashRate: number;
  feedbackSubmissions: number;
  deviceDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
  featureUsageStats: Record<string, number>;
  performanceMetrics: {
    averageAppStartTime: number;
    averageMemoryUsage: number;
    networkLatency: number;
  };
}

export interface TestSession {
  id: string;
  testerId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  actions: TestAction[];
  crashes: CrashReport[];
  performanceData: PerformanceData[];
  screenshots: string[];
  logs: LogEntry[];
  metadata: {
    testScenario?: string;
    buildVersion: string;
    deviceInfo: DeviceInfo;
    networkCondition: string;
  };
}

export interface TestAction {
  id: string;
  timestamp: number;
  type: 'tap' | 'swipe' | 'input' | 'navigate' | 'background' | 'foreground';
  target?: string;
  coordinates?: { x: number; y: number };
  value?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface CrashReport {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack: string;
    componentStack?: string;
  };
  deviceInfo: DeviceInfo;
  userActions: TestAction[];
  appState: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reproduced: boolean;
  fixed: boolean;
}

export interface PerformanceData {
  timestamp: number;
  metric: 'memory' | 'cpu' | 'network' | 'render' | 'navigation';
  value: number;
  unit: string;
  threshold?: number;
  exceeded?: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  category: string;
  data?: any;
}

class BetaTestEnvironmentService {
  private currentTester: BetaTester | null = null;
  private testConfiguration: TestConfiguration | null = null;
  private currentSession: TestSession | null = null;
  private isInitialized = false;
  private deviceInfo: DeviceInfo | null = null;
  private actionLog: TestAction[] = [];
  private performanceMonitor: any = null;

  private readonly STORAGE_KEYS = {
    BETA_TESTER: 'beta_tester',
    TEST_CONFIG: 'test_configuration',
    SESSION_DATA: 'session_data',
    DEVICE_INFO: 'device_info',
    CRASH_REPORTS: 'crash_reports',
    PERFORMANCE_DATA: 'performance_data',
  };

  constructor() {
    this.setupCrashHandling();
    this.setupPerformanceMonitoring();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🧪 Initializing Beta Test Environment Service...');

    try {
      // デバイス情報収集
      await this.collectDeviceInfo();

      // ベータテスター情報読み込み
      await this.loadBetaTesterInfo();

      // テスト設定読み込み
      await this.loadTestConfiguration();

      // テストセッション開始
      await this.startTestSession();

      this.isInitialized = true;
      console.log('✅ Beta Test Environment Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Beta Test Environment Service:', error);
      throw error;
    }
  }

  /**
   * デバイス情報収集
   */
  private async collectDeviceInfo(): Promise<void> {
    try {
      const [
        deviceId,
        deviceName,
        systemName,
        systemVersion,
        appVersion,
        buildNumber,
        brand,
        model,
        uniqueId,
        isTablet,
        hasNotch,
        totalMemory,
        usedMemory,
        totalStorage,
        usedStorage,
      ] = await Promise.all([
        DeviceInfo.getDeviceId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getUniqueId(),
        DeviceInfo.isTablet(),
        DeviceInfo.hasNotch(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getUsedMemory(),
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getUsedDiskCapacity(),
      ]);

      const { width, height, scale, fontScale } = await DeviceInfo.getDeviceDimensions();

      this.deviceInfo = {
        deviceId,
        deviceName,
        systemName,
        systemVersion,
        appVersion,
        buildNumber,
        brand,
        model,
        uniqueId,
        isTablet,
        hasNotch,
        screenDimensions: {
          width,
          height,
          scale,
          fontScale,
        },
        network: {
          type: 'unknown',
          isConnected: true,
          isWifi: false,
        },
        memory: {
          totalMemory,
          usedMemory,
          freeMemory: totalMemory - usedMemory,
        },
        storage: {
          totalStorage,
          usedStorage,
          freeStorage: totalStorage - usedStorage,
        },
      };

      // デバイス情報を保存
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.DEVICE_INFO,
        JSON.stringify(this.deviceInfo)
      );

      console.log('📱 Device info collected:', {
        device: `${brand} ${model}`,
        os: `${systemName} ${systemVersion}`,
        app: `v${appVersion} (${buildNumber})`,
      });

    } catch (error) {
      console.error('Failed to collect device info:', error);
      throw error;
    }
  }

  /**
   * ベータテスター情報読み込み
   */
  private async loadBetaTesterInfo(): Promise<void> {
    try {
      const storedTester = await AsyncStorage.getItem(this.STORAGE_KEYS.BETA_TESTER);
      
      if (storedTester) {
        this.currentTester = JSON.parse(storedTester);
        console.log('👤 Beta tester loaded:', this.currentTester?.email);
      }
    } catch (error) {
      console.error('Failed to load beta tester info:', error);
    }
  }

  /**
   * テスト設定読み込み
   */
  private async loadTestConfiguration(): Promise<void> {
    try {
      const storedConfig = await AsyncStorage.getItem(this.STORAGE_KEYS.TEST_CONFIG);
      
      if (storedConfig) {
        this.testConfiguration = JSON.parse(storedConfig);
      } else {
        // デフォルト設定
        this.testConfiguration = this.getDefaultTestConfiguration();
        await this.saveTestConfiguration();
      }

      console.log('⚙️ Test configuration loaded:', this.testConfiguration.environment);
    } catch (error) {
      console.error('Failed to load test configuration:', error);
    }
  }

  /**
   * デフォルトテスト設定取得
   */
  private getDefaultTestConfiguration(): TestConfiguration {
    return {
      environment: 'beta',
      features: {
        'ai-recognition': {
          enabled: true,
          rolloutPercentage: 100,
          targetGroups: ['A', 'B'],
        },
        'voice-commands': {
          enabled: true,
          rolloutPercentage: 50,
          targetGroups: ['A'],
          experimentId: 'voice-exp-001',
        },
        'advanced-analytics': {
          enabled: false,
          rolloutPercentage: 0,
          targetGroups: [],
        },
      },
      analytics: {
        enabled: true,
        crashReporting: true,
        performanceMonitoring: true,
        userBehaviorTracking: true,
        detailedLogging: true,
      },
      debugging: {
        showDebugMenu: true,
        logLevel: 'debug',
        enableMockData: false,
        simulateSlowNetwork: false,
        enablePerformanceOverlay: false,
      },
      testingTools: {
        shakeToBugReport: true,
        screenshotFeedback: true,
        touchVisualization: false,
        memoryLeakDetection: true,
        networkInspector: true,
      },
    };
  }

  /**
   * ベータテスター登録
   */
  async registerBetaTester(
    email: string,
    name: string,
    testGroup: 'A' | 'B' | 'Control' = 'A'
  ): Promise<BetaTester> {
    if (!this.deviceInfo) {
      throw new Error('Device info not available');
    }

    const tester: BetaTester = {
      id: `tester_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      deviceInfo: this.deviceInfo,
      joinedAt: Date.now(),
      testGroup,
      isActive: true,
      feedbackCount: 0,
      crashReports: 0,
      lastActiveAt: Date.now(),
      testingPermissions: ['basic', 'feedback', 'crash-reporting'],
    };

    this.currentTester = tester;

    // ベータテスター情報保存
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.BETA_TESTER,
      JSON.stringify(tester)
    );

    console.log('✅ Beta tester registered:', email);
    return tester;
  }

  /**
   * テストセッション開始
   */
  async startTestSession(testScenario?: string): Promise<string> {
    if (!this.deviceInfo) {
      throw new Error('Device info not available');
    }

    const session: TestSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testerId: this.currentTester?.id || 'anonymous',
      startTime: Date.now(),
      actions: [],
      crashes: [],
      performanceData: [],
      screenshots: [],
      logs: [],
      metadata: {
        testScenario,
        buildVersion: this.deviceInfo.appVersion,
        deviceInfo: this.deviceInfo,
        networkCondition: 'good', // TODO: 実際のネットワーク状態を取得
      },
    };

    this.currentSession = session;
    this.actionLog = [];

    // セッション開始ログ
    await this.logAction({
      type: 'navigate',
      target: 'session_start',
      success: true,
    });

    console.log('🎬 Test session started:', session.id);
    return session.id;
  }

  /**
   * テストセッション終了
   */
  async endTestSession(): Promise<TestSession | null> {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.actions = [...this.actionLog];

    // セッション終了ログ
    await this.logAction({
      type: 'navigate',
      target: 'session_end',
      success: true,
    });

    // セッションデータ保存
    await this.saveSessionData(this.currentSession);

    const completedSession = { ...this.currentSession };
    this.currentSession = null;
    this.actionLog = [];

    console.log('🏁 Test session ended:', completedSession.id, `(${completedSession.duration}ms)`);
    return completedSession;
  }

  /**
   * テストアクションログ記録
   */
  async logAction(actionData: Partial<TestAction>): Promise<void> {
    const action: TestAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: actionData.type || 'tap',
      target: actionData.target,
      coordinates: actionData.coordinates,
      value: actionData.value,
      duration: actionData.duration,
      success: actionData.success !== false,
      errorMessage: actionData.errorMessage,
    };

    this.actionLog.push(action);

    // アクションログが多すぎる場合は古いものを削除
    if (this.actionLog.length > 1000) {
      this.actionLog = this.actionLog.slice(-500);
    }

    // デバッグ用ログ
    if (this.testConfiguration?.debugging.logLevel === 'debug') {
      console.log('📝 Action logged:', {
        type: action.type,
        target: action.target,
        success: action.success,
      });
    }
  }

  /**
   * クラッシュレポート記録
   */
  async reportCrash(error: Error, componentStack?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    if (!this.deviceInfo) {
      console.warn('Cannot report crash: device info not available');
      return;
    }

    const crashReport: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack || 'No stack trace available',
        componentStack,
      },
      deviceInfo: this.deviceInfo,
      userActions: [...this.actionLog].slice(-10), // 直近10アクション
      appState: {
        // TODO: アプリの現在の状態を取得
        currentScreen: 'unknown',
        userLoggedIn: !!this.currentTester,
      },
      severity,
      reproduced: false,
      fixed: false,
    };

    // クラッシュレポート保存
    const existingReports = await this.loadCrashReports();
    existingReports.push(crashReport);
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.CRASH_REPORTS,
      JSON.stringify(existingReports)
    );

    // ベータテスターのクラッシュカウント更新
    if (this.currentTester) {
      this.currentTester.crashReports++;
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.BETA_TESTER,
        JSON.stringify(this.currentTester)
      );
    }

    console.error('💥 Crash reported:', {
      id: crashReport.id,
      error: error.name,
      severity,
    });
  }

  /**
   * パフォーマンスデータ記録
   */
  async logPerformanceData(
    metric: 'memory' | 'cpu' | 'network' | 'render' | 'navigation',
    value: number,
    unit: string,
    threshold?: number
  ): Promise<void> {
    const performanceData: PerformanceData = {
      timestamp: Date.now(),
      metric,
      value,
      unit,
      threshold,
      exceeded: threshold ? value > threshold : false,
    };

    if (this.currentSession) {
      this.currentSession.performanceData.push(performanceData);
    }

    // パフォーマンスデータ保存
    const existingData = await this.loadPerformanceData();
    existingData.push(performanceData);
    
    // データが多すぎる場合は古いものを削除（過去24時間分のみ保持）
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filteredData = existingData.filter(data => data.timestamp > oneDayAgo);
    
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.PERFORMANCE_DATA,
      JSON.stringify(filteredData)
    );

    if (performanceData.exceeded) {
      console.warn('⚠️ Performance threshold exceeded:', {
        metric,
        value,
        threshold,
        unit,
      });
    }
  }

  /**
   * 機能フラグチェック
   */
  isFeatureEnabled(featureName: string): boolean {
    if (!this.testConfiguration || !this.currentTester) {
      return false;
    }

    const feature = this.testConfiguration.features[featureName];
    if (!feature || !feature.enabled) {
      return false;
    }

    // テストグループチェック
    if (feature.targetGroups.length > 0 && !feature.targetGroups.includes(this.currentTester.testGroup)) {
      return false;
    }

    // ロールアウト率チェック
    const userHash = this.hashString(this.currentTester.id + featureName);
    const rolloutThreshold = feature.rolloutPercentage / 100;
    
    return userHash < rolloutThreshold;
  }

  /**
   * テスト設定更新
   */
  async updateTestConfiguration(updates: Partial<TestConfiguration>): Promise<void> {
    if (!this.testConfiguration) {
      this.testConfiguration = this.getDefaultTestConfiguration();
    }

    this.testConfiguration = {
      ...this.testConfiguration,
      ...updates,
    };

    await this.saveTestConfiguration();
    console.log('⚙️ Test configuration updated');
  }

  /**
   * ベータ環境メトリクス取得
   */
  async getBetaEnvironmentMetrics(): Promise<BetaEnvironmentMetrics> {
    const [crashReports, performanceData, sessionData] = await Promise.all([
      this.loadCrashReports(),
      this.loadPerformanceData(),
      this.loadSessionData(),
    ]);

    const totalSessions = sessionData.length;
    const totalDuration = sessionData.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    const deviceDistribution: Record<string, number> = {};
    const osDistribution: Record<string, number> = {};
    
    sessionData.forEach(session => {
      const device = `${session.metadata.deviceInfo.brand} ${session.metadata.deviceInfo.model}`;
      const os = `${session.metadata.deviceInfo.systemName} ${session.metadata.deviceInfo.systemVersion}`;
      
      deviceDistribution[device] = (deviceDistribution[device] || 0) + 1;
      osDistribution[os] = (osDistribution[os] || 0) + 1;
    });

    const memoryUsages = performanceData
      .filter(data => data.metric === 'memory')
      .map(data => data.value);
    
    const averageMemoryUsage = memoryUsages.length > 0 
      ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length 
      : 0;

    return {
      activeTesters: this.currentTester ? 1 : 0, // 実際の実装では複数テスターを管理
      totalSessions,
      averageSessionDuration,
      crashRate: totalSessions > 0 ? crashReports.length / totalSessions : 0,
      feedbackSubmissions: this.currentTester?.feedbackCount || 0,
      deviceDistribution,
      osDistribution,
      featureUsageStats: {}, // TODO: 機能使用統計を実装
      performanceMetrics: {
        averageAppStartTime: 0, // TODO: 実装
        averageMemoryUsage,
        networkLatency: 0, // TODO: 実装
      },
    };
  }

  // === プライベートメソッド ===

  /**
   * クラッシュハンドリング設定
   */
  private setupCrashHandling(): void {
    // グローバルエラーハンドラー
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.reportCrash(error, undefined, isFatal ? 'critical' : 'medium');
      originalHandler?.(error, isFatal);
    });

    // 未処理のPromise拒否ハンドラー
    const unhandledRejectionHandler = (event: any) => {
      const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);
      this.reportCrash(error, undefined, 'medium');
    };

    // @ts-ignore
    global.addEventListener?.('unhandledrejection', unhandledRejectionHandler);
  }

  /**
   * パフォーマンス監視設定
   */
  private setupPerformanceMonitoring(): void {
    // メモリ使用量監視
    setInterval(async () => {
      if (!this.testConfiguration?.analytics.performanceMonitoring) {
        return;
      }

      try {
        const usedMemory = await DeviceInfo.getUsedMemory();
        await this.logPerformanceData('memory', usedMemory, 'bytes', 500 * 1024 * 1024); // 500MB閾値
      } catch (error) {
        console.warn('Failed to monitor memory usage:', error);
      }
    }, 30000); // 30秒間隔
  }

  /**
   * 文字列ハッシュ化
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash) / 2147483647; // 0-1の範囲に正規化
  }

  /**
   * テスト設定保存
   */
  private async saveTestConfiguration(): Promise<void> {
    if (this.testConfiguration) {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.TEST_CONFIG,
        JSON.stringify(this.testConfiguration)
      );
    }
  }

  /**
   * セッションデータ保存
   */
  private async saveSessionData(session: TestSession): Promise<void> {
    const existingSessions = await this.loadSessionData();
    existingSessions.push(session);
    
    // 最新100セッションのみ保持
    const recentSessions = existingSessions.slice(-100);
    
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.SESSION_DATA,
      JSON.stringify(recentSessions)
    );
  }

  /**
   * クラッシュレポート読み込み
   */
  private async loadCrashReports(): Promise<CrashReport[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CRASH_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load crash reports:', error);
      return [];
    }
  }

  /**
   * パフォーマンスデータ読み込み
   */
  private async loadPerformanceData(): Promise<PerformanceData[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_DATA);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load performance data:', error);
      return [];
    }
  }

  /**
   * セッションデータ読み込み
   */
  private async loadSessionData(): Promise<TestSession[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSION_DATA);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load session data:', error);
      return [];
    }
  }

  // === 公開API ===

  /**
   * 現在のベータテスター取得
   */
  getCurrentTester(): BetaTester | null {
    return this.currentTester;
  }

  /**
   * 現在のテスト設定取得
   */
  getTestConfiguration(): TestConfiguration | null {
    return this.testConfiguration;
  }

  /**
   * 現在のセッション取得
   */
  getCurrentSession(): TestSession | null {
    return this.currentSession;
  }

  /**
   * デバイス情報取得
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * 初期化状態確認
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * テスト環境状態取得
   */
  getEnvironmentStatus(): {
    environment: string;
    tester: BetaTester | null;
    session: TestSession | null;
    featuresEnabled: string[];
    debugMode: boolean;
  } {
    const featuresEnabled = this.testConfiguration 
      ? Object.keys(this.testConfiguration.features).filter(feature => this.isFeatureEnabled(feature))
      : [];

    return {
      environment: this.testConfiguration?.environment || 'unknown',
      tester: this.currentTester,
      session: this.currentSession,
      featuresEnabled,
      debugMode: this.testConfiguration?.debugging.showDebugMenu || false,
    };
  }
}

export const betaTestEnvironmentService = new BetaTestEnvironmentService();
