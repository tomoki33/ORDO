import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Platform } from 'react-native';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { PerformanceDashboardScreen } from '../screens/PerformanceDashboardScreen';

// Types
import { BottomTabParamList, TabIconName } from './types';

// Constants
import { COLORS, TYPOGRAPHY } from '../constants';

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * タブアイコンの設定
 */
const tabIcons: TabIconName = {
  Home: 'home',
  Camera: 'camera',
  Analytics: 'analytics',
  Performance: 'speed',
  Settings: 'settings',
};

/**
 * タブアイコンを取得する関数
 */
const getTabIcon = (
  routeName: keyof BottomTabParamList,
  focused: boolean,
  color: string,
  size: number
) => {
  const iconName = tabIcons[routeName];
  return <Icon name={iconName} size={size} color={color} />;
};

/**
 * Bottom Tab Navigator Component
 * メインアプリのタブナビゲーション
 */
const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        // タブアイコンの設定
        tabBarIcon: ({ focused, color, size }) => 
          getTabIcon(route.name, focused, color, size),
        
        // タブバーのスタイル設定
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.WHITE,
          borderTopColor: COLORS.BORDER,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        
        // タブラベルのスタイル
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
          fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
          marginTop: 4,
        },
        
        // ヘッダーの設定
        headerStyle: {
          backgroundColor: COLORS.WHITE,
          shadowColor: COLORS.SHADOW,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        },
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
          fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
          color: COLORS.TEXT_PRIMARY,
        },
        headerTintColor: COLORS.PRIMARY,
      })}
    >
      {/* ホーム画面 */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'ホーム',
          headerTitle: 'Ordo',
        }}
      />

      {/* カメラ画面 */}
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          title: 'カメラ',
          headerTitle: '商品撮影',
        }}
      />

      {/* 分析画面 */}
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: '分析',
          headerTitle: '分析レポート',
        }}
      />

      {/* パフォーマンス監視画面 */}
      <Tab.Screen
        name="Performance"
        component={PerformanceDashboardScreen}
        options={{
          title: 'パフォーマンス',
          headerTitle: 'パフォーマンス監視',
          headerShown: false, // 画面内でカスタムヘッダーを使用
        }}
      />

      {/* 設定画面 */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          headerTitle: '設定',
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
