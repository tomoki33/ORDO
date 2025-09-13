/**
 * Predictive Algorithm Service
 * 予測アルゴリズム - 購入推奨と消費予測
 */

import { usageAnalyticsEngine, ConsumptionPattern, UsageEvent } from './UsageAnalyticsEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoggingService, LogCategory } from './LoggingService';
import { performanceMonitor } from './PerformanceMonitorService';

export interface PredictionResult {
  productId: string;
  productName: string;
  category: string;
  
  // 予測タイプ
  predictionType: 'purchase' | 'restock' | 'consumption' | 'expiry';
  
  // 予測値
  predictedDate: number; // 予測日時
  predictedQuantity: number; // 予測数量
  confidence: number; // 信頼度 (0-1)
  
  // 予測理由
  reasons: string[];
  basedOnPatterns: string[]; // 使用したパターン
  
  // 追加情報
  currentStock?: number;
  recommendedAction: 'buy_now' | 'buy_soon' | 'monitor' | 'none';
  priority: 'high' | 'medium' | 'low';
  seasonalFactor?: number;
  
  // メタデータ
  generatedAt: number;
  validUntil: number;
  algorithmVersion: string;
}

export interface RecommendationItem {
  productId: string;
  productName: string;
  category: string;
  recommendedQuantity: number;
  urgency: 'urgent' | 'soon' | 'future';
  reason: string;
  expectedConsumptionDate: number;
  confidence: number;
  estimatedCost?: number;
  alternatives?: Array<{
    productId: string;
    productName: string;
    similarity: number;
  }>;
}

export interface SmartShoppingList {
  id: string;
  generatedAt: number;
  validFor: number; // 有効期間（ミリ秒）
  items: RecommendationItem[];
  totalEstimatedCost: number;
  seasonalAdjustments: boolean;
  userPreferencesApplied: boolean;
  confidenceScore: number;
}

export interface ConsumptionForecast {
  productId: string;
  productName: string;
  forecastPeriod: number; // 予測期間（日）
  dailyConsumption: number[];
  weeklyConsumption: number[];
  monthlyConsumption: number[];
  seasonalAdjustments: Record<number, number>; // 季節別調整
  uncertainty: number; // 不確実性
  confidenceInterval: {
    lower: number[];
    upper: number[];
  };
}

export interface PredictionConfig {
  forecastHorizon: number; // 予測期間（日）
  confidenceThreshold: number;
  seasonalAdjustmentWeight: number;
  trendWeight: number;
  userPreferenceWeight: number;
  stockThreshold: number; // 在庫切れ予測しきい値
  enableSeasonalAdjustment: boolean;
  enableTrendAnalysis: boolean;
  enableUserLearning: boolean;
  maxRecommendations: number;
}

export interface UserPreferences {
  preferredBrands: Record<string, number>; // ブランド好み度
  dislikedProducts: string[];
  dietaryRestrictions: string[];
  budgetConstraints: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  shoppingFrequency: number; // 週あたりの買い物頻度
  preferredShoppingDays: number[]; // 好みの買い物曜日
  bulkBuyingPreference: number; // まとめ買い好み度 (0-1)
}

class PredictiveAlgorithmService {
  private predictions: Map<string, PredictionResult[]> = new Map();
  private userPreferences: UserPreferences | null = null;
  private isInitialized = false;
  
  private config: PredictionConfig = {
    forecastHorizon: 30,
    confidenceThreshold: 0.6,
    seasonalAdjustmentWeight: 0.3,
    trendWeight: 0.4,
    userPreferenceWeight: 0.3,
    stockThreshold: 0.2,
    enableSeasonalAdjustment: true,
    enableTrendAnalysis: true,
    enableUserLearning: true,
    maxRecommendations: 20,
  };

  constructor(
    private loggingService: LoggingService,
    private performanceMonitor: any
  ) {}

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🔮 Initializing Predictive Algorithm Service...');
    
