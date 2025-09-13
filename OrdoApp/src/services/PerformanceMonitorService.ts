/**
 * Performance Monitor Service
 * アプリのパフォーマンス監視とメトリクス収集
 */

import { Alert } from 'react-native';

export interface PerformanceMetrics {
  // 起動時間
  appStartTime: number;
  screenLoadTime: number;
  
  // メモリ使用量
  memoryUsage: {
    jsHeap: number;
    totalMemory: number;
    usedMemory: number;
  };
  
  // 画像処理
  imageProcessingTime: number;
  ocrProcessingTime: number;
  
  // ネットワーク
  apiResponseTime: number;
  networkRequests: number;
  
  // UI応答性
  frameDrops: number;
  renderTime: number;
}

export interface PerformanceThresholds {
  maxStartupTime: number;
  maxImageProcessing: number;
  maxMemoryUsage: number;
  maxFrameDrops: number;
}

class PerformanceMonitorService {
  private metrics: Partial<PerformanceMetrics> = {};
  private thresholds: PerformanceThresholds = {
    maxStartupTime: 3000,
    maxImageProcessing: 3000,
    maxMemoryUsage: 100 * 1024 * 1024,
    maxFrameDrops: 5,
  };
  
  private timers: Map<string, number> = new Map();
  private isMonitoring = true;

  /**
   * パフォーマンス監視開始
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('📊 Performance monitoring started');
    
    // アプリ起動時間の記録
    this.startTimer('appStartup');
    
    // メモリ監視の開始
    this.startMemoryMonitoring();
    
    // フレームレート監視
    this.startFrameRateMonitoring();
  }

  /**
   * パフォーマンス監視停止
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * タイマー開始
   */
  startTimer(name: string): void {
    if (!this.isMonitoring) return;
    this.timers.set(name, Date.now());
  }

