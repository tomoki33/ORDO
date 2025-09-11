import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Alert,
} from 'react-native';
import { Button, ProgressBar, Surface, Portal, Dialog } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

// Import onboarding screens
import WelcomeScreen from './WelcomeScreen';
import PermissionScreen, { PermissionStatus } from './PermissionScreen';
import CameraTutorialScreen from './CameraTutorialScreen';

// Import services
import { onboardingService, OnboardingStep } from '../../services/OnboardingService';

interface OnboardingControllerProps {
  onComplete: () => void;
}

interface OnboardingState {
  currentStep: OnboardingStep | null;
  progress: {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    estimatedTimeRemaining: number;
  };
  isLoading: boolean;
  showSkipDialog: boolean;
  showExitDialog: boolean;
  canGoBack: boolean;
}

const OnboardingController: React.FC<OnboardingControllerProps> = ({ onComplete }) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: null,
    progress: {
      currentStep: 0,
      totalSteps: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
    },
    isLoading: true,
    showSkipDialog: false,
    showExitDialog: false,
    canGoBack: false,
  });

  const animationValue = useSharedValue(0);
  const progressAnimation = useSharedValue(0);

  useEffect(() => {
    initializeOnboarding();
    
    // Handle Android back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    animationValue.value = withSpring(1, { damping: 15, stiffness: 150 });
    progressAnimation.value = withSpring(state.progress.percentage / 100, {
      damping: 20,
      stiffness: 100,
    });
  }, [state.currentStep, state.progress]);

  const initializeOnboarding = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await onboardingService.initialize();
      
      const shouldShow = await onboardingService.shouldShowOnboarding();
      if (!shouldShow) {
        onComplete();
        return;
      }

      const step = await onboardingService.startOnboarding();
      const progress = onboardingService.getProgress();

      setState(prev => ({
        ...prev,
        currentStep: step,
        progress,
        isLoading: false,
        canGoBack: progress.currentStep > 1,
      }));
    } catch (error) {
      console.error('Failed to initialize onboarding:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      // Fallback to completing onboarding if there's an error
      onComplete();
    }
  };

  const handleBackPress = (): boolean => {
    if (state.canGoBack) {
      handleGoBack();
      return true;
    } else {
      handleShowExitDialog();
      return true;
    }
  };

  const handleGoBack = async () => {
    try {
      const step = await onboardingService.goToPreviousStep();
      const progress = onboardingService.getProgress();

      setState(prev => ({
        ...prev,
        currentStep: step,
        progress,
        canGoBack: progress.currentStep > 1,
      }));
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  };

  const handleStepComplete = async (data?: any) => {
    try {
      if (!state.currentStep) return;

      const nextStep = await onboardingService.completeStep(state.currentStep.id, data);
      const progress = onboardingService.getProgress();

      if (!nextStep) {
        // Onboarding completed
        onComplete();
        return;
      }

      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        progress,
        canGoBack: progress.currentStep > 1,
      }));
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  };

  const handleStepSkip = async () => {
    try {
      if (!state.currentStep) return;

      if (state.currentStep.isRequired) {
        Alert.alert(
          'Required Step',
          'This step is required and cannot be skipped.',
          [{ text: 'OK' }]
        );
        return;
      }

      const nextStep = await onboardingService.skipStep(
        state.currentStep.id,
        'User chose to skip'
      );
      const progress = onboardingService.getProgress();

      if (!nextStep) {
        // Onboarding completed
        onComplete();
        return;
      }

      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        progress,
        canGoBack: progress.currentStep > 1,
      }));
    } catch (error) {
      console.error('Failed to skip step:', error);
      if (error instanceof Error && error.message.includes('Cannot skip required step')) {
        Alert.alert(
          'Required Step',
          'This step is required and cannot be skipped.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleShowSkipDialog = () => {
    setState(prev => ({ ...prev, showSkipDialog: true }));
  };

  const handleShowExitDialog = () => {
    setState(prev => ({ ...prev, showExitDialog: true }));
  };

  const handleConfirmSkip = () => {
    setState(prev => ({ ...prev, showSkipDialog: false }));
    handleStepSkip();
  };

  const handleConfirmExit = () => {
    setState(prev => ({ ...prev, showExitDialog: false }));
    onComplete();
  };

  const hideDialogs = () => {
    setState(prev => ({
      ...prev,
      showSkipDialog: false,
      showExitDialog: false,
    }));
  };

  const renderCurrentStep = () => {
    if (!state.currentStep) return null;

    const onSkip = state.currentStep.isRequired ? () => {} : handleShowSkipDialog;

    switch (state.currentStep.component) {
      case 'WelcomeScreen':
        return (
          <WelcomeScreen
            onComplete={handleStepComplete}
            onSkip={onSkip}
          />
        );
      
      case 'CameraPermissionScreen':
      case 'NotificationPermissionScreen':
        return (
          <PermissionScreen
            onComplete={(permissions: PermissionStatus) => handleStepComplete(permissions)}
            onSkip={onSkip}
          />
        );
      
      case 'CameraTutorialScreen':
        return (
          <CameraTutorialScreen
            onComplete={handleStepComplete}
            onSkip={onSkip}
          />
        );
      
      default:
        return (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>
              Step not implemented: {state.currentStep.component}
            </Text>
            <Button onPress={() => handleStepComplete()}>
              Continue
            </Button>
          </View>
        );
    }
  };

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(animationValue.value, [0, 1], [-20, 0]),
        },
      ],
    };
  });

  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
        <View style={styles.loadingContent}>
          <Surface style={styles.loadingIcon}>
            <Icon name="loading" size={40} color="#2196F3" />
          </Surface>
          <Text style={styles.loadingText}>Setting up your experience...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      
      {/* Progress Header */}
      <Animated.View style={[styles.progressHeader, animatedProgressStyle]}>
        <View style={styles.progressInfo}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressText}>
              Step {state.progress.currentStep} of {state.progress.totalSteps}
            </Text>
            <Text style={styles.progressSubtext}>
              {state.progress.estimatedTimeRemaining} min remaining
            </Text>
          </View>
          
          {state.canGoBack && (
            <Button
              mode="text"
              onPress={handleGoBack}
              icon="arrow-left"
              labelStyle={styles.backButtonLabel}
              style={styles.backButton}
            >
              Back
            </Button>
          )}
        </View>

        <ProgressBar
          progress={state.progress.percentage / 100}
          color="#4CAF50"
          style={styles.progressBar}
        />

        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Icon name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.progressStatText}>
              {state.progress.currentStep - 1} completed
            </Text>
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(state.progress.percentage)}%
          </Text>
        </View>
      </Animated.View>

      {/* Current Step Content */}
      <View style={styles.stepContainer}>
        {renderCurrentStep()}
      </View>

      {/* Skip Dialog */}
      <Portal>
        <Dialog visible={state.showSkipDialog} onDismiss={hideDialogs}>
          <Dialog.Icon icon="help-circle-outline" />
          <Dialog.Title style={styles.dialogTitle}>Skip This Step?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogContent}>
              {state.currentStep?.title && `Are you sure you want to skip "${state.currentStep.title}"?`}
              {'\n\n'}You can always access this feature later from the settings menu.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialogs} labelStyle={styles.dialogButtonSecondary}>
              Cancel
            </Button>
            <Button onPress={handleConfirmSkip} labelStyle={styles.dialogButtonPrimary}>
              Skip
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Exit Dialog */}
      <Portal>
        <Dialog visible={state.showExitDialog} onDismiss={hideDialogs}>
          <Dialog.Icon icon="exit-to-app" />
          <Dialog.Title style={styles.dialogTitle}>Exit Setup?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogContent}>
              Are you sure you want to exit the setup process?
              {'\n\n'}You can complete the setup later from the settings menu, but some features may be limited.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialogs} labelStyle={styles.dialogButtonSecondary}>
              Continue Setup
            </Button>
            <Button onPress={handleConfirmExit} labelStyle={styles.dialogButtonPrimary}>
              Exit
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  progressHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  backButton: {
    marginLeft: 16,
  },
  backButtonLabel: {
    fontSize: 14,
    color: '#2196F3',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStatText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  stepContainer: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  dialogContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
    textAlign: 'center',
  },
  dialogButtonSecondary: {
    color: '#666666',
  },
  dialogButtonPrimary: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default OnboardingController;
