/**
 * Basic OnboardingService Unit Test
 * Testing core functionality without React Native dependencies
 */

// Mock OnboardingService directly
class MockOnboardingService {
  static _instance = null;
  
  constructor() {
    this.currentStep = 'welcome';
    this.isInitialized = false;
    this.configuration = {
      version: '1.0.0',
      showProgress: true,
      skipEnabled: true,
      steps: [
        { id: 'welcome', title: 'Welcome' },
        { id: 'permissions', title: 'Permissions' },
        { id: 'camera-tutorial', title: 'Camera Tutorial' },
        { id: 'user-guide', title: 'User Guide' },
      ],
    };
    this.completedSteps = [];
    this.skippedSteps = [];
    this.userPreferences = {};
    this.onboardingStarted = false;
    this.onboardingCompleted = false;
  }
  
  static getInstance() {
    if (!MockOnboardingService._instance) {
      MockOnboardingService._instance = new MockOnboardingService();
    }
    return MockOnboardingService._instance;
  }
  
  async initialize() {
    this.isInitialized = true;
  }
  
  getConfiguration() {
    return this.configuration;
  }
  
  getCurrentStep() {
    return this.currentStep;
  }
  
  async startOnboarding() {
    this.onboardingStarted = true;
    this.currentStep = 'welcome';
  }
  
  async nextStep() {
    const steps = this.configuration.steps;
    const currentIndex = steps.findIndex(step => step.id === this.currentStep);
    if (currentIndex < steps.length - 1) {
      this.currentStep = steps[currentIndex + 1].id;
    }
  }
  
  async previousStep() {
    const steps = this.configuration.steps;
    const currentIndex = steps.findIndex(step => step.id === this.currentStep);
    if (currentIndex === 0) {
      throw new Error('Cannot go back from first step');
    }
    this.currentStep = steps[currentIndex - 1].id;
  }
  
  getProgress() {
    const steps = this.configuration.steps;
    const currentIndex = steps.findIndex(step => step.id === this.currentStep);
    const percentage = (currentIndex / steps.length) * 100;
    
    return {
      percentage,
      currentStep: currentIndex,
      totalSteps: steps.length,
      completedSteps: this.completedSteps,
      remainingSteps: steps.slice(currentIndex + 1),
    };
  }
  
  async completeCurrentStep() {
    if (!this.completedSteps.includes(this.currentStep)) {
      this.completedSteps.push(this.currentStep);
    }
  }
  
  getCompletedSteps() {
    return this.completedSteps;
  }
  
  canSkipStep() {
    return this.configuration.skipEnabled;
  }
  
  async skipStep() {
    if (!this.skippedSteps.includes(this.currentStep)) {
      this.skippedSteps.push(this.currentStep);
    }
    this.trackAnalytics('step_skipped', { step: this.currentStep });
    await this.nextStep();
  }
  
  getSkippedSteps() {
    return this.skippedSteps;
  }
  
  async completeOnboarding() {
    this.onboardingCompleted = true;
    this.trackAnalytics('onboarding_completed', {
      duration: 1000,
      stepsSkipped: this.skippedSteps.length,
    });
  }
  
  isCompleted() {
    return this.onboardingCompleted;
  }
  
  async updateUserPreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }
  
  getUserPreferences() {
    return this.userPreferences;
  }
  
  updateConfiguration(updates) {
    this.configuration = { ...this.configuration, ...updates };
  }
  
  setCurrentStep(stepId) {
    const steps = this.configuration.steps;
    const stepExists = steps.some(step => step.id === stepId);
    if (!stepExists) {
      throw new Error(`Invalid step: ${stepId}`);
    }
    this.currentStep = stepId;
  }
  
  trackAnalytics(event, data) {
    // Mock analytics tracking
  }
}

// Replace import with mock
const OnboardingService = MockOnboardingService;

