/**
 * Learning Data Accumulation Service
 * 学習データ蓄積サービス - データ収集と機械学習モデル改善
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoggingService, LogCategory } from './LoggingService';
import { performanceMonitor } from './PerformanceMonitorService';
import { usageAnalyticsEngine, UsageEvent } from './UsageAnalyticsEngine';
import { predictiveAlgorithmService } from './PredictiveAlgorithmService';

export interface LearningDataPoint {
  id: string;
  timestamp: number;
  eventType: 'user_action' | 'prediction_result' | 'feedback' | 'correction' | 'system_event';
  
  // 入力データ
  inputFeatures: Record<string, number | string | boolean>;
  
  // 出力データ
  expectedOutput?: any;
  actualOutput?: any;
  
  // フィードバック
  userFeedback?: {
    rating: number; // 1-5
    accuracy: 'accurate' | 'partially_accurate' | 'inaccurate';
    usefulness: 'useful' | 'somewhat_useful' | 'not_useful';
    comments?: string;
  };
  
  // コンテキスト
  context: {
    userId: string;
    sessionId: string;
    deviceInfo: Record<string, any>;
    appVersion: string;
    environmentFactors?: Record<string, any>;
  };
  
  // メタデータ
  metadata: {
    modelVersion?: string;
    featureVersion?: string;
    experimentGroup?: string;
    dataQuality: number; // 0-1
  };
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number; // Mean Squared Error
  mae: number; // Mean Absolute Error
  
  // 時系列データ
  accuracyOverTime: Array<{
    timestamp: number;
    accuracy: number;
    sampleSize: number;
  }>;
  
  // カテゴリ別性能
  categoryPerformance: Record<string, {
    accuracy: number;
    sampleSize: number;
  }>;
  
  // 信頼度分布
  confidenceDistribution: Array<{
    range: string;
    count: number;
    accuracy: number;
  }>;
}

export interface LearningProgress {
  totalDataPoints: number;
  qualityDataPoints: number;
  modelUpdates: number;
  lastUpdateTime: number;
  improvementRate: number; // 改善率
  
  // 学習段階
  learningStage: 'initial' | 'training' | 'improving' | 'stable' | 'declining';
  
  // データ分布
  dataDistribution: {
    userActions: number;
    predictionResults: number;
    feedbacks: number;
    corrections: number;
  };
  
  // 品質指標
  dataQualityMetrics: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
}

export interface LearningConfig {
  minDataPointsForUpdate: number;
  dataRetentionPeriod: number; // 日数
  feedbackWeightDecay: number; // フィードバックの重み減衰
  qualityThreshold: number;
  updateFrequency: number; // 時間（ミリ秒）
  enableActiveStorage: boolean;
  enableModelUpdates: boolean;
  enableExperimentation: boolean;
  maxStorageSize: number; // MB
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
  suggestions: string[];
}

class LearningDataAccumulationService {
  private dataPoints: LearningDataPoint[] = [];
  private modelMetrics: ModelPerformanceMetrics | null = null;
  private learningProgress: LearningProgress | null = null;
  private isInitialized = false;
  private lastUpdate = 0;
  
  private config: LearningConfig = {
    minDataPointsForUpdate: 50,
    dataRetentionPeriod: 180, // 6ヶ月
    feedbackWeightDecay: 0.95,
    qualityThreshold: 0.7,
    updateFrequency: 24 * 60 * 60 * 1000, // 24時間
    enableActiveStorage: true,
    enableModelUpdates: true,
    enableExperimentation: false,
    maxStorageSize: 100, // 100MB
  };

  constructor(
    private loggingService: LoggingService,
    private performanceMonitor: any
  ) {}

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Learning Data Accumulation Service...');
    
    try {
      // 既存データの読み込み
      await this.loadStoredData();
      
      // 初期分析実行
      await this.analyzeCurrentProgress();
      
      // 定期更新の開始
      if (this.config.enableActiveStorage) {
        this.startPeriodicUpdates();
      }
      
      this.isInitialized = true;
      console.log('✅ Learning Data Accumulation Service initialized');
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to initialize learning data service', error as Error);
      throw error;
    }
  }

  /**
   * 学習データポイント追加
   */
  async addDataPoint(dataPoint: Omit<LearningDataPoint, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const completeDataPoint: LearningDataPoint = {
      ...dataPoint,
      id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // データ検証
    const validation = this.validateDataPoint(completeDataPoint);
    if (!validation.isValid) {
      console.warn('Invalid data point:', validation.errors);
      return;
    }

    // データ追加
    this.dataPoints.push(completeDataPoint);
    
    // ストレージ保存
    await this.saveDataPoint(completeDataPoint);
    
    // 学習トリガーチェック
    if (this.shouldTriggerLearning()) {
      await this.triggerModelUpdate();
    }
    
    console.log(`📚 Added learning data point: ${completeDataPoint.eventType}`);
  }

  /**
   * ユーザーアクション記録
   */
  async recordUserAction(
    action: string,
    context: Record<string, any>,
    result?: any
  ): Promise<void> {
    await this.addDataPoint({
      eventType: 'user_action',
      inputFeatures: {
        action,
        timestamp: Date.now(),
        ...context,
      },
      actualOutput: result,
      context: await this.getCurrentContext(),
      metadata: {
        dataQuality: this.calculateDataQuality({ action, ...context }),
        featureVersion: '1.0.0',
      },
    });
  }

  /**
   * 予測結果記録
   */
  async recordPredictionResult(
    predictionId: string,
    inputFeatures: Record<string, any>,
    prediction: any,
    actualOutcome?: any
  ): Promise<void> {
    await this.addDataPoint({
      eventType: 'prediction_result',
      inputFeatures: {
        predictionId,
        ...inputFeatures,
      },
      expectedOutput: prediction,
      actualOutput: actualOutcome,
      context: await this.getCurrentContext(),
      metadata: {
        modelVersion: '1.0.0',
        dataQuality: this.calculateDataQuality(inputFeatures),
      },
    });
  }

  /**
   * ユーザーフィードバック記録
   */
  async recordUserFeedback(
    targetId: string,
    feedback: {
      rating: number;
      accuracy: 'accurate' | 'partially_accurate' | 'inaccurate';
      usefulness: 'useful' | 'somewhat_useful' | 'not_useful';
      comments?: string;
    }
  ): Promise<void> {
    await this.addDataPoint({
      eventType: 'feedback',
      inputFeatures: {
        targetId,
        feedbackType: 'user_rating',
      },
      userFeedback: feedback,
      context: await this.getCurrentContext(),
      metadata: {
        dataQuality: 0.9, // フィードバックは高品質
      },
    });
  }

  /**
   * 修正データ記録
   */
  async recordCorrection(
    originalPrediction: any,
    correctedValue: any,
    correctionType: string
  ): Promise<void> {
    await this.addDataPoint({
      eventType: 'correction',
      inputFeatures: {
        correctionType,
        originalValue: originalPrediction,
        timestamp: Date.now(),
      },
      expectedOutput: correctedValue,
      actualOutput: originalPrediction,
      context: await this.getCurrentContext(),
      metadata: {
        dataQuality: 0.95, // 修正データは最高品質
      },
    });
  }

  /**
   * モデル性能評価
   */
  async evaluateModelPerformance(): Promise<ModelPerformanceMetrics> {
    console.log('📊 Evaluating model performance...');
    
    const predictionData = this.dataPoints.filter(
      dp => dp.eventType === 'prediction_result' && 
           dp.expectedOutput && 
           dp.actualOutput
    );

    if (predictionData.length === 0) {
      return this.getDefaultMetrics();
    }

    // 基本メトリクス計算
    const accuracy = this.calculateAccuracy(predictionData);
    const precision = this.calculatePrecision(predictionData);
    const recall = this.calculateRecall(predictionData);
    const f1Score = this.calculateF1Score(precision, recall);
    const mse = this.calculateMSE(predictionData);
    const mae = this.calculateMAE(predictionData);

    // 時系列精度
    const accuracyOverTime = this.calculateAccuracyOverTime(predictionData);

    // カテゴリ別性能
    const categoryPerformance = this.calculateCategoryPerformance(predictionData);

    // 信頼度分布
    const confidenceDistribution = this.calculateConfidenceDistribution(predictionData);

    const metrics: ModelPerformanceMetrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      mse,
      mae,
      accuracyOverTime,
      categoryPerformance,
      confidenceDistribution,
    };

    this.modelMetrics = metrics;
    await this.saveModelMetrics();

    return metrics;
  }

  /**
   * 学習進捗分析
   */
  async analyzeCurrentProgress(): Promise<LearningProgress> {
    console.log('📈 Analyzing learning progress...');

    const totalDataPoints = this.dataPoints.length;
    const qualityDataPoints = this.dataPoints.filter(
      dp => dp.metadata.dataQuality >= this.config.qualityThreshold
    ).length;

    // データ分布計算
    const dataDistribution = {
      userActions: this.dataPoints.filter(dp => dp.eventType === 'user_action').length,
      predictionResults: this.dataPoints.filter(dp => dp.eventType === 'prediction_result').length,
      feedbacks: this.dataPoints.filter(dp => dp.eventType === 'feedback').length,
      corrections: this.dataPoints.filter(dp => dp.eventType === 'correction').length,
    };

    // 学習段階判定
    const learningStage = this.determineLearningStage(totalDataPoints, qualityDataPoints);

    // 改善率計算
    const improvementRate = this.calculateImprovementRate();

    // データ品質メトリクス
    const dataQualityMetrics = this.calculateDataQualityMetrics();

    const progress: LearningProgress = {
      totalDataPoints,
      qualityDataPoints,
      modelUpdates: 0, // 実装に応じて更新
      lastUpdateTime: this.lastUpdate,
      improvementRate,
      learningStage,
      dataDistribution,
      dataQualityMetrics,
    };

    this.learningProgress = progress;
    await this.saveLearningProgress();

    return progress;
  }

  /**
   * 適応的学習実行
   */
  async performAdaptiveLearning(): Promise<void> {
    console.log('🤖 Performing adaptive learning...');
    
    this.performanceMonitor.startTimer('adaptiveLearning');
    
    try {
      // 最新のフィードバックデータを取得
      const recentFeedback = this.getRecentFeedback();
      
      // パフォーマンスの悪い予測を特定
      const poorPredictions = this.identifyPoorPredictions();
      
      // パターン分析
      const improvedPatterns = this.analyzeImprovementPatterns(recentFeedback, poorPredictions);
      
      // 予測アルゴリズムの設定更新
      if (improvedPatterns.configUpdates) {
        await predictiveAlgorithmService.updateConfig(improvedPatterns.configUpdates);
      }
      
      // 使用履歴エンジンの設定更新
      if (improvedPatterns.analyticsUpdates) {
        usageAnalyticsEngine.updateConfig(improvedPatterns.analyticsUpdates);
      }
      
      this.lastUpdate = Date.now();
      console.log('✅ Adaptive learning completed');
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to perform adaptive learning', error as Error);
    } finally {
      this.performanceMonitor.endTimer('adaptiveLearning');
    }
  }

  /**
   * A/Bテスト実験管理
   */
  async manageExperiments(): Promise<void> {
    if (!this.config.enableExperimentation) {
      return;
    }

    console.log('🧪 Managing A/B test experiments...');
    
    // 実験グループ分析
    const experimentGroups = this.analyzeExperimentGroups();
    
    // 統計的有意性テスト
    const significantResults = this.performSignificanceTests(experimentGroups);
    
    // 最適設定の適用
    if (significantResults.winner) {
      await this.applyWinningConfiguration(significantResults.winner);
    }
  }

  // === 計算メソッド ===

  private validateDataPoint(dataPoint: LearningDataPoint): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 必須フィールドチェック
    if (!dataPoint.eventType) errors.push('Event type is required');
    if (!dataPoint.inputFeatures) errors.push('Input features are required');
    if (!dataPoint.context) errors.push('Context is required');

    // データ品質チェック
    if (dataPoint.metadata.dataQuality < 0.5) {
      warnings.push('Low data quality score');
    }

    // コンテキスト完全性チェック
    if (!dataPoint.context.userId) {
      warnings.push('Missing user ID in context');
    }

    const qualityScore = this.calculateDataQuality(dataPoint.inputFeatures);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore,
      suggestions,
    };
  }

  private calculateDataQuality(features: Record<string, any>): number {
    let score = 1.0;
    
    // 完全性チェック
    const totalFields = Object.keys(features).length;
    const emptyFields = Object.values(features).filter(v => v == null || v === '').length;
    score -= (emptyFields / totalFields) * 0.3;
    
    // 一貫性チェック（簡単な例）
    if (features.timestamp && features.timestamp > Date.now()) {
      score -= 0.2; // 未来のタイムスタンプは異常
    }
    
    return Math.max(0, score);
  }

  private shouldTriggerLearning(): boolean {
    const timeSinceLastUpdate = Date.now() - this.lastUpdate;
    const hasEnoughData = this.dataPoints.length >= this.config.minDataPointsForUpdate;
    const timeForUpdate = timeSinceLastUpdate >= this.config.updateFrequency;
    
    return hasEnoughData && timeForUpdate;
  }

  private async triggerModelUpdate(): Promise<void> {
    if (!this.config.enableModelUpdates) {
      return;
    }

    console.log('🔄 Triggering model update...');
    await this.performAdaptiveLearning();
  }

  private calculateAccuracy(data: LearningDataPoint[]): number {
    let correct = 0;
    
    for (const point of data) {
      if (this.isAccuratePrediction(point.expectedOutput, point.actualOutput)) {
        correct++;
      }
    }
    
    return data.length > 0 ? correct / data.length : 0;
  }

  private calculatePrecision(data: LearningDataPoint[]): number {
    // 分類問題での精度計算（簡略版）
    return this.calculateAccuracy(data);
  }

  private calculateRecall(data: LearningDataPoint[]): number {
    // 分類問題での再現率計算（簡略版）
    return this.calculateAccuracy(data);
  }

  private calculateF1Score(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  private calculateMSE(data: LearningDataPoint[]): number {
    let sumSquaredErrors = 0;
    let count = 0;
    
    for (const point of data) {
      if (typeof point.expectedOutput === 'number' && typeof point.actualOutput === 'number') {
        const error = point.expectedOutput - point.actualOutput;
        sumSquaredErrors += error * error;
        count++;
      }
    }
    
    return count > 0 ? sumSquaredErrors / count : 0;
  }

  private calculateMAE(data: LearningDataPoint[]): number {
    let sumAbsoluteErrors = 0;
    let count = 0;
    
    for (const point of data) {
      if (typeof point.expectedOutput === 'number' && typeof point.actualOutput === 'number') {
        sumAbsoluteErrors += Math.abs(point.expectedOutput - point.actualOutput);
        count++;
      }
    }
    
    return count > 0 ? sumAbsoluteErrors / count : 0;
  }

  private calculateAccuracyOverTime(data: LearningDataPoint[]): Array<{ timestamp: number; accuracy: number; sampleSize: number; }> {
    const timeWindows = this.groupByTimeWindows(data, 7 * 24 * 60 * 60 * 1000); // 週単位
    
    return timeWindows.map(window => ({
      timestamp: window.startTime,
      accuracy: this.calculateAccuracy(window.data),
      sampleSize: window.data.length,
    }));
  }

  private calculateCategoryPerformance(data: LearningDataPoint[]): Record<string, { accuracy: number; sampleSize: number; }> {
    const categories = new Map<string, LearningDataPoint[]>();
    
    for (const point of data) {
      const category = point.inputFeatures.category as string || 'unknown';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(point);
    }
    
    const result: Record<string, { accuracy: number; sampleSize: number; }> = {};
    
    for (const [category, categoryData] of categories.entries()) {
      result[category] = {
        accuracy: this.calculateAccuracy(categoryData),
        sampleSize: categoryData.length,
      };
    }
    
    return result;
  }

  private calculateConfidenceDistribution(data: LearningDataPoint[]): Array<{ range: string; count: number; accuracy: number; }> {
    const ranges = [
      { min: 0.0, max: 0.2, range: '0-20%' },
      { min: 0.2, max: 0.4, range: '20-40%' },
      { min: 0.4, max: 0.6, range: '40-60%' },
      { min: 0.6, max: 0.8, range: '60-80%' },
      { min: 0.8, max: 1.0, range: '80-100%' },
    ];
    
    return ranges.map(range => {
      const rangeData = data.filter(point => {
        const confidence = point.inputFeatures.confidence as number;
        return confidence >= range.min && confidence < range.max;
      });
      
      return {
        range: range.range,
        count: rangeData.length,
        accuracy: this.calculateAccuracy(rangeData),
      };
    });
  }

  private determineLearningStage(totalData: number, qualityData: number): 'initial' | 'training' | 'improving' | 'stable' | 'declining' {
    if (totalData < 50) return 'initial';
    if (totalData < 200) return 'training';
    
    const qualityRatio = qualityData / totalData;
    if (qualityRatio > 0.8) return 'stable';
    if (qualityRatio > 0.6) return 'improving';
    return 'declining';
  }

  private calculateImprovementRate(): number {
    const recentData = this.dataPoints.slice(-100); // 最新100件
    const olderData = this.dataPoints.slice(-200, -100); // その前100件
    
    if (olderData.length === 0) return 0;
    
    const recentAccuracy = this.calculateAccuracy(recentData);
    const olderAccuracy = this.calculateAccuracy(olderData);
    
    return recentAccuracy - olderAccuracy;
  }

  private calculateDataQualityMetrics(): { completeness: number; accuracy: number; consistency: number; timeliness: number; } {
    const dataPoints = this.dataPoints;
    
    // 完全性
    const completeness = dataPoints.filter(dp => dp.metadata.dataQuality >= 0.8).length / dataPoints.length;
    
    // 精度（フィードバックベース）
    const feedbackData = dataPoints.filter(dp => dp.userFeedback);
    const accuracy = feedbackData.length > 0 
      ? feedbackData.filter(dp => dp.userFeedback!.accuracy === 'accurate').length / feedbackData.length
      : 0.5;
    
    // 一貫性
    const consistency = this.calculateDataConsistency();
    
    // 適時性
    const now = Date.now();
    const timeliness = dataPoints.filter(dp => (now - dp.timestamp) < 7 * 24 * 60 * 60 * 1000).length / dataPoints.length;
    
    return { completeness, accuracy, consistency, timeliness };
  }

  // === ヘルパーメソッド ===

  private async getCurrentContext(): Promise<LearningDataPoint['context']> {
    return {
      userId: 'current_user', // 実際の実装では現在のユーザーIDを取得
      sessionId: 'current_session',
      deviceInfo: {},
      appVersion: '1.0.0',
    };
  }

  private getDefaultMetrics(): ModelPerformanceMetrics {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      mse: 0,
      mae: 0,
      accuracyOverTime: [],
      categoryPerformance: {},
      confidenceDistribution: [],
    };
  }

  private isAccuratePrediction(expected: any, actual: any): boolean {
    if (typeof expected === 'number' && typeof actual === 'number') {
      const threshold = Math.abs(expected) * 0.1; // 10%の誤差許容
      return Math.abs(expected - actual) <= threshold;
    }
    return expected === actual;
  }

  private groupByTimeWindows(data: LearningDataPoint[], windowSize: number): Array<{ startTime: number; data: LearningDataPoint[]; }> {
    const windows: Array<{ startTime: number; data: LearningDataPoint[]; }> = [];
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
    
    if (sortedData.length === 0) return windows;
    
    let currentWindow = {
      startTime: sortedData[0].timestamp,
      data: [] as LearningDataPoint[],
    };
    
    for (const point of sortedData) {
      if (point.timestamp - currentWindow.startTime >= windowSize) {
        windows.push(currentWindow);
        currentWindow = {
          startTime: point.timestamp,
          data: [],
        };
      }
      currentWindow.data.push(point);
    }
    
    if (currentWindow.data.length > 0) {
      windows.push(currentWindow);
    }
    
    return windows;
  }

  private calculateDataConsistency(): number {
    // データの一貫性を計算（簡略版）
    return 0.8; // モック値
  }

  private getRecentFeedback(): LearningDataPoint[] {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.dataPoints.filter(
      dp => dp.eventType === 'feedback' && dp.timestamp > oneWeekAgo
    );
  }

  private identifyPoorPredictions(): LearningDataPoint[] {
    return this.dataPoints.filter(
      dp => dp.eventType === 'prediction_result' && 
           dp.userFeedback?.accuracy === 'inaccurate'
    );
  }

  private analyzeImprovementPatterns(feedback: LearningDataPoint[], poorPredictions: LearningDataPoint[]): any {
    // 改善パターンを分析（簡略版）
    return {
      configUpdates: {},
      analyticsUpdates: {},
    };
  }

  private analyzeExperimentGroups(): any {
    // A/Bテストグループを分析（簡略版）
    return {};
  }

  private performSignificanceTests(groups: any): any {
    // 統計的有意性テスト（簡略版）
    return { winner: null };
  }

  private async applyWinningConfiguration(config: any): Promise<void> {
    // 勝利設定を適用（簡略版）
    console.log('Applying winning configuration:', config);
  }

  private startPeriodicUpdates(): void {
    setInterval(async () => {
      if (this.shouldTriggerLearning()) {
        await this.triggerModelUpdate();
      }
    }, this.config.updateFrequency);
  }

  // === データ管理 ===

  private async loadStoredData(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem('learning_data_points');
      if (storedData) {
        this.dataPoints = JSON.parse(storedData);
      }
      
      const storedMetrics = await AsyncStorage.getItem('model_metrics');
      if (storedMetrics) {
        this.modelMetrics = JSON.parse(storedMetrics);
      }
      
      const storedProgress = await AsyncStorage.getItem('learning_progress');
      if (storedProgress) {
        this.learningProgress = JSON.parse(storedProgress);
      }
      
      console.log(`📂 Loaded ${this.dataPoints.length} learning data points`);
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to load stored learning data', error as Error);
    }
  }

  private async saveDataPoint(dataPoint: LearningDataPoint): Promise<void> {
    try {
      await AsyncStorage.setItem('learning_data_points', JSON.stringify(this.dataPoints));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save learning data point', error as Error);
    }
  }

  private async saveModelMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('model_metrics', JSON.stringify(this.modelMetrics));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save model metrics', error as Error);
    }
  }

  private async saveLearningProgress(): Promise<void> {
    try {
      await AsyncStorage.setItem('learning_progress', JSON.stringify(this.learningProgress));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save learning progress', error as Error);
    }
  }

  // === 公開API ===

  /**
   * 現在の学習進捗取得
   */
  getLearningProgress(): LearningProgress | null {
    return this.learningProgress;
  }

  /**
   * モデル性能メトリクス取得
   */
  getModelMetrics(): ModelPerformanceMetrics | null {
    return this.modelMetrics;
  }

  /**
   * データ統計取得
   */
  getDataStatistics(): {
    totalDataPoints: number;
    dataDistribution: Record<string, number>;
    qualityScore: number;
    recentActivity: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const distribution: Record<string, number> = {};
    for (const point of this.dataPoints) {
      distribution[point.eventType] = (distribution[point.eventType] || 0) + 1;
    }
    
    const qualityScores = this.dataPoints.map(dp => dp.metadata.dataQuality);
    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length 
      : 0;
    
    const recentActivity = this.dataPoints.filter(dp => dp.timestamp > oneDayAgo).length;
    
    return {
      totalDataPoints: this.dataPoints.length,
      dataDistribution: distribution,
      qualityScore: averageQuality,
      recentActivity,
    };
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Learning data config updated:', this.config);
  }

  /**
   * データクリーンアップ
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = Date.now() - (this.config.dataRetentionPeriod * 24 * 60 * 60 * 1000);
    const initialCount = this.dataPoints.length;
    
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.dataPoints.length;
    if (removedCount > 0) {
      await AsyncStorage.setItem('learning_data_points', JSON.stringify(this.dataPoints));
      console.log(`🧹 Cleaned up ${removedCount} old learning data points`);
    }
  }

  /**
   * 手動モデル更新
   */
  async forceModelUpdate(): Promise<void> {
    await this.performAdaptiveLearning();
  }

  /**
   * データエクスポート
   */
  async exportData(): Promise<{
    dataPoints: LearningDataPoint[];
    metrics: ModelPerformanceMetrics | null;
    progress: LearningProgress | null;
  }> {
    return {
      dataPoints: this.dataPoints,
      metrics: this.modelMetrics,
      progress: this.learningProgress,
    };
  }
}

export const learningDataService = new LearningDataAccumulationService(
  new LoggingService(),
  performanceMonitor
);
