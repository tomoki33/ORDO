import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDataProtectionService } from './LocalDataProtectionService';
import { LoggingService } from './LoggingService';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  isRequired: boolean;
  isCompleted: boolean;
  order: number;
  dependencies?: string[];
  estimatedTimeMinutes: number;
  category: 'welcome' | 'permissions' | 'setup' | 'tutorial' | 'completion';
}

export interface OnboardingProgress {
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  hasSeenWelcome: boolean;
  version: string;
  userPreferences: {
    wantsNotifications: boolean;
    wantsCamera: boolean;
    skipTutorials: boolean;
    preferredLanguage: string;
  };
}

export interface OnboardingConfiguration {
  version: string;
  isEnabled: boolean;
  allowSkip: boolean;
  showProgress: boolean;
  autoSave: boolean;
  steps: OnboardingStep[];
  requiredPermissions: string[];
  optionalPermissions: string[];
}

export interface OnboardingMetrics {
  totalUsers: number;
  completedOnboarding: number;
  averageCompletionTime: number;
  dropOffPoints: { [stepId: string]: number };
  skipRates: { [stepId: string]: number };
  feedbackScores: number[];
}

export class OnboardingService {
  private static instance: OnboardingService;
  private loggingService: LoggingService;
  private currentProgress: OnboardingProgress | null = null;
  private configuration: OnboardingConfiguration | null = null;

  private readonly STORAGE_KEYS = {
    PROGRESS: 'onboarding_progress',
    CONFIG: 'onboarding_config',
    METRICS: 'onboarding_metrics',
    USER_FEEDBACK: 'onboarding_feedback',
  };

