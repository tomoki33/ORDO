/**
 * カスタムエラーハンドリング (5時間実装)
 * Custom Error Handling System
 * 
 * 包括的なエラー処理とリカバリシステム
 * - カスタムエラークラス定義
 * - エラー分類とルーティング
 * - 自動リカバリメカニズム
 * - エラー変換とラッピング
 * - コンテキスト保持とスタック追跡
 * - ユーザーフレンドリーなエラーメッセージ
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMonitoringService } from './ErrorMonitoringService';

// =============================================================================
// CUSTOM ERROR TYPES
// =============================================================================

export enum ErrorCategory {
  BUSINESS_LOGIC = 'business_logic',
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  UI = 'ui',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
  DATA_INTEGRITY = 'data_integrity',
  PERFORMANCE = 'performance',
  CONFIGURATION = 'configuration',
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  USER_ACTION = 'user_action',
  RESTART = 'restart',
  ESCALATE = 'escalate',
  CACHE = 'cache',
  OFFLINE_MODE = 'offline_mode',
}

export interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  errorCode: string;
  retryable: boolean;
  silent: boolean;
  context?: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
  innerError?: Error;
  userId?: string;
  sessionId?: string;
  feature?: string;
  action?: string;
}

export interface RecoveryAction {
  type: RecoveryStrategy;
  description: string;
  automatic: boolean;
  maxAttempts: number;
  delayMs: number;
  fallbackValue?: any;
  userPrompt?: string;
  callback?: () => Promise<any>;
}

export interface ErrorPattern {
  pattern: RegExp | string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recovery: RecoveryAction;
  transform?: (error: Error) => OrDoError;
}

// =============================================================================
// BASE CUSTOM ERROR CLASS
// =============================================================================

export class OrDoError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly errorCode: string;
  public readonly retryable: boolean;
  public readonly silent: boolean;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly innerError?: Error;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly feature?: string;
  public readonly action?: string;

  constructor(metadata: ErrorMetadata) {
    super(metadata.technicalMessage);
    
    this.name = this.constructor.name;
    this.category = metadata.category;
    this.severity = metadata.severity;
    this.recoveryStrategy = metadata.recoveryStrategy;
    this.userMessage = metadata.userMessage;
    this.technicalMessage = metadata.technicalMessage;
    this.errorCode = metadata.errorCode;
    this.retryable = metadata.retryable;
    this.silent = metadata.silent;
    this.context = metadata.context || {};
    this.timestamp = metadata.timestamp;
    this.innerError = metadata.innerError;
    this.userId = metadata.userId;
    this.sessionId = metadata.sessionId;
    this.feature = metadata.feature;
    this.action = metadata.action;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoveryStrategy: this.recoveryStrategy,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      errorCode: this.errorCode,
      retryable: this.retryable,
      silent: this.silent,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      innerError: this.innerError?.message,
      userId: this.userId,
      sessionId: this.sessionId,
      feature: this.feature,
      action: this.action,
    };
  }
}

// =============================================================================
// SPECIFIC ERROR CLASSES
// =============================================================================

export class NetworkError extends OrDoError {
  public readonly statusCode?: number;
  public readonly requestUrl?: string;
  public readonly requestMethod?: string;

  constructor(
    message: string,
    statusCode?: number,
    requestUrl?: string,
    requestMethod?: string,
    innerError?: Error
  ) {
    super({
      category: ErrorCategory.NETWORK,
      severity: statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'ネットワーク接続に問題があります。しばらく待ってから再試行してください。',
      technicalMessage: message,
      errorCode: `NETWORK_${statusCode || 'UNKNOWN'}`,
      retryable: true,
      silent: false,
      context: { statusCode, requestUrl, requestMethod },
      timestamp: new Date(),
      innerError,
    });

    this.statusCode = statusCode;
    this.requestUrl = requestUrl;
    this.requestMethod = requestMethod;
  }
}

export class DatabaseError extends OrDoError {
  public readonly operation?: string;
  public readonly table?: string;

  constructor(
    message: string,
    operation?: string,
    table?: string,
    innerError?: Error
  ) {
    super({
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'データの保存・読み込みに失敗しました。アプリを再起動してください。',
      technicalMessage: message,
      errorCode: `DB_${operation || 'UNKNOWN'}_ERROR`,
      retryable: true,
      silent: false,
      context: { operation, table },
      timestamp: new Date(),
      innerError,
    });

    this.operation = operation;
    this.table = table;
  }
}

export class ValidationError extends OrDoError {
  public readonly field?: string;
  public readonly value?: any;
  public readonly constraint?: string;

  constructor(
    message: string,
    field?: string,
    value?: any,
    constraint?: string
  ) {
    super({
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.USER_ACTION,
      userMessage: `入力内容をご確認ください：${message}`,
      technicalMessage: message,
      errorCode: `VALIDATION_${field || 'UNKNOWN'}_ERROR`,
      retryable: false,
      silent: false,
      context: { field, value, constraint },
      timestamp: new Date(),
    });

    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }
}

export class AuthenticationError extends OrDoError {
  public readonly authMethod?: string;

  constructor(message: string, authMethod?: string, innerError?: Error) {
    super({
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.USER_ACTION,
      userMessage: '認証に失敗しました。再度ログインしてください。',
      technicalMessage: message,
      errorCode: `AUTH_${authMethod || 'UNKNOWN'}_ERROR`,
      retryable: false,
      silent: false,
      context: { authMethod },
      timestamp: new Date(),
      innerError,
    });

    this.authMethod = authMethod;
  }
}

export class AuthorizationError extends OrDoError {
  public readonly resource?: string;
  public readonly action?: string;

  constructor(message: string, resource?: string, action?: string) {
    super({
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.USER_ACTION,
      userMessage: 'この操作を実行する権限がありません。',
      technicalMessage: message,
      errorCode: `AUTHZ_${resource || 'UNKNOWN'}_ERROR`,
      retryable: false,
      silent: false,
      context: { resource, action },
      timestamp: new Date(),
    });

    this.resource = resource;
    this.action = action;
  }
}

export class BusinessLogicError extends OrDoError {
  public readonly businessRule?: string;

  constructor(message: string, businessRule?: string) {
    super({
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.USER_ACTION,
      userMessage: message,
      technicalMessage: message,
      errorCode: `BUSINESS_${businessRule || 'UNKNOWN'}_ERROR`,
      retryable: false,
      silent: false,
      context: { businessRule },
      timestamp: new Date(),
    });

    this.businessRule = businessRule;
  }
}

export class ExternalServiceError extends OrDoError {
  public readonly serviceName?: string;
  public readonly serviceEndpoint?: string;

  constructor(
    message: string,
    serviceName?: string,
    serviceEndpoint?: string,
    innerError?: Error
  ) {
    super({
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.FALLBACK,
      userMessage: '外部サービスとの連携に失敗しました。しばらく待ってから再試行してください。',
      technicalMessage: message,
      errorCode: `EXTERNAL_${serviceName || 'UNKNOWN'}_ERROR`,
      retryable: true,
      silent: false,
      context: { serviceName, serviceEndpoint },
      timestamp: new Date(),
      innerError,
    });

    this.serviceName = serviceName;
    this.serviceEndpoint = serviceEndpoint;
  }
}

export class UIError extends OrDoError {
  public readonly component?: string;
  public readonly props?: Record<string, any>;

  constructor(
    message: string,
    component?: string,
    props?: Record<string, any>,
    innerError?: Error
  ) {
    super({
      category: ErrorCategory.UI,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.IGNORE,
      userMessage: '画面の表示に問題が発生しました。',
      technicalMessage: message,
      errorCode: `UI_${component || 'UNKNOWN'}_ERROR`,
      retryable: false,
      silent: true,
      context: { component, props },
      timestamp: new Date(),
      innerError,
    });

    this.component = component;
    this.props = props;
  }
}

// =============================================================================
// ERROR HANDLER SERVICE
// =============================================================================

export class CustomErrorHandler {
  private patterns: ErrorPattern[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private isInitialized = false;

  constructor() {
    this.setupDefaultPatterns();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing Custom Error Handler...');

      // Load custom patterns from storage
      await this.loadCustomPatterns();

      // Set up global error interception
      this.setupGlobalInterception();

      this.isInitialized = true;
      console.log('✅ Custom Error Handler initialized');

    } catch (error) {
      console.error('❌ Failed to initialize custom error handler:', error);
      this.isInitialized = true; // Prevent infinite loops
    }
  }

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  async handleError(error: Error, context?: Record<string, any>): Promise<OrDoError> {
    try {
      // Convert to custom error if needed
      const customError = this.convertToCustomError(error, context);

      // Report to monitoring
      errorMonitoringService.captureError(customError, {
        type: this.mapCategoryToType(customError.category),
        severity: this.mapSeverityToMonitoringSeverity(customError.severity),
        handled: true,
        context,
        tags: {
          category: customError.category,
          errorCode: customError.errorCode,
          feature: customError.feature || 'unknown',
        },
      });

      // Attempt recovery if applicable
      if (customError.retryable && customError.recoveryStrategy !== RecoveryStrategy.USER_ACTION) {
        const recovered = await this.attemptRecovery(customError);
        if (recovered) {
          return customError;
        }
      }

      // Store for offline analysis
      await this.storeError(customError);

      return customError;

    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      
      // Fallback to basic custom error
      return new OrDoError({
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        userMessage: '予期しないエラーが発生しました。',
        technicalMessage: error.message,
        errorCode: 'SYSTEM_HANDLER_ERROR',
        retryable: false,
        silent: false,
        timestamp: new Date(),
        innerError: error,
      });
    }
  }

  private convertToCustomError(error: Error, context?: Record<string, any>): OrDoError {
    // If already a custom error, return as-is
    if (error instanceof OrDoError) {
      return error;
    }

    // Try to match against patterns
    for (const pattern of this.patterns) {
      if (this.matchesPattern(error, pattern)) {
        if (pattern.transform) {
          return pattern.transform(error);
        }
        
        // Create error based on pattern
        return new OrDoError({
          category: pattern.category,
          severity: pattern.severity,
          recoveryStrategy: pattern.recovery.type,
          userMessage: pattern.recovery.userPrompt || 'エラーが発生しました。',
          technicalMessage: error.message,
          errorCode: this.generateErrorCode(pattern.category, error),
          retryable: pattern.recovery.type === RecoveryStrategy.RETRY,
          silent: false,
          context: context || {},
          timestamp: new Date(),
          innerError: error,
        });
      }
    }

    // Default conversion
    return this.createDefaultCustomError(error, context);
  }

  private matchesPattern(error: Error, pattern: ErrorPattern): boolean {
    if (pattern.pattern instanceof RegExp) {
      return pattern.pattern.test(error.message) || 
             (error.stack ? pattern.pattern.test(error.stack) : false);
    } else {
      return error.message.includes(pattern.pattern) ||
             error.name.includes(pattern.pattern);
    }
  }

  private createDefaultCustomError(error: Error, context?: Record<string, any>): OrDoError {
    // Analyze error characteristics to determine category
    const category = this.inferErrorCategory(error);
    const severity = this.inferErrorSeverity(error, category);
    const recoveryStrategy = this.inferRecoveryStrategy(category);

    return new OrDoError({
      category,
      severity,
      recoveryStrategy,
      userMessage: this.generateUserFriendlyMessage(category, error),
      technicalMessage: error.message,
      errorCode: this.generateErrorCode(category, error),
      retryable: recoveryStrategy === RecoveryStrategy.RETRY,
      silent: category === ErrorCategory.UI && severity === ErrorSeverity.LOW,
      context: context || {},
      timestamp: new Date(),
      innerError: error,
    });
  }

  // ---------------------------------------------------------------------------
  // ERROR ANALYSIS
  // ---------------------------------------------------------------------------

  private inferErrorCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('database') || message.includes('sql') || message.includes('sqlite')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('auth') || message.includes('token') || message.includes('login')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }
    if (stack.includes('render') || stack.includes('component')) {
      return ErrorCategory.UI;
    }

    return ErrorCategory.SYSTEM;
  }

  private inferErrorSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    switch (category) {
      case ErrorCategory.DATABASE:
      case ErrorCategory.AUTHENTICATION:
        return ErrorSeverity.HIGH;
      
      case ErrorCategory.NETWORK:
      case ErrorCategory.VALIDATION:
      case ErrorCategory.BUSINESS_LOGIC:
        return ErrorSeverity.MEDIUM;
      
      case ErrorCategory.UI:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private inferRecoveryStrategy(category: ErrorCategory): RecoveryStrategy {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.DATABASE:
      case ErrorCategory.EXTERNAL_SERVICE:
        return RecoveryStrategy.RETRY;
      
      case ErrorCategory.VALIDATION:
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return RecoveryStrategy.USER_ACTION;
      
      case ErrorCategory.UI:
        return RecoveryStrategy.IGNORE;
      
      default:
        return RecoveryStrategy.ESCALATE;
    }
  }

  private generateUserFriendlyMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      
      case ErrorCategory.DATABASE:
        return 'データの保存に失敗しました。アプリを再起動してください。';
      
      case ErrorCategory.AUTHENTICATION:
        return 'ログインに問題があります。再度ログインしてください。';
      
      case ErrorCategory.AUTHORIZATION:
        return 'この操作を実行する権限がありません。';
      
      case ErrorCategory.VALIDATION:
        return '入力内容をご確認ください。';
      
      case ErrorCategory.UI:
        return '画面の表示に問題が発生しました。';
      
      default:
        return '予期しないエラーが発生しました。しばらく待ってから再試行してください。';
    }
  }

  private generateErrorCode(category: ErrorCategory, error: Error): string {
    const prefix = category.toUpperCase().replace('_', '');
    const hash = this.simpleHash(error.message).toString(36).toUpperCase();
    return `${prefix}_${hash}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ---------------------------------------------------------------------------
  // RECOVERY MECHANISMS
  // ---------------------------------------------------------------------------

  private async attemptRecovery(error: OrDoError): Promise<boolean> {
    const errorKey = error.errorCode;
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    if (attempts >= 3) {
      console.log(`Maximum recovery attempts reached for ${errorKey}`);
      return false;
    }

    this.recoveryAttempts.set(errorKey, attempts + 1);

    try {
      switch (error.recoveryStrategy) {
        case RecoveryStrategy.RETRY:
          return await this.executeRetryStrategy(error, attempts);
        
        case RecoveryStrategy.FALLBACK:
          return await this.executeFallbackStrategy(error);
        
        case RecoveryStrategy.CACHE:
          return await this.executeCacheStrategy(error);
        
        case RecoveryStrategy.OFFLINE_MODE:
          return await this.executeOfflineModeStrategy(error);
        
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error(`Recovery failed for ${errorKey}:`, recoveryError);
      return false;
    }
  }

  private async executeRetryStrategy(error: OrDoError, attempts: number): Promise<boolean> {
    const delay = Math.min(1000 * Math.pow(2, attempts), 10000); // Exponential backoff
    
    console.log(`Retrying operation for ${error.errorCode} (attempt ${attempts + 1}) in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Here you would re-execute the original operation
    // For now, we'll simulate success based on error category
    const successRate = this.getRetrySuccessRate(error.category);
    return Math.random() < successRate;
  }

  private async executeFallbackStrategy(error: OrDoError): Promise<boolean> {
    console.log(`Executing fallback strategy for ${error.errorCode}`);
    
    // Implement fallback logic based on error type
    switch (error.category) {
      case ErrorCategory.EXTERNAL_SERVICE:
        // Use cached data or local alternative
        return true;
      
      case ErrorCategory.NETWORK:
        // Switch to offline mode
        return await this.executeOfflineModeStrategy(error);
      
      default:
        return false;
    }
  }

  private async executeCacheStrategy(error: OrDoError): Promise<boolean> {
    console.log(`Executing cache strategy for ${error.errorCode}`);
    
    try {
      // Try to serve from cache
      const cacheKey = this.generateCacheKey(error);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        console.log(`Serving cached data for ${error.errorCode}`);
        return true;
      }
      
      return false;
    } catch (cacheError) {
      console.error('Cache strategy failed:', cacheError);
      return false;
    }
  }

  private async executeOfflineModeStrategy(error: OrDoError): Promise<boolean> {
    console.log(`Executing offline mode strategy for ${error.errorCode}`);
    
    // Queue operation for later execution
    try {
      const offlineQueue = await this.getOfflineQueue();
      offlineQueue.push({
        errorCode: error.errorCode,
        operation: error.action || 'unknown',
        context: error.context,
        timestamp: error.timestamp,
      });
      
      await this.saveOfflineQueue(offlineQueue);
      return true;
    } catch (offlineError) {
      console.error('Offline mode strategy failed:', offlineError);
      return false;
    }
  }

  private getRetrySuccessRate(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 0.7;
      case ErrorCategory.DATABASE:
        return 0.5;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 0.6;
      default:
        return 0.3;
    }
  }

  // ---------------------------------------------------------------------------
  // PATTERN MANAGEMENT
  // ---------------------------------------------------------------------------

  private setupDefaultPatterns(): void {
    this.patterns = [
      // Network errors
      {
        pattern: /network|fetch|timeout|connection/i,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        recovery: {
          type: RecoveryStrategy.RETRY,
          description: 'Retry network request',
          automatic: true,
          maxAttempts: 3,
          delayMs: 2000,
        },
      },
      
      // Database errors
      {
        pattern: /database|sql|sqlite|constraint/i,
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        recovery: {
          type: RecoveryStrategy.RETRY,
          description: 'Retry database operation',
          automatic: true,
          maxAttempts: 2,
          delayMs: 1000,
        },
      },
      
      // Authentication errors
      {
        pattern: /auth|token|unauthorized|login/i,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        recovery: {
          type: RecoveryStrategy.USER_ACTION,
          description: 'Re-authenticate user',
          automatic: false,
          maxAttempts: 1,
          delayMs: 0,
          userPrompt: 'ログインし直してください',
        },
      },
      
      // Validation errors
      {
        pattern: /validation|invalid|required|format/i,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        recovery: {
          type: RecoveryStrategy.USER_ACTION,
          description: 'Fix input validation',
          automatic: false,
          maxAttempts: 1,
          delayMs: 0,
          userPrompt: '入力内容を確認してください',
        },
      },
    ];
  }

  addPattern(pattern: ErrorPattern): void {
    this.patterns.push(pattern);
  }

  removePattern(index: number): void {
    if (index >= 0 && index < this.patterns.length) {
      this.patterns.splice(index, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // GLOBAL INTERCEPTION
  // ---------------------------------------------------------------------------

  private setupGlobalInterception(): void {
    // Intercept promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error, { source: 'unhandledRejection' });
    });

    // Intercept uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleError(error, { source: 'uncaughtException' });
    });
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private mapCategoryToType(category: ErrorCategory): any {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'network';
      case ErrorCategory.DATABASE:
        return 'database';
      case ErrorCategory.UI:
        return 'ui';
      default:
        return 'business_logic';
    }
  }

  private mapSeverityToMonitoringSeverity(severity: ErrorSeverity): any {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  private generateCacheKey(error: OrDoError): string {
    return `error_cache_${error.feature}_${error.action}`;
  }

  private async getOfflineQueue(): Promise<any[]> {
    try {
      const queueJson = await AsyncStorage.getItem('offline_error_queue');
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  private async saveOfflineQueue(queue: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_error_queue', JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async storeError(error: OrDoError): Promise<void> {
    try {
      const storedErrors = await this.getStoredErrors();
      storedErrors.push(error.toJSON());
      
      // Keep only the last 100 errors
      const recentErrors = storedErrors.slice(-100);
      
      await AsyncStorage.setItem('stored_errors', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.error('Failed to store error:', storageError);
    }
  }

  private async loadCustomPatterns(): Promise<void> {
    try {
      const patternsJson = await AsyncStorage.getItem('custom_error_patterns');
      if (patternsJson) {
        const customPatterns = JSON.parse(patternsJson);
        this.patterns.push(...customPatterns);
      }
    } catch (error) {
      console.error('Failed to load custom patterns:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async getStoredErrors(): Promise<any[]> {
    try {
      const errorsJson = await AsyncStorage.getItem('stored_errors');
      return errorsJson ? JSON.parse(errorsJson) : [];
    } catch (error) {
      console.error('Failed to get stored errors:', error);
      return [];
    }
  }

  async clearStoredErrors(): Promise<void> {
    try {
      await AsyncStorage.removeItem('stored_errors');
    } catch (error) {
      console.error('Failed to clear stored errors:', error);
    }
  }

  getPatterns(): ErrorPattern[] {
    return [...this.patterns];
  }

  clearRecoveryAttempts(): void {
    this.recoveryAttempts.clear();
  }

  async processOfflineQueue(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      console.log(`Processing ${queue.length} offline operations`);
      
      // Process queued operations
      for (const operation of queue) {
        try {
          // Re-execute the operation
          console.log(`Re-executing operation: ${operation.operation}`);
          // Implementation would depend on the specific operation
        } catch (error) {
          console.error(`Failed to re-execute operation ${operation.operation}:`, error);
        }
      }
      
      // Clear processed queue
      await this.saveOfflineQueue([]);
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isOrDoError(error: any): error is OrDoError {
  return error instanceof OrDoError;
}

export function createNetworkError(
  message: string,
  statusCode?: number,
  url?: string,
  method?: string
): NetworkError {
  return new NetworkError(message, statusCode, url, method);
}

export function createDatabaseError(
  message: string,
  operation?: string,
  table?: string
): DatabaseError {
  return new DatabaseError(message, operation, table);
}

export function createValidationError(
  message: string,
  field?: string,
  value?: any
): ValidationError {
  return new ValidationError(message, field, value);
}

export function createBusinessLogicError(message: string): BusinessLogicError {
  return new BusinessLogicError(message);
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const customErrorHandler = new CustomErrorHandler();
