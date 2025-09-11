import 'react-native-gesture-handler/jestSetup';

// Note: @testing-library/jest-native is deprecated, using built-in matchers from @testing-library/react-native
// Mock react-native modules that don't work in test environment
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => require('react-native-gesture-handler/jestSetup'));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
    key: 'test',
    name: 'test',
  }),
  useFocusEffect: (fn) => fn(),
  NavigationContainer: ({ children }) => children,
  createNavigationContainerRef: () => ({
    current: {
      navigate: jest.fn(),
      dispatch: jest.fn(),
    },
  }),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  openSettings: jest.fn(() => Promise.resolve()),
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      NOTIFICATIONS: 'ios.permission.NOTIFICATIONS',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, ScrollView } = require('react-native');
  
  return {
    Provider: ({ children }) => React.createElement(View, {}, children),
    DefaultTheme: {},
    Card: ({ children, ...props }) => React.createElement(View, props, children),
    Title: ({ children, ...props }) => React.createElement(Text, props, children),
    Paragraph: ({ children, ...props }) => React.createElement(Text, props, children),
    Button: ({ children, onPress, ...props }) => 
      React.createElement(TouchableOpacity, { onPress, ...props }, 
        React.createElement(Text, {}, children)
      ),
    FAB: ({ onPress, ...props }) => 
      React.createElement(TouchableOpacity, { onPress, ...props }),
    Chip: ({ children, ...props }) => React.createElement(View, props, 
      React.createElement(Text, {}, children)
    ),
    Surface: ({ children, ...props }) => React.createElement(View, props, children),
    List: {
      Item: ({ title, description, onPress, ...props }) =>
        React.createElement(TouchableOpacity, { onPress, ...props },
          React.createElement(Text, {}, title),
          description && React.createElement(Text, {}, description)
        ),
      Section: ({ children, ...props }) => React.createElement(View, props, children),
      Subheader: ({ children, ...props }) => React.createElement(Text, props, children),
    },
    Searchbar: ({ onChangeText, value, ...props }) =>
      React.createElement('TextInput', { onChangeText, value, ...props }),
    Modal: ({ visible, children, onDismiss, ...props }) =>
      visible ? React.createElement(View, { ...props }, children) : null,
    Portal: ({ children }) => children,
    IconButton: ({ onPress, ...props }) =>
      React.createElement(TouchableOpacity, { onPress, ...props }),
    ProgressBar: ({ progress, ...props }) =>
      React.createElement(View, { ...props }),
    Snackbar: ({ visible, children, onDismiss, ...props }) =>
      visible ? React.createElement(View, { ...props }, 
        React.createElement(Text, {}, children)
      ) : null,
  };
});

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: (platforms) => platforms.ios || platforms.default,
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Global test utilities
global.flushPromises = () => new Promise(setImmediate);

// Silence console logs during tests unless explicitly needed
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || 
     args[0].includes('React does not recognize') ||
     args[0].includes('validateDOMNesting'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
     args[0].includes('React Native Paper'))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};

// Setup test timeout
jest.setTimeout(10000);
