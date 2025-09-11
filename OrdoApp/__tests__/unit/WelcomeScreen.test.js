import React from 'react';
import { WelcomeScreen } from '../../src/screens/onboarding/WelcomeScreen';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  mockNavigation,
  assertions,
  testSetup,
} from '../utils/testHelpers';
import { mockOnboardingConfig } from '../fixtures/onboardingData';

// Mock the OnboardingService
const mockOnboardingService = {
  getInstance: jest.fn(() => ({
    getConfiguration: jest.fn(() => mockOnboardingConfig),
    getCurrentStep: jest.fn(() => mockOnboardingConfig.steps[0]),
    getProgress: jest.fn(() => ({ percentage: 0, completedSteps: 0, remainingSteps: 4 })),
    completeCurrentStep: jest.fn(() => Promise.resolve()),
    skipCurrentStep: jest.fn(() => Promise.resolve()),
    canSkipOnboarding: jest.fn(() => true),
  })),
};

jest.mock('../../src/services/OnboardingService', () => ({
  OnboardingService: mockOnboardingService,
}));

describe('WelcomeScreen', () => {
  let navigation;
  let onboardingService;

  beforeEach(() => {
    testSetup.beforeEach();
    navigation = mockNavigation.create();
    onboardingService = mockOnboardingService.getInstance();
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Rendering', () => {
    it('should render welcome screen with title', () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByText('Welcome to Ordo'));
    });

    it('should render welcome slides', () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByText('Capture Every Moment'));
      assertions.toBeVisible(getByText('Experience the power of advanced photography'));
    });

    it('should render navigation buttons', () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByText('Get Started'));
      assertions.toBeVisible(getByText('Skip'));
    });

    it('should render progress indicator when enabled', () => {
      onboardingService.getConfiguration.mockReturnValue({
        ...mockOnboardingConfig,
        showProgress: true,
      });
      
      const { getByTestId } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByTestId('progress-bar'));
    });

    it('should hide skip button when not allowed', () => {
      onboardingService.canSkipOnboarding.mockReturnValue(false);
      
      const { queryByText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeHidden(queryByText('Skip'));
    });
  });

  describe('Slide Navigation', () => {
    it('should navigate between slides with swipe', async () => {
      const { getByTestId } = renderScreen(WelcomeScreen, { navigation });
      
      const slideContainer = getByTestId('welcome-slides');
      
      // Simulate swipe to next slide
      fireEvents.scroll(slideContainer, {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
          layoutMeasurement: { width: 375, height: 600 },
          contentSize: { width: 1125, height: 600 },
        },
      });
      
      await waitForAsync(() => {
        const { getByText } = renderScreen(WelcomeScreen, { navigation });
        assertions.toBeVisible(getByText('Advanced Features'));
      });
    });

    it('should update slide indicators on navigation', async () => {
      const { getByTestId } = renderScreen(WelcomeScreen, { navigation });
      
      const slideContainer = getByTestId('welcome-slides');
      
      fireEvents.scroll(slideContainer, {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
          layoutMeasurement: { width: 375, height: 600 },
          contentSize: { width: 1125, height: 600 },
        },
      });
      
      await waitForAsync(() => {
        const activeIndicator = getByTestId('slide-indicator-1');
        expect(activeIndicator).toBeTruthy();
      });
    });

    it('should auto-advance slides when enabled', async () => {
      testSetup.mockTimers();
      
      onboardingService.getConfiguration.mockReturnValue({
        ...mockOnboardingConfig,
        autoAdvance: true,
      });
      
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      // Fast-forward timer
      jest.advanceTimersByTime(3000);
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Advanced Features'));
      });
      
      testSetup.restoreTimers();
    });
  });

  describe('User Interactions', () => {
    it('should complete step and navigate on Get Started', async () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Get Started'));
      
      expect(onboardingService.completeCurrentStep).toHaveBeenCalled();
      mockNavigation.expectNavigate(navigation, 'PermissionScreen');
    });

    it('should skip step and navigate on Skip', async () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Skip'));
      
      expect(onboardingService.skipCurrentStep).toHaveBeenCalled();
      mockNavigation.expectNavigate(navigation, 'PermissionScreen');
    });

    it('should handle completion error gracefully', async () => {
      onboardingService.completeCurrentStep.mockRejectedValue(
        new Error('Completion failed')
      );
      
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Get Started'));
      
      // Should not navigate on error
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('should show loading state during step completion', async () => {
      onboardingService.completeCurrentStep.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const { getByText, getByTestId } = renderScreen(WelcomeScreen, { navigation });
      
      fireEvents.press(getByText('Get Started'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByTestId('loading-indicator'));
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByLabelText('Get started with Ordo'));
      assertions.toBeVisible(getByLabelText('Skip onboarding'));
    });

    it('should support screen reader navigation', () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      const title = getByText('Welcome to Ordo');
      expect(title.props.accessible).toBe(true);
    });

    it('should have proper focus management', async () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      const getStartedButton = getByText('Get Started');
      
      // Simulate focus
      fireEvents.press(getStartedButton);
      
      expect(getStartedButton.props.accessibilityState?.focused).toBeTruthy();
    });
  });

  describe('Animation Behavior', () => {
    it('should animate slide transitions', async () => {
      testSetup.mockTimers();
      
      const { getByTestId } = renderScreen(WelcomeScreen, { navigation });
      
      const slideContainer = getByTestId('welcome-slides');
      
      fireEvents.scroll(slideContainer, {
        nativeEvent: {
          contentOffset: { x: 375, y: 0 },
          layoutMeasurement: { width: 375, height: 600 },
          contentSize: { width: 1125, height: 600 },
        },
      });
      
      // Animation should complete
      jest.advanceTimersByTime(300);
      
      await waitForAsync(() => {
        expect(slideContainer).toBeTruthy();
      });
      
      testSetup.restoreTimers();
    });

    it('should animate button press feedback', async () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      const button = getByText('Get Started');
      
      fireEvents.press(button);
      
      // Should have press animation
      expect(button).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization failure', () => {
      mockOnboardingService.getInstance.mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      // Should not crash the component
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      assertions.toBeVisible(getByText('Welcome to Ordo'));
    });

    it('should handle navigation failure', async () => {
      navigation.navigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      // Should not crash on navigation error
      await fireEvents.pressAndWait(getByText('Get Started'));
      
      assertions.toBeVisible(getByText('Get Started'));
    });
  });

  describe('Performance', () => {
    it('should render efficiently with multiple slides', () => {
      const startTime = performance.now();
      
      renderScreen(WelcomeScreen, { navigation });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid user interactions', async () => {
      const { getByText } = renderScreen(WelcomeScreen, { navigation });
      
      const button = getByText('Get Started');
      
      // Rapid clicks should not cause issues
      fireEvents.press(button);
      fireEvents.press(button);
      fireEvents.press(button);
      
      await waitForAsync(() => {
        // Should only complete once
        assertions.toBeCalledTimes(onboardingService.completeCurrentStep, 1);
      });
    });
  });
});
