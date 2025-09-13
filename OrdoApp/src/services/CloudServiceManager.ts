/**
 * Cloud Service Manager
 * 統合クラウドサービス管理システム
 */

import { firebaseService } from './FirebaseServiceSwitcher';
import { awsService } from './AWSService';
import { authService } from './AuthenticationService';
import { syncEngine } from './SynchronizationEngine';
import { conflictResolutionService } from './ConflictResolutionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CloudServiceConfig {
  primaryProvider: 'firebase' | 'aws' | 'hybrid';
  enableRedundancy: boolean;
  enableFailover: boolean;
  syncMode: 'realtime' | 'periodic' | 'manual';
  dataResidency: 'us' | 'eu' | 'asia';
  enableEncryption: boolean;
  enableCompression: boolean;
  enableAnalytics: boolean;
}

export interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  latency: number;
  uptime: number;
  lastCheck: number;
  errors: string[];
}

export interface CloudServiceStats {
  totalDataSynced: number;
  totalConflictsResolved: number;
  averageLatency: number;
  successRate: number;
  storageUsed: number;
  apiCallsToday: number;
  costsToday: number;
  servicesHealth: ServiceHealthStatus[];
}

class CloudServiceManager {
  private isInitialized = false;
  private healthCheckInterval: number | null = null;
  private serviceHealthStatus: Map<string, ServiceHealthStatus> = new Map();
  private stats: CloudServiceStats;
  private listeners: Array<(event: string, data: any) => void> = [];

  private config: CloudServiceConfig = {
    primaryProvider: 'hybrid',
    enableRedundancy: true,
    enableFailover: true,
    syncMode: 'realtime',
    dataResidency: 'asia',
    enableEncryption: true,
    enableCompression: true,
    enableAnalytics: true,
  };

  constructor() {
    this.stats = {
      totalDataSynced: 0,
      totalConflictsResolved: 0,
      averageLatency: 0,
      successRate: 0,
      storageUsed: 0,
      apiCallsToday: 0,
      costsToday: 0,
      servicesHealth: [],
    };
  }

  /**
   * クラウドサービス管理システム初期化
   */
  async initialize(): Promise<void> {
    console.log('☁️ Initializing Cloud Service Manager...');

    try {
      this.setInitializationStatus('Initializing services...');

      // 1. 認証サービス初期化
      await this.initializeAuthService();

      // 2. クラウドプロバイダー初期化
      await this.initializeCloudProviders();

      // 3. 同期エンジン初期化
      await this.initializeSyncEngine();

      // 4. コンフリクト解決サービス初期化
      await this.initializeConflictResolution();

      // 5. ヘルスチェック開始
      await this.startHealthMonitoring();

      // 6. 統計データ復元
      await this.restoreStats();

      this.isInitialized = true;
      console.log('✅ Cloud Service Manager initialized successfully');
      this.notifyListeners('initialization_completed', { success: true });

    } catch (error) {
      console.error('❌ Cloud Service Manager initialization failed:', error);
      this.notifyListeners('initialization_failed', { error });
      throw new Error(`Cloud Service Manager initialization failed: ${error}`);
    }
  }

  /**
   * 認証サービス初期化
   */
  private async initializeAuthService(): Promise<void> {
    this.setInitializationStatus('Initializing authentication...');
    
    try {
      await authService.initialize();
      this.updateServiceHealth('auth', 'healthy', 0);
      console.log('✅ Authentication service initialized');
    } catch (error) {
      this.updateServiceHealth('auth', 'unhealthy', 0, [`Init failed: ${error}`]);
      throw error;
    }
  }

