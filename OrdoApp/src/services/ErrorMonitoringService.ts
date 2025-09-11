/**
 * エラー監視サービス統合 (4時間実装)
 * Error Monitoring Service Integration
 * 
 * Crashlytics/Sentry統合によるリアルタイムエラー監視
 * - Firebase Crashlytics連携
 * - Sentry統合
 * - カスタムエラー追跡
 * - パフォーマンス監視
 * - リアルタイムアラート
 * - エラー分析とレポート
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, DeviceEventEmitter } from 'react-native';

// External monitoring services (would be imported from actual packages)
// import crashlytics from '@react-native-firebase/crashlytics';
// import * as Sentry from '@sentry/react-native';

// =============================================================================
// ERROR MONITORING TYPES
// =============================================================================

export interface ErrorMonitoringConfig {
  enabled: boolean;
  crashlyticsEnabled: boolean;
  sentryEnabled: boolean;
  customTracking: boolean;
  performanceMonitoring: boolean;
  userTracking: boolean;
  debugMode: boolean;
  samplingRate: number; // 0.0 to 1.0
  releaseStage: 'development' | 'staging' | 'production';
  apiKeys: {
    sentry?: string;
    crashlytics?: string;
  };
}

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  appVersion: string;
  buildNumber: string;
  platform: string;
  deviceModel?: string;
  osVersion?: string;
  screen?: string;
  feature?: string;
  userAction?: string;
  networkStatus?: 'online' | 'offline';
  additionalData?: Record<string, any>;
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  handled: boolean;
  fingerprint?: string;
  tags?: Record<string, string>;
  breadcrumbs?: Breadcrumb[];
}

export enum ErrorType {
  JAVASCRIPT = 'javascript',
  NATIVE = 'native',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  UI = 'ui',
  DATABASE = 'database',
  PERMISSION = 'permission',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PERFORMANCE = 'performance',
}

export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface Breadcrumb {
  timestamp: Date;
  message: string;
  category: string;
  level: ErrorSeverity;
  data?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface UserFeedback {
  errorId: string;
  email?: string;
  name?: string;
  comments: string;
  timestamp: Date;
}

// =============================================================================
// ERROR MONITORING SERVICE
// =============================================================================

export class ErrorMonitoringService {
  private config: ErrorMonitoringConfig;
  private context: Partial<ErrorContext> = {};
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private isInitialized = false;
  private errorQueue: ErrorEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];

  constructor() {
    this.config = this.getDefaultConfig();
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔍 Initializing Error Monitoring Service...');

      // Load configuration
      await this.loadConfiguration();

      // Initialize external services
      if (this.config.crashlyticsEnabled) {
        await this.initializeCrashlytics();
      }

      if (this.config.sentryEnabled) {
        await this.initializeSentry();
      }

      // Set up context
      await this.initializeContext();

      // Set up performance monitoring
      if (this.config.performanceMonitoring) {
        this.initializePerformanceMonitoring();
      }

      this.isInitialized = true;
      console.log('✅ Error Monitoring Service initialized');

      // Report successful initialization
      this.addBreadcrumb({
        message: 'Error monitoring initialized',
        category: 'system',
        level: ErrorSeverity.INFO,
      });

    } catch (error) {
      console.error('❌ Failed to initialize error monitoring:', error);
      // Still mark as initialized to prevent crashes
      this.isInitialized = true;
    }
  }

  private async initializeCrashlytics(): Promise<void> {
    try {
      // In a real implementation, this would initialize Firebase Crashlytics
      /*
      await crashlytics().setCrashlyticsCollectionEnabled(this.config.enabled);
      
      if (this.config.debugMode) {
        await crashlytics().log('Crashlytics initialized in debug mode');
      }
      */
      
      console.log('📊 Crashlytics initialized (simulated)');
    } catch (error) {
      console.error('Failed to initialize Crashlytics:', error);
    }
  }

  private async initializeSentry(): Promise<void> {
    try {
      // In a real implementation, this would initialize Sentry
      /*
      Sentry.init({
        dsn: this.config.apiKeys.sentry,
        debug: this.config.debugMode,
        environment: this.config.releaseStage,
        sampleRate: this.config.samplingRate,
        beforeSend: (event) => {
          return this.config.enabled ? event : null;
        },
      });
      */
      
      console.log('📊 Sentry initialized (simulated)');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  private async initializeContext(): Promise<void> {
    try {
      const appVersion = '1.0.0'; // Would get from app info
      const buildNumber = '1'; // Would get from app info
      
      this.context = {
        sessionId: this.sessionId,
        appVersion,
        buildNumber,
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        networkStatus: 'online', // Would get from network status
      };

      // Set user context if available
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        this.setUser({ id: userId });
      }

    } catch (error) {
      console.error('Failed to initialize context:', error);
    }
  }

  private initializePerformanceMonitoring(): void {
    // Set up performance monitoring
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.setupRenderingMonitoring();
  }

  // ---------------------------------------------------------------------------
  // GLOBAL ERROR HANDLERS
  // ---------------------------------------------------------------------------

  private setupGlobalErrorHandlers(): void {
    // JavaScript error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.captureError(error, {
        type: ErrorType.JAVASCRIPT,
        severity: isFatal ? ErrorSeverity.FATAL : ErrorSeverity.ERROR,
        handled: false,
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Promise rejection handler
    const rejectionTracker = require('promise/setimmediate/rejection-tracking');
    rejectionTracker.enable({
      allRejections: true,
      onUnhandled: (id: number, error: Error) => {
        this.captureError(error, {
          type: ErrorType.JAVASCRIPT,
          severity: ErrorSeverity.ERROR,
          handled: false,
          context: { additionalData: { rejectionId: id } },
        });
      },
      onHandled: (id: number) => {
        // Optionally handle previously unhandled rejections
      },
    });

    // Console error interception
    this.interceptConsoleErrors();
  }

  private interceptConsoleErrors(): void {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      this.captureMessage(args.join(' '), ErrorSeverity.ERROR);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.captureMessage(args.join(' '), ErrorSeverity.WARNING);
      originalWarn.apply(console, args);
    };
  }

  // ---------------------------------------------------------------------------
  // ERROR CAPTURE METHODS
  // ---------------------------------------------------------------------------

  captureError(
    error: Error,
    options: {
      type?: ErrorType;
      severity?: ErrorSeverity;
      handled?: boolean;
      context?: Partial<ErrorContext>;
      tags?: Record<string, string>;
      fingerprint?: string;
    } = {}
  ): string {
    const errorId = this.generateErrorId();
    
    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: new Date(),
      type: options.type || ErrorType.JAVASCRIPT,
      severity: options.severity || ErrorSeverity.ERROR,
      message: error.message,
      stack: error.stack,
      context: { ...this.context, ...options.context } as ErrorContext,
      handled: options.handled !== false,
      fingerprint: options.fingerprint,
      tags: options.tags,
      breadcrumbs: [...this.breadcrumbs],
    };

    // Send to monitoring services
    this.sendToMonitoringServices(errorEvent);

    // Store locally for offline support
    this.storeErrorLocally(errorEvent);

    // Add to breadcrumbs
    this.addBreadcrumb({
      message: `Error captured: ${error.message}`,
      category: 'error',
      level: options.severity || ErrorSeverity.ERROR,
      data: { errorId, type: options.type },
    });

    console.error(`[ErrorMonitoring] ${errorEvent.type} error captured:`, {
      id: errorId,
      message: error.message,
      severity: options.severity,
    });

    return errorId;
  }

  captureMessage(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.INFO,
    context?: Partial<ErrorContext>,
    tags?: Record<string, string>
  ): string {
    const errorId = this.generateErrorId();
    
    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: new Date(),
      type: ErrorType.BUSINESS_LOGIC,
      severity,
      message,
      context: { ...this.context, ...context } as ErrorContext,
      handled: true,
      tags,
      breadcrumbs: [...this.breadcrumbs],
    };

    this.sendToMonitoringServices(errorEvent);
    this.storeErrorLocally(errorEvent);

    return errorId;
  }

  captureException(
    error: Error,
    context?: Partial<ErrorContext>,
    tags?: Record<string, string>
  ): string {
    return this.captureError(error, {
      type: ErrorType.JAVASCRIPT,
      severity: ErrorSeverity.ERROR,
      handled: true,
      context,
      tags,
    });
  }

  // ---------------------------------------------------------------------------
  // BREADCRUMB MANAGEMENT
  // ---------------------------------------------------------------------------

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }

    // Send to external services
    this.sendBreadcrumbToServices(fullBreadcrumb);
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  // ---------------------------------------------------------------------------
  // CONTEXT MANAGEMENT
  // ---------------------------------------------------------------------------

  setUser(user: { id: string; email?: string; name?: string }): void {
    this.context.userId = user.id;
    
    // Send to external services
    this.setUserInServices(user);

    this.addBreadcrumb({
      message: `User set: ${user.id}`,
      category: 'user',
      level: ErrorSeverity.INFO,
    });
  }

  setContext(key: string, value: any): void {
    if (!this.context.additionalData) {
      this.context.additionalData = {};
    }
    this.context.additionalData[key] = value;
  }

  setTag(key: string, value: string): void {
    // Store tags in context
    if (!this.context.additionalData) {
      this.context.additionalData = {};
    }
    if (!this.context.additionalData.tags) {
      this.context.additionalData.tags = {};
    }
    this.context.additionalData.tags[key] = value;
  }

  setLevel(level: ErrorSeverity): void {
    this.context.additionalData = {
      ...this.context.additionalData,
      defaultLevel: level,
    };
  }

  // ---------------------------------------------------------------------------
  // PERFORMANCE MONITORING
  // ---------------------------------------------------------------------------

  recordPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.performanceMetrics.push(fullMetric);

    // Keep only recent metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Send to monitoring services
    this.sendPerformanceMetricToServices(fullMetric);
  }

  startTrace(name: string): PerformanceTrace {
    return new PerformanceTrace(name, this);
  }

  private setupMemoryMonitoring(): void {
    setInterval(() => {
      // Simulate memory usage monitoring
      const memoryUsage = Math.random() * 100; // MB
      this.recordPerformanceMetric({
        name: 'memory_usage',
        value: memoryUsage,
        unit: 'MB',
      });
    }, 30000); // Every 30 seconds
  }

  private setupNetworkMonitoring(): void {
    // Monitor network requests
    DeviceEventEmitter.addListener('networkRequest', (request) => {
      this.recordPerformanceMetric({
        name: 'network_request_duration',
        value: request.duration,
        unit: 'ms',
        context: {
          url: request.url,
          method: request.method,
          statusCode: request.statusCode,
        },
      });
    });
  }

  private setupRenderingMonitoring(): void {
    // Monitor rendering performance
    if (typeof global !== 'undefined' && (global as any).requestIdleCallback) {
      const measureRenderTime = () => {
        const start = performance.now();
        requestAnimationFrame(() => {
          const duration = performance.now() - start;
          this.recordPerformanceMetric({
            name: 'render_frame_time',
            value: duration,
            unit: 'ms',
          });
        });
      };

      setInterval(measureRenderTime, 5000); // Every 5 seconds
    }
  }

  // ---------------------------------------------------------------------------
  // EXTERNAL SERVICE INTEGRATION
  // ---------------------------------------------------------------------------

  private sendToMonitoringServices(errorEvent: ErrorEvent): void {
    if (!this.config.enabled) return;

    if (this.config.crashlyticsEnabled) {
      this.sendToCrashlytics(errorEvent);
    }

    if (this.config.sentryEnabled) {
      this.sendToSentry(errorEvent);
    }
  }

  private sendToCrashlytics(errorEvent: ErrorEvent): void {
    try {
      // In a real implementation:
      /*
      crashlytics().log(errorEvent.message);
      crashlytics().setAttributes({
        errorId: errorEvent.id,
        type: errorEvent.type,
        severity: errorEvent.severity,
        ...errorEvent.tags,
      });

      if (errorEvent.stack) {
        crashlytics().recordError(new Error(errorEvent.message));
      }
      */
      
      console.log('📊 Sent to Crashlytics (simulated):', errorEvent.id);
    } catch (error) {
      console.error('Failed to send to Crashlytics:', error);
    }
  }

  private sendToSentry(errorEvent: ErrorEvent): void {
    try {
      // In a real implementation:
      /*
      Sentry.withScope((scope) => {
        scope.setLevel(errorEvent.severity);
        scope.setContext('error_context', errorEvent.context);
        scope.setTags(errorEvent.tags || {});
        
        errorEvent.breadcrumbs?.forEach(breadcrumb => {
          scope.addBreadcrumb({
            message: breadcrumb.message,
            category: breadcrumb.category,
            level: breadcrumb.level,
            timestamp: breadcrumb.timestamp,
            data: breadcrumb.data,
          });
        });

        if (errorEvent.stack) {
          Sentry.captureException(new Error(errorEvent.message));
        } else {
          Sentry.captureMessage(errorEvent.message, errorEvent.severity);
        }
      });
      */
      
      console.log('📊 Sent to Sentry (simulated):', errorEvent.id);
    } catch (error) {
      console.error('Failed to send to Sentry:', error);
    }
  }

  private sendBreadcrumbToServices(breadcrumb: Breadcrumb): void {
    // Send breadcrumb to external services
    // Implementation would depend on the service
  }

  private setUserInServices(user: { id: string; email?: string; name?: string }): void {
    if (this.config.crashlyticsEnabled) {
      // crashlytics().setUserId(user.id);
    }

    if (this.config.sentryEnabled) {
      /*
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      */
    }
  }

  private sendPerformanceMetricToServices(metric: PerformanceMetric): void {
    // Send performance metrics to external services
    console.log('📊 Performance metric:', metric);
  }

  // ---------------------------------------------------------------------------
  // LOCAL STORAGE
  // ---------------------------------------------------------------------------

  private async storeErrorLocally(errorEvent: ErrorEvent): Promise<void> {
    try {
      this.errorQueue.push(errorEvent);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        'error_monitoring_queue',
        JSON.stringify(this.errorQueue.slice(-100)) // Keep last 100 errors
      );
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('error_monitoring_config');
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load error monitoring configuration:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async updateConfiguration(config: Partial<ErrorMonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    try {
      await AsyncStorage.setItem('error_monitoring_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save error monitoring configuration:', error);
    }
  }

  getConfiguration(): ErrorMonitoringConfig {
    return { ...this.config };
  }

  async getStoredErrors(): Promise<ErrorEvent[]> {
    try {
      const errorsJson = await AsyncStorage.getItem('error_monitoring_queue');
      return errorsJson ? JSON.parse(errorsJson) : [];
    } catch (error) {
      console.error('Failed to get stored errors:', error);
      return [];
    }
  }

  async clearStoredErrors(): Promise<void> {
    try {
      this.errorQueue = [];
      await AsyncStorage.removeItem('error_monitoring_queue');
    } catch (error) {
      console.error('Failed to clear stored errors:', error);
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  flush(): Promise<void> {
    // Force send all pending data to external services
    return Promise.resolve();
  }

  // ---------------------------------------------------------------------------
  // DEFAULT CONFIGURATION
  // ---------------------------------------------------------------------------

  private getDefaultConfig(): ErrorMonitoringConfig {
    return {
      enabled: true,
      crashlyticsEnabled: true,
      sentryEnabled: false,
      customTracking: true,
      performanceMonitoring: true,
      userTracking: true,
      debugMode: __DEV__,
      samplingRate: 1.0,
      releaseStage: __DEV__ ? 'development' : 'production',
      apiKeys: {},
    };
  }
}

// =============================================================================
// PERFORMANCE TRACE CLASS
// =============================================================================

export class PerformanceTrace {
  private name: string;
  private startTime: number;
  private endTime?: number;
  private monitoring: ErrorMonitoringService;
  private attributes: Record<string, any> = {};

  constructor(name: string, monitoring: ErrorMonitoringService) {
    this.name = name;
    this.monitoring = monitoring;
    this.startTime = performance.now();
  }

  putAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  stop(): void {
    if (this.endTime) return; // Already stopped

    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    this.monitoring.recordPerformanceMetric({
      name: this.name,
      value: duration,
      unit: 'ms',
      context: this.attributes,
    });
  }

  getDuration(): number | null {
    if (!this.endTime) return null;
    return this.endTime - this.startTime;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const errorMonitoringService = new ErrorMonitoringService();
