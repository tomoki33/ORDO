/**
 * End-to-End Test Configuration
 * Sets up Detox for automated E2E testing
 */

const { device, element, by, expect } = require('detox');

class E2ETestHelper {
  /**
   * Initialize test environment and launch app
   */
  static async setup() {
    await device.launchApp({
      permissions: { camera: 'YES', notifications: 'YES' },
      newInstance: true,
    });
    
    // Wait for app to be ready
    await expect(element(by.id('app-root'))).toBeVisible();
  }

  /**
   * Clean up after tests
   */
  static async teardown() {
    await device.terminateApp();
  }

  /**
   * Reset app to initial state
   */
  static async resetApp() {
    await device.reloadReactNative();
    await device.launchApp({ newInstance: true });
  }

  /**
   * Wait for element with timeout
   */
  static async waitForElement(matcher, timeout = 10000) {
    await waitFor(element(matcher))
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Tap element and wait for action to complete
   */
  static async tapAndWait(matcher, nextMatcher = null, timeout = 5000) {
    await element(matcher).tap();
    
    if (nextMatcher) {
      await this.waitForElement(nextMatcher, timeout);
    } else {
      // Default wait for any animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Type text into input field
   */
  static async typeText(matcher, text) {
    await element(matcher).typeText(text);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Scroll to element in scrollable view
   */
  static async scrollToElement(scrollViewMatcher, elementMatcher) {
    await element(scrollViewMatcher).scrollTo('bottom');
    await this.waitForElement(elementMatcher);
  }

  /**
   * Take screenshot for debugging
   */
  static async takeScreenshot(name) {
    await device.takeScreenshot(name);
  }

  /**
   * Simulate permission dialog interaction
   */
  static async handlePermissionDialog(action = 'allow') {
    try {
      if (device.getPlatform() === 'ios') {
        if (action === 'allow') {
          await element(by.text('OK')).tap();
        } else {
          await element(by.text('Don\'t Allow')).tap();
        }
      } else {
        if (action === 'allow') {
          await element(by.text('ALLOW')).tap();
        } else {
          await element(by.text('DENY')).tap();
        }
      }
    } catch (error) {
      // Permission dialog might not appear, ignore
      console.log('Permission dialog not found:', error.message);
    }
  }

  /**
   * Verify onboarding progress
   */
  static async verifyOnboardingProgress(expectedStep, expectedPercentage) {
    await expect(element(by.id('onboarding-progress')))
      .toBeVisible();
    
    const progressElement = element(by.id('progress-percentage'));
    await expect(progressElement)
      .toHaveText(`${expectedPercentage}%`);
    
    const stepElement = element(by.id('current-step'));
    await expect(stepElement)
      .toHaveText(expectedStep);
  }

  /**
   * Navigate through onboarding flow
   */
  static async completeOnboardingFlow(options = {}) {
    const {
      skipWelcome = false,
      skipPermissions = false,
      skipTutorial = false,
      skipUserGuide = false,
      grantPermissions = true,
    } = options;

    // Welcome screen
    await this.waitForElement(by.id('welcome-screen'));
    await this.takeScreenshot('welcome-screen');
    
    if (skipWelcome) {
      await this.tapAndWait(by.text('Skip'), by.id('permission-screen'));
    } else {
      await this.tapAndWait(by.text('Get Started'), by.id('permission-screen'));
    }

    // Permission screen
    await this.takeScreenshot('permission-screen');
    
    if (skipPermissions) {
      await this.tapAndWait(by.text('Skip'), by.id('camera-tutorial-screen'));
    } else {
      // Grant camera permission
      await this.tapAndWait(by.id('grant-camera-permission'));
      if (grantPermissions) {
        await this.handlePermissionDialog('allow');
      } else {
        await this.handlePermissionDialog('deny');
      }
      
      // Grant notification permission
      await this.tapAndWait(by.id('grant-notification-permission'));
      if (grantPermissions) {
        await this.handlePermissionDialog('allow');
      } else {
        await this.handlePermissionDialog('deny');
      }
      
      await this.tapAndWait(by.text('Continue'), by.id('camera-tutorial-screen'));
    }

    // Camera tutorial screen
    await this.takeScreenshot('camera-tutorial-screen');
    
    if (skipTutorial) {
      await this.tapAndWait(by.text('Skip Tutorial'), by.id('user-guide-screen'));
    } else {
      await this.tapAndWait(by.text('Start Tutorial'));
      
      // Complete tutorial steps
      await this.completeCameraTutorial();
      
      await this.tapAndWait(by.text('Complete Tutorial'), by.id('user-guide-screen'));
    }

    // User guide screen
    await this.takeScreenshot('user-guide-screen');
    
    if (skipUserGuide) {
      await this.tapAndWait(by.text('Skip'), by.id('main-app'));
    } else {
      // Browse some guides
      await this.tapAndWait(by.text('Camera'));
      await this.tapAndWait(by.text('Getting Started'));
      
      await this.tapAndWait(by.text('Finish Onboarding'), by.id('main-app'));
    }

    // Verify completion
    await this.waitForElement(by.id('main-app'));
    await this.takeScreenshot('onboarding-completed');
  }

  /**
   * Complete camera tutorial steps
   */
  static async completeCameraTutorial() {
    // Step 1: Basic capture
    await this.waitForElement(by.text('Basic Photo Capture'));
    await this.tapAndWait(by.id('demo-capture-button'));
    await this.tapAndWait(by.text('Next'));

    // Step 2: Focus control
    await this.waitForElement(by.text('Focus Control'));
    await this.tapAndWait(by.id('focus-demo-area'));
    await this.tapAndWait(by.text('Next'));

    // Step 3: Exposure control
    await this.waitForElement(by.text('Exposure Control'));
    await element(by.id('exposure-slider')).setValue('0.5');
    await this.tapAndWait(by.text('Next'));
  }

  /**
   * Test error recovery scenarios
   */
  static async testErrorRecovery() {
    // Test network error simulation
    await device.setNetworkConnection(false);
    await this.tapAndWait(by.text('Get Started'));
    
    // Should show error message
    await this.waitForElement(by.text('Network error'));
    
    // Restore network and retry
    await device.setNetworkConnection(true);
    await this.tapAndWait(by.text('Retry'));
    
    // Should continue normally
    await this.waitForElement(by.id('permission-screen'));
  }

  /**
   * Test accessibility features
   */
  static async testAccessibility() {
    // Enable accessibility features
    await device.setAccessibilityEnabled(true);
    
    // Navigate using accessibility labels
    await element(by.label('Welcome to Ordo')).tap();
    await element(by.label('Get started with onboarding')).tap();
    
    // Verify accessibility announcements
    await expect(element(by.label('Step 2 of 4')))
      .toBeVisible();
  }

  /**
   * Test performance metrics
   */
  static async measurePerformance(testName) {
    const startTime = Date.now();
    
    // Perform the test operation
    await this.completeOnboardingFlow();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`${testName} completed in ${duration}ms`);
    
    // Performance assertions
    expect(duration).toBeLessThan(30000); // 30 seconds max
    
    return duration;
  }

  /**
   * Test orientation changes
   */
  static async testOrientationChanges() {
    // Test portrait to landscape
    await device.setOrientation('landscape');
    await this.waitForElement(by.id('welcome-screen'));
    
    // Verify layout adapts
    await expect(element(by.id('welcome-title')))
      .toBeVisible();
    
    // Test landscape to portrait
    await device.setOrientation('portrait');
    await this.waitForElement(by.id('welcome-screen'));
    
    // Verify layout still works
    await expect(element(by.id('welcome-title')))
      .toBeVisible();
  }

  /**
   * Test memory usage during onboarding
   */
  static async testMemoryUsage() {
    const initialMemory = await device.getMemoryUsage();
    
    await this.completeOnboardingFlow();
    
    const finalMemory = await device.getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(`Memory increase: ${memoryIncrease}MB`);
    
    // Should not leak significant memory
    expect(memoryIncrease).toBeLessThan(100); // 100MB max
  }

  /**
   * Test app state transitions
   */
  static async testAppStateTransitions() {
    // Start onboarding
    await this.tapAndWait(by.text('Get Started'));
    await this.verifyOnboardingProgress('Step 2', 25);
    
    // Send app to background
    await device.sendToHome();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Bring app back to foreground
    await device.launchApp({ newInstance: false });
    
    // Should resume from same step
    await this.waitForElement(by.id('permission-screen'));
    await this.verifyOnboardingProgress('Step 2', 25);
  }

  /**
   * Test different device configurations
   */
  static async testDeviceConfigurations() {
    const configs = [
      { language: 'en', region: 'US' },
      { language: 'ja', region: 'JP' },
      { language: 'es', region: 'ES' },
    ];
    
    for (const config of configs) {
      await device.setLanguage(config.language);
      await device.setRegion(config.region);
      await device.reloadReactNative();
      
      // Test basic functionality
      await this.waitForElement(by.id('welcome-screen'));
      await this.tapAndWait(by.text('Get Started'));
      await this.waitForElement(by.id('permission-screen'));
      
      await this.takeScreenshot(`${config.language}-${config.region}`);
    }
  }
}

module.exports = {
  E2ETestHelper,
};
