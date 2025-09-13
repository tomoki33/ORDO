/**
 * Cloud Service Monitor Component
 * クラウドサービス監視ダッシュボード
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { useCloudServiceDashboard } from '../hooks/useCloudService';

interface CloudServiceMonitorProps {
  showDetailedView?: boolean;
  onServiceSelect?: (serviceName: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const CloudServiceMonitor: React.FC<CloudServiceMonitorProps> = ({
  showDetailedView = true,
  onServiceSelect,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const {
    isInitialized,
    isLoading,
    error,
    stats,
    healthStatus,
    overallHealth,
    detailedStats,
    initialize,
    refreshStats,
    forceHealthCheck,
    clearErrorLogs,
    exportDiagnostics,
    resetStats,
    triggerSync,
  } = useCloudServiceDashboard();

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh || !isInitialized) return;

    const interval = setInterval(() => {
      refreshStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isInitialized, refreshStats]);

  // 初期化チェック
  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      initialize();
    }
  }, [isInitialized, isLoading, error, initialize]);

  // ヘルス状態の色分け
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'degraded': return '#FF9800';
      case 'unhealthy': return '#F44336';
      case 'offline': return '#9E9E9E';
      default: return '#607D8B';
    }
  };

  // 統計表示用データ
  const statisticsData = useMemo(() => {
    if (!stats) return [];

    return [
      { label: 'データ同期数', value: stats.totalDataSynced.toLocaleString() },
      { label: 'コンフリクト解決数', value: stats.totalConflictsResolved.toLocaleString() },
      { label: '平均レイテンシ', value: `${stats.averageLatency.toFixed(0)}ms` },
      { label: '成功率', value: `${stats.successRate.toFixed(1)}%` },
      { label: 'ストレージ使用量', value: formatBytes(stats.storageUsed) },
      { label: '今日のAPI呼び出し', value: stats.apiCallsToday.toLocaleString() },
    ];
  }, [stats]);

  // バイト数フォーマット
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 診断データエクスポート
  const handleExportDiagnostics = async () => {
    try {
      const diagnostics = await exportDiagnostics();
      await Share.share({
        message: diagnostics,
        title: 'Cloud Service Diagnostics',
      });
    } catch (err) {
      Alert.alert('エラー', '診断データのエクスポートに失敗しました');
    }
  };

  // 統計リセット確認
  const handleResetStats = () => {
    Alert.alert(
      '統計リセット',
      '統計データをリセットしますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'リセット', style: 'destructive', onPress: resetStats },
      ]
    );
  };

  // エラー表示
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ サービス初期化エラー</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initialize}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ローディング表示
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🔄 クラウドサービス初期化中...</Text>
        </View>
      </View>
    );
  }

  // 未初期化状態
  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.initContainer}>
          <Text style={styles.initTitle}>☁️ クラウドサービス</Text>
          <Text style={styles.initMessage}>サービスを初期化してください</Text>
          <TouchableOpacity
            style={styles.initButton}
            onPress={initialize}
          >
            <Text style={styles.initButtonText}>初期化</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshStats}
        />
      }
    >
      {/* 全体ヘルス状態 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>全体ヘルス状態</Text>
        <View style={[
          styles.overallHealthContainer,
          { backgroundColor: getHealthColor(overallHealth || 'unhealthy') }
        ]}>
          <Text style={styles.overallHealthText}>
            {overallHealth?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </View>
      </View>

      {/* サービス状態 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サービス状態</Text>
        {healthStatus && Array.from(healthStatus.values()).map((service, index) => (
          <TouchableOpacity
            key={service.service}
            style={styles.serviceItem}
            onPress={() => onServiceSelect?.(service.service)}
          >
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>{service.service}</Text>
              <View style={[
                styles.serviceStatus,
                { backgroundColor: getHealthColor(service.status) }
              ]}>
                <Text style={styles.serviceStatusText}>
                  {service.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceDetail}>
                レイテンシ: {service.latency}ms
              </Text>
              <Text style={styles.serviceDetail}>
                アップタイム: {service.uptime}
              </Text>
              <Text style={styles.serviceDetail}>
                最終チェック: {new Date(service.lastCheck).toLocaleTimeString()}
              </Text>
            </View>

            {service.errors.length > 0 && (
              <View style={styles.serviceErrors}>
                {service.errors.slice(0, 2).map((error, errorIndex) => (
                  <Text key={errorIndex} style={styles.serviceError}>
                    ⚠️ {error}
                  </Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 統計データ */}
      {showDetailedView && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>統計データ</Text>
          <View style={styles.statsGrid}>
            {statisticsData.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 詳細統計（管理者向け） */}
      {showDetailedView && detailedStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>詳細統計</Text>
          
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>キュー状態</Text>
            <Text style={styles.detailText}>
              同期キュー: {detailedStats.syncQueueLength}
            </Text>
            <Text style={styles.detailText}>
              コンフリクトキュー: {detailedStats.conflictQueueLength}
            </Text>
            <Text style={styles.detailText}>
              オフラインキュー: {detailedStats.offlineQueueLength}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>ストレージ使用量</Text>
            <Text style={styles.detailText}>
              ローカル: {formatBytes(detailedStats.storageBreakdown.local)}
            </Text>
            <Text style={styles.detailText}>
              Firebase: {formatBytes(detailedStats.storageBreakdown.firebase)}
            </Text>
            <Text style={styles.detailText}>
              AWS: {formatBytes(detailedStats.storageBreakdown.aws)}
            </Text>
          </View>
        </View>
      )}

      {/* 操作ボタン */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>操作</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={triggerSync}
          >
            <Text style={styles.actionButtonText}>手動同期</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={forceHealthCheck}
          >
            <Text style={styles.actionButtonText}>ヘルスチェック</Text>
          </TouchableOpacity>
        </View>

        {showDetailedView && (
          <>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.warningButton]}
                onPress={clearErrorLogs}
              >
                <Text style={styles.actionButtonText}>エラーログクリア</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.infoButton]}
                onPress={handleExportDiagnostics}
              >
                <Text style={styles.actionButtonText}>診断エクスポート</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleResetStats}
            >
              <Text style={styles.actionButtonText}>統計リセット</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },

  // エラー表示
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // ローディング表示
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // 初期化表示
  initContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  initTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  initMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  initButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  initButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 全体ヘルス状態
  overallHealthContainer: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  overallHealthText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // サービス状態
  serviceItem: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  serviceDetails: {
    marginBottom: 8,
  },
  serviceDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  serviceErrors: {
    marginTop: 5,
  },
  serviceError: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 2,
  },

  // 統計データ
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // 詳細統計
  detailSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  // 操作ボタン
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#607D8B',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  infoButton: {
    backgroundColor: '#00BCD4',
  },
  dangerButton: {
    backgroundColor: '#F44336',
    marginHorizontal: 5,
  },
});
