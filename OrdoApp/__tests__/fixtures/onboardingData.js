// Mock data for onboarding service tests
export const mockOnboardingConfig = {
  isEnabled: true,
  skipEnabled: true,
  showProgress: true,
  autoAdvance: false,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome',
      type: 'welcome',
      required: true,
      order: 1,
    },
    {
      id: 'permissions',
      title: 'Permissions',
      type: 'permissions',
      required: true,
      order: 2,
    },
    {
      id: 'camera_tutorial',
      title: 'Camera Tutorial',
      type: 'tutorial',
      required: false,
      order: 3,
    },
    {
      id: 'user_guide',
      title: 'User Guide',
      type: 'guide',
      required: false,
      order: 4,
    },
  ],
};

export const mockOnboardingState = {
  isCompleted: false,
  currentStepIndex: 0,
  completedSteps: [],
  skippedSteps: [],
  startedAt: new Date().toISOString(),
  completedAt: null,
  userPreferences: {
    skipTutorials: false,
    showTips: true,
    enableNotifications: true,
  },
};

export const mockUserPreferences = {
  skipTutorials: false,
  showTips: true,
  enableNotifications: true,
  theme: 'light',
  language: 'en',
};

export const mockAnalyticsEvent = {
  event: 'onboarding_step_completed',
  properties: {
    step_id: 'welcome',
    step_type: 'welcome',
    step_order: 1,
    timestamp: new Date().toISOString(),
    session_id: 'mock-session-123',
  },
};

export const mockPermissionStates = {
  camera: {
    status: 'granted',
    requested: true,
    timestamp: new Date().toISOString(),
  },
  notifications: {
    status: 'denied',
    requested: true,
    timestamp: new Date().toISOString(),
  },
};

export const mockNavigationProps = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(() => 'test-screen'),
    getParent: jest.fn(() => null),
    getState: jest.fn(() => ({})),
    reset: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
  },
  route: {
    key: 'test-route',
    name: 'TestScreen',
    params: {},
    path: undefined,
  },
};

export const mockTheme = {
  colors: {
    primary: '#6200EE',
    primaryVariant: '#3700B3',
    secondary: '#03DAC6',
    secondaryVariant: '#018786',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#FFFFFF',
  },
  dark: false,
  mode: 'adaptive',
  roundness: 4,
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
};

export const mockCameraTutorialSteps = [
  {
    id: 'basic_capture',
    title: 'Basic Photo Capture',
    description: 'Learn how to take your first photo',
    type: 'interactive',
    required: true,
  },
  {
    id: 'focus_control',
    title: 'Focus Control',
    description: 'Master manual focus controls',
    type: 'demo',
    required: false,
  },
  {
    id: 'exposure_settings',
    title: 'Exposure Settings',
    description: 'Understand exposure controls',
    type: 'demo',
    required: false,
  },
];

export const mockUserGuideCategories = [
  {
    id: 'getting_started',
    title: 'Getting Started',
    icon: 'play-circle',
    items: [
      {
        id: 'first_steps',
        title: 'First Steps',
        content: 'Learn the basics of using Ordo',
      },
      {
        id: 'navigation',
        title: 'Navigation',
        content: 'How to navigate through the app',
      },
    ],
  },
  {
    id: 'camera_features',
    title: 'Camera Features',
    icon: 'camera',
    items: [
      {
        id: 'photo_capture',
        title: 'Photo Capture',
        content: 'How to take photos with advanced features',
      },
      {
        id: 'manual_controls',
        title: 'Manual Controls',
        content: 'Using manual camera controls',
      },
    ],
  },
];

export const mockAsyncStorageData = {
  'onboarding_state': JSON.stringify(mockOnboardingState),
  'user_preferences': JSON.stringify(mockUserPreferences),
  'permission_states': JSON.stringify(mockPermissionStates),
};

// Helper functions for creating test data
export const createMockOnboardingStep = (overrides = {}) => ({
  id: 'test_step',
  title: 'Test Step',
  type: 'tutorial',
  required: false,
  order: 1,
  ...overrides,
});

export const createMockAnalyticsEvent = (overrides = {}) => ({
  event: 'test_event',
  properties: {
    timestamp: new Date().toISOString(),
    session_id: 'test-session',
    ...overrides.properties,
  },
  ...overrides,
});

export const createMockPermissionState = (status = 'granted') => ({
  status,
  requested: true,
  timestamp: new Date().toISOString(),
});
