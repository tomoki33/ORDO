/**
 * Memory Optimization Service
 * メモリ使用量の監視と最適化
 */

import { performanceMonitor } from './PerformanceMonitorService';
import { imageOptimizer } from './ImageOptimizationService';

export interface MemoryUsageInfo {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  external: number;
  rss?: number; // Resident Set Size (ネイティブのみ)
}

export interface MemoryLeakDetection {
  isLeakDetected: boolean;
  growthRate: number; // MB/分
  suspiciousObjects: string[];
  recommendations: string[];
}

export interface GarbageCollectionStats {
  collections: number;
  totalTime: number;
  avgTime: number;
  lastCollection: number;
}

class MemoryOptimizationService {
  private memorySnapshots: MemoryUsageInfo[] = [];
  private maxSnapshots = 100;
  private memoryWarningThreshold = 100 * 1024 * 1024; // 100MB
  private memoryDangerThreshold = 150 * 1024 * 1024; // 150MB
  
  private gcStats: GarbageCollectionStats = {
    collections: 0,
    totalTime: 0,
    avgTime: 0,
    lastCollection: 0,
  };
  
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // 監視対象のオブジェクト参照
  private objectRegistry = new WeakSet();
  private objectCounters = new Map<string, number>();

  /**
   * メモリ監視開始
   */
  startMemoryMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🧠 Memory monitoring started');
    
    // 初回スナップショット取得
    this.takeMemorySnapshot();
    
    // 定期監視開始（10秒間隔）
    this.monitoringInterval = setInterval(() => {
      this.takeMemorySnapshot();
      this.analyzeMemoryTrends();
      this.detectMemoryLeaks();
    }, 10000);
    
