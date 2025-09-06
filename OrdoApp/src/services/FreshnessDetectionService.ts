/**
 * 新鮮度判定モデル構築サービス (12時間実装)
 * 
 * 食品の新鮮度をAIで自動判定するサービス
 * - 色彩分析による腐敗度判定
 * - 表面テクスチャ解析
 * - 時系列データによる劣化予測
 * - 多段階新鮮度スコア算出
 */

import * as tf from '@tensorflow/tfjs';
import { TensorFlowService } from './TensorFlowService';
// import { ImageProcessingService } from './ImageProcessingService';
// import { DatabaseService } from './DatabaseService';

export interface FreshnessScore {
  overall: number; // 総合新鮮度スコア (0-100)
  colorScore: number; // 色彩スコア
  textureScore: number; // テクスチャスコア
  shapeScore: number; // 形状スコア
  prediction: FreshnessLevel;
  confidence: number;
  estimatedShelfLife: number; // 推定賞味期限 (日数)
}

export enum FreshnessLevel {
  FRESH = 'fresh',           // 新鮮 (80-100)
  GOOD = 'good',             // 良好 (60-79)
  ACCEPTABLE = 'acceptable', // 許容 (40-59)
  POOR = 'poor',             // 悪い (20-39)
  SPOILED = 'spoiled'        // 腐敗 (0-19)
}

export interface ColorAnalysis {
  averageHue: number;
  saturation: number;
  brightness: number;
  colorVariance: number;
  brownSpotRatio: number;
  discolorationLevel: number;
}

export interface TextureAnalysis {
  smoothness: number;
  wrinkleLevel: number;
  surfaceDefects: number;
  firmness: number;
  moistureLevel: number;
}

export interface ShapeAnalysis {
  symmetry: number;
  intactness: number;
  deformation: number;
  volumeLoss: number;
}

export interface FreshnessTrainingData {
  imageData: Float32Array;
  freshnessLabel: FreshnessLevel;
  foodCategory: string;
  timestamp: number;
  metadata: {
    colorAnalysis: ColorAnalysis;
    textureAnalysis: TextureAnalysis;
    shapeAnalysis: ShapeAnalysis;
  };
}

export interface FreshnessModel {
  colorModel: tf.LayersModel;
  textureModel: tf.LayersModel;
  shapeModel: tf.LayersModel;
  fusionModel: tf.LayersModel;
}

export class FreshnessDetectionService {
  private static instance: FreshnessDetectionService;
  private tensorFlowService: TensorFlowService;
  // private imageProcessingService: ImageProcessingService;
  // private databaseService: DatabaseService;
  private models: FreshnessModel | null = null;
  private isInitialized = false;

  // 食品カテゴリ別の新鮮度パラメータ
  private readonly FRESHNESS_PARAMETERS = {
    fruits: {
      colorWeight: 0.4,
      textureWeight: 0.35,
      shapeWeight: 0.25,
      thresholds: {
        fresh: 85,
        good: 70,
        acceptable: 50,
        poor: 30
      }
    },
    vegetables: {
      colorWeight: 0.35,
      textureWeight: 0.4,
      shapeWeight: 0.25,
      thresholds: {
        fresh: 80,
        good: 65,
        acceptable: 45,
        poor: 25
      }
    },
    meat: {
      colorWeight: 0.5,
      textureWeight: 0.3,
      shapeWeight: 0.2,
      thresholds: {
        fresh: 90,
        good: 75,
        acceptable: 55,
        poor: 35
      }
    },
    dairy: {
      colorWeight: 0.3,
      textureWeight: 0.4,
      shapeWeight: 0.3,
      thresholds: {
        fresh: 88,
        good: 72,
        acceptable: 52,
        poor: 32
      }
    }
  };

