/**
 * Ordo App Context - グローバル状態管理
 * Context API を使用したアプリケーション全体の状態管理
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Product } from '../types';

// アクションタイプの定義
export type AppActionType =
  | 'LOAD_PRODUCTS_START'
  | 'LOAD_PRODUCTS_SUCCESS' 
  | 'LOAD_PRODUCTS_ERROR'
  | 'ADD_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'SET_SELECTED_PRODUCT'
  | 'CLEAR_SELECTED_PRODUCT'
  | 'SET_FILTER'
  | 'SET_SORT_ORDER'
  | 'TOGGLE_THEME'
  | 'SET_NOTIFICATION_SETTINGS';

// フィルタータイプ
export type ProductFilter = 'all' | 'fresh' | 'expiring' | 'expired';

// ソート順タイプ
export type SortOrder = 'name' | 'expiration' | 'category' | 'dateAdded';

// 通知設定
export interface NotificationSettings {
  enabled: boolean;
  daysBeforeExpiration: number;
  dailyReminder: boolean;
  reminderTime: string; // HH:MM format
}

// アプリケーション状態の型定義
export interface AppState {
  // Products
  products: Product[];
  selectedProduct: Product | null;
  isLoadingProducts: boolean;
  productsError: string | null;
  
  // UI State
  currentFilter: ProductFilter;
  currentSortOrder: SortOrder;
  isDarkMode: boolean;
  
  // Settings
  notificationSettings: NotificationSettings;
}

// アクションの型定義
export interface AppAction {
  type: AppActionType;
  payload?: any;
}

// 初期状態
const initialState: AppState = {
  // Products
  products: [],
  selectedProduct: null,
  isLoadingProducts: false,
  productsError: null,
  
  // UI State
  currentFilter: 'all',
  currentSortOrder: 'expiration',
  isDarkMode: false,
  
  // Settings
  notificationSettings: {
    enabled: true,
    daysBeforeExpiration: 3,
    dailyReminder: true,
    reminderTime: '09:00',
  },
};

// Reducer関数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_PRODUCTS_START':
      return {
        ...state,
        isLoadingProducts: true,
        productsError: null,
      };

    case 'LOAD_PRODUCTS_SUCCESS':
      return {
        ...state,
        products: action.payload,
        isLoadingProducts: false,
        productsError: null,
      };

    case 'LOAD_PRODUCTS_ERROR':
      return {
        ...state,
        isLoadingProducts: false,
        productsError: action.payload,
      };

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.payload],
      };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        ),
        selectedProduct: state.selectedProduct?.id === action.payload.id 
          ? action.payload 
          : state.selectedProduct,
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
        selectedProduct: state.selectedProduct?.id === action.payload 
          ? null 
          : state.selectedProduct,
      };

    case 'SET_SELECTED_PRODUCT':
      return {
        ...state,
        selectedProduct: action.payload,
      };

    case 'CLEAR_SELECTED_PRODUCT':
      return {
        ...state,
        selectedProduct: null,
      };

    case 'SET_FILTER':
      return {
        ...state,
        currentFilter: action.payload,
      };

    case 'SET_SORT_ORDER':
      return {
        ...state,
        currentSortOrder: action.payload,
      };

    case 'TOGGLE_THEME':
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };

    case 'SET_NOTIFICATION_SETTINGS':
      return {
        ...state,
        notificationSettings: { ...state.notificationSettings, ...action.payload },
      };

    default:
      return state;
  }
}

// Context型定義
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Product actions
  loadProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  selectProduct: (product: Product | null) => void;
  
  // UI actions
  setFilter: (filter: ProductFilter) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  toggleTheme: () => void;
  
  // Settings actions
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Computed values
  filteredProducts: Product[];
  expiringProductsCount: number;
}

// Context作成
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * App Context Provider - アプリケーション状態の提供
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Product actions
  const loadProducts = useCallback(async () => {
    dispatch({ type: 'LOAD_PRODUCTS_START' });
    try {
      // ここで実際のデータ読み込み処理を実装
      // 現在は StorageService から読み込み
      const { StorageService } = require('../services');
      const products = await StorageService.loadProducts();
      dispatch({ type: 'LOAD_PRODUCTS_SUCCESS', payload: products });
    } catch (error) {
      dispatch({ 
        type: 'LOAD_PRODUCTS_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  const addProduct = useCallback((product: Product) => {
    dispatch({ type: 'ADD_PRODUCT', payload: product });
    // 永続化処理
    const { StorageService } = require('../services');
    StorageService.saveProduct(product);
  }, []);

  const updateProduct = useCallback((product: Product) => {
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });
    // 永続化処理
    const { StorageService } = require('../services');
    StorageService.updateProduct(product);
  }, []);

  const deleteProduct = useCallback((productId: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: productId });
    // 永続化処理
    const { StorageService } = require('../services');
    StorageService.deleteProduct(productId);
  }, []);

  const selectProduct = useCallback((product: Product | null) => {
    if (product) {
      dispatch({ type: 'SET_SELECTED_PRODUCT', payload: product });
    } else {
      dispatch({ type: 'CLEAR_SELECTED_PRODUCT' });
    }
  }, []);

  // UI actions
  const setFilter = useCallback((filter: ProductFilter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    dispatch({ type: 'SET_SORT_ORDER', payload: sortOrder });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  // Settings actions
  const updateNotificationSettings = useCallback((settings: Partial<NotificationSettings>) => {
    dispatch({ type: 'SET_NOTIFICATION_SETTINGS', payload: settings });
  }, []);

  // Computed values
  const filteredProducts = React.useMemo(() => {
    const { ProductUtils } = require('../utils');
    let filtered = [...state.products];

    // フィルター適用
    switch (state.currentFilter) {
      case 'fresh':
        filtered = ProductUtils.filterByFreshness(filtered, 'fresh');
        break;
      case 'expiring':
        filtered = ProductUtils.getExpiringProducts(filtered, state.notificationSettings.daysBeforeExpiration);
        break;
      case 'expired':
        filtered = ProductUtils.filterByFreshness(filtered, 'expired');
        break;
      default:
        // 'all' - フィルターなし
        break;
    }

    // ソート適用
    switch (state.currentSortOrder) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        break;
      case 'expiration':
        filtered = ProductUtils.sortByExpiration(filtered);
        break;
      case 'category':
        filtered.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ja'));
        break;
      case 'dateAdded':
        filtered.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
        break;
      default:
        break;
    }

    return filtered;
  }, [state.products, state.currentFilter, state.currentSortOrder, state.notificationSettings.daysBeforeExpiration]);

  const expiringProductsCount = React.useMemo(() => {
    const { ProductUtils } = require('../utils');
    return ProductUtils.getExpiringProducts(state.products, state.notificationSettings.daysBeforeExpiration).length;
  }, [state.products, state.notificationSettings.daysBeforeExpiration]);

  const contextValue: AppContextType = {
    state,
    dispatch,
    
    // Actions
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    selectProduct,
    setFilter,
    setSortOrder,
    toggleTheme,
    updateNotificationSettings,
    
    // Computed values
    filteredProducts,
    expiringProductsCount,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * App Context Hook - Contextの使用
 */
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// 個別フックの提供（オプション）
export const useProducts = () => {
  const { state, loadProducts, addProduct, updateProduct, deleteProduct } = useAppContext();
  return {
    products: state.products,
    isLoading: state.isLoadingProducts,
    error: state.productsError,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
};

export const useProductSelection = () => {
  const { state, selectProduct } = useAppContext();
  return {
    selectedProduct: state.selectedProduct,
    selectProduct,
  };
};

export const useFilters = () => {
  const { state, setFilter, setSortOrder, filteredProducts } = useAppContext();
  return {
    currentFilter: state.currentFilter,
    currentSortOrder: state.currentSortOrder,
    filteredProducts,
    setFilter,
    setSortOrder,
  };
};

export const useTheme = () => {
  const { state, toggleTheme } = useAppContext();
  return {
    isDarkMode: state.isDarkMode,
    toggleTheme,
  };
};

export default AppContext;
