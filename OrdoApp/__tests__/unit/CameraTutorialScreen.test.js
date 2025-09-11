import React from 'react';
import { CameraTutorialScreen } from '../../src/screens/onboarding/CameraTutorialScreen';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  mockNavigation,
  assertions,
  testSetup,
} from '../utils/testHelpers';
import { mockCameraTutorialSteps } from '../fixtures/onboardingData';

// Mock the camera service
const mockCameraService = {
  getInstance: jest.fn(() => ({
    initializeCamera: jest.fn(() => Promise.resolve()),
    startPreview: jest.fn(() => Promise.resolve()),
    stopPreview: jest.fn(() => Promise.resolve()),
    takePicture: jest.fn(() => Promise.resolve({ uri: 'mock-image.jpg' })),
    setFocusMode: jest.fn(() => Promise.resolve()),
    setExposureMode: jest.fn(() => Promise.resolve()),
    isAvailable: jest.fn(() => true),
  })),
};

jest.mock('../../src/services/CameraService', () => ({
  CameraService: mockCameraService,
}));

describe('CameraTutorialScreen', () => {
  let navigation;
  let cameraService;

  beforeEach(() => {
    testSetup.beforeEach();
    navigation = mockNavigation.create();
    cameraService = mockCameraService.getInstance();
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Rendering', () => {
    it('should render camera tutorial screen with title', () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      assertions.toBeVisible(getByText('Camera Tutorial'));
    });

    it('should render tutorial steps', () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      assertions.toBeVisible(getByText('Basic Photo Capture'));
      assertions.toBeVisible(getByText('Learn how to take your first photo'));
    });

    it('should render step navigation controls', () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      assertions.toBeVisible(getByText('Next'));
      assertions.toBeVisible(getByText('Skip Tutorial'));
    });

    it('should render camera preview area', () => {
      const { getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      assertions.toBeVisible(getByTestId('camera-preview'));
    });
  });

  describe('Tutorial Navigation', () => {
    it('should advance to next tutorial step', async () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Focus Control'));
      });
    });

    it('should go back to previous step', async () => {
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      // Navigate to second step
      await fireEvents.pressAndWait(getByText('Next'));
      
      // Go back
      await fireEvents.pressAndWait(getByTestId('back-button'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Basic Photo Capture'));
      });
    });

    it('should track tutorial progress', async () => {
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      const progressBar = getByTestId('tutorial-progress');
      expect(progressBar.props.progress).toBe(0);
      
      await fireEvents.pressAndWait(getByText('Next'));
      
      await waitForAsync(() => {
        expect(progressBar.props.progress).toBeGreaterThan(0);
      });
    });
  });

  describe('Interactive Demonstrations', () => {
    it('should demonstrate basic photo capture', async () => {
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      const captureButton = getByTestId('demo-capture-button');
      await fireEvents.pressAndWait(captureButton);
      
      expect(cameraService.takePicture).toHaveBeenCalled();
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Great! You took your first photo'));
      });
    });

    it('should demonstrate focus control', async () => {
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      // Navigate to focus step
      await fireEvents.pressAndWait(getByText('Next'));
      
      const focusArea = getByTestId('focus-demo-area');
      fireEvents.press(focusArea);
      
      expect(cameraService.setFocusMode).toHaveBeenCalledWith('manual');
    });

    it('should demonstrate exposure control', async () => {
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      // Navigate to exposure step
      await fireEvents.pressAndWait(getByText('Next'));
      await fireEvents.pressAndWait(getByText('Next'));
      
      const exposureSlider = getByTestId('exposure-slider');
      fireEvents.changeText(exposureSlider, '0.5');
      
      expect(cameraService.setExposureMode).toHaveBeenCalledWith(0.5);
    });
  });

  describe('Camera Integration', () => {
    it('should initialize camera on mount', async () => {
      renderScreen(CameraTutorialScreen, { navigation });
      
      await waitForAsync(() => {
        expect(cameraService.initializeCamera).toHaveBeenCalled();
        expect(cameraService.startPreview).toHaveBeenCalled();
      });
    });

    it('should handle camera initialization failure', async () => {
      cameraService.initializeCamera.mockRejectedValue(new Error('Camera not available'));
      
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Camera not available for tutorial'));
      });
    });

    it('should clean up camera on unmount', async () => {
      const { unmount } = renderScreen(CameraTutorialScreen, { navigation });
      
      unmount();
      
      expect(cameraService.stopPreview).toHaveBeenCalled();
    });
  });

  describe('Tutorial Completion', () => {
    it('should complete tutorial when all steps finished', async () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      // Complete all tutorial steps
      for (let i = 0; i < mockCameraTutorialSteps.length; i++) {
        if (i < mockCameraTutorialSteps.length - 1) {
          await fireEvents.pressAndWait(getByText('Next'));
        } else {
          await fireEvents.pressAndWait(getByText('Complete Tutorial'));
        }
      }
      
      mockNavigation.expectNavigate(navigation, 'UserGuideScreen');
    });

    it('should allow skipping tutorial', async () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Skip Tutorial'));
      
      mockNavigation.expectNavigate(navigation, 'UserGuideScreen');
    });

    it('should save tutorial completion state', async () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Complete Tutorial'));
      
      // Verify completion is saved to storage
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('camera_tutorial_completed', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle tutorial step errors', async () => {
      cameraService.takePicture.mockRejectedValue(new Error('Camera error'));
      
      const { getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      const captureButton = getByTestId('demo-capture-button');
      await fireEvents.pressAndWait(captureButton);
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Tutorial demo failed. Try again.'));
      });
    });

    it('should provide retry functionality', async () => {
      cameraService.takePicture
        .mockRejectedValueOnce(new Error('Camera error'))
        .mockResolvedValueOnce({ uri: 'mock-image.jpg' });
      
      const { getByText, getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      const captureButton = getByTestId('demo-capture-button');
      await fireEvents.pressAndWait(captureButton);
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Retry'));
      });
      
      expect(cameraService.takePicture).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderScreen(CameraTutorialScreen, { navigation });
      
      assertions.toBeVisible(getByLabelText('Camera tutorial demonstration'));
      assertions.toBeVisible(getByLabelText('Next tutorial step'));
      assertions.toBeVisible(getByLabelText('Skip camera tutorial'));
    });

    it('should provide audio instructions', async () => {
      const { getByTestId } = renderScreen(CameraTutorialScreen, { navigation });
      
      const audioButton = getByTestId('audio-instructions');
      fireEvents.press(audioButton);
      
      // Audio instructions should be triggered
      expect(audioButton.props.accessibilityHint).toContain('Play audio instructions');
    });
  });

  describe('Performance', () => {
    it('should render tutorial steps efficiently', () => {
      const startTime = performance.now();
      
      renderScreen(CameraTutorialScreen, { navigation });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid step navigation', async () => {
      const { getByText } = renderScreen(CameraTutorialScreen, { navigation });
      
      // Rapid navigation should not cause issues
      const nextButton = getByText('Next');
      fireEvents.press(nextButton);
      fireEvents.press(nextButton);
      fireEvents.press(nextButton);
      
      await waitForAsync(() => {
        // Should only advance one step at a time
        assertions.toBeVisible(getByText('Focus Control'));
      });
    });
  });
});
