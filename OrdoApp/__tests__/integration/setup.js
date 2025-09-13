/**
 * Integration Test Setup
 * インテグレーションテストセットアップ
 */

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

// AsyncStorage mock with enhanced functionality
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// SQLite integration mock
jest.mock('react-native-sqlite-storage', () => {
  let database = new Map();
  
  return {
    DEBUG: jest.fn(),
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() => ({
      transaction: jest.fn((callback) => {
        const tx = {
          executeSql: jest.fn((sql, params, successCallback, errorCallback) => {
            // Simple SQL simulation for integration tests
            try {
              if (sql.includes('CREATE TABLE')) {
                successCallback(tx, { rows: { length: 0, raw: () => [] } });
              } else if (sql.includes('INSERT')) {
                const id = Math.floor(Math.random() * 1000);
                successCallback(tx, { insertId: id, rowsAffected: 1 });
              } else if (sql.includes('SELECT')) {
                const mockData = Array.from(database.values());
                successCallback(tx, { 
                  rows: { 
                    length: mockData.length, 
                    raw: () => mockData,
                    item: (index) => mockData[index] 
                  } 
                });
              } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
                successCallback(tx, { rowsAffected: 1 });
              }
            } catch (error) {
              errorCallback(tx, error);
            }
          }),
        };
        callback(tx);
      }),
      executeSql: jest.fn(),
      close: jest.fn(),
    })),
  };
});

// Enhanced React Native mocks for integration
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    Alert: {
      alert: jest.fn((title, message, buttons) => {
        // Simulate user interactions for integration tests
        if (buttons && buttons.length > 0) {
          const button = buttons[buttons.length - 1];
          if (button.onPress) {
            setTimeout(() => button.onPress(), 0);
          }
        }
      }),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
      Version: '14.0',
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    PermissionsAndroid: {
      request: jest.fn(() => Promise.resolve('granted')),
      check: jest.fn(() => Promise.resolve(true)),
      PERMISSIONS: {
        CAMERA: 'android.permission.CAMERA',
        RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
        WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

// Camera integration mock
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getAvailableCameraDevices: jest.fn(() => Promise.resolve([
      { id: 'back', position: 'back', hasFlash: true },
      { id: 'front', position: 'front', hasFlash: false },
    ])),
    getCameraPermissionStatus: jest.fn(() => 'authorized'),
    requestCameraPermission: jest.fn(() => Promise.resolve('authorized')),
  },
  useCameraDevices: jest.fn(() => ({
    back: { id: 'back', position: 'back' },
    front: { id: 'front', position: 'front' },
  })),
  useFrameProcessor: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
}));

// Network simulation for integration tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: {} }),
    text: () => Promise.resolve('{"success": true}'),
  })
);

// Performance tracking for integration tests
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
};

// Integration test utilities
global.waitForNextTick = () => new Promise(setImmediate);
global.flushAllPromises = async () => {
  await new Promise(setImmediate);
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Database reset utility
global.resetTestDatabase = () => {
  mockAsyncStorage.clear();
};

// Mock timers for integration tests
jest.useFakeTimers();

// Suppress console warnings in integration tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('Warning: ReactDOM.render'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
