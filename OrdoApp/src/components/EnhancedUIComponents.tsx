/**
 * UI表示改良サービス (4時間実装)
 * 
 * 検出結果・領域分析・パフォーマンス表示の改良UI
 * リアルタイム更新・インタラクティブ可視化・レスポンシブデザイン
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, Animated, StyleSheet } from 'react-native';
// import { Canvas, Path, Skia, Group, Circle, Rect, Text as SkiaText } from '@shopify/react-native-skia';
import { DetectionResult } from '../services/ObjectDetectionService';
import { ExtractedRegion } from '../services/MultiRegionExtractionService';
import { FreshnessScore } from '../services/FreshnessDetectionService';
import { StateClassificationResult } from '../services/StateClassificationService';
import { BatchOutput, BatchProgress } from '../services/BatchOptimizationService';

// 色定義
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
  overlay: 'rgba(0, 0, 0, 0.3)'
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

// スタイル定義
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
  }
});

export default {
  DetectionVisualization,
  BatchProgressDisplay,
  AnalysisResults,
  PerformanceMetrics
};