  /**
   * タイマー終了と記録
   */
  endTimer(name: string): number {
    if (!this.isMonitoring) return 0;
    
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} not found`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    // メトリクスに記録
    switch (name) {
      case 'appStartup':
        this.metrics.appStartTime = duration;
        this.checkStartupPerformance(duration);
        break;
      case 'screenLoad':
        this.metrics.screenLoadTime = duration;
        break;
      case 'imageProcessing':
        this.metrics.imageProcessingTime = duration;
        this.checkImageProcessingPerformance(duration);
        break;
      case 'ocrProcessing':
        this.metrics.ocrProcessingTime = duration;
        break;
      case 'apiRequest':
        this.metrics.apiResponseTime = duration;
        break;
    }
    
    console.log(`⏱️ ${name}: ${duration}ms`);
    return duration;
  }

  /**
   * メモリ使用量監視
   */
  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      // React Nativeでのメモリ監視（モック実装）
      const memoryInfo = this.getMemoryInfo();
      this.metrics.memoryUsage = memoryInfo;
      
      this.checkMemoryUsage(memoryInfo);
      
      // 30秒ごとにチェック
      setTimeout(checkMemory, 30000);
    };
    
    checkMemory();
  }

  /**
   * メモリ情報取得（モック実装）
   */
  private getMemoryInfo(): PerformanceMetrics['memoryUsage'] {
    // 実際の実装では、react-native-device-infoやネイティブモジュールを使用
    return {
      jsHeap: Math.random() * 50 * 1024 * 1024, // 0-50MB
      totalMemory: 4 * 1024 * 1024 * 1024, // 4GB
      usedMemory: Math.random() * 100 * 1024 * 1024, // 0-100MB
    };
  }

  /**
   * フレームレート監視
   */
  private startFrameRateMonitoring(): void {
    let lastFrameTime = Date.now();
    let frameCount = 0;
    let droppedFrames = 0;
    
    const checkFrameRate = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastFrameTime;
      
      frameCount++;
      
      // 60FPSの場合、16.67ms以下が理想
      if (deltaTime > 33) { // 30FPS以下
        droppedFrames++;
      }
      
      // 1秒ごとに統計を更新
      if (frameCount >= 60) {
        this.metrics.frameDrops = droppedFrames;
        this.checkFramePerformance(droppedFrames);
        
        frameCount = 0;
        droppedFrames = 0;
      }
      
      lastFrameTime = currentTime;
      requestAnimationFrame(checkFrameRate);
    };
    
    requestAnimationFrame(checkFrameRate);
  }

  /**
   * 起動時間チェック
   */
  private checkStartupPerformance(duration: number): void {
    if (duration > this.thresholds.maxStartupTime) {
      console.warn(`🐌 Slow startup detected: ${duration}ms (threshold: ${this.thresholds.maxStartupTime}ms)`);
      this.reportPerformanceIssue('startup', duration);
    } else {
      console.log(`🚀 Fast startup: ${duration}ms`);
    }
  }

  /**
   * 画像処理時間チェック
   */
  private checkImageProcessingPerformance(duration: number): void {
    if (duration > this.thresholds.maxImageProcessing) {
      console.warn(`🐌 Slow image processing: ${duration}ms (threshold: ${this.thresholds.maxImageProcessing}ms)`);
      this.reportPerformanceIssue('imageProcessing', duration);
    } else {
      console.log(`⚡ Fast image processing: ${duration}ms`);
    }
  }

  /**
   * メモリ使用量チェック
   */
  private checkMemoryUsage(memoryInfo: PerformanceMetrics['memoryUsage']): void {
    if (memoryInfo.usedMemory > this.thresholds.maxMemoryUsage) {
      console.warn(`🐌 High memory usage: ${Math.round(memoryInfo.usedMemory / 1024 / 1024)}MB`);
      this.reportPerformanceIssue('memory', memoryInfo.usedMemory);
    }
  }

  /**
   * フレーム性能チェック
   */
  private checkFramePerformance(droppedFrames: number): void {
    if (droppedFrames > this.thresholds.maxFrameDrops) {
      console.warn(`🐌 Frame drops detected: ${droppedFrames} frames`);
      this.reportPerformanceIssue('frameDrops', droppedFrames);
    }
  }

  /**
   * パフォーマンス問題報告
   */
  private reportPerformanceIssue(type: string, value: number): void {
    // 開発環境でのみアラート表示
    if (__DEV__) {
      const messages: Record<string, string> = {
        startup: `起動時間が遅いです: ${value}ms`,
        imageProcessing: `画像処理が遅いです: ${value}ms`,
        memory: `メモリ使用量が多いです: ${Math.round(value / 1024 / 1024)}MB`,
        frameDrops: `フレームドロップが発生: ${value}フレーム`,
      };
      
      Alert.alert(
        'パフォーマンス警告',
        messages[type] || `パフォーマンス問題: ${type}`,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * パフォーマンスレポート生成
   */
  generateReport(): PerformanceMetrics {
    const report = { ...this.metrics } as PerformanceMetrics;
    
    console.log('📊 Performance Report:', {
      appStartTime: `${report.appStartTime}ms`,
      imageProcessingTime: `${report.imageProcessingTime}ms`,
      memoryUsage: `${Math.round((report.memoryUsage?.usedMemory || 0) / 1024 / 1024)}MB`,
      frameDrops: report.frameDrops,
    });
    
    return report;
  }

  /**
   * メトリクスリセット
   */
  resetMetrics(): void {
    this.metrics = {};
    this.timers.clear();
    console.log('📊 Performance metrics reset');
  }

  /**
   * パフォーマンス推奨事項
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if ((this.metrics.appStartTime || 0) > this.thresholds.maxStartupTime) {
      suggestions.push('起動時間最適化: 不要なライブラリの遅延読み込み');
    }
    
    if ((this.metrics.imageProcessingTime || 0) > this.thresholds.maxImageProcessing) {
      suggestions.push('画像処理最適化: 画像サイズの事前縮小');
    }
    
    if ((this.metrics.memoryUsage?.usedMemory || 0) > this.thresholds.maxMemoryUsage) {
      suggestions.push('メモリ最適化: 不要なオブジェクトの解放');
    }
    
    if ((this.metrics.frameDrops || 0) > this.thresholds.maxFrameDrops) {
      suggestions.push('UI最適化: 重い処理のバックグラウンド実行');
    }
    
    return suggestions;
  }

  /**
   * パフォーマンススコア計算
   */
  calculatePerformanceScore(): number {
    let score = 100;
    
    // 起動時間 (40点満点)
    const startupRatio = (this.metrics.appStartTime || 0) / this.thresholds.maxStartupTime;
    score -= Math.min(40, startupRatio * 40);
    
    // 画像処理時間 (30点満点)
    const imageRatio = (this.metrics.imageProcessingTime || 0) / this.thresholds.maxImageProcessing;
    score -= Math.min(30, imageRatio * 30);
    
    // メモリ使用量 (20点満点)
    const memoryRatio = (this.metrics.memoryUsage?.usedMemory || 0) / this.thresholds.maxMemoryUsage;
    score -= Math.min(20, memoryRatio * 20);
    
    // フレームドロップ (10点満点)
    const frameRatio = (this.metrics.frameDrops || 0) / this.thresholds.maxFrameDrops;
    score -= Math.min(10, frameRatio * 10);
    
    return Math.max(0, Math.round(score));
  }
}

export const performanceMonitor = new PerformanceMonitorService();

// アプリ起動時に監視開始
performanceMonitor.startMonitoring();
