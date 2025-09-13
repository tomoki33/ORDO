/**
 * E2E Test Setup
 * エンドツーエンドテストセットアップ
 */

const detox = require('detox');
const config = require('../../package.json').detox;

// Detox setup
beforeAll(async () => {
  console.log('🚀 Starting E2E Test Environment...');
  
  await detox.init(config, {
    initGlobals: false,
    launchApp: false,
  });
  
  console.log('✅ Detox initialized');
}, 300000);

beforeEach(async () => {
  console.log('📱 Launching app for test...');
  
  await device.launchApp({
    newInstance: true,
    permissions: {
      camera: 'YES',
      microphone: 'YES',
      notifications: 'YES',
    },
  });
  
  console.log('✅ App launched');
});

afterEach(async () => {
  console.log('📱 Terminating app after test...');
  
  await device.terminateApp();
  
  console.log('✅ App terminated');
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E Test Environment...');
  
  await detox.cleanup();
  
  console.log('✅ E2E cleanup completed');
});

// Global test utilities
global.waitForElement = async (elementId, timeout = 10000) => {
  await waitFor(element(by.id(elementId)))
    .toBeVisible()
    .withTimeout(timeout);
};

global.waitForElementWithText = async (text, timeout = 10000) => {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
};

global.tapAndWait = async (elementId, waitForElementId = null, timeout = 5000) => {
  await element(by.id(elementId)).tap();
  
  if (waitForElementId) {
    await waitFor(element(by.id(waitForElementId)))
      .toBeVisible()
      .withTimeout(timeout);
  }
};

global.typeAndWait = async (elementId, text, waitTime = 1000) => {
  await element(by.id(elementId)).typeText(text);
  await new Promise(resolve => setTimeout(resolve, waitTime));
};

global.scrollAndFind = async (scrollViewId, elementId, direction = 'down') => {
  const maxScrolls = 10;
  let found = false;
  
  for (let i = 0; i < maxScrolls && !found; i++) {
    try {
      await element(by.id(elementId)).tap();
      found = true;
    } catch (error) {
      await element(by.id(scrollViewId)).scroll(200, direction);
    }
  }
  
  if (!found) {
    throw new Error(`Element ${elementId} not found after scrolling`);
  }
};

// Device helpers
global.deviceInfo = {
  platform: device.getPlatform(),
  name: device.name,
};

// Screenshot helpers
global.takeScreenshot = async (name) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}`;
  await device.takeScreenshot(filename);
  console.log(`📸 Screenshot saved: ${filename}`);
};

// Performance helpers
global.measurePerformance = async (operation, name) => {
  const startTime = Date.now();
  
  try {
    await operation();
  } catch (error) {
    console.error(`Performance test failed for ${name}:`, error);
    throw error;
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`⏱️ Performance: ${name} took ${duration}ms`);
  
  return duration;
};

// Memory helpers
global.checkMemoryUsage = async () => {
  // Platform-specific memory checking would go here
  console.log('📊 Memory usage check (implementation depends on platform)');
};

// Network helpers
global.simulateNetworkConditions = async (condition) => {
  // This would integrate with device network simulation
  console.log(`🌐 Simulating network condition: ${condition}`);
  
  switch (condition) {
    case 'offline':
      // Disable network
      break;
    case 'slow':
      // Simulate slow network
      break;
    case 'normal':
    default:
      // Normal network conditions
      break;
  }
};

// Voice testing helpers
global.simulateVoiceInput = async (transcript, confidence = 0.9) => {
  // This would simulate voice input for testing
  console.log(`🎤 Simulating voice input: "${transcript}" (confidence: ${confidence})`);
  
  // Implementation would depend on how voice testing is handled
  // Could involve mocking the voice recognition service
};

// Camera testing helpers
global.simulateCameraCapture = async (imageType = 'product') => {
  console.log(`📷 Simulating camera capture: ${imageType}`);
  
  // This would simulate camera input for testing
  // Could involve providing test images
};

// Error recovery helpers
global.recoverFromError = async () => {
  try {
    // Try to get back to home screen
    await device.launchApp({ newInstance: false });
  } catch (error) {
    // Force restart if needed
    await device.launchApp({ newInstance: true });
  }
};

// Accessibility helpers
global.checkAccessibility = async (elementId) => {
  const element = by.id(elementId);
  
  // Check if element has accessibility label
  await expect(element).toHaveAccessibilityLabel();
  
  console.log(`♿ Accessibility check passed for: ${elementId}`);
};

// Multi-language helpers
global.switchLanguage = async (languageCode) => {
  console.log(`🌍 Switching to language: ${languageCode}`);
  
  // Implementation would navigate to settings and change language
  // This is a placeholder for the actual implementation
};

// Data reset helpers
global.resetAppData = async () => {
  console.log('🔄 Resetting app data...');
  
  await device.launchApp({
    newInstance: true,
    delete: true, // This will clear app data
  });
  
  console.log('✅ App data reset');
};

console.log('🧪 E2E Test Setup Complete');
