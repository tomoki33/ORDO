/**
 * Ordo App - Services Index
 * Centralized export for all service modules
 * Phase 12 Complete - Advanced AI Analysis Platform
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