    try {
      // ユーザー設定読み込み
      await this.loadUserPreferences();
      
      // 過去の予測結果読み込み
      await this.loadStoredPredictions();
      
      this.isInitialized = true;
      console.log('✅ Predictive Algorithm Service initialized');
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to initialize predictive algorithm service', error as Error);
      throw error;
    }
  }

  /**
   * 購入予測実行
   */
  async generatePurchasePredictions(): Promise<PredictionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.performanceMonitor.startTimer('purchasePrediction');
    
    try {
      console.log('🔮 Generating purchase predictions...');
      
      const patterns = usageAnalyticsEngine.getAllPatterns();
      const predictions: PredictionResult[] = [];
      
      for (const pattern of patterns) {
        const prediction = await this.predictPurchaseForProduct(pattern);
        if (prediction) {
          predictions.push(prediction);
        }
      }
      
      // 優先度でソート
      predictions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // 予測結果保存
      await this.savePredictions(predictions);
      
      console.log(`✅ Generated ${predictions.length} purchase predictions`);
      return predictions;
      
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to generate purchase predictions', error as Error);
      throw error;
    } finally {
      this.performanceMonitor.endTimer('purchasePrediction');
    }
  }

  /**
   * 特定製品の購入予測
   */
  private async predictPurchaseForProduct(pattern: ConsumptionPattern): Promise<PredictionResult | null> {
    // 最小データ要件チェック
    if (pattern.sampleSize < 3 || pattern.confidenceScore < this.config.confidenceThreshold) {
      return null;
    }

    const now = Date.now();
    const daysSinceLastPurchase = (now - pattern.lastPurchaseDate) / (1000 * 60 * 60 * 24);
    
    // 基本予測計算
    let predictedDate = pattern.nextPurchasePrediction;
    let confidence = pattern.confidenceScore;
    
    // 季節調整
    if (this.config.enableSeasonalAdjustment) {
      const seasonalAdjustment = this.calculateSeasonalAdjustment(pattern);
      predictedDate += seasonalAdjustment * this.config.seasonalAdjustmentWeight;
    }
    
    // トレンド調整
    if (this.config.enableTrendAnalysis) {
      const trendAdjustment = this.calculateTrendAdjustment(pattern);
      predictedDate += trendAdjustment * this.config.trendWeight;
    }
    
    // ユーザー好み調整
    if (this.config.enableUserLearning && this.userPreferences) {
      const userAdjustment = this.calculateUserPreferenceAdjustment(pattern);
      predictedDate += userAdjustment * this.config.userPreferenceWeight;
    }
    
    // 予測数量計算
    const predictedQuantity = this.calculatePredictedQuantity(pattern);
    
    // 推奨アクション決定
    const recommendedAction = this.determineRecommendedAction(predictedDate, daysSinceLastPurchase, pattern);
    
    // 優先度決定
    const priority = this.determinePriority(predictedDate, confidence, pattern);
    
    // 理由生成
    const reasons = this.generatePredictionReasons(pattern, predictedDate, recommendedAction);
    
    return {
      productId: pattern.productId,
      productName: pattern.productName,
      category: pattern.category,
      predictionType: 'purchase',
      predictedDate,
      predictedQuantity,
      confidence,
      reasons,
      basedOnPatterns: ['consumption_rate', 'purchase_frequency', 'seasonal_pattern'],
      recommendedAction,
      priority,
      seasonalFactor: this.config.enableSeasonalAdjustment ? this.calculateSeasonalFactor(pattern) : undefined,
      generatedAt: now,
      validUntil: now + (7 * 24 * 60 * 60 * 1000), // 1週間有効
      algorithmVersion: '1.0.0',
    };
  }

  /**
   * スマート買い物リスト生成
   */
  async generateSmartShoppingList(): Promise<SmartShoppingList> {
    console.log('🛒 Generating smart shopping list...');
    
    const predictions = await this.generatePurchasePredictions();
    const now = Date.now();
    const nextWeek = now + (7 * 24 * 60 * 60 * 1000);
    
    // 今後1週間に購入が必要な商品を抽出
    const urgentItems = predictions.filter(p => 
      p.predictedDate <= nextWeek && 
      p.recommendedAction !== 'none' &&
      p.confidence >= this.config.confidenceThreshold
    );
    
    const items: RecommendationItem[] = urgentItems.map(prediction => {
      const urgency = this.calculateUrgency(prediction.predictedDate, now);
      const reason = this.generateRecommendationReason(prediction);
      
      return {
        productId: prediction.productId,
        productName: prediction.productName,
        category: prediction.category,
        recommendedQuantity: prediction.predictedQuantity,
        urgency,
        reason,
        expectedConsumptionDate: prediction.predictedDate,
        confidence: prediction.confidence,
        estimatedCost: this.estimateProductCost(prediction.productId, prediction.predictedQuantity),
        alternatives: this.findAlternativeProducts(prediction.productId),
      };
    }).slice(0, this.config.maxRecommendations);
    
    // 総コスト計算
    const totalEstimatedCost = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    
    // 信頼度スコア計算
    const confidenceScore = items.length > 0 
      ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
      : 0;
    
    return {
      id: `shopping_list_${now}`,
      generatedAt: now,
      validFor: 7 * 24 * 60 * 60 * 1000, // 1週間
      items,
      totalEstimatedCost,
      seasonalAdjustments: this.config.enableSeasonalAdjustment,
      userPreferencesApplied: this.config.enableUserLearning && !!this.userPreferences,
      confidenceScore,
    };
  }

  /**
   * 消費予測実行
   */
  async generateConsumptionForecast(productId: string, forecastDays: number = 30): Promise<ConsumptionForecast | null> {
    const pattern = usageAnalyticsEngine.getConsumptionPattern(productId);
    
    if (!pattern || pattern.sampleSize < 3) {
      return null;
    }

    console.log(`📊 Generating consumption forecast for ${pattern.productName}`);
    
    // 日次消費予測
    const dailyConsumption = this.predictDailyConsumption(pattern, forecastDays);
    
    // 週次消費予測
    const weeklyConsumption = this.aggregateToWeekly(dailyConsumption);
    
    // 月次消費予測
    const monthlyConsumption = this.aggregateToMonthly(dailyConsumption);
    
    // 季節調整
    const seasonalAdjustments = this.calculateAllSeasonalAdjustments(pattern);
    
    // 不確実性計算
    const uncertainty = this.calculateForecastUncertainty(pattern, forecastDays);
    
    // 信頼区間計算
    const confidenceInterval = this.calculateConfidenceInterval(dailyConsumption, uncertainty);
    
    return {
      productId: pattern.productId,
      productName: pattern.productName,
      forecastPeriod: forecastDays,
      dailyConsumption,
      weeklyConsumption,
      monthlyConsumption,
      seasonalAdjustments,
      uncertainty,
      confidenceInterval,
    };
  }

  /**
   * 在庫切れ予測
   */
  async predictStockOut(productId: string, currentStock: number): Promise<PredictionResult | null> {
    const pattern = usageAnalyticsEngine.getConsumptionPattern(productId);
    
    if (!pattern || pattern.averageConsumptionRate <= 0) {
      return null;
    }

    // 在庫切れまでの日数計算
    const daysUntilStockOut = currentStock / pattern.averageConsumptionRate;
    const stockOutDate = Date.now() + (daysUntilStockOut * 24 * 60 * 60 * 1000);
    
    // 季節・トレンド調整
    let adjustedDate = stockOutDate;
    if (this.config.enableSeasonalAdjustment) {
      const seasonalFactor = this.calculateSeasonalFactor(pattern);
      adjustedDate = stockOutDate / seasonalFactor;
    }
    
    const confidence = Math.min(pattern.confidenceScore * 0.9, 0.95); // 在庫予測は少し控えめに
    
    return {
      productId: pattern.productId,
      productName: pattern.productName,
      category: pattern.category,
      predictionType: 'consumption',
      predictedDate: adjustedDate,
      predictedQuantity: 0, // 在庫切れ
      confidence,
      reasons: [
        `現在の在庫: ${currentStock}${pattern.category}`,
        `平均消費率: ${pattern.averageConsumptionRate.toFixed(2)}/日`,
        `予測在庫切れ: ${Math.ceil(daysUntilStockOut)}日後`,
      ],
      basedOnPatterns: ['consumption_rate', 'seasonal_pattern'],
      currentStock,
      recommendedAction: daysUntilStockOut <= 3 ? 'buy_now' : daysUntilStockOut <= 7 ? 'buy_soon' : 'monitor',
      priority: daysUntilStockOut <= 3 ? 'high' : daysUntilStockOut <= 7 ? 'medium' : 'low',
      generatedAt: Date.now(),
      validUntil: Date.now() + (24 * 60 * 60 * 1000), // 24時間有効
      algorithmVersion: '1.0.0',
    };
  }

  // === 計算メソッド ===

  /**
   * 季節調整計算
   */
  private calculateSeasonalAdjustment(pattern: ConsumptionPattern): number {
    const currentSeason = this.getCurrentSeason();
    const seasonalFactor = pattern.seasonalDistribution[currentSeason];
    const averageFactor = 0.25; // 均等分布
    
    // 季節要因による調整（日数）
    return (seasonalFactor - averageFactor) * 14; // 最大2週間の調整
  }

  /**
   * トレンド調整計算
   */
  private calculateTrendAdjustment(pattern: ConsumptionPattern): number {
    const trendMultiplier = {
      'increasing': -3, // 消費増加 → 早めに購入
      'decreasing': 3,  // 消費減少 → 遅めに購入
      'stable': 0,
    };
    
    return trendMultiplier[pattern.consumptionTrend] * 24 * 60 * 60 * 1000; // ミリ秒単位
  }

  /**
   * ユーザー好み調整計算
   */
  private calculateUserPreferenceAdjustment(pattern: ConsumptionPattern): number {
    if (!this.userPreferences) return 0;
    
    let adjustment = 0;
    
    // 嫌いな商品は購入を遅らせる
    if (this.userPreferences.dislikedProducts.includes(pattern.productId)) {
      adjustment += 7 * 24 * 60 * 60 * 1000; // 1週間遅らせる
    }
    
    // まとめ買い好みは購入頻度を下げる
    adjustment += this.userPreferences.bulkBuyingPreference * 3 * 24 * 60 * 60 * 1000;
    
    return adjustment;
  }

  /**
   * 予測数量計算
   */
  private calculatePredictedQuantity(pattern: ConsumptionPattern): number {
    let baseQuantity = pattern.averagePurchaseQuantity;
    
    // まとめ買い好みを考慮
    if (this.userPreferences?.bulkBuyingPreference) {
      baseQuantity *= (1 + this.userPreferences.bulkBuyingPreference);
    }
    
    // 季節要因を考慮
    const seasonalFactor = this.calculateSeasonalFactor(pattern);
    baseQuantity *= seasonalFactor;
    
    return Math.max(1, Math.round(baseQuantity));
  }

  /**
   * 推奨アクション決定
   */
  private determineRecommendedAction(
    predictedDate: number, 
    daysSinceLastPurchase: number, 
    pattern: ConsumptionPattern
  ): 'buy_now' | 'buy_soon' | 'monitor' | 'none' {
    const now = Date.now();
    const daysUntilPrediction = (predictedDate - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilPrediction <= 1) return 'buy_now';
    if (daysUntilPrediction <= 3) return 'buy_soon';
    if (daysUntilPrediction <= 7) return 'monitor';
    
    // 消費率が高い場合は早めに推奨
    if (pattern.averageConsumptionRate > 1.0 && daysUntilPrediction <= 5) {
      return 'buy_soon';
    }
    
    return 'none';
  }

  /**
   * 優先度決定
   */
  private determinePriority(predictedDate: number, confidence: number, pattern: ConsumptionPattern): 'high' | 'medium' | 'low' {
    const now = Date.now();
    const daysUntilPrediction = (predictedDate - now) / (1000 * 60 * 60 * 24);
    
    // 緊急度と信頼度を組み合わせ
    if (daysUntilPrediction <= 2 && confidence >= 0.8) return 'high';
    if (daysUntilPrediction <= 5 && confidence >= 0.7) return 'high';
    if (daysUntilPrediction <= 7 && confidence >= 0.6) return 'medium';
    if (daysUntilPrediction <= 14) return 'medium';
    
    return 'low';
  }

  /**
   * 予測理由生成
   */
  private generatePredictionReasons(
    pattern: ConsumptionPattern, 
    predictedDate: number, 
    action: string
  ): string[] {
    const reasons: string[] = [];
    const daysUntil = Math.ceil((predictedDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    reasons.push(`平均消費率: ${pattern.averageConsumptionRate.toFixed(2)}/日`);
    reasons.push(`購入頻度: ${pattern.purchaseFrequency.toFixed(2)}/日`);
    
    if (pattern.consumptionTrend !== 'stable') {
      reasons.push(`消費トレンド: ${pattern.consumptionTrend}`);
    }
    
    if (pattern.seasonalityStrength > 0.3) {
      reasons.push(`季節性あり (強度: ${(pattern.seasonalityStrength * 100).toFixed(0)}%)`);
    }
    
    reasons.push(`予測: ${daysUntil}日後に購入必要`);
    
    return reasons;
  }

  /**
   * 日次消費予測
   */
  private predictDailyConsumption(pattern: ConsumptionPattern, days: number): number[] {
    const dailyRate = pattern.averageConsumptionRate;
    const predictions: number[] = [];
    
    for (let day = 0; day < days; day++) {
      const date = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const season = this.getSeasonId(date);
      
      // 基本消費率
      let prediction = dailyRate;
      
      // 曜日調整
      const dayFactor = pattern.dailyDistribution[dayOfWeek] / (1/7); // 均等分布との比
      prediction *= dayFactor;
      
      // 季節調整
      const seasonFactor = pattern.seasonalDistribution[season] / 0.25; // 均等分布との比
      prediction *= seasonFactor;
      
      // ランダムノイズ（分散を考慮）
      const variance = pattern.consumptionVariance;
      const noise = (Math.random() - 0.5) * Math.sqrt(variance) * 0.5;
      prediction += noise;
      
      predictions.push(Math.max(0, prediction));
    }
    
    return predictions;
  }

  /**
   * 週次集計
   */
  private aggregateToWeekly(dailyData: number[]): number[] {
    const weekly: number[] = [];
    
    for (let week = 0; week < Math.ceil(dailyData.length / 7); week++) {
      const weekStart = week * 7;
      const weekEnd = Math.min(weekStart + 7, dailyData.length);
      const weekSum = dailyData.slice(weekStart, weekEnd).reduce((sum, val) => sum + val, 0);
      weekly.push(weekSum);
    }
    
    return weekly;
  }

  /**
   * 月次集計
   */
  private aggregateToMonthly(dailyData: number[]): number[] {
    const monthly: number[] = [];
    
    for (let month = 0; month < Math.ceil(dailyData.length / 30); month++) {
      const monthStart = month * 30;
      const monthEnd = Math.min(monthStart + 30, dailyData.length);
      const monthSum = dailyData.slice(monthStart, monthEnd).reduce((sum, val) => sum + val, 0);
      monthly.push(monthSum);
    }
    
    return monthly;
  }

  /**
   * 全季節調整計算
   */
  private calculateAllSeasonalAdjustments(pattern: ConsumptionPattern): Record<number, number> {
    const adjustments: Record<number, number> = {};
    
    for (let season = 0; season < 4; season++) {
      const seasonalFactor = pattern.seasonalDistribution[season] / 0.25;
      adjustments[season] = seasonalFactor;
    }
    
    return adjustments;
  }

  /**
   * 予測不確実性計算
   */
  private calculateForecastUncertainty(pattern: ConsumptionPattern, forecastDays: number): number {
    // データ品質による不確実性
    let uncertainty = 1 - pattern.dataQuality;
    
    // 予測期間による不確実性増加
    uncertainty += (forecastDays / 365) * 0.5;
    
    // 消費の変動による不確実性
    const cv = pattern.consumptionVariance / (pattern.averageConsumptionRate || 1);
    uncertainty += Math.min(cv, 0.5);
    
    return Math.min(uncertainty, 0.9);
  }

  /**
   * 信頼区間計算
   */
  private calculateConfidenceInterval(predictions: number[], uncertainty: number): { lower: number[]; upper: number[] } {
    const lower = predictions.map(pred => Math.max(0, pred * (1 - uncertainty)));
    const upper = predictions.map(pred => pred * (1 + uncertainty));
    
    return { lower, upper };
  }

  // === ヘルパーメソッド ===

  private getCurrentSeason(): number {
    return this.getSeasonId(new Date());
  }

  private getSeasonId(date: Date): number {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 0; // Spring
    if (month >= 5 && month <= 7) return 1; // Summer
    if (month >= 8 && month <= 10) return 2; // Fall
    return 3; // Winter
  }

  private calculateSeasonalFactor(pattern: ConsumptionPattern): number {
    const currentSeason = this.getCurrentSeason();
    return pattern.seasonalDistribution[currentSeason] / 0.25; // 均等分布との比
  }

  private calculateUrgency(predictedDate: number, now: number): 'urgent' | 'soon' | 'future' {
    const daysUntil = (predictedDate - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntil <= 2) return 'urgent';
    if (daysUntil <= 7) return 'soon';
    return 'future';
  }

  private generateRecommendationReason(prediction: PredictionResult): string {
    const daysUntil = Math.ceil((prediction.predictedDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (prediction.priority === 'high') {
      return `${daysUntil}日後に必要になる予定です。`;
    } else if (prediction.priority === 'medium') {
      return `${daysUntil}日後頃に購入を検討してください。`;
    }
    
    return `将来的に必要になる可能性があります。`;
  }

  private estimateProductCost(productId: string, quantity: number): number {
    // 実際の実装では価格データベースを参照
    // ここではモック価格を返す
    const mockPrices: Record<string, number> = {
      'default': 100,
    };
    
    const unitPrice = mockPrices[productId] || mockPrices['default'];
    return unitPrice * quantity;
  }

  private findAlternativeProducts(productId: string): Array<{ productId: string; productName: string; similarity: number; }> {
    // 実際の実装では商品類似度データを使用
    // ここではモックデータを返す
    return [];
  }

  // === データ管理 ===

  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('user_preferences');
      if (stored) {
        this.userPreferences = JSON.parse(stored);
      }
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to load user preferences', error as Error);
    }
  }

  private async loadStoredPredictions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('predictions');
      if (stored) {
        const predictionsArray = JSON.parse(stored);
        this.predictions = new Map(predictionsArray);
      }
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to load stored predictions', error as Error);
    }
  }

  private async savePredictions(predictions: PredictionResult[]): Promise<void> {
    try {
      this.predictions.set('latest', predictions);
      const predictionsArray = Array.from(this.predictions.entries());
      await AsyncStorage.setItem('predictions', JSON.stringify(predictionsArray));
    } catch (error) {
      this.loggingService.error(LogCategory.SYSTEM, 'Failed to save predictions', error as Error);
    }
  }

  // === 公開API ===

  /**
   * 最新の予測結果取得
   */
  getLatestPredictions(): PredictionResult[] {
    return this.predictions.get('latest') || [];
  }

  /**
   * 特定製品の予測取得
   */
  getPredictionForProduct(productId: string): PredictionResult | null {
    const latest = this.getLatestPredictions();
    return latest.find(p => p.productId === productId) || null;
  }

  /**
   * ユーザー設定更新
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    this.userPreferences = { ...this.userPreferences, ...preferences } as UserPreferences;
    await AsyncStorage.setItem('user_preferences', JSON.stringify(this.userPreferences));
    console.log('👤 User preferences updated');
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Prediction config updated:', this.config);
  }

  /**
   * 予測精度評価
   */
  async evaluatePredictionAccuracy(): Promise<{ accuracy: number; details: any }> {
    // 実際の実装では過去の予測と実際の結果を比較
    // ここではモック評価を返す
    return {
      accuracy: 0.85,
      details: {
        totalPredictions: 50,
        correctPredictions: 42,
        averageTimeDifference: 1.2, // 日
      },
    };
  }
}

export const predictiveAlgorithmService = new PredictiveAlgorithmService(
  new LoggingService(),
  performanceMonitor
);