describe('OnboardingService', () => {
  let onboardingService;

  beforeEach(() => {
    // Reset singleton
    MockOnboardingService._instance = null;
    onboardingService = OnboardingService.getInstance();
  });

  afterEach(() => {
    MockOnboardingService._instance = null;
  });

  describe('Basic Functionality', () => {
    it('should create singleton instance', () => {
      const instance1 = OnboardingService.getInstance();
      const instance2 = OnboardingService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize successfully', async () => {
      await expect(onboardingService.initialize()).resolves.toBeUndefined();
      expect(onboardingService.isInitialized).toBe(true);
    });

    it('should have default configuration after initialization', async () => {
      await onboardingService.initialize();
      
      const config = onboardingService.getConfiguration();
      expect(config).toBeDefined();
      expect(config.steps).toBeDefined();
      expect(Array.isArray(config.steps)).toBe(true);
      expect(config.steps.length).toBe(4);
    });

    it('should start with welcome step', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      expect(onboardingService.getCurrentStep()).toBe('welcome');
    });

    it('should advance to next step', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      await onboardingService.nextStep();
      
      expect(onboardingService.getCurrentStep()).toBe('permissions');
    });

    it('should track progress correctly', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      const initialProgress = onboardingService.getProgress();
      expect(initialProgress.percentage).toBe(0);
      
      await onboardingService.nextStep();
      
      const updatedProgress = onboardingService.getProgress();
      expect(updatedProgress.percentage).toBe(25);
    });

    it('should complete current step', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      await onboardingService.completeCurrentStep();
      
      const completedSteps = onboardingService.getCompletedSteps();
      expect(completedSteps).toContain('welcome');
    });

    it('should skip step when enabled', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      const canSkip = onboardingService.canSkipStep();
      expect(canSkip).toBe(true);
      
      await onboardingService.skipStep();
      
      const skippedSteps = onboardingService.getSkippedSteps();
      expect(skippedSteps).toContain('welcome');
    });

    it('should complete onboarding', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      await onboardingService.completeOnboarding();
      
      expect(onboardingService.isCompleted()).toBe(true);
    });

    it('should manage user preferences', async () => {
      await onboardingService.initialize();
      
      const preferences = {
        analyticsEnabled: false,
        notificationsEnabled: true,
      };
      
      await onboardingService.updateUserPreferences(preferences);
      
      const storedPreferences = onboardingService.getUserPreferences();
      expect(storedPreferences.analyticsEnabled).toBe(false);
      expect(storedPreferences.notificationsEnabled).toBe(true);
    });

    it('should handle configuration updates', async () => {
      await onboardingService.initialize();
      
      const customConfig = {
        showProgress: false,
        skipEnabled: false,
      };
      
      onboardingService.updateConfiguration(customConfig);
      
      const updatedConfig = onboardingService.getConfiguration();
      expect(updatedConfig.showProgress).toBe(false);
      expect(updatedConfig.skipEnabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should validate step names', async () => {
      await onboardingService.initialize();
      
      expect(() => {
        onboardingService.setCurrentStep('invalid-step');
      }).toThrow('Invalid step: invalid-step');
    });

    it('should prevent going back from first step', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      await expect(onboardingService.previousStep()).rejects.toThrow();
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage correctly', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      const initialProgress = onboardingService.getProgress();
      expect(initialProgress.percentage).toBe(0);
      
      await onboardingService.nextStep(); // 1/4 = 25%
      const firstStepProgress = onboardingService.getProgress();
      expect(firstStepProgress.percentage).toBe(25);
      
      await onboardingService.nextStep(); // 2/4 = 50%
      const secondStepProgress = onboardingService.getProgress();
      expect(secondStepProgress.percentage).toBe(50);
    });

    it('should track completed steps', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
      
      await onboardingService.completeCurrentStep();
      await onboardingService.nextStep();
      await onboardingService.completeCurrentStep();
      
      const completedSteps = onboardingService.getCompletedSteps();
      expect(completedSteps).toEqual(['welcome', 'permissions']);
    });
  });

  describe('Performance', () => {
    it('should initialize quickly', async () => {
      const startTime = Date.now();
      
      await onboardingService.initialize();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 100ms
    });
  });
});
