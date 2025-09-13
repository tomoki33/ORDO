/**
 * Performance Dashboard Screen
 * パフォーマンス監視とメトリクス表示画面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  ProgressBar,
  Switch,
  List,
  Divider,
  Button,
  Badge,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { performanceMonitor, PerformanceMetrics } from '../services/PerformanceMonitorService';
import { memoryOptimizer } from '../services/MemoryOptimizationService';
import { imageOptimizer } from '../services/ImageOptimizationService';
import { startupOptimizer } from '../services/StartupOptimizationService';
import { backgroundProcessor } from '../services/BackgroundProcessingOptimizationService';

const { width } = Dimensions.get('window');

interface PerformanceDashboardState {
  performanceMetrics: PerformanceMetrics | null;
  memoryReport: any;
  startupMetrics: any;
  backgroundStats: any;
  imageCache: any;
  isRefreshing: boolean;
  autoRefresh: boolean;
  lastUpdated: Date;
}

export const PerformanceDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  const [state, setState] = useState<PerformanceDashboardState>({
    performanceMetrics: null,
    memoryReport: null,
    startupMetrics: null,
    backgroundStats: null,
    imageCache: null,
    isRefreshing: false,
    autoRefresh: true,
    lastUpdated: new Date(),
  });

  /**
   * パフォーマンスデータ更新
   */
  const updatePerformanceData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true }));
      
      // 各サービスからメトリクス取得
      const [
        performanceMetrics,
        memoryReport,
        startupMetrics,
        backgroundStats,
        imageCache,
      ] = await Promise.all([
        Promise.resolve(performanceMonitor.generateReport()),
        Promise.resolve(memoryOptimizer.generateMemoryReport()),
        Promise.resolve(startupOptimizer.getStartupMetrics()),
        Promise.resolve(backgroundProcessor.getProcessingStats()),
        Promise.resolve(imageOptimizer.getCacheStats()),
      ]);

      setState(prev => ({
        ...prev,
        performanceMetrics,
        memoryReport,
        startupMetrics,
        backgroundStats,
        imageCache,
        lastUpdated: new Date(),
        isRefreshing: false,
      }));
      
    } catch (error) {
      console.error('Failed to update performance data:', error);
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, []);

  /**
   * 自動更新設定
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.autoRefresh) {
      interval = setInterval(updatePerformanceData, 5000); // 5秒ごと
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.autoRefresh, updatePerformanceData]);

  /**
   * 初回データ読み込み
   */
  useEffect(() => {
    updatePerformanceData();
  }, [updatePerformanceData]);

  /**
   * パフォーマンススコア色の取得
   */
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // 緑
    if (score >= 60) return '#FF9800'; // オレンジ
    return '#F44336'; // 赤
  };

  /**
   * バイトをMBに変換
   */
  const bytesToMB = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(1);
  };

  /**
   * 最適化実行
   */
  const performOptimization = useCallback(async (type: string) => {
    try {
      switch (type) {
        case 'memory':
          memoryOptimizer.cleanup();
          break;
        case 'cache':
          imageOptimizer.clearCache();
          break;
        case 'emergency':
          memoryOptimizer.emergencyCleanup();
          backgroundProcessor.emergencyStop();
          setTimeout(() => backgroundProcessor.resume(), 2000);
          break;
      }
      
      Alert.alert('最適化完了', `${type}最適化が完了しました。`);
      setTimeout(updatePerformanceData, 1000);
      
    } catch (error) {
      Alert.alert('最適化エラー', `最適化中にエラーが発生しました: ${error}`);
    }
  }, [updatePerformanceData]);

  /**
   * 総合パフォーマンススコア計算
   */
  const calculateOverallScore = (): number => {
    if (!state.performanceMetrics || !state.memoryReport || !state.startupMetrics) {
      return 0;
    }
    
    const perfScore = performanceMonitor.calculatePerformanceScore();
    const startupScore = startupOptimizer.calculateStartupScore();
    
    return Math.round((perfScore + startupScore) / 2);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>パフォーマンス監視</Title>
        <View style={styles.headerControls}>
          <Text style={styles.lastUpdated}>
            更新: {state.lastUpdated.toLocaleTimeString()}
          </Text>
          <Switch
            value={state.autoRefresh}
            onValueChange={(value) => setState(prev => ({ ...prev, autoRefresh: value }))}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={updatePerformanceData}
          />
        }
      >
        {/* 総合スコア */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.scoreContainer}>
              <View style={styles.scoreCircle}>
                <Text 
                  style={[
                    styles.scoreText,
                    { color: getScoreColor(calculateOverallScore()) }
                  ]}
                >
                  {calculateOverallScore()}
                </Text>
                <Text style={styles.scoreLabel}>総合スコア</Text>
              </View>
              <View style={styles.scoreDetails}>
                <Chip
                  icon="timer"
                  style={styles.chip}
                >
                  起動: {state.startupMetrics?.totalStartupTime || 0}ms
                </Chip>
                <Chip
                  icon="memory"
                  style={styles.chip}
                >
                  メモリ: {state.memoryReport?.currentUsage ? bytesToMB(state.memoryReport.currentUsage.heapUsed) : 0}MB
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 起動パフォーマンス */}
        <Card style={styles.card}>
          <Card.Title
            title="起動パフォーマンス"
            subtitle="アプリの起動時間とフェーズ分析"
            left={(props) => <List.Icon {...props} icon="rocket-launch" />}
          />
          <Card.Content>
            {state.startupMetrics?.phases.map((phase: any, index: number) => (
              <View key={index} style={styles.phaseItem}>
                <Text style={styles.phaseName}>{phase.name}</Text>
                <View style={styles.phaseProgress}>
                  <ProgressBar
                    progress={Math.min((phase.duration || 0) / 1000, 1)}
                    color={phase.duration > 500 ? '#F44336' : '#4CAF50'}
                    style={styles.progressBar}
                  />
                  <Text style={styles.phaseTime}>{phase.duration || 0}ms</Text>
                </View>
              </View>
            ))}
            
            {state.startupMetrics?.bottlenecks.length > 0 && (
              <View style={styles.bottlenecks}>
                <Text style={styles.sectionTitle}>ボトルネック</Text>
                {state.startupMetrics.bottlenecks.map((bottleneck: string, index: number) => (
                  <Chip key={index} style={styles.bottleneckChip} icon="alert">
                    {bottleneck}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* メモリ使用量 */}
        <Card style={styles.card}>
          <Card.Title
            title="メモリ使用量"
            subtitle="メモリの監視と最適化"
            left={(props) => <List.Icon {...props} icon="memory" />}
            right={(props) => (
              <TouchableOpacity
                onPress={() => performOptimization('memory')}
                style={styles.optimizeButton}
              >
                <Text style={styles.optimizeButtonText}>最適化</Text>
              </TouchableOpacity>
            )}
          />
          <Card.Content>
            <View style={styles.memoryStats}>
              <View style={styles.memoryStat}>
                <Text style={styles.memoryLabel}>使用中</Text>
                <Text style={styles.memoryValue}>
                  {state.memoryReport?.currentUsage ? bytesToMB(state.memoryReport.currentUsage.heapUsed) : '0'}MB
                </Text>
              </View>
              <View style={styles.memoryStat}>
                <Text style={styles.memoryLabel}>制限</Text>
                <Text style={styles.memoryValue}>
                  {state.memoryReport?.currentUsage ? bytesToMB(state.memoryReport.currentUsage.heapLimit) : '0'}MB
                </Text>
              </View>
              <View style={styles.memoryStat}>
                <Text style={styles.memoryLabel}>使用率</Text>
                <Text style={styles.memoryValue}>
                  {state.memoryReport?.currentUsage 
                    ? Math.round((state.memoryReport.currentUsage.heapUsed / state.memoryReport.currentUsage.heapLimit) * 100)
                    : 0}%
                </Text>
              </View>
            </View>
            
            <ProgressBar
              progress={state.memoryReport?.currentUsage 
                ? state.memoryReport.currentUsage.heapUsed / state.memoryReport.currentUsage.heapLimit
                : 0}
              color="#2196F3"
              style={styles.memoryProgressBar}
            />
            
            {state.memoryReport?.leakDetection.isLeakDetected && (
              <View style={styles.warningContainer}>
                <Badge style={styles.warningBadge}>警告</Badge>
                <Text style={styles.warningText}>
                  メモリリークの可能性があります
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 画像キャッシュ */}
        <Card style={styles.card}>
          <Card.Title
            title="画像キャッシュ"
            subtitle="画像の最適化とキャッシュ管理"
            left={(props) => <List.Icon {...props} icon="image" />}
            right={(props) => (
              <TouchableOpacity
                onPress={() => performOptimization('cache')}
                style={styles.optimizeButton}
              >
                <Text style={styles.optimizeButtonText}>クリア</Text>
              </TouchableOpacity>
            )}
          />
          <Card.Content>
            <View style={styles.cacheStats}>
              <View style={styles.cacheStat}>
                <Text style={styles.cacheLabel}>アイテム数</Text>
                <Text style={styles.cacheValue}>{state.imageCache?.itemCount || 0}</Text>
              </View>
              <View style={styles.cacheStat}>
                <Text style={styles.cacheLabel}>サイズ</Text>
                <Text style={styles.cacheValue}>
                  {state.imageCache?.totalSize ? bytesToMB(state.imageCache.totalSize) : '0'}MB
                </Text>
              </View>
              <View style={styles.cacheStat}>
                <Text style={styles.cacheLabel}>ヒット率</Text>
                <Text style={styles.cacheValue}>
                  {state.imageCache?.hitRate ? Math.round(state.imageCache.hitRate * 100) : 0}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* バックグラウンド処理 */}
        <Card style={styles.card}>
          <Card.Title
            title="バックグラウンド処理"
            subtitle="バックグラウンドタスクの状況"
            left={(props) => <List.Icon {...props} icon="cog" />}
          />
          <Card.Content>
            <View style={styles.backgroundStats}>
              <View style={styles.backgroundStat}>
                <Text style={styles.backgroundLabel}>総タスク</Text>
                <Text style={styles.backgroundValue}>{state.backgroundStats?.totalTasks || 0}</Text>
              </View>
              <View style={styles.backgroundStat}>
                <Text style={styles.backgroundLabel}>実行中</Text>
                <Text style={styles.backgroundValue}>{state.backgroundStats?.runningTasks || 0}</Text>
              </View>
              <View style={styles.backgroundStat}>
                <Text style={styles.backgroundLabel}>CPU使用率</Text>
                <Text style={styles.backgroundValue}>
                  {state.backgroundStats?.cpuUsage ? Math.round(state.backgroundStats.cpuUsage) : 0}%
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 緊急最適化 */}
        <Card style={[styles.card, styles.emergencyCard]}>
          <Card.Content>
            <View style={styles.emergencyContent}>
              <View>
                <Title style={styles.emergencyTitle}>緊急最適化</Title>
                <Paragraph style={styles.emergencyDescription}>
                  パフォーマンスに問題がある場合に実行
                </Paragraph>
              </View>
              <Button
                mode="contained"
                onPress={() => performOptimization('emergency')}
                style={styles.emergencyButton}
                buttonColor="#F44336"
              >
                実行
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* 推奨事項 */}
        {state.memoryReport?.recommendations.length > 0 && (
          <Card style={styles.card}>
            <Card.Title
              title="推奨事項"
              subtitle="パフォーマンス改善のための提案"
              left={(props) => <List.Icon {...props} icon="lightbulb" />}
            />
            <Card.Content>
              {state.memoryReport.recommendations.map((recommendation: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <List.Icon icon="check-circle" />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreDetails: {
    flex: 1,
  },
  chip: {
    marginBottom: 8,
  },
  phaseItem: {
    marginBottom: 12,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  phaseProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    marginRight: 8,
  },
  phaseTime: {
    fontSize: 12,
    color: '#666',
    minWidth: 50,
  },
  bottlenecks: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  bottleneckChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  optimizeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  memoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  memoryStat: {
    alignItems: 'center',
  },
  memoryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  memoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memoryProgressBar: {
    height: 8,
    marginBottom: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 4,
  },
  warningBadge: {
    backgroundColor: '#ffc107',
    marginRight: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  cacheStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cacheStat: {
    alignItems: 'center',
  },
  cacheLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cacheValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backgroundStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backgroundStat: {
    alignItems: 'center',
  },
  backgroundLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  backgroundValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyCard: {
    backgroundColor: '#ffebee',
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyTitle: {
    fontSize: 18,
    color: '#c62828',
  },
  emergencyDescription: {
    color: '#666',
  },
  emergencyButton: {
    minWidth: 80,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  bottomPadding: {
    height: 32,
  },
});
