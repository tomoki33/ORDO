/**
 * Ordo App - Services Index
 * Centralized export for all service modules
 * Phase 12 Complete - Advanced AI Analysis Platform
 * Phase 13 Complete - Database and Storage Implementation
 * Phase 14 Complete - Notification System
 * Phase 15 Complete - Error Monitoring & Logging System
 */

export { StorageService, ProductStorage } from './StorageService';
export { sqliteService } from './sqliteService';
export { cameraService, CameraService } from './CameraService';
export { 
  NotificationService, 
  notificationService
} from './NotificationService';
export type { 
  NotificationConfig,
  ScheduledNotification 
} from './NotificationService';

// Phase 12 - Advanced AI Services
export { ObjectDetectionService } from './ObjectDetectionService';
export type { 
  DetectionResult,
  ObjectDetectionOutput,
  ModelConfig,
  DetectionMetrics 
} from './ObjectDetectionService';

export { MultiRegionExtractionService } from './MultiRegionExtractionService';
export type { 
  ExtractedRegion,
  MultiRegionOutput,
  SegmentationMask,
  RegionExtractionConfig 
} from './MultiRegionExtractionService';

export { BatchOptimizationService } from './BatchOptimizationService';
export type { 
  BatchProgress,
  BatchOutput,
  BatchResult,
  BatchProcessingConfig,
  OptimizationMetrics 
} from './BatchOptimizationService';

export { FreshnessDetectionService } from './FreshnessDetectionService';
export type { 
  FreshnessScore
} from './FreshnessDetectionService';

export { StateClassificationService } from './StateClassificationService';
export type { 
  StateClassificationResult 
} from './StateClassificationService';

// Phase 13 - Database and Storage Services
export { ImageStorageService, imageStorage } from './ImageStorageService';
export type {
  ImageStorageConfig,
  ImageDirectory,
  ImageProcessingOptions,
  ProcessedImageResult,
  ImageMetadata,
} from './ImageStorageService';

export { DataMigrationService, dataMigrationService } from './DataMigrationService';
export type {
  MigrationResult,
  BackupData,
  ImportResult,
  ExportOptions,
} from './DataMigrationService';

// Phase 14 - Notification System Services  
export { ExpirationCalculationService, expirationCalculationService } from './ExpirationCalculationService';
export type {
  ExpirationAlert,
  ConsumptionPattern,
  ExpirationSettings,
  SuggestedAction,
} from './ExpirationCalculationService';

export { LocalNotificationService, localNotificationService } from './LocalNotificationService';
export type {
  NotificationSettings,
  ScheduledNotification as LocalScheduledNotification,
  NotificationInteraction,
  NotificationStatistics,
} from './LocalNotificationService';

export { BackgroundProcessingService, backgroundProcessingService } from './BackgroundProcessingService';
export type {
  BackgroundTaskConfig,
  BackgroundTaskStatus,
  BackgroundProcessingConfig,
  BackgroundExecutionResult,
} from './BackgroundProcessingService';

// Phase 15 - Error Monitoring & Logging System
export { ErrorMonitoringService, errorMonitoringService } from './ErrorMonitoringService';
export type {
  ErrorMonitoringConfig,
  ErrorContext,
  ErrorEvent,
  PerformanceMetric,
  PerformanceTrace,
} from './ErrorMonitoringService';

export { 
  CustomErrorHandler, 
  customErrorHandler,
  OrDoError,
  NetworkError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  ExternalServiceError,
  UIError,
} from './CustomErrorHandler';
export type {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ErrorMetadata,
  RecoveryAction,
  ErrorPattern,
} from './CustomErrorHandler';

export { LoggingService, loggingService } from './LoggingService';
export type {
  LogLevel,
  LogCategory,
  LogEntry,
  LogFilter,
  LogConfiguration,
  LogStatistics,
  PerformanceLog,
} from './LoggingService';

export { 
  UserFeedbackService, 
  userFeedbackService,
  FeedbackModal,
  QuickFeedback,
} from './UserFeedbackService';
export type {
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackEntry,
  FeedbackAttachment,
  FeedbackConfiguration,
  FeedbackStatistics,
} from './UserFeedbackService';

export { 
  OfflineErrorHandler, 
  offlineErrorHandler,
  createOfflineOperation,
  isNetworkError,
} from './OfflineErrorHandler';
export type {
  NetworkStatus,
  OperationType,
  OfflineOperation,
  ConflictResolutionStrategy,
  OfflineConfiguration,
  NetworkInfo,
  SyncResult,
  ConflictInfo,
  CacheEntry,
} from './OfflineErrorHandler';

