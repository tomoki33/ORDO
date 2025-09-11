/**
 * Performance Test Suite for Onboarding
 * Tests performance characteristics and optimization
 */

import { performance } from 'perf_hooks';
import { OnboardingService } from '../../src/services/OnboardingService';
import { PermissionService } from '../../src/services/PermissionService';
import { LocalDataProtectionService } from '../../src/services/LocalDataProtectionService';
import { testSetup } from '../utils/testHelpers';

// Performance test utilities
class PerformanceTestHelper {
  static measurements = new Map();

  static startMeasurement(name) {
    this.measurements.set(name, {
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
    });
  }

  static endMeasurement(name) {
    const measurement = this.measurements.get(name);
    if (!measurement) {
      throw new Error(`No measurement started for ${name}`);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const result = {
      duration: endTime - measurement.startTime,
      memoryDelta: {
        rss: endMemory.rss - measurement.startMemory.rss,
        heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
      },
    };

    this.measurements.delete(name);
    return result;
  }

  static expectPerformance(result, thresholds) {
    if (thresholds.maxDuration) {
      expect(result.duration).toBeLessThan(thresholds.maxDuration);
    }
    if (thresholds.maxMemoryIncrease) {
      expect(result.memoryDelta.heapUsed).toBeLessThan(thresholds.maxMemoryIncrease);
    }
  }

  static async measureAsync(name, asyncFn) {
    this.startMeasurement(name);
    const result = await asyncFn();
    const measurement = this.endMeasurement(name);
    return { result, measurement };
  }

  static async runLoadTest(testFn, concurrency = 10, iterations = 100) {
    const promises = [];
    const results = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          for (let j = 0; j < iterations / concurrency; j++) {
            const start = performance.now();
            await testFn();
            const end = performance.now();
            results.push(end - start);
          }
        })()
      );
    }

    await Promise.all(promises);

    return {
      min: Math.min(...results),
      max: Math.max(...results),
      avg: results.reduce((a, b) => a + b, 0) / results.length,
      p95: results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)],
      p99: results.sort((a, b) => a - b)[Math.floor(results.length * 0.99)],
    };
  }
}