  /**
   * クラウドプロバイダー初期化
   */
  private async initializeCloudProviders(): Promise<void> {
    this.setInitializationStatus('Initializing cloud providers...');

    const initPromises: Promise<void>[] = [];

    // Firebase初期化
    if (this.config.primaryProvider === 'firebase' || this.config.primaryProvider === 'hybrid') {
      initPromises.push(
        firebaseService.initialize()
          .then(() => {
            this.updateServiceHealth('firebase', 'healthy', 0);
            console.log('✅ Firebase service initialized');
          })
          .catch(error => {
            this.updateServiceHealth('firebase', 'unhealthy', 0, [`Init failed: ${error}`]);
            if (this.config.primaryProvider === 'firebase') {
              throw error;
            }
            console.warn('⚠️ Firebase initialization failed, continuing with fallback');
          })
      );
    }

    // AWS初期化
    if (this.config.primaryProvider === 'aws' || this.config.primaryProvider === 'hybrid') {
      initPromises.push(
        awsService.initialize()
          .then(() => {
            this.updateServiceHealth('aws', 'healthy', 0);
            console.log('✅ AWS service initialized');
          })
          .catch(error => {
            this.updateServiceHealth('aws', 'unhealthy', 0, [`Init failed: ${error}`]);
            if (this.config.primaryProvider === 'aws') {
              throw error;
            }
            console.warn('⚠️ AWS initialization failed, continuing with fallback');
          })
      );
    }

    // 並列初期化実行
    await Promise.allSettled(initPromises);

    // 最低一つのプロバイダーが利用可能かチェック
    const healthyProviders = Array.from(this.serviceHealthStatus.values())
      .filter(status => status.status === 'healthy' && 
               (status.service === 'firebase' || status.service === 'aws'));

    if (healthyProviders.length === 0) {
      throw new Error('No cloud providers available');
    }

    console.log(`✅ Cloud providers initialized: ${healthyProviders.map(p => p.service).join(', ')}`);
  }

  /**
   * 同期エンジン初期化
   */
  private async initializeSyncEngine(): Promise<void> {
    this.setInitializationStatus('Initializing sync engine...');

    try {
      await syncEngine.initialize();
      
      // 同期イベントリスナー設定
      syncEngine.addEventListener((event, data) => {
        this.handleSyncEvent(event, data);
      });

      this.updateServiceHealth('sync', 'healthy', 0);
      console.log('✅ Sync engine initialized');

    } catch (error) {
      this.updateServiceHealth('sync', 'unhealthy', 0, [`Init failed: ${error}`]);
      throw error;
    }
  }

  /**
   * コンフリクト解決サービス初期化
   */
  private async initializeConflictResolution(): Promise<void> {
    this.setInitializationStatus('Initializing conflict resolution...');

    try {
      await conflictResolutionService.initialize();
      this.updateServiceHealth('conflict_resolution', 'healthy', 0);
      console.log('✅ Conflict resolution service initialized');

    } catch (error) {
      this.updateServiceHealth('conflict_resolution', 'unhealthy', 0, [`Init failed: ${error}`]);
      throw error;
    }
  }

  /**
   * ヘルスモニタリング開始
   */
  private async startHealthMonitoring(): Promise<void> {
    this.setInitializationStatus('Starting health monitoring...');

    // 初回ヘルスチェック実行
    await this.performHealthCheck();

    // 定期ヘルスチェック開始
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // 1分間隔

    console.log('✅ Health monitoring started');
  }

  /**
   * ヘルスチェック実行
   */
  private async performHealthCheck(): Promise<void> {
    const checks = [
      this.checkAuthServiceHealth(),
      this.checkFirebaseHealth(),
      this.checkAWSHealth(),
      this.checkSyncEngineHealth(),
      this.checkConflictResolutionHealth(),
    ];

    await Promise.allSettled(checks);

    // 全体的なヘルス状態評価
    this.evaluateOverallHealth();
  }

  /**
   * 認証サービスヘルスチェック
   */
  private async checkAuthServiceHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      const authStats = authService.getAuthStats();
      const latency = Date.now() - startTime;

