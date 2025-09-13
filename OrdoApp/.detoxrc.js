/**
 * Detox E2E Test Configuration  
 * エンドツーエンドテスト設定（拡張版）
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: '__tests__/e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/OrdoApp.app',
      build: 'xcodebuild -workspace ios/OrdoApp.xcworkspace -scheme OrdoApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/OrdoApp.app',
      build: 'xcodebuild -workspace ios/OrdoApp.xcworkspace -scheme OrdoApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    }
  },
  
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    genycloud: {
      type: 'android.genycloud',
      device: {
        recipeName: 'Samsung Galaxy S10'
      }
    }
  },
  
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',  
      app: 'ios.release'
    },
    'ios.device': {
      device: 'attached',
      app: 'ios.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    },
    'android.device': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.genycloud': {
      device: 'genycloud',
      app: 'android.release'
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
