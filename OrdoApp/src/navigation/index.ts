/**
 * Ordo App - Navigation Configuration
 * React Navigation setup and type-safe navigation helpers
 * 
 * Note: This requires @react-navigation/native to be installed
 * Run: npm install @react-navigation/native @react-navigation/stack
 */

// TODO: Install React Navigation dependencies
// import { NavigationProp, RouteProp } from '@react-navigation/native';

// Root Stack parameter list
export type RootStackParamList = {
  Home: undefined;
  ProductList: undefined;
  AddProduct: { imageUri?: string };
  ProductDetail: { productId: string };
  Camera: undefined;
  AIRecognition: { imageUri: string };
  Settings: undefined;
  Onboarding: undefined;
};

// Navigation prop type for type-safe navigation (placeholder)
export type NavigationProps<T extends keyof RootStackParamList> = {
  navigation: any; // Will be NavigationProp<RootStackParamList, T> when installed
  route: any; // Will be RouteProp<RootStackParamList, T> when installed
};

// Screen names as constants
export const SCREEN_NAMES = {
  HOME: 'Home' as const,
  PRODUCT_LIST: 'ProductList' as const,
  ADD_PRODUCT: 'AddProduct' as const,
  PRODUCT_DETAIL: 'ProductDetail' as const,
  CAMERA: 'Camera' as const,
  AI_RECOGNITION: 'AIRecognition' as const,
  SETTINGS: 'Settings' as const,
  ONBOARDING: 'Onboarding' as const,
};

// Tab navigator parameter list (if using bottom tabs)
export type TabParamList = {
  HomeTab: undefined;
  ProductsTab: undefined;
  CameraTab: undefined;
  SettingsTab: undefined;
};

// Tab names as constants
export const TAB_NAMES = {
  HOME_TAB: 'HomeTab' as const,
  PRODUCTS_TAB: 'ProductsTab' as const,
  CAMERA_TAB: 'CameraTab' as const,
  SETTINGS_TAB: 'SettingsTab' as const,
};

// Navigation helper functions (will be updated when React Navigation is installed)
export class NavigationHelper {
  /**
   * Type-safe navigation to ProductDetail screen
   */
  static navigateToProductDetail(
    navigation: any, // NavigationProp<RootStackParamList>
    productId: string
  ) {
    navigation.navigate(SCREEN_NAMES.PRODUCT_DETAIL, { productId });
  }

  /**
   * Type-safe navigation to AddProduct screen
   */
  static navigateToAddProduct(
    navigation: any, // NavigationProp<RootStackParamList>
    imageUri?: string
  ) {
    navigation.navigate(SCREEN_NAMES.ADD_PRODUCT, { imageUri });
  }

  /**
   * Type-safe navigation to AIRecognition screen
   */
  static navigateToAIRecognition(
    navigation: any, // NavigationProp<RootStackParamList>
    imageUri: string
  ) {
    navigation.navigate(SCREEN_NAMES.AI_RECOGNITION, { imageUri });
  }

  /**
   * Go back if possible, otherwise navigate to Home
   */
  static goBackOrHome(navigation: any) { // NavigationProp<RootStackParamList>
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(SCREEN_NAMES.HOME);
    }
  }

  /**
   * Reset navigation stack to Home
   */
  static resetToHome(navigation: any) { // NavigationProp<RootStackParamList>
    navigation.reset({
      index: 0,
      routes: [{ name: SCREEN_NAMES.HOME }],
    });
  }

  /**
   * Reset navigation stack to Onboarding (for first-time users)
   */
  static resetToOnboarding(navigation: any) { // NavigationProp<RootStackParamList>
    navigation.reset({
      index: 0,
      routes: [{ name: SCREEN_NAMES.ONBOARDING }],
    });
  }
}

// Screen options configurations
export const SCREEN_OPTIONS = {
  // Default header style
  defaultHeader: {
    headerStyle: {
      backgroundColor: '#4A90E2',
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: '600',
    },
  },

  // No header
  noHeader: {
    headerShown: false,
  },

  // Modal presentation (iOS)
  modal: {
    presentation: 'modal' as const,
    headerStyle: {
      backgroundColor: '#4A90E2',
    },
    headerTintColor: '#FFFFFF',
  },

  // Camera specific options
  camera: {
    headerShown: false,
    orientation: 'portrait' as const,
  },
} as const;

// Tab bar options
export const TAB_OPTIONS = {
  // Default tab bar style
  defaultTabBar: {
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopColor: '#E5E5E7',
      borderTopWidth: 1,
      paddingBottom: 5,
      height: 60,
    },
    tabBarActiveTintColor: '#4A90E2',
    tabBarInactiveTintColor: '#999999',
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500',
    },
  },

  // Hide tab bar
  hideTabBar: {
    tabBarStyle: { display: 'none' },
  },
} as const;

// Deep linking configuration
export const LINKING_CONFIG = {
  prefixes: ['ordo://'],
  config: {
    screens: {
      [SCREEN_NAMES.HOME]: '',
      [SCREEN_NAMES.PRODUCT_LIST]: 'products',
      [SCREEN_NAMES.PRODUCT_DETAIL]: 'product/:productId',
      [SCREEN_NAMES.ADD_PRODUCT]: 'add-product',
      [SCREEN_NAMES.CAMERA]: 'camera',
      [SCREEN_NAMES.AI_RECOGNITION]: 'ai-recognition',
      [SCREEN_NAMES.SETTINGS]: 'settings',
      [SCREEN_NAMES.ONBOARDING]: 'onboarding',
    },
  },
};
