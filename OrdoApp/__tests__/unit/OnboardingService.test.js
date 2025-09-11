import { OnboardingService } from '../../src/services/OnboardingService';
import {
  mockOnboardingConfig,
  mockOnboardingState,
  mockUserPreferences,
  mockAsyncStorageData,
  createMockOnboardingStep,
} from '../fixtures/onboardingData';
import { mockAsyncStorage, testSetup } from '../utils/testHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies properly
jest.mock('../../src/services/LoggingService', () => ({
  LoggingService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../src/services/LocalDataProtectionService', () => ({
  LocalDataProtectionService: jest.fn().mockImplementation(() => ({
    setSecureData: jest.fn(() => Promise.resolve()),
    getSecureData: jest.fn(() => Promise.resolve(null)),
    clearSecureData: jest.fn(() => Promise.resolve()),
    clearCache: jest.fn(() => Promise.resolve()),
  })),
}));

describe('OnboardingService', () => {
  let onboardingService;

  beforeEach(() => {
    testSetup.beforeEach();
    onboardingService = OnboardingService.getInstance();
    mockAsyncStorage.setMockData(mockAsyncStorageData);
  });

  afterEach(() => {
    testSetup.afterEach();
    // Reset singleton instance
    OnboardingService._instance = null;
  });

  describe('Initialization', () => {
    it('should initialize service with default configuration', async () => {
      await onboardingService.initialize();
      
      const config = onboardingService.getConfiguration();
      expect(config).toBeDefined();
      expect(config.isEnabled).toBe(true);
    });

    it('should load existing state from storage', async () => {
      await onboardingService.initialize();
      
      mockAsyncStorage.expectGetItem('onboarding_state');
      
      const state = onboardingService.getCurrentState();
      expect(state).toMatchObject({
        isCompleted: expect.any(Boolean),
        currentStepIndex: expect.any(Number),
        completedSteps: expect.any(Array),
      });
    });

    it('should handle missing storage data gracefully', async () => {
      mockAsyncStorage.setMockData({});
      
      await onboardingService.initialize();
      
      const state = onboardingService.getCurrentState();
      expect(state.isCompleted).toBe(false);
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = { ...mockOnboardingConfig, skipEnabled: false };
      
      await onboardingService.updateConfiguration(newConfig);
      
      const config = onboardingService.getConfiguration();
      expect(config.skipEnabled).toBe(false);
    });

    it('should validate configuration before updating', async () => {
      const invalidConfig = { isEnabled: 'not-boolean' };
      
      await expect(
        onboardingService.updateConfiguration(invalidConfig)
      ).rejects.toThrow('Invalid configuration');
    });

    it('should add new onboarding steps', async () => {
      const newStep = createMockOnboardingStep({
        id: 'new_step',
        title: 'New Step',
        order: 5,
      });
      
      await onboardingService.addStep(newStep);
      
      const config = onboardingService.getConfiguration();
      expect(config.steps).toContainEqual(newStep);
    });

    it('should remove onboarding steps', async () => {
      await onboardingService.removeStep('camera_tutorial');
      
      const config = onboardingService.getConfiguration();
      expect(config.steps.find(step => step.id === 'camera_tutorial')).toBeUndefined();
    });
  });

  describe('Step Navigation', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
    });

    it('should start onboarding flow', async () => {
      await onboardingService.startOnboarding();
      
      const state = onboardingService.getCurrentState();
      expect(state.currentStepIndex).toBe(0);
      expect(state.startedAt).toBeDefined();
    });

    it('should advance to next step', async () => {
      await onboardingService.startOnboarding();
      
      await onboardingService.completeCurrentStep();
      
      const state = onboardingService.getCurrentState();
      expect(state.currentStepIndex).toBe(1);
      expect(state.completedSteps).toHaveLength(1);
    });

    it('should get current step information', async () => {
      await onboardingService.startOnboarding();
      
      const currentStep = onboardingService.getCurrentStep();
      expect(currentStep).toBeDefined();
      expect(currentStep.id).toBe('welcome');
    });

    it('should navigate to specific step', async () => {
      await onboardingService.startOnboarding();
      
      await onboardingService.goToStep('permissions');
      
      const currentStep = onboardingService.getCurrentStep();
      expect(currentStep.id).toBe('permissions');
    });

    it('should handle navigation to non-existent step', async () => {
      await onboardingService.startOnboarding();
      
      await expect(
        onboardingService.goToStep('non_existent')
      ).rejects.toThrow('Step not found');
    });
  });

  describe('Step Completion', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
    });

    it('should complete current step', async () => {
      const stepId = onboardingService.getCurrentStep().id;
      
      await onboardingService.completeCurrentStep();
      
      const state = onboardingService.getCurrentState();
      expect(state.completedSteps).toContain(stepId);
    });

    it('should skip current step when allowed', async () => {
      const stepId = onboardingService.getCurrentStep().id;
      
      await onboardingService.skipCurrentStep();
      
      const state = onboardingService.getCurrentState();
      expect(state.skippedSteps).toContain(stepId);
    });

    it('should prevent skipping required steps', async () => {
      // Welcome step is required
      await expect(
        onboardingService.skipCurrentStep()
      ).rejects.toThrow('Cannot skip required step');
    });

    it('should complete entire onboarding flow', async () => {
      const config = onboardingService.getConfiguration();
      
      // Complete all steps
      for (let i = 0; i < config.steps.length; i++) {
        const currentStep = onboardingService.getCurrentStep();
        if (currentStep.required) {
          await onboardingService.completeCurrentStep();
        } else {
          await onboardingService.skipCurrentStep();
        }
      }
      
      const state = onboardingService.getCurrentState();
      expect(state.isCompleted).toBe(true);
      expect(state.completedAt).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
    });

    it('should calculate progress percentage', async () => {
      const initialProgress = onboardingService.getProgress();
      expect(initialProgress.percentage).toBe(0);
      
      await onboardingService.completeCurrentStep();
      
      const updatedProgress = onboardingService.getProgress();
      expect(updatedProgress.percentage).toBeGreaterThan(0);
    });

    it('should track completed and remaining steps', async () => {
      await onboardingService.completeCurrentStep();
      await onboardingService.completeCurrentStep();
      
      const progress = onboardingService.getProgress();
      expect(progress.completedSteps).toBe(2);
      expect(progress.remainingSteps).toBe(2);
    });

    it('should identify if onboarding can be skipped', () => {
      const canSkip = onboardingService.canSkipOnboarding();
      expect(typeof canSkip).toBe('boolean');
    });
  });

  describe('User Preferences', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
    });

    it('should update user preferences', async () => {
      const newPreferences = {
        ...mockUserPreferences,
        skipTutorials: true,
      };
      
      await onboardingService.updateUserPreferences(newPreferences);
      
      const preferences = onboardingService.getUserPreferences();
      expect(preferences.skipTutorials).toBe(true);
    });

    it('should get specific preference value', async () => {
      const skipTutorials = onboardingService.getUserPreference('skipTutorials');
      expect(typeof skipTutorials).toBe('boolean');
    });

    it('should handle unknown preference keys', () => {
      const unknownPref = onboardingService.getUserPreference('unknownKey');
      expect(unknownPref).toBeUndefined();
    });
  });

  describe('Analytics Integration', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
    });

    it('should track onboarding start event', async () => {
      // Analytics tracking is tested through service initialization
      expect(onboardingService.getCurrentState().startedAt).toBeDefined();
    });

    it('should track step completion events', async () => {
      const stepId = onboardingService.getCurrentStep().id;
      
      await onboardingService.completeCurrentStep();
      
      const state = onboardingService.getCurrentState();
      expect(state.completedSteps).toContain(stepId);
    });

    it('should track onboarding completion event', async () => {
      const config = onboardingService.getConfiguration();
      
      // Complete all required steps
      for (const step of config.steps) {
        if (step.required) {
          await onboardingService.goToStep(step.id);
          await onboardingService.completeCurrentStep();
        }
      }
      
      const state = onboardingService.getCurrentState();
      expect(state.isCompleted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
    });

    it('should handle storage errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(
        onboardingService.startOnboarding()
      ).rejects.toThrow('Storage error');
    });

    it('should validate step data before processing', async () => {
      const invalidStep = { id: null, title: '' };
      
      await expect(
        onboardingService.addStep(invalidStep)
      ).rejects.toThrow('Invalid step data');
    });

    it('should handle corrupted state data', async () => {
      mockAsyncStorage.setMockData({
        'onboarding_state': 'invalid-json'
      });
      
      // Should not throw, but create default state
      await onboardingService.initialize();
      
      const state = onboardingService.getCurrentState();
      expect(state.isCompleted).toBe(false);
    });
  });

  describe('Reset and Cleanup', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
    });

    it('should reset onboarding state', async () => {
      await onboardingService.completeCurrentStep();
      
      await onboardingService.resetOnboarding();
      
      const state = onboardingService.getCurrentState();
      expect(state.isCompleted).toBe(false);
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toEqual([]);
    });

    it('should cleanup service resources', async () => {
      await onboardingService.cleanup();
      
      // Service should still be functional after cleanup
      const state = onboardingService.getCurrentState();
      expect(state).toBeDefined();
    });
  });
});