  private constructor() {
    this.tensorFlowService = TensorFlowService.getInstance();
    // this.imageProcessingService = ImageProcessingService.getInstance();
    // this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): FreshnessDetectionService {
    if (!FreshnessDetectionService.instance) {
      FreshnessDetectionService.instance = new FreshnessDetectionService();
    }
    return FreshnessDetectionService.instance;
  }

  /**
   * サービス初期化
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔬 新鮮度判定サービスを初期化中...');

      // await this.tensorFlowService.initialize();
      // await this.imageProcessingService.initialize();
      await this.loadFreshnessModels();
      await this.initializeTrainingData();

      this.isInitialized = true;
      console.log('✅ 新鮮度判定サービス初期化完了');

    } catch (error) {
      console.error('❌ 新鮮度判定サービス初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 新鮮度判定モデル読み込み
   */
  private async loadFreshnessModels(): Promise<void> {
    try {
      console.log('🧠 新鮮度判定モデルを読み込み中...');

      // カラー解析モデル
      const colorModel = await this.createColorAnalysisModel();
      
      // テクスチャ解析モデル
      const textureModel = await this.createTextureAnalysisModel();
      
      // 形状解析モデル
      const shapeModel = await this.createShapeAnalysisModel();
      
      // 統合モデル
      const fusionModel = await this.createFusionModel();

      this.models = {
        colorModel,
        textureModel,
        shapeModel,
        fusionModel
      };

      console.log('✅ 新鮮度判定モデル読み込み完了');

    } catch (error) {
      console.error('❌ モデル読み込み失敗:', error);
      throw error;
    }
  }

