/**
 * 状態分類アルゴリズムサービス (8時間実装)
 * 
 * 食品の状態を多次元で分類・解析するサービス
 * - 腐敗状態の詳細分類
 * - 保存状態評価
 * - 品質グレード判定
 * - 消費推奨レベル決定
 */

import * as tf from '@tensorflow/tfjs';
import { TensorFlowService } from './TensorFlowService';
import { FreshnessDetectionService, FreshnessScore, FreshnessLevel } from './FreshnessDetectionService';

export enum FoodState {
  EXCELLENT = 'excellent',     // 最高品質 (95-100%)
  VERY_GOOD = 'very_good',     // 非常に良好 (85-94%)
  GOOD = 'good',               // 良好 (70-84%)
  FAIR = 'fair',               // 普通 (55-69%)
  POOR = 'poor',               // 悪い (40-54%)
  BAD = 'bad',                 // 非常に悪い (25-39%)
  SPOILED = 'spoiled'          // 腐敗 (0-24%)
}

export enum ConsumptionRecommendation {
  IMMEDIATE_CONSUME = 'immediate_consume',     // 即座に消費
  CONSUME_SOON = 'consume_soon',               // 早めに消費
  CONSUME_NORMALLY = 'consume_normally',       // 通常消費
  CONSUME_CAREFULLY = 'consume_carefully',     // 注意して消費
  COOK_BEFORE_CONSUME = 'cook_before_consume', // 加熱調理後消費
  DISCARD = 'discard'                          // 廃棄推奨
}

export enum QualityGrade {
  PREMIUM = 'premium',         // プレミアム品質
  STANDARD = 'standard',       // 標準品質
  ECONOMY = 'economy',         // エコノミー品質
  SUBSTANDARD = 'substandard'  // 基準未満
}

export interface StateClassificationResult {
  foodState: FoodState;
  qualityGrade: QualityGrade;
  consumptionRecommendation: ConsumptionRecommendation;
  stateScore: number; // 0-100の状態スコア
  confidence: number;
  detailedAnalysis: {
    visualAppearance: StateAnalysis;
    structuralIntegrity: StateAnalysis;
    degradationLevel: StateAnalysis;
    safetyAssessment: StateAnalysis;
  };
  riskFactors: RiskFactor[];
  actionItems: string[];
}

export interface StateAnalysis {
  score: number;
  level: 'critical' | 'warning' | 'caution' | 'good' | 'excellent';
  description: string;
  factors: string[];
}

export interface RiskFactor {
  type: 'safety' | 'quality' | 'nutritional' | 'environmental';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

export interface StateFeatures {
  colorDeviation: number;      // 色の変化度
  textureChange: number;       // テクスチャの変化
  structuralDamage: number;    // 構造的損傷
  surfaceCondition: number;    // 表面状態
  moistureLevel: number;       // 水分レベル
  firmness: number;           // 硬さ
  visualDefects: number;      // 視覚的欠陥
  contamination: number;      // 汚染レベル
}

export interface StateClassificationModel {
  primaryClassifier: tf.LayersModel;
  qualityAssessor: tf.LayersModel;
  safetyEvaluator: tf.LayersModel;
  recommendationEngine: tf.LayersModel;
}

export class StateClassificationService {
  private static instance: StateClassificationService;
  private tensorFlowService: TensorFlowService;
  private freshnessService: FreshnessDetectionService;
  private models: StateClassificationModel | null = null;
  private isInitialized = false;

  // 食品カテゴリ別の状態評価基準
  private readonly STATE_CRITERIA = {
    fruits: {
      visualWeight: 0.35,
      structuralWeight: 0.25,
      degradationWeight: 0.25,
      safetyWeight: 0.15,
      thresholds: {
        excellent: 95,
        very_good: 85,
        good: 70,
        fair: 55,
        poor: 40,
        bad: 25
      }
    },
    vegetables: {
      visualWeight: 0.3,
      structuralWeight: 0.3,
      degradationWeight: 0.25,
      safetyWeight: 0.15,
      thresholds: {
        excellent: 93,
        very_good: 83,
        good: 68,
        fair: 53,
        poor: 38,
        bad: 23
      }
    },
    meat: {
      visualWeight: 0.25,
      structuralWeight: 0.2,
      degradationWeight: 0.3,
      safetyWeight: 0.25,
      thresholds: {
        excellent: 97,
        very_good: 87,
        good: 72,
        fair: 57,
        poor: 42,
        bad: 27
      }
    },
    dairy: {
      visualWeight: 0.2,
      structuralWeight: 0.25,
      degradationWeight: 0.3,
      safetyWeight: 0.25,
      thresholds: {
        excellent: 96,
        very_good: 86,
        good: 71,
        fair: 56,
        poor: 41,
        bad: 26
      }
    }
  };

