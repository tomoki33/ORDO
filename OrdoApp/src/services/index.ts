/**
 * Ordo App - Services Index
 * Centralized export for all service modules
 */

// Core Services
export { StorageService, ProductStorage } from './StorageService';
export { sqliteService } from './sqliteService';
export { cameraService, CameraService } from './CameraService';

// Notification Services
export { 
  NotificationService, 
  notificationService
} from './NotificationService';
export type { 
  NotificationConfig,
  ScheduledNotification 
} from './NotificationService';

// AI Services
export { ObjectDetectionService } from './ObjectDetectionService';
export { MultiRegionExtractionService } from './MultiRegionExtractionService';
export { BatchOptimizationService } from './BatchOptimizationService';
export { FreshnessDetectionService } from './FreshnessDetectionService';

// Performance Services
export { startupOptimizer } from './StartupOptimizationService';
export { performanceMonitor } from './PerformanceMonitorService';
export { memoryOptimizer } from './MemoryOptimizationService';
export { backgroundProcessor } from './BackgroundProcessingOptimizationService';

// Voice Services
export { voiceRecognitionService } from './VoiceRecognitionService';
export { voiceCommandService } from './VoiceCommandAnalysisService';
export { multilingualService } from './MultilingualExtensionService';

// Analytics Services
export { usageAnalyticsEngine } from './UsageAnalyticsEngine';
export { predictiveAlgorithmService } from './PredictiveAlgorithmService';
export { learningDataService } from './LearningDataAccumulationService';

// Cloud Services
export { firebaseService } from './FirebaseService';
export { awsService } from './AWSService';
export { authenticationService } from './AuthenticationService';
export { synchronizationEngine } from './SynchronizationEngine';
export { conflictResolutionService } from './ConflictResolutionService';
export { cloudServiceManager } from './CloudServiceManager';

// User Management
export { userManagementService } from './UserManagementService';
export { sharedInventoryService } from './SharedInventoryService';

// Statistics & Reports
export { statisticsEngineService } from './StatisticsEngineService';
export { reportGenerationService } from './ReportGenerationService';
export { exportService } from './ExportService';

// Beta Testing Services
export { betaTestEnvironmentService } from './BetaTestEnvironmentService';
export { testFlightConfigurationService } from './TestFlightConfigurationService';
export { usabilityTestingService } from './UsabilityTestingService';
export { feedbackCollectionAnalysisService } from './FeedbackCollectionAnalysisService';
export { improvementImplementationTrackingService } from './ImprovementImplementationTrackingService';
export { betaTestingIntegrationService } from './BetaTestingIntegrationService';

// Type exports
export type { 
  DetectionResult,
  ObjectDetectionOutput,
  ModelConfig,
  DetectionMetrics 
} from './ObjectDetectionService';

export type { 
  ExtractedRegion,
  MultiRegionOutput,
  SegmentationMask,
  RegionExtractionConfig 
} from './MultiRegionExtractionService';