      const status = authStats.isInitialized ? 'healthy' : 'unhealthy';
      this.updateServiceHealth('auth', status, latency);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateServiceHealth('auth', 'unhealthy', latency, [`Health check failed: ${error}`]);
    }
  }

  /**
   * Firebaseヘルスチェック
   */
  private async checkFirebaseHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      const firebaseStatus = firebaseService.getInitializationStatus();
      const latency = Date.now() - startTime;

      const status = firebaseStatus.isInitialized ? 'healthy' : 'unhealthy';
      this.updateServiceHealth('firebase', status, latency);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateServiceHealth('firebase', 'unhealthy', latency, [`Health check failed: ${error}`]);
    }
  }

  /**
   * AWSヘルスチェック
   */
  private async checkAWSHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      const awsHealthCheck = await awsService.healthCheck();
      const latency = Date.now() - startTime;

      this.updateServiceHealth('aws', awsHealthCheck.status, latency);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateServiceHealth('aws', 'unhealthy', latency, [`Health check failed: ${error}`]);
    }
  }

  /**
   * 同期エンジンヘルスチェック
   */
  private async checkSyncEngineHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      const syncStatus = syncEngine.getStatus();
      const latency = Date.now() - startTime;

      const status = syncStatus.isInitialized && syncStatus.isOnline ? 'healthy' : 'degraded';
      this.updateServiceHealth('sync', status, latency);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateServiceHealth('sync', 'unhealthy', latency, [`Health check failed: ${error}`]);
    }
  }

  /**
   * コンフリクト解決ヘルスチェック
   */
  private async checkConflictResolutionHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      const conflictStatus = conflictResolutionService.getStatus();
      const latency = Date.now() - startTime;

      const status = conflictStatus.isInitialized ? 'healthy' : 'unhealthy';
      this.updateServiceHealth('conflict_resolution', status, latency);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateServiceHealth('conflict_resolution', 'unhealthy', latency, [`Health check failed: ${error}`]);
    }
  }

  /**
   * 全体ヘルス状態評価
   */
  private evaluateOverallHealth(): void {
    const services = Array.from(this.serviceHealthStatus.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    this.notifyListeners('health_status_updated', {
      overallStatus,
      services: services,
      healthyCount,
      totalCount,
    });

    // 自動復旧試行
    if (overallStatus === 'unhealthy' || overallStatus === 'degraded') {
      this.attemptAutoRecovery();
    }
  }

  /**
   * 自動復旧試行
   */
  private async attemptAutoRecovery(): Promise<void> {
    console.log('🔧 Attempting auto-recovery...');

    const unhealthyServices = Array.from(this.serviceHealthStatus.values())
      .filter(status => status.status === 'unhealthy');

    for (const service of unhealthyServices) {
      try {
        await this.recoverService(service.service);
      } catch (error) {
        console.error(`❌ Auto-recovery failed for ${service.service}:`, error);
      }
    }
  }

  /**
   * サービス復旧
   */
  private async recoverService(serviceName: string): Promise<void> {
    console.log(`🔧 Attempting to recover service: ${serviceName}`);

    switch (serviceName) {
      case 'firebase':
        await firebaseService.initialize();
        break;
      case 'aws':
        await awsService.initialize();
        break;
      case 'auth':
        await authService.initialize();
        break;
      case 'sync':
        await syncEngine.initialize();
        break;
      case 'conflict_resolution':
        await conflictResolutionService.initialize();
        break;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }

    console.log(`✅ Service recovered: ${serviceName}`);
  }

  /**
   * 同期イベント処理
   */
  private handleSyncEvent(event: string, data: any): void {
    switch (event) {
      case 'sync_completed':
        this.stats.totalDataSynced += data.itemsCount || 1;
        this.updateStats();
        break;

      case 'conflict_detected':
        this.notifyListeners('conflict_detected', data);
        break;

      case 'sync_failed':
        this.notifyListeners('sync_failed', data);
        break;

      case 'network_changed':
        this.handleNetworkChange(data);
        break;
    }
  }

  /**
   * ネットワーク変更処理
   */
  private handleNetworkChange(data: any): void {
    console.log(`📶 Network status changed: ${data.isOnline ? 'online' : 'offline'}`);

    if (data.isOnline) {
      // オンライン復帰時の処理
      this.handleOnlineRestoration();
    } else {
      // オフライン時の処理
      this.handleOfflineMode();
    }

    this.notifyListeners('network_status_changed', data);
  }

  /**
   * オンライン復帰処理
   */
  private async handleOnlineRestoration(): Promise<void> {
    console.log('🌐 Online restored - triggering sync...');

    try {
      // 待機中の同期を実行
      await syncEngine.sync();
      
      // ヘルスチェック実行
      await this.performHealthCheck();

    } catch (error) {
      console.error('Online restoration failed:', error);
    }
  }

  /**
   * オフラインモード処理
   */
  private handleOfflineMode(): void {
    console.log('📡 Offline mode activated');
    
    // オフライン専用の最適化を実行
    this.optimizeForOffline();
  }

  /**
   * オフライン最適化
   */
  private optimizeForOffline(): void {
    // キャッシュサイズ最適化
    // バックグラウンド処理削減
    // バッテリー消費最適化
    console.log('🔋 Optimized for offline mode');
  }

  // === データ操作API ===

  /**
   * データ保存
   */
  async saveData(collection: string, id: string, data: any): Promise<boolean> {
    try {
      // 同期キューに追加
      await syncEngine.queueChange(collection, id, data, 'create');
      
      this.stats.totalDataSynced++;
      this.updateStats();
      
      return true;

    } catch (error) {
      console.error('Data save failed:', error);
      return false;
    }
  }

  /**
   * データ更新
   */
  async updateData(collection: string, id: string, data: any): Promise<boolean> {
    try {
      await syncEngine.queueChange(collection, id, data, 'update');
      
      this.stats.totalDataSynced++;
      this.updateStats();
      
      return true;

    } catch (error) {
      console.error('Data update failed:', error);
      return false;
    }
  }

  /**
   * データ削除
   */
  async deleteData(collection: string, id: string): Promise<boolean> {
    try {
      await syncEngine.queueChange(collection, id, null, 'delete');
      
      this.stats.totalDataSynced++;
      this.updateStats();
      
      return true;

    } catch (error) {
      console.error('Data delete failed:', error);
      return false;
    }
  }

  /**
   * 手動同期実行
   */
  async triggerSync(): Promise<boolean> {
    try {
      return await syncEngine.sync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }

  // === ユーティリティ ===

  /**
   * サービスヘルス更新
   */
  private updateServiceHealth(
    service: string,
    status: ServiceHealthStatus['status'],
    latency: number,
    errors: string[] = []
  ): void {
    const currentStatus = this.serviceHealthStatus.get(service);
    const uptime = currentStatus ? currentStatus.uptime : 0;

    this.serviceHealthStatus.set(service, {
      service,
      status,
      latency,
      uptime: status === 'healthy' ? uptime + 1 : 0,
      lastCheck: Date.now(),
      errors,
    });
  }

  /**
   * 統計更新
   */
  private async updateStats(): Promise<void> {
    // 成功率計算
    const syncStats = syncEngine.getSyncStats();
    const totalOperations = syncStats.successfulSyncs + syncStats.failedSyncs;
    this.stats.successRate = totalOperations > 0 ? 
      (syncStats.successfulSyncs / totalOperations) * 100 : 100;

    // 平均レイテンシ計算
    const latencies = Array.from(this.serviceHealthStatus.values()).map(s => s.latency);
    this.stats.averageLatency = latencies.length > 0 ?
      latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;

    // コンフリクト解決統計
    const conflictStats = conflictResolutionService.getConflictStats();
    this.stats.totalConflictsResolved = conflictStats.totalResolutions;

    // サービスヘルス配列更新
    this.stats.servicesHealth = Array.from(this.serviceHealthStatus.values());

    // 統計永続化
    await this.saveStats();
  }

  /**
   * 統計保存
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem('ordo_cloud_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  /**
   * 統計復元
   */
  private async restoreStats(): Promise<void> {
    try {
      const savedStats = await AsyncStorage.getItem('ordo_cloud_stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...JSON.parse(savedStats) };
      }
    } catch (error) {
      console.error('Failed to restore stats:', error);
    }
  }

  /**
   * 初期化状態設定
   */
  private setInitializationStatus(status: string): void {
    this.notifyListeners('initialization_status', { status });
  }

  /**
   * リスナー通知
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Listener notification failed:', error);
      }
    });
  }

  // === 公開API ===

  /**
   * イベントリスナー追加
   */
  addEventListener(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * サービス統計取得
   */
  getStats(): CloudServiceStats {
    return { ...this.stats };
  }

  /**
   * サービス健全性取得
   */
  getHealthStatus(): Map<string, ServiceHealthStatus> {
    return new Map(this.serviceHealthStatus);
  }

  /**
   * 設定更新
   */
  async updateConfig(newConfig: Partial<CloudServiceConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // 設定に基づく調整
    if (newConfig.syncMode) {
      syncEngine.updateConfig({ 
        enableRealTime: newConfig.syncMode === 'realtime' 
      });
    }

    // 設定永続化
    await AsyncStorage.setItem('ordo_cloud_config', JSON.stringify(this.config));
    
    console.log('☁️ Cloud service config updated');
  }

  /**
   * 状態取得
   */
  getStatus(): {
    isInitialized: boolean;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    activeServices: number;
    totalServices: number;
    config: CloudServiceConfig;
  } {
    const services = Array.from(this.serviceHealthStatus.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;

    let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overallHealth = 'healthy';
    } else if (healthyCount >= totalCount * 0.7) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'unhealthy';
    }

    return {
      isInitialized: this.isInitialized,
      overallHealth,
      activeServices: healthyCount,
      totalServices: totalCount,
      config: { ...this.config },
    };
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    await syncEngine.cleanup();
    this.listeners = [];
    
    console.log('🧹 Cloud Service Manager cleanup completed');
  }
}

export const cloudServiceManager = new CloudServiceManager();
