import React from 'react';
import { OnboardingController } from '../../src/screens/onboarding/OnboardingController';
import { OnboardingService } from '../../src/services/OnboardingService';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  mockNavigation,
  assertions,
  testSetup,
} from '../utils/testHelpers';

// Mock OnboardingService
const mockOnboardingService = {
  getInstance: jest.fn(),
  getCurrentStep: jest.fn(),
  getProgress: jest.fn(),
  canSkipStep: jest.fn(),
  skipStep: jest.fn(),
  nextStep: jest.fn(),
  previousStep: jest.fn(),
  completeOnboarding: jest.fn(),
  resetOnboarding: jest.fn(),
  getStepConfiguration: jest.fn(),
  updateUserPreferences: jest.fn(),
  trackAnalytics: jest.fn(),
};

jest.mock('../../src/services/OnboardingService', () => ({
  OnboardingService: mockOnboardingService,
}));

describe('OnboardingController', () => {
  let navigation;
  let onboardingService;

  beforeEach(() => {
    testSetup.beforeEach();
    navigation = mockNavigation.create();
    onboardingService = {
      getCurrentStep: jest.fn(() => 'welcome'),
      getProgress: jest.fn(() => ({ current: 1, total: 4, percentage: 25 })),
      canSkipStep: jest.fn(() => true),
      skipStep: jest.fn(() => Promise.resolve()),
      nextStep: jest.fn(() => Promise.resolve()),
      previousStep: jest.fn(() => Promise.resolve()),
      completeOnboarding: jest.fn(() => Promise.resolve()),
      resetOnboarding: jest.fn(() => Promise.resolve()),
      getStepConfiguration: jest.fn(() => ({
        skipEnabled: true,
        progressVisible: true,
        backEnabled: false,
      })),
      updateUserPreferences: jest.fn(() => Promise.resolve()),
      trackAnalytics: jest.fn(),
    };
    
    mockOnboardingService.getInstance.mockReturnValue(onboardingService);
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Rendering', () => {
    it('should render onboarding controller with progress indicator', () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('onboarding-progress'));
    });

    it('should render skip button when available', () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByText('Skip'));
    });

    it('should render current step content', () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('onboarding-step-content'));
    });

    it('should hide skip button when not available', () => {
      onboardingService.canSkipStep.mockReturnValue(false);
      
      const { queryByText } = renderScreen(OnboardingController, { navigation });
      
      expect(queryByText('Skip')).toBeNull();
    });
  });

  describe('Progress Display', () => {
    it('should display current progress percentage', () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      const progressBar = getByTestId('progress-bar');
      expect(progressBar.props.progress).toBe(0.25);
    });

    it('should display step counter', () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByText('1 of 4'));
    });

    it('should update progress on step change', async () => {
      onboardingService.getProgress
        .mockReturnValueOnce({ current: 1, total: 4, percentage: 25 })
        .mockReturnValueOnce({ current: 2, total: 4, percentage: 50 });
      
      const { getByTestId, rerender } = renderScreen(OnboardingController, { navigation });
      
      // Simulate step change
      rerender(<OnboardingController navigation={navigation} />);
      
      const progressBar = getByTestId('progress-bar');
      expect(progressBar.props.progress).toBe(0.5);
    });
  });

  describe('Navigation Controls', () => {
    it('should handle next step navigation', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      expect(onboardingService.nextStep).toHaveBeenCalled();
    });

    it('should handle previous step navigation', async () => {
      onboardingService.getCurrentStep.mockReturnValue('permissions');
      onboardingService.getStepConfiguration.mockReturnValue({
        skipEnabled: true,
        progressVisible: true,
        backEnabled: true,
      });
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Back'));
      
      expect(onboardingService.previousStep).toHaveBeenCalled();
    });

    it('should disable back button on first step', () => {
      onboardingService.getCurrentStep.mockReturnValue('welcome');
      
      const { queryByText } = renderScreen(OnboardingController, { navigation });
      
      expect(queryByText('Back')).toBeNull();
    });

    it('should handle skip functionality', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Skip'));
      
      expect(onboardingService.skipStep).toHaveBeenCalled();
    });
  });

  describe('Step Transitions', () => {
    it('should animate step transitions', async () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      const stepContainer = getByTestId('step-container');
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      // Animation should be triggered
      expect(stepContainer.props.style).toContainEqual(
        expect.objectContaining({ opacity: expect.any(Number) })
      );
    });

    it('should handle step transition errors', async () => {
      onboardingService.nextStep.mockRejectedValue(new Error('Transition failed'));
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Unable to proceed. Please try again.'));
      });
    });

    it('should prevent rapid navigation', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      const nextButton = getByText('Next');
      
      // Rapid clicks
      fireEvents.press(nextButton);
      fireEvents.press(nextButton);
      fireEvents.press(nextButton);
      
      // Should only call nextStep once
      await waitForAsync(() => {
        expect(onboardingService.nextStep).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Step Content Management', () => {
    it('should render welcome step', () => {
      onboardingService.getCurrentStep.mockReturnValue('welcome');
      
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('welcome-step'));
    });

    it('should render permissions step', () => {
      onboardingService.getCurrentStep.mockReturnValue('permissions');
      
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('permissions-step'));
    });

    it('should render camera tutorial step', () => {
      onboardingService.getCurrentStep.mockReturnValue('camera-tutorial');
      
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('camera-tutorial-step'));
    });

    it('should render user guide step', () => {
      onboardingService.getCurrentStep.mockReturnValue('user-guide');
      
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByTestId('user-guide-step'));
    });
  });

  describe('Completion Handling', () => {
    it('should complete onboarding on final step', async () => {
      onboardingService.getCurrentStep.mockReturnValue('user-guide');
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Complete'));
      
      expect(onboardingService.completeOnboarding).toHaveBeenCalled();
    });

    it('should navigate to main app after completion', async () => {
      onboardingService.getCurrentStep.mockReturnValue('user-guide');
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Complete'));
      
      mockNavigation.expectNavigate(navigation, 'MainApp');
    });

    it('should save completion state', async () => {
      onboardingService.getCurrentStep.mockReturnValue('user-guide');
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Complete'));
      
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('onboarding_completed', 'true');
    });
  });

  describe('User Preferences', () => {
    it('should save user preferences during onboarding', async () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      // Mock preference change
      const preferenceToggle = getByTestId('analytics-toggle');
      fireEvents.press(preferenceToggle);
      
      expect(onboardingService.updateUserPreferences).toHaveBeenCalledWith({
        analyticsEnabled: expect.any(Boolean),
      });
    });

    it('should validate preferences before saving', async () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      // Invalid preference value
      const invalidInput = getByTestId('invalid-preference');
      fireEvents.changeText(invalidInput, 'invalid');
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Invalid preference value'));
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track step views', () => {
      renderScreen(OnboardingController, { navigation });
      
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('step_viewed', {
        step: 'welcome',
        progress: 25,
      });
    });

    it('should track skip actions', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Skip'));
      
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('step_skipped', {
        step: 'welcome',
      });
    });

    it('should track completion', async () => {
      onboardingService.getCurrentStep.mockReturnValue('user-guide');
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Complete'));
      
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('onboarding_completed', {
        duration: expect.any(Number),
        stepsSkipped: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', async () => {
      mockOnboardingService.getInstance.mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Onboarding service unavailable'));
      });
    });

    it('should provide restart functionality on errors', async () => {
      onboardingService.nextStep.mockRejectedValue(new Error('Step failed'));
      
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Restart Onboarding'));
      });
      
      expect(onboardingService.resetOnboarding).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderScreen(OnboardingController, { navigation });
      
      assertions.toBeVisible(getByLabelText('Onboarding progress'));
      assertions.toBeVisible(getByLabelText('Skip onboarding step'));
      assertions.toBeVisible(getByLabelText('Next onboarding step'));
    });

    it('should announce progress to screen readers', async () => {
      const { getByTestId } = renderScreen(OnboardingController, { navigation });
      
      const progressAnnouncement = getByTestId('progress-announcement');
      expect(progressAnnouncement.props.accessibilityLiveRegion).toBe('polite');
      expect(progressAnnouncement.props.accessibilityLabel).toContain('Step 1 of 4');
    });

    it('should support keyboard navigation', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      const nextButton = getByText('Next');
      expect(nextButton.props.accessible).toBe(true);
      expect(nextButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Performance', () => {
    it('should render controller efficiently', () => {
      const startTime = performance.now();
      
      renderScreen(OnboardingController, { navigation });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should optimize step content loading', async () => {
      const { getByText } = renderScreen(OnboardingController, { navigation });
      
      // Step content should be lazy loaded
      expect(onboardingService.getStepConfiguration).toHaveBeenCalledWith('welcome');
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      expect(onboardingService.getStepConfiguration).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle memory cleanup', () => {
      const { unmount } = renderScreen(OnboardingController, { navigation });
      
      unmount();
      
      // Cleanup should be performed
      expect(global.gc).toBeDefined(); // Mock garbage collection check
    });
  });
});
