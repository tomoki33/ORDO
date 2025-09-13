/**
 * Performance Test Setup
 * パフォーマンステストセットアップ
 */

// High-resolution timer polyfill
if (!global.performance) {
  global.performance = {
    now: () => {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    },
    mark: (name) => {
      if (!global.performanceMarks) {
        global.performanceMarks = new Map();
      }
      global.performanceMarks.set(name, performance.now());
    },
    measure: (name, startMark, endMark) => {
      if (!global.performanceMarks) {
        return 0;
      }
      const start = global.performanceMarks.get(startMark) || 0;
      const end = global.performanceMarks.get(endMark) || performance.now();
      return end - start;
    },
    getEntriesByName: (name) => {
      return [{
        name,
        startTime: global.performanceMarks?.get(name) || 0,
        duration: 0,
      }];
    },
    getEntriesByType: () => [],
  };
}

// Memory usage tracking
global.getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024, // MB
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      external: usage.external / 1024 / 1024, // MB
    };
  }
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
  };
};

// CPU usage tracking (simplified)
global.getCPUUsage = () => {
  if (typeof process !== 'undefined' && process.cpuUsage) {
    const usage = process.cpuUsage();
    return {
      user: usage.user / 1000, // microseconds to milliseconds
      system: usage.system / 1000, // microseconds to milliseconds
    };
  }
  return {
    user: 0,
    system: 0,
  };
};

// Performance measurement utilities
global.measureExecutionTime = async (fn, name = 'operation') => {
  const startTime = performance.now();
  const startMemory = global.getMemoryUsage();
  const startCPU = global.getCPUUsage();
  
  let result;
  try {
    result = await fn();
  } catch (error) {
    console.error(`Performance test failed for ${name}:`, error);
    throw error;
  }
  
  const endTime = performance.now();
  const endMemory = global.getMemoryUsage();
  const endCPU = global.getCPUUsage();
  
  const metrics = {
    executionTime: endTime - startTime,
    memoryDelta: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
    },
    cpuDelta: {
      user: endCPU.user - startCPU.user,
      system: endCPU.system - startCPU.system,
    },
  };
  
  console.log(`📊 Performance metrics for ${name}:`, metrics);
  
  return {
    result,
    metrics,
  };
};

// Throughput measurement
global.measureThroughput = async (operation, iterations = 100, name = 'throughput') => {
  const startTime = performance.now();
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = performance.now();
    try {
      const result = await operation(i);
      results.push(result);
    } catch (error) {
      console.error(`Iteration ${i} failed:`, error);
      results.push(null);
    }
    const iterationEnd = performance.now();
    
    // Log progress every 25%
    if ((i + 1) % Math.ceil(iterations / 4) === 0) {
      const progress = ((i + 1) / iterations * 100).toFixed(1);
      const avgTime = (iterationEnd - startTime) / (i + 1);
      console.log(`🔄 ${name} progress: ${progress}% (avg: ${avgTime.toFixed(2)}ms/op)`);
    }
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const successfulOperations = results.filter(r => r !== null).length;
  
  const throughputMetrics = {
    totalTime,
    iterations,
    successfulOperations,
    failedOperations: iterations - successfulOperations,
    operationsPerSecond: (successfulOperations / totalTime) * 1000,
    averageTimePerOperation: totalTime / iterations,
    successRate: (successfulOperations / iterations) * 100,
  };
  
  console.log(`📈 Throughput metrics for ${name}:`, throughputMetrics);
  
  return {
    results,
    metrics: throughputMetrics,
  };
};

// Load testing utility
global.measureLoadPerformance = async (operation, concurrency = 10, duration = 5000, name = 'load') => {
  const startTime = performance.now();
  const endTime = startTime + duration;
  const workers = [];
  const results = [];
  
  console.log(`🏋️ Starting load test: ${concurrency} concurrent operations for ${duration}ms`);
  
  // Create concurrent workers
  for (let i = 0; i < concurrency; i++) {
    const worker = (async () => {
      const workerResults = [];
      let operationCount = 0;
      
      while (performance.now() < endTime) {
        const opStart = performance.now();
        try {
          const result = await operation(i, operationCount);
          workerResults.push({
            success: true,
            result,
            duration: performance.now() - opStart,
          });
        } catch (error) {
          workerResults.push({
            success: false,
            error: error.message,
            duration: performance.now() - opStart,
          });
        }
        operationCount++;
      }
      
      return workerResults;
    })();
    
    workers.push(worker);
  }
  
  // Wait for all workers to complete
  const workerResults = await Promise.all(workers);
  
  // Flatten results
  workerResults.forEach(workerResult => {
    results.push(...workerResult);
  });
  
  const totalDuration = performance.now() - startTime;
  const successfulOps = results.filter(r => r.success).length;
  const failedOps = results.filter(r => !r.success).length;
  const durations = results.map(r => r.duration);
  
  const loadMetrics = {
    totalDuration,
    concurrency,
    totalOperations: results.length,
    successfulOperations: successfulOps,
    failedOperations: failedOps,
    operationsPerSecond: (results.length / totalDuration) * 1000,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    successRate: (successfulOps / results.length) * 100,
  };
  
  console.log(`⚡ Load test metrics for ${name}:`, loadMetrics);
  
  return {
    results,
    metrics: loadMetrics,
  };
};

