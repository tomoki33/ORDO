/**
 * Service Integration Tests
 * Tests the interaction between multiple services used in onboarding
 */

import { OnboardingService } from '../../src/services/OnboardingService';
import { PermissionService } from '../../src/services/PermissionService';
import { LocalDataProtectionService } from '../../src/services/LocalDataProtectionService';
import { LoggingService } from '../../src/services/LoggingService';
import { testSetup } from '../utils/testHelpers';

// Use real services for integration testing
jest.unmock('../../src/services/OnboardingService');
jest.unmock('../../src/services/PermissionService');
jest.unmock('../../src/services/LocalDataProtectionService');
jest.unmock('../../src/services/LoggingService');

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/permissions');

describe('Service Integration', () => {
  let onboardingService;
  let permissionService;
  let dataProtectionService;
  let loggingService;

  beforeEach(async () => {
    testSetup.beforeEach();
    
    // Initialize services
    onboardingService = OnboardingService.getInstance();
    permissionService = PermissionService.getInstance();
    dataProtectionService = LocalDataProtectionService.getInstance();
    loggingService = LoggingService.getInstance();
    
    // Reset all services to clean state
    await onboardingService.resetOnboarding();
    await dataProtectionService.clearCache();
    
    // Setup default mocks
    require('@react-native-community/permissions').check.mockResolvedValue('granted');
    require('@react-native-community/permissions').request.mockResolvedValue('granted');
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('OnboardingService + PermissionService Integration', () => {
    it('should coordinate permission requests during onboarding', async () => {
      // Start onboarding
      await onboardingService.startOnboarding();
      
      // Navigate to permissions step
      await onboardingService.nextStep();
      expect(onboardingService.getCurrentStep()).toBe('permissions');
      
      // Request camera permission through onboarding
      const result = await onboardingService.requestPermission('camera');
      
      // Should delegate to permission service
      expect(require('@react-native-community/permissions').request)
        .toHaveBeenCalledWith('android.permission.CAMERA');
      
      expect(result.status).toBe('granted');
      
      // Should update onboarding state
      const permissions = onboardingService.getPermissionStates();
      expect(permissions.camera).toBe('granted');
    });

    it('should handle permission denial flow', async () => {
      // Mock permission denial
      require('@react-native-community/permissions').request.mockResolvedValue('denied');
      
      await onboardingService.startOnboarding();
      await onboardingService.nextStep(); // Move to permissions
      
      const result = await onboardingService.requestPermission('camera');
      
      expect(result.status).toBe('denied');
      expect(result.canAskAgain).toBeDefined();
      
      // Should track denial in onboarding state
      const permissions = onboardingService.getPermissionStates();
      expect(permissions.camera).toBe('denied');
    });

    it('should sync permission state changes', async () => {
      await onboardingService.startOnboarding();
      await onboardingService.nextStep();
      
      // Grant permission externally
      await permissionService.requestPermission('camera');
      
      // Onboarding should detect the change
      await onboardingService.refreshPermissionStates();
      
      const permissions = onboardingService.getPermissionStates();
      expect(permissions.camera).toBe('granted');
    });
  });

  describe('OnboardingService + LocalDataProtectionService Integration', () => {
    it('should securely store onboarding progress', async () => {
      await onboardingService.startOnboarding();
      await onboardingService.nextStep();
      
      // Progress should be encrypted and stored
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('onboarding_progress', expect.any(String));
      
      // Verify data protection service was used
      const storedData = await dataProtectionService.getSecureData('onboarding_progress');
      expect(storedData).toBeDefined();
      expect(storedData.currentStep).toBe('permissions');
    });

    it('should restore encrypted onboarding state', async () => {
      // Store encrypted state
      await dataProtectionService.setSecureData('onboarding_progress', {
        currentStep: 'camera-tutorial',
        completedSteps: ['welcome', 'permissions'],
        userPreferences: { analyticsEnabled: false },
      });
      
      // Initialize onboarding service
      const newOnboardingService = OnboardingService.getInstance();
      await newOnboardingService.initialize();
      
      // Should restore from encrypted data
      expect(newOnboardingService.getCurrentStep()).toBe('camera-tutorial');
      expect(newOnboardingService.getCompletedSteps()).toContain('welcome');
      expect(newOnboardingService.getCompletedSteps()).toContain('permissions');
    });

    it('should handle data corruption gracefully', async () => {
      // Store corrupted data
      require('@react-native-async-storage/async-storage').getItem
        .mockResolvedValue('corrupted-data');
      
      const newOnboardingService = OnboardingService.getInstance();
      await newOnboardingService.initialize();
      
      // Should reset to initial state
      expect(newOnboardingService.getCurrentStep()).toBe('welcome');
      expect(newOnboardingService.getCompletedSteps()).toHaveLength(0);
    });
  });

  describe('OnboardingService + LoggingService Integration', () => {
    it('should log onboarding events', async () => {
      const logSpy = jest.spyOn(loggingService, 'log');
      
      await onboardingService.startOnboarding();
      
      expect(logSpy).toHaveBeenCalledWith('info', 'Onboarding started', {
        step: 'welcome',
        timestamp: expect.any(Date),
      });
      
      await onboardingService.nextStep();
      
      expect(logSpy).toHaveBeenCalledWith('info', 'Onboarding step completed', {
        fromStep: 'welcome',
        toStep: 'permissions',
        timestamp: expect.any(Date),
      });
    });

    it('should log errors with context', async () => {
      const logSpy = jest.spyOn(loggingService, 'error');
      
      // Simulate permission error
      require('@react-native-community/permissions').request
        .mockRejectedValue(new Error('Permission service unavailable'));
      
      await onboardingService.startOnboarding();
      await onboardingService.nextStep();
      
      try {
        await onboardingService.requestPermission('camera');
      } catch (error) {
        // Error should be logged with context
        expect(logSpy).toHaveBeenCalledWith('Permission request failed', error, {
          step: 'permissions',
          permission: 'camera',
          timestamp: expect.any(Date),
        });
      }
    });

    it('should aggregate onboarding analytics', async () => {
      const trackSpy = jest.spyOn(onboardingService, 'trackAnalytics');
      
      // Complete full onboarding flow
      await onboardingService.startOnboarding();
      await onboardingService.nextStep(); // permissions
      await onboardingService.nextStep(); // camera-tutorial
      await onboardingService.nextStep(); // user-guide
      await onboardingService.completeOnboarding();
      
      // Should track completion with aggregated data
      expect(trackSpy).toHaveBeenCalledWith('onboarding_completed', {
        duration: expect.any(Number),
        stepsCompleted: 4,
        stepsSkipped: 0,
        permissionsGranted: expect.any(Array),
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Cross-Service Error Handling', () => {
    it('should handle cascading service failures', async () => {
      // Simulate data protection service failure
      jest.spyOn(dataProtectionService, 'setSecureData')
        .mockRejectedValue(new Error('Encryption failed'));
      
      await onboardingService.startOnboarding();
      
      // Should continue despite storage failure
      expect(onboardingService.getCurrentStep()).toBe('welcome');
      
      // Should log the error
      const logSpy = jest.spyOn(loggingService, 'error');
      await onboardingService.nextStep();
      
      expect(logSpy).toHaveBeenCalledWith(
        'Failed to save onboarding progress',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should provide fallback behavior when services unavailable', async () => {
      // Simulate logging service failure
      jest.spyOn(loggingService, 'log')
        .mockImplementation(() => {
          throw new Error('Logging unavailable');
        });
      
      // Onboarding should continue without logging
      await expect(onboardingService.startOnboarding()).resolves.toBeUndefined();
      expect(onboardingService.getCurrentStep()).toBe('welcome');
    });

    it('should handle permission service timeout', async () => {
      // Simulate permission service timeout
      require('@react-native-community/permissions').request
        .mockImplementation(() => new Promise(() => {})); // Never resolves
      
      await onboardingService.startOnboarding();
      await onboardingService.nextStep();
      
      // Should timeout and handle gracefully
      const requestPromise = onboardingService.requestPermission('camera');
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(10000);
      
      await expect(requestPromise).resolves.toMatchObject({
        status: 'timeout',
        error: expect.stringContaining('Permission request timed out'),
      });
    });
  });

  describe('Service State Synchronization', () => {
    it('should maintain consistent state across services', async () => {
      await onboardingService.startOnboarding();
      
      // Update user preferences
      await onboardingService.updateUserPreferences({
        analyticsEnabled: false,
        notificationsEnabled: true,
      });
      
      // Should be reflected in data protection service
      const storedPreferences = await dataProtectionService.getSecureData('user_preferences');
      expect(storedPreferences.analyticsEnabled).toBe(false);
      expect(storedPreferences.notificationsEnabled).toBe(true);
      
      // Should be accessible from onboarding service
      const preferences = onboardingService.getUserPreferences();
      expect(preferences.analyticsEnabled).toBe(false);
      expect(preferences.notificationsEnabled).toBe(true);
    });

    it('should handle concurrent service operations', async () => {
      // Start multiple operations concurrently
      const promises = [
        onboardingService.startOnboarding(),
        permissionService.requestPermission('camera'),
        dataProtectionService.setSecureData('test', { value: 'test' }),
        loggingService.log('info', 'Test concurrent operation'),
      ];
      
      // All should complete successfully
      await expect(Promise.all(promises)).resolves.toBeDefined();
      
      // State should be consistent
      expect(onboardingService.getCurrentStep()).toBe('welcome');
      
      const permissions = await permissionService.getAllPermissions();
      expect(permissions.camera).toBe('granted');
    });

    it('should recover from service inconsistencies', async () => {
      // Create inconsistent state
      await onboardingService.startOnboarding();
      await onboardingService.nextStep(); // Move to permissions
      
      // Manually corrupt permission state
      await dataProtectionService.setSecureData('onboarding_progress', {
        currentStep: 'permissions',
        permissionStates: { camera: 'granted' }, // Inconsistent with actual state
      });
      
      // Mock actual permission as denied
      require('@react-native-community/permissions').check.mockResolvedValue('denied');
      
      // Service should detect and fix inconsistency
      await onboardingService.refreshPermissionStates();
      
      const permissions = onboardingService.getPermissionStates();
      expect(permissions.camera).toBe('denied'); // Should match actual state
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid service interactions efficiently', async () => {
      const startTime = performance.now();
      
      // Perform rapid operations
      for (let i = 0; i < 100; i++) {
        await onboardingService.updateUserPreferences({ testFlag: i });
        await dataProtectionService.setSecureData(`test_${i}`, { value: i });
        loggingService.log('info', `Test operation ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should manage memory efficiently during long operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform memory-intensive operations
      for (let i = 0; i < 1000; i++) {
        await onboardingService.trackAnalytics('test_event', {
          data: new Array(100).fill(i),
        });
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Service Dependencies', () => {
    it('should handle service initialization order', async () => {
      // Reset all services
      OnboardingService.destroyInstance();
      PermissionService.destroyInstance();
      LocalDataProtectionService.destroyInstance();
      LoggingService.destroyInstance();
      
      // Initialize in different order
      const logging = LoggingService.getInstance();
      const dataProtection = LocalDataProtectionService.getInstance();
      const permissions = PermissionService.getInstance();
      const onboarding = OnboardingService.getInstance();
      
      // All should initialize successfully
      await expect(onboarding.initialize()).resolves.toBeUndefined();
      await expect(permissions.initialize()).resolves.toBeUndefined();
      await expect(dataProtection.initialize()).resolves.toBeUndefined();
      
      // Functionality should work correctly
      await onboarding.startOnboarding();
      expect(onboarding.getCurrentStep()).toBe('welcome');
    });

    it('should handle missing service dependencies gracefully', async () => {
      // Mock missing logging service
      LoggingService.destroyInstance();
      jest.doMock('../../src/services/LoggingService', () => ({
        LoggingService: {
          getInstance: () => {
            throw new Error('Service unavailable');
          },
        },
      }));
      
      // Onboarding should still work without logging
      const onboarding = OnboardingService.getInstance();
      await expect(onboarding.initialize()).resolves.toBeUndefined();
      await expect(onboarding.startOnboarding()).resolves.toBeUndefined();
    });
  });
});
