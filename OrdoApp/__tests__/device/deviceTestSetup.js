/**
 * Device Testing Setup
 * デバイステスト用セットアップ
 */

import { Platform } from 'react-native';
import MockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { devices, networkConditions, systemSettings } from './deviceConfigurations';

// Mock device-specific APIs
global.__mockDeviceInfo = {
  platform: Platform.OS,
  version: Platform.Version,
  screen: { width: 390, height: 844 },
  features: ['camera', 'microphone'],
};

// Mock React Native modules for device testing
jest.mock('react-native-device-info', () => ({
  getModel: jest.fn(() => Promise.resolve('iPhone 14')),
  getSystemVersion: jest.fn(() => Promise.resolve('17.0')),
  getBrand: jest.fn(() => Promise.resolve('Apple')),
  getManufacturer: jest.fn(() => Promise.resolve('Apple')),
  getDeviceId: jest.fn(() => Promise.resolve('test-device-id')),
  getUniqueId: jest.fn(() => Promise.resolve('test-unique-id')),
  hasSystemFeature: jest.fn((feature) => {
    const currentDevice = global.__mockDeviceInfo;
    return Promise.resolve(currentDevice.features.includes(feature));
  }),
  getScreenSize: jest.fn(() => {
    const currentDevice = global.__mockDeviceInfo;
    return Promise.resolve(currentDevice.screen);
  }),
  isTablet: jest.fn(() => {
    const currentDevice = global.__mockDeviceInfo;
    return Promise.resolve(currentDevice.screen.width > 600);
  }),
}));

// Mock orientation API
jest.mock('react-native-orientation-locker', () => ({
  getOrientation: jest.fn((callback) => callback('portrait')),
  lockToPortrait: jest.fn(),
  lockToLandscape: jest.fn(),
  unlockAllOrientations: jest.fn(),
  addOrientationListener: jest.fn(),
  removeOrientationListener: jest.fn(),
}));

// Mock network info
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(() => {
    const condition = global.__mockNetworkCondition || networkConditions.wifi;
    return Promise.resolve({
      type: condition.name.toLowerCase().includes('wifi') ? 'wifi' : 'cellular',
      isConnected: condition.downloadSpeed > 0,
      isInternetReachable: condition.downloadSpeed > 0,
      details: {
        strength: condition.downloadSpeed > 10000 ? 4 : condition.downloadSpeed > 1000 ? 3 : 2,
        ssid: condition.name.toLowerCase().includes('wifi') ? 'TestWiFi' : null,
        subnet: '192.168.1.0',
        frequency: 2400,
      },
    });
  }),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock camera API
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((options, callback) => {
    const hasCamera = global.__mockDeviceInfo.features.includes('camera');
    if (hasCamera) {
      callback({
        assets: [{
          uri: 'file://test-camera-image.jpg',
          type: 'image/jpeg',
          fileName: 'test-image.jpg',
          fileSize: 1024000,
        }],
      });
    } else {
      callback({ errorMessage: 'Camera not available' });
    }
  }),
  launchImageLibrary: jest.fn((options, callback) => {
    callback({
      assets: [{
        uri: 'file://test-library-image.jpg',
        type: 'image/jpeg',
        fileName: 'library-image.jpg',
        fileSize: 2048000,
      }],
    });
  }),
}));

// Mock microphone/audio API
jest.mock('react-native-sound', () => {
  const mockSound = {
    play: jest.fn((callback) => callback && callback(true)),
    pause: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    getDuration: jest.fn(() => 30.5),
    getCurrentTime: jest.fn((callback) => callback(10.2)),
    setVolume: jest.fn(),
    setSpeed: jest.fn(),
  };

  return jest.fn(() => mockSound);
});

// Mock voice recognition
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(() => {
    const hasMicrophone = global.__mockDeviceInfo.features.includes('microphone');
    if (hasMicrophone) {
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Microphone not available'));
    }
  }),
  stop: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  removeAllListeners: jest.fn(),
  isAvailable: jest.fn(() => {
    const hasMicrophone = global.__mockDeviceInfo.features.includes('microphone');
    return Promise.resolve(hasMicrophone);
  }),
}));

// Mock biometric authentication
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => {
    const device = global.__mockDeviceInfo;
    const hasBiometric = device.features.includes('faceId') || 
                        device.features.includes('touchId') || 
                        device.features.includes('fingerprint');
    return Promise.resolve({
      available: hasBiometric,
      biometryType: device.features.includes('faceId') ? 'FaceID' : 
                   device.features.includes('touchId') ? 'TouchID' : 
                   device.features.includes('fingerprint') ? 'Fingerprint' : 'None',
    });
  }),
  simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => MockAsyncStorage);

// Device testing utilities
export const setMockDevice = (platform, deviceName) => {
  const device = devices[platform]?.[deviceName];
  if (device) {
    global.__mockDeviceInfo = {
      platform: device.platform,
      version: device.version,
      screen: device.screen,
      features: device.features,
      category: device.category,
    };
  }
};

export const setMockNetworkCondition = (conditionName) => {
  const condition = networkConditions[conditionName];
  if (condition) {
    global.__mockNetworkCondition = condition;
  }
};

export const setMockSystemSettings = (settings) => {
  global.__mockSystemSettings = {
    ...global.__mockSystemSettings,
    ...settings,
  };
};

export const resetMockDevice = () => {
  global.__mockDeviceInfo = {
    platform: Platform.OS,
    version: Platform.Version,
    screen: { width: 390, height: 844 },
    features: ['camera', 'microphone'],
  };
  global.__mockNetworkCondition = networkConditions.wifi;
  global.__mockSystemSettings = {};
};

// Test helpers for device capabilities
export const testDeviceCapability = async (capability) => {
  const device = global.__mockDeviceInfo;
  return device.features.includes(capability);
};

export const getDeviceCategory = () => {
  const device = global.__mockDeviceInfo;
  return device.category;
};

export const isTabletDevice = () => {
  const device = global.__mockDeviceInfo;
  return device.category === 'tablet';
};

// Performance measurement for different devices
export const measureDevicePerformance = () => {
  const device = global.__mockDeviceInfo;
  const performanceMultiplier = {
    compact: 0.8,
    standard: 1.0,
    large: 1.2,
    tablet: 1.1,
  };
  
  return {
    cpuMultiplier: performanceMultiplier[device.category] || 1.0,
    memoryMultiplier: performanceMultiplier[device.category] || 1.0,
    expectedLatency: device.category === 'compact' ? 50 : 30,
  };
};

beforeEach(() => {
  resetMockDevice();
});

afterEach(() => {
  jest.clearAllMocks();
});