export type { 
  BatchProgress,
  BatchOutput,
  BatchResult,
  BatchProcessingConfig,
  OptimizationMetrics 
} from './BatchOptimizationService'; 
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
export type{
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

// Phase 16 - Settings & Data Management Services
export { DataExportImportService } from './DataExportImportService';
export type {
  ExportData,
  ImportResult as DataImportResult,
  ExportOptions as DataExportOptions,
  ImportOptions as DataImportOptions,
} from './DataExportImportService';

// Phase 17 - Security and Privacy Protection Services
export { DataEncryptionService } from './DataEncryptionService';
export type {
  EncryptionConfig,
  EncryptedData,
} from './DataEncryptionService';

export { LocalDataProtectionService, localDataProtectionService } from './LocalDataProtectionService';
export type {
  DataProtectionConfig,
  DataClassification,
  DataAccessLog,
  DataIntegrityCheck,
} from './LocalDataProtectionService';

export { ProtectedRepositoryWrapper, ProtectedRepositoryFactory } from './ProtectedRepositoryWrapper';

export { PrivacyPolicyService, privacyPolicyService } from './PrivacyPolicyService';
export type {
  PrivacyConsent,
  DataSubjectRequest,
  PrivacyPolicyVersion,
  PrivacyPolicyContent,
  PrivacyPolicySection,
  ContactInfo,
  LegalBasis,
  DataRetentionPolicy,
} from './PrivacyPolicyService';

export { GDPRComplianceService, gdprComplianceService } from './GDPRComplianceService';
export type {
  GDPRComplianceStatus,
  ComplianceIssue,
  DataMapping,
  DataSubjectRights,
  BreachIncident,
} from './GDPRComplianceService';

export { SecurityAuditService, securityAuditService } from './SecurityAuditService';
export type {
  SecurityTest,
  SecurityTestResult,
  SecurityFinding,
  SecurityAuditReport,
  PenetrationTestScenario,
  VulnerabilityAssessment,
  Vulnerability,
  RiskMatrix,
  MitigationPlan,
} from './SecurityAuditService';

// Phase 18 - Onboarding System
export { OnboardingService, onboardingService } from './OnboardingService';
export type {
  OnboardingStep,
  OnboardingProgress,
  OnboardingConfiguration,
  OnboardingMetrics,
} from './OnboardingService';

// Phase 19 - Usage Analytics and Predictive Recommendation System
export { usageAnalyticsEngine } from './UsageAnalyticsEngine';
export type {
  UsageEvent,
  ConsumptionPattern as AnalyticsConsumptionPattern,
  SeasonalPattern,
  UsageAnalyticsConfig,
  AnalyticsMetrics,
} from './UsageAnalyticsEngine';

export { predictiveAlgorithmService } from './PredictiveAlgorithmService';
export type {
  PredictionResult,
  RecommendationItem,
  SmartShoppingList,
  ConsumptionForecast,
  PredictionConfig,
  UserPreferences,
} from './PredictiveAlgorithmService';

export { learningDataService } from './LearningDataAccumulationService';
export type {
  LearningDataPoint,
  ModelPerformanceMetrics,
  LearningProgress,
  LearningConfig,
  DataValidationResult,
} from './LearningDataAccumulationService';

export { default as RecommendationSystemUI } from '../components/RecommendationSystemUI';

// Phase 20 - Beta Testing and Quality Assurance Services
export { betaTestEnvironmentService } from './BetaTestEnvironmentService';
export { testFlightConfigurationService } from './TestFlightConfigurationService';
export { usabilityTestingService } from './UsabilityTestingService';
export { feedbackCollectionAnalysisService } from './FeedbackCollectionAnalysisService';
export { improvementImplementationTrackingService } from './ImprovementImplementationTrackingService';
export { betaTestingIntegrationService } from './BetaTestingIntegrationService';

import { betaTestingIntegrationService } from './BetaTestingIntegrationService';

// Beta Testing Type Exports
export type { 
  BetaTester,
  TestSession,
  BetaEnvironmentMetrics
} from './BetaTestEnvironmentService';

export type {
  TestGroup,
  TestFlightConfiguration
} from './TestFlightConfigurationService';

export type {
  TestScenario,
  TestStep,
  TestParticipant,
  UsabilityInsights,
  UsabilityIssue
} from './UsabilityTestingService';

export type {
  FeedbackItem,
  FeedbackCampaign,
  FeedbackAnalytics
} from './FeedbackCollectionAnalysisService';

export type {
  ImprovementItem,
  ImprovementPlan,
  ImprovementAnalytics
} from './ImprovementImplementationTrackingService';

export type {
  BetaTestingConfiguration,
  BetaTestingDashboard,
  BetaTestingReport,
  QualityGate,
  Alert,
  Activity,
  Milestone
} from './BetaTestingIntegrationService';

/**
 * Beta Testing Quick Start Functions
 */

/**
 * ワンクリックでベータテスト開始
 */
export async function quickStartBetaTesting(): Promise<{
  testPlanId: string;
  dashboard: any;
  status: any;
}> {
  console.log('🚀 Quick Start: Beta Testing...');
  
  try {
    // Initialize integration service
    await betaTestingIntegrationService.initialize();
    
    // Start comprehensive beta testing
    const testPlanId = await betaTestingIntegrationService.startComprehensiveBetaTesting(
      'Comprehensive Beta Testing',
      15,
      28
    );
    
    // Get dashboard and status
    const dashboard = await betaTestingIntegrationService.updateDashboard();
    const status = betaTestingIntegrationService.getServiceStatus();

    return {
      testPlanId,
      dashboard,
      status,
    };
  } catch (error) {
    console.error('Failed to start beta testing:', error);
    throw error;
  }
}

/**
 * 完全なベータテスト分析レポート生成
 */
export async function generateFullBetaReport(): Promise<any> {
  console.log('📊 Generating comprehensive beta testing report...');
  
  return betaTestingIntegrationService.performAutomatedAnalysis();
}

/**
 * ベータテスト品質ゲート確認
 */
export async function checkQualityGates(): Promise<any> {
  console.log('🔍 Checking quality gates...');
  
  const dashboard = betaTestingIntegrationService.getDashboard();
  return dashboard?.progress.qualityGates || [];
}

/**
 * 使用例とサンプルコード
 */
export const betaTestingExamples = {
  // 基本的な使用例
  basicUsage: `
import { quickStartBetaTesting } from './services';

async function startBetaTest() {
  const result = await quickStartBetaTesting();
  console.log('Beta testing started:', result.testPlanId);
}
  `,

  // 個別サービス使用例
  individualServices: `
import { 
  betaTestEnvironmentService,
  usabilityTestingService,
  feedbackCollectionAnalysisService 
} from './services';

async function customBetaWorkflow() {
  // ベータテスター登録
  const tester = await betaTestEnvironmentService.registerBetaTester(
    'test@example.com',
    'Test User',
    'A'
  );

  // ユーザビリティテスト作成
  const testPlan = await usabilityTestingService.createTestPlan(
    'My Test Plan',
    'Testing new features',
    ['Objective 1', 'Objective 2']
  );

  // フィードバック収集開始
  const campaign = await feedbackCollectionAnalysisService.createFeedbackCampaign(
    'Feature Feedback',
    'Collect user feedback',
    'Improve user experience'
  );
}
  `,

  // 統合ダッシュボード使用例
  dashboardUsage: `
import { betaTestingIntegrationService } from './services';

async function monitorBetaTesting() {
  const dashboard = await betaTestingIntegrationService.updateDashboard();
  
  console.log('Total testers:', dashboard.overview.totalTesters);
  console.log('User satisfaction:', dashboard.metrics.userSatisfaction);
  console.log('Quality gates:', dashboard.progress.qualityGates);
  console.log('Recent alerts:', dashboard.alerts);
}
  `,
};
