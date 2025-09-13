/**
 * Cross-Platform Voice Command Device Tests
 * クロスプラットフォーム音声コマンドデバイステスト
 */

import { Platform } from 'react-native';
import {
  setMockDevice,
  setMockNetworkCondition,
  setMockSystemSettings,
  resetMockDevice,
  testDeviceCapability,
  getDeviceCategory,
  isTabletDevice,
  measureDevicePerformance,
} from './deviceTestSetup';
import { VoiceCommandService } from '../../src/services/VoiceCommandService';
import { devices, networkConditions, systemSettings } from './deviceConfigurations';

describe('Cross-Platform Voice Command Device Tests', () => {
  let voiceService;

  beforeEach(() => {
    resetMockDevice();
    voiceService = new VoiceCommandService();
  });

  afterEach(() => {
    voiceService?.cleanup();
  });

  describe.each(Object.keys(devices))('Platform: %s', (platform) => {
    describe.each(Object.keys(devices[platform]))('Device: %s', (deviceName) => {
      beforeEach(() => {
        setMockDevice(platform, deviceName);
      });

      test('voice command initialization on device', async () => {
        const hasMicrophone = await testDeviceCapability('microphone');
        const deviceCategory = getDeviceCategory();

        if (hasMicrophone) {
          await expect(voiceService.initialize()).resolves.toBeTruthy();
          
          // Verify device-specific configuration
          const config = voiceService.getConfiguration();
          expect(config.platform).toBe(platform);
          
          // Device category specific assertions
          if (deviceCategory === 'tablet') {
            expect(config.multiRegionDetection).toBe(true);
          } else if (deviceCategory === 'compact') {
            expect(config.powerSaveMode).toBe(true);
          }
        } else {
          await expect(voiceService.initialize()).rejects.toThrow('Microphone not available');
        }
      });

      test('voice command processing performance by device category', async () => {
        const hasMicrophone = await testDeviceCapability('microphone');
        if (!hasMicrophone) return;

        const performance = measureDevicePerformance();
        await voiceService.initialize();

        const startTime = Date.now();
        const result = await voiceService.processCommand('テストコマンド');
        const processingTime = Date.now() - startTime;

        // Adjust expectations based on device performance
        const expectedMaxTime = 1000 / performance.cpuMultiplier;
        expect(processingTime).toBeLessThan(expectedMaxTime);
        expect(result.confidence).toBeGreaterThan(0.7);
      });

      test('biometric integration with voice commands', async () => {
        const hasBiometric = await testDeviceCapability('faceId') || 
                           await testDeviceCapability('touchId') || 
                           await testDeviceCapability('fingerprint');
        
        if (hasBiometric) {
          await voiceService.initialize({ biometricAuth: true });
          
          const result = await voiceService.processSecureCommand('プライベートデータを表示');
          expect(result.requiresBiometric).toBe(true);
          expect(result.biometricType).toBeDefined();
        } else {
          await voiceService.initialize({ biometricAuth: false });
          
          const result = await voiceService.processSecureCommand('プライベートデータを表示');
          expect(result.fallbackAuth).toBe('password');
        }
      });

      test('screen size adaptation for voice feedback UI', async () => {
        const device = global.__mockDeviceInfo;
        const isTablet = isTabletDevice();
        
        await voiceService.initialize();
        const uiConfig = voiceService.getVoiceFeedbackUIConfig();

        if (isTablet) {
          expect(uiConfig.layout).toBe('split');
          expect(uiConfig.maxSuggestions).toBeGreaterThan(5);
        } else if (device.category === 'compact') {
          expect(uiConfig.layout).toBe('compact');
          expect(uiConfig.maxSuggestions).toBeLessThanOrEqual(3);
        } else {
          expect(uiConfig.layout).toBe('standard');
          expect(uiConfig.maxSuggestions).toBeLessThanOrEqual(5);
        }
      });
    });
  });

  describe.each(Object.keys(networkConditions))('Network Condition: %s', (conditionName) => {
    beforeEach(() => {
      setMockNetworkCondition(conditionName);
      setMockDevice('ios', 'iPhone 14'); // Use standard device
    });

    test('voice command processing under network conditions', async () => {
      const condition = networkConditions[conditionName];
      await voiceService.initialize();

      if (condition.downloadSpeed === 0) {
        // Offline mode
        const result = await voiceService.processCommand('オフラインコマンド');
        expect(result.mode).toBe('offline');
        expect(result.limitedFeatures).toBe(true);
      } else if (condition.downloadSpeed < 1000) {
        // Slow connection
        const result = await voiceService.processCommand('スローコマンド', { timeout: 10000 });
        expect(result.processingTime).toBeGreaterThan(2000);
        expect(result.qualityReduced).toBe(true);
      } else {
        // Good connection
        const result = await voiceService.processCommand('高速コマンド');
        expect(result.processingTime).toBeLessThan(1500);
        expect(result.fullFeatures).toBe(true);
      }
    });

    test('cloud sync behavior under network conditions', async () => {
      const condition = networkConditions[conditionName];
      await voiceService.initialize();

      const syncResult = await voiceService.syncVoiceProfiles();

      if (condition.downloadSpeed === 0) {
        expect(syncResult.status).toBe('offline');
        expect(syncResult.cached).toBe(true);
      } else if (condition.latency > 200) {
        expect(syncResult.status).toBe('delayed');
        expect(syncResult.retryScheduled).toBe(true);
      } else {
        expect(syncResult.status).toBe('success');
        expect(syncResult.syncTime).toBeLessThan(5000);
      }
    });
  });

  describe('System Settings Variations', () => {
    test.each(systemSettings.languages)('language support: %s', async (language) => {
      setMockSystemSettings({ language });
      setMockDevice('ios', 'iPhone 14');
      
      await voiceService.initialize();
      const result = await voiceService.processCommand('テストコマンド');
      
      expect(result.language).toBe(language);
      expect(result.localized).toBe(true);
    });

    test.each(systemSettings.fontScale)('font scale accessibility: %s', async (scale) => {
      setMockSystemSettings({ fontScale: scale });
      setMockDevice('ios', 'iPhone 14');
      
      await voiceService.initialize();
      const uiConfig = voiceService.getVoiceFeedbackUIConfig();
      
      expect(uiConfig.fontScale).toBe(scale);
      
      if (scale >= 1.3) {
        expect(uiConfig.accessibilityMode).toBe(true);
        expect(uiConfig.voiceReadback).toBe(true);
      }
    });

    test.each(systemSettings.darkMode)('dark mode support: %s', async (isDarkMode) => {
      setMockSystemSettings({ darkMode: isDarkMode });
      setMockDevice('ios', 'iPhone 14');
      
      await voiceService.initialize();
      const uiConfig = voiceService.getVoiceFeedbackUIConfig();
      
      expect(uiConfig.theme).toBe(isDarkMode ? 'dark' : 'light');
      expect(uiConfig.colors).toBeDefined();
    });

    test.each(systemSettings.reducedMotion)('reduced motion support: %s', async (reducedMotion) => {
      setMockSystemSettings({ reducedMotion });
      setMockDevice('ios', 'iPhone 14');
      
      await voiceService.initialize();
      const uiConfig = voiceService.getVoiceFeedbackUIConfig();
      
      expect(uiConfig.animations).toBe(!reducedMotion);
      
      if (reducedMotion) {
        expect(uiConfig.staticFeedback).toBe(true);
        expect(uiConfig.audioFeedback).toBe(true);
      }
    });
  });

  describe('Device Feature Matrix Tests', () => {
    const featureTests = [
      {
        feature: 'camera',
        command: '写真を撮って',
        expectedResult: { cameraAccess: true, imageCapture: true },
      },
      {
        feature: 'nfc',
        command: 'NFCをスキャン',
        expectedResult: { nfcAccess: true, scanning: true },
      },
      {
        feature: 'lidar',
        command: '距離を測定',
        expectedResult: { lidarAccess: true, depthMeasurement: true },
      },
    ];

    test.each(featureTests)('feature availability: $feature', async ({ feature, command, expectedResult }) => {
      // Test on device with feature
      setMockDevice('ios', 'iPhone 14 Pro Max'); // Has most features
      await voiceService.initialize();
      
      const hasFeature = await testDeviceCapability(feature);
      const result = await voiceService.processCommand(command);
      
      if (hasFeature) {
        Object.keys(expectedResult).forEach(key => {
          expect(result[key]).toBe(expectedResult[key]);
        });
      } else {
        expect(result.error).toContain('Feature not available');
        expect(result.fallback).toBeDefined();
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('iOS vs Android voice command differences', async () => {
      const testCommand = '音楽を再生';
      
      // Test iOS
      setMockDevice('ios', 'iPhone 14');
      await voiceService.initialize();
      const iosResult = await voiceService.processCommand(testCommand);
      
      // Test Android
      setMockDevice('android', 'Pixel 7');
      await voiceService.initialize();
      const androidResult = await voiceService.processCommand(testCommand);
      
      // Core functionality should be same
      expect(iosResult.command).toBe(androidResult.command);
      expect(iosResult.intent).toBe(androidResult.intent);
      
      // Platform-specific differences
      expect(iosResult.platform).toBe('iOS');
      expect(androidResult.platform).toBe('Android');
      
      // Platform-specific integrations might differ
      if (iosResult.siriIntegration) {
        expect(androidResult.assistantIntegration).toBeDefined();
      }
    });

    test('tablet vs phone UI adaptations', async () => {
      const testCommand = 'メニューを表示';
      
      // Test phone
      setMockDevice('ios', 'iPhone 14');
      await voiceService.initialize();
      const phoneResult = await voiceService.processCommand(testCommand);
      
      // Test tablet
      setMockDevice('ios', 'iPad (10th gen)');
      await voiceService.initialize();
      const tabletResult = await voiceService.processCommand(testCommand);
      
      expect(phoneResult.ui.layout).toBe('single-column');
      expect(tabletResult.ui.layout).toBe('multi-column');
      
      expect(tabletResult.ui.maxItems).toBeGreaterThan(phoneResult.ui.maxItems);
    });
  });

  describe('Performance Benchmarks by Device', () => {
    test('voice processing latency across devices', async () => {
      const results = {};
      
      for (const [platform, deviceList] of Object.entries(devices)) {
        for (const [deviceName, deviceConfig] of Object.entries(deviceList)) {
          setMockDevice(platform, deviceName);
          await voiceService.initialize();
          
          const startTime = performance.now();
          await voiceService.processCommand('パフォーマンステスト');
          const endTime = performance.now();
          
          const processingTime = endTime - startTime;
          results[`${platform}-${deviceName}`] = {
            processingTime,
            category: deviceConfig.category,
            expected: deviceConfig.category === 'compact' ? 800 : 
                     deviceConfig.category === 'tablet' ? 400 : 600,
          };
        }
      }
      
      // Verify performance expectations
      Object.entries(results).forEach(([deviceKey, result]) => {
        expect(result.processingTime).toBeLessThan(result.expected);
      });
      
      // Log performance comparison for monitoring
      console.log('Device Performance Results:', JSON.stringify(results, null, 2));
    });

    test('memory usage patterns across devices', async () => {
      const memoryResults = {};
      
      for (const [platform, deviceList] of Object.entries(devices)) {
        for (const [deviceName, deviceConfig] of Object.entries(deviceList)) {
          setMockDevice(platform, deviceName);
          
          const initialMemory = process.memoryUsage().heapUsed;
          await voiceService.initialize();
          
          // Simulate multiple voice commands
          for (let i = 0; i < 10; i++) {
            await voiceService.processCommand(`テストコマンド${i}`);
          }
          
          const finalMemory = process.memoryUsage().heapUsed;
          const memoryIncrease = finalMemory - initialMemory;
          
          memoryResults[`${platform}-${deviceName}`] = {
            memoryIncrease,
            category: deviceConfig.category,
          };
        }
      }
      
      // Verify no memory leaks
      Object.values(memoryResults).forEach(result => {
        expect(result.memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      });
    });
  });
});
