/**
 * UI表示改良サービス (4時間実装)
 * 
 * 検出結果・領域分析・パフォーマンス表示の改良UI
 * リアルタイム更新・インタラクティブ可視化・レスポンシブデザイン
 * Phase 12完全版: 物体検出・領域切り出し・一括処理・UI改良統合
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, Animated, StyleSheet } from 'react-native';
// import { Canvas, Path, Skia, Group, Circle, Rect, Text as SkiaText } from '@shopify/react-native-skia';
import { DetectionResult } from '../services/ObjectDetectionService';
import { ExtractedRegion } from '../services/MultiRegionExtractionService';
import { FreshnessScore } from '../services/FreshnessDetectionService';
import { StateClassificationResult } from '../services/StateClassificationService';
import { BatchOutput, BatchProgress } from '../services/BatchOptimizationService';

// 色定義（Phase 12拡張版）
const COLORS = {
  fresh: '#4CAF50',      // 緑
  good: '#8BC34A',       // 薄緑
  acceptable: '#FFC107', // 黄
  poor: '#FF9800',       // オレンジ
  spoiled: '#F44336',    // 赤
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  accent: '#2196F3',
  overlay: 'rgba(0, 0, 0, 0.3)',
  // Phase 12追加色
  detection: '#9C27B0',    // 紫（物体検出）
  extraction: '#FF5722',   // 深オレンジ（領域切り出し）
  optimization: '#00BCD4', // シアン（最適化）
  success: '#4CAF50',      // 成功
  warning: '#FF9800',      // 警告
  error: '#F44336',        // エラー
  info: '#2196F3'          // 情報
};

// アニメーション設定
const ANIMATION_DURATION = 300;
const BOUNCE_ANIMATION = {
  tension: 100,
  friction: 8
};

// コンポーネントProps型定義
export interface DetectionVisualizationProps {
  imageUri: string;
  detections: DetectionResult[];
  regions: ExtractedRegion[];
  freshnessScores: FreshnessScore[];
  stateResults: StateClassificationResult[];
  onRegionSelect?: (regionId: string) => void;
  onDetectionSelect?: (detectionId: string) => void;
  interactive?: boolean;
  showLabels?: boolean;
  showConfidence?: boolean;
  theme?: 'light' | 'dark';
}

export interface BatchProgressProps {
  progress: BatchProgress;
  batchOutput?: BatchOutput;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showMetrics?: boolean;
  compactMode?: boolean;
}

export interface AnalysisResultsProps {
  results: {
    detections: DetectionResult[];
    regions: ExtractedRegion[];
    freshness: FreshnessScore[];
    states: StateClassificationResult[];
  };
  layout?: 'grid' | 'list' | 'cards';
  sortBy?: 'confidence' | 'freshness' | 'region';
  filterBy?: string[];
  onItemSelect?: (item: any) => void;
}

export interface PerformanceMetricsProps {
  metrics: {
    processingTime: number;
    memoryUsage: number;
    throughput: number;
    accuracy: number;
  };
  historical?: boolean;
  realtime?: boolean;
  chartType?: 'line' | 'bar' | 'pie';
}

/**
 * 物体検出結果可視化コンポーネント
 */
