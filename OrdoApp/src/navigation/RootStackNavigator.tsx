import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';

// Navigation
import BottomTabNavigator from './BottomTabNavigator';

// Types
import { StackParamList } from './types';

// Constants
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

const Stack = createStackNavigator<StackParamList>();

/**
 * Root Stack Navigator
 * アプリ全体のナビゲーション構造を管理
 */
const RootStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
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
        cardStyle: { backgroundColor: COLORS.BACKGROUND },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {/* Main Tab Navigator */}
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />

      {/* Modal-style screens */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="ProductDetail"
          component={PlaceholderScreen}
          options={() => ({
            title: '商品詳細',
            headerTitle: '商品詳細',
          })}
        />

        <Stack.Screen
          name="AddProduct"
          component={PlaceholderScreen}
          options={{
            title: '商品追加',
            headerTitle: '商品を追加',
          }}
        />

        <Stack.Screen
          name="EditProduct"
          component={PlaceholderScreen}
          options={{
            title: '商品編集',
            headerTitle: '商品を編集',
          }}
        />

        <Stack.Screen
          name="CameraCapture"
          component={PlaceholderScreen}
          options={{
            title: '撮影',
            headerTitle: '商品を撮影',
          }}
        />

        <Stack.Screen
          name="ProductList"
          component={PlaceholderScreen}
          options={({ route }) => ({
            title: '商品一覧',
            headerTitle: route.params?.category ? `${route.params.category}の商品` : '商品一覧',
          })}
        />

        <Stack.Screen
          name="BarcodeScanner"
          component={(props: any) => {
            const BarcodeScannerScreen = require('../screens/BarcodeScannerScreen').default;
            return <BarcodeScannerScreen {...props} />;
          }}
          options={{
            title: 'バーコードスキャン',
            headerTitle: 'バーコードスキャン',
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="ProductAutoFillForm"
          component={(props: any) => {
            const ProductAutoFillForm = require('../components/ProductAutoFillForm').default;
            return <ProductAutoFillForm {...props} />;
          }}
          options={{
            title: '商品情報入力',
            headerTitle: '商品情報入力',
            headerShown: false,
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

/**
 * Placeholder Component for screens under development
 */
const PlaceholderScreen: React.FC = () => {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>🚧 開発中</Text>
      <Text style={styles.placeholderText}>
        このスクリーンは現在開発中です。{'\n'}
        近日中に実装予定です。
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.LG,
  },
  placeholderTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_XLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default RootStackNavigator;
