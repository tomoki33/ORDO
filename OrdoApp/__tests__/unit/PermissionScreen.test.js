import React from 'react';
import { PermissionScreen } from '../../src/screens/onboarding/PermissionScreen';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  mockNavigation,
  mockPermissions,
  assertions,
  testSetup,
} from '../utils/testHelpers';
import { PERMISSIONS, RESULTS } from 'react-native-permissions';

// Mock react-native-permissions
jest.mock('react-native-permissions');

describe('PermissionScreen', () => {
  let navigation;
  let mockPermissionModule;

  beforeEach(() => {
    testSetup.beforeEach();
    navigation = mockNavigation.create();
    mockPermissionModule = mockPermissions.granted();
    
    // Setup default permission mocks
    require('react-native-permissions').check = mockPermissionModule.check;
    require('react-native-permissions').request = mockPermissionModule.request;
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Rendering', () => {
    it('should render permission screen with title', () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByText('Camera & Notification Permissions'));
    });

    it('should render camera permission card', () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByText('Camera Access'));
      assertions.toBeVisible(getByText('Take photos and record videos'));
    });

    it('should render notification permission card', () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByText('Notifications'));
      assertions.toBeVisible(getByText('Receive important updates and reminders'));
    });

    it('should render grant permissions button', () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByText('Grant Permissions'));
    });

    it('should render skip button when allowed', () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByText('Skip for Now'));
    });
  });

  describe('Permission Checking', () => {
    it('should check camera permission on mount', async () => {
      renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        expect(mockPermissionModule.check).toHaveBeenCalledWith(
          PERMISSIONS.IOS.CAMERA
        );
      });
    });

    it('should check notification permission on mount', async () => {
      renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        expect(mockPermissionModule.check).toHaveBeenCalledWith(
          PERMISSIONS.IOS.NOTIFICATIONS
        );
      });
    });

    it('should show granted status for allowed permissions', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Granted');
      });
    });

    it('should show denied status for denied permissions', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      
      const { getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Not Granted');
      });
    });
  });

  describe('Permission Requesting', () => {
    it('should request camera permission when button pressed', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      expect(mockPermissionModule.request).toHaveBeenCalledWith(
        PERMISSIONS.IOS.CAMERA
      );
    });

    it('should request notification permission when button pressed', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      expect(mockPermissionModule.request).toHaveBeenCalledWith(
        PERMISSIONS.IOS.NOTIFICATIONS
      );
    });

    it('should update UI after granting permissions', async () => {
      mockPermissionModule.check
        .mockResolvedValueOnce(RESULTS.DENIED)
        .mockResolvedValueOnce(RESULTS.DENIED)
        .mockResolvedValueOnce(RESULTS.GRANTED)
        .mockResolvedValueOnce(RESULTS.GRANTED);
      
      mockPermissionModule.request.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByText, getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Granted');
      });
    });

    it('should handle permission denial gracefully', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockResolvedValue(RESULTS.DENIED);
      
      const { getByText, getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Not Granted');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next screen when permissions granted', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.GRANTED);
      mockPermissionModule.request.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Continue'));
      
      mockNavigation.expectNavigate(navigation, 'CameraTutorialScreen');
    });

    it('should navigate to next screen on skip', async () => {
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Skip for Now'));
      
      mockNavigation.expectNavigate(navigation, 'CameraTutorialScreen');
    });

    it('should show settings option for blocked permissions', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.BLOCKED);
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Open Settings'));
      });
    });
  });

  describe('Platform Differences', () => {
    it('should use Android permissions on Android platform', async () => {
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        OS: 'android',
        select: (platforms) => platforms.android || platforms.default,
      }));
      
      const { Platform } = require('react-native');
      Platform.OS = 'android';
      
      renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        expect(mockPermissionModule.check).toHaveBeenCalledWith(
          PERMISSIONS.ANDROID.CAMERA
        );
      });
    });

    it('should handle platform-specific permission differences', async () => {
      const { Platform } = require('react-native');
      const originalOS = Platform.OS;
      
      Platform.OS = 'android';
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      // Android may have different permission flow
      assertions.toBeVisible(getByText('Grant Permissions'));
      
      Platform.OS = originalOS;
    });
  });

  describe('Error Handling', () => {
    it('should handle permission check errors', async () => {
      mockPermissionModule.check.mockRejectedValue(new Error('Permission check failed'));
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      // Should still render without crashing
      assertions.toBeVisible(getByText('Camera & Notification Permissions'));
    });

    it('should handle permission request errors', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockRejectedValue(new Error('Request failed'));
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      // Should handle error gracefully
      assertions.toBeVisible(getByText('Grant Permissions'));
    });

    it('should show error message for permission failures', async () => {
      mockPermissionModule.request.mockRejectedValue(new Error('Permission denied'));
      
      const { getByText } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Permission request failed'));
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading during permission checks', async () => {
      mockPermissionModule.check.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(RESULTS.GRANTED), 100))
      );
      
      const { getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByTestId('loading-permissions'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Granted');
      });
    });

    it('should show loading during permission requests', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(RESULTS.GRANTED), 100))
      );
      
      const { getByText, getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      fireEvents.press(getByText('Grant Permissions'));
      
      assertions.toBeVisible(getByTestId('requesting-permissions'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        assertions.toHaveText(cameraStatus, 'Granted');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderScreen(PermissionScreen, { navigation });
      
      assertions.toBeVisible(getByLabelText('Grant camera and notification permissions'));
      assertions.toBeVisible(getByLabelText('Skip permission setup'));
    });

    it('should announce permission status changes', async () => {
      mockPermissionModule.check.mockResolvedValue(RESULTS.DENIED);
      mockPermissionModule.request.mockResolvedValue(RESULTS.GRANTED);
      
      const { getByText, getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Grant Permissions'));
      
      await waitForAsync(() => {
        const cameraStatus = getByTestId('camera-permission-status');
        expect(cameraStatus.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('Visual States', () => {
    it('should show different icons for permission states', async () => {
      mockPermissionModule.check
        .mockResolvedValueOnce(RESULTS.GRANTED)
        .mockResolvedValueOnce(RESULTS.DENIED);
      
      const { getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        const cameraIcon = getByTestId('camera-permission-icon');
        const notificationIcon = getByTestId('notification-permission-icon');
        
        expect(cameraIcon.props.name).toBe('check-circle');
        expect(notificationIcon.props.name).toBe('alert-circle');
      });
    });

    it('should use appropriate colors for permission states', async () => {
      mockPermissionModule.check
        .mockResolvedValueOnce(RESULTS.GRANTED)
        .mockResolvedValueOnce(RESULTS.BLOCKED);
      
      const { getByTestId } = renderScreen(PermissionScreen, { navigation });
      
      await waitForAsync(() => {
        const cameraCard = getByTestId('camera-permission-card');
        const notificationCard = getByTestId('notification-permission-card');
        
        expect(cameraCard.props.style).toContainEqual(
          expect.objectContaining({ borderColor: expect.stringMatching(/green/i) })
        );
        expect(notificationCard.props.style).toContainEqual(
          expect.objectContaining({ borderColor: expect.stringMatching(/red/i) })
        );
      });
    });
  });
});
