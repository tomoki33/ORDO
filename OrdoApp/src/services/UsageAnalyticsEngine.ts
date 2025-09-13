/**
 * Usage Analytics Engine
 * 使用履歴分析エンジン - 消費パターンの学習と分析
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoggingService, LogCategory } from './LoggingService';
import { performanceMonitor } from './PerformanceMonitorService';

export interface UsageEvent {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  category: string;
  action: 'add' | 'consume' | 'remove' | 'expire' | 'view' | 'search';
  quantity: number;
  unit: string;
  timestamp: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  seasonId: number; // 0-3 (Spring, Summer, Fall, Winter)
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ConsumptionPattern {
  productId: string;
  productName: string;
  category: string;
  
  // 消費頻度分析
  averageConsumptionRate: number; // 日あたりの平均消費量
  consumptionVariance: number; // 消費量の分散
  lastConsumptionDate: number;
  totalConsumptions: number;
  
  // 時間パターン
  hourlyDistribution: number[]; // 24時間での消費分布
  dailyDistribution: number[]; // 7日間での消費分布
  seasonalDistribution: number[]; // 4季節での消費分布
  
  // 購入パターン
  averagePurchaseQuantity: number;
  purchaseFrequency: number; // 日あたりの購入頻度
  lastPurchaseDate: number;
  totalPurchases: number;
  
  // 予測データ
  nextPurchasePrediction: number; // 次回購入予測日
  consumptionTrend: 'increasing' | 'decreasing' | 'stable';
  seasonalityStrength: number; // 季節性の強さ (0-1)
  
  // 信頼度
  confidenceScore: number; // 分析の信頼度 (0-1)
  dataQuality: number; // データの質 (0-1)
  sampleSize: number; // 分析に使用したデータ数
}

export interface SeasonalPattern {
  season: number;
  name: string;
  popularProducts: Array<{
    productId: string;
    productName: string;
    consumptionIncrease: number; // 通常時に対する増加率
    confidence: number;
  }>;
  consumptionChanges: Record<string, number>; // カテゴリ別の消費変化
}

export interface UsageAnalyticsConfig {
  minDataPoints: number;
  confidenceThreshold: number;
  seasonalityDetectionThreshold: number;
  trendAnalysisPeriod: number; // 日数
  dataRetentionPeriod: number; // 日数
  enableRealTimeAnalysis: boolean;
  enableSeasonalAnalysis: boolean;
  enablePredictiveAnalysis: boolean;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  uniqueProducts: number;
  averageConsumptionRate: number;
  mostConsumedProducts: Array<{
    productId: string;
    productName: string;
    consumptionCount: number;
    lastConsumed: number;
  }>;
  leastConsumedProducts: Array<{
    productId: string;
    productName: string;
    consumptionCount: number;
    lastConsumed: number;
  }>;
  seasonalTrends: SeasonalPattern[];
  dataQualityScore: number;
  predictionAccuracy: number;
}

class UsageAnalyticsEngine {
  private events: UsageEvent[] = [];
  private patterns: Map<string, ConsumptionPattern> = new Map();
  private seasonalPatterns: SeasonalPattern[] = [];
  private isInitialized = false;
  private analysisInProgress = false;
  
  private config: UsageAnalyticsConfig = {
    minDataPoints: 5,
    confidenceThreshold: 0.6,
    seasonalityDetectionThreshold: 0.3,
    trendAnalysisPeriod: 30,
    dataRetentionPeriod: 365,
    enableRealTimeAnalysis: true,
    enableSeasonalAnalysis: true,
    enablePredictiveAnalysis: true,
  };

  constructor(
    private loggingService: LoggingService,
    private performanceMonitor: any
  ) {}

  /**
   * エンジン初期化
   */
  async initialize(): Promise<void> {
    console.log('🔍 Initializing Usage Analytics Engine...');
    
    try {
      // 既存データの読み込み
      await this.loadStoredData();
      
      // 分析実行
      await this.performInitialAnalysis();
      
      this.isInitialized = true;
      console.log('✅ Usage Analytics Engine initialized');
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to initialize usage analytics engine', error as Error);
      throw error;
    }
  }

  /**
   * 使用イベントの記録
   */
  async recordUsageEvent(event: Omit<UsageEvent, 'id' | 'timestamp' | 'dayOfWeek' | 'hourOfDay' | 'seasonId'>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const now = new Date();
    const completeEvent: UsageEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.getTime(),
      dayOfWeek: now.getDay(),
      hourOfDay: now.getHours(),
      seasonId: this.getSeasonId(now),
    };

    this.events.push(completeEvent);
    
    // データ保存
    await this.saveEvent(completeEvent);
    
    // リアルタイム分析
    if (this.config.enableRealTimeAnalysis) {
      await this.updatePatternForProduct(completeEvent.productId);
    }
    
    console.log(`📊 Recorded usage event: ${completeEvent.action} - ${completeEvent.productName}`);
  }

  /**
   * 消費パターン分析実行
   */
  async analyzeConsumptionPatterns(): Promise<void> {
    if (this.analysisInProgress) {
      console.log('Analysis already in progress, skipping...');
      return;
    }

    this.analysisInProgress = true;
    this.performanceMonitor.startTimer('usageAnalysis');
    
    try {
      console.log('🔍 Starting consumption pattern analysis...');
      
      // 全製品のパターン分析
      const productIds = [...new Set(this.events.map(e => e.productId))];
      
      for (const productId of productIds) {
        await this.analyzeProductPattern(productId);
      }
      
      // 季節分析
      if (this.config.enableSeasonalAnalysis) {
        await this.analyzeSeasonalPatterns();
      }
      
      // パターンデータ保存
      await this.savePatterns();
      
      console.log(`✅ Analysis completed for ${productIds.length} products`);
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to analyze consumption patterns', error as Error);
      throw error;
    } finally {
      this.analysisInProgress = false;
      this.performanceMonitor.endTimer('usageAnalysis');
    }
  }

  /**
   * 特定製品のパターン分析
   */
  private async analyzeProductPattern(productId: string): Promise<void> {
    const productEvents = this.events.filter(e => e.productId === productId);
    
    if (productEvents.length < this.config.minDataPoints) {
      console.log(`Insufficient data for product ${productId}: ${productEvents.length} events`);
      return;
    }

    const consumptionEvents = productEvents.filter(e => e.action === 'consume');
    const purchaseEvents = productEvents.filter(e => e.action === 'add');
    
    if (consumptionEvents.length === 0) {
      return;
    }

    const pattern: ConsumptionPattern = {
      productId,
      productName: productEvents[0].productName,
      category: productEvents[0].category,
      
      // 消費分析
      averageConsumptionRate: this.calculateConsumptionRate(consumptionEvents),
      consumptionVariance: this.calculateVariance(consumptionEvents.map(e => e.quantity)),
      lastConsumptionDate: Math.max(...consumptionEvents.map(e => e.timestamp)),
      totalConsumptions: consumptionEvents.length,
      
      // 時間分布
      hourlyDistribution: this.calculateHourlyDistribution(consumptionEvents),
      dailyDistribution: this.calculateDailyDistribution(consumptionEvents),
      seasonalDistribution: this.calculateSeasonalDistribution(consumptionEvents),
      
      // 購入分析
      averagePurchaseQuantity: this.calculateAveragePurchaseQuantity(purchaseEvents),
      purchaseFrequency: this.calculatePurchaseFrequency(purchaseEvents),
      lastPurchaseDate: purchaseEvents.length > 0 ? Math.max(...purchaseEvents.map(e => e.timestamp)) : 0,
      totalPurchases: purchaseEvents.length,
      
      // 予測
      nextPurchasePrediction: this.predictNextPurchase(productEvents),
      consumptionTrend: this.detectConsumptionTrend(consumptionEvents),
      seasonalityStrength: this.calculateSeasonalityStrength(consumptionEvents),
      
      // 信頼度
      confidenceScore: this.calculateConfidenceScore(productEvents),
      dataQuality: this.calculateDataQuality(productEvents),
      sampleSize: productEvents.length,
    };

    this.patterns.set(productId, pattern);
  }

  /**
   * 季節パターン分析
   */
  private async analyzeSeasonalPatterns(): Promise<void> {
    const seasonalData: SeasonalPattern[] = [];
    
    for (let season = 0; season < 4; season++) {
      const seasonEvents = this.events.filter(e => e.seasonId === season);
      const seasonName = ['Spring', 'Summer', 'Fall', 'Winter'][season];
      
      // 季節ごとの人気商品分析
      const productConsumption = new Map<string, number>();
      seasonEvents.filter(e => e.action === 'consume').forEach(e => {
        const current = productConsumption.get(e.productId) || 0;
        productConsumption.set(e.productId, current + e.quantity);
      });
      
      // 全体平均との比較
      const overallAverage = this.calculateOverallConsumptionAverage();
      const popularProducts = Array.from(productConsumption.entries())
        .map(([productId, consumption]) => {
          const productInfo = this.events.find(e => e.productId === productId);
          const seasonalAverage = consumption / (seasonEvents.length || 1);
          const increase = (seasonalAverage - overallAverage) / (overallAverage || 1);
          
          return {
            productId,
            productName: productInfo?.productName || 'Unknown',
            consumptionIncrease: increase,
            confidence: this.calculateSeasonalConfidence(productId, season),
          };
        })
        .filter(p => p.consumptionIncrease > this.config.seasonalityDetectionThreshold)
        .sort((a, b) => b.consumptionIncrease - a.consumptionIncrease)
        .slice(0, 10);
      
      // カテゴリ別消費変化
      const categoryChanges: Record<string, number> = {};
      const categories = [...new Set(seasonEvents.map(e => e.category))];
      
      categories.forEach(category => {
        const seasonalConsumption = this.calculateCategoryConsumption(category, season);
        const overallConsumption = this.calculateCategoryConsumption(category);
        categoryChanges[category] = (seasonalConsumption - overallConsumption) / (overallConsumption || 1);
      });
      
      seasonalData.push({
        season,
        name: seasonName,
        popularProducts,
        consumptionChanges: categoryChanges,
      });
    }
    
    this.seasonalPatterns = seasonalData;
  }

  /**
   * 消費率計算
   */
  private calculateConsumptionRate(events: UsageEvent[]): number {
    if (events.length < 2) return 0;
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    const totalDays = (lastEvent.timestamp - firstEvent.timestamp) / (1000 * 60 * 60 * 24);
    const totalQuantity = events.reduce((sum, e) => sum + e.quantity, 0);
    
    return totalDays > 0 ? totalQuantity / totalDays : 0;
  }

  /**
   * 分散計算
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 時間別分布計算
   */
  private calculateHourlyDistribution(events: UsageEvent[]): number[] {
    const distribution = new Array(24).fill(0);
    
    events.forEach(event => {
      distribution[event.hourOfDay] += event.quantity;
    });
    
    // 正規化
    const total = distribution.reduce((sum, val) => sum + val, 0);
    return total > 0 ? distribution.map(val => val / total) : distribution;
  }

  /**
   * 日別分布計算
   */
  private calculateDailyDistribution(events: UsageEvent[]): number[] {
    const distribution = new Array(7).fill(0);
    
    events.forEach(event => {
      distribution[event.dayOfWeek] += event.quantity;
    });
    
    const total = distribution.reduce((sum, val) => sum + val, 0);
    return total > 0 ? distribution.map(val => val / total) : distribution;
  }

  /**
   * 季節別分布計算
   */
  private calculateSeasonalDistribution(events: UsageEvent[]): number[] {
    const distribution = new Array(4).fill(0);
    
    events.forEach(event => {
      distribution[event.seasonId] += event.quantity;
    });
    
    const total = distribution.reduce((sum, val) => sum + val, 0);
    return total > 0 ? distribution.map(val => val / total) : distribution;
  }

  /**
   * 平均購入量計算
   */
  private calculateAveragePurchaseQuantity(events: UsageEvent[]): number {
    if (events.length === 0) return 0;
    
    const totalQuantity = events.reduce((sum, e) => sum + e.quantity, 0);
    return totalQuantity / events.length;
  }

  /**
   * 購入頻度計算
   */
  private calculatePurchaseFrequency(events: UsageEvent[]): number {
    if (events.length < 2) return 0;
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    
    const totalDays = (lastEvent.timestamp - firstEvent.timestamp) / (1000 * 60 * 60 * 24);
    return totalDays > 0 ? events.length / totalDays : 0;
  }

  /**
   * 次回購入予測
   */
  private predictNextPurchase(events: UsageEvent[]): number {
    const purchaseEvents = events.filter(e => e.action === 'add').sort((a, b) => a.timestamp - b.timestamp);
    
    if (purchaseEvents.length < 2) {
      return Date.now() + (7 * 24 * 60 * 60 * 1000); // デフォルト: 1週間後
    }
    
    // 購入間隔の平均を計算
    const intervals: number[] = [];
    for (let i = 1; i < purchaseEvents.length; i++) {
      intervals.push(purchaseEvents[i].timestamp - purchaseEvents[i - 1].timestamp);
    }
    
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const lastPurchase = purchaseEvents[purchaseEvents.length - 1].timestamp;
    
    return lastPurchase + averageInterval;
  }

  /**
   * 消費トレンド検出
   */
  private detectConsumptionTrend(events: UsageEvent[]): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 4) return 'stable';
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    const midPoint = Math.floor(sortedEvents.length / 2);
    
    const firstHalf = sortedEvents.slice(0, midPoint);
    const secondHalf = sortedEvents.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.quantity, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.quantity, 0) / secondHalf.length;
    
    const changeRatio = (secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1);
    
    if (changeRatio > 0.2) return 'increasing';
    if (changeRatio < -0.2) return 'decreasing';
    return 'stable';
  }

  /**
   * 季節性強度計算
   */
  private calculateSeasonalityStrength(events: UsageEvent[]): number {
    const seasonalDistribution = this.calculateSeasonalDistribution(events);
    const uniformDistribution = 0.25; // 均等分布
    
    // カイ二乗統計量的な計算
    const chiSquare = seasonalDistribution.reduce((sum, observed) => {
      return sum + Math.pow(observed - uniformDistribution, 2) / uniformDistribution;
    }, 0);
    
    // 0-1の範囲に正規化
    return Math.min(chiSquare / 4, 1);
  }

  /**
   * 信頼度スコア計算
   */
  private calculateConfidenceScore(events: UsageEvent[]): number {
    let score = 0;
    
    // データ量による信頼度
    const dataPoints = events.length;
    score += Math.min(dataPoints / 20, 0.4); // 最大40%
    
    // データの新しさ
    const latestEvent = Math.max(...events.map(e => e.timestamp));
    const daysSinceLatest = (Date.now() - latestEvent) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 0.3 - (daysSinceLatest / 30) * 0.3); // 最大30%
    
    // データの一貫性
    const consumptionEvents = events.filter(e => e.action === 'consume');
    if (consumptionEvents.length > 1) {
      const variance = this.calculateVariance(consumptionEvents.map(e => e.quantity));
      const mean = consumptionEvents.reduce((sum, e) => sum + e.quantity, 0) / consumptionEvents.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // 変動係数
      score += Math.max(0, 0.3 - cv * 0.3); // 最大30%
    }
    
    return Math.min(score, 1);
  }

  /**
   * データ品質計算
   */
  private calculateDataQuality(events: UsageEvent[]): number {
    let score = 1.0;
    
    // 欠損データチェック
    const missingFields = events.filter(e => !e.productName || !e.category || e.quantity <= 0);
    score -= (missingFields.length / events.length) * 0.3;
    
    // 重複データチェック
    const uniqueEvents = new Set(events.map(e => `${e.timestamp}_${e.action}_${e.productId}`));
    const duplicateRatio = 1 - (uniqueEvents.size / events.length);
    score -= duplicateRatio * 0.3;
    
    // 異常値チェック
    const quantities = events.map(e => e.quantity);
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    const std = Math.sqrt(this.calculateVariance(quantities));
    const outliers = quantities.filter(q => Math.abs(q - mean) > 3 * std);
    score -= (outliers.length / quantities.length) * 0.4;
    
    return Math.max(score, 0);
  }

  /**
   * 季節ID取得
   */
  private getSeasonId(date: Date): number {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 0; // Spring
    if (month >= 5 && month <= 7) return 1; // Summer
    if (month >= 8 && month <= 10) return 2; // Fall
    return 3; // Winter
  }

  /**
   * 全体消費平均計算
   */
  private calculateOverallConsumptionAverage(): number {
    const consumptionEvents = this.events.filter(e => e.action === 'consume');
    if (consumptionEvents.length === 0) return 0;
    
    const totalQuantity = consumptionEvents.reduce((sum, e) => sum + e.quantity, 0);
    return totalQuantity / consumptionEvents.length;
  }

  /**
   * カテゴリ消費量計算
   */
  private calculateCategoryConsumption(category: string, season?: number): number {
    let events = this.events.filter(e => e.category === category && e.action === 'consume');
    
    if (season !== undefined) {
      events = events.filter(e => e.seasonId === season);
    }
    
    return events.reduce((sum, e) => sum + e.quantity, 0);
  }

  /**
   * 季節信頼度計算
   */
  private calculateSeasonalConfidence(productId: string, season: number): number {
    const productEvents = this.events.filter(e => e.productId === productId);
    const seasonEvents = productEvents.filter(e => e.seasonId === season);
    
    if (seasonEvents.length < 2) return 0;
    
    const seasonalRatio = seasonEvents.length / productEvents.length;
    return Math.min(seasonalRatio * 4, 1); // 4倍して正規化
  }

  // === データ管理 ===

  /**
   * 保存されたデータの読み込み
   */
  private async loadStoredData(): Promise<void> {
    try {
      // イベントデータ読み込み
      const storedEvents = await AsyncStorage.getItem('usage_events');
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }
      
      // パターンデータ読み込み
      const storedPatterns = await AsyncStorage.getItem('consumption_patterns');
      if (storedPatterns) {
        const patternsArray = JSON.parse(storedPatterns);
        this.patterns = new Map(patternsArray);
      }
      
      // 季節パターン読み込み
      const storedSeasonalPatterns = await AsyncStorage.getItem('seasonal_patterns');
      if (storedSeasonalPatterns) {
        this.seasonalPatterns = JSON.parse(storedSeasonalPatterns);
      }
      
      console.log(`📂 Loaded ${this.events.length} events and ${this.patterns.size} patterns`);
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to load stored analytics data', error as Error);
    }
  }

  /**
   * イベント保存
   */
  private async saveEvent(event: UsageEvent): Promise<void> {
    try {
      await AsyncStorage.setItem('usage_events', JSON.stringify(this.events));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save usage event', error as Error);
    }
  }

  /**
   * パターン保存
   */
  private async savePatterns(): Promise<void> {
    try {
      const patternsArray = Array.from(this.patterns.entries());
      await AsyncStorage.setItem('consumption_patterns', JSON.stringify(patternsArray));
      await AsyncStorage.setItem('seasonal_patterns', JSON.stringify(this.seasonalPatterns));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save patterns', error as Error);
    }
  }

  /**
   * 初期分析実行
   */
  private async performInitialAnalysis(): Promise<void> {
    if (this.events.length > 0) {
      await this.analyzeConsumptionPatterns();
    }
  }

  /**
   * 特定製品のパターン更新
   */
  private async updatePatternForProduct(productId: string): Promise<void> {
    await this.analyzeProductPattern(productId);
    await this.savePatterns();
  }

  // === 公開API ===

  /**
   * 製品の消費パターン取得
   */
  getConsumptionPattern(productId: string): ConsumptionPattern | null {
    return this.patterns.get(productId) || null;
  }

  /**
   * 全パターン取得
   */
  getAllPatterns(): ConsumptionPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * 季節パターン取得
   */
  getSeasonalPatterns(): SeasonalPattern[] {
    return this.seasonalPatterns;
  }

  /**
   * 使用イベント履歴取得
   */
  getUsageHistory(productId?: string, limit?: number): UsageEvent[] {
    let events = productId 
      ? this.events.filter(e => e.productId === productId)
      : this.events;
    
    events = events.sort((a, b) => b.timestamp - a.timestamp);
    
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * 分析メトリクス取得
   */
  getAnalyticsMetrics(): AnalyticsMetrics {
    const patterns = this.getAllPatterns();
    
    const mostConsumed = patterns
      .sort((a, b) => b.totalConsumptions - a.totalConsumptions)
      .slice(0, 10)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        consumptionCount: p.totalConsumptions,
        lastConsumed: p.lastConsumptionDate,
      }));
    
    const leastConsumed = patterns
      .filter(p => p.totalConsumptions > 0)
      .sort((a, b) => a.totalConsumptions - b.totalConsumptions)
      .slice(0, 10)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        consumptionCount: p.totalConsumptions,
        lastConsumed: p.lastConsumptionDate,
      }));
    
    const averageConsumption = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.averageConsumptionRate, 0) / patterns.length
      : 0;
    
    const dataQuality = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.dataQuality, 0) / patterns.length
      : 0;
    
    const predictionAccuracy = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidenceScore, 0) / patterns.length
      : 0;
    
    return {
      totalEvents: this.events.length,
      uniqueProducts: patterns.length,
      averageConsumptionRate: averageConsumption,
      mostConsumedProducts: mostConsumed,
      leastConsumedProducts: leastConsumed,
      seasonalTrends: this.seasonalPatterns,
      dataQualityScore: dataQuality,
      predictionAccuracy,
    };
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<UsageAnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Usage analytics config updated:', this.config);
  }

  /**
   * データクリーンアップ
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = Date.now() - (this.config.dataRetentionPeriod * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    
    const removedCount = initialCount - this.events.length;
    if (removedCount > 0) {
      await this.saveEvent(this.events[0]); // データ保存をトリガー
      console.log(`🧹 Cleaned up ${removedCount} old events`);
    }
  }

  /**
   * 分析強制実行
   */
  async forceAnalysis(): Promise<void> {
    await this.analyzeConsumptionPatterns();
  }
}

export const usageAnalyticsEngine = new UsageAnalyticsEngine(
  new LoggingService(),
  performanceMonitor
);
