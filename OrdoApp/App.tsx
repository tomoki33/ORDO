/**
 * Ordo - AI-powered Home Management App
 * Main Application Entry Point
 * 
 * @format
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation
import { AppNavigator } from './src/navigation';

/**
 * Main App Component
 * React Navigationによる本格的なアプリナビゲーションを実装
 */
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