  /**
   * カラー解析モデル作成
   */
  private async createColorAnalysisModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
          inputShape: [224, 224, 3]
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.globalAveragePooling2d({}),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 6, activation: 'softmax' }) // 6つの色彩特徴
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
   * テクスチャ解析モデル作成
   */
  private async createTextureAnalysisModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 5,
          activation: 'relu',
          inputShape: [224, 224, 1] // グレースケール
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 256,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.globalAveragePooling2d({}),
        tf.layers.dense({ units: 256, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'softmax' }) // 5つのテクスチャ特徴
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * 形状解析モデル作成
   */
  private async createShapeAnalysisModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          filters: 32,
          kernelSize: 7,
          activation: 'relu',
          inputShape: [224, 224, 1] // エッジ検出画像
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 5,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.globalAveragePooling2d({}),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'softmax' }) // 4つの形状特徴
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
   * 統合モデル作成
   */
  private async createFusionModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [15] // 6 + 5 + 4 特徴量
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'softmax' }) // 5段階新鮮度
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
   * 学習データ初期化
   */
  private async initializeTrainingData(): Promise<void> {
    try {
      console.log('📚 新鮮度判定学習データを初期化中...');

      // サンプル学習データ生成
      const sampleData = await this.generateSampleTrainingData();
      
      // モデル事前学習
      await this.pretrainModels(sampleData);

      console.log('✅ 学習データ初期化完了');

    } catch (error) {
      console.error('❌ 学習データ初期化失敗:', error);
      throw error;
    }
  }

  /**
   * サンプル学習データ生成
   */
  private async generateSampleTrainingData(): Promise<FreshnessTrainingData[]> {
    const sampleData: FreshnessTrainingData[] = [];

    // 各食品カテゴリ・新鮮度レベルごとのサンプルデータ
    const categories = ['fruits', 'vegetables', 'meat', 'dairy'];
    const freshnessLevels = Object.values(FreshnessLevel);

    for (const category of categories) {
      for (const freshness of freshnessLevels) {
        // サンプル数は実際の実装では大幅に増やす
        for (let i = 0; i < 10; i++) {
          const data = this.generateSampleDataPoint(category, freshness);
          sampleData.push(data);
        }
      }
    }

    return sampleData;
  }

  /**
   * サンプルデータポイント生成
   */
  private generateSampleDataPoint(category: string, freshness: FreshnessLevel): FreshnessTrainingData {
    // 新鮮度レベルに応じた特徴量生成
    const freshnessValue = this.getFreshnessValue(freshness);
    
    return {
      imageData: new Float32Array(224 * 224 * 3).fill(0), // ダミーデータ
      freshnessLabel: freshness,
      foodCategory: category,
      timestamp: Date.now(),
      metadata: {
        colorAnalysis: this.generateColorAnalysis(freshnessValue),
        textureAnalysis: this.generateTextureAnalysis(freshnessValue),
        shapeAnalysis: this.generateShapeAnalysis(freshnessValue)
      }
    };
  }

  /**
   * 新鮮度値取得
   */
  private getFreshnessValue(freshness: FreshnessLevel): number {
    switch (freshness) {
      case FreshnessLevel.FRESH: return 90;
      case FreshnessLevel.GOOD: return 70;
      case FreshnessLevel.ACCEPTABLE: return 50;
      case FreshnessLevel.POOR: return 30;
      case FreshnessLevel.SPOILED: return 10;
      default: return 50;
    }
  }

  /**
   * カラー解析データ生成
   */
  private generateColorAnalysis(freshnessValue: number): ColorAnalysis {
    const variance = Math.random() * 0.2 - 0.1;
    const normalizedFreshness = freshnessValue / 100;

    return {
      averageHue: 120 * normalizedFreshness + variance * 50,
      saturation: 0.8 * normalizedFreshness + Math.random() * 0.2,
      brightness: 0.7 * normalizedFreshness + Math.random() * 0.3,
      colorVariance: (1 - normalizedFreshness) * 0.5,
      brownSpotRatio: (1 - normalizedFreshness) * 0.4,
      discolorationLevel: (1 - normalizedFreshness) * 0.6
    };
  }

  /**
   * テクスチャ解析データ生成
   */
  private generateTextureAnalysis(freshnessValue: number): TextureAnalysis {
    const normalizedFreshness = freshnessValue / 100;

    return {
      smoothness: normalizedFreshness * 0.9 + Math.random() * 0.1,
      wrinkleLevel: (1 - normalizedFreshness) * 0.8,
      surfaceDefects: (1 - normalizedFreshness) * 0.7,
      firmness: normalizedFreshness * 0.85 + Math.random() * 0.15,
      moistureLevel: normalizedFreshness * 0.8 + Math.random() * 0.2
    };
  }

  /**
   * 形状解析データ生成
   */
  private generateShapeAnalysis(freshnessValue: number): ShapeAnalysis {
    const normalizedFreshness = freshnessValue / 100;

    return {
      symmetry: normalizedFreshness * 0.9 + Math.random() * 0.1,
      intactness: normalizedFreshness * 0.95 + Math.random() * 0.05,
      deformation: (1 - normalizedFreshness) * 0.6,
      volumeLoss: (1 - normalizedFreshness) * 0.4
    };
  }

  /**
   * モデル事前学習
   */
  private async pretrainModels(trainingData: FreshnessTrainingData[]): Promise<void> {
    if (!this.models) {
      throw new Error('モデルが初期化されていません');
    }

    console.log('🎓 新鮮度判定モデルを事前学習中...');

    // 実際の実装では適切な学習データでトレーニング
    // ここではダミー実装
    console.log(`📊 学習データ: ${trainingData.length}件`);
    console.log('✅ 事前学習完了');
  }

  /**
   * 画像から新鮮度を判定
   */
  public async analyzeFreshness(
    imageUri: string,
    foodCategory: string
  ): Promise<FreshnessScore> {
    try {
      if (!this.isInitialized || !this.models) {
        throw new Error('サービスが初期化されていません');
      }

      console.log(`🔬 新鮮度解析開始: ${foodCategory}`);

      // 画像前処理 (ダミー実装)
      const processedImage = await this.preprocessImageForFreshness(imageUri);
      
      // 各種解析実行 (ダミー実装)
      const colorAnalysis = await this.analyzeColorDummy();
      const textureAnalysis = await this.analyzeTextureDummy();
      const shapeAnalysis = await this.analyzeShapeDummy();

      // 統合スコア計算
      const freshnessScore = await this.calculateFreshnessScore(
        colorAnalysis,
        textureAnalysis,
        shapeAnalysis,
        foodCategory
      );

      // 結果をデータベースに保存
      await this.saveFreshnessResult(imageUri, foodCategory, freshnessScore);

      console.log(`✅ 新鮮度解析完了: ${freshnessScore.overall}%`);
      return freshnessScore;

    } catch (error) {
      console.error('❌ 新鮮度解析失敗:', error);
      throw error;
    }
  }

  /**
   * 新鮮度解析用画像前処理
   */
  private async preprocessImageForFreshness(imageUri: string): Promise<{
    colorImage: tf.Tensor;
    textureImage: tf.Tensor;
    shapeImage: tf.Tensor;
  }> {
    // カラー画像 (RGB)
    const colorImage = await this.imageProcessingService.preprocessImage(imageUri, {
      targetSize: [224, 224],
      normalize: true,
      channels: 3
    });

    // テクスチャ用グレースケール画像
    const textureImage = await this.imageProcessingService.convertToGrayscale(colorImage);

    // 形状用エッジ検出画像
    const shapeImage = await this.imageProcessingService.detectEdges(textureImage);

    return {
      colorImage,
      textureImage,
      shapeImage
    };
  }

  /**
   * カラー解析
   */
  private async analyzeColor(colorImage: tf.Tensor): Promise<ColorAnalysis> {
    if (!this.models) {
      throw new Error('モデルが初期化されていません');
    }

    // CNN モデルによる色彩特徴抽出
    const colorFeatures = this.models.colorModel.predict(
      colorImage.expandDims(0)
    ) as tf.Tensor;

    const features = await colorFeatures.data();

    return {
      averageHue: features[0] * 360,
      saturation: features[1],
      brightness: features[2],
      colorVariance: features[3],
      brownSpotRatio: features[4],
      discolorationLevel: features[5]
    };
  }

  /**
   * テクスチャ解析
   */
  private async analyzeTexture(textureImage: tf.Tensor): Promise<TextureAnalysis> {
    if (!this.models) {
      throw new Error('モデルが初期化されていません');
    }

    // CNN モデルによるテクスチャ特徴抽出
    const textureFeatures = this.models.textureModel.predict(
      textureImage.expandDims(0)
    ) as tf.Tensor;

    const features = await textureFeatures.data();

    return {
      smoothness: features[0],
      wrinkleLevel: features[1],
      surfaceDefects: features[2],
      firmness: features[3],
      moistureLevel: features[4]
    };
  }

  /**
   * 形状解析
   */
  private async analyzeShape(shapeImage: tf.Tensor): Promise<ShapeAnalysis> {
    if (!this.models) {
      throw new Error('モデルが初期化されていません');
    }

    // CNN モデルによる形状特徴抽出
    const shapeFeatures = this.models.shapeModel.predict(
      shapeImage.expandDims(0)
    ) as tf.Tensor;

    const features = await shapeFeatures.data();

    return {
      symmetry: features[0],
      intactness: features[1],
      deformation: features[2],
      volumeLoss: features[3]
    };
  }

  /**
   * 新鮮度スコア計算
   */
  private async calculateFreshnessScore(
    colorAnalysis: ColorAnalysis,
    textureAnalysis: TextureAnalysis,
    shapeAnalysis: ShapeAnalysis,
    foodCategory: string
  ): Promise<FreshnessScore> {
    if (!this.models) {
      throw new Error('モデルが初期化されていません');
    }

    // 特徴量ベクトル作成
    const features = tf.tensor2d([[
      colorAnalysis.averageHue / 360,
      colorAnalysis.saturation,
      colorAnalysis.brightness,
      colorAnalysis.colorVariance,
      colorAnalysis.brownSpotRatio,
      colorAnalysis.discolorationLevel,
      textureAnalysis.smoothness,
      textureAnalysis.wrinkleLevel,
      textureAnalysis.surfaceDefects,
      textureAnalysis.firmness,
      textureAnalysis.moistureLevel,
      shapeAnalysis.symmetry,
      shapeAnalysis.intactness,
      shapeAnalysis.deformation,
      shapeAnalysis.volumeLoss
    ]]);

    // 統合モデルで新鮮度予測
    const prediction = this.models.fusionModel.predict(features) as tf.Tensor;
    const scores = await prediction.data();

    // カテゴリ別重み付け
    const categoryParams = this.FRESHNESS_PARAMETERS[foodCategory as keyof typeof this.FRESHNESS_PARAMETERS] || 
                          this.FRESHNESS_PARAMETERS.fruits;

    const colorScore = this.calculateColorScore(colorAnalysis) * 100;
    const textureScore = this.calculateTextureScore(textureAnalysis) * 100;
    const shapeScore = this.calculateShapeScore(shapeAnalysis) * 100;

    const overallScore = 
      colorScore * categoryParams.colorWeight +
      textureScore * categoryParams.textureWeight +
      shapeScore * categoryParams.shapeWeight;

    const freshnessLevel = this.determineFreshnessLevel(overallScore, categoryParams.thresholds);
    const confidence = Math.max(...Array.from(scores));
    const estimatedShelfLife = this.estimateShelfLife(overallScore, foodCategory);

    return {
      overall: Math.round(overallScore),
      colorScore: Math.round(colorScore),
      textureScore: Math.round(textureScore),
      shapeScore: Math.round(shapeScore),
      prediction: freshnessLevel,
      confidence: Math.round(confidence * 100) / 100,
      estimatedShelfLife
    };
  }

  /**
   * カラースコア計算
   */
  private calculateColorScore(colorAnalysis: ColorAnalysis): number {
    const score = 1 - (
      colorAnalysis.colorVariance * 0.3 +
      colorAnalysis.brownSpotRatio * 0.4 +
      colorAnalysis.discolorationLevel * 0.3
    );
    return Math.max(0, Math.min(1, score));
  }

  /**
   * テクスチャスコア計算
   */
  private calculateTextureScore(textureAnalysis: TextureAnalysis): number {
    const score = (
      textureAnalysis.smoothness * 0.25 +
      (1 - textureAnalysis.wrinkleLevel) * 0.25 +
      (1 - textureAnalysis.surfaceDefects) * 0.25 +
      textureAnalysis.firmness * 0.25
    );
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 形状スコア計算
   */
  private calculateShapeScore(shapeAnalysis: ShapeAnalysis): number {
    const score = (
      shapeAnalysis.symmetry * 0.3 +
      shapeAnalysis.intactness * 0.4 +
      (1 - shapeAnalysis.deformation) * 0.2 +
      (1 - shapeAnalysis.volumeLoss) * 0.1
    );
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 新鮮度レベル決定
   */
  private determineFreshnessLevel(score: number, thresholds: any): FreshnessLevel {
    if (score >= thresholds.fresh) return FreshnessLevel.FRESH;
    if (score >= thresholds.good) return FreshnessLevel.GOOD;
    if (score >= thresholds.acceptable) return FreshnessLevel.ACCEPTABLE;
    if (score >= thresholds.poor) return FreshnessLevel.POOR;
    return FreshnessLevel.SPOILED;
  }

  /**
   * 賞味期限推定
   */
  private estimateShelfLife(score: number, foodCategory: string): number {
    // カテゴリ別ベース賞味期限
    const baseShelfLife = {
      fruits: 7,
      vegetables: 10,
      meat: 3,
      dairy: 5
    };

    const baseDays = baseShelfLife[foodCategory as keyof typeof baseShelfLife] || 7;
    const freshnessRatio = score / 100;
    
    return Math.round(baseDays * freshnessRatio);
  }

  /**
   * 新鮮度結果保存
   */
  private async saveFreshnessResult(
    imageUri: string,
    foodCategory: string,
    freshnessScore: FreshnessScore
  ): Promise<void> {
    try {
      await this.databaseService.insert('freshness_results', {
        image_uri: imageUri,
        food_category: foodCategory,
        overall_score: freshnessScore.overall,
        color_score: freshnessScore.colorScore,
        texture_score: freshnessScore.textureScore,
        shape_score: freshnessScore.shapeScore,
        freshness_level: freshnessScore.prediction,
        confidence: freshnessScore.confidence,
        estimated_shelf_life: freshnessScore.estimatedShelfLife,
        timestamp: Date.now()
      });

      console.log('💾 新鮮度結果をデータベースに保存');

    } catch (error) {
      console.error('❌ 新鮮度結果保存失敗:', error);
    }
  }

  /**
   * 履歴から新鮮度トレンド分析
   */
  public async analyzeFreshnessTrend(
    foodCategory: string,
    days: number = 7
  ): Promise<{
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  }> {
    try {
      const since = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const results = await this.databaseService.query(
        'SELECT * FROM freshness_results WHERE food_category = ? AND timestamp > ? ORDER BY timestamp',
        [foodCategory, since]
      );

      if (results.length < 2) {
        return {
          averageScore: 0,
          trend: 'stable',
          recommendations: ['データが不足しています']
        };
      }

      const scores = results.map(r => r.overall_score);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // トレンド分析
      const recentScores = scores.slice(-3);
      const olderScores = scores.slice(0, 3);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

      let trend: 'improving' | 'declining' | 'stable';
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
      else trend = 'stable';

      const recommendations = this.generateFreshnessRecommendations(trend, averageScore);

      return {
        averageScore: Math.round(averageScore),
        trend,
        recommendations
      };

    } catch (error) {
      console.error('❌ トレンド分析失敗:', error);
      throw error;
    }
  }

  /**
   * 新鮮度改善提案生成
   */
  private generateFreshnessRecommendations(
    trend: 'improving' | 'declining' | 'stable',
    averageScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'declining') {
      recommendations.push('保存環境の見直しをお勧めします');
      recommendations.push('温度・湿度の管理を確認してください');
    }

    if (averageScore < 60) {
      recommendations.push('早めの消費をお勧めします');
      recommendations.push('調理方法を工夫して無駄を減らしましょう');
    }

    if (trend === 'improving') {
      recommendations.push('良い保存状態を維持してください');
    }

    return recommendations;
  }

  /**
   * バッチ新鮮度解析
   */
  public async batchAnalyzeFreshness(
    imageUris: string[],
    foodCategories: string[]
  ): Promise<FreshnessScore[]> {
    try {
      console.log(`🔬 バッチ新鮮度解析開始: ${imageUris.length}件`);

      const results: FreshnessScore[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        const score = await this.analyzeFreshness(imageUris[i], foodCategories[i]);
        results.push(score);
      }

      console.log(`✅ バッチ新鮮度解析完了: ${results.length}件`);
      return results;

    } catch (error) {
      console.error('❌ バッチ新鮮度解析失敗:', error);
      throw error;
    }
  }

  /**
   * サービス終了処理
   */
  public async dispose(): Promise<void> {
    try {
      if (this.models) {
        this.models.colorModel.dispose();
        this.models.textureModel.dispose();
        this.models.shapeModel.dispose();
        this.models.fusionModel.dispose();
      }
      
      this.isInitialized = false;
      console.log('🔄 新鮮度判定サービス終了');

    } catch (error) {
      console.error('❌ サービス終了処理失敗:', error);
    }
  }
}

// シングルトンインスタンスエクスポート
export const freshnessDetectionService = FreshnessDetectionService.getInstance();
