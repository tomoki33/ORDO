/**
 * Ordo App - Components Index
 * Centralized export for all UI components
 */

// Core Components
export { Button } from './Button';
export { ProductCard } from './ProductCard';
export { ProductAutoFillForm } from './ProductAutoFillForm';

// Advanced UI Components
export { 
  DetectionVisualization,
  BatchProgressDisplay,
  AnalysisResults,
  PerformanceMetrics,
  Phase12Dashboard,
  AdvancedDetectionView,
  RegionExtractionManager
} from './EnhancedUIComponents';

// Analytics & Data Visualization
export { default as AnalyticsChartsUI } from './AnalyticsChartsUI';

// Demo & Integration Components
export { default as BarcodeIntegrationDemo } from './BarcodeIntegrationDemo';
export { default as DemoRunner } from './DemoRunner';
export { default as FoodStatusUIIntegration } from './FoodStatusUIIntegration';

// AI & Voice Components
export { default as VoiceUI } from './VoiceUI';
export { default as RecommendationSystemUI } from './RecommendationSystemUI';

// Cloud & Monitoring
export { default as CloudServiceMonitor } from './CloudServiceMonitor';

// Family & Sharing
export { default as FamilyManagementUI } from './FamilyManagementUI';
export { default as SharedInventoryUI } from './SharedInventoryUI';

// Branding Components
export { SplashScreen } from './branding/SplashScreen';
export { OrdoLogo } from './branding/OrdoLogo';

// Camera Components
export { CameraUI } from './camera/CameraUI';

// Type Exports
export type {
  DetectionVisualizationProps,
  BatchProgressProps,
  AnalysisResultsProps,
  PerformanceMetricsProps
} from './EnhancedUIComponents';
