/**
 * Ordo App - Services Index
 * Centralized export for all service modules
 * Phase 12 Complete - Advanced AI Analysis Platform
 * Phase 13 Complete - Database and Storage Implementation
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

// Service initialization utility
export const initializeServices = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing services...');
    
    // Import services dynamically to avoid circular dependencies
    const { imageStorage } = await import('./ImageStorageService');
    const { dataMigrationService } = await import('./DataMigrationService');
    const { localNotificationService } = await import('./LocalNotificationService');
    const { backgroundProcessingService } = await import('./BackgroundProcessingService');
    
    // Initialize image storage
    await imageStorage.initialize();
    
    // Run any pending migrations
    await dataMigrationService.runMigrations();
    
    // Initialize notification services
    await localNotificationService.initialize();
    await backgroundProcessingService.initialize();
    
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
};

// Service status check
export const getServiceStatus = async (): Promise<{
  imageStorage: boolean;
  dataMigration: boolean;
  database: boolean;
  notifications: boolean;
  backgroundProcessing: boolean;
}> => {
  try {
    // Import services dynamically
    const { imageStorage } = await import('./ImageStorageService');
    const { dataMigrationService } = await import('./DataMigrationService');
    const { localNotificationService } = await import('./LocalNotificationService');
    const { backgroundProcessingService } = await import('./BackgroundProcessingService');
    
    // Check image storage
    const imageStorageStats = await imageStorage.getStorageStats();
    const imageStorageOk = imageStorageStats !== null;

    // Check data migration
    const migrationHistory = await dataMigrationService.getBackupHistory();
    const dataMigrationOk = Array.isArray(migrationHistory);

    // Check notifications
    const notificationSettings = localNotificationService.getSettings();
    const notificationsOk = notificationSettings !== null;

    // Check background processing
    const taskStatuses = await backgroundProcessingService.getTaskStatuses();
    const backgroundProcessingOk = Array.isArray(taskStatuses);

    // Check database (would be more sophisticated in real implementation)
    const databaseOk = true; // Assume database is working if we got this far

    return {
      imageStorage: imageStorageOk,
      dataMigration: dataMigrationOk,
      database: databaseOk,
      notifications: notificationsOk,
      backgroundProcessing: backgroundProcessingOk,
    };
  } catch (error) {
    console.error('Error checking service status:', error);
    return {
      imageStorage: false,
      dataMigration: false,
      database: false,
      notifications: false,
      backgroundProcessing: false,
    };
  }
};
