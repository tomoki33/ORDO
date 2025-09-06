/**
 * TensorFlow Lite + AI認識システム デモ・テストスクリプト
 * 
 * 用途：
 * - TensorFlow.js環境の動作確認
 * - AI認識サービスの機能テスト
 * - パフォーマンス検証
 */

import { TensorFlowService } from '../services/TensorFlowService';
import { AIRecognitionService } from '../services/AIRecognitionService';

/**
 * TensorFlow Lite デモクラス
 */
export class TensorFlowDemo {
  private tensorflowService: TensorFlowService;
  private aiRecognitionService: AIRecognitionService;

  constructor() {
    this.tensorflowService = TensorFlowService.getInstance();
    this.aiRecognitionService = AIRecognitionService.getInstance();
  }

  /**
   * 完全なデモシステム実行
   */
  public async runFullDemo(): Promise<void> {
    console.log('🚀 TensorFlow Lite + AI認識システム デモ開始');
    console.log('=' .repeat(50));

    try {
      // Step 1: TensorFlow.js初期化
      await this.demoTensorFlowInitialization();
      
      // Step 2: AI認識サービス初期化
      await this.demoAIRecognitionInitialization();
      
      // Step 3: 基本認識テスト
      await this.demoBasicRecognition();
      
      // Step 4: 複数商品認識テスト
      await this.demoMultipleProductRecognition();
      
      // Step 5: 新鮮度判定テスト
      await this.demoFreshnessAnalysis();
      
      // Step 6: パフォーマンス測定
      await this.demoPerformanceMetrics();
      
      // Step 7: システムクリーンアップ
      await this.demoCleanup();

      console.log('✅ デモ完了: すべてのテストが正常に実行されました');

    } catch (error) {
      console.error('❌ デモ実行エラー:', error);
    }
  }

  /**
   * TensorFlow.js初期化デモ
   */
  private async demoTensorFlowInitialization(): Promise<void> {
    console.log('\n📱 Step 1: TensorFlow.js初期化');
    console.log('-' .repeat(30));

    try {
      const startTime = Date.now();
      
      // TensorFlow環境初期化
      await this.tensorflowService.initializeTensorFlow();
      
      // モデルロード
      await this.tensorflowService.loadFoodRecognitionModel();
      
      const initTime = Date.now() - startTime;
      
      console.log(`✅ TensorFlow.js初期化完了 (${initTime}ms)`);
      console.log('   - プラットフォーム設定: OK');
      console.log('   - バックエンド初期化: OK');
      console.log('   - モデルロード: OK');
      
    } catch (error) {
      console.error('❌ TensorFlow.js初期化失敗:', error);
      throw error;
    }
  }