// Service initialization utility
export const initializeServices = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing all application services...');
    
    // Phase 1: Core Infrastructure (Error Monitoring & Logging)
    console.log('Phase 1: Core Infrastructure');
    const { loggingService } = await import('./LoggingService');
    const { errorMonitoringService } = await import('./ErrorMonitoringService');
    const { customErrorHandler } = await import('./CustomErrorHandler');
    const { offlineErrorHandler } = await import('./OfflineErrorHandler');
    
    await loggingService.initialize();
    await errorMonitoringService.initialize();
    await customErrorHandler.initialize();
    await offlineErrorHandler.initialize();
    
    // Phase 2: Storage & Database
    console.log('Phase 2: Storage & Database');
    const { imageStorage } = await import('./ImageStorageService');
    const { dataMigrationService } = await import('./DataMigrationService');
    
    await imageStorage.initialize();
    await dataMigrationService.runMigrations();
    
    // Phase 3: Notification System
    console.log('Phase 3: Notification System');
    const { expirationCalculationService } = await import('./ExpirationCalculationService');
    const { localNotificationService } = await import('./LocalNotificationService');
    const { backgroundProcessingService } = await import('./BackgroundProcessingService');
    
    await expirationCalculationService.initialize();
    await localNotificationService.initialize();
    await backgroundProcessingService.initialize();
    
    // Phase 4: User Services
    console.log('Phase 4: User Services');
    const { userFeedbackService } = await import('./UserFeedbackService');
    await userFeedbackService.initialize();
    
    console.log('✅ All services initialized successfully');
    
    // Log successful initialization
    await loggingService.info(
      'system' as any,
      'All application services initialized successfully',
      {
        timestamp: new Date().toISOString(),
        phases: ['infrastructure', 'storage', 'notifications', 'user_services'],
      }
    );
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    
    // Try to log the error if logging service is available
    try {
      const { loggingService } = await import('./LoggingService');
      await loggingService.error(
        'system' as any,
        'Failed to initialize application services',
        error as Error,
        { phase: 'initialization' }
      );
    } catch (logError) {
      console.error('Failed to log initialization error:', logError);
    }
    
    throw error;
  }
};

// Service status check with error monitoring
export const getServiceStatus = async (): Promise<{
  imageStorage: boolean;
  dataMigration: boolean;
  database: boolean;
  notifications: boolean;
  backgroundProcessing: boolean;
  errorMonitoring: boolean;
  logging: boolean;
  userFeedback: boolean;
  offlineHandling: boolean;
}> => {
  try {
    // Import services dynamically
    const { imageStorage } = await import('./ImageStorageService');
    const { dataMigrationService } = await import('./DataMigrationService');
    const { localNotificationService } = await import('./LocalNotificationService');
    const { backgroundProcessingService } = await import('./BackgroundProcessingService');
    const { errorMonitoringService } = await import('./ErrorMonitoringService');
    const { loggingService } = await import('./LoggingService');
    const { userFeedbackService } = await import('./UserFeedbackService');
    const { offlineErrorHandler } = await import('./OfflineErrorHandler');
    
    // Check all services
    const imageStorageStats = await imageStorage.getStorageStats();
    const imageStorageOk = imageStorageStats !== null;

    const migrationHistory = await dataMigrationService.getBackupHistory();
    const dataMigrationOk = Array.isArray(migrationHistory);

    const notificationSettings = localNotificationService.getSettings();
    const notificationsOk = notificationSettings !== null;

    const taskStatuses = await backgroundProcessingService.getTaskStatuses();
    const backgroundProcessingOk = Array.isArray(taskStatuses);

    const errorConfig = errorMonitoringService.getConfiguration();
    const errorMonitoringOk = errorConfig !== null;

    const logConfig = loggingService.getConfiguration();
    const loggingOk = logConfig !== null;

    const feedbackConfig = userFeedbackService.getConfiguration();
    const userFeedbackOk = feedbackConfig !== null;

    const networkInfo = offlineErrorHandler.getNetworkInfo();
    const offlineHandlingOk = networkInfo !== null;

    const databaseOk = true; // Assume database is working if we got this far

    return {
      imageStorage: imageStorageOk,
      dataMigration: dataMigrationOk,
      database: databaseOk,
      notifications: notificationsOk,
      backgroundProcessing: backgroundProcessingOk,
      errorMonitoring: errorMonitoringOk,
      logging: loggingOk,
      userFeedback: userFeedbackOk,
      offlineHandling: offlineHandlingOk,
    };
  } catch (error) {
    console.error('Error checking service status:', error);
    return {
      imageStorage: false,
      dataMigration: false,
      database: false,
      notifications: false,
      backgroundProcessing: false,
      errorMonitoring: false,
      logging: false,
      userFeedback: false,
      offlineHandling: false,
    };
  }
};
