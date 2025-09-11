/**
 * バックグラウンド処理 (4時間実装)
 * Background Processing Service
 * 
 * バックグラウンドでの定期処理とタスク管理
 * - 期限チェックの定期実行
 * - 通知スケジューリング
 * - データ同期処理
 * - バックグラウンドタスク管理
 * - パフォーマンス最適化
 * - エラーハンドリングと復旧
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

import { expirationCalculationService } from './ExpirationCalculationService';
import { localNotificationService } from './LocalNotificationService';

// =============================================================================
// BACKGROUND PROCESSING TYPES
// =============================================================================

export interface BackgroundTaskConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxExecutionTimeMinutes: number;
  retryAttempts: number;
  retryDelayMinutes: number;
  executeOnAppResume: boolean;
  executeOnBatteryOptimized: boolean;
}

export interface BackgroundTaskStatus {
  taskId: string;
  taskName: string;
  isRunning: boolean;
  lastExecuted?: Date;
  nextScheduled?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number; // milliseconds
  lastError?: string;
  isEnabled: boolean;
}

export interface BackgroundProcessingConfig {
  tasks: {
    expirationCheck: BackgroundTaskConfig;
    notificationScheduling: BackgroundTaskConfig;
    dataCleanup: BackgroundTaskConfig;
    analytics: BackgroundTaskConfig;
    sync: BackgroundTaskConfig;
  };
  performanceSettings: {
    maxConcurrentTasks: number;
    lowBatteryModeEnabled: boolean;
    wifiOnlyMode: boolean;
    respectDoNotDisturb: boolean;
  };
  debugSettings: {
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    maxLogEntries: number;
  };
}

export interface BackgroundExecutionResult {
  success: boolean;
  executionTime: number;
  result?: any;
  error?: string;
  metrics?: {
    itemsProcessed: number;
    notificationsScheduled: number;
    dataSize: number;
  };
}

export interface BackgroundSchedule {
  taskId: string;
  cronExpression?: string;
  intervalMinutes?: number;
  nextExecution: Date;
  isActive: boolean;
  priority: number;
}

// =============================================================================
// BACKGROUND PROCESSING SERVICE
// =============================================================================

export class BackgroundProcessingService {
  private config: BackgroundProcessingConfig;
  private taskStatuses: Map<string, BackgroundTaskStatus> = new Map();
  private activeJobs: Map<string, any> = new Map();
  private appStateListener?: any;
  private isInitialized = false;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.config = this.getDefaultConfig();
    this.performanceMonitor = new PerformanceMonitor();
    this.setupAppStateListener();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION AND SETUP
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing Background Processing Service...');

      // Load configuration and status
      await this.loadConfig();
      await this.loadTaskStatuses();

      // Initialize performance monitoring
      await this.performanceMonitor.initialize();

      // Start enabled background tasks
      await this.startEnabledTasks();

      this.isInitialized = true;
      console.log('✅ Background Processing Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize background processing service:', error);
      throw error;
    }
  }

  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log(`📱 App state changed to: ${nextAppState}`);

    if (nextAppState === 'active') {
      // App resumed from background
      await this.handleAppResume();
    } else if (nextAppState === 'background') {
      // App went to background
      await this.handleAppBackground();
    }
  }

  private async handleAppResume(): Promise<void> {
    try {
      console.log('🔄 Handling app resume...');

      // Execute tasks that should run on app resume
      const resumeTasks = this.getTasksForAppResume();
      for (const taskId of resumeTasks) {
        await this.executeTask(taskId);
      }

      // Reschedule pending notifications
      await this.rescheduleNotifications();

      console.log('✅ App resume handling completed');
    } catch (error) {
      console.error('❌ Error handling app resume:', error);
    }
  }

  private async handleAppBackground(): Promise<void> {
    try {
      console.log('🔄 Handling app background...');

      // Start critical background tasks
      await this.startCriticalBackgroundTasks();

      console.log('✅ App background handling completed');
    } catch (error) {
      console.error('❌ Error handling app background:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // TASK MANAGEMENT
  // ---------------------------------------------------------------------------

  async startTask(taskId: string): Promise<boolean> {
    try {
      const taskConfig = this.getTaskConfig(taskId);
      if (!taskConfig || !taskConfig.enabled) {
        console.log(`⏸️ Task ${taskId} is disabled`);
        return false;
      }

      if (this.activeJobs.has(taskId)) {
        console.log(`⚠️ Task ${taskId} is already running`);
        return false;
      }

      console.log(`▶️ Starting background task: ${taskId}`);

      // Use JavaScript intervals instead of native background jobs
      const intervalId = setInterval(async () => {
        await this.executeTask(taskId);
      }, taskConfig.intervalMinutes * 60 * 1000);

      this.activeJobs.set(taskId, intervalId);

      // Update task status
      const status = this.getOrCreateTaskStatus(taskId);
      status.isRunning = true;
      status.isEnabled = true;

      await this.saveTaskStatuses();

      console.log(`✅ Background task started: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to start task ${taskId}:`, error);
      return false;
    }
  }

  async stopTask(taskId: string): Promise<boolean> {
    try {
      console.log(`⏹️ Stopping background task: ${taskId}`);

      const intervalId = this.activeJobs.get(taskId);
      if (intervalId) {
        clearInterval(intervalId);
        this.activeJobs.delete(taskId);
      }

      // Update task status
      const status = this.taskStatuses.get(taskId);
      if (status) {
        status.isRunning = false;
      }

      await this.saveTaskStatuses();

      console.log(`✅ Background task stopped: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop task ${taskId}:`, error);
      return false;
    }
  }

  async executeTask(taskId: string): Promise<BackgroundExecutionResult> {
    const startTime = Date.now();
    let result: BackgroundExecutionResult = {
      success: false,
      executionTime: 0,
    };

    try {
      console.log(`🔄 Executing task: ${taskId}`);

      // Check if task should be executed based on conditions
      if (!(await this.shouldExecuteTask(taskId))) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          error: 'Task execution conditions not met',
        };
      }

      // Execute the specific task
      switch (taskId) {
        case 'expirationCheck':
          result = await this.executeExpirationCheck();
          break;
        case 'notificationScheduling':
          result = await this.executeNotificationScheduling();
          break;
        case 'dataCleanup':
          result = await this.executeDataCleanup();
          break;
        case 'analytics':
          result = await this.executeAnalytics();
          break;
        case 'sync':
          result = await this.executeSync();
          break;
        default:
          throw new Error(`Unknown task: ${taskId}`);
      }

      result.executionTime = Date.now() - startTime;

      // Update task status
      await this.updateTaskStatus(taskId, result);

      console.log(`✅ Task completed: ${taskId} (${result.executionTime}ms)`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      result = {
        success: false,
        executionTime,
        error: errorMessage,
      };

      await this.updateTaskStatus(taskId, result);

      console.error(`❌ Task failed: ${taskId} - ${errorMessage}`);
      return result;
    }
  }

  // ---------------------------------------------------------------------------
  // SPECIFIC TASK IMPLEMENTATIONS
  // ---------------------------------------------------------------------------

  private async executeExpirationCheck(): Promise<BackgroundExecutionResult> {
    try {
      console.log('🔍 Executing expiration check...');

      // Calculate expiration alerts
      const alerts = await expirationCalculationService.calculateExpirationAlerts();
      
      // Schedule notifications for new alerts
      let notificationsScheduled = 0;
      for (const alert of alerts) {
        if (!alert.isAcknowledged) {
          const notificationId = await localNotificationService.scheduleNotification(alert);
          if (notificationId) {
            notificationsScheduled++;
          }
        }
      }

      console.log(`✅ Expiration check completed: ${alerts.length} alerts, ${notificationsScheduled} notifications`);

      return {
        success: true,
        executionTime: 0, // Will be set by caller
        result: { alerts, notificationsScheduled },
        metrics: {
          itemsProcessed: alerts.length,
          notificationsScheduled,
          dataSize: alerts.length * 1024, // Estimate
        },
      };
    } catch (error) {
      throw new Error(`Expiration check failed: ${error}`);
    }
  }

  private async executeNotificationScheduling(): Promise<BackgroundExecutionResult> {
    try {
      console.log('🔔 Executing notification scheduling...');

      // Get pending alerts that need notifications
      const activeAlerts = await expirationCalculationService.getActiveAlerts();
      
      let scheduledCount = 0;
      for (const alert of activeAlerts) {
        const notificationId = await localNotificationService.scheduleNotification(alert);
        if (notificationId) {
          scheduledCount++;
        }
      }

      console.log(`✅ Notification scheduling completed: ${scheduledCount} scheduled`);

      return {
        success: true,
        executionTime: 0,
        result: { scheduledCount },
        metrics: {
          itemsProcessed: activeAlerts.length,
          notificationsScheduled: scheduledCount,
          dataSize: activeAlerts.length * 512,
        },
      };
    } catch (error) {
      throw new Error(`Notification scheduling failed: ${error}`);
    }
  }

  private async executeDataCleanup(): Promise<BackgroundExecutionResult> {
    try {
      console.log('🧹 Executing data cleanup...');

      let itemsProcessed = 0;

      // Clean up old notifications
      const notifications = await localNotificationService.getScheduledNotifications();
      const oldNotifications = notifications.filter(n => 
        n.deliveredAt && 
        n.deliveredAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
      );
      
      for (const notification of oldNotifications) {
        await localNotificationService.cancelNotification(notification.id);
        itemsProcessed++;
      }

      // Clean up old log entries
      await this.performanceMonitor.cleanupOldLogs();

      console.log(`✅ Data cleanup completed: ${itemsProcessed} items processed`);

      return {
        success: true,
        executionTime: 0,
        result: { cleanedItems: itemsProcessed },
        metrics: {
          itemsProcessed,
          notificationsScheduled: 0,
          dataSize: itemsProcessed * 256,
        },
      };
    } catch (error) {
      throw new Error(`Data cleanup failed: ${error}`);
    }
  }

  private async executeAnalytics(): Promise<BackgroundExecutionResult> {
    try {
      console.log('📊 Executing analytics...');

      // Analyze consumption patterns
      await expirationCalculationService.analyzeConsumptionPatterns();

      // Generate notification statistics
      const notificationStats = await localNotificationService.getNotificationStatistics();

      // Update performance metrics
      await this.performanceMonitor.updateMetrics();

      console.log('✅ Analytics execution completed');

      return {
        success: true,
        executionTime: 0,
        result: { notificationStats },
        metrics: {
          itemsProcessed: 1,
          notificationsScheduled: 0,
          dataSize: JSON.stringify(notificationStats).length,
        },
      };
    } catch (error) {
      throw new Error(`Analytics execution failed: ${error}`);
    }
  }

  private async executeSync(): Promise<BackgroundExecutionResult> {
    try {
      console.log('🔄 Executing sync...');

      // Placeholder for sync functionality
      // In a real implementation, this would sync with cloud services
      
      console.log('✅ Sync execution completed');

      return {
        success: true,
        executionTime: 0,
        result: { synced: true },
        metrics: {
          itemsProcessed: 0,
          notificationsScheduled: 0,
          dataSize: 0,
        },
      };
    } catch (error) {
      throw new Error(`Sync execution failed: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TASK CONDITION CHECKING
  // ---------------------------------------------------------------------------

  private async shouldExecuteTask(taskId: string): Promise<boolean> {
    const config = this.getTaskConfig(taskId);
    if (!config || !config.enabled) {
      return false;
    }

    // Check battery optimization
    if (!config.executeOnBatteryOptimized && await this.isBatteryOptimized()) {
      console.log(`⚡ Skipping task ${taskId} due to battery optimization`);
      return false;
    }

    // Check if task is already running
    if (this.activeJobs.has(taskId)) {
      console.log(`⚠️ Task ${taskId} is already running`);
      return false;
    }

    // Check execution interval
    const status = this.taskStatuses.get(taskId);
    if (status?.lastExecuted) {
      const timeSinceLastExecution = Date.now() - status.lastExecuted.getTime();
      const requiredInterval = config.intervalMinutes * 60 * 1000;
      
      if (timeSinceLastExecution < requiredInterval) {
        console.log(`⏰ Task ${taskId} executed recently, skipping`);
        return false;
      }
    }

    return true;
  }

  private async isBatteryOptimized(): Promise<boolean> {
    // Placeholder for battery optimization check
    // In a real implementation, this would check device battery settings
    return false;
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private getTaskConfig(taskId: string): BackgroundTaskConfig | null {
    switch (taskId) {
      case 'expirationCheck':
        return this.config.tasks.expirationCheck;
      case 'notificationScheduling':
        return this.config.tasks.notificationScheduling;
      case 'dataCleanup':
        return this.config.tasks.dataCleanup;
      case 'analytics':
        return this.config.tasks.analytics;
      case 'sync':
        return this.config.tasks.sync;
      default:
        return null;
    }
  }

  private getOrCreateTaskStatus(taskId: string): BackgroundTaskStatus {
    let status = this.taskStatuses.get(taskId);
    if (!status) {
      status = {
        taskId,
        taskName: this.getTaskName(taskId),
        isRunning: false,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        isEnabled: true,
      };
      this.taskStatuses.set(taskId, status);
    }
    return status;
  }

  private getTaskName(taskId: string): string {
    const names: Record<string, string> = {
      expirationCheck: '期限チェック',
      notificationScheduling: '通知スケジューリング',
      dataCleanup: 'データクリーンアップ',
      analytics: '分析処理',
      sync: 'データ同期',
    };
    return names[taskId] || taskId;
  }

  private async updateTaskStatus(taskId: string, result: BackgroundExecutionResult): Promise<void> {
    const status = this.getOrCreateTaskStatus(taskId);
    
    status.lastExecuted = new Date();
    status.executionCount++;
    
    if (result.success) {
      status.successCount++;
    } else {
      status.failureCount++;
      status.lastError = result.error;
    }

    // Update average execution time
    const totalTime = status.averageExecutionTime * (status.executionCount - 1) + result.executionTime;
    status.averageExecutionTime = totalTime / status.executionCount;

    await this.saveTaskStatuses();
  }

  private getTasksForAppResume(): string[] {
    const resumeTasks: string[] = [];
    
    for (const [taskId, config] of Object.entries(this.config.tasks)) {
      if (config.executeOnAppResume) {
        resumeTasks.push(taskId);
      }
    }
    
    return resumeTasks;
  }

  private async startEnabledTasks(): Promise<void> {
    for (const taskId of Object.keys(this.config.tasks)) {
      const config = this.getTaskConfig(taskId);
      if (config?.enabled) {
        await this.startTask(taskId);
      }
    }
  }

  private async startCriticalBackgroundTasks(): Promise<void> {
    // Start only critical tasks when app goes to background
    const criticalTasks = ['expirationCheck', 'notificationScheduling'];
    
    for (const taskId of criticalTasks) {
      const config = this.getTaskConfig(taskId);
      if (config?.enabled) {
        await this.startTask(taskId);
      }
    }
  }

  private async rescheduleNotifications(): Promise<void> {
    try {
      // Get active alerts and reschedule notifications
      const activeAlerts = await expirationCalculationService.getActiveAlerts();
      
      for (const alert of activeAlerts) {
        await localNotificationService.scheduleNotification(alert);
      }
      
      console.log(`🔔 Rescheduled notifications for ${activeAlerts.length} alerts`);
    } catch (error) {
      console.error('Failed to reschedule notifications:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private async loadConfig(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('background_processing_config');
      if (configJson) {
        const loadedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...loadedConfig };
      }
    } catch (error) {
      console.error('Failed to load background processing config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('background_processing_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save background processing config:', error);
    }
  }

  private async loadTaskStatuses(): Promise<void> {
    try {
      const statusesJson = await AsyncStorage.getItem('background_task_statuses');
      if (statusesJson) {
        const statuses: BackgroundTaskStatus[] = JSON.parse(statusesJson);
        statuses.forEach(status => {
          if (status.lastExecuted) {
            status.lastExecuted = new Date(status.lastExecuted);
          }
          if (status.nextScheduled) {
            status.nextScheduled = new Date(status.nextScheduled);
          }
          this.taskStatuses.set(status.taskId, status);
        });
      }
    } catch (error) {
      console.error('Failed to load task statuses:', error);
    }
  }

  private async saveTaskStatuses(): Promise<void> {
    try {
      const statuses = Array.from(this.taskStatuses.values());
      await AsyncStorage.setItem('background_task_statuses', JSON.stringify(statuses));
    } catch (error) {
      console.error('Failed to save task statuses:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async updateConfig(newConfig: Partial<BackgroundProcessingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    console.log('⚙️ Background processing config updated');
  }

  getConfig(): BackgroundProcessingConfig {
    return { ...this.config };
  }

  async getTaskStatuses(): Promise<BackgroundTaskStatus[]> {
    return Array.from(this.taskStatuses.values());
  }

  async getTaskStatus(taskId: string): Promise<BackgroundTaskStatus | null> {
    return this.taskStatuses.get(taskId) || null;
  }

  async enableTask(taskId: string): Promise<boolean> {
    const config = this.getTaskConfig(taskId);
    if (!config) return false;

    config.enabled = true;
    await this.saveConfig();
    return this.startTask(taskId);
  }

  async disableTask(taskId: string): Promise<boolean> {
    const config = this.getTaskConfig(taskId);
    if (!config) return false;

    config.enabled = false;
    await this.saveConfig();
    return this.stopTask(taskId);
  }

  async executeTaskManually(taskId: string): Promise<BackgroundExecutionResult> {
    return this.executeTask(taskId);
  }

  dispose(): void {
    // Stop all active jobs
    for (const [taskId] of this.activeJobs) {
      this.stopTask(taskId);
    }

    // Remove app state listener
    if (this.appStateListener) {
      this.appStateListener.remove();
    }

    console.log('🔚 Background Processing Service disposed');
  }

  // ---------------------------------------------------------------------------
  // DEFAULT CONFIGURATION
  // ---------------------------------------------------------------------------

  private getDefaultConfig(): BackgroundProcessingConfig {
    return {
      tasks: {
        expirationCheck: {
          enabled: true,
          intervalMinutes: 30,
          maxExecutionTimeMinutes: 5,
          retryAttempts: 3,
          retryDelayMinutes: 5,
          executeOnAppResume: true,
          executeOnBatteryOptimized: true,
        },
        notificationScheduling: {
          enabled: true,
          intervalMinutes: 15,
          maxExecutionTimeMinutes: 2,
          retryAttempts: 3,
          retryDelayMinutes: 2,
          executeOnAppResume: true,
          executeOnBatteryOptimized: true,
        },
        dataCleanup: {
          enabled: true,
          intervalMinutes: 240, // 4 hours
          maxExecutionTimeMinutes: 10,
          retryAttempts: 2,
          retryDelayMinutes: 30,
          executeOnAppResume: false,
          executeOnBatteryOptimized: false,
        },
        analytics: {
          enabled: true,
          intervalMinutes: 60,
          maxExecutionTimeMinutes: 5,
          retryAttempts: 2,
          retryDelayMinutes: 10,
          executeOnAppResume: false,
          executeOnBatteryOptimized: false,
        },
        sync: {
          enabled: false,
          intervalMinutes: 120,
          maxExecutionTimeMinutes: 10,
          retryAttempts: 3,
          retryDelayMinutes: 15,
          executeOnAppResume: true,
          executeOnBatteryOptimized: false,
        },
      },
      performanceSettings: {
        maxConcurrentTasks: 2,
        lowBatteryModeEnabled: true,
        wifiOnlyMode: false,
        respectDoNotDisturb: true,
      },
      debugSettings: {
        enableLogging: true,
        logLevel: 'info',
        maxLogEntries: 1000,
      },
    };
  }
}

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

class PerformanceMonitor {
  private logs: any[] = [];
  private metrics: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    console.log('📊 Performance Monitor initialized');
  }

  async updateMetrics(): Promise<void> {
    // Update performance metrics
    this.metrics.set('lastUpdate', Date.now());
  }

  async cleanupOldLogs(): Promise<void> {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - maxAge;
    
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    console.log(`🧹 Cleaned up old performance logs`);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const backgroundProcessingService = new BackgroundProcessingService();
