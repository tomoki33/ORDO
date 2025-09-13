/**
 * Background Processing Optimization Service
 * バックグラウンド処理の最適化とタスク管理
 */

import { AppState, AppStateStatus } from 'react-native';
import { performanceMonitor } from './PerformanceMonitorService';

export interface BackgroundTask {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  executor: () => Promise<any>;
  interval?: number; // 定期実行間隔（ms）
  maxExecutionTime: number; // 最大実行時間（ms）
  isRunning: boolean;
  lastExecution?: number;
  nextExecution?: number;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  failureCount: number;
}

export interface TaskQueue {
  high: BackgroundTask[];
  medium: BackgroundTask[];
  low: BackgroundTask[];
}

export interface BackgroundProcessingStats {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  cpuUsage: number;
}

class BackgroundProcessingOptimizationService {
  private tasks = new Map<string, BackgroundTask>();
  private taskQueue: TaskQueue = { high: [], medium: [], low: [] };
  private isProcessing = false;
  private maxConcurrentTasks = 3;
  private currentlyRunning = new Set<string>();
  
  private appState: AppStateStatus = 'active';
  private processingInterval?: NodeJS.Timeout;
  private backgroundModeEnabled = true;
  
  // バッテリー最適化設定
  private batteryOptimization = {
    enabled: true,
    lowBatteryThreshold: 20, // 20%以下で制限モード
    reducedProcessingRatio: 0.5, // 低バッテリー時は50%の処理能力
  };

  constructor() {
    this.setupAppStateListener();
    this.startProcessingLoop();
  }

  /**
   * アプリ状態監視設定
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    console.log('📱 App state listener configured');
  }

  /**
   * アプリ状態変更ハンドリング
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log(`📱 App state changed: ${this.appState} → ${nextAppState}`);
    
    const previousState = this.appState;
    this.appState = nextAppState;
    
    if (nextAppState === 'background' && previousState === 'active') {
      this.onAppEnterBackground();
    } else if (nextAppState === 'active' && previousState === 'background') {
      this.onAppEnterForeground();
    }
  }

  /**
   * アプリがバックグラウンドに移行
   */
  private onAppEnterBackground(): void {
    console.log('🌙 App entered background, optimizing processing');
    
    if (this.backgroundModeEnabled) {
      // バックグラウンドモードで必要最小限の処理のみ実行
      this.pauseLowPriorityTasks();
      this.adjustProcessingFrequency(0.3); // 処理頻度を30%に削減
    } else {
      // バックグラウンド処理を完全停止
      this.pauseAllNonCriticalTasks();
    }
  }

  /**
   * アプリがフォアグラウンドに復帰
   */
  private onAppEnterForeground(): void {
    console.log('☀️ App entered foreground, resuming normal processing');
    
    // 通常の処理頻度に復帰
    this.adjustProcessingFrequency(1.0);
    this.resumePausedTasks();
  }

  /**
   * バックグラウンドタスク登録
   */
  registerTask(task: Omit<BackgroundTask, 'id' | 'isRunning' | 'executionCount' | 'totalExecutionTime' | 'averageExecutionTime' | 'failureCount'>): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const backgroundTask: BackgroundTask = {
      ...task,
      id: taskId,
      isRunning: false,
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      failureCount: 0,
    };
    
    this.tasks.set(taskId, backgroundTask);
    this.addToQueue(backgroundTask);
    