describe('Onboarding Performance Tests', () => {
  let onboardingService;
  let permissionService;
  let dataProtectionService;

  beforeEach(async () => {
    testSetup.beforeEach();
    
    // Use real services for performance testing
    onboardingService = OnboardingService.getInstance();
    permissionService = PermissionService.getInstance();
    dataProtectionService = LocalDataProtectionService.getInstance();
    
    await onboardingService.resetOnboarding();

    // Mock external dependencies for consistent performance
    require('@react-native-community/permissions').check.mockResolvedValue('granted');
    require('@react-native-community/permissions').request.mockResolvedValue('granted');
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Service Initialization Performance', () => {
    it('should initialize OnboardingService quickly', async () => {
      const { measurement } = await PerformanceTestHelper.measureAsync(
        'onboarding-init',
        () => OnboardingService.getInstance().initialize()
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 100, // 100ms
        maxMemoryIncrease: 5 * 1024 * 1024, // 5MB
      });

      console.log('OnboardingService initialization:', measurement);
    });

    it('should handle concurrent service initialization efficiently', async () => {
      const stats = await PerformanceTestHelper.runLoadTest(
        () => {
          // Reset and reinitialize
          OnboardingService.destroyInstance();
          return OnboardingService.getInstance().initialize();
        },
        5, // concurrency
        50  // total iterations
      );

      expect(stats.avg).toBeLessThan(150); // 150ms average
      expect(stats.p95).toBeLessThan(300); // 300ms 95th percentile

      console.log('Concurrent initialization stats:', stats);
    });
  });

  describe('Onboarding Flow Performance', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
    });

    it('should start onboarding flow quickly', async () => {
      const { measurement } = await PerformanceTestHelper.measureAsync(
        'start-onboarding',
        () => onboardingService.startOnboarding()
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 50, // 50ms
        maxMemoryIncrease: 1 * 1024 * 1024, // 1MB
      });
    });

    it('should navigate between steps efficiently', async () => {
      await onboardingService.startOnboarding();

      const { measurement } = await PerformanceTestHelper.measureAsync(
        'step-navigation',
        async () => {
          await onboardingService.nextStep(); // welcome -> permissions
          await onboardingService.nextStep(); // permissions -> camera-tutorial
          await onboardingService.nextStep(); // camera-tutorial -> user-guide
        }
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 200, // 200ms for 3 steps
        maxMemoryIncrease: 2 * 1024 * 1024, // 2MB
      });
    });

    it('should handle rapid step navigation without degradation', async () => {
      await onboardingService.startOnboarding();

      const stats = await PerformanceTestHelper.runLoadTest(
        async () => {
          await onboardingService.resetOnboarding();
          await onboardingService.startOnboarding();
          await onboardingService.nextStep();
        },
        10,
        100
      );

      expect(stats.avg).toBeLessThan(100); // 100ms average
      expect(stats.max / stats.min).toBeLessThan(3); // Consistent performance

      console.log('Rapid navigation stats:', stats);
    });
  });

  describe('Data Persistence Performance', () => {
    beforeEach(async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();
    });

    it('should save progress efficiently', async () => {
      const { measurement } = await PerformanceTestHelper.measureAsync(
        'save-progress',
        () => onboardingService.saveProgress()
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 100, // 100ms
        maxMemoryIncrease: 500 * 1024, // 500KB
      });
    });

    it('should load progress efficiently', async () => {
      // Save some progress first
      await onboardingService.nextStep();
      await onboardingService.updateUserPreferences({ analyticsEnabled: false });
      await onboardingService.saveProgress();

      // Create new instance and load
      OnboardingService.destroyInstance();
      const newService = OnboardingService.getInstance();

      const { measurement } = await PerformanceTestHelper.measureAsync(
        'load-progress',
        () => newService.initialize()
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 150, // 150ms
        maxMemoryIncrease: 1 * 1024 * 1024, // 1MB
      });

      // Verify data was loaded correctly
      expect(newService.getCurrentStep()).toBe('permissions');
    });

    it('should handle large preference objects efficiently', async () => {
      const largePreferences = {
        analyticsEnabled: false,
        notificationsEnabled: true,
        largeData: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: `large-preference-${i}`,
          nested: { data: new Array(10).fill(`nested-${i}`) },
        })),
      };

      const { measurement } = await PerformanceTestHelper.measureAsync(
        'large-preferences',
        () => onboardingService.updateUserPreferences(largePreferences)
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 500, // 500ms for large data
        maxMemoryIncrease: 10 * 1024 * 1024, // 10MB
      });
    });
  });

  describe('Permission Service Performance', () => {
    it('should check permissions quickly', async () => {
      const { measurement } = await PerformanceTestHelper.measureAsync(
        'check-permissions',
        () => permissionService.checkPermission('camera')
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 50, // 50ms
        maxMemoryIncrease: 100 * 1024, // 100KB
      });
    });

    it('should handle multiple permission checks efficiently', async () => {
      const { measurement } = await PerformanceTestHelper.measureAsync(
        'multiple-permission-checks',
        async () => {
          await Promise.all([
            permissionService.checkPermission('camera'),
            permissionService.checkPermission('notifications'),
            permissionService.checkPermission('microphone'),
            permissionService.checkPermission('location'),
          ]);
        }
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 200, // 200ms for 4 permissions
        maxMemoryIncrease: 500 * 1024, // 500KB
      });
    });

    it('should request permissions without blocking', async () => {
      const stats = await PerformanceTestHelper.runLoadTest(
        () => permissionService.requestPermission('camera'),
        5,
        25
      );

      // Should be consistent even under load
      expect(stats.avg).toBeLessThan(100);
      expect(stats.p95).toBeLessThan(200);

      console.log('Permission request stats:', stats);
    });
  });

  describe('Data Protection Service Performance', () => {
    it('should encrypt/decrypt data efficiently', async () => {
      const testData = {
        step: 'permissions',
        preferences: { analytics: false },
        timestamp: Date.now(),
      };

      const { measurement: encryptMeasurement } = await PerformanceTestHelper.measureAsync(
        'encrypt-data',
        () => dataProtectionService.setSecureData('test-key', testData)
      );

      PerformanceTestHelper.expectPerformance(encryptMeasurement, {
        maxDuration: 100, // 100ms
        maxMemoryIncrease: 1 * 1024 * 1024, // 1MB
      });

      const { measurement: decryptMeasurement } = await PerformanceTestHelper.measureAsync(
        'decrypt-data',
        () => dataProtectionService.getSecureData('test-key')
      );

      PerformanceTestHelper.expectPerformance(decryptMeasurement, {
        maxDuration: 50, // 50ms
        maxMemoryIncrease: 500 * 1024, // 500KB
      });
    });

    it('should handle large data encryption efficiently', async () => {
      const largeData = {
        data: new Array(10000).fill(0).map((_, i) => ({
          id: i,
          content: `Large data item ${i} with some text content`,
        })),
      };

      const { measurement } = await PerformanceTestHelper.measureAsync(
        'encrypt-large-data',
        () => dataProtectionService.setSecureData('large-data', largeData)
      );

      PerformanceTestHelper.expectPerformance(measurement, {
        maxDuration: 2000, // 2 seconds for large data
        maxMemoryIncrease: 50 * 1024 * 1024, // 50MB
      });
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during normal operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple onboarding cycles
      for (let i = 0; i < 10; i++) {
        await onboardingService.resetOnboarding();
        await onboardingService.startOnboarding();
        await onboardingService.nextStep();
        await onboardingService.nextStep();
        await onboardingService.completeOnboarding();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase memory significantly
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB max

      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });

    it('should clean up resources properly', async () => {
      PerformanceTestHelper.startMeasurement('resource-cleanup');

      // Create multiple service instances
      const services = [];
      for (let i = 0; i < 100; i++) {
        OnboardingService.destroyInstance();
        const service = OnboardingService.getInstance();
        await service.initialize();
        services.push(service);
      }

      // Destroy all instances
      OnboardingService.destroyInstance();

      const measurement = PerformanceTestHelper.endMeasurement('resource-cleanup');

      // Memory should not grow excessively
      expect(measurement.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency operations', async () => {
      await onboardingService.initialize();
      await onboardingService.startOnboarding();

      const stats = await PerformanceTestHelper.runLoadTest(
        async () => {
          await onboardingService.updateUserPreferences({
            testFlag: Math.random(),
          });
        },
        20, // High concurrency
        1000 // Many operations
      );

      // Should maintain reasonable performance
      expect(stats.avg).toBeLessThan(50); // 50ms average
      expect(stats.p99).toBeLessThan(200); // 200ms 99th percentile

      console.log('High-frequency operation stats:', stats);
    });

    it('should handle service destruction and recreation under load', async () => {
      const stats = await PerformanceTestHelper.runLoadTest(
        async () => {
          OnboardingService.destroyInstance();
          const service = OnboardingService.getInstance();
          await service.initialize();
          await service.startOnboarding();
        },
        10,
        50
      );

      // Should not degrade significantly
      expect(stats.max / stats.min).toBeLessThan(5); // Reasonable variance

      console.log('Service recreation stats:', stats);
    });
  });

  describe('Device Simulation', () => {
    it('should perform well on slow devices', async () => {
      // Simulate slow CPU by adding delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (fn, delay) => originalSetTimeout(fn, delay * 2);

      try {
        const { measurement } = await PerformanceTestHelper.measureAsync(
          'slow-device',
          async () => {
            await onboardingService.initialize();
            await onboardingService.startOnboarding();
            await onboardingService.nextStep();
          }
        );

        // Should still complete in reasonable time even on slow devices
        expect(measurement.duration).toBeLessThan(1000); // 1 second
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('should handle low memory conditions', async () => {
      // Simulate memory pressure
      const memoryPressure = new Array(1000000).fill('memory-pressure');

      try {
        const { measurement } = await PerformanceTestHelper.measureAsync(
          'low-memory',
          async () => {
            await onboardingService.initialize();
            await onboardingService.startOnboarding();
          }
        );

        expect(measurement.duration).toBeLessThan(500); // 500ms
      } finally {
        // Clean up
        memoryPressure.length = 0;
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance characteristics', async () => {
      const baseline = {
        initialization: 100, // ms
        stepNavigation: 50,   // ms
        dataPersistence: 150, // ms
      };

      // Test initialization
      const { measurement: initMeasurement } = await PerformanceTestHelper.measureAsync(
        'baseline-init',
        () => onboardingService.initialize()
      );
      expect(initMeasurement.duration).toBeLessThan(baseline.initialization);

      // Test navigation
      await onboardingService.startOnboarding();
      const { measurement: navMeasurement } = await PerformanceTestHelper.measureAsync(
        'baseline-nav',
        () => onboardingService.nextStep()
      );
      expect(navMeasurement.duration).toBeLessThan(baseline.stepNavigation);

      // Test persistence
      const { measurement: persistMeasurement } = await PerformanceTestHelper.measureAsync(
        'baseline-persist',
        () => onboardingService.saveProgress()
      );
      expect(persistMeasurement.duration).toBeLessThan(baseline.dataPersistence);

      console.log('Baseline performance:', {
        init: initMeasurement.duration,
        nav: navMeasurement.duration,
        persist: persistMeasurement.duration,
      });
    });
  });
});
