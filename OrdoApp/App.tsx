/**
 * Ordo - AI-powered Home Management App
 * Main Application Entry Point
 * 
 * @format
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation
import { AppNavigator } from './src/navigation';

// Branding Components
import { SplashScreen } from './src/components/branding/SplashScreen';

// Performance Optimization Services
import { startupOptimizer } from './src/services/StartupOptimizationService';
import { performanceMonitor } from './src/services/PerformanceMonitorService';
import { memoryOptimizer } from './src/services/MemoryOptimizationService';
import { backgroundProcessor } from './src/services/BackgroundProcessingOptimizationService';

// Voice Recognition Services
import { voiceRecognitionService } from './src/services/VoiceRecognitionService';
import { voiceCommandService } from './src/services/VoiceCommandAnalysisService';
import { multilingualService } from './src/services/MultilingualExtensionService';

/**
 * Main App Component
 * スプラッシュ画面とReact Navigationを統合
 * パフォーマンス最適化機能を統合
 */
function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);

  // アプリの初期化処理（パフォーマンス最適化付き）
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Ordo App is initializing with performance optimization...');
        
        // パフォーマンス最適化開始
        startupOptimizer.startOptimization();
        
        // 将来的にここで以下の処理を行う:
        // - 認証状態の確認
        // - ローカルデータの読み込み
        // - 設定の初期化
        
        // クリティカルなサービスの初期化（遅延読み込み）
        await Promise.all([
          startupOptimizer.ensureModuleLoaded('PerformanceMonitor'),
          startupOptimizer.ensureModuleLoaded('MemoryOptimizer'),
          startupOptimizer.ensureModuleLoaded('VoiceRecognition'),
          startupOptimizer.ensureModuleLoaded('MultilingualSupport'),
        ]);
        
        // 音声認識サービスの初期化
        try {
          await multilingualService.initialize();
          await voiceCommandService.initialize();
          console.log('🎙️ Voice recognition services initialized');
        } catch (error) {
          console.warn('⚠️ Voice recognition initialization failed (optional):', error);
        }
        
        // バックグラウンドタスクの登録
        backgroundProcessor.registerTask({
          name: 'App Health Check',
          priority: 'high',
          executor: async () => {
            const performanceScore = performanceMonitor.calculatePerformanceScore();
            if (performanceScore < 60) {
              console.warn('� Poor app performance detected, running cleanup');
              memoryOptimizer.cleanup();
            }
          },
          interval: 60 * 1000, // 1分ごと
          maxExecutionTime: 5000, // 5秒
        });
        
        console.log('✅ App initialization completed with performance optimization');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setIsLoading(false);
    console.log('✨ Splash screen animation completed');
    
    // 起動完了をパフォーマンス監視に通知
    const startupMetrics = startupOptimizer.getStartupMetrics();
    console.log('📊 Startup completed:', {
      totalTime: startupMetrics.totalStartupTime,
      score: startupOptimizer.calculateStartupScore(),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SplashScreen onAnimationComplete={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
