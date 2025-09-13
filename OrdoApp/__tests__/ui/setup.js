/**
 * UI Test Setup
 * UIテストセットアップ
 */

import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock react-native-paper Provider
jest.mock('react-native-paper', () => {
  const React = require('react');
  const RealModule = jest.requireActual('react-native-paper');
  
  return {
    ...RealModule,
    Provider: ({ children, theme }) => React.createElement('View', { testID: 'paper-provider' }, children),
    Portal: ({ children }) => children,
    Modal: ({ children, visible, ...props }) => 
      visible ? React.createElement('View', { testID: 'modal', ...props }, children) : null,
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
    key: 'test-key',
    name: 'TestScreen',
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }) => children,
  createNavigationContainerRef: () => ({
    current: {
      navigate: jest.fn(),
      goBack: jest.fn(),
    },
  }),
}));

// Mock Bottom Tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock Stack Navigator
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
  TransitionPresets: {
    SlideFromRightIOS: {},
    ModalSlideFromBottomIOS: {},
  },
}));

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => 
      React.createElement('View', { testID: 'safe-area-view', ...props }, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// Mock Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  return ({ name, size, color, ...props }) => 
    React.createElement('Text', {
      testID: `icon-${name}`,
      ...props,
    }, `[${name}]`);
});

// Mock Animated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  
  return Reanimated;
});

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    Swipeable: ({ children, ...props }) => React.createElement(View, props, children),
    DrawerLayout: ({ children, ...props }) => React.createElement(View, props, children),
    State: {},
    ScrollView: ({ children, ...props }) => React.createElement(View, props, children),
    Slider: ({ children, ...props }) => React.createElement(View, props, children),
    Switch: ({ children, ...props }) => React.createElement(View, props, children),
    TextInput: ({ children, ...props }) => React.createElement(View, props, children),
    ToolbarAndroid: ({ children, ...props }) => React.createElement(View, props, children),
    ViewPagerAndroid: ({ children, ...props }) => React.createElement(View, props, children),
    WebView: ({ children, ...props }) => React.createElement(View, props, children),
    TapGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    PanGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    PinchGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    RotationGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    LongPressGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    ForceTouchGestureHandler: ({ children, ...props }) => React.createElement(View, props, children),
    FlatList: ({ children, ...props }) => React.createElement(View, props, children),
    gestureHandlerRootHOC: (component) => component,
    Directions: {},
  };
});

// Mock Image Picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn((options, callback) => {
    callback({
      didCancel: false,
      errorMessage: null,
      assets: [{
        uri: 'file://test-image.jpg',
        type: 'image/jpeg',
        fileName: 'test-image.jpg',
        fileSize: 1024,
        width: 100,
        height: 100,
      }],
    });
  }),
  launchCamera: jest.fn((options, callback) => {
    callback({
      didCancel: false,
      errorMessage: null,
      assets: [{
        uri: 'file://camera-image.jpg',
        type: 'image/jpeg',
        fileName: 'camera-image.jpg',
        fileSize: 2048,
        width: 200,
        height: 200,
      }],
    });
  }),
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
}));

// Mock Camera
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getAvailableCameraDevices: jest.fn(() => Promise.resolve([])),
    getCameraPermissionStatus: jest.fn(() => 'authorized'),
    requestCameraPermission: jest.fn(() => Promise.resolve('authorized')),
  },
  useCameraDevices: jest.fn(() => ({
    back: { id: 'back' },
    front: { id: 'front' },
  })),
  useFrameProcessor: jest.fn(),
}));

// Image mock
jest.mock('react-native/Libraries/Image/Image', () => {
  const React = require('react');
  return ({ source, ...props }) => 
    React.createElement('Image', {
      testID: 'mocked-image',
      source: typeof source === 'string' ? { uri: source } : source,
      ...props,
    });
});

// Mock AsyncStorage for UI tests
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Global test utilities for UI
global.renderWithProviders = (ui, { theme, navigationProps, ...renderOptions } = {}) => {
  const { render } = require('@testing-library/react-native');
  const React = require('react');
  const { Provider } = require('react-native-paper');
  const { NavigationContainer } = require('@react-navigation/native');
  
  const AllTheProviders = ({ children }) => {
    return React.createElement(
      Provider,
      { theme },
      React.createElement(NavigationContainer, navigationProps, children)
    );
  };
  
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Snapshot testing utilities
global.expectToMatchSnapshot = (component, name) => {
  expect(component).toMatchSnapshot(name);
};

global.expectToMatchInlineSnapshot = (component) => {
  expect(component).toMatchInlineSnapshot();
};

// Accessibility testing utilities
global.expectToBeAccessible = async (component) => {
  const { axe, toHaveNoViolations } = require('jest-axe');
  expect.extend(toHaveNoViolations);
  
  const results = await axe(component);
  expect(results).toHaveNoViolations();
};

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

console.log('🎨 UI Test Setup Complete');
