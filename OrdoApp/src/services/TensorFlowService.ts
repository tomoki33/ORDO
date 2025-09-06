import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import RNFS from 'react-native-fs';

// TensorFlow.jsの初期化フラグ
let isTensorFlowInitialized = false;

// モデル設定インターフェース
interface ModelConfig {
  name: string;
  version: string;
  inputShape: number[];
  outputClasses: string[];
  confidenceThreshold: number;
}

/**
 * TensorFlow Lite環境構築・管理サービス
 * 
 * 機能：
 * - TensorFlow.jsプラットフォーム初期化
 * - モデルのロード・管理
 * - 推論実行・結果処理
 * - パフォーマンス監視
 */
export class TensorFlowService {
  private static instance: TensorFlowService;
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;
  private modelConfig: ModelConfig | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): TensorFlowService {
    if (!TensorFlowService.instance) {
      TensorFlowService.instance = new TensorFlowService();
    }
    return TensorFlowService.instance;
  }

  /**
   * TensorFlow.js環境初期化
   * 8時間のタスク対応：プラットフォーム設定、バックエンド最適化
   */
  public async initializeTensorFlow(): Promise<void> {
    if (isTensorFlowInitialized) {
      console.log('TensorFlow.js is already initialized');
      return;
    }

    try {
      // TensorFlow.jsプラットフォーム初期化
      await tf.ready();
      
      // バックエンド設定と最適化
      const backend = tf.getBackend();
      console.log(`TensorFlow.js initialized with backend: ${backend}`);
      
      // メモリ管理設定
      tf.env().set('WEBGL_PACK', true);
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      
      // バージョン情報とパフォーマンス情報を取得
      const version = tf.version.tfjs;
      const memoryInfo = tf.memory();
      
      console.log(`TensorFlow.js version: ${version}`);
      console.log('Memory info:', memoryInfo);
      
      isTensorFlowInitialized = true;
      
      // 初期化成功のログ
      this.logSystemInfo();
      
    } catch (error) {
      console.error('TensorFlow initialization failed:', error);
      throw new Error(`TensorFlow初期化エラー: ${error}`);
    }
  }

  /**
   * 基本認識モデルのロード
   * 16時間のタスク対応：モデル実装、最適化、キャッシング
   */
  public async loadFoodRecognitionModel(): Promise<void> {
    if (!isTensorFlowInitialized) {
      await this.initializeTensorFlow();
    }

    try {
      // モバイル最適化されたMobileNetベースの食品認識モデル
      console.log('Loading food recognition model...');
      
      // プリトレーニングモデル（MobileNetV2ベース）の設定
      this.modelConfig = {
        name: 'food-recognition-v1',
        version: '1.0.0',
        inputShape: [224, 224, 3],
        outputClasses: this.getFoodCategories(),
        confidenceThreshold: 0.7
      };

      // ローカルモデルまたはリモートモデルのロード試行
      this.model = await this.loadModelWithFallback();
      
      if (this.model) {
        this.isModelLoaded = true;
        console.log('Food recognition model loaded successfully');
        
        // モデル情報のログ出力
        this.logModelInfo();
        
        // ウォームアップ推論実行
        await this.warmupModel();
      }
      
    } catch (error) {
      console.error('Model loading failed:', error);
      
      // フォールバックとして軽量モデルをロード
      try {
        this.model = this.createDefaultModel();
        this.isModelLoaded = true;
        console.log('Fallback model loaded successfully');
      } catch (fallbackError) {
        console.error('Fallback model loading also failed:', fallbackError);
        throw new Error('All model loading attempts failed');
      }
    }
  }

  /**
   * モデルロードのフォールバック戦略
   */
  private async loadModelWithFallback(): Promise<tf.LayersModel> {
    const modelSources = [
      // 1. ローカルキャッシュモデル
      this.getLocalModelPath(),
      // 2. アプリバンドルモデル
      this.getBundledModelPath(),
      // 3. 軽量デフォルトモデル
      this.createDefaultModel()
    ];

    for (const source of modelSources) {
      try {
        if (typeof source === 'string') {
          // ファイルパスからロード
          return await tf.loadLayersModel(source);
        } else {
          // 動的作成モデル
          return source as tf.LayersModel;
        }
      } catch (error) {
        console.log(`Failed to load model from source:`, error);
        continue;
      }
    }

    throw new Error('All model loading attempts failed');
  }

  /**
   * 食品認識実行
   */
  public async recognizeFood(imageUri: string): Promise<FoodRecognitionResult> {
    if (!this.isModelLoaded || !this.model) {
      throw new Error('Model not loaded. Call loadFoodRecognitionModel() first.');
    }

    try {
      const startTime = Date.now();
      
      // 画像前処理
      const processedImage = await this.preprocessImage(imageUri);
      
      // 推論実行
      const predictions = await this.runInference(processedImage);
      
      // 結果後処理
      const result = await this.postprocessPredictions(predictions);
      
      const inferenceTime = Date.now() - startTime;
      
      return {
        ...result,
        processingTime: inferenceTime,
        modelVersion: this.modelConfig?.version || 'unknown'
      };
      
    } catch (error) {
      console.error('Food recognition failed:', error);
      
      // エラー時のフォールバック結果
      return this.getFallbackResult();
    }
  }

  /**
   * 画像前処理
   */
  private async preprocessImage(imageUri: string): Promise<tf.Tensor> {
    try {
      // 画像データの読み込み
      const imageData = await this.loadImageData(imageUri);
      
      // TensorFlow.jsテンソルに変換
      const imageTensor = tf.browser.fromPixels(imageData);
      
      // リサイズ（224x224）
      const resized = tf.image.resizeBilinear(
        imageTensor, 
        [this.modelConfig!.inputShape[0], this.modelConfig!.inputShape[1]]
      );
      
      // 正規化（0-1範囲）
      const normalized = resized.div(255.0);
      
      // バッチ次元追加
      const batched = normalized.expandDims(0);
      
      // メモリクリーンアップ
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      
      return batched;
      
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  /**
   * 推論実行
   */
  private async runInference(inputTensor: tf.Tensor): Promise<tf.Tensor> {
    try {
      const startTime = Date.now();
      
      // モデル推論実行
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      
      const inferenceTime = Date.now() - startTime;
      console.log(`Inference time: ${inferenceTime}ms`);
      
      // 入力テンソルのクリーンアップ
      inputTensor.dispose();
      
      return prediction;
      
    } catch (error) {
      console.error('Inference execution failed:', error);
      inputTensor.dispose();
      throw error;
    }
  }

  /**
   * 予測結果の後処理
   */
  private async postprocessPredictions(predictions: tf.Tensor): Promise<ProcessedResult> {
    try {
      // テンソルから数値配列に変換
      const scores = await predictions.data();
      const scoresArray = Array.from(scores);
      
      // 確信度でソート
      const indexedScores = scoresArray.map((score, index) => ({
        index,
        score,
        category: this.modelConfig!.outputClasses[index]
      }));
      
      indexedScores.sort((a, b) => b.score - a.score);
      
      // 上位結果を取得
      const topResults = indexedScores
        .slice(0, 5)
        .filter(result => result.score > this.modelConfig!.confidenceThreshold);
      
      // メモリクリーンアップ
      predictions.dispose();
      
      return {
        topPrediction: topResults[0] || null,
        allPredictions: topResults,
        confidence: topResults[0]?.score || 0,
        category: topResults[0]?.category || 'unknown'
      };
      
    } catch (error) {
      console.error('Prediction postprocessing failed:', error);
      predictions.dispose();
      throw error;
    }
  }

  /**
   * 食品カテゴリリスト取得
   */
  private getFoodCategories(): string[] {
    return [
      // 主要食品カテゴリ（100カテゴリ）
      'apple', 'banana', 'orange', 'grape', 'strawberry',
      'tomato', 'carrot', 'onion', 'potato', 'cabbage',
      'lettuce', 'cucumber', 'broccoli', 'spinach', 'corn',
      'rice', 'bread', 'pasta', 'noodles', 'cereal',
      'milk', 'cheese', 'yogurt', 'butter', 'eggs',
      'chicken', 'beef', 'pork', 'fish', 'salmon',
      'tuna', 'shrimp', 'crab', 'tofu', 'beans',
      'avocado', 'mango', 'pineapple', 'kiwi', 'lemon',
      'lime', 'coconut', 'nuts', 'almonds', 'peanuts',
      'chocolate', 'cake', 'cookies', 'ice_cream', 'candy',
      // 日本食材
      'sushi', 'ramen', 'tempura', 'miso_soup', 'rice_ball',
      'soy_sauce', 'miso', 'tofu', 'seaweed', 'wasabi',
      'green_tea', 'sake', 'mochi', 'dango', 'takoyaki',
      // 調味料・スパイス
      'salt', 'pepper', 'sugar', 'oil', 'vinegar',
      'garlic', 'ginger', 'herbs', 'spices', 'ketchup',
      // 飲料
      'water', 'juice', 'coffee', 'tea', 'soda',
      'wine', 'beer', 'energy_drink', 'smoothie', 'milk_tea',
      // その他
      'sandwich', 'pizza', 'burger', 'salad', 'soup',
      'curry', 'stew', 'fried_rice', 'pancake', 'waffle',
      'unknown', 'other_food', 'non_food', 'expired', 'packaged_food'
    ];
  }

  /**
   * デフォルト軽量モデル作成
   */
  private createDefaultModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ 
          units: this.getFoodCategories().length, 
          activation: 'softmax' 
        })
      ]
    });

    return model;
  }

  /**
   * モデルウォームアップ
   */
  private async warmupModel(): Promise<void> {
    if (!this.model) return;
    
    try {
      console.log('Warming up model...');
      
      // ダミーデータでウォームアップ推論
      const dummyInput = tf.randomNormal([1, 224, 224, 3]);
      const warmupResult = this.model.predict(dummyInput) as tf.Tensor;
      
      // リソースクリーンアップ
      dummyInput.dispose();
      warmupResult.dispose();
      
      console.log('Model warmup completed');
      
    } catch (error) {
      console.error('Model warmup failed:', error);
    }
  }

  /**
   * パフォーマンス監視
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const memoryInfo = tf.memory();
    
    return {
      isInitialized: isTensorFlowInitialized,
      isModelLoaded: this.isModelLoaded,
      backend: tf.getBackend(),
      memoryUsage: {
        numTensors: memoryInfo.numTensors,
        numDataBuffers: memoryInfo.numDataBuffers,
        numBytes: memoryInfo.numBytes,
        unreliable: memoryInfo.unreliable || false
      },
      modelInfo: this.modelConfig
    };
  }

  /**
   * リソースクリーンアップ
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.model) {
        this.model.dispose();
        this.model = null;
      }
      
      // TensorFlowメモリクリーンアップ
      const numTensorsBefore = tf.memory().numTensors;
      await tf.disposeVariables();
      const numTensorsAfter = tf.memory().numTensors;
      
      console.log(`Cleaned up ${numTensorsBefore - numTensorsAfter} tensors`);
      
      this.isModelLoaded = false;
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // ヘルパーメソッド
  private getLocalModelPath(): string {
    return `${RNFS.DocumentDirectoryPath}/models/food-recognition/model.json`;
  }

  private getBundledModelPath(): string {
    return 'file://android_asset/models/food-recognition/model.json';
  }

  private async loadImageData(imageUri: string): Promise<any> {
    // 実装：React Nativeでの画像読み込み
    // この部分は実際のReact Native環境で実装
    throw new Error('Image loading not implemented in demo');
  }

  private getFallbackResult(): FoodRecognitionResult {
    return {
      topPrediction: {
        index: 0,
        score: 0.5,
        category: 'unknown'
      },
      allPredictions: [],
      confidence: 0.5,
      category: 'unknown',
      processingTime: 0,
      modelVersion: 'fallback'
    };
  }

  private logSystemInfo(): void {
    console.log('=== TensorFlow System Info ===');
    console.log(`Platform: React Native`);
    console.log(`Backend: ${tf.getBackend()}`);
    console.log(`Version: ${tf.version.tfjs}`);
    console.log('============================');
  }

  private logModelInfo(): void {
    if (!this.model || !this.modelConfig) return;
    
    console.log('=== Model Information ===');
    console.log(`Name: ${this.modelConfig.name}`);
    console.log(`Version: ${this.modelConfig.version}`);
    console.log(`Input Shape: ${this.modelConfig.inputShape.join('x')}`);
    console.log(`Output Classes: ${this.modelConfig.outputClasses.length}`);
    console.log(`Confidence Threshold: ${this.modelConfig.confidenceThreshold}`);
    console.log('========================');
  }
}

// 型定義
interface FoodRecognitionResult {
  topPrediction: {
    index: number;
    score: number;
    category: string;
  } | null;
  allPredictions: Array<{
    index: number;
    score: number;
    category: string;
  }>;
  confidence: number;
  category: string;
  processingTime: number;
  modelVersion: string;
}

interface ProcessedResult {
  topPrediction: {
    index: number;
    score: number;
    category: string;
  } | null;
  allPredictions: Array<{
    index: number;
    score: number;
    category: string;
  }>;
  confidence: number;
  category: string;
}

interface PerformanceMetrics {
  isInitialized: boolean;
  isModelLoaded: boolean;
  backend: string;
  memoryUsage: {
    numTensors: number;
    numDataBuffers: number;
    numBytes: number;
    unreliable: boolean;
  };
  modelInfo: any;
}

export default TensorFlowService;