// Memory leak detection
global.detectMemoryLeaks = async (operation, iterations = 50, name = 'memory-leak') => {
  const memoryReadings = [];
  
  console.log(`🔍 Detecting memory leaks for ${name} over ${iterations} iterations`);
  
  for (let i = 0; i < iterations; i++) {
    const memBefore = global.getMemoryUsage();
    
    await operation(i);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memAfter = global.getMemoryUsage();
    
    memoryReadings.push({
      iteration: i,
      before: memBefore,
      after: memAfter,
      delta: {
        rss: memAfter.rss - memBefore.rss,
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      },
    });
    
    // Log progress
    if ((i + 1) % 10 === 0) {
      console.log(`🔄 Memory leak detection progress: ${i + 1}/${iterations}`);
    }
  }
  
  // Analyze for memory leaks
  const heapUsedDeltas = memoryReadings.map(r => r.delta.heapUsed);
  const averageDelta = heapUsedDeltas.reduce((a, b) => a + b, 0) / heapUsedDeltas.length;
  const positiveDeltas = heapUsedDeltas.filter(d => d > 0).length;
  const leakPercentage = (positiveDeltas / iterations) * 100;
  
  const memoryLeakAnalysis = {
    iterations,
    averageHeapDelta: averageDelta,
    positiveDeltas,
    leakPercentage,
    isLeaking: averageDelta > 1, // More than 1MB average increase
    readings: memoryReadings,
  };
  
  console.log(`🧠 Memory leak analysis for ${name}:`, {
    averageHeapDelta: memoryLeakAnalysis.averageHeapDelta.toFixed(2) + 'MB',
    leakPercentage: memoryLeakAnalysis.leakPercentage.toFixed(1) + '%',
    isLeaking: memoryLeakAnalysis.isLeaking,
  });
  
  return memoryLeakAnalysis;
};

// Performance assertion helpers
global.expectPerformance = {
  toBeWithinTimeLimit: (actualTime, maxTime, operation = 'operation') => {
    if (actualTime > maxTime) {
      throw new Error(`${operation} took ${actualTime}ms, expected <= ${maxTime}ms`);
    }
    console.log(`✅ Performance check passed: ${operation} completed in ${actualTime}ms (limit: ${maxTime}ms)`);
  },
  
  toHaveMemoryUsageLessThan: (memoryUsage, maxMemory, operation = 'operation') => {
    if (memoryUsage > maxMemory) {
      throw new Error(`${operation} used ${memoryUsage}MB memory, expected <= ${maxMemory}MB`);
    }
    console.log(`✅ Memory check passed: ${operation} used ${memoryUsage}MB (limit: ${maxMemory}MB)`);
  },
  
  toHaveThroughputGreaterThan: (actualThroughput, minThroughput, operation = 'operation') => {
    if (actualThroughput < minThroughput) {
      throw new Error(`${operation} throughput was ${actualThroughput} ops/sec, expected >= ${minThroughput} ops/sec`);
    }
    console.log(`✅ Throughput check passed: ${operation} achieved ${actualThroughput} ops/sec (minimum: ${minThroughput} ops/sec)`);
  },
};

// Mock React Native performance APIs
global.requestAnimationFrame = global.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = global.cancelAnimationFrame || clearTimeout;

// Mock InteractionManager
if (!global.InteractionManager) {
  global.InteractionManager = {
    runAfterInteractions: (callback) => {
      return Promise.resolve().then(callback);
    },
    createInteractionHandle: () => Math.random(),
    clearInteractionHandle: () => {},
  };
}

console.log('⚡ Performance Test Setup Complete');
