# Ordo App Testing Guide

## Overview

This guide covers the testing strategy, setup, and best practices for the Ordo app testing infrastructure.

## Testing Stack

### Core Testing Libraries
- **Jest**: Testing framework and test runner
- **React Native Testing Library**: Component testing utilities
- **@testing-library/jest-native**: Enhanced Jest matchers
- **React Test Renderer**: Snapshot testing support

### Additional Testing Tools
- **Detox**: E2E testing framework (future implementation)
- **CodeQL**: Security analysis and testing
- **ESLint**: Code quality and consistency testing

## Test Structure

```
__tests__/
├── setup.js                 # Global test configuration
├── mocks/
│   ├── global.js            # Global mocks
│   └── [service-mocks].js   # Service-specific mocks
├── fixtures/
│   └── onboardingData.js    # Test data fixtures
├── utils/
│   └── testHelpers.js       # Reusable test utilities
├── unit/
│   ├── OnboardingService.test.js
│   ├── WelcomeScreen.test.js
│   └── PermissionScreen.test.js
└── integration/
    └── OnboardingFlow.test.js
```

## Test Categories

### 1. Unit Tests
Focus on individual components and services in isolation.

```javascript
// Example: Testing a service method
describe('OnboardingService', () => {
  it('should complete current step', async () => {
    await onboardingService.completeCurrentStep();
    expect(mockAnalytics.track).toHaveBeenCalledWith('step_completed');
  });
});
```

### 2. Integration Tests
Test interactions between multiple components.

```javascript
// Example: Testing component integration
describe('OnboardingFlow', () => {
  it('should navigate through all screens', async () => {
    const { getByText } = renderScreen(OnboardingController);
    
    fireEvent.press(getByText('Get Started'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PermissionScreen');
  });
});
```

### 3. E2E Tests (Future)
Test complete user journeys across the app.

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Preset**: `react-native`
- **Setup Files**: Global mocks and configuration
- **Coverage Thresholds**: 70% global, 80% for services
- **Transform Ignore Patterns**: React Native modules

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  },
  './src/services/': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Testing Utilities

### Custom Render Function
```javascript
export const renderWithProviders = (component, options = {}) => {
  const AllTheProviders = ({ children }) => (
    <PaperProvider theme={mockTheme}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </PaperProvider>
  );

  return render(component, { wrapper: AllTheProviders, ...options });
};
```

### Common Test Patterns

#### Testing Async Operations
```javascript
it('should handle async operations', async () => {
  const promise = service.asyncMethod();
  
  await waitFor(() => {
    expect(mockCallback).toHaveBeenCalled();
  });
  
  await expect(promise).resolves.toBeDefined();
});
```

#### Testing Error States
```javascript
it('should handle errors gracefully', async () => {
  mockService.method.mockRejectedValue(new Error('Test error'));
  
  const { getByText } = renderScreen(Component);
  
  await waitFor(() => {
    expect(getByText('Error message')).toBeTruthy();
  });
});
```

#### Testing Navigation
```javascript
it('should navigate to next screen', async () => {
  const { getByText } = renderScreen(Screen, { navigation });
  
  fireEvent.press(getByText('Next'));
  
  expect(navigation.navigate).toHaveBeenCalledWith('NextScreen');
});
```

## Mock Strategy

### Service Mocks
Create consistent mocks for services used across tests:

```javascript
const mockOnboardingService = {
  getInstance: jest.fn(() => ({
    initialize: jest.fn(() => Promise.resolve()),
    getConfiguration: jest.fn(() => mockConfig),
    completeCurrentStep: jest.fn(() => Promise.resolve()),
  })),
};
```

### React Native Mocks
Mock platform-specific functionality:

```javascript
jest.mock('react-native-permissions', () => ({
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: { IOS: { CAMERA: 'camera' } },
}));
```

## Best Practices

### 1. Test Naming
- Use descriptive test names that explain the expected behavior
- Follow the pattern: "should [expected behavior] when [condition]"

### 2. Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify the expected outcomes

### 3. Mock Management
- Clear mocks between tests using `jest.clearAllMocks()`
- Use specific mocks for each test scenario
- Avoid over-mocking; test real behavior when possible

### 4. Async Testing
- Always use `await` for async operations
- Use `waitFor` for DOM changes
- Handle promise rejections explicitly

### 5. Accessibility Testing
- Include accessibility checks in component tests
- Test screen reader navigation
- Verify proper ARIA labels and roles

## Running Tests

### Development Workflow
```bash
# Run tests in watch mode during development
npm run test:watch

# Run specific test files
npm test -- OnboardingService.test.js

# Run tests with coverage
npm run test:coverage
```

### CI/CD Pipeline
```bash
# Run all tests with coverage and no watch
npm run test:ci

# Run tests with specific configuration
npm test -- --ci --coverage --watchAll=false
```

## Test Data Management

### Fixtures
Centralize test data in fixtures for consistency:

```javascript
export const mockOnboardingConfig = {
  isEnabled: true,
  steps: [
    { id: 'welcome', title: 'Welcome', required: true },
    { id: 'permissions', title: 'Permissions', required: true },
  ],
};
```

### Test Helpers
Create reusable utilities for common test operations:

```javascript
export const fireEvents = {
  pressAndWait: async (element) => {
    fireEvent.press(element);
    await flushPromises();
  },
};
```

## Debugging Tests

### Common Issues

#### 1. Async Operation Timeouts
```javascript
// Increase timeout for slow operations
it('should handle slow operation', async () => {
  // Test implementation
}, 10000); // 10 second timeout
```

#### 2. React Native Module Mocks
```javascript
// Mock missing React Native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
```

#### 3. Navigation Testing
```javascript
// Ensure navigation mocks are properly configured
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};
```

## Performance Testing

### Memory Leaks
```javascript
// Test for memory leaks in components
it('should not leak memory', () => {
  const { unmount } = render(<Component />);
  unmount();
  // Check for cleanup
});
```

### Render Performance
```javascript
// Test render performance
it('should render efficiently', () => {
  const startTime = performance.now();
  render(<Component />);
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(100);
});
```

## Coverage Analysis

### Viewing Coverage Reports
```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

### Coverage Goals
- **Services**: 80%+ coverage (business logic)
- **Components**: 60%+ coverage (UI behavior)
- **Integration**: 70%+ coverage (user flows)

## Continuous Improvement

### Regular Reviews
- Review test coverage monthly
- Identify untested code paths
- Add tests for new features immediately

### Test Maintenance
- Update tests when requirements change
- Refactor tests to improve clarity
- Remove obsolete tests

### Quality Metrics
- Monitor test execution time
- Track flaky tests and fix them
- Ensure tests are deterministic

## Troubleshooting

### Common Error Messages

#### "Cannot resolve module"
- Check mock configuration in `__tests__/setup.js`
- Verify module name mapping in `jest.config.js`

#### "ReferenceError: [global] is not defined"
- Add missing global mocks in `__tests__/mocks/global.js`

#### "TypeError: Cannot read property of undefined"
- Ensure proper mock setup for dependencies
- Check async operation handling

### Getting Help
1. Check the Jest documentation for testing patterns
2. Review React Native Testing Library guides
3. Consult team members for complex testing scenarios
4. Use debugging tools like `console.log` in tests when needed

---

For more specific testing examples, refer to the existing test files in the `__tests__` directory.
