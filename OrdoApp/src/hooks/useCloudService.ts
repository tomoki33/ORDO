/**
 * React Hook for Cloud Service Manager
 * クラウドサービス管理用Reactフック
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cloudServiceManager, CloudServiceStats, ServiceHealthStatus } from '../services/CloudServiceManager';

export interface UseCloudServiceReturn {
  // 状態
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 統計・ヘルス
  stats: CloudServiceStats | null;
  healthStatus: Map<string, ServiceHealthStatus> | null;
  overallHealth: 'healthy' | 'degraded' | 'unhealthy' | null;
  
  // データ操作
  saveData: (collection: string, id: string, data: any) => Promise<boolean>;
  updateData: (collection: string, id: string, data: any) => Promise<boolean>;
  deleteData: (collection: string, id: string) => Promise<boolean>;
  triggerSync: () => Promise<boolean>;
  
  // 制御
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  refreshStats: () => void;
}

export function useCloudService(): UseCloudServiceReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CloudServiceStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<Map<string, ServiceHealthStatus> | null>(null);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'degraded' | 'unhealthy' | null>(null);
  
  const removeListenerRef = useRef<(() => void) | null>(null);
  const statsIntervalRef = useRef<number | null>(null);

  // クラウドサービス初期化
  const initialize = useCallback(async () => {
    if (isInitialized || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // イベントリスナー設定
      removeListenerRef.current = cloudServiceManager.addEventListener((event, data) => {
        handleCloudServiceEvent(event, data);
      });

      // 初期化実行
      await cloudServiceManager.initialize();
      
      setIsInitialized(true);
      
      // 定期統計更新開始
      startStatsPolling();
      
      console.log('✅ Cloud service hook initialized');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Cloud service initialization failed:', err);
      
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading]);

  // クラウドサービスイベント処理
  const handleCloudServiceEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'initialization_completed':
        setIsInitialized(true);
        setError(null);
        refreshStats();
        break;

      case 'initialization_failed':
        setError(data.error?.message || 'Initialization failed');
        setIsInitialized(false);
        break;

      case 'initialization_status':
        // 初期化進捗表示（必要に応じて）
        console.log('🔄 Initialization:', data.status);
        break;

      case 'health_status_updated':
        setOverallHealth(data.overallStatus);
        updateHealthFromEvent(data);
        break;

      case 'network_status_changed':
        console.log('📶 Network status:', data.isOnline ? 'Online' : 'Offline');
        // 必要に応じてUI更新
        break;

      case 'conflict_detected':
        console.log('⚠️ Conflict detected:', data);
        // コンフリクト通知（必要に応じて）
        break;

      case 'sync_failed':
        console.warn('🔄 Sync failed:', data);
        // 同期エラー処理
        break;

      default:
        console.log('📡 Cloud service event:', event, data);
    }
  }, []);

  // ヘルス状態更新
  const updateHealthFromEvent = useCallback((data: any) => {
    if (data.services) {
      const healthMap = new Map<string, ServiceHealthStatus>();
      data.services.forEach((service: ServiceHealthStatus) => {
        healthMap.set(service.service, service);
      });
      setHealthStatus(healthMap);
    }
  }, []);

  // 統計更新
  const refreshStats = useCallback(() => {
    try {
      const currentStats = cloudServiceManager.getStats();
      const currentHealth = cloudServiceManager.getHealthStatus();
      const status = cloudServiceManager.getStatus();
      
      setStats(currentStats);
      setHealthStatus(currentHealth);
      setOverallHealth(status.overallHealth);
      
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }, []);

  // 定期統計更新開始
  const startStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    // 30秒間隔で統計更新
    statsIntervalRef.current = setInterval(() => {
      refreshStats();
    }, 30000);

    // 初回実行
    refreshStats();
  }, [refreshStats]);

  // データ操作関数
  const saveData = useCallback(async (collection: string, id: string, data: any): Promise<boolean> => {
    try {
      const result = await cloudServiceManager.saveData(collection, id, data);
      if (result) {
        refreshStats(); // 統計更新
      }
      return result;
    } catch (err) {
      console.error('Save data failed:', err);
      return false;
    }
  }, [refreshStats]);

  const updateData = useCallback(async (collection: string, id: string, data: any): Promise<boolean> => {
    try {
      const result = await cloudServiceManager.updateData(collection, id, data);
      if (result) {
        refreshStats(); // 統計更新
      }
      return result;
    } catch (err) {
      console.error('Update data failed:', err);
      return false;
    }
  }, [refreshStats]);

  const deleteData = useCallback(async (collection: string, id: string): Promise<boolean> => {
    try {
      const result = await cloudServiceManager.deleteData(collection, id);
      if (result) {
        refreshStats(); // 統計更新
      }
      return result;
    } catch (err) {
      console.error('Delete data failed:', err);
      return false;
    }
  }, [refreshStats]);

  const triggerSync = useCallback(async (): Promise<boolean> => {
    try {
      const result = await cloudServiceManager.triggerSync();
      if (result) {
        refreshStats(); // 統計更新
      }
      return result;
    } catch (err) {
      console.error('Manual sync failed:', err);
      return false;
    }
  }, [refreshStats]);

  // クリーンアップ
  const cleanup = useCallback(async () => {
    // 統計ポーリング停止
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    // イベントリスナー削除
    if (removeListenerRef.current) {
      removeListenerRef.current();
      removeListenerRef.current = null;
    }

    // クラウドサービス管理システムクリーンアップ
    try {
      await cloudServiceManager.cleanup();
    } catch (err) {
      console.error('Cleanup failed:', err);
    }

    // 状態リセット
    setIsInitialized(false);
    setIsLoading(false);
    setError(null);
    setStats(null);
    setHealthStatus(null);
    setOverallHealth(null);

    console.log('🧹 Cloud service hook cleanup completed');
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 初期化チェック（必要に応じて自動初期化）
  useEffect(() => {
    // 自動初期化は行わず、明示的な initialize() 呼び出しを待つ
    // アプリの開始フローに合わせて調整可能
  }, []);

  return {
    // 状態
    isInitialized,
    isLoading,
    error,
    
    // 統計・ヘルス
    stats,
    healthStatus,
    overallHealth,
    
    // データ操作
    saveData,
    updateData,
    deleteData,
    triggerSync,
    
    // 制御
    initialize,
    cleanup,
    refreshStats,
  };
}

/**
 * Cloud Service Dashboard Hook
 * 管理画面用の詳細情報フック
 */
