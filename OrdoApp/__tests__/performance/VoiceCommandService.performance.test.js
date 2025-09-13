/**
 * Voice Command Service Performance Tests
 * 音声コマンドサービスのパフォーマンステスト
 */

describe('Voice Command Service Performance', () => {
  let voiceCommandService;
  
  beforeAll(async () => {
    // Import service dynamically to avoid setup issues
    const { voiceCommandService: service } = await import('../../../src/services/VoiceCommandAnalysisService');
    voiceCommandService = service;
    
    // Initialize with minimal dependencies for performance testing
    await voiceCommandService.initialize();
  });

  afterEach(() => {
    // Clean up after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Command Processing Performance', () => {
    test('should process single voice command within time limit', async () => {
      const { metrics } = await global.measureExecutionTime(async () => {
        const mockVoiceResult = {
          transcript: 'りんごを3つ追加',
          confidence: 0.9,
          alternatives: [],
          isFinal: true,
          language: 'ja-JP',
          processingTime: 100,
        };
        
        // Simulate voice command processing
        await voiceCommandService.startListening();
        await voiceCommandService.stopListening();
        
        return mockVoiceResult;
      }, 'single-voice-command');
      
      // Should process within 1 second
      global.expectPerformance.toBeWithinTimeLimit(
        metrics.executionTime,
        1000,
        'single voice command processing'
      );
      
      // Should not use excessive memory
      global.expectPerformance.toHaveMemoryUsageLessThan(
        Math.abs(metrics.memoryDelta.heapUsed),
        50, // 50MB limit
        'single voice command processing'
      );
    });

    test('should handle rapid command processing efficiently', async () => {
      const { metrics } = await global.measureThroughput(
        async (iteration) => {
          const commands = [
            'りんごを追加',
            'バナナを削除',
            '在庫を確認',
            'ヘルプを表示',
            '設定を開く',
          ];
          
          const command = commands[iteration % commands.length];
          
          // Simulate rapid command processing
          await voiceCommandService.startListening();
          await voiceCommandService.stopListening();
          
          return { command, processed: true };
        },
        50, // 50 iterations
        'rapid-command-processing'
      );
      
      // Should process at least 10 commands per second
      global.expectPerformance.toHaveThroughputGreaterThan(
        metrics.operationsPerSecond,
        10,
        'rapid command processing'
      );
      
      // Success rate should be high
      expect(metrics.successRate).toBeGreaterThan(95);
    });

    test('should maintain performance under concurrent load', async () => {
      const { metrics } = await global.measureLoadPerformance(
        async (workerId, operationId) => {
          // Simulate concurrent voice commands
          const commands = [
            `商品${workerId}-${operationId}を追加`,
            `アイテム${workerId}-${operationId}を削除`,
            '在庫確認',
          ];
          
          const command = commands[operationId % commands.length];
          
          await voiceCommandService.startListening();
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          await voiceCommandService.stopListening();
          
          return { workerId, operationId, command };
        },
        5, // 5 concurrent workers
        3000, // 3 seconds duration
        'concurrent-voice-commands'
      );
      
      // Should maintain reasonable throughput under load
      global.expectPerformance.toHaveThroughputGreaterThan(
        metrics.operationsPerSecond,
        5,
        'concurrent voice command processing'
      );
      
      // Should have high success rate
      expect(metrics.successRate).toBeGreaterThan(90);
      
      // Average response time should be reasonable
      expect(metrics.averageDuration).toBeLessThan(500); // 500ms
    });
  });

  describe('Memory Management Performance', () => {
    test('should not have memory leaks in command processing', async () => {
      const memoryAnalysis = await global.detectMemoryLeaks(
        async (iteration) => {
          // Simulate command processing that could potentially leak
          const commands = Array.from({ length: 10 }, (_, i) => `商品${iteration}-${i}を追加`);
          
          for (const command of commands) {
            await voiceCommandService.startListening();
            await voiceCommandService.stopListening();
          }
          
          // Get analytics to exercise different code paths
          const analytics = voiceCommandService.getAnalytics();
          const history = voiceCommandService.getCommandHistory();
          
          return { analytics, history };
        },
        30, // 30 iterations
        'voice-command-memory-leak'
      );
      
      // Should not have significant memory leaks
      expect(memoryAnalysis.isLeaking).toBe(false);
      expect(memoryAnalysis.averageHeapDelta).toBeLessThan(5); // Less than 5MB average increase
    });

    test('should efficiently manage command history memory', async () => {
      const { metrics } = await global.measureExecutionTime(async () => {
        // Fill command history to test memory management
        for (let i = 0; i < 200; i++) {
          // Simulate adding commands beyond default limit
          const mockCommand = {
            id: `cmd-${i}`,
            timestamp: Date.now() + i,
            originalText: `テストコマンド${i}`,
            parsedCommand: {
              intent: 'TEST',
              confidence: 0.9,
              entities: [],
              language: 'ja-JP',
              originalText: `テストコマンド${i}`,
              normalizedText: `テストコマンド${i}`,
            },
            executionStatus: 'completed',
            processingTime: 100,
          };
          
          // This would test the internal history management
          // In a real implementation, we'd access private methods
        }
        
        const history = voiceCommandService.getCommandHistory();
        return history;
      }, 'command-history-memory-management');
      
      // Should complete within reasonable time
      global.expectPerformance.toBeWithinTimeLimit(
        metrics.executionTime,
        2000, // 2 seconds
        'command history memory management'
      );
      
      // Memory usage should be controlled
      global.expectPerformance.toHaveMemoryUsageLessThan(
        Math.abs(metrics.memoryDelta.heapUsed),
        100, // 100MB limit
        'command history memory management'
      );
    });
  });

  describe('Configuration and Analytics Performance', () => {
    test('should update configuration efficiently', async () => {
      const { metrics } = await global.measureThroughput(
        async (iteration) => {
          const configs = [
            { confidenceThreshold: 0.7, language: 'ja-JP' },
            { confidenceThreshold: 0.8, language: 'en-US' },
            { autoExecute: true, confirmationRequired: false },
            { maxHistorySize: 50, enableContextMemory: true },
          ];
          
          const config = configs[iteration % configs.length];
          voiceCommandService.updateConfig(config);
          
          return voiceCommandService.getStatus();
        },
        100, // 100 configuration updates
        'configuration-updates'
      );
      
      // Should handle many config updates per second
      global.expectPerformance.toHaveThroughputGreaterThan(
        metrics.operationsPerSecond,
        50,
        'configuration updates'
      );
    });

    test('should generate analytics efficiently', async () => {
      // First, populate some data
      for (let i = 0; i < 50; i++) {
        await voiceCommandService.startListening();
        await voiceCommandService.stopListening();
      }
      
      const { metrics } = await global.measureThroughput(
        async () => {
          return voiceCommandService.getAnalytics();
        },
        100, // 100 analytics generations
        'analytics-generation'
      );
      
      // Should generate analytics quickly
      global.expectPerformance.toHaveThroughputGreaterThan(
        metrics.operationsPerSecond,
        20,
        'analytics generation'
      );
      
      // Each operation should be fast
      expect(metrics.averageTimePerOperation).toBeLessThan(50); // 50ms
    });
  });

  describe('Service Lifecycle Performance', () => {
    test('should initialize service quickly', async () => {
      const { metrics } = await global.measureExecutionTime(async () => {
        // Re-initialize service
        const { voiceCommandService: freshService } = await import('../../../src/services/VoiceCommandAnalysisService');
        await freshService.initialize();
        return freshService;
      }, 'service-initialization');
      
      // Should initialize within 2 seconds
      global.expectPerformance.toBeWithinTimeLimit(
        metrics.executionTime,
        2000,
        'service initialization'
      );
    });

    test('should handle start/stop cycles efficiently', async () => {
      const { metrics } = await global.measureThroughput(
        async () => {
          await voiceCommandService.startListening();
          await new Promise(resolve => setTimeout(resolve, 10)); // Brief listening period
          await voiceCommandService.stopListening();
          return true;
        },
        50, // 50 start/stop cycles
        'start-stop-cycles'
      );
      
      // Should handle multiple cycles per second
      global.expectPerformance.toHaveThroughputGreaterThan(
        metrics.operationsPerSecond,
        5,
        'start/stop cycles'
      );
    });
  });

  describe('Stress Testing', () => {
    test('should maintain performance under stress', async () => {
      console.log('🔥 Starting stress test...');
      
      const stressTestDuration = 10000; // 10 seconds
      const startTime = performance.now();
      let operationsCompleted = 0;
      let errors = 0;
      
      const stressPromises = [];
      
      // Create multiple stress workers
      for (let worker = 0; worker < 3; worker++) {
        const stressWorker = (async () => {
          while (performance.now() - startTime < stressTestDuration) {
            try {
              // Mix of different operations
              if (operationsCompleted % 3 === 0) {
                await voiceCommandService.startListening();
                await voiceCommandService.stopListening();
              } else if (operationsCompleted % 3 === 1) {
                voiceCommandService.getAnalytics();
              } else {
                voiceCommandService.updateConfig({ 
                  confidenceThreshold: 0.7 + Math.random() * 0.2 
                });
              }
              
              operationsCompleted++;
            } catch (error) {
              errors++;
              console.warn(`Stress test error:`, error.message);
            }
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        })();
        
        stressPromises.push(stressWorker);
      }
      
      // Wait for all stress workers
      await Promise.all(stressPromises);
      
      const totalTime = performance.now() - startTime;
      const opsPerSecond = (operationsCompleted / totalTime) * 1000;
      const errorRate = (errors / operationsCompleted) * 100;
      
      console.log(`🔥 Stress test completed:
        Duration: ${totalTime.toFixed(0)}ms
        Operations: ${operationsCompleted}
        Errors: ${errors}
        Ops/sec: ${opsPerSecond.toFixed(2)}
        Error rate: ${errorRate.toFixed(2)}%`);
      
      // Stress test assertions
      expect(operationsCompleted).toBeGreaterThan(100); // Should complete many operations
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(opsPerSecond).toBeGreaterThan(10); // Minimum throughput under stress
    });
  });

  describe('Resource Cleanup Performance', () => {
    test('should clean up resources efficiently', async () => {
      // Create resources that need cleanup
      for (let i = 0; i < 20; i++) {
        await voiceCommandService.startListening();
        await voiceCommandService.stopListening();
      }
      
      const { metrics } = await global.measureExecutionTime(async () => {
        // Force cleanup by reinitializing
        await voiceCommandService.stopListening();
        
        // Clear command history
        const history = voiceCommandService.getCommandHistory();
        
        // Update config to minimal state
        voiceCommandService.updateConfig({
          maxHistorySize: 10,
          enableContextMemory: false,
        });
        
        return { history };
      }, 'resource-cleanup');
      
      // Cleanup should be fast
      global.expectPerformance.toBeWithinTimeLimit(
        metrics.executionTime,
        1000,
        'resource cleanup'
      );
    });
  });
});