  private readonly DEFAULT_STEPS: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Ordo',
      description: 'Your smart food inventory manager',
      component: 'WelcomeScreen',
      isRequired: true,
      isCompleted: false,
      order: 1,
      estimatedTimeMinutes: 1,
      category: 'welcome',
    },
    {
      id: 'camera_permission',
      title: 'Camera Access',
      description: 'Allow camera access to scan food items',
      component: 'CameraPermissionScreen',
      isRequired: false,
      isCompleted: false,
      order: 2,
      estimatedTimeMinutes: 1,
      category: 'permissions',
    },
    {
      id: 'notification_permission',
      title: 'Notifications',
      description: 'Enable notifications for expiration alerts',
      component: 'NotificationPermissionScreen',
      isRequired: false,
      isCompleted: false,
      order: 3,
      estimatedTimeMinutes: 1,
      category: 'permissions',
    },
    {
      id: 'privacy_consent',
      title: 'Privacy & Data',
      description: 'Review privacy policy and data usage',
      component: 'PrivacyConsentScreen',
      isRequired: true,
      isCompleted: false,
      order: 4,
      dependencies: ['welcome'],
      estimatedTimeMinutes: 2,
      category: 'setup',
    },
    {
      id: 'create_first_location',
      title: 'Add Storage Location',
      description: 'Set up your first storage location',
      component: 'CreateLocationScreen',
      isRequired: false,
      isCompleted: false,
      order: 5,
      estimatedTimeMinutes: 2,
      category: 'setup',
    },
    {
      id: 'camera_tutorial',
      title: 'How to Scan',
      description: 'Learn how to scan and add food items',
      component: 'CameraTutorialScreen',
      isRequired: false,
      isCompleted: false,
      order: 6,
      dependencies: ['camera_permission'],
      estimatedTimeMinutes: 3,
      category: 'tutorial',
    },
    {
      id: 'inventory_tutorial',
      title: 'Managing Inventory',
      description: 'Learn how to organize your food inventory',
      component: 'InventoryTutorialScreen',
      isRequired: false,
      isCompleted: false,
      order: 7,
      estimatedTimeMinutes: 3,
      category: 'tutorial',
    },
    {
      id: 'expiration_tutorial',
      title: 'Expiration Tracking',
      description: 'Learn about expiration alerts and management',
      component: 'ExpirationTutorialScreen',
      isRequired: false,
      isCompleted: false,
      order: 8,
      dependencies: ['notification_permission'],
      estimatedTimeMinutes: 2,
      category: 'tutorial',
    },
    {
      id: 'completion',
      title: 'All Set!',
      description: 'Your setup is complete',
      component: 'CompletionScreen',
      isRequired: true,
      isCompleted: false,
      order: 9,
      estimatedTimeMinutes: 1,
      category: 'completion',
    },
  ];

  private constructor() {
    this.loggingService = new LoggingService();
  }

  public static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
      await this.loadProgress();
      console.log('[Onboarding] Service initialized successfully');
    } catch (error) {
      console.error('[Onboarding] Failed to initialize:', error);
      throw error;
    }
  }

  // ===== Configuration Management =====

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await localDataProtectionService.protectedRetrieve<OnboardingConfiguration>(
        this.STORAGE_KEYS.CONFIG
      );

      if (savedConfig) {
        this.configuration = savedConfig;
      } else {
        // Create default configuration
        this.configuration = {
          version: '1.0.0',
          isEnabled: true,
          allowSkip: true,
          showProgress: true,
          autoSave: true,
          steps: [...this.DEFAULT_STEPS],
          requiredPermissions: ['privacy_consent'],
          optionalPermissions: ['camera_permission', 'notification_permission'],
        };
        await this.saveConfiguration();
      }
    } catch (error) {
      console.error('[Onboarding] Failed to load configuration:', error);
      this.configuration = {
        version: '1.0.0',
        isEnabled: true,
        allowSkip: true,
        showProgress: true,
        autoSave: true,
        steps: [...this.DEFAULT_STEPS],
        requiredPermissions: ['privacy_consent'],
        optionalPermissions: ['camera_permission', 'notification_permission'],
      };
    }
  }

  private async saveConfiguration(): Promise<void> {
    if (this.configuration) {
      await localDataProtectionService.protectedStore(
        this.STORAGE_KEYS.CONFIG,
        this.configuration,
        'settings_data'
      );
    }
  }

  async updateConfiguration(updates: Partial<OnboardingConfiguration>): Promise<void> {
    if (this.configuration) {
      this.configuration = { ...this.configuration, ...updates };
      await this.saveConfiguration();
    }
  }

  // ===== Progress Management =====

  private async loadProgress(): Promise<void> {
    try {
      const savedProgress = await localDataProtectionService.protectedRetrieve<OnboardingProgress>(
        this.STORAGE_KEYS.PROGRESS
      );

      if (savedProgress) {
        this.currentProgress = savedProgress;
      } else {
        // Create initial progress
        this.currentProgress = {
          currentStepIndex: 0,
          completedSteps: [],
          skippedSteps: [],
          startedAt: new Date(),
          isCompleted: false,
          hasSeenWelcome: false,
          version: this.configuration?.version || '1.0.0',
          userPreferences: {
            wantsNotifications: true,
            wantsCamera: true,
            skipTutorials: false,
            preferredLanguage: 'en',
          },
        };
        await this.saveProgress();
      }
    } catch (error) {
      console.error('[Onboarding] Failed to load progress:', error);
    }
  }

  private async saveProgress(): Promise<void> {
    if (this.currentProgress) {
      await localDataProtectionService.protectedStore(
        this.STORAGE_KEYS.PROGRESS,
        this.currentProgress,
        'user_data'
      );
    }
  }

  // ===== Onboarding Flow Control =====

  async shouldShowOnboarding(): Promise<boolean> {
    if (!this.configuration?.isEnabled) {
      return false;
    }

    if (!this.currentProgress) {
      return true;
    }

    // Check if onboarding is already completed
    if (this.currentProgress.isCompleted) {
      return false;
    }

    // Check if version has changed (may need to show new steps)
    if (this.currentProgress.version !== this.configuration.version) {
      return true;
    }

    return true;
  }

  async startOnboarding(): Promise<OnboardingStep | null> {
    try {
      if (!this.configuration) {
        throw new Error('Onboarding not configured');
      }

      if (!this.currentProgress) {
        this.currentProgress = {
          currentStepIndex: 0,
          completedSteps: [],
          skippedSteps: [],
          startedAt: new Date(),
          isCompleted: false,
          hasSeenWelcome: false,
          version: this.configuration.version,
          userPreferences: {
            wantsNotifications: true,
            wantsCamera: true,
            skipTutorials: false,
            preferredLanguage: 'en',
          },
        };
      }

      // Reset if version changed
      if (this.currentProgress.version !== this.configuration.version) {
        this.currentProgress = {
          ...this.currentProgress,
          currentStepIndex: 0,
          version: this.configuration.version,
          startedAt: new Date(),
          isCompleted: false,
        };
      }

      await this.saveProgress();
      await this.logEvent('onboarding_started');

      return this.getCurrentStep();
    } catch (error) {
      console.error('[Onboarding] Failed to start onboarding:', error);
      return null;
    }
  }

  getCurrentStep(): OnboardingStep | null {
    if (!this.configuration || !this.currentProgress) {
      return null;
    }

    const availableSteps = this.getAvailableSteps();
    if (this.currentProgress.currentStepIndex >= availableSteps.length) {
      return null;
    }

    return availableSteps[this.currentProgress.currentStepIndex];
  }

  getAvailableSteps(): OnboardingStep[] {
    if (!this.configuration || !this.currentProgress) {
      return [];
    }

    return this.configuration.steps
      .filter(step => this.isDependencySatisfied(step))
      .sort((a, b) => a.order - b.order);
  }

  private isDependencySatisfied(step: OnboardingStep): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(dep => 
      this.currentProgress!.completedSteps.includes(dep)
    );
  }

  async completeStep(stepId: string, data?: any): Promise<OnboardingStep | null> {
    try {
      if (!this.currentProgress || !this.configuration) {
        throw new Error('Onboarding not initialized');
      }

      // Mark step as completed
      if (!this.currentProgress.completedSteps.includes(stepId)) {
        this.currentProgress.completedSteps.push(stepId);
      }

      // Remove from skipped if it was skipped before
      this.currentProgress.skippedSteps = this.currentProgress.skippedSteps.filter(
        id => id !== stepId
      );

      // Update step data if provided
      if (data) {
        await this.updateStepData(stepId, data);
      }

      // Move to next step
      const availableSteps = this.getAvailableSteps();
      this.currentProgress.currentStepIndex++;

      // Check if onboarding is completed
      const requiredSteps = this.configuration.steps.filter(step => step.isRequired);
      const completedRequiredSteps = requiredSteps.filter(step => 
        this.currentProgress!.completedSteps.includes(step.id)
      );

      if (completedRequiredSteps.length === requiredSteps.length || 
          this.currentProgress.currentStepIndex >= availableSteps.length) {
        await this.completeOnboarding();
        return null;
      }

      await this.saveProgress();
      await this.logEvent('step_completed', { stepId, data });

      return this.getCurrentStep();
    } catch (error) {
      console.error('[Onboarding] Failed to complete step:', error);
      return null;
    }
  }

  async skipStep(stepId: string, reason?: string): Promise<OnboardingStep | null> {
    try {
      if (!this.currentProgress || !this.configuration) {
        throw new Error('Onboarding not initialized');
      }

      const step = this.configuration.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error('Step not found');
      }

      if (step.isRequired) {
        throw new Error('Cannot skip required step');
      }

      if (!this.configuration.allowSkip) {
        throw new Error('Skip not allowed');
      }

      // Mark step as skipped
      if (!this.currentProgress.skippedSteps.includes(stepId)) {
        this.currentProgress.skippedSteps.push(stepId);
      }

      // Move to next step
      this.currentProgress.currentStepIndex++;

      await this.saveProgress();
      await this.logEvent('step_skipped', { stepId, reason });

      // Update metrics
      await this.updateSkipMetrics(stepId);

      return this.getCurrentStep();
    } catch (error) {
      console.error('[Onboarding] Failed to skip step:', error);
      throw error;
    }
  }

  async goToPreviousStep(): Promise<OnboardingStep | null> {
    if (!this.currentProgress || this.currentProgress.currentStepIndex <= 0) {
      return null;
    }

    this.currentProgress.currentStepIndex--;
    await this.saveProgress();

    return this.getCurrentStep();
  }

  async goToStep(stepId: string): Promise<OnboardingStep | null> {
    if (!this.configuration || !this.currentProgress) {
      return null;
    }

    const availableSteps = this.getAvailableSteps();
    const stepIndex = availableSteps.findIndex(step => step.id === stepId);

    if (stepIndex === -1) {
      return null;
    }

    this.currentProgress.currentStepIndex = stepIndex;
    await this.saveProgress();

    return this.getCurrentStep();
  }

  private async completeOnboarding(): Promise<void> {
    if (!this.currentProgress) {
      return;
    }

    this.currentProgress.isCompleted = true;
    this.currentProgress.completedAt = new Date();

    await this.saveProgress();
    await this.logEvent('onboarding_completed');
    await this.updateCompletionMetrics();

    console.log('[Onboarding] Onboarding completed successfully');
  }

  // ===== Progress Information =====

  getProgress(): {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    estimatedTimeRemaining: number;
  } {
    if (!this.configuration || !this.currentProgress) {
      return {
        currentStep: 0,
        totalSteps: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
      };
    }

    const availableSteps = this.getAvailableSteps();
    const currentStep = this.currentProgress.currentStepIndex + 1;
    const totalSteps = availableSteps.length;
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    // Calculate estimated time remaining
    const remainingSteps = availableSteps.slice(this.currentProgress.currentStepIndex);
    const estimatedTimeRemaining = remainingSteps.reduce(
      (total, step) => total + step.estimatedTimeMinutes,
      0
    );

    return {
      currentStep,
      totalSteps,
      percentage: Math.min(percentage, 100),
      estimatedTimeRemaining,
    };
  }

  getCompletedSteps(): OnboardingStep[] {
    if (!this.configuration || !this.currentProgress) {
      return [];
    }

    return this.configuration.steps.filter(step =>
      this.currentProgress!.completedSteps.includes(step.id)
    );
  }

  getSkippedSteps(): OnboardingStep[] {
    if (!this.configuration || !this.currentProgress) {
      return [];
    }

    return this.configuration.steps.filter(step =>
      this.currentProgress!.skippedSteps.includes(step.id)
    );
  }

  // ===== User Preferences =====

  async updateUserPreferences(preferences: Partial<OnboardingProgress['userPreferences']>): Promise<void> {
    if (!this.currentProgress) {
      return;
    }

    this.currentProgress.userPreferences = {
      ...this.currentProgress.userPreferences,
      ...preferences,
    };

    await this.saveProgress();
  }

  getUserPreferences(): OnboardingProgress['userPreferences'] | null {
    return this.currentProgress?.userPreferences || null;
  }

  // ===== Step Data Management =====

  private async updateStepData(stepId: string, data: any): Promise<void> {
    try {
      await localDataProtectionService.protectedStore(
        `onboarding_step_${stepId}`,
        {
          stepId,
          data,
          completedAt: new Date(),
        },
        'user_data'
      );
    } catch (error) {
      console.error('[Onboarding] Failed to update step data:', error);
    }
  }

  async getStepData(stepId: string): Promise<any> {
    try {
      const stepData = await localDataProtectionService.protectedRetrieve<{
        stepId: string;
        data: any;
        completedAt: Date;
      }>(`onboarding_step_${stepId}`);
      return stepData?.data || null;
    } catch (error) {
      console.error('[Onboarding] Failed to get step data:', error);
      return null;
    }
  }

  // ===== Analytics and Metrics =====

  private async logEvent(eventType: string, data?: any): Promise<void> {
    try {
      await this.loggingService.info(
        'onboarding' as any,
        `Onboarding event: ${eventType}`,
        {
          eventType,
          data,
          timestamp: new Date().toISOString(),
          stepIndex: this.currentProgress?.currentStepIndex,
        }
      );
    } catch (error) {
      console.error('[Onboarding] Failed to log event:', error);
    }
  }

  private async updateSkipMetrics(stepId: string): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      if (!metrics.skipRates[stepId]) {
        metrics.skipRates[stepId] = 0;
      }
      metrics.skipRates[stepId]++;

      await localDataProtectionService.protectedStore(
        this.STORAGE_KEYS.METRICS,
        metrics,
        'analytics_data'
      );
    } catch (error) {
      console.error('[Onboarding] Failed to update skip metrics:', error);
    }
  }

  private async updateCompletionMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      metrics.completedOnboarding++;

      if (this.currentProgress?.startedAt && this.currentProgress?.completedAt) {
        const completionTime = this.currentProgress.completedAt.getTime() - 
                              this.currentProgress.startedAt.getTime();
        const completionTimeMinutes = completionTime / (1000 * 60);
        
        // Update average completion time
        const totalCompletionTime = metrics.averageCompletionTime * (metrics.completedOnboarding - 1);
        metrics.averageCompletionTime = (totalCompletionTime + completionTimeMinutes) / metrics.completedOnboarding;
      }

      await localDataProtectionService.protectedStore(
        this.STORAGE_KEYS.METRICS,
        metrics,
        'analytics_data'
      );
    } catch (error) {
      console.error('[Onboarding] Failed to update completion metrics:', error);
    }
  }

  async getMetrics(): Promise<OnboardingMetrics> {
    try {
      const metrics = await localDataProtectionService.protectedRetrieve<OnboardingMetrics>(
        this.STORAGE_KEYS.METRICS
      );

      return metrics || {
        totalUsers: 0,
        completedOnboarding: 0,
        averageCompletionTime: 0,
        dropOffPoints: {},
        skipRates: {},
        feedbackScores: [],
      };
    } catch (error) {
      console.error('[Onboarding] Failed to get metrics:', error);
      return {
        totalUsers: 0,
        completedOnboarding: 0,
        averageCompletionTime: 0,
        dropOffPoints: {},
        skipRates: {},
        feedbackScores: [],
      };
    }
  }

  // ===== Reset and Management =====

  async resetOnboarding(): Promise<void> {
    try {
      this.currentProgress = {
        currentStepIndex: 0,
        completedSteps: [],
        skippedSteps: [],
        startedAt: new Date(),
        isCompleted: false,
        hasSeenWelcome: false,
        version: this.configuration?.version || '1.0.0',
        userPreferences: {
          wantsNotifications: true,
          wantsCamera: true,
          skipTutorials: false,
          preferredLanguage: 'en',
        },
      };

      await this.saveProgress();
      await this.logEvent('onboarding_reset');
    } catch (error) {
      console.error('[Onboarding] Failed to reset onboarding:', error);
      throw error;
    }
  }

  async isStepCompleted(stepId: string): Promise<boolean> {
    return this.currentProgress?.completedSteps.includes(stepId) || false;
  }

  async isStepSkipped(stepId: string): Promise<boolean> {
    return this.currentProgress?.skippedSteps.includes(stepId) || false;
  }

  getConfiguration(): OnboardingConfiguration | null {
    return this.configuration;
  }

  getCurrentProgress(): OnboardingProgress | null {
    return this.currentProgress;
  }
}

// Singleton instance
export const onboardingService = OnboardingService.getInstance();
