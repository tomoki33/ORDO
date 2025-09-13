/**
 * Mock Modules for Unit Tests
 * ユニットテスト用モックモジュール
 */

// VoiceRecognitionService Mock
export const voiceRecognitionService = {
  initialize: jest.fn().mockResolvedValue(true),
  startListening: jest.fn().mockResolvedValue(undefined),
  stopListening: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  setLanguage: jest.fn(),
  getStatus: jest.fn().mockReturnValue({
    isListening: false,
    isAvailable: true,
    language: 'ja-JP',
  }),
  getSupportedLanguages: jest.fn().mockReturnValue(['ja-JP', 'en-US']),
};

// NaturalLanguageProcessingService Mock
export const nlpService = {
  setLanguage: jest.fn(),
  parseText: jest.fn().mockResolvedValue({
    intent: 'ADD_PRODUCT',
    confidence: 0.9,
    entities: [],
    language: 'ja-JP',
    originalText: 'りんごを3つ追加',
    normalizedText: 'りんごを3つ追加',
  }),
  isConfidenceAcceptable: jest.fn().mockReturnValue(true),
  extractProductEntity: jest.fn().mockReturnValue({
    name: 'りんご',
    quantity: 3,
    unit: '個',
  }),
  extractActionEntity: jest.fn().mockReturnValue({
    action: '追加',
  }),
  generateSuggestions: jest.fn().mockReturnValue(['りんごを追加', 'バナナを追加']),
  getSupportedLanguages: jest.fn().mockReturnValue(['ja-JP', 'en-US']),
};

// PerformanceMonitorService Mock
export const performanceMonitor = {
  startTimer: jest.fn(),
  endTimer: jest.fn(),
  recordMetric: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({}),
};