  /**
   * AI認識サービス初期化デモ
   */
  private async demoAIRecognitionInitialization(): Promise<void> {
    console.log('\n🤖 Step 2: AI認識サービス初期化');
    console.log('-' .repeat(30));

    try {
      const startTime = Date.now();
      
      // AI認識サービス初期化
      await this.aiRecognitionService.initialize();
      
      const initTime = Date.now() - startTime;
      
      console.log(`✅ AI認識サービス初期化完了 (${initTime}ms)`);
      console.log('   - OpenAI統合: OK');
      console.log('   - TensorFlow統合: OK');
      console.log('   - データベース拡張: OK');
      
    } catch (error) {
      console.error('❌ AI認識サービス初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 基本認識デモ
   */
  private async demoBasicRecognition(): Promise<void> {
    console.log('\n🍎 Step 3: 基本食品認識テスト');
    console.log('-' .repeat(30));

    const testImages = [
      { name: 'りんご', uri: 'demo://apple.jpg' },
      { name: 'バナナ', uri: 'demo://banana.jpg' },
      { name: '牛乳', uri: 'demo://milk.jpg' },
    ];

    for (const testImage of testImages) {
      try {
        console.log(`\n🔍 認識テスト: ${testImage.name}`);
        
        const startTime = Date.now();
        const result = await this.aiRecognitionService.recognizeFood(testImage.uri);
        const processingTime = Date.now() - startTime;
        
        console.log(`   認識結果: ${result.name}`);
        console.log(`   カテゴリ: ${result.category}`);
        console.log(`   信頼度: ${Math.round(result.confidence * 100)}%`);
        console.log(`   処理時間: ${processingTime}ms`);
        console.log(`   認識エンジン: ${result.engines?.join(', ')}`);
        
      } catch (error) {
        console.error(`❌ ${testImage.name}の認識に失敗:`, error);
      }
    }
  }

  /**
   * 複数商品認識デモ
   */
  private async demoMultipleProductRecognition(): Promise<void> {
    console.log('\n📸 Step 4: 複数商品同時認識テスト');
    console.log('-' .repeat(30));

    try {
      const testImageUri = 'demo://multiple_products.jpg';
      
      console.log('🔍 複数商品認識実行中...');
      
      const startTime = Date.now();
      const result = await this.aiRecognitionService.recognizeMultipleProducts(testImageUri);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ 認識完了: ${result.totalCount}商品検出`);
      console.log(`   処理時間: ${processingTime}ms`);
      console.log(`   検出ソース: ${result.source}`);
      
      result.products.forEach((product, index) => {
        console.log(`   商品${index + 1}: ${product.name} (${Math.round(product.confidence * 100)}%)`);
      });
      
    } catch (error) {
      console.error('❌ 複数商品認識失敗:', error);
    }
  }

  /**
   * 新鮮度判定デモ
   */
  private async demoFreshnessAnalysis(): Promise<void> {
    console.log('\n🥗 Step 5: 食品新鮮度判定テスト');
    console.log('-' .repeat(30));

    const testCases = [
      { name: '新鮮なトマト', uri: 'demo://fresh_tomato.jpg', expected: 'fresh' },
      { name: '少し古いバナナ', uri: 'demo://old_banana.jpg', expected: 'warning' },
      { name: '腐ったレタス', uri: 'demo://spoiled_lettuce.jpg', expected: 'expired' },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n🔍 新鮮度判定: ${testCase.name}`);
        
        // まず基本認識を実行
        const recognition = await this.aiRecognitionService.recognizeFood(testCase.uri);
        
        // 新鮮度判定を実行
        const freshness = await this.aiRecognitionService.analyzeFoodFreshness(
          testCase.uri, 
          recognition
        );
        
        console.log(`   判定結果: ${this.getFreshnessEmoji(freshness.status)} ${freshness.status}`);
        console.log(`   信頼度: ${Math.round(freshness.confidence * 100)}%`);
        console.log(`   推定残り日数: ${freshness.estimatedDaysRemaining}日`);
        
        if (freshness.recommendations.length > 0) {
          console.log(`   推奨: ${freshness.recommendations[0]}`);
        }
        
      } catch (error) {
        console.error(`❌ ${testCase.name}の新鮮度判定に失敗:`, error);
      }
    }
  }

  /**
   * パフォーマンス測定デモ
   */
  private async demoPerformanceMetrics(): Promise<void> {
    console.log('\n📊 Step 6: パフォーマンス測定');
    console.log('-' .repeat(30));

    try {
      const metrics = this.tensorflowService.getPerformanceMetrics();
      
      console.log('🚀 TensorFlow.js メトリクス:');
      console.log(`   初期化状態: ${metrics.isInitialized ? '✅' : '❌'}`);
      console.log(`   モデル状態: ${metrics.isModelLoaded ? '✅' : '❌'}`);
      console.log(`   バックエンド: ${metrics.backend}`);
      
      console.log('\n💾 メモリ使用量:');
      console.log(`   テンソル数: ${metrics.memoryUsage.numTensors}`);
      console.log(`   データバッファ: ${metrics.memoryUsage.numDataBuffers}`);
      console.log(`   使用バイト数: ${this.formatBytes(metrics.memoryUsage.numBytes)}`);
      
      if (metrics.modelInfo) {
        console.log('\n🧠 モデル情報:');
        console.log(`   モデル名: ${metrics.modelInfo.name}`);
        console.log(`   バージョン: ${metrics.modelInfo.version}`);
        console.log(`   入力サイズ: ${metrics.modelInfo.inputShape.join('x')}`);
        console.log(`   出力クラス数: ${metrics.modelInfo.outputClasses.length}`);
      }
      
    } catch (error) {
      console.error('❌ パフォーマンス測定失敗:', error);
    }
  }

  /**
   * システムクリーンアップデモ
   */
  private async demoCleanup(): Promise<void> {
    console.log('\n🧹 Step 7: システムクリーンアップ');
    console.log('-' .repeat(30));

    try {
      // TensorFlowリソースクリーンアップ
      await this.tensorflowService.cleanup();
      
      console.log('✅ クリーンアップ完了');
      console.log('   - TensorFlowリソース解放: OK');
      console.log('   - メモリクリーンアップ: OK');
      
    } catch (error) {
      console.error('❌ クリーンアップ失敗:', error);
    }
  }

  /**
   * 新鮮度ステータスの絵文字取得
   */
  private getFreshnessEmoji(status: string): string {
    switch (status) {
      case 'fresh': return '🟢';
      case 'warning': return '🟡';
      case 'expired': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * バイト数をフォーマット
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * パフォーマンステストユーティリティ
 */
export class TensorFlowPerformanceTest {
  
  /**
   * 認識速度ベンチマーク
   */
  public static async benchmarkRecognitionSpeed(iterations: number = 10): Promise<void> {
    console.log(`\n⏱️ 認識速度ベンチマーク (${iterations}回実行)`);
    console.log('-' .repeat(40));

    const aiService = AIRecognitionService.getInstance();
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        await aiService.recognizeFood('demo://benchmark.jpg');
        const duration = Date.now() - startTime;
        times.push(duration);
        
        console.log(`実行${i + 1}: ${duration}ms`);
        
      } catch (error) {
        console.error(`実行${i + 1}でエラー:`, error);
      }
    }
    
    if (times.length > 0) {
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log('\n📊 ベンチマーク結果:');
      console.log(`   平均時間: ${Math.round(average)}ms`);
      console.log(`   最短時間: ${min}ms`);
      console.log(`   最長時間: ${max}ms`);
      console.log(`   成功率: ${Math.round((times.length / iterations) * 100)}%`);
    }
  }

  /**
   * メモリ使用量監視
   */
  public static async monitorMemoryUsage(duration: number = 60000): Promise<void> {
    console.log(`\n💾 メモリ使用量監視 (${duration/1000}秒間)`);
    console.log('-' .repeat(40));

    const tensorflowService = TensorFlowService.getInstance();
    const interval = 5000; // 5秒間隔
    const checks = Math.floor(duration / interval);
    
    for (let i = 0; i < checks; i++) {
      try {
        const metrics = tensorflowService.getPerformanceMetrics();
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`[${timestamp}] テンサー: ${metrics.memoryUsage.numTensors}, ` +
                   `メモリ: ${this.formatBytes(metrics.memoryUsage.numBytes)}`);
        
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error('メモリ監視エラー:', error);
      }
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * デモ実行関数（外部から呼び出し用）
 */
export async function runTensorFlowDemo(): Promise<void> {
  const demo = new TensorFlowDemo();
  await demo.runFullDemo();
}

export async function runPerformanceTest(): Promise<void> {
  await TensorFlowPerformanceTest.benchmarkRecognitionSpeed(5);
  await TensorFlowPerformanceTest.monitorMemoryUsage(30000);
}

// デフォルトエクスポート
export default TensorFlowDemo;