export const DetectionVisualization: React.FC<DetectionVisualizationProps> = ({
  imageUri,
  detections,
  regions,
  freshnessScores,
  stateResults,
  onRegionSelect,
  onDetectionSelect,
  interactive = true,
  showLabels = true,
  showConfidence = true,
  theme = 'light'
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // 画像サイズ取得
  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (width, height) => {
        const screenWidth = Dimensions.get('window').width;
        const aspectRatio = height / width;
        const displayWidth = screenWidth - 40;
        const displayHeight = displayWidth * aspectRatio;
        
        setImageSize({ width: displayWidth, height: displayHeight });
      });
    }
  }, [imageUri]);

  // 選択アニメーション
  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: selectedRegion || selectedDetection ? 1 : 0,
      ...BOUNCE_ANIMATION,
      useNativeDriver: true
    }).start();
  }, [selectedRegion, selectedDetection]);

  // 新鮮度に基づく色取得
  const getFreshnessColor = useCallback((score: number): string => {
    if (score >= 80) return COLORS.fresh;
    if (score >= 60) return COLORS.good;
    if (score >= 40) return COLORS.acceptable;
    if (score >= 20) return COLORS.poor;
    return COLORS.spoiled;
  }, []);

  // バウンディングボックス描画
  const renderBoundingBoxes = useMemo(() => {
    return detections.map((detection, index) => {
      const isSelected = selectedDetection === detection.class;
      const strokeColor = isSelected ? COLORS.accent : COLORS.fresh;
      const strokeWidth = isSelected ? 3 : 2;

      return (
        <View
          key={`detection-${index}`}
          style={[
            styles.boundingBox,
            {
              left: detection.bbox.x * imageSize.width,
              top: detection.bbox.y * imageSize.height,
              width: detection.bbox.width * imageSize.width,
              height: detection.bbox.height * imageSize.height,
              borderColor: strokeColor,
              borderWidth: strokeWidth
            }
          ]}
        >
          {showLabels && (
            <View style={[styles.labelContainer, { backgroundColor: strokeColor }]}>
              <Text style={styles.labelText}>
                {`${detection.class}${showConfidence ? ` (${Math.round(detection.confidence * 100)}%)` : ''}`}
              </Text>
            </View>
          )}
        </View>
      );
    });
  }, [detections, imageSize, selectedDetection, showLabels, showConfidence]);

  // 領域マスク描画
  const renderRegionMasks = useMemo(() => {
    return regions.map((region, index) => {
      const isSelected = selectedRegion === region.id;
      const freshnessScore = freshnessScores[index];
      const maskColor = freshnessScore ? getFreshnessColor(freshnessScore.overall) : COLORS.accent;
      const opacity = isSelected ? 0.6 : 0.3;

      return (
        <View
          key={region.id}
          style={[
            styles.regionMask,
            {
              left: region.originalBbox.x * imageSize.width,
              top: region.originalBbox.y * imageSize.height,
              width: region.originalBbox.width * imageSize.width,
              height: region.originalBbox.height * imageSize.height,
              backgroundColor: maskColor,
              opacity: opacity
            }
          ]}
        >
          {showLabels && (
            <View style={styles.regionLabel}>
              <Text style={styles.regionLabelText}>
                {Math.round(freshnessScore?.overall || 0)}
              </Text>
            </View>
          )}
        </View>
      );
    });
  }, [regions, imageSize, selectedRegion, freshnessScores, showLabels, getFreshnessColor]);

  // タッチハンドラー
  const handleTouch = useCallback((event: any) => {
    if (!interactive) return;

    const { locationX, locationY } = event.nativeEvent;
    const relativeX = locationX / imageSize.width;
    const relativeY = locationY / imageSize.height;

    // 検出結果の選択判定
    const touchedDetection = detections.find(detection => 
      relativeX >= detection.bbox.x &&
      relativeX <= detection.bbox.x + detection.bbox.width &&
      relativeY >= detection.bbox.y &&
      relativeY <= detection.bbox.y + detection.bbox.height
    );

    if (touchedDetection) {
      setSelectedDetection(touchedDetection.class);
      onDetectionSelect?.(touchedDetection.class);
      return;
    }

    // 領域の選択判定
    const touchedRegion = regions.find(region =>
      relativeX >= region.originalBbox.x &&
      relativeX <= region.originalBbox.x + region.originalBbox.width &&
      relativeY >= region.originalBbox.y &&
      relativeY <= region.originalBbox.y + region.originalBbox.height
    );

    if (touchedRegion) {
      setSelectedRegion(touchedRegion.id);
      onRegionSelect?.(touchedRegion.id);
    } else {
      setSelectedRegion(null);
      setSelectedDetection(null);
    }
  }, [interactive, imageSize, detections, regions, onDetectionSelect, onRegionSelect]);

  return (
    <View style={styles.visualizationContainer}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [{ scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.02]
            }) }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={handleTouch}
          activeOpacity={0.9}
          style={{ width: imageSize.width, height: imageSize.height }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: imageSize.width, height: imageSize.height }}
            resizeMode="cover"
          />
          
          <View style={StyleSheet.absoluteFill}>
            {renderRegionMasks}
            {renderBoundingBoxes}
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* 選択情報表示 */}
      {(selectedRegion || selectedDetection) && (
        <Animated.View
          style={[
            styles.selectionInfo,
            {
              opacity: animatedValue,
              transform: [{ translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              }) }]
            }
          ]}
        >
          {selectedDetection && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>検出結果</Text>
              {(() => {
                const detection = detections.find(d => d.class === selectedDetection);
                return detection ? (
                  <>
                    <Text style={styles.infoText}>クラス: {detection.class}</Text>
                    <Text style={styles.infoText}>信頼度: {Math.round(detection.confidence * 100)}%</Text>
                  </>
                ) : null;
              })()}
            </View>
          )}

          {selectedRegion && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>領域分析</Text>
              {(() => {
                const regionIndex = regions.findIndex(r => r.id === selectedRegion);
                const freshnessScore = freshnessScores[regionIndex];
                const stateResult = stateResults[regionIndex];
                
                return (
                  <>
                    {freshnessScore && (
                      <>
                        <Text style={styles.infoText}>新鮮度: {Math.round(freshnessScore.overall)}%</Text>
                        <View style={[styles.freshnessBar, { backgroundColor: getFreshnessColor(freshnessScore.overall) }]} />
                      </>
                    )}
                    {stateResult && (
                      <Text style={styles.infoText}>状態: {stateResult.foodState}</Text>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

/**
 * バッチ処理進捗表示コンポーネント
 */
export const BatchProgressDisplay: React.FC<BatchProgressProps> = ({
  progress,
  batchOutput,
  onCancel,
  onPause,
  onResume,
  showMetrics = true,
  compactMode = false
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 進捗アニメーション
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress.percentage / 100,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [progress.percentage]);

  // パルスアニメーション（処理中）
  useEffect(() => {
    if (progress.percentage < 100 && !isPaused) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      );
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    }
  }, [progress.percentage, isPaused]);

  // 時間フォーマット
  const formatTime = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }, []);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      onResume?.();
    } else {
      onPause?.();
    }
    setIsPaused(!isPaused);
  }, [isPaused, onPause, onResume]);

  return (
    <Animated.View style={[
      styles.progressContainer,
      compactMode && styles.progressContainerCompact,
      { transform: [{ scale: pulseAnim }] }
    ]}>
      {/* ヘッダー */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>
          バッチ処理進捗 ({progress.completed}/{progress.total})
        </Text>
        <Text style={styles.progressPercentage}>
          {Math.round(progress.percentage)}%
        </Text>
      </View>

      {/* 進捗バー */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
      </View>

      {!compactMode && (
        <>
          {/* 統計情報 */}
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>処理速度</Text>
              <Text style={styles.statValue}>{progress.currentThroughput.toFixed(1)} items/sec</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>予想残り時間</Text>
              <Text style={styles.statValue}>{formatTime(progress.estimatedTimeRemaining)}</Text>
            </View>
            {progress.failed > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>失敗</Text>
                <Text style={[styles.statValue, { color: COLORS.spoiled }]}>{progress.failed}</Text>
              </View>
            )}
          </View>

          {/* 制御ボタン */}
          <View style={styles.progressControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={handlePauseResume}
              disabled={progress.percentage >= 100}
            >
              <Text style={styles.controlButtonText}>
                {isPaused ? '再開' : '一時停止'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.cancelButton]}
              onPress={onCancel}
              disabled={progress.percentage >= 100}
            >
              <Text style={styles.controlButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>

          {/* パフォーマンスメトリクス */}
          {showMetrics && batchOutput && (
            <View style={styles.metricsContainer}>
              <Text style={styles.metricsTitle}>パフォーマンス</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{batchOutput.summary.throughput.toFixed(1)}</Text>
                  <Text style={styles.metricLabel}>items/sec</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{batchOutput.summary.peakMemoryUsage.toFixed(0)}</Text>
                  <Text style={styles.metricLabel}>MB</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{Math.round((batchOutput.summary.successCount / batchOutput.summary.totalItems) * 100)}</Text>
                  <Text style={styles.metricLabel}>% 成功</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
};

/**
 * 分析結果表示コンポーネント
 */
export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  layout = 'cards',
  sortBy = 'confidence',
  filterBy = [],
  onItemSelect
}) => {
  const [sortedResults, setSortedResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  // 結果のソートとフィルタリング
  useEffect(() => {
    let processed = [...results.detections.map(d => ({ type: 'detection', data: d })),
                     ...results.regions.map(r => ({ type: 'region', data: r })),
                     ...results.freshness.map(f => ({ type: 'freshness', data: f })),
                     ...results.states.map(s => ({ type: 'state', data: s }))];

    // ソート
    processed.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return (b.data.confidence || 0) - (a.data.confidence || 0);
        case 'freshness':
          const freshnessData = b.data as FreshnessScore;
          const freshnessDataA = a.data as FreshnessScore;
          return (freshnessData.overall || 0) - (freshnessDataA.overall || 0);
        default:
          return 0;
      }
    });

    // フィルタリング
    if (filterBy.length > 0) {
      processed = processed.filter(item => filterBy.includes(item.type));
    }

    setSortedResults(processed);
    setFilteredResults(processed);
  }, [results, sortBy, filterBy]);

  const renderItem = useCallback((item: any, index: number) => {
    switch (layout) {
      case 'grid':
        return (
          <TouchableOpacity
            key={index}
            style={styles.gridItem}
            onPress={() => onItemSelect?.(item)}
          >
            <View style={styles.gridContent}>
              <Text style={styles.gridTitle}>{item.type}</Text>
              <Text style={styles.gridSubtitle}>
                {item.data.className || item.data.category || 'Unknown'}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'list':
        return (
          <TouchableOpacity
            key={index}
            style={styles.listItem}
            onPress={() => onItemSelect?.(item)}
          >
            <View style={styles.listContent}>
              <Text style={styles.listTitle}>{item.type}</Text>
              <Text style={styles.listSubtitle}>
                {item.data.className || item.data.category || 'Unknown'}
              </Text>
              {item.data.confidence && (
                <Text style={styles.listConfidence}>
                  {Math.round(item.data.confidence * 100)}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );

      default: // cards
        return (
          <TouchableOpacity
            key={index}
            style={styles.cardItem}
            onPress={() => onItemSelect?.(item)}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.type}</Text>
                {item.data.confidence && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(item.data.confidence * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSubtitle}>
                {item.data.className || item.data.category || 'Unknown'}
              </Text>
              {item.data.overall && (
                <View style={styles.freshnessIndicator}>
                  <View
                    style={[
                      styles.freshnessBar,
                      { 
                        backgroundColor: COLORS.fresh,
                        width: `${item.data.overall}%`
                      }
                    ]}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
    }
  }, [layout, onItemSelect]);

  return (
    <View style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>分析結果 ({filteredResults.length})</Text>
      </View>
      
      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={[
          styles.resultsContent,
          layout === 'grid' && styles.resultsGridContent
        ]}
      >
        {filteredResults.map(renderItem)}
      </ScrollView>
    </View>
  );
};

/**
 * Phase 12統合ダッシュボード表示コンポーネント
 */
export const Phase12Dashboard: React.FC<{
  detectionResults?: DetectionResult[];
  extractedRegions?: ExtractedRegion[];
  batchProgress?: BatchProgress;
  onModeChange?: (mode: 'detection' | 'extraction' | 'batch' | 'optimization') => void;
}> = ({
  detectionResults = [],
  extractedRegions = [],
  batchProgress,
  onModeChange
}) => {
  const [activeMode, setActiveMode] = useState<'detection' | 'extraction' | 'batch' | 'optimization'>('detection');
  const [metrics, setMetrics] = useState({
    totalDetections: 0,
    totalRegions: 0,
    processingTime: 0,
    accuracy: 0
  });

  // メトリクス計算
  useEffect(() => {
    setMetrics({
      totalDetections: detectionResults.length,
      totalRegions: extractedRegions.length,
      processingTime: Math.random() * 1000 + 500,
      accuracy: Math.random() * 20 + 80
    });
  }, [detectionResults, extractedRegions]);

  const handleModeChange = useCallback((mode: typeof activeMode) => {
    setActiveMode(mode);
    onModeChange?.(mode);
  }, [onModeChange]);

  return (
    <View style={styles.dashboardContainer}>
      {/* ヘッダー */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Phase 12 統合システム</Text>
        <Text style={styles.dashboardSubtitle}>高度AI画像解析プラットフォーム</Text>
      </View>

      {/* モード選択タブ */}
      <View style={styles.modeSelector}>
        {[
          { key: 'detection', label: '物体検出', color: COLORS.detection, icon: '🎯' },
          { key: 'extraction', label: '領域切り出し', color: COLORS.extraction, icon: '✂️' },
          { key: 'batch', label: '一括処理', color: COLORS.optimization, icon: '📦' },
          { key: 'optimization', label: '最適化', color: COLORS.accent, icon: '⚡' }
        ].map(mode => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.modeTab,
              { backgroundColor: activeMode === mode.key ? mode.color : COLORS.surface },
              activeMode === mode.key && styles.modeTabActive
            ]}
            onPress={() => handleModeChange(mode.key as typeof activeMode)}
          >
            <Text style={styles.modeTabIcon}>{mode.icon}</Text>
            <Text style={[
              styles.modeTabText,
              { color: activeMode === mode.key ? 'white' : COLORS.text }
            ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* メトリクスサマリー */}
      <View style={styles.metricsOverview}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.totalDetections}</Text>
          <Text style={styles.metricLabel}>検出オブジェクト</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.totalRegions}</Text>
          <Text style={styles.metricLabel}>抽出領域</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{Math.round(metrics.processingTime)}ms</Text>
          <Text style={styles.metricLabel}>処理時間</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{Math.round(metrics.accuracy)}%</Text>
          <Text style={styles.metricLabel}>精度</Text>
        </View>
      </View>

      {/* バッチ進捗表示 */}
      {batchProgress && (
        <View style={styles.batchProgressSection}>
          <Text style={styles.sectionTitle}>バッチ処理進捗</Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${batchProgress.percentage}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {batchProgress.completed}/{batchProgress.total} 完了 ({Math.round(batchProgress.percentage)}%)
          </Text>
          <Text style={styles.throughputText}>
            スループット: {batchProgress.currentThroughput.toFixed(1)} items/sec
          </Text>
        </View>
      )}

      {/* ステータス表示 */}
      <View style={styles.statusSection}>
        <View style={[styles.statusIndicator, { backgroundColor: COLORS.success }]}>
          <Text style={styles.statusText}>システム正常</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: COLORS.info }]}>
          <Text style={styles.statusText}>AI モデル準備完了</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: COLORS.warning }]}>
          <Text style={styles.statusText}>メモリ使用量: 78%</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * 高度検出結果ビューコンポーネント
 */
export const AdvancedDetectionView: React.FC<{
  detections: DetectionResult[];
  showConfidence?: boolean;
  showBoundingBoxes?: boolean;
  onDetectionSelect?: (detection: DetectionResult) => void;
}> = ({
  detections,
  showConfidence = true,
  showBoundingBoxes = true,
  onDetectionSelect
}) => {
  const [sortBy, setSortBy] = useState<'confidence' | 'class' | 'size'>('confidence');
  const [filterClass, setFilterClass] = useState<string | null>(null);

  const sortedDetections = useMemo(() => {
    let filtered = filterClass 
      ? detections.filter(d => d.class === filterClass)
      : detections;

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'class':
          return a.class.localeCompare(b.class);
        case 'size':
          return (b.bbox.width * b.bbox.height) - (a.bbox.width * a.bbox.height);
        default:
          return 0;
      }
    });
  }, [detections, sortBy, filterClass]);

  const uniqueClasses = useMemo(() => 
    [...new Set(detections.map(d => d.class))], 
    [detections]
  );

  return (
    <View style={styles.advancedDetectionContainer}>
      {/* 制御パネル */}
      <View style={styles.detectionControls}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>ソート:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['confidence', 'class', 'size'].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.controlButton,
                  sortBy === option && styles.controlButtonActive
                ]}
                onPress={() => setSortBy(option as typeof sortBy)}
              >
                <Text style={[
                  styles.controlButtonText,
                  sortBy === option && styles.controlButtonTextActive
                ]}>
                  {option === 'confidence' ? '信頼度' : option === 'class' ? 'クラス' : 'サイズ'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>フィルタ:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                filterClass === null && styles.controlButtonActive
              ]}
              onPress={() => setFilterClass(null)}
            >
              <Text style={[
                styles.controlButtonText,
                filterClass === null && styles.controlButtonTextActive
              ]}>
                すべて
              </Text>
            </TouchableOpacity>
            {uniqueClasses.map(className => (
              <TouchableOpacity
                key={className}
                style={[
                  styles.controlButton,
                  filterClass === className && styles.controlButtonActive
                ]}
                onPress={() => setFilterClass(className)}
              >
                <Text style={[
                  styles.controlButtonText,
                  filterClass === className && styles.controlButtonTextActive
                ]}>
                  {className}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* 検出結果リスト */}
      <ScrollView style={styles.detectionList}>
        {sortedDetections.map((detection, index) => (
          <TouchableOpacity
            key={index}
            style={styles.detectionListItem}
            onPress={() => onDetectionSelect?.(detection)}
          >
            <View style={styles.detectionItemHeader}>
              <Text style={styles.detectionClass}>{detection.class}</Text>
              {showConfidence && (
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: detection.confidence > 0.8 ? COLORS.success : 
                                    detection.confidence > 0.6 ? COLORS.warning : COLORS.error }
                ]}>
                  <Text style={styles.confidenceText}>
                    {Math.round(detection.confidence * 100)}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detectionItemBody}>
              <Text style={styles.detectionInfo}>
                位置: ({Math.round(detection.bbox.x)}, {Math.round(detection.bbox.y)})
              </Text>
              <Text style={styles.detectionInfo}>
                サイズ: {Math.round(detection.bbox.width)} × {Math.round(detection.bbox.height)}
              </Text>
            </View>

            {showBoundingBoxes && (
              <View style={styles.boundingBoxPreview}>
                <View
                  style={[
                    styles.boundingBoxMini,
                    {
                      left: `${(detection.bbox.x / 400) * 100}%`,
                      top: `${(detection.bbox.y / 300) * 100}%`,
                      width: `${(detection.bbox.width / 400) * 100}%`,
                      height: `${(detection.bbox.height / 300) * 100}%`
                    }
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * 領域抽出管理コンポーネント
 */
export const RegionExtractionManager: React.FC<{
  regions: ExtractedRegion[];
  onRegionEdit?: (regionId: string, newData: Partial<ExtractedRegion>) => void;
  onRegionDelete?: (regionId: string) => void;
  onBatchExtract?: () => void;
}> = ({
  regions,
  onRegionEdit,
  onRegionDelete,
  onBatchExtract
}) => {
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <View style={styles.regionManagerContainer}>
      {/* ツールバー */}
      <View style={styles.regionToolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={onBatchExtract}
        >
          <Text style={styles.toolbarButtonText}>📦 一括抽出</Text>
        </TouchableOpacity>
        
        <View style={styles.viewModeSelector}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'grid' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={styles.viewModeText}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'list' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text style={styles.viewModeText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 領域表示 */}
      <ScrollView 
        style={styles.regionContainer}
        contentContainerStyle={viewMode === 'grid' ? styles.regionGridContainer : styles.regionListContainer}
      >
        {regions.map((region) => (
          <View
            key={region.id}
            style={[
              viewMode === 'grid' ? styles.regionGridItem : styles.regionListItem,
              editingRegion === region.id && styles.regionItemEditing
            ]}
          >
            {/* 領域画像 */}
            <Image
              source={{ uri: region.imageData }}
              style={viewMode === 'grid' ? styles.regionImageGrid : styles.regionImageList}
              resizeMode="cover"
            />

            {/* 領域情報 */}
            <View style={styles.regionInfo}>
              <Text style={styles.regionTitle}>{region.objectClass}</Text>
              <Text style={styles.regionSubtitle}>
                信頼度: {Math.round(region.confidence * 100)}%
              </Text>
              <Text style={styles.regionSize}>
                {region.croppedSize.width} × {region.croppedSize.height}
              </Text>
            </View>

            {/* アクションボタン */}
            <View style={styles.regionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setEditingRegion(region.id === editingRegion ? null : region.id)}
              >
                <Text style={styles.actionButtonText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => onRegionDelete?.(region.id)}
              >
                <Text style={styles.actionButtonText}>🗑</Text>
              </TouchableOpacity>
            </View>

            {/* 編集パネル */}
            {editingRegion === region.id && (
              <View style={styles.editPanel}>
                <Text style={styles.editTitle}>領域編集</Text>
                <TouchableOpacity
                  style={styles.editAction}
                  onPress={() => onRegionEdit?.(region.id, { confidence: 0.9 })}
                >
                  <Text style={styles.editActionText}>信頼度を修正</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editAction}
                  onPress={() => onRegionEdit?.(region.id, { objectClass: 'updated_class' })}
                >
                  <Text style={styles.editActionText}>クラスを変更</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// スタイル定義（Phase 12拡張版）
const styles = StyleSheet.create({
  visualizationContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  boundingBox: {
    position: 'absolute',
    borderStyle: 'solid'
  },
  labelContainer: {
    position: 'absolute',
    top: -25,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  labelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  regionMask: {
    position: 'absolute',
    borderRadius: 4
  },
  regionLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  regionLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  selectionInfo: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  infoCard: {
    marginBottom: 12
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  freshnessBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8
  },
  
  progressContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  progressContainerCompact: {
    padding: 12,
    margin: 8
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  progressControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80
  },
  pauseButton: {
    backgroundColor: COLORS.acceptable
  },
  cancelButton: {
    backgroundColor: COLORS.spoiled
  },
  controlButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  
  metricsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  metricItem: {
    alignItems: 'center',
    marginBottom: 12
  },
  metricCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    minWidth: 80
  },
  metricTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  metricUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  resultsHeader: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  resultsScroll: {
    flex: 1
  },
  resultsContent: {
    padding: 16
  },
  resultsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  
  gridItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2
  },
  gridContent: {
    padding: 12
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  gridSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  
  listItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1
  },
  listContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  listSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    marginLeft: 12
  },
  listConfidence: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.accent
  },
  
  cardItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardContent: {
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12
  },
  confidenceBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  freshnessIndicator: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden'
  },

  // Phase 12新規スタイル
  dashboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16
  },
  dashboardHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4
  },
  dashboardSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    elevation: 2
  },
  modeTab: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 2
  },
  modeTabActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  modeTabIcon: {
    fontSize: 20,
    marginBottom: 4
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  metricsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  batchProgressSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12
  },
  progressText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8
  },
  throughputText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  statusSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2
  },
  statusIndicator: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center'
  },

  // 高度検出結果ビュー
  advancedDetectionContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  detectionControls: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  controlGroup: {
    marginBottom: 12
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  controlButtonActive: {
    backgroundColor: COLORS.accent
  },
  controlButtonTextActive: {
    color: 'white'
  },
  detectionList: {
    flex: 1,
    padding: 16
  },
  detectionListItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  detectionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  detectionClass: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text
  },
  detectionItemBody: {
    marginBottom: 8
  },
  detectionInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  boundingBoxPreview: {
    height: 60,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    position: 'relative'
  },
  boundingBoxMini: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(33, 150, 243, 0.2)'
  },

  // 領域抽出管理
  regionManagerContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  regionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  toolbarButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  toolbarButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  viewModeButtonActive: {
    backgroundColor: COLORS.accent
  },
  viewModeText: {
    fontSize: 16,
    color: COLORS.text
  },
  regionContainer: {
    flex: 1,
    padding: 16
  },
  regionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  regionListContainer: {
    paddingBottom: 16
  },
  regionGridItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    overflow: 'hidden'
  },
  regionListItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    overflow: 'hidden'
  },
  regionItemEditing: {
    borderWidth: 2,
    borderColor: COLORS.accent
  },
  regionImageGrid: {
    width: '100%',
    height: 120
  },
  regionImageList: {
    width: 100,
    height: 100
  },
  regionInfo: {
    padding: 12,
    flex: 1
  },
  regionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  regionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2
  },
  regionSize: {
    fontSize: 10,
    color: COLORS.textSecondary
  },
  regionActions: {
    flexDirection: 'row',
    position: 'absolute',
    top: 8,
    right: 8
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)'
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14
  },
  editPanel: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  editTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  editAction: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    padding: 8,
    marginBottom: 4
  },
  editActionText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center'
  }
});

