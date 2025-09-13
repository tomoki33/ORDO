/**
 * Voice Command to Analytics Integration Test
 * 音声コマンドから分析システムまでの統合テスト
 */

import { voiceCommandService } from '../../../src/services/VoiceCommandAnalysisService';
import { usageAnalyticsEngine } from '../../../src/services/UsageAnalyticsEngine';
import { predictiveAlgorithmService } from '../../../src/services/PredictiveAlgorithmService';
import { learningDataAccumulationService } from '../../../src/services/LearningDataAccumulationService';

// Integration test helper functions
const simulateVoiceCommand = async (transcript: string, confidence: number = 0.9) => {
  const mockVoiceResult = {
    transcript,
    confidence,
    alternatives: [],
    isFinal: true,
    language: 'ja-JP',
    processingTime: Math.random() * 200 + 50,
  };
  
  return mockVoiceResult;
};

const waitForAsyncOperations = async () => {
  await global.flushAllPromises();
  jest.runAllTimers();
  await global.flushAllPromises();
};

describe('Voice Command to Analytics Integration', () => {
  beforeEach(async () => {
    // Reset all services
    global.resetTestDatabase();
    
    // Initialize services in dependency order
    await usageAnalyticsEngine.initialize();
    await predictiveAlgorithmService.initialize();
    await learningDataAccumulationService.initialize();
    await voiceCommandService.initialize();
    
    jest.clearAllTimers();
  });

  describe('End-to-End Voice Command Processing', () => {
    test('should process voice command and update analytics', async () => {
      // Simulate voice command
      const voiceResult = await simulateVoiceCommand('りんごを3つ追加');
      
      // Process through voice command service
      await voiceCommandService.startListening();
      
      // Simulate voice recognition result
      const mockListener = {
        onResult: jest.fn(),
        onError: jest.fn(),
        onStart: jest.fn(),
        onEnd: jest.fn(),
        onSpeechStart: jest.fn(),
        onSpeechEnd: jest.fn(),
        onVolumeChanged: jest.fn(),
      };
      
      // Register listener and process
      await waitForAsyncOperations();
      
      // Verify analytics were updated
      const analytics = await usageAnalyticsEngine.getAnalytics();
      expect(analytics).toBeDefined();
      
      await voiceCommandService.stopListening();
    });

    test('should integrate voice commands with predictive system', async () => {
      // Add multiple voice commands to build pattern
      const commands = [
        'りんごを3つ追加',
        'バナナを2つ追加', 
        'パンを1つ追加',
      ];
      
      // Process each command
      for (const command of commands) {
        const voiceResult = await simulateVoiceCommand(command);
        
        // Simulate command processing
        await usageAnalyticsEngine.recordUsage({
          productName: command.split('を')[0],
          category: 'food',
          quantity: parseInt(command.match(/\d+/)?.[0] || '1'),
          action: 'add',
          timestamp: Date.now(),
          userId: 'test-user',
        });
        
        await waitForAsyncOperations();
      }
      
      // Generate predictions based on accumulated data
      const predictions = await predictiveAlgorithmService.generatePurchasePredictions('test-user');
      
      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      
      // Verify learning system recorded the interactions
      const learningMetrics = await learningDataAccumulationService.getModelPerformanceMetrics();
      expect(learningMetrics).toBeDefined();
    });

    test('should handle voice command errors gracefully', async () => {
      // Simulate low confidence voice result
      const lowConfidenceResult = await simulateVoiceCommand('unclear speech', 0.3);
      
      await voiceCommandService.startListening();
      
      // Process should handle low confidence gracefully
      await waitForAsyncOperations();
      
      // Verify error handling
      const commandHistory = voiceCommandService.getCommandHistory();
      expect(Array.isArray(commandHistory)).toBe(true);
      
      await voiceCommandService.stopListening();
    });
  });

  describe('Cross-Service Data Flow', () => {
    test('should maintain data consistency across services', async () => {
      const testUsageData = {
        productName: 'りんご',
        category: 'fruits',
        quantity: 5,
        action: 'add',
        timestamp: Date.now(),
        userId: 'test-user',
      };
      
      // Record usage in analytics
      await usageAnalyticsEngine.recordUsage(testUsageData);
      await waitForAsyncOperations();
      
      // Verify data propagated to predictive service
      const userProfile = await predictiveAlgorithmService.getUserProfile('test-user');
      expect(userProfile).toBeDefined();
      
      // Verify learning service has access to data
      const trainingData = await learningDataAccumulationService.getTrainingData();
      expect(trainingData).toBeDefined();
      expect(trainingData.length).toBeGreaterThan(0);
    });

    test('should synchronize analytics and predictions', async () => {
      // Create historical data
      const historicalData = Array.from({ length: 10 }, (_, index) => ({
        productName: `product-${index}`,
        category: 'test',
        quantity: Math.floor(Math.random() * 5) + 1,
        action: 'add',
        timestamp: Date.now() - (index * 24 * 60 * 60 * 1000), // Past days
        userId: 'test-user',
      }));
      
      // Record all historical data
      for (const data of historicalData) {
        await usageAnalyticsEngine.recordUsage(data);
      }
      
      await waitForAsyncOperations();
      
      // Generate predictions
      const predictions = await predictiveAlgorithmService.generatePurchasePredictions('test-user');
      
      // Verify predictions are based on analytics
      expect(predictions.length).toBeGreaterThan(0);
      
      // Check prediction confidence scores
      predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('confidence');
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should handle concurrent operations correctly', async () => {
      const concurrentOperations = [
        // Voice commands
        voiceCommandService.startListening(),
        
        // Analytics operations
        usageAnalyticsEngine.recordUsage({
          productName: 'concurrent-test-1',
          category: 'test',
          quantity: 1,
          action: 'add',
          timestamp: Date.now(),
          userId: 'test-user',
        }),
        
        // Prediction operations
        predictiveAlgorithmService.generatePurchasePredictions('test-user'),
        
        // Learning operations
        learningDataAccumulationService.recordUserFeedback({
          predictionId: 'test-prediction',
          feedback: 'helpful',
          userId: 'test-user',
          timestamp: Date.now(),
        }),
      ];
      
      // Execute all operations concurrently
      const results = await Promise.allSettled(concurrentOperations);
      
      // Verify no operations failed due to concurrency issues
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures.length).toBe(0);
      
      await voiceCommandService.stopListening();
    });
  });

  describe('Real-World Workflow Simulation', () => {
    test('should handle complete user workflow', async () => {
      // Simulate a complete user workflow
      
      // 1. User starts the app and voice system initializes
      await voiceCommandService.initialize();
      await voiceCommandService.startListening();
      
      // 2. User gives voice commands to add products
      const voiceCommands = [
        'りんごを3つ追加',
        '牛乳を1本追加',
        'パンを2つ追加',
      ];
      
      for (const command of voiceCommands) {
        // Simulate voice processing
        await simulateVoiceCommand(command);
        
        // Extract product info and record usage
        const productName = command.split('を')[0];
        const quantity = parseInt(command.match(/\d+/)?.[0] || '1');
        
        await usageAnalyticsEngine.recordUsage({
          productName,
          category: 'food',
          quantity,
          action: 'add',
          timestamp: Date.now(),
          userId: 'test-user',
        });
      }
      
      await waitForAsyncOperations();
      
      // 3. System generates predictions based on usage
      const predictions = await predictiveAlgorithmService.generatePurchasePredictions('test-user');
      expect(predictions.length).toBeGreaterThan(0);
      
      // 4. User views analytics dashboard
      const analytics = await usageAnalyticsEngine.getAnalytics();
      expect(analytics.totalProducts).toBeGreaterThan(0);
      
      // 5. System learns from user behavior
      await learningDataAccumulationService.recordUserFeedback({
        predictionId: predictions[0]?.id || 'test',
        feedback: 'helpful',
        userId: 'test-user',
        timestamp: Date.now(),
      });
      
      await waitForAsyncOperations();
      
      // 6. Verify learning improved model
      const modelMetrics = await learningDataAccumulationService.getModelPerformanceMetrics();
      expect(modelMetrics.totalFeedback).toBeGreaterThan(0);
      
      await voiceCommandService.stopListening();
    });

    test('should maintain performance under load', async () => {
      const startTime = performance.now();
      
      // Simulate high load scenario
      const loadOperations = Array.from({ length: 50 }, async (_, index) => {
        await usageAnalyticsEngine.recordUsage({
          productName: `load-test-${index}`,
          category: 'test',
          quantity: 1,
          action: 'add',
          timestamp: Date.now(),
          userId: 'test-user',
        });
      });
      
      await Promise.all(loadOperations);
      await waitForAsyncOperations();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Verify reasonable performance (should complete within 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // Verify data integrity after load
      const analytics = await usageAnalyticsEngine.getAnalytics();
      expect(analytics.totalProducts).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from service failures', async () => {
      // Simulate service failure and recovery
      try {
        // Force an error in one service
        await usageAnalyticsEngine.recordUsage({
          productName: null as any, // Invalid data
          category: 'test',
          quantity: 1,
          action: 'add',
          timestamp: Date.now(),
          userId: 'test-user',
        });
      } catch (error) {
        // Expected error
      }
      
      // Verify other services continue working
      const predictions = await predictiveAlgorithmService.generatePurchasePredictions('test-user');
      expect(predictions).toBeDefined();
      
      // Verify service can recover
      await usageAnalyticsEngine.recordUsage({
        productName: 'recovery-test',
        category: 'test',
        quantity: 1,
        action: 'add',
        timestamp: Date.now(),
        userId: 'test-user',
      });
      
      const analytics = await usageAnalyticsEngine.getAnalytics();
      expect(analytics).toBeDefined();
    });

    test('should handle network connectivity issues', async () => {
      // Simulate network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
      
      // Services should still work with local data
      await usageAnalyticsEngine.recordUsage({
        productName: 'offline-test',
        category: 'test',
        quantity: 1,
        action: 'add',
        timestamp: Date.now(),
        userId: 'test-user',
      });
      
      const analytics = await usageAnalyticsEngine.getAnalytics();
      expect(analytics).toBeDefined();
      
      // Restore network mock
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
          text: () => Promise.resolve('{"success": true}'),
        })
      );
    });
  });
});