    // ガベージコレクション監視
    this.setupGCMonitoring();
  }

  /**
   * メモリ監視停止
   */
  stopMemoryMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('🧠 Memory monitoring stopped');
  }

  /**
   * メモリスナップショット取得
   */
  private takeMemorySnapshot(): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    
    this.memorySnapshots.push({
      ...memoryUsage,
      timestamp: Date.now(),
    } as MemoryUsageInfo & { timestamp: number });
    
    // スナップショット数制限
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }
    
    // 警告レベルチェック
    this.checkMemoryWarnings(memoryUsage);
    
    console.log(`🧠 Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`);
  }

  /**
   * 現在のメモリ使用量取得
   */
  private getCurrentMemoryUsage(): MemoryUsageInfo {
    // React Nativeでのメモリ情報取得（モック実装）
    // 実際の実装では、react-native-device-info やネイティブモジュールを使用
    
    return {
      heapUsed: Math.random() * 80 * 1024 * 1024, // 0-80MB
      heapTotal: 128 * 1024 * 1024, // 128MB
      heapLimit: 256 * 1024 * 1024, // 256MB
      external: Math.random() * 20 * 1024 * 1024, // 0-20MB
      rss: Math.random() * 100 * 1024 * 1024, // 0-100MB
    };
  }

  /**
   * メモリ警告チェック
   */
  private checkMemoryWarnings(memoryUsage: MemoryUsageInfo): void {
    const totalUsage = memoryUsage.heapUsed + memoryUsage.external;
    
    if (totalUsage > this.memoryDangerThreshold) {
      console.warn('🚨 Critical memory usage detected!');
      this.performEmergencyCleanup();
    } else if (totalUsage > this.memoryWarningThreshold) {
      console.warn('⚠️ High memory usage detected');
      this.performOptimization();
    }
  }

  /**
   * メモリトレンド分析
   */
  private analyzeMemoryTrends(): void {
    if (this.memorySnapshots.length < 5) return;
    
    const recent = this.memorySnapshots.slice(-5);
    const usageIncrease = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
    const timeSpan = 50; // 50秒間（10秒 × 5回）
    
    if (usageIncrease > 0) {
      const growthRateMB = (usageIncrease / 1024 / 1024) / (timeSpan / 60);
      
      if (growthRateMB > 2) { // 2MB/分以上の増加
        console.warn(`📈 High memory growth rate: ${growthRateMB.toFixed(2)}MB/min`);
        this.performOptimization();
      }
    }
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeaks(): MemoryLeakDetection {
    if (this.memorySnapshots.length < 10) {
      return {
        isLeakDetected: false,
        growthRate: 0,
        suspiciousObjects: [],
        recommendations: [],
      };
    }
    
    const recentSnapshots = this.memorySnapshots.slice(-10);
    const firstUsage = recentSnapshots[0].heapUsed;
    const lastUsage = recentSnapshots[recentSnapshots.length - 1].heapUsed;
    const timeSpanMinutes = (recentSnapshots.length * 10) / 60; // 分換算
    
    const growthRate = (lastUsage - firstUsage) / 1024 / 1024 / timeSpanMinutes;
    const isLeakDetected = growthRate > 1; // 1MB/分以上の継続的な増加
    
    const suspiciousObjects = this.identifySuspiciousObjects();
    const recommendations = this.generateMemoryRecommendations(isLeakDetected, suspiciousObjects);
    
    if (isLeakDetected) {
      console.warn(`🔍 Memory leak detected! Growth rate: ${growthRate.toFixed(2)}MB/min`);
    }
    
    return {
      isLeakDetected,
      growthRate,
      suspiciousObjects,
      recommendations,
    };
  }

  /**
   * 疑わしいオブジェクトの特定
   */
  private identifySuspiciousObjects(): string[] {
    const suspicious: string[] = [];
    
    // オブジェクトカウンターをチェック
    for (const [objectType, count] of this.objectCounters.entries()) {
      if (count > 100) { // 100個以上のオブジェクト
        suspicious.push(`${objectType} (${count} instances)`);
      }
    }
    
    return suspicious;
  }

  /**
   * メモリ最適化推奨事項生成
   */
  private generateMemoryRecommendations(isLeakDetected: boolean, suspiciousObjects: string[]): string[] {
    const recommendations: string[] = [];
    
    if (isLeakDetected) {
      recommendations.push('メモリリークの可能性があります。不要なイベントリスナーや参照を削除してください。');
    }
    
    if (suspiciousObjects.length > 0) {
      recommendations.push(`多数のオブジェクトが検出されました: ${suspiciousObjects.join(', ')}`);
    }
    
    const currentUsage = this.getCurrentMemoryUsage();
    const usagePercentage = (currentUsage.heapUsed / currentUsage.heapLimit) * 100;
    
    if (usagePercentage > 70) {
      recommendations.push('メモリ使用率が高いです。画像キャッシュのクリアを検討してください。');
    }
    
    if (usagePercentage > 50) {
      recommendations.push('不要なデータの削除やオブジェクトの解放を行ってください。');
    }
    
    return recommendations;
  }

  /**
   * 基本的なメモリ最適化実行
   */
  performOptimization(): void {
    console.log('🔧 Performing memory optimization...');
    
    // 画像キャッシュの最適化
    imageOptimizer.optimizeMemoryUsage();
    
    // オブジェクトカウンターリセット
    this.objectCounters.clear();
    
    // 強制ガベージコレクション（可能な場合）
    this.forceGarbageCollection();
    
    console.log('✅ Memory optimization completed');
  }

  /**
   * 緊急時メモリクリーンアップ
   */
  private performEmergencyCleanup(): void {
    console.log('🚨 Performing emergency memory cleanup...');
    
    // 画像キャッシュを完全クリア
    imageOptimizer.clearCache();
    
    // メモリスナップショットを削減
    this.memorySnapshots = this.memorySnapshots.slice(-20);
    
    // オブジェクトレジストリクリア
    this.objectCounters.clear();
    
    // 強制ガベージコレクション
    this.forceGarbageCollection();
    
    console.log('🆘 Emergency cleanup completed');
  }

  /**
   * 強制ガベージコレクション
   */
  private forceGarbageCollection(): void {
    const startTime = Date.now();
    
    try {
      // Node.js環境でのGC実行
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
        console.log('🗑️ Forced garbage collection executed');
      } else {
        // ブラウザ環境では直接GCを実行できないため、
        // 大量のオブジェクト作成・削除でGCを誘発
        const temp = new Array(1000).fill(null).map(() => ({ data: new Array(100) }));
        temp.length = 0;
      }
      
      const gcTime = Date.now() - startTime;
      this.updateGCStats(gcTime);
      
    } catch (error) {
      console.warn('Failed to force garbage collection:', error);
    }
  }

  /**
   * ガベージコレクション統計更新
   */
  private updateGCStats(gcTime: number): void {
    this.gcStats.collections++;
    this.gcStats.totalTime += gcTime;
    this.gcStats.avgTime = this.gcStats.totalTime / this.gcStats.collections;
    this.gcStats.lastCollection = Date.now();
  }

  /**
   * ガベージコレクション監視設定
   */
  private setupGCMonitoring(): void {
    // ネイティブ環境でのGC監視（モック実装）
    setInterval(() => {
      // 実際の実装では、ネイティブモジュールでGCイベントを監視
      const randomGCTime = Math.random() * 50; // 0-50ms
      if (Math.random() < 0.1) { // 10%の確率でGC発生をシミュレート
        this.updateGCStats(randomGCTime);
      }
    }, 5000);
  }

  /**
   * オブジェクト参照の追跡
   */
  trackObject(obj: object, type: string): void {
    this.objectRegistry.add(obj);
    
    const current = this.objectCounters.get(type) || 0;
    this.objectCounters.set(type, current + 1);
  }

  /**
   * オブジェクト参照の解除
   */
  untrackObject(obj: object, type: string): void {
    // WeakSetからは自動的に削除される
    
    const current = this.objectCounters.get(type) || 0;
    if (current > 0) {
      this.objectCounters.set(type, current - 1);
    }
  }

  /**
   * メモリ使用量レポート生成
   */
  generateMemoryReport(): {
    currentUsage: MemoryUsageInfo;
    trends: { averageGrowth: number; peakUsage: number };
    leakDetection: MemoryLeakDetection;
    gcStats: GarbageCollectionStats;
    recommendations: string[];
  } {
    const currentUsage = this.getCurrentMemoryUsage();
    const leakDetection = this.detectMemoryLeaks();
    
    // トレンド分析
    const usages = this.memorySnapshots.map(s => s.heapUsed);
    const averageGrowth = usages.length > 1 
      ? (usages[usages.length - 1] - usages[0]) / usages.length 
      : 0;
    const peakUsage = Math.max(...usages);
    
    const recommendations = [
      ...leakDetection.recommendations,
      ...this.generateGeneralRecommendations(currentUsage),
    ];
    
    return {
      currentUsage,
      trends: { averageGrowth, peakUsage },
      leakDetection,
      gcStats: this.gcStats,
      recommendations,
    };
  }

  /**
   * 一般的な推奨事項生成
   */
  private generateGeneralRecommendations(usage: MemoryUsageInfo): string[] {
    const recommendations: string[] = [];
    const usagePercentage = (usage.heapUsed / usage.heapLimit) * 100;
    
    if (usagePercentage > 80) {
      recommendations.push('メモリ使用率が非常に高いです。アプリの再起動を検討してください。');
    } else if (usagePercentage > 60) {
      recommendations.push('メモリ使用率が高めです。不要なデータの削除を推奨します。');
    }
    
    if (this.gcStats.avgTime > 100) {
      recommendations.push('GC時間が長いです。オブジェクトの生成・削除を最適化してください。');
    }
    
    return recommendations;
  }

  /**
   * メモリクリーンアップ関数（外部から呼び出し可能）
   */
  cleanup(): void {
    this.performOptimization();
  }

  /**
   * 緊急クリーンアップ関数（外部から呼び出し可能）
   */
  emergencyCleanup(): void {
    this.performEmergencyCleanup();
  }
}

export const memoryOptimizer = new MemoryOptimizationService();

// アプリ起動時にメモリ監視開始
memoryOptimizer.startMemoryMonitoring();