    console.log(`📋 Background task registered: ${task.name} (${task.priority})`);
    return taskId;
  }

  /**
   * タスクをキューに追加
   */
  private addToQueue(task: BackgroundTask): void {
    this.taskQueue[task.priority].push(task);
    
    // 優先度順にソート（実行時間の短いものを優先）
    this.taskQueue[task.priority].sort((a, b) => a.maxExecutionTime - b.maxExecutionTime);
  }

  /**
   * 処理ループ開始
   */
  private startProcessingLoop(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // 1秒間隔で処理チェック
    
    console.log('🔄 Background processing loop started');
  }

  /**
   * 処理ループ停止
   */
  private stopProcessingLoop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    
    console.log('⏸️ Background processing loop stopped');
  }

  /**
   * キュー処理実行
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.currentlyRunning.size >= this.maxConcurrentTasks) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // バッテリー状態チェック
      const shouldReduceProcessing = await this.shouldReduceProcessing();
      const availableSlots = shouldReduceProcessing 
        ? Math.floor(this.maxConcurrentTasks * this.batteryOptimization.reducedProcessingRatio)
        : this.maxConcurrentTasks - this.currentlyRunning.size;
      
      // 優先度順にタスクを処理
      const tasksToExecute: BackgroundTask[] = [];
      
      // 高優先度タスク
      tasksToExecute.push(...this.selectTasksForExecution(this.taskQueue.high, availableSlots));
      
      // 中優先度タスク
      if (tasksToExecute.length < availableSlots) {
        const remainingSlots = availableSlots - tasksToExecute.length;
        tasksToExecute.push(...this.selectTasksForExecution(this.taskQueue.medium, remainingSlots));
      }
      
      // 低優先度タスク（フォアグラウンドかつバッテリー十分な場合のみ）
      if (tasksToExecute.length < availableSlots && this.appState === 'active' && !shouldReduceProcessing) {
        const remainingSlots = availableSlots - tasksToExecute.length;
        tasksToExecute.push(...this.selectTasksForExecution(this.taskQueue.low, remainingSlots));
      }
      
      // 選択されたタスクを並列実行
      const executePromises = tasksToExecute.map(task => this.executeTask(task));
      await Promise.allSettled(executePromises);
      
    } catch (error) {
      console.error('Background processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 実行対象タスク選択
   */
  private selectTasksForExecution(queue: BackgroundTask[], maxCount: number): BackgroundTask[] {
    const now = Date.now();
    const executableTasks: BackgroundTask[] = [];
    
    for (const task of queue) {
      if (executableTasks.length >= maxCount) break;
      
      // 実行条件チェック
      if (this.isTaskExecutable(task, now)) {
        executableTasks.push(task);
      }
    }
    
    return executableTasks;
  }

  /**
   * タスク実行可能性チェック
   */
  private isTaskExecutable(task: BackgroundTask, now: number): boolean {
    // 既に実行中
    if (task.isRunning || this.currentlyRunning.has(task.id)) {
      return false;
    }
    
    // 定期実行タスクの場合、次回実行時間チェック
    if (task.interval && task.nextExecution && now < task.nextExecution) {
      return false;
    }
    
    return true;
  }

  /**
   * タスク実行
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    if (this.currentlyRunning.has(task.id)) {
      return; // 重複実行防止
    }
    
    this.currentlyRunning.add(task.id);
    task.isRunning = true;
    task.lastExecution = Date.now();
    
    const executionTimer = `backgroundTask_${task.id}`;
    performanceMonitor.startTimer(executionTimer);
    
    console.log(`🔄 Executing background task: ${task.name}`);
    
    try {
      // タイムアウト設定
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task execution timeout')), task.maxExecutionTime);
      });
      
      // タスク実行
      await Promise.race([task.executor(), timeoutPromise]);
      
      // 実行統計更新
      const executionTime = performanceMonitor.endTimer(executionTimer);
      this.updateTaskStats(task, executionTime, true);
      
      // 次回実行時間設定
      if (task.interval) {
        task.nextExecution = Date.now() + task.interval;
      }
      
      console.log(`✅ Background task completed: ${task.name} (${executionTime}ms)`);
      
    } catch (error) {
      performanceMonitor.endTimer(executionTimer);
      this.updateTaskStats(task, 0, false);
      
      console.error(`❌ Background task failed: ${task.name}`, error);
      
      // 失敗したタスクの次回実行を遅延
      if (task.interval) {
        task.nextExecution = Date.now() + task.interval * 2; // 2倍の間隔で再試行
      }
      
    } finally {
      task.isRunning = false;
      this.currentlyRunning.delete(task.id);
    }
  }

  /**
   * タスク統計更新
   */
  private updateTaskStats(task: BackgroundTask, executionTime: number, success: boolean): void {
    task.executionCount++;
    
    if (success) {
      task.totalExecutionTime += executionTime;
      task.averageExecutionTime = task.totalExecutionTime / task.executionCount;
    } else {
      task.failureCount++;
    }
  }

  /**
   * 処理削減判定
   */
  private async shouldReduceProcessing(): Promise<boolean> {
    if (!this.batteryOptimization.enabled) {
      return false;
    }
    
    // バッテリーレベル取得（モック実装）
    const batteryLevel = await this.getBatteryLevel();
    
    return batteryLevel < this.batteryOptimization.lowBatteryThreshold;
  }

  /**
   * バッテリーレベル取得
   */
  private async getBatteryLevel(): Promise<number> {
    // 実際の実装では react-native-device-info などを使用
    // モック実装: 50-100%のランダム値
    return Math.random() * 50 + 50;
  }

  /**
   * 低優先度タスク一時停止
   */
  private pauseLowPriorityTasks(): void {
    this.taskQueue.low.forEach(task => {
      if (task.isRunning) {
        console.log(`⏸️ Pausing low priority task: ${task.name}`);
      }
    });
  }

  /**
   * 重要でないタスク一時停止
   */
  private pauseAllNonCriticalTasks(): void {
    ['medium', 'low'].forEach(priority => {
      this.taskQueue[priority as keyof TaskQueue].forEach(task => {
        if (task.isRunning) {
          console.log(`⏸️ Pausing non-critical task: ${task.name}`);
        }
      });
    });
  }

  /**
   * 一時停止タスク再開
   */
  private resumePausedTasks(): void {
    console.log('▶️ Resuming paused background tasks');
    // 特別な処理は不要（processQueueで自動的に再開される）
  }

  /**
   * 処理頻度調整
   */
  private adjustProcessingFrequency(ratio: number): void {
    const newInterval = Math.floor(1000 / ratio); // 基本1秒間隔を調整
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = setInterval(() => {
        this.processQueue();
      }, newInterval);
    }
    
    console.log(`⚡ Processing frequency adjusted: ${ratio * 100}% (${newInterval}ms interval)`);
  }

  /**
   * 統計情報取得
   */
  getProcessingStats(): BackgroundProcessingStats {
    const allTasks = Array.from(this.tasks.values());
    const totalTasks = allTasks.length;
    const runningTasks = allTasks.filter(task => task.isRunning).length;
    const completedTasks = allTasks.filter(task => task.executionCount > 0).length;
    const failedTasks = allTasks.filter(task => task.failureCount > 0).length;
    
    const totalExecutionTime = allTasks.reduce((sum, task) => sum + task.totalExecutionTime, 0);
    const totalExecutions = allTasks.reduce((sum, task) => sum + task.executionCount, 0);
    const averageExecutionTime = totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0;
    
    return {
      totalTasks,
      runningTasks,
      completedTasks,
      failedTasks,
      averageExecutionTime,
      cpuUsage: this.estimateCPUUsage(),
    };
  }

  /**
   * CPU使用率推定
   */
  private estimateCPUUsage(): number {
    const runningTasksCount = this.currentlyRunning.size;
    const maxConcurrency = this.maxConcurrentTasks;
    
    // 簡易的なCPU使用率推定
    return (runningTasksCount / maxConcurrency) * 100;
  }

  /**
   * バッテリー最適化設定更新
   */
  updateBatteryOptimization(settings: Partial<typeof this.batteryOptimization>): void {
    this.batteryOptimization = { ...this.batteryOptimization, ...settings };
    console.log('🔋 Battery optimization settings updated:', this.batteryOptimization);
  }

  /**
   * 同時実行数制限更新
   */
  setMaxConcurrentTasks(limit: number): void {
    this.maxConcurrentTasks = Math.max(1, Math.min(limit, 10)); // 1-10の範囲で制限
    console.log(`⚙️ Max concurrent tasks set to: ${this.maxConcurrentTasks}`);
  }

  /**
   * 緊急時全タスク停止
   */
  emergencyStop(): void {
    console.log('🚨 Emergency stop: halting all background tasks');
    
    this.stopProcessingLoop();
    this.currentlyRunning.clear();
    
    // 全タスクを停止状態に変更
    this.tasks.forEach(task => {
      task.isRunning = false;
    });
  }

  /**
   * サービス再開
   */
  resume(): void {
    console.log('▶️ Resuming background processing service');
    this.startProcessingLoop();
  }
}

export const backgroundProcessor = new BackgroundProcessingOptimizationService();
