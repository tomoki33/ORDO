import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockTheme, mockNavigationProps } from '../fixtures/onboardingData';

// Enhanced render function for React Native components with all providers
export const renderWithProviders = (component, options = {}) => {
  const {
    theme = mockTheme,
    navigationProps = mockNavigationProps,
    ...renderOptions
  } = options;

  const AllTheProviders = ({ children }) => (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </PaperProvider>
  );

  const ComponentWithProps = React.cloneElement(component, navigationProps);

  return render(ComponentWithProps, {
    wrapper: AllTheProviders,
    ...renderOptions,
  });
};

// Enhanced render for screens that need navigation props
export const renderScreen = (Screen, props = {}) => {
  const defaultProps = {
    ...mockNavigationProps,
    ...props,
  };

  return renderWithProviders(<Screen {...defaultProps} />);
};

// Helper to wait for async operations to complete
export const waitForAsync = async (callback, timeout = 5000) => {
  await act(async () => {
    await waitFor(callback, { timeout });
  });
};

// Helper to flush all promises
export const flushPromises = () => 
  new Promise(resolve => setImmediate(resolve));

// Helper to advance timers and flush promises
export const advanceTimersAndFlush = async (ms = 0) => {
  jest.advanceTimersByTime(ms);
  await flushPromises();
};

// Mock AsyncStorage helpers
export const mockAsyncStorage = {
  clear: () => {
    AsyncStorage.clear.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  },
  
  setMockData: (data) => {
    AsyncStorage.getItem.mockImplementation((key) => 
      Promise.resolve(data[key] || null)
    );
  },
  
  expectSetItem: (key, value) => {
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    );
  },
  
  expectGetItem: (key) => {
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
  },
};

// Permission mock helpers
export const mockPermissions = {
  granted: () => ({
    check: jest.fn(() => Promise.resolve('granted')),
    request: jest.fn(() => Promise.resolve('granted')),
  }),
  
  denied: () => ({
    check: jest.fn(() => Promise.resolve('denied')),
    request: jest.fn(() => Promise.resolve('denied')),
  }),
  
  blocked: () => ({
    check: jest.fn(() => Promise.resolve('blocked')),
    request: jest.fn(() => Promise.resolve('blocked')),
  }),
};

// Navigation mock helpers
export const mockNavigation = {
  create: (overrides = {}) => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    ...overrides,
  }),
  
  expectNavigate: (navigation, screenName, params) => {
    if (params) {
      expect(navigation.navigate).toHaveBeenCalledWith(screenName, params);
    } else {
      expect(navigation.navigate).toHaveBeenCalledWith(screenName);
    }
  },
  
  expectGoBack: (navigation) => {
    expect(navigation.goBack).toHaveBeenCalled();
  },
};

// Animation mock helpers
export const mockAnimations = {
  skipAll: () => {
    jest.mock('react-native-reanimated', () => ({
      ...jest.requireActual('react-native-reanimated/mock'),
      runOnJS: (fn) => fn,
      withTiming: (value) => value,
      withSpring: (value) => value,
      withDelay: (delay, animation) => animation,
      interpolate: (value, input, output) => output[0],
      useSharedValue: (initial) => ({ value: initial }),
      useAnimatedStyle: (fn) => fn(),
      useDerivedValue: (fn) => ({ value: fn() }),
      useAnimatedGestureHandler: (handlers) => handlers,
    }));
  },
};

// Service mock helpers
export const createMockService = (methods = {}) => {
  const defaultMethods = {
    initialize: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
  };
  
  return {
    ...defaultMethods,
    ...methods,
  };
};

// Event simulation helpers
export const fireEvents = {
  press: (element) => fireEvent.press(element),
  changeText: (element, text) => fireEvent.changeText(element, text),
  scroll: (element, event) => fireEvent.scroll(element, event),
  
  pressAndWait: async (element) => {
    fireEvent.press(element);
    await flushPromises();
  },
  
  changeTextAndWait: async (element, text) => {
    fireEvent.changeText(element, text);
    await flushPromises();
  },
};

// Query helpers for common elements
export const queries = {
  getByTestId: (getByTestId, testId) => getByTestId(testId),
  queryByTestId: (queryByTestId, testId) => queryByTestId(testId),
  
  getButton: (getByText, text) => getByText(text),
  queryButton: (queryByText, text) => queryByText(text),
  
  getTitle: (getByText, title) => getByText(title),
  queryTitle: (queryByText, title) => queryByText(title),
  
  getInput: (getByDisplayValue, value) => getByDisplayValue(value),
  queryInput: (queryByDisplayValue, value) => queryByDisplayValue(value),
};

// Assertion helpers
export const assertions = {
  toBeVisible: (element) => expect(element).toBeTruthy(),
  toBeHidden: (element) => expect(element).toBeFalsy(),
  
  toHaveText: (element, text) => expect(element).toHaveTextContent(text),
  toContainText: (element, text) => expect(element).toHaveTextContent(text),
  
  toBePressed: (mockFn) => expect(mockFn).toHaveBeenCalled(),
  toBePressedWith: (mockFn, ...args) => expect(mockFn).toHaveBeenCalledWith(...args),
  
  toBeCalledTimes: (mockFn, times) => expect(mockFn).toHaveBeenCalledTimes(times),
};

// Setup and teardown helpers
export const testSetup = {
  beforeEach: () => {
    jest.clearAllMocks();
    mockAsyncStorage.clear();
  },
  
  afterEach: () => {
    jest.clearAllTimers();
  },
  
  mockTimers: () => {
    jest.useFakeTimers();
  },
  
  restoreTimers: () => {
    jest.useRealTimers();
  },
};

// Error boundary helper for testing error states
export class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

// Helper to test error scenarios
export const testErrorScenario = async (Component, props, expectedError) => {
  const onError = jest.fn();
  
  render(
    <TestErrorBoundary onError={onError}>
      <Component {...props} />
    </TestErrorBoundary>
  );
  
  await waitFor(() => {
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expectedError }),
      expect.any(Object)
    );
  });
};
