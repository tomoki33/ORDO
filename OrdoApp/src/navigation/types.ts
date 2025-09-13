import { NavigatorScreenParams } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ProductData } from '../services/ProductAutoFillService';

// ====================
// Navigation Types
// ====================

/**
 * Bottom Tab Navigator のパラメータ型定義
 */
export type BottomTabParamList = {
  Home: undefined;
  Camera: undefined;
  Analytics: undefined;
  Settings: undefined;
};

/**
 * Stack Navigator のパラメータ型定義
 */
export type StackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  ProductDetail: {
    productId: string;
  };
  AddProduct: {
    initialData?: {
      name?: string;
      category?: string;
      imageUri?: string;
    };
  };
  EditProduct: {
    productId: string;
  };
  CameraCapture: undefined;
  ProductList: {
    category?: string;
    filter?: 'all' | 'expiring' | 'fresh';
  };
  RecognitionResult: {
    result: any;
  };
  BarcodeScanner: undefined;
  ProductAutoFillForm: {
    productData?: ProductData;
    isFromScan?: boolean;
  };
  ReceiptScanner: undefined;
};

/**
 * Screen Navigation Props Types
 */
export type HomeScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Home'>;
export type CameraScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Camera'>;
export type AnalyticsScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Analytics'>;
export type SettingsScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Settings'>;

export type ProductDetailScreenNavigationProp = StackNavigationProp<StackParamList, 'ProductDetail'>;
export type AddProductScreenNavigationProp = StackNavigationProp<StackParamList, 'AddProduct'>;
export type EditProductScreenNavigationProp = StackNavigationProp<StackParamList, 'EditProduct'>;
export type BarcodeScannerScreenNavigationProp = StackNavigationProp<StackParamList, 'BarcodeScanner'>;
export type ProductAutoFillFormNavigationProp = StackNavigationProp<StackParamList, 'ProductAutoFillForm'>;
export type ReceiptScannerScreenNavigationProp = StackNavigationProp<StackParamList, 'ReceiptScanner'>;

/**
 * Combined Navigation Props for screens that need both tab and stack navigation
 */
export type CombinedNavigationProps = {
  tabNavigation: BottomTabNavigationProp<BottomTabParamList>;
  stackNavigation: StackNavigationProp<StackParamList>;
};

// ====================
// Route Types
// ====================

export type BottomTabRouteProp<T extends keyof BottomTabParamList> = {
  key: string;
  name: T;
  params?: BottomTabParamList[T];
};

export type StackRouteProp<T extends keyof StackParamList> = {
  key: string;
  name: T;
  params?: StackParamList[T];
};

// ====================
// Navigation Helper Types
// ====================

/**
 * Navigation actions available throughout the app
 */
export type NavigationActions = {
  goToHome: () => void;
  goToCamera: () => void;
  goToAnalytics: () => void;
  goToSettings: () => void;
  goToProductDetail: (productId: string) => void;
  goToAddProduct: (initialData?: StackParamList['AddProduct']['initialData']) => void;
  goToEditProduct: (productId: string) => void;
  goToCameraCapture: () => void;
  goToProductList: (options?: StackParamList['ProductList']) => void;
  goToBarcodeScanner: () => void;
  goToProductAutoFillForm: (productData?: ProductData, isFromScan?: boolean) => void;
  goToReceiptScanner: () => void;
  goBack: () => void;
  canGoBack: () => boolean;
};

/**
 * Tab bar icon names - for react-native-vector-icons
 */
export type TabIconName = {
  Home: 'home';
  Camera: 'camera';
  Analytics: 'analytics';
  Settings: 'settings';
};

/**
 * Screen titles for headers
 */
export type ScreenTitles = {
  Home: 'ホーム';
  Camera: 'カメラ';
  Analytics: '分析';
  Settings: '設定';
  ProductDetail: '商品詳細';
  AddProduct: '商品追加';
  EditProduct: '商品編集';
  CameraCapture: '撮影';
  ProductList: '商品一覧';
  BarcodeScanner: 'バーコードスキャン';
  ProductAutoFillForm: '商品情報入力';
  ReceiptScanner: 'レシートスキャン';
};

// ====================
// Deep Linking Types  
// ====================

/**
 * Deep link URL patterns
 */
export type DeepLinkURLs = {
  home: 'ordo://home';
  camera: 'ordo://camera';
  analytics: 'ordo://analytics';
  settings: 'ordo://settings';
  product: 'ordo://product/:productId';
  addProduct: 'ordo://add-product';
};

// ====================
// Global Type Declaration
// ====================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends StackParamList {}
  }
}