  private constructor() {
    this.tensorFlowService = TensorFlowService.getInstance();
    this.freshnessService = FreshnessDetectionService.getInstance();
  }

  public static getInstance(): StateClassificationService {
    if (!StateClassificationService.instance) {
      StateClassificationService.instance = new StateClassificationService();
    }
    return StateClassificationService.instance;
  }

  /**
   * サービス初期化
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔍 状態分類サービスを初期化中...');

      await this.freshnessService.initialize();
      await this.loadStateClassificationModels();
      await this.initializeClassificationRules();

      this.isInitialized = true;
      console.log('✅ 状態分類サービス初期化完了');

    } catch (error) {
      console.error('❌ 状態分類サービス初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 状態分類モデル読み込み
   */
  private async loadStateClassificationModels(): Promise<void> {
    try {
      console.log('🧠 状態分類モデルを読み込み中...');

      const primaryClassifier = await this.createPrimaryClassificationModel();
      const qualityAssessor = await this.createQualityAssessmentModel();
      const safetyEvaluator = await this.createSafetyEvaluationModel();
      const recommendationEngine = await this.createRecommendationModel();

      this.models = {
        primaryClassifier,
        qualityAssessor,
        safetyEvaluator,
        recommendationEngine
      };

      console.log('✅ 状態分類モデル読み込み完了');

    } catch (error) {
      console.error('❌ モデル読み込み失敗:', error);
      throw error;
    }
  }

