import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

// Navigation
import RootStackNavigator from './RootStackNavigator';

// Theme
import { OrdoLightTheme, OrdoDarkTheme } from '../theme/paperTheme';

// Context
import { AppProvider, useTheme as useAppTheme } from '../context/AppContext';

/**
 * App Navigator Content - Context内でのナビゲーション管理
 */
const AppNavigatorContent: React.FC = () => {
  const systemColorScheme = useColorScheme();
  const { isDarkMode } = useAppTheme();
  
  // システムのカラースキームかアプリ設定のダークモードを使用
  const shouldUseDarkTheme = isDarkMode || systemColorScheme === 'dark';
  const theme = shouldUseDarkTheme ? OrdoDarkTheme : OrdoLightTheme;

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={shouldUseDarkTheme ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
        translucent={false}
      />
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
};

/**
 * Navigation Container - アプリ全体のナビゲーション管理
 * React NavigationとReact Native Paperの統合 + Context Provider
 */
const AppNavigator: React.FC = () => {
  return (
    <AppProvider>
      <AppNavigatorContent />
    </AppProvider>
  );
};

export default AppNavigator;