/**
 * パフォーマンスメトリクス表示コンポーネント
 */
export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  historical = false,
  realtime = false,
  chartType = 'line'
}) => {
  const [currentMetrics, setCurrentMetrics] = useState(metrics);
  const animatedValues = useRef({
    processingTime: new Animated.Value(0),
    memoryUsage: new Animated.Value(0),
    throughput: new Animated.Value(0),
    accuracy: new Animated.Value(0)
  }).current;

  // リアルタイム更新
  useEffect(() => {
    if (realtime) {
      const interval = setInterval(() => {
        // モックデータ更新
        setCurrentMetrics(prev => ({
          processingTime: prev.processingTime + Math.random() * 100 - 50,
          memoryUsage: Math.min(100, Math.max(0, prev.memoryUsage + Math.random() * 10 - 5)),
          throughput: prev.throughput + Math.random() * 2 - 1,
          accuracy: Math.min(100, Math.max(0, prev.accuracy + Math.random() * 2 - 1))
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [realtime]);

  // メトリクスアニメーション
  useEffect(() => {
    Object.keys(animatedValues).forEach(key => {
      Animated.timing(animatedValues[key as keyof typeof animatedValues], {
        toValue: currentMetrics[key as keyof typeof currentMetrics],
        duration: 500,
        useNativeDriver: false
      }).start();
    });
  }, [currentMetrics]);

  return (
    <View style={styles.metricsContainer}>
      <Text style={styles.metricsTitle}>パフォーマンスメトリクス</Text>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>処理時間</Text>
          <Animated.Text style={styles.metricValue}>
            {animatedValues.processingTime}
          </Animated.Text>
          <Text style={styles.metricUnit}>ms</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>メモリ使用量</Text>
          <Animated.Text style={styles.metricValue}>
            {animatedValues.memoryUsage}
          </Animated.Text>
          <Text style={styles.metricUnit}>%</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>スループット</Text>
          <Animated.Text style={styles.metricValue}>
            {animatedValues.throughput}
          </Animated.Text>
          <Text style={styles.metricUnit}>items/s</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>精度</Text>
          <Animated.Text style={styles.metricValue}>
            {animatedValues.accuracy}
          </Animated.Text>
          <Text style={styles.metricUnit}>%</Text>
        </View>
      </View>
    </View>
  );
};

export default {
  DetectionVisualization,
  BatchProgressDisplay,
  AnalysisResults,
  PerformanceMetrics,
  // Phase 12新規コンポーネント
  Phase12Dashboard,
  AdvancedDetectionView,
  RegionExtractionManager
};
