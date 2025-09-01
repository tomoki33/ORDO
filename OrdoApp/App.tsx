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

/**
 * Main App Component
 * スプラッシュ画面とReact Navigationを統合
 */
function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);

  // アプリの初期化処理
  useEffect(() => {
    // 将来的にここで以下の処理を行う:
    // - 認証状態の確認
    // - ローカルデータの読み込み
    // - 設定の初期化
    console.log('🚀 Ordo App is initializing...');
  }, []);

  const handleSplashComplete = () => {
    setIsLoading(false);
    console.log('✨ Splash screen animation completed');
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