export interface UseCloudServiceDashboardReturn extends UseCloudServiceReturn {
  // 詳細統計
  detailedStats: {
    serviceBreakdown: Array<{
      service: string;
      status: string;
      uptime: number;
      latency: number;
      errors: string[];
    }>;
    syncQueueLength: number;
    conflictQueueLength: number;
    offlineQueueLength: number;
    storageBreakdown: {
      local: number;
      firebase: number;
      aws: number;
    };
  } | null;
  
  // 管理操作
  forceHealthCheck: () => Promise<void>;
  clearErrorLogs: () => Promise<void>;
  exportDiagnostics: () => Promise<string>;
  resetStats: () => Promise<void>;
}

export function useCloudServiceDashboard(): UseCloudServiceDashboardReturn {
  const baseHook = useCloudService();
  const [detailedStats, setDetailedStats] = useState<UseCloudServiceDashboardReturn['detailedStats']>(null);

  // 詳細統計更新
  const updateDetailedStats = useCallback(() => {
    if (!baseHook.healthStatus || !baseHook.stats) {
      setDetailedStats(null);
      return;
    }

    const serviceBreakdown = Array.from(baseHook.healthStatus.values()).map(service => ({
      service: service.service,
      status: service.status,
      uptime: service.uptime,
      latency: service.latency,
      errors: service.errors,
    }));

    setDetailedStats({
      serviceBreakdown,
      syncQueueLength: 0, // 実際のデータは同期エンジンから取得
      conflictQueueLength: 0, // 実際のデータはコンフリクト解決サービスから取得
      offlineQueueLength: 0, // 実際のデータはオフラインキューから取得
      storageBreakdown: {
        local: 0, // AsyncStorageから計算
        firebase: 0, // Firebaseから取得
        aws: 0, // AWSから取得
      },
    });
  }, [baseHook.healthStatus, baseHook.stats]);

  // 管理操作
  const forceHealthCheck = useCallback(async () => {
    try {
      // 手動ヘルスチェック実行
      console.log('🔍 Forcing health check...');
      // cloudServiceManager.forceHealthCheck() が必要
    } catch (err) {
      console.error('Force health check failed:', err);
    }
  }, []);

  const clearErrorLogs = useCallback(async () => {
    try {
      console.log('🧹 Clearing error logs...');
      // エラーログクリア実装
    } catch (err) {
      console.error('Clear error logs failed:', err);
    }
  }, []);

  const exportDiagnostics = useCallback(async (): Promise<string> => {
    try {
      console.log('📊 Exporting diagnostics...');
      
      const diagnostics = {
        timestamp: new Date().toISOString(),
        stats: baseHook.stats,
        healthStatus: baseHook.healthStatus ? 
          Object.fromEntries(baseHook.healthStatus.entries()) : null,
        detailedStats,
        systemInfo: {
          platform: 'react-native',
          // その他のシステム情報
        },
      };

      return JSON.stringify(diagnostics, null, 2);
      
    } catch (err) {
      console.error('Export diagnostics failed:', err);
      return '';
    }
  }, [baseHook.stats, baseHook.healthStatus, detailedStats]);

  const resetStats = useCallback(async () => {
    try {
      console.log('🔄 Resetting statistics...');
      // 統計リセット実装
      baseHook.refreshStats();
    } catch (err) {
      console.error('Reset stats failed:', err);
    }
  }, [baseHook.refreshStats]);

  // 詳細統計の定期更新
  useEffect(() => {
    updateDetailedStats();
  }, [updateDetailedStats, baseHook.stats, baseHook.healthStatus]);

  return {
    ...baseHook,
    detailedStats,
    forceHealthCheck,
    clearErrorLogs,
    exportDiagnostics,
    resetStats,
  };
}
