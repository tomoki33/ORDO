/**
 * Onboarding E2E Tests
 * Complete end-to-end user journey testing
 */

const { device, element, by, expect } = require('detox');
const { E2ETestHelper } = require('./helpers/E2ETestHelper');

describe('Onboarding E2E Tests', () => {
  beforeAll(async () => {
    await E2ETestHelper.setup();
  });

  afterAll(async () => {
    await E2ETestHelper.teardown();
  });

  beforeEach(async () => {
    await E2ETestHelper.resetApp();
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding journey successfully', async () => {
      await E2ETestHelper.completeOnboardingFlow({
        skipWelcome: false,
        skipPermissions: false,
        skipTutorial: false,
        skipUserGuide: false,
        grantPermissions: true,
      });

      // Verify we reached the main app
      await expect(element(by.id('main-app')))
        .toBeVisible();
      
      // Verify onboarding completion is persisted
      await E2ETestHelper.resetApp();
      await expect(element(by.id('main-app')))
        .toBeVisible();
    });

    it('should handle skip all functionality', async () => {
      await E2ETestHelper.completeOnboardingFlow({
        skipWelcome: true,
        skipPermissions: true,
        skipTutorial: true,
        skipUserGuide: true,
        grantPermissions: false,
      });

      // Should still reach main app
      await expect(element(by.id('main-app')))
        .toBeVisible();
    });

    it('should handle mixed skip/complete flow', async () => {
      await E2ETestHelper.completeOnboardingFlow({
        skipWelcome: false,
        skipPermissions: true,
        skipTutorial: false,
        skipUserGuide: true,
        grantPermissions: true,
      });

      await expect(element(by.id('main-app')))
        .toBeVisible();
    });
  });

  describe('Permission Flow', () => {
    it('should handle permission grants correctly', async () => {
      // Navigate to permissions
      await E2ETestHelper.tapAndWait(
        by.text('Get Started'),
        by.id('permission-screen')
      );

      // Grant camera permission
      await E2ETestHelper.tapAndWait(by.id('grant-camera-permission'));
      await E2ETestHelper.handlePermissionDialog('allow');
      
      // Verify permission status
      await expect(element(by.id('camera-permission-granted')))
        .toBeVisible();

      // Grant notification permission
      await E2ETestHelper.tapAndWait(by.id('grant-notification-permission'));
      await E2ETestHelper.handlePermissionDialog('allow');
      
      // Verify permission status
      await expect(element(by.id('notification-permission-granted')))
        .toBeVisible();

      // Continue button should be enabled
      await expect(element(by.text('Continue')))
        .toBeVisible();
    });

    it('should handle permission denials gracefully', async () => {
      await E2ETestHelper.tapAndWait(
        by.text('Get Started'),
        by.id('permission-screen')
      );

      // Deny camera permission
      await E2ETestHelper.tapAndWait(by.id('grant-camera-permission'));
      await E2ETestHelper.handlePermissionDialog('deny');
      
      // Should show warning message
      await expect(element(by.text('Camera access is required')))
        .toBeVisible();
      
      // Should show retry option
      await expect(element(by.text('Retry')))
        .toBeVisible();
    });

    it('should handle permission state changes from settings', async () => {
      await E2ETestHelper.tapAndWait(
        by.text('Get Started'),
        by.id('permission-screen')
      );

      // Deny permission initially
      await E2ETestHelper.tapAndWait(by.id('grant-camera-permission'));
      await E2ETestHelper.handlePermissionDialog('deny');
      
      // Simulate user going to settings and granting permission
      await device.openSettings('permissions');
      
      // Grant permission in settings (simulated)
      await device.grantPermission('camera');
      
      // Return to app
      await device.launchApp({ newInstance: false });
      
      // Permission status should update
      await expect(element(by.id('camera-permission-granted')))
        .toBeVisible();
    });
  });

  describe('Camera Tutorial Flow', () => {
    it('should complete camera tutorial successfully', async () => {
      // Navigate to camera tutorial
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'), by.id('camera-tutorial-screen'));
      
      // Start tutorial
      await E2ETestHelper.tapAndWait(by.text('Start Tutorial'));
      
      // Complete all tutorial steps
      await E2ETestHelper.completeCameraTutorial();
      
      // Verify completion
      await expect(element(by.text('Tutorial Complete!')))
        .toBeVisible();
      
      await E2ETestHelper.tapAndWait(
        by.text('Complete Tutorial'),
        by.id('user-guide-screen')
      );
    });

    it('should handle camera unavailable scenario', async () => {
      // Mock camera unavailable
      await device.disablePermission('camera');
      
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      
      // Should show camera unavailable message
      await expect(element(by.text('Camera not available')))
        .toBeVisible();
      
      // Should offer skip option
      await expect(element(by.text('Skip Tutorial')))
        .toBeVisible();
    });

    it('should handle tutorial step failures', async () => {
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      await E2ETestHelper.tapAndWait(by.text('Start Tutorial'));
      
      // Simulate camera capture failure
      await device.simulateError('camera_capture_failed');
      
      await E2ETestHelper.tapAndWait(by.id('demo-capture-button'));
      
      // Should show error message
      await expect(element(by.text('Tutorial demo failed')))
        .toBeVisible();
      
      // Should offer retry
      await expect(element(by.text('Retry')))
        .toBeVisible();
    });
  });

  describe('User Guide Flow', () => {
    it('should navigate through user guide categories', async () => {
      // Navigate to user guide
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      await E2ETestHelper.tapAndWait(by.text('Skip Tutorial'), by.id('user-guide-screen'));
      
      // Test category navigation
      await E2ETestHelper.tapAndWait(by.text('Camera'));
      await expect(element(by.text('Camera Guides')))
        .toBeVisible();
      
      await E2ETestHelper.tapAndWait(by.text('Organization'));
      await expect(element(by.text('Organization Guides')))
        .toBeVisible();
      
      await E2ETestHelper.tapAndWait(by.text('Advanced'));
      await expect(element(by.text('Advanced Guides')))
        .toBeVisible();
    });

    it('should handle guide search functionality', async () => {
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      await E2ETestHelper.tapAndWait(by.text('Skip Tutorial'));
      
      // Test search
      await E2ETestHelper.typeText(by.id('search-input'), 'camera');
      
      // Should show search results
      await expect(element(by.text('How to take better photos')))
        .toBeVisible();
      
      // Clear search
      await E2ETestHelper.tapAndWait(by.id('clear-search'));
      
      // Should return to category view
      await expect(element(by.text('Popular Guides')))
        .toBeVisible();
    });

    it('should access guide details', async () => {
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      await E2ETestHelper.tapAndWait(by.text('Skip Tutorial'));
      
      // Access a guide
      await E2ETestHelper.tapAndWait(by.text('Getting Started with Ordo'));
      
      // Should navigate to guide detail
      await expect(element(by.id('guide-detail-screen')))
        .toBeVisible();
      
      // Should show guide content
      await expect(element(by.text('Getting Started')))
        .toBeVisible();
      
      // Return to guide list
      await E2ETestHelper.tapAndWait(by.id('back-button'), by.id('user-guide-screen'));
    });
  });

  describe('Progress and State Management', () => {
    it('should maintain progress across app restarts', async () => {
      // Start onboarding and complete first step
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      await E2ETestHelper.verifyOnboardingProgress('Step 2', 25);
      
      // Restart app
      await E2ETestHelper.resetApp();
      
      // Should resume from correct step
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
      await E2ETestHelper.verifyOnboardingProgress('Step 2', 25);
    });

    it('should handle app state transitions correctly', async () => {
      await E2ETestHelper.testAppStateTransitions();
    });

    it('should persist user preferences', async () => {
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      
      // Toggle analytics preference
      await E2ETestHelper.tapAndWait(by.id('analytics-toggle'));
      
      await E2ETestHelper.tapAndWait(by.text('Continue'));
      await E2ETestHelper.tapAndWait(by.text('Skip Tutorial'));
      await E2ETestHelper.tapAndWait(by.text('Finish Onboarding'));
      
      // Restart app and check preferences are persisted
      await E2ETestHelper.resetApp();
      
      // Navigate to settings (in main app)
      await E2ETestHelper.tapAndWait(by.id('settings-button'));
      
      // Analytics should be disabled
      await expect(element(by.id('analytics-disabled')))
        .toBeVisible();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      await E2ETestHelper.testErrorRecovery();
    });

    it('should recover from app crashes', async () => {
      // Start onboarding
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      
      // Simulate app crash
      await device.terminateApp();
      await device.launchApp({ newInstance: false });
      
      // Should restore previous state
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
    });

    it('should handle corrupted data gracefully', async () => {
      // Start onboarding
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      
      // Corrupt stored data
      await device.clearStorage();
      
      // Restart app
      await E2ETestHelper.resetApp();
      
      // Should reset to initial state
      await expect(element(by.id('welcome-screen')))
        .toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader navigation', async () => {
      await E2ETestHelper.testAccessibility();
    });

    it('should support voice control', async () => {
      await device.setAccessibilityEnabled(true);
      
      // Test voice commands
      await device.voiceCommand('Get Started');
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
    });

    it('should support keyboard navigation', async () => {
      await device.setKeyboardEnabled(true);
      
      // Tab through elements
      await device.pressKey('tab');
      await device.pressKey('tab');
      await device.pressKey('enter'); // Activate Get Started
      
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should complete onboarding within performance thresholds', async () => {
      const duration = await E2ETestHelper.measurePerformance('Complete Onboarding');
      expect(duration).toBeLessThan(30000);
    });

    it('should handle orientation changes smoothly', async () => {
      await E2ETestHelper.testOrientationChanges();
    });

    it('should manage memory efficiently', async () => {
      await E2ETestHelper.testMemoryUsage();
    });

    it('should handle rapid user interactions', async () => {
      // Rapid tapping should not cause issues
      for (let i = 0; i < 10; i++) {
        await element(by.text('Get Started')).tap();
      }
      
      // Should only navigate once
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
    });
  });

  describe('Localization', () => {
    it('should work with different device languages', async () => {
      await E2ETestHelper.testDeviceConfigurations();
    });

    it('should handle RTL languages correctly', async () => {
      await device.setLanguage('ar');
      await device.reloadReactNative();
      
      // Verify RTL layout
      await expect(element(by.id('welcome-screen')))
        .toBeVisible();
      
      // UI should be mirrored
      const welcomeTitle = element(by.id('welcome-title'));
      const titleFrame = await welcomeTitle.getAttributes();
      expect(titleFrame.textAlignment).toBe('right');
    });
  });

  describe('Edge Cases', () => {
    it('should handle slow devices gracefully', async () => {
      // Simulate slow device
      await device.setSlowAnimations(true);
      
      await E2ETestHelper.completeOnboardingFlow();
      
      await expect(element(by.id('main-app')))
        .toBeVisible();
    });

    it('should handle low memory conditions', async () => {
      // Simulate low memory
      await device.setLowMemoryMode(true);
      
      await E2ETestHelper.completeOnboardingFlow();
      
      await expect(element(by.id('main-app')))
        .toBeVisible();
    });

    it('should handle background app refresh disabled', async () => {
      await device.disableBackgroundAppRefresh();
      
      await E2ETestHelper.tapAndWait(by.text('Get Started'));
      
      // Send to background
      await device.sendToHome();
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Return to app
      await device.launchApp({ newInstance: false });
      
      // Should maintain state
      await expect(element(by.id('permission-screen')))
        .toBeVisible();
    });
  });
});
