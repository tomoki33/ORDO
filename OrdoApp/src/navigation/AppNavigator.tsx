import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';

// Navigation
import RootStackNavigator from './RootStackNavigator';

// Constants
import { COLORS } from '../constants';

/**
 * Navigation Container - アプリ全体のナビゲーション管理
 * React Navigationの最上位コンポーネント
 */
const AppNavigator: React.FC = () => {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.WHITE}
        translucent={false}
      />
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
    </>
  );
};

export default AppNavigator;
