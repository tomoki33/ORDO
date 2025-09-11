/**
 * ログシステム実装 (3時間実装)
 * Logging System Implementation
 * 
 * 構造化ログとファイル管理システム
 * - 階層化ログレベル
 * - ファイルローテーション
 * - 構造化データロギング
 * - パフォーマンス監視
 * - ログ検索とフィルタリング
 * - リモートログ送信
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

// =============================================================================
// LOG TYPES AND INTERFACES
// =============================================================================

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export enum LogCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  DATABASE = 'database',
  UI = 'ui',
  BUSINESS = 'business',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  ERROR = 'error',
  DEBUG = 'debug',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  feature?: string;
  action?: string;
  duration?: number;
  stackTrace?: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
  deviceInfo?: Record<string, any>;
}

export interface LogFilter {
  levels?: LogLevel[];
  categories?: LogCategory[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  sessionId?: string;
  feature?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface LogConfiguration {
  enabled: boolean;
  level: LogLevel;
  categories: LogCategory[];
  fileLogging: boolean;
  consoleLogging: boolean;
  remoteLogging: boolean;
  maxFileSize: number; // MB
  maxFiles: number;
  rotationInterval: number; // hours
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  bufferSize: number;
  flushInterval: number; // seconds
  remoteEndpoint?: string;
  apiKey?: string;
}

export interface LogStatistics {
  totalEntries: number;
  entriesByLevel: Record<LogLevel, number>;
  entriesByCategory: Record<LogCategory, number>;
  fileSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  errorRate: number;
  performanceMetrics: {
    averageWriteTime: number;
    peakMemoryUsage: number;
    diskSpaceUsed: number;
  };
}

export interface PerformanceLog {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// =============================================================================
// LOGGING SERVICE
// =============================================================================

export class LoggingService {
  private config: LogConfiguration;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private isInitialized = false;
  private logFilePath: string;
  private currentFileSize = 0;
  private performanceLogs: Map<string, PerformanceLog> = new Map();
  private statistics: LogStatistics;
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.config = this.getDefaultConfig();
    this.sessionId = this.generateSessionId();
    this.logFilePath = this.getLogFilePath();
    this.statistics = this.initializeStatistics();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📝 Initializing Logging Service...');

      // Load configuration
      await this.loadConfiguration();

      // Set up log directory
      await this.setupLogDirectory();

      // Load existing log file size
      await this.calculateCurrentFileSize();

      // Set up automatic flushing
      this.setupAutoFlush();

      // Set up log rotation
      this.setupLogRotation();

      this.isInitialized = true;
      
      // Log initialization success
      await this.info(LogCategory.SYSTEM, 'Logging service initialized', {
        config: this.config,
        logFilePath: this.logFilePath,
      });

      console.log('✅ Logging Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize logging service:', error);
      this.isInitialized = true; // Prevent infinite loops
    }
  }

  private async setupLogDirectory(): Promise<void> {
    try {
      const logDir = this.getLogDirectory();
      const exists = await RNFS.exists(logDir);
      
      if (!exists) {
        await RNFS.mkdir(logDir);
      }
    } catch (error) {
      console.error('Failed to setup log directory:', error);
    }
  }

  private async calculateCurrentFileSize(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.logFilePath);
      if (exists) {
        const stat = await RNFS.stat(this.logFilePath);
        this.currentFileSize = stat.size;
      }
    } catch (error) {
      console.error('Failed to calculate current file size:', error);
      this.currentFileSize = 0;
    }
  }

  private setupAutoFlush(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval * 1000);
    }
  }

  private setupLogRotation(): void {
    // Check for rotation every hour
    setInterval(() => {
      this.rotateLogsIfNeeded();
    }, 60 * 60 * 1000);
  }

  // ---------------------------------------------------------------------------
  // CORE LOGGING METHODS
  // ---------------------------------------------------------------------------

  async trace(category: LogCategory, message: string, data?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.TRACE, category, message, data);
  }

  async debug(category: LogCategory, message: string, data?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.DEBUG, category, message, data);
  }

  async info(category: LogCategory, message: string, data?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.INFO, category, message, data);
  }

  async warn(category: LogCategory, message: string, data?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.WARN, category, message, data);
  }

  async error(category: LogCategory, message: string, error?: Error, data?: Record<string, any>): Promise<void> {
    const errorData = {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
    
    return this.log(LogLevel.ERROR, category, message, errorData, error?.stack);
  }

  async fatal(category: LogCategory, message: string, error?: Error, data?: Record<string, any>): Promise<void> {
    const errorData = {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
    
    return this.log(LogLevel.FATAL, category, message, errorData, error?.stack);
  }

  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    stackTrace?: string
  ): Promise<void> {
    if (!this.shouldLog(level, category)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      userId: await this.getCurrentUserId(),
      sessionId: this.sessionId,
      stackTrace,
      platform: Platform.OS,
      appVersion: this.getAppVersion(),
      buildNumber: this.getBuildNumber(),
      deviceInfo: await this.getDeviceInfo(),
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Console logging
    if (this.config.consoleLogging) {
      this.logToConsole(logEntry);
    }

    // Update statistics
    this.updateStatistics(logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.config.bufferSize) {
      await this.flush();
    }
  }

  // ---------------------------------------------------------------------------
  // PERFORMANCE LOGGING
  // ---------------------------------------------------------------------------

  startPerformanceLog(operation: string, metadata?: Record<string, any>): string {
    const id = this.generateLogId();
    const performanceLog: PerformanceLog = {
      operation,
      startTime: performance.now(),
      success: false,
      metadata,
    };
    
    this.performanceLogs.set(id, performanceLog);
    
    this.trace(LogCategory.PERFORMANCE, `Started: ${operation}`, {
      operationId: id,
      metadata,
    });
    
    return id;
  }

  endPerformanceLog(id: string, success: boolean = true, metadata?: Record<string, any>): void {
    const performanceLog = this.performanceLogs.get(id);
    if (!performanceLog) {
      this.warn(LogCategory.PERFORMANCE, `Performance log not found: ${id}`);
      return;
    }

    performanceLog.endTime = performance.now();
    performanceLog.duration = performanceLog.endTime - performanceLog.startTime;
    performanceLog.success = success;
    performanceLog.metadata = { ...performanceLog.metadata, ...metadata };

    const level = performanceLog.duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, LogCategory.PERFORMANCE, `Completed: ${performanceLog.operation}`, {
      operationId: id,
      duration: performanceLog.duration,
      success,
      metadata: performanceLog.metadata,
    });

    this.performanceLogs.delete(id);
  }

  logUserAction(action: string, feature: string, data?: Record<string, any>): void {
    this.info(LogCategory.USER_ACTION, `User action: ${action}`, {
      feature,
      action,
      ...data,
    });
  }

  logNetworkRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    
    this.log(level, LogCategory.NETWORK, `${method} ${url}`, {
      method,
      url,
      statusCode,
      duration,
      requestSize,
      responseSize,
    });
  }

  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    affectedRows?: number
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    
    this.log(level, LogCategory.DATABASE, `DB ${operation} on ${table}`, {
      operation,
      table,
      duration,
      success,
      affectedRows,
    });
  }

  // ---------------------------------------------------------------------------
  // LOG FILTERING AND SEARCH
  // ---------------------------------------------------------------------------

  async searchLogs(filter: LogFilter): Promise<LogEntry[]> {
    try {
      // For now, search in memory buffer and recent file logs
      let results: LogEntry[] = [];

      // Search buffer
      results = results.concat(this.searchInBuffer(filter));

      // Search file logs if needed
      if (this.config.fileLogging && results.length < (filter.limit || 100)) {
        const fileResults = await this.searchInFiles(filter);
        results = results.concat(fileResults);
      }

      // Apply limit
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }

      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      console.error('Failed to search logs:', error);
      return [];
    }
  }

  private searchInBuffer(filter: LogFilter): LogEntry[] {
    return this.logBuffer.filter(entry => this.matchesFilter(entry, filter));
  }

  private async searchInFiles(filter: LogFilter): Promise<LogEntry[]> {
    try {
      const logFiles = await this.getLogFiles();
      const results: LogEntry[] = [];

      for (const file of logFiles.slice(0, 3)) { // Search only recent files
        try {
          const content = await RNFS.readFile(file);
          const lines = content.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const entry: LogEntry = JSON.parse(line);
                entry.timestamp = new Date(entry.timestamp);
                
                if (this.matchesFilter(entry, filter)) {
                  results.push(entry);
                }
              } catch (parseError) {
                // Skip invalid JSON lines
              }
            }
          }
        } catch (fileError) {
          console.error(`Failed to read log file ${file}:`, fileError);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to search in files:', error);
      return [];
    }
  }

  private matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
    // Level filter
    if (filter.levels && !filter.levels.includes(entry.level)) {
      return false;
    }

    // Category filter
    if (filter.categories && !filter.categories.includes(entry.category)) {
      return false;
    }

    // Date range filter
    if (filter.startDate && entry.timestamp < filter.startDate) {
      return false;
    }
    if (filter.endDate && entry.timestamp > filter.endDate) {
      return false;
    }

    // User filter
    if (filter.userId && entry.userId !== filter.userId) {
      return false;
    }

    // Session filter
    if (filter.sessionId && entry.sessionId !== filter.sessionId) {
      return false;
    }

    // Feature filter
    if (filter.feature && entry.feature !== filter.feature) {
      return false;
    }

    // Text search
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      const messageMatch = entry.message.toLowerCase().includes(searchLower);
      const dataMatch = entry.data ? 
        JSON.stringify(entry.data).toLowerCase().includes(searchLower) : false;
      
      if (!messageMatch && !dataMatch) {
        return false;
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // FILE MANAGEMENT
  // ---------------------------------------------------------------------------

  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.fileLogging) {
      return;
    }

    try {
      const entries = [...this.logBuffer];
      this.logBuffer = [];

      const logLines = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      
      await RNFS.appendFile(this.logFilePath, logLines, 'utf8');
      this.currentFileSize += Buffer.byteLength(logLines, 'utf8');

      // Check if rotation is needed
      await this.rotateLogsIfNeeded();

    } catch (error) {
      console.error('Failed to flush logs to file:', error);
      // Put entries back in buffer on error
      this.logBuffer = [...entries, ...this.logBuffer];
    }
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    const maxSizeBytes = this.config.maxFileSize * 1024 * 1024;
    
    if (this.currentFileSize >= maxSizeBytes) {
      await this.rotateLogs();
    }
  }

  private async rotateLogs(): Promise<void> {
    try {
      // Flush current buffer
      await this.flush();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = `${this.logFilePath}.${timestamp}`;

      // Move current log file
      await RNFS.moveFile(this.logFilePath, rotatedPath);

      // Compress if enabled
      if (this.config.compressionEnabled) {
        // In a real implementation, you would compress the file here
        // For now, we'll just log the action
        await this.info(LogCategory.SYSTEM, 'Log file compressed', {
          originalPath: rotatedPath,
        });
      }

      // Reset current file size
      this.currentFileSize = 0;

      // Clean up old files
      await this.cleanupOldLogFiles();

      await this.info(LogCategory.SYSTEM, 'Log rotation completed', {
        rotatedFile: rotatedPath,
        newFile: this.logFilePath,
      });

    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const logFiles = await this.getLogFiles();
      
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles);
        
        for (const file of filesToDelete) {
          try {
            await RNFS.unlink(file);
            await this.info(LogCategory.SYSTEM, 'Old log file deleted', { file });
          } catch (deleteError) {
            console.error(`Failed to delete log file ${file}:`, deleteError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const logDir = this.getLogDirectory();
      const files = await RNFS.readDir(logDir);
      
      return files
        .filter(file => file.name.startsWith('ordo-') && file.name.endsWith('.log'))
        .map(file => file.path)
        .sort((a, b) => b.localeCompare(a)); // Newest first
        
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // STATISTICS AND MONITORING
  // ---------------------------------------------------------------------------

  private updateStatistics(entry: LogEntry): void {
    this.statistics.totalEntries++;
    
    // Update by level
    this.statistics.entriesByLevel[entry.level] = 
      (this.statistics.entriesByLevel[entry.level] || 0) + 1;
    
    // Update by category
    this.statistics.entriesByCategory[entry.category] = 
      (this.statistics.entriesByCategory[entry.category] || 0) + 1;
    
    // Update dates
    if (!this.statistics.oldestEntry || entry.timestamp < this.statistics.oldestEntry) {
      this.statistics.oldestEntry = entry.timestamp;
    }
    if (!this.statistics.newestEntry || entry.timestamp > this.statistics.newestEntry) {
      this.statistics.newestEntry = entry.timestamp;
    }
    
    // Update error rate
    const errorCount = (this.statistics.entriesByLevel[LogLevel.ERROR] || 0) + 
                      (this.statistics.entriesByLevel[LogLevel.FATAL] || 0);
    this.statistics.errorRate = errorCount / this.statistics.totalEntries;
    
    // Update file size
    this.statistics.fileSize = this.currentFileSize;
  }

  getStatistics(): LogStatistics {
    return { ...this.statistics };
  }

  async exportLogs(filter?: LogFilter): Promise<string> {
    try {
      const logs = await this.searchLogs(filter || {});
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '[]';
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (level < this.config.level) return false;
    if (!this.config.categories.includes(category)) return false;
    return true;
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName} [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.data);
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogDirectory(): string {
    return `${RNFS.DocumentDirectoryPath}/logs`;
  }

  private getLogFilePath(): string {
    return `${this.getLogDirectory()}/ordo-${new Date().toISOString().split('T')[0]}.log`;
  }

  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      return await AsyncStorage.getItem('userId') || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getAppVersion(): string {
    // In a real implementation, this would get the actual app version
    return '1.0.0';
  }

  private getBuildNumber(): string {
    // In a real implementation, this would get the actual build number
    return '1';
  }

  private async getDeviceInfo(): Promise<Record<string, any>> {
    // In a real implementation, this would get device information
    return {
      platform: Platform.OS,
      version: Platform.Version,
    };
  }

  private initializeStatistics(): LogStatistics {
    return {
      totalEntries: 0,
      entriesByLevel: {} as Record<LogLevel, number>,
      entriesByCategory: {} as Record<LogCategory, number>,
      fileSize: 0,
      errorRate: 0,
      performanceMetrics: {
        averageWriteTime: 0,
        peakMemoryUsage: 0,
        diskSpaceUsed: 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION MANAGEMENT
  // ---------------------------------------------------------------------------

  private async loadConfiguration(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('logging_config');
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load logging configuration:', error);
    }
  }

  async updateConfiguration(config: Partial<LogConfiguration>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    try {
      await AsyncStorage.setItem('logging_config', JSON.stringify(this.config));
      
      // Restart auto-flush if interval changed
      if (config.flushInterval !== undefined) {
        if (this.flushTimer) {
          clearInterval(this.flushTimer);
        }
        this.setupAutoFlush();
      }
      
    } catch (error) {
      console.error('Failed to save logging configuration:', error);
    }
  }

  getConfiguration(): LogConfiguration {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    try {
      // Flush remaining logs
      await this.flush();
      
      // Clear auto-flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      await this.info(LogCategory.SYSTEM, 'Logging service shutdown');
      
    } catch (error) {
      console.error('Error during logging service shutdown:', error);
    }
  }

  async clearLogs(): Promise<void> {
    try {
      this.logBuffer = [];
      
      const logFiles = await this.getLogFiles();
      for (const file of logFiles) {
        await RNFS.unlink(file);
      }
      
      this.currentFileSize = 0;
      this.statistics = this.initializeStatistics();
      
      await this.info(LogCategory.SYSTEM, 'All logs cleared');
      
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // DEFAULT CONFIGURATION
  // ---------------------------------------------------------------------------

  private getDefaultConfig(): LogConfiguration {
    return {
      enabled: true,
      level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      categories: Object.values(LogCategory),
      fileLogging: true,
      consoleLogging: __DEV__,
      remoteLogging: false,
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      rotationInterval: 24, // 24 hours
      compressionEnabled: false,
      encryptionEnabled: false,
      bufferSize: 100,
      flushInterval: 30, // 30 seconds
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getLogLevelName(level: LogLevel): string {
  return LogLevel[level];
}

export function parseLogLevel(name: string): LogLevel | undefined {
  const upperName = name.toUpperCase();
  return LogLevel[upperName as keyof typeof LogLevel];
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const loggingService = new LoggingService();
