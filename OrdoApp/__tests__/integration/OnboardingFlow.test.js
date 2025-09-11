/**
 * Onboarding Flow Integration Tests
 * Tests the complete user journey through the onboarding process
 */

import React from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingFlow } from '../../src/flows/OnboardingFlow';
import { OnboardingService } from '../../src/services/OnboardingService';
import { PermissionService } from '../../src/services/PermissionService';
import { CameraService } from '../../src/services/CameraService';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  assertions,
  testSetup,
  createMockNavigation,
} from '../utils/testHelpers';

// Real service instances for integration testing
jest.unmock('../../src/services/OnboardingService');
jest.unmock('../../src/services/PermissionService');

// Mock only external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/permissions');
jest.mock('react-native-camera');

describe('Onboarding Flow Integration', () => {
  let onboardingService;
  let permissionService;
  let cameraService;
  let navigation;

  beforeEach(async () => {
    testSetup.beforeEach();
    
    // Initialize real services
    onboardingService = OnboardingService.getInstance();
    permissionService = PermissionService.getInstance();
    cameraService = CameraService.getInstance();
    
    // Reset services to initial state
    await onboardingService.resetOnboarding();
    
    // Setup navigation
    navigation = createMockNavigation();
    
    // Mock permissions in granted state
    require('@react-native-community/permissions').check.mockResolvedValue('granted');
    require('@react-native-community/permissions').request.mockResolvedValue('granted');
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Complete Onboarding Journey', () => {
    it('should complete full onboarding flow successfully', async () => {
      const { getByText, getByTestId } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Step 1: Welcome Screen
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Welcome to Ordo'));
        assertions.toBeVisible(getByText('Get Started'));
      });

      // Verify initial state
      expect(onboardingService.getCurrentStep()).toBe('welcome');
      expect(onboardingService.getProgress().percentage).toBe(0);

      // Proceed to next step
      await fireEvents.pressAndWait(getByText('Get Started'));

      // Step 2: Permission Screen
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Grant Permissions'));
        assertions.toBeVisible(getByText('Camera Access'));
        assertions.toBeVisible(getByText('Notification Access'));
      });

      expect(onboardingService.getCurrentStep()).toBe('permissions');
      expect(onboardingService.getProgress().percentage).toBe(25);

      // Grant camera permission
      await fireEvents.pressAndWait(getByText('Grant Camera Access'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        expect(cameraStatus.props.children).toContain('Granted');
      });

      // Grant notification permission
      await fireEvents.pressAndWait(getByText('Grant Notification Access'));
      
      await waitForAsync(() => {
        const notificationStatus = getByTestId('notification-permission-status');
        expect(notificationStatus.props.children).toContain('Granted');
      });

      // Continue to next step
      await fireEvents.pressAndWait(getByText('Continue'));

      // Step 3: Camera Tutorial
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera Tutorial'));
        assertions.toBeVisible(getByText('Learn the Basics'));
      });

      expect(onboardingService.getCurrentStep()).toBe('camera-tutorial');
      expect(onboardingService.getProgress().percentage).toBe(50);

      // Complete tutorial steps
      await fireEvents.pressAndWait(getByText('Start Tutorial'));
      
      // Tutorial step 1: Basic capture
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Basic Photo Capture'));
      });
      
      await fireEvents.pressAndWait(getByTestId('demo-capture-button'));
      await fireEvents.pressAndWait(getByText('Next'));

      // Tutorial step 2: Focus control
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Focus Control'));
      });
      
      fireEvents.press(getByTestId('focus-demo-area'));
      await fireEvents.pressAndWait(getByText('Next'));

      // Tutorial step 3: Exposure control
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Exposure Control'));
      });
      
      fireEvents.changeText(getByTestId('exposure-slider'), '0.5');
      await fireEvents.pressAndWait(getByText('Complete Tutorial'));

      // Step 4: User Guide
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('User Guide'));
        assertions.toBeVisible(getByText('Getting Started'));
      });

      expect(onboardingService.getCurrentStep()).toBe('user-guide');
      expect(onboardingService.getProgress().percentage).toBe(75);

      // Browse guides
      await fireEvents.pressAndWait(getByText('Camera'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera Guides'));
      });

      // Access a guide
      await fireEvents.pressAndWait(getByText('Taking Great Photos'));
      
      // Return to guide list
      await fireEvents.pressAndWait(getByTestId('back-to-guides'));

      // Complete onboarding
      await fireEvents.pressAndWait(getByText('Finish Onboarding'));

      // Verify completion
      await waitForAsync(() => {
        expect(onboardingService.getProgress().percentage).toBe(100);
        expect(onboardingService.isCompleted()).toBe(true);
      });

      // Should navigate to main app
      expect(navigation.navigate).toHaveBeenCalledWith('MainApp');
    });

    it('should handle partial completion and resume', async () => {
      const { getByText, rerender } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Complete first two steps
      await fireEvents.pressAndWait(getByText('Get Started'));
      await fireEvents.pressAndWait(getByText('Grant Camera Access'));
      await fireEvents.pressAndWait(getByText('Grant Notification Access'));
      await fireEvents.pressAndWait(getByText('Continue'));

      // Verify we're at camera tutorial
      expect(onboardingService.getCurrentStep()).toBe('camera-tutorial');

      // Simulate app restart by re-rendering
      rerender(
        <NavigationContainer>
          <OnboardingFlow />
        </NavigationContainer>
      );

      // Should resume from camera tutorial
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera Tutorial'));
        expect(onboardingService.getCurrentStep()).toBe('camera-tutorial');
        expect(onboardingService.getProgress().percentage).toBe(50);
      });
    });

    it('should handle skip functionality throughout flow', async () => {
      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Skip welcome
      await fireEvents.pressAndWait(getByText('Skip'));

      // Should be at permissions
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Grant Permissions'));
      });

      // Skip permissions (should show warning)
      await fireEvents.pressAndWait(getByText('Skip'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Some features may not work properly'));
      });
      
      await fireEvents.pressAndWait(getByText('Skip Anyway'));

      // Should be at camera tutorial
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera Tutorial'));
      });

      // Skip tutorial
      await fireEvents.pressAndWait(getByText('Skip Tutorial'));

      // Should be at user guide
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('User Guide'));
      });

      // Complete onboarding
      await fireEvents.pressAndWait(getByText('Finish Onboarding'));

      // Verify completion despite skips
      expect(onboardingService.isCompleted()).toBe(true);
    });
  });

  describe('Permission Integration', () => {
    it('should handle permission denial gracefully', async () => {
      // Mock permission denial
      require('@react-native-community/permissions').request.mockResolvedValue('denied');

      const { getByText, getByTestId } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to permissions
      await fireEvents.pressAndWait(getByText('Get Started'));

      // Try to grant camera permission
      await fireEvents.pressAndWait(getByText('Grant Camera Access'));

      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        expect(cameraStatus.props.children).toContain('Denied');
        assertions.toBeVisible(getByText('Camera access is required for core functionality'));
      });

      // Should show retry option
      assertions.toBeVisible(getByText('Retry'));
    });

    it('should integrate with device permission state changes', async () => {
      const { getByText, getByTestId } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to permissions
      await fireEvents.pressAndWait(getByText('Get Started'));

      // Simulate permission change from device settings
      require('@react-native-community/permissions').check.mockResolvedValue('granted');
      
      // Simulate app state change (user returned from settings)
      AppState.currentState = 'active';
      AppState.emit('change', 'active');

      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        expect(cameraStatus.props.children).toContain('Granted');
      });
    });
  });

  describe('Camera Service Integration', () => {
    it('should integrate camera functionality with tutorial', async () => {
      const { getByText, getByTestId } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to camera tutorial
      await fireEvents.pressAndWait(getByText('Get Started'));
      await fireEvents.pressAndWait(getByText('Continue')); // Skip permissions
      await fireEvents.pressAndWait(getByText('Start Tutorial'));

      // Camera should be initialized
      expect(cameraService.initializeCamera).toHaveBeenCalled();
      expect(cameraService.startPreview).toHaveBeenCalled();

      // Test camera capture
      await fireEvents.pressAndWait(getByTestId('demo-capture-button'));
      
      expect(cameraService.takePicture).toHaveBeenCalled();

      // Test focus functionality
      fireEvents.press(getByTestId('focus-demo-area'));
      
      expect(cameraService.setFocusMode).toHaveBeenCalledWith('manual');
    });

    it('should handle camera unavailability', async () => {
      // Mock camera service failure
      cameraService.initializeCamera.mockRejectedValue(new Error('Camera not available'));

      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to camera tutorial
      await fireEvents.pressAndWait(getByText('Get Started'));
      await fireEvents.pressAndWait(getByText('Continue'));

      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera not available for tutorial'));
        assertions.toBeVisible(getByText('Skip Tutorial'));
      });
    });
  });

  describe('Data Persistence Integration', () => {
    it('should persist progress across app restarts', async () => {
      const { getByText, rerender } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Complete first step
      await fireEvents.pressAndWait(getByText('Get Started'));

      // Verify storage was called
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('onboarding_progress', expect.any(String));

      // Simulate app restart
      const newOnboardingService = OnboardingService.getInstance();
      
      rerender(
        <NavigationContainer>
          <OnboardingFlow />
        </NavigationContainer>
      );

      // Should resume from correct step
      await waitForAsync(() => {
        expect(newOnboardingService.getCurrentStep()).toBe('permissions');
      });
    });

    it('should save user preferences during onboarding', async () => {
      const { getByText, getByTestId } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate through flow and modify preferences
      await fireEvents.pressAndWait(getByText('Get Started'));

      // Toggle analytics preference
      const analyticsToggle = getByTestId('analytics-toggle');
      fireEvents.press(analyticsToggle);

      await fireEvents.pressAndWait(getByText('Continue'));

      // Verify preferences were saved
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('user_preferences', expect.stringContaining('analyticsEnabled'));
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from service errors', async () => {
      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Simulate service error
      onboardingService.nextStep = jest.fn().mockRejectedValueOnce(new Error('Service error'));

      await fireEvents.pressAndWait(getByText('Get Started'));

      await waitForAsync(() => {
        assertions.toBeVisible(getByText('An error occurred. Please try again.'));
        assertions.toBeVisible(getByText('Retry'));
      });

      // Fix the service
      onboardingService.nextStep = jest.fn().mockResolvedValue();

      // Retry should work
      await fireEvents.pressAndWait(getByText('Retry'));

      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Grant Permissions'));
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network failure for analytics
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Analytics should fail silently, onboarding should continue
      await fireEvents.pressAndWait(getByText('Get Started'));

      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Grant Permissions'));
      });

      // Analytics error should not break the flow
      expect(onboardingService.getCurrentStep()).toBe('permissions');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large user guide dataset
      const largeGuideList = Array.from({ length: 1000 }, (_, i) => ({
        id: `guide-${i}`,
        title: `Guide ${i}`,
        category: 'test',
      }));

      jest.doMock('../../src/data/userGuides.json', () => largeGuideList);

      const startTime = performance.now();

      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to user guide
      await fireEvents.pressAndWait(getByText('Get Started'));
      await fireEvents.pressAndWait(getByText('Continue'));
      await fireEvents.pressAndWait(getByText('Skip Tutorial'));

      await waitForAsync(() => {
        assertions.toBeVisible(getByText('User Guide'));
      });

      const endTime = performance.now();

      // Should render efficiently even with large dataset
      expect(endTime - startTime).toBeLessThan(3000);
    });

    it('should cleanup resources properly', async () => {
      const { unmount } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Navigate to camera tutorial to initialize camera
      await fireEvents.pressAndWait(getByText('Get Started'));
      await fireEvents.pressAndWait(getByText('Continue'));

      // Unmount should cleanup camera resources
      unmount();

      expect(cameraService.stopPreview).toHaveBeenCalled();
    });
  });

  describe('Analytics Integration', () => {
    it('should track complete user journey', async () => {
      const { getByText } = renderScreen(
        () => (
          <NavigationContainer>
            <OnboardingFlow />
          </NavigationContainer>
        )
      );

      // Complete full flow and verify all events are tracked
      await fireEvents.pressAndWait(getByText('Get Started'));
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('step_completed', { step: 'welcome' });

      await fireEvents.pressAndWait(getByText('Continue'));
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('step_completed', { step: 'permissions' });

      await fireEvents.pressAndWait(getByText('Skip Tutorial'));
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('step_skipped', { step: 'camera-tutorial' });

      await fireEvents.pressAndWait(getByText('Finish Onboarding'));
      expect(onboardingService.trackAnalytics).toHaveBeenCalledWith('onboarding_completed', expect.objectContaining({
        duration: expect.any(Number),
        stepsSkipped: 1,
      }));
    });
  });
});
