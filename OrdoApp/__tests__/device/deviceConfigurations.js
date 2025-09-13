/**
 * Device Configurations for Testing
 * テスト用デバイス設定
 */

const devices = {
  ios: {
    'iPhone SE (3rd gen)': {
      platform: 'iOS',
      version: '17.0',
      screen: { width: 375, height: 667 },
      features: ['camera', 'microphone', 'touchId'],
      category: 'compact',
    },
    'iPhone 14': {
      platform: 'iOS',
      version: '17.0',
      screen: { width: 390, height: 844 },
      features: ['camera', 'microphone', 'faceId', 'nfc'],
      category: 'standard',
    },
    'iPhone 14 Pro Max': {
      platform: 'iOS',
      version: '17.0',
      screen: { width: 430, height: 932 },
      features: ['camera', 'microphone', 'faceId', 'nfc', 'lidar'],
      category: 'large',
    },
    'iPad (10th gen)': {
      platform: 'iOS',
      version: '17.0',
      screen: { width: 820, height: 1180 },
      features: ['camera', 'microphone', 'touchId'],
      category: 'tablet',
    },
  },
  android: {
    'Pixel 4a': {
      platform: 'Android',
      version: '13',
      screen: { width: 393, height: 851 },
      features: ['camera', 'microphone', 'fingerprint', 'nfc'],
      category: 'compact',
    },
    'Pixel 7': {
      platform: 'Android',
      version: '14',
      screen: { width: 412, height: 915 },
      features: ['camera', 'microphone', 'fingerprint', 'nfc'],
      category: 'standard',
    },
    'Pixel 7 Pro': {
      platform: 'Android',
      version: '14',
      screen: { width: 412, height: 915 },
      features: ['camera', 'microphone', 'fingerprint', 'nfc'],
      category: 'large',
    },
    'Samsung Galaxy Tab S8': {
      platform: 'Android',
      version: '13',
      screen: { width: 753, height: 1037 },
      features: ['camera', 'microphone', 'fingerprint'],
      category: 'tablet',
    },
  },
};

const networkConditions = {
  wifi: {
    name: 'WiFi',
    downloadSpeed: 50000, // kbps
    uploadSpeed: 10000, // kbps
    latency: 20, // ms
    packetLoss: 0, // %
  },
  cellular4g: {
    name: '4G LTE',
    downloadSpeed: 12000, // kbps
    uploadSpeed: 5000, // kbps
    latency: 50, // ms
    packetLoss: 0.1, // %
  },
  cellular3g: {
    name: '3G',
    downloadSpeed: 1600, // kbps
    uploadSpeed: 768, // kbps
    latency: 150, // ms
    packetLoss: 0.5, // %
  },
  slow: {
    name: 'Slow Connection',
    downloadSpeed: 256, // kbps
    uploadSpeed: 128, // kbps
    latency: 500, // ms
    packetLoss: 2, // %
  },
  offline: {
    name: 'Offline',
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    packetLoss: 100,
  },
};

const orientations = ['portrait', 'landscape'];

const systemSettings = {
  darkMode: [true, false],
  reducedMotion: [true, false],
  fontScale: [0.85, 1.0, 1.15, 1.3, 2.0],
  languages: ['ja-JP', 'en-US', 'zh-CN', 'ko-KR'],
};

module.exports = {
  devices,
  networkConditions,
  orientations,
  systemSettings,
};
