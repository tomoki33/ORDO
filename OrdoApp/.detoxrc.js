/**
 * Performance Testing Configuration
 * Detox configuration for performance and E2E tests
 */

module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  
  configurations: {
    'ios.sim.debug': {
      type: 'ios.simulator',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/OrdoApp.app',
      device: {
        type: 'iPhone 14',
        os: 'iOS 16.0'
      }
    },
    'ios.sim.release': {
      type: 'ios.simulator',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/OrdoApp.app',
      device: {
        type: 'iPhone 14',
        os: 'iOS 16.0'
      }
    },
    'android.emu.debug': {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    },
    'android.emu.release': {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    }
  },
  
  behavior: {
    init: {
      reinstallApp: true,
      keepLockFile: true
    },
    cleanup: {
      shutdownDevice: false
    }
  },
  
  artifacts: {
    plugins: {
      log: 'failing',
      screenshot: {
        shouldTakeAutomaticScreenshots: true,
        keepOnlyFailedTestsArtifacts: false,
        takeWhen: {
          testStart: true,
          testDone: true
        }
      },
      video: {
        shouldTakeAutomaticVideos: false,
        keepOnlyFailedTestsArtifacts: true
      },
      instruments: {
        enabled: process.env.CI ? false : true
      }
    }
  },
  
  logger: {
    level: process.env.CI ? 'error' : 'verbose'
  }
};
