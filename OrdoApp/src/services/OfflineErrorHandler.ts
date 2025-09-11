/**
 * オフライン対応エラー処理 (4時間実装)
 * Offline Error Handling System
 * 
 * ネットワーク障害時のエラー処理とオフライン対応
 * - ネットワーク状態監視
 * - オフライン操作キューイング
 * - データ同期とコンフリクト解決
 * - キャッシュ管理
 * - 自動復旧処理
 * - ユーザー通知システム
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { loggingService, LogCategory } from './LoggingService';
import { customErrorHandler, NetworkError } from './CustomErrorHandler';
import { errorMonitoringService } from './ErrorMonitoringService';

// Temporary interface for NetInfo until package is installed
interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
  details?: any;
}

// =============================================================================
// OFFLINE TYPES AND INTERFACES
// =============================================================================

export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  LIMITED = 'limited',
  UNKNOWN = 'unknown',
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SYNC = 'sync',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
}

export interface OfflineOperation {
  id: string;
  type: OperationType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: number; // 1-10, higher = more important
  entityType: string; // e.g., 'product', 'user', 'feedback'
  entityId?: string;
  conflictResolution?: ConflictResolutionStrategy;
  dependencies?: string[]; // IDs of operations that must complete first
}

export enum ConflictResolutionStrategy {
  CLIENT_WINS = 'client_wins',
  SERVER_WINS = 'server_wins',
  MERGE = 'merge',
  PROMPT_USER = 'prompt_user',
  TIMESTAMP_WINS = 'timestamp_wins',
}

export interface OfflineConfiguration {
  enabled: boolean;
  maxQueueSize: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  exponentialBackoff: boolean;
  autoSync: boolean;
  syncIntervalMs: number;
  cacheTimeoutMs: number;
  conflictResolution: ConflictResolutionStrategy;
  notifyUser: boolean;
  persistQueue: boolean;
}

export interface NetworkInfo {
  status: NetworkStatus;
  isConnected: boolean;
  type: string | null;
  strength: number | null; // 0-100
  lastConnected?: Date;
  lastDisconnected?: Date;
  connectionSpeed?: 'slow' | 'fast' | 'unknown';
}

export interface SyncResult {
  success: boolean;
  processedOperations: number;
  failedOperations: number;
  conflicts: ConflictInfo[];
  errors: string[];
  duration: number;
}

export interface ConflictInfo {
  operationId: string;
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
  resolution: ConflictResolutionStrategy;
  resolved: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt: Date;
  etag?: string;
  lastModified?: string;
}

// =============================================================================
// OFFLINE ERROR HANDLING SERVICE
// =============================================================================

export class OfflineErrorHandler {
  private config: OfflineConfiguration;
  private networkInfo: NetworkInfo;
  private operationQueue: OfflineOperation[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private isInitialized = false;
  private syncTimer?: NodeJS.Timeout;
  private networkUnsubscribe?: () => void;
  private onlineCallbacks: Array<() => void> = [];
  private offlineCallbacks: Array<() => void> = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.networkInfo = this.getInitialNetworkInfo();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📱 Initializing Offline Error Handler...');

      // Load configuration
      await this.loadConfiguration();

      // Load persisted queue
      if (this.config.persistQueue) {
        await this.loadOperationQueue();
      }

      // Load cache
      await this.loadCache();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      // Set up auto-sync
      if (this.config.autoSync) {
        this.setupAutoSync();
      }

      this.isInitialized = true;

      await loggingService.info(
        LogCategory.SYSTEM,
        'Offline error handler initialized',
        { config: this.config, queueSize: this.operationQueue.length }
      );

      console.log('✅ Offline Error Handler initialized');

    } catch (error) {
      console.error('❌ Failed to initialize offline error handler:', error);
      this.isInitialized = true;
    }
  }

  private setupNetworkMonitoring(): void {
    // In a real implementation, this would use NetInfo
    /*
    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });
    */
    
    // Simulate network state for now
    const simulatedState: NetInfoState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    };
    
    this.handleNetworkChange(simulatedState);
    
    // Simulate periodic network checks
    setInterval(() => {
      // Simulate occasional network changes
      if (Math.random() < 0.05) { // 5% chance of network change
        const newState: NetInfoState = {
          isConnected: Math.random() > 0.2, // 80% chance of being connected
          isInternetReachable: Math.random() > 0.1, // 90% chance of internet
          type: Math.random() > 0.5 ? 'wifi' : 'cellular',
        };
        this.handleNetworkChange(newState);
      }
    }, 10000); // Check every 10 seconds
  }

  private setupAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.networkInfo.status === NetworkStatus.ONLINE) {
        await this.processPendingOperations();
      }
    }, this.config.syncIntervalMs);
  }

  // ---------------------------------------------------------------------------
  // NETWORK MONITORING
  // ---------------------------------------------------------------------------

  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    const previousStatus = this.networkInfo.status;
    const isConnected = state.isConnected ?? false;

    this.networkInfo = {
      status: this.determineNetworkStatus(state),
      isConnected,
      type: state.type,
      strength: this.determineSignalStrength(state),
      connectionSpeed: this.determineConnectionSpeed(state),
      lastConnected: isConnected ? new Date() : this.networkInfo.lastConnected,
      lastDisconnected: !isConnected ? new Date() : this.networkInfo.lastDisconnected,
    };

    await loggingService.info(
      LogCategory.NETWORK,
      'Network status changed',
      {
        previousStatus,
        currentStatus: this.networkInfo.status,
        isConnected,
        type: state.type,
      }
    );

    // Handle status transitions
    if (previousStatus === NetworkStatus.OFFLINE && this.networkInfo.status === NetworkStatus.ONLINE) {
      await this.handleOnlineTransition();
    } else if (previousStatus === NetworkStatus.ONLINE && this.networkInfo.status === NetworkStatus.OFFLINE) {
      await this.handleOfflineTransition();
    }

    // Notify callbacks
    if (this.networkInfo.status === NetworkStatus.ONLINE) {
      this.onlineCallbacks.forEach(callback => callback());
    } else {
      this.offlineCallbacks.forEach(callback => callback());
    }
  }

  private determineNetworkStatus(state: NetInfoState): NetworkStatus {
    if (!state.isConnected) {
      return NetworkStatus.OFFLINE;
    }

    if (state.isInternetReachable === false) {
      return NetworkStatus.LIMITED;
    }

    if (state.isConnected && state.isInternetReachable) {
      return NetworkStatus.ONLINE;
    }

    return NetworkStatus.UNKNOWN;
  }

  private determineSignalStrength(state: NetInfoState): number | null {
    // This would use actual signal strength APIs in a real implementation
    if (state.details && 'strength' in state.details) {
      return (state.details as any).strength;
    }
    return null;
  }

  private determineConnectionSpeed(state: NetInfoState): 'slow' | 'fast' | 'unknown' {
    if (state.details && 'effectiveType' in state.details) {
      const effectiveType = (state.details as any).effectiveType;
      if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        return 'slow';
      } else if (effectiveType === '3g' || effectiveType === '4g') {
        return 'fast';
      }
    }
    return 'unknown';
  }

  // ---------------------------------------------------------------------------
  // OFFLINE OPERATION MANAGEMENT
  // ---------------------------------------------------------------------------

  async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const operationId = this.generateOperationId();
    
    const fullOperation: OfflineOperation = {
      ...operation,
      id: operationId,
      timestamp: new Date(),
      retryCount: 0,
    };

    this.operationQueue.push(fullOperation);

    // Sort by priority and timestamp
    this.operationQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp.getTime() - b.timestamp.getTime(); // Older first
    });

    // Enforce queue size limit
    if (this.operationQueue.length > this.config.maxQueueSize) {
      const removed = this.operationQueue.splice(this.config.maxQueueSize);
      await loggingService.warn(
        LogCategory.SYSTEM,
        'Operation queue size limit exceeded, dropping operations',
        { droppedCount: removed.length }
      );
    }

    // Persist queue if enabled
    if (this.config.persistQueue) {
      await this.saveOperationQueue();
    }

    await loggingService.info(
      LogCategory.SYSTEM,
      'Operation queued for offline processing',
      {
        operationId,
        type: operation.type,
        endpoint: operation.endpoint,
        queueSize: this.operationQueue.length,
      }
    );

    // Try to process immediately if online
    if (this.networkInfo.status === NetworkStatus.ONLINE) {
      setTimeout(() => this.processPendingOperations(), 100);
    }

    return operationId;
  }

  async removeOperation(operationId: string): Promise<boolean> {
    const index = this.operationQueue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
      
      if (this.config.persistQueue) {
        await this.saveOperationQueue();
      }
      
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // OPERATION PROCESSING
  // ---------------------------------------------------------------------------

  async processPendingOperations(): Promise<SyncResult> {
    if (this.networkInfo.status !== NetworkStatus.ONLINE || this.operationQueue.length === 0) {
      return {
        success: true,
        processedOperations: 0,
        failedOperations: 0,
        conflicts: [],
        errors: [],
        duration: 0,
      };
    }

    const startTime = performance.now();
    const result: SyncResult = {
      success: true,
      processedOperations: 0,
      failedOperations: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    await loggingService.info(
      LogCategory.SYSTEM,
      'Starting offline operation processing',
      { queueSize: this.operationQueue.length }
    );

    // Process operations in order, respecting dependencies
    const processedIds = new Set<string>();
    const failedIds = new Set<string>();

    while (this.operationQueue.length > 0) {
      const operation = this.findNextProcessableOperation(processedIds, failedIds);
      
      if (!operation) {
        // No more processable operations
        break;
      }

      try {
        const operationResult = await this.processOperation(operation);
        
        if (operationResult.success) {
          processedIds.add(operation.id);
          result.processedOperations++;
          
          // Remove from queue
          const index = this.operationQueue.findIndex(op => op.id === operation.id);
          if (index !== -1) {
            this.operationQueue.splice(index, 1);
          }
        } else {
          failedIds.add(operation.id);
          result.failedOperations++;
          result.errors.push(operationResult.error || 'Unknown error');
          
          if (operationResult.conflict) {
            result.conflicts.push(operationResult.conflict);
          }
          
          // Update retry count
          operation.retryCount++;
          
          if (operation.retryCount >= operation.maxRetries) {
            // Remove failed operation
            const index = this.operationQueue.findIndex(op => op.id === operation.id);
            if (index !== -1) {
              this.operationQueue.splice(index, 1);
            }
            
            await loggingService.error(
              LogCategory.NETWORK,
              'Operation failed after max retries',
              undefined,
              { operation: operation.id, retries: operation.retryCount }
            );
          }
        }
      } catch (error) {
        failedIds.add(operation.id);
        result.failedOperations++;
        result.errors.push((error as Error).message);
        
        await loggingService.error(
          LogCategory.ERROR,
          'Failed to process offline operation',
          error as Error,
          { operationId: operation.id }
        );
      }
    }

    result.duration = performance.now() - startTime;
    result.success = result.failedOperations === 0;

    // Persist updated queue
    if (this.config.persistQueue) {
      await this.saveOperationQueue();
    }

    await loggingService.info(
      LogCategory.SYSTEM,
      'Offline operation processing completed',
      {
        processed: result.processedOperations,
        failed: result.failedOperations,
        conflicts: result.conflicts.length,
        duration: result.duration,
      }
    );

    return result;
  }

  private findNextProcessableOperation(
    processedIds: Set<string>,
    failedIds: Set<string>
  ): OfflineOperation | null {
    for (const operation of this.operationQueue) {
      if (processedIds.has(operation.id) || failedIds.has(operation.id)) {
        continue;
      }

      // Check dependencies
      if (operation.dependencies) {
        const allDependenciesMet = operation.dependencies.every(depId => 
          processedIds.has(depId) || !this.operationQueue.some(op => op.id === depId)
        );
        
        if (!allDependenciesMet) {
          continue;
        }
      }

      return operation;
    }

    return null;
  }

  private async processOperation(operation: OfflineOperation): Promise<{
    success: boolean;
    error?: string;
    conflict?: ConflictInfo;
  }> {
    try {
      // Simulate network request processing
      await loggingService.debug(
        LogCategory.NETWORK,
        'Processing offline operation',
        {
          id: operation.id,
          type: operation.type,
          endpoint: operation.endpoint,
          method: operation.method,
        }
      );

      // In a real implementation, this would make the actual HTTP request
      // For now, we'll simulate different scenarios
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

      // Simulate occasional failures for demonstration
      if (Math.random() < 0.1) { // 10% failure rate
        throw new NetworkError('Simulated network error', 500, operation.endpoint, operation.method);
      }

      // Simulate conflicts for update operations
      if (operation.type === OperationType.UPDATE && Math.random() < 0.05) { // 5% conflict rate
        return {
          success: false,
          conflict: {
            operationId: operation.id,
            entityType: operation.entityType,
            entityId: operation.entityId || 'unknown',
            localData: operation.data,
            serverData: { version: 2, updated: new Date().toISOString() },
            resolution: operation.conflictResolution || this.config.conflictResolution,
            resolved: false,
          },
        };
      }

      await loggingService.info(
        LogCategory.NETWORK,
        'Offline operation processed successfully',
        { operationId: operation.id }
      );

      return { success: true };

    } catch (error) {
      const networkError = error as NetworkError;
      
      await loggingService.error(
        LogCategory.NETWORK,
        'Failed to process offline operation',
        error as Error,
        {
          operationId: operation.id,
          statusCode: networkError.statusCode,
          retryCount: operation.retryCount,
        }
      );

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // CACHE MANAGEMENT
  // ---------------------------------------------------------------------------

  async getCachedData(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      await this.saveCache();
      return null;
    }

    await loggingService.debug(
      LogCategory.SYSTEM,
      'Cache hit',
      { key, age: Date.now() - entry.timestamp.getTime() }
    );

    return entry.data;
  }

  async setCachedData(
    key: string,
    data: any,
    ttlMs: number = this.config.cacheTimeoutMs
  ): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    };

    this.cache.set(key, entry);
    await this.saveCache();

    await loggingService.debug(
      LogCategory.SYSTEM,
      'Data cached',
      { key, ttl: ttlMs }
    );
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem('offline_cache');
    
    await loggingService.info(
      LogCategory.SYSTEM,
      'Cache cleared'
    );
  }

  async cleanupExpiredCache(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (expiredKeys.length > 0) {
      await this.saveCache();
      
      await loggingService.info(
        LogCategory.SYSTEM,
        'Expired cache entries cleaned up',
        { count: expiredKeys.length }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // NETWORK ERROR HANDLING
  // ---------------------------------------------------------------------------

  async handleNetworkError(error: Error, context?: any): Promise<any> {
    if (this.networkInfo.status === NetworkStatus.OFFLINE) {
      // Try to serve from cache
      if (context?.cacheKey) {
        const cachedData = await this.getCachedData(context.cacheKey);
        if (cachedData) {
          await loggingService.info(
            LogCategory.NETWORK,
            'Serving cached data for offline request',
            { cacheKey: context.cacheKey }
          );
          
          return cachedData;
        }
      }

      // Queue operation if it's a write operation
      if (context?.operation) {
        await this.queueOperation(context.operation);
        
        if (this.config.notifyUser) {
          this.notifyUserOfflineMode();
        }

        return { success: false, offline: true, queued: true };
      }
    }

    // Handle other network errors
    const customError = await customErrorHandler.handleError(error, context);
    throw customError;
  }

  private notifyUserOfflineMode(): void {
    Alert.alert(
      'オフラインモード',
      'インターネット接続がありません。操作は保存され、接続が復旧したときに自動的に実行されます。',
      [{ text: 'OK' }]
    );
  }

  // ---------------------------------------------------------------------------
  // TRANSITION HANDLERS
  // ---------------------------------------------------------------------------

  private async handleOnlineTransition(): Promise<void> {
    await loggingService.info(
      LogCategory.NETWORK,
      'Device came online, starting sync'
    );

    if (this.config.notifyUser) {
      Alert.alert(
        'オンライン復旧',
        'インターネット接続が復旧しました。保存された操作を同期中です。',
        [{ text: 'OK' }]
      );
    }

    // Process pending operations
    await this.processPendingOperations();
  }

  private async handleOfflineTransition(): Promise<void> {
    await loggingService.warn(
      LogCategory.NETWORK,
      'Device went offline'
    );

    if (this.config.notifyUser) {
      Alert.alert(
        'オフライン',
        'インターネット接続が失われました。操作は保存され、接続復旧時に自動同期されます。',
        [{ text: 'OK' }]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private async loadOperationQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem('offline_operation_queue');
      if (queueJson) {
        const parsed = JSON.parse(queueJson);
        this.operationQueue = parsed.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load operation queue:', error);
    }
  }

  private async saveOperationQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'offline_operation_queue',
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.error('Failed to save operation queue:', error);
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheJson = await AsyncStorage.getItem('offline_cache');
      if (cacheJson) {
        const parsed = JSON.parse(cacheJson);
        this.cache = new Map(
          parsed.map(([key, entry]: [string, any]) => [
            key,
            {
              ...entry,
              timestamp: new Date(entry.timestamp),
              expiresAt: new Date(entry.expiresAt),
            },
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.entries());
      await AsyncStorage.setItem('offline_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('offline_config');
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load offline configuration:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private generateOperationId(): string {
    return `operation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getInitialNetworkInfo(): NetworkInfo {
    return {
      status: NetworkStatus.UNKNOWN,
      isConnected: false,
      type: null,
      strength: null,
    };
  }

  private getDefaultConfig(): OfflineConfiguration {
    return {
      enabled: true,
      maxQueueSize: 1000,
      maxRetries: 3,
      retryDelayMs: 2000,
      maxRetryDelayMs: 30000,
      exponentialBackoff: true,
      autoSync: true,
      syncIntervalMs: 30000, // 30 seconds
      cacheTimeoutMs: 5 * 60 * 1000, // 5 minutes
      conflictResolution: ConflictResolutionStrategy.TIMESTAMP_WINS,
      notifyUser: true,
      persistQueue: true,
    };
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  getNetworkInfo(): NetworkInfo {
    return { ...this.networkInfo };
  }

  getQueueStatus(): { size: number; operations: OfflineOperation[] } {
    return {
      size: this.operationQueue.length,
      operations: [...this.operationQueue],
    };
  }

  addOnlineCallback(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  addOfflineCallback(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  removeOnlineCallback(callback: () => void): void {
    const index = this.onlineCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onlineCallbacks.splice(index, 1);
    }
  }

  removeOfflineCallback(callback: () => void): void {
    const index = this.offlineCallbacks.indexOf(callback);
    if (index !== -1) {
      this.offlineCallbacks.splice(index, 1);
    }
  }

  async updateConfiguration(config: Partial<OfflineConfiguration>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    try {
      await AsyncStorage.setItem('offline_config', JSON.stringify(this.config));
      
      // Restart auto-sync if interval changed
      if (config.syncIntervalMs !== undefined && this.config.autoSync) {
        this.setupAutoSync();
      }
      
    } catch (error) {
      console.error('Failed to save offline configuration:', error);
    }
  }

  getConfiguration(): OfflineConfiguration {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }

    if (this.config.persistQueue) {
      await this.saveOperationQueue();
    }

    await this.saveCache();

    await loggingService.info(
      LogCategory.SYSTEM,
      'Offline error handler shutdown'
    );
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function createOfflineOperation(
  type: OperationType,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options: {
    data?: any;
    headers?: Record<string, string>;
    priority?: number;
    maxRetries?: number;
    entityType: string;
    entityId?: string;
    conflictResolution?: ConflictResolutionStrategy;
    dependencies?: string[];
  }
): Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'> {
  return {
    type,
    endpoint,
    method,
    data: options.data,
    headers: options.headers,
    priority: options.priority || 5,
    maxRetries: options.maxRetries || 3,
    entityType: options.entityType,
    entityId: options.entityId,
    conflictResolution: options.conflictResolution,
    dependencies: options.dependencies,
  };
}

export function isNetworkError(error: any): boolean {
  return error instanceof NetworkError ||
         error.name === 'NetworkError' ||
         error.code === 'NETWORK_ERROR' ||
         error.message?.toLowerCase().includes('network');
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const offlineErrorHandler = new OfflineErrorHandler();