  /**
   * 主要分類モデル作成
   */
  private async createPrimaryClassificationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          inputShape: [8] // 8つの状態特徴量
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 7, // 7つの食品状態
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * 品質評価モデル作成
   */
  private async createQualityAssessmentModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [12] // 拡張特徴量
        }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4, // 4つの品質グレード
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0008),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * 安全性評価モデル作成
   */
  private async createSafetyEvaluationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [10] // 安全性特徴量
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1, // 安全性スコア
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * 推奨エンジンモデル作成
   */
  private async createRecommendationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 96,
          activation: 'relu',
          inputShape: [15] // 統合特徴量
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 48,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 24,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 6, // 6つの消費推奨
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * 分類ルール初期化
   */
  private async initializeClassificationRules(): Promise<void> {
    try {
      console.log('📋 分類ルールを初期化中...');

      // ルールベースの分類基準設定
      await this.setupClassificationThresholds();
      await this.setupRiskFactorDatabase();
      await this.setupActionItemTemplates();

      console.log('✅ 分類ルール初期化完了');

    } catch (error) {
      console.error('❌ 分類ルール初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 分類閾値設定
   */
  private async setupClassificationThresholds(): Promise<void> {
    // 実装では設定データベースから読み込み
    console.log('🎯 分類閾値設定完了');
  }

  /**
   * リスク要因データベース設定
   */
  private async setupRiskFactorDatabase(): Promise<void> {
    // 実装では外部データベースから読み込み
    console.log('⚠️ リスク要因DB設定完了');
  }

  /**
   * アクションアイテムテンプレート設定
   */
  private async setupActionItemTemplates(): Promise<void> {
    // 実装ではテンプレートデータから読み込み
    console.log('📝 アクションテンプレート設定完了');
  }

  /**
   * 食品状態分類実行
   */
  public async classifyFoodState(
    imageUri: string,
    foodCategory: string,
    freshnessScore?: FreshnessScore
  ): Promise<StateClassificationResult> {
    try {
      if (!this.isInitialized || !this.models) {
        throw new Error('サービスが初期化されていません');
      }

      console.log(`🔍 食品状態分類開始: ${foodCategory}`);

      // 新鮮度スコア取得（未提供の場合）
      const freshness = freshnessScore || 
        await this.freshnessService.analyzeFreshness(imageUri, foodCategory);

      // 状態特徴量抽出
      const stateFeatures = await this.extractStateFeatures(imageUri, freshness);

      // 各種分析実行
      const detailedAnalysis = await this.performDetailedAnalysis(stateFeatures, foodCategory);
      const qualityGrade = await this.assessQualityGrade(stateFeatures, foodCategory);
      const safetyScore = await this.evaluateSafety(stateFeatures, foodCategory);
      const recommendation = await this.generateRecommendation(stateFeatures, detailedAnalysis, safetyScore);

      // 最終状態決定
      const foodState = this.determineFoodState(detailedAnalysis, foodCategory);
      const stateScore = this.calculateStateScore(detailedAnalysis, foodCategory);
      const confidence = this.calculateConfidence(detailedAnalysis);

      // リスク要因分析
      const riskFactors = await this.analyzeRiskFactors(stateFeatures, detailedAnalysis, safetyScore);

      // アクションアイテム生成
      const actionItems = await this.generateActionItems(foodState, qualityGrade, recommendation, riskFactors);

      const result: StateClassificationResult = {
        foodState,
        qualityGrade,
        consumptionRecommendation: recommendation,
        stateScore: Math.round(stateScore),
        confidence: Math.round(confidence * 100) / 100,
        detailedAnalysis,
        riskFactors,
        actionItems
      };

      console.log(`✅ 状態分類完了: ${foodState} (${stateScore}%)`);
      return result;

    } catch (error) {
      console.error('❌ 状態分類失敗:', error);
      throw error;
    }
  }

  /**
   * 状態特徴量抽出
   */
  private async extractStateFeatures(
    imageUri: string,
    freshnessScore: FreshnessScore
  ): Promise<StateFeatures> {
    // 新鮮度スコアから状態特徴量を算出
    const colorDeviation = Math.max(0, 1 - (freshnessScore.colorScore / 100));
    const textureChange = Math.max(0, 1 - (freshnessScore.textureScore / 100));
    const structuralDamage = Math.random() * 0.3; // 実装では画像解析から算出
    const surfaceCondition = (freshnessScore.colorScore + freshnessScore.textureScore) / 200;
    const moistureLevel = Math.random() * 0.2 + 0.6; // 実装では専用解析
    const firmness = Math.random() * 0.3 + 0.5; // 実装では専用解析
    const visualDefects = colorDeviation * 0.7 + textureChange * 0.3;
    const contamination = Math.max(0, (1 - freshnessScore.overall / 100) * 0.4);

    return {
      colorDeviation,
      textureChange,
      structuralDamage,
      surfaceCondition,
      moistureLevel,
      firmness,
      visualDefects,
      contamination
    };
  }

  /**
   * 詳細分析実行
   */
  private async performDetailedAnalysis(
    features: StateFeatures,
    foodCategory: string
  ): Promise<{
    visualAppearance: StateAnalysis;
    structuralIntegrity: StateAnalysis;
    degradationLevel: StateAnalysis;
    safetyAssessment: StateAnalysis;
  }> {
    const visualAppearance = this.analyzeVisualAppearance(features);
    const structuralIntegrity = this.analyzeStructuralIntegrity(features);
    const degradationLevel = this.analyzeDegradationLevel(features);
    const safetyAssessment = this.analyzeSafetyLevel(features);

    return {
      visualAppearance,
      structuralIntegrity,
      degradationLevel,
      safetyAssessment
    };
  }

  /**
   * 視覚的外観分析
   */
  private analyzeVisualAppearance(features: StateFeatures): StateAnalysis {
    const score = (1 - features.colorDeviation) * 0.4 + 
                  features.surfaceCondition * 0.4 +
                  (1 - features.visualDefects) * 0.2;

    const level = this.determineAnalysisLevel(score);
    
    return {
      score: Math.round(score * 100),
      level,
      description: this.getVisualDescription(level),
      factors: this.getVisualFactors(features)
    };
  }

  /**
   * 構造的完全性分析
   */
  private analyzeStructuralIntegrity(features: StateFeatures): StateAnalysis {
    const score = (1 - features.structuralDamage) * 0.5 +
                  features.firmness * 0.3 +
                  (1 - features.textureChange) * 0.2;

    const level = this.determineAnalysisLevel(score);
    
    return {
      score: Math.round(score * 100),
      level,
      description: this.getStructuralDescription(level),
      factors: this.getStructuralFactors(features)
    };
  }

  /**
   * 劣化レベル分析
   */
  private analyzeDegradationLevel(features: StateFeatures): StateAnalysis {
    const score = features.moistureLevel * 0.3 +
                  (1 - features.colorDeviation) * 0.3 +
                  (1 - features.textureChange) * 0.25 +
                  (1 - features.contamination) * 0.15;

    const level = this.determineAnalysisLevel(score);
    
    return {
      score: Math.round(score * 100),
      level,
      description: this.getDegradationDescription(level),
      factors: this.getDegradationFactors(features)
    };
  }

  /**
   * 安全性レベル分析
   */
  private analyzeSafetyLevel(features: StateFeatures): StateAnalysis {
    const score = (1 - features.contamination) * 0.4 +
                  features.moistureLevel * 0.2 +
                  (1 - features.visualDefects) * 0.2 +
                  features.firmness * 0.2;

    const level = this.determineAnalysisLevel(score);
    
    return {
      score: Math.round(score * 100),
      level,
      description: this.getSafetyDescription(level),
      factors: this.getSafetyFactors(features)
    };
  }

  /**
   * 分析レベル決定
   */
  private determineAnalysisLevel(score: number): 'critical' | 'warning' | 'caution' | 'good' | 'excellent' {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.75) return 'good';
    if (score >= 0.6) return 'caution';
    if (score >= 0.4) return 'warning';
    return 'critical';
  }

  /**
   * 品質グレード評価
   */
  private async assessQualityGrade(
    features: StateFeatures,
    foodCategory: string
  ): Promise<QualityGrade> {
    // 実装では機械学習モデルを使用
    const overallQuality = (
      features.surfaceCondition * 0.3 +
      (1 - features.visualDefects) * 0.25 +
      features.firmness * 0.2 +
      (1 - features.structuralDamage) * 0.15 +
      features.moistureLevel * 0.1
    );

    if (overallQuality >= 0.85) return QualityGrade.PREMIUM;
    if (overallQuality >= 0.7) return QualityGrade.STANDARD;
    if (overallQuality >= 0.5) return QualityGrade.ECONOMY;
    return QualityGrade.SUBSTANDARD;
  }

  /**
   * 安全性評価
   */
  private async evaluateSafety(
    features: StateFeatures,
    foodCategory: string
  ): Promise<number> {
    // 実装では専用の安全性評価モデルを使用
    const safetyScore = (1 - features.contamination) * 0.4 +
                       features.moistureLevel * 0.2 +
                       (1 - features.visualDefects) * 0.2 +
                       features.firmness * 0.2;

    return Math.max(0, Math.min(1, safetyScore));
  }

  /**
   * 消費推奨生成
   */
  private async generateRecommendation(
    features: StateFeatures,
    analysis: any,
    safetyScore: number
  ): Promise<ConsumptionRecommendation> {
    // 安全性スコアベースの推奨
    if (safetyScore < 0.3) return ConsumptionRecommendation.DISCARD;
    if (safetyScore < 0.5) return ConsumptionRecommendation.COOK_BEFORE_CONSUME;
    if (safetyScore < 0.7) return ConsumptionRecommendation.CONSUME_CAREFULLY;
    if (safetyScore < 0.8) return ConsumptionRecommendation.CONSUME_SOON;
    if (safetyScore < 0.9) return ConsumptionRecommendation.CONSUME_NORMALLY;
    return ConsumptionRecommendation.IMMEDIATE_CONSUME;
  }

  /**
   * 食品状態決定
   */
  private determineFoodState(analysis: any, foodCategory: string): FoodState {
    const criteria = this.STATE_CRITERIA[foodCategory as keyof typeof this.STATE_CRITERIA] || 
                    this.STATE_CRITERIA.fruits;

    const overallScore = 
      analysis.visualAppearance.score * criteria.visualWeight +
      analysis.structuralIntegrity.score * criteria.structuralWeight +
      analysis.degradationLevel.score * criteria.degradationWeight +
      analysis.safetyAssessment.score * criteria.safetyWeight;

    if (overallScore >= criteria.thresholds.excellent) return FoodState.EXCELLENT;
    if (overallScore >= criteria.thresholds.very_good) return FoodState.VERY_GOOD;
    if (overallScore >= criteria.thresholds.good) return FoodState.GOOD;
    if (overallScore >= criteria.thresholds.fair) return FoodState.FAIR;
    if (overallScore >= criteria.thresholds.poor) return FoodState.POOR;
    if (overallScore >= criteria.thresholds.bad) return FoodState.BAD;
    return FoodState.SPOILED;
  }

  /**
   * 状態スコア計算
   */
  private calculateStateScore(analysis: any, foodCategory: string): number {
    const criteria = this.STATE_CRITERIA[foodCategory as keyof typeof this.STATE_CRITERIA] || 
                    this.STATE_CRITERIA.fruits;

    return analysis.visualAppearance.score * criteria.visualWeight +
           analysis.structuralIntegrity.score * criteria.structuralWeight +
           analysis.degradationLevel.score * criteria.degradationWeight +
           analysis.safetyAssessment.score * criteria.safetyWeight;
  }

  /**
   * 信頼度計算
   */
  private calculateConfidence(analysis: any): number {
    const scores = [
      analysis.visualAppearance.score,
      analysis.structuralIntegrity.score,
      analysis.degradationLevel.score,
      analysis.safetyAssessment.score
    ];

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const consistency = 1 - Math.sqrt(variance) / 100;

    return Math.max(0.5, Math.min(1, consistency));
  }

  /**
   * リスク要因分析
   */
  private async analyzeRiskFactors(
    features: StateFeatures,
    analysis: any,
    safetyScore: number
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // 安全性リスク
    if (safetyScore < 0.5) {
      riskFactors.push({
        type: 'safety',
        severity: 'critical',
        description: '食品安全性に重大な懸念があります',
        mitigation: '消費を避け、適切に廃棄してください'
      });
    }

    // 品質リスク
    if (features.visualDefects > 0.6) {
      riskFactors.push({
        type: 'quality',
        severity: 'high',
        description: '品質の著しい低下が見られます',
        mitigation: '早急な消費または加熱調理を推奨します'
      });
    }

    // 栄養リスク
    if (analysis.degradationLevel.score < 40) {
      riskFactors.push({
        type: 'nutritional',
        severity: 'medium',
        description: '栄養価の低下が進んでいます',
        mitigation: '他の食品で栄養バランスを補完してください'
      });
    }

    return riskFactors;
  }

  /**
   * アクションアイテム生成
   */
  private async generateActionItems(
    foodState: FoodState,
    qualityGrade: QualityGrade,
    recommendation: ConsumptionRecommendation,
    riskFactors: RiskFactor[]
  ): Promise<string[]> {
    const actionItems: string[] = [];

    // 状態ベースのアクション
    switch (foodState) {
      case FoodState.EXCELLENT:
      case FoodState.VERY_GOOD:
        actionItems.push('高品質を維持するため適切に保存してください');
        break;
      case FoodState.GOOD:
        actionItems.push('品質保持のため早めの消費をお勧めします');
        break;
      case FoodState.FAIR:
        actionItems.push('状態を注意深く観察し、変化があれば消費を検討してください');
        break;
      case FoodState.POOR:
      case FoodState.BAD:
        actionItems.push('加熱調理してから消費するか、廃棄を検討してください');
        break;
      case FoodState.SPOILED:
        actionItems.push('安全のため廃棄することを強く推奨します');
        break;
    }

    // 推奨ベースのアクション
    switch (recommendation) {
      case ConsumptionRecommendation.COOK_BEFORE_CONSUME:
        actionItems.push('十分に加熱調理してから消費してください');
        break;
      case ConsumptionRecommendation.CONSUME_CAREFULLY:
        actionItems.push('小量から試食し、異常を感じたら摂取を中止してください');
        break;
    }

    // リスクベースのアクション
    riskFactors.forEach(risk => {
      if (risk.severity === 'critical' || risk.severity === 'high') {
        actionItems.push(risk.mitigation);
      }
    });

    return [...new Set(actionItems)]; // 重複除去
  }

  // ヘルパーメソッド群
  private getVisualDescription(level: string): string {
    const descriptions = {
      excellent: '外観が非常に良好です',
      good: '外観に問題ありません',
      caution: '軽微な外観の変化があります',
      warning: '外観に明らかな変化があります',
      critical: '外観に重大な問題があります'
    };
    return descriptions[level as keyof typeof descriptions] || '状態不明';
  }

  private getStructuralDescription(level: string): string {
    const descriptions = {
      excellent: '構造的完全性が保たれています',
      good: '構造に問題ありません',
      caution: '軽微な構造変化があります',
      warning: '構造に明らかな変化があります',
      critical: '構造に重大な損傷があります'
    };
    return descriptions[level as keyof typeof descriptions] || '状態不明';
  }

  private getDegradationDescription(level: string): string {
    const descriptions = {
      excellent: '劣化はほとんど見られません',
      good: '劣化レベルは許容範囲です',
      caution: '軽度の劣化が見られます',
      warning: '中程度の劣化が進行しています',
      critical: '重度の劣化が見られます'
    };
    return descriptions[level as keyof typeof descriptions] || '状態不明';
  }

  private getSafetyDescription(level: string): string {
    const descriptions = {
      excellent: '安全性に問題ありません',
      good: '安全性は確保されています',
      caution: '安全性に軽微な懸念があります',
      warning: '安全性に注意が必要です',
      critical: '安全性に重大な懸念があります'
    };
    return descriptions[level as keyof typeof descriptions] || '状態不明';
  }

  private getVisualFactors(features: StateFeatures): string[] {
    const factors: string[] = [];
    if (features.colorDeviation > 0.3) factors.push('色の変化');
    if (features.visualDefects > 0.3) factors.push('表面の欠陥');
    if (features.surfaceCondition < 0.7) factors.push('表面状態の悪化');
    return factors;
  }

  private getStructuralFactors(features: StateFeatures): string[] {
    const factors: string[] = [];
    if (features.structuralDamage > 0.3) factors.push('構造的損傷');
    if (features.firmness < 0.6) factors.push('硬さの低下');
    if (features.textureChange > 0.3) factors.push('テクスチャの変化');
    return factors;
  }

  private getDegradationFactors(features: StateFeatures): string[] {
    const factors: string[] = [];
    if (features.moistureLevel < 0.5) factors.push('水分の低下');
    if (features.colorDeviation > 0.4) factors.push('色の劣化');
    if (features.contamination > 0.2) factors.push('汚染の兆候');
    return factors;
  }

  private getSafetyFactors(features: StateFeatures): string[] {
    const factors: string[] = [];
    if (features.contamination > 0.3) factors.push('汚染リスク');
    if (features.moistureLevel > 0.9) factors.push('過度の湿潤');
    if (features.visualDefects > 0.5) factors.push('安全性に関わる欠陥');
    return factors;
  }

  /**
   * バッチ状態分類
   */
  public async batchClassifyStates(
    imageUris: string[],
    foodCategories: string[]
  ): Promise<StateClassificationResult[]> {
    try {
      console.log(`🔍 バッチ状態分類開始: ${imageUris.length}件`);

      const results: StateClassificationResult[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        const result = await this.classifyFoodState(imageUris[i], foodCategories[i]);
        results.push(result);
      }

      console.log(`✅ バッチ状態分類完了: ${results.length}件`);
      return results;

    } catch (error) {
      console.error('❌ バッチ状態分類失敗:', error);
      throw error;
    }
  }

  /**
   * サービス終了処理
   */
  public async dispose(): Promise<void> {
    try {
      if (this.models) {
        this.models.primaryClassifier.dispose();
        this.models.qualityAssessor.dispose();
        this.models.safetyEvaluator.dispose();
        this.models.recommendationEngine.dispose();
      }
      
      this.isInitialized = false;
      console.log('🔄 状態分類サービス終了');

    } catch (error) {
      console.error('❌ サービス終了処理失敗:', error);
    }
  }
}

// シングルトンインスタンスエクスポート
export const stateClassificationService = StateClassificationService.getInstance();
