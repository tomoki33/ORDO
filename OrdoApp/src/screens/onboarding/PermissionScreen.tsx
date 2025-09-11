import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Button, Surface, Card, Switch } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { onboardingService } from '../../services/OnboardingService';

interface PermissionScreenProps {
  onComplete: (permissions: PermissionStatus) => void;
  onSkip: () => void;
}

export interface PermissionStatus {
  camera: boolean;
  notifications: boolean;
  microphone?: boolean;
  location?: boolean;
}

const PermissionScreen: React.FC<PermissionScreenProps> = ({ onComplete, onSkip }) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    notifications: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const animationValue = useSharedValue(0);
  const iconAnimations = {
    camera: useSharedValue(0),
    notification: useSharedValue(0),
  };

  const permissionSteps = [
    {
      id: 'camera',
      title: 'Camera Access',
      subtitle: 'Scan food items instantly',
      description: 'Allow camera access to scan barcodes and take photos of your food items for quick inventory updates.',
      icon: 'camera-outline',
      color: '#2196F3',
      required: false,
      benefits: [
        'Quick barcode scanning',
        'Photo-based item recognition',
        'Instant inventory updates',
      ],
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      subtitle: 'Never miss expiration dates',
      description: 'Enable notifications to receive timely alerts about expiring food items and save money.',
      icon: 'bell-outline',
      color: '#FF9800',
      required: false,
      benefits: [
        'Expiration date reminders',
        'Shopping list notifications',
        'Inventory updates',
      ],
    },
  ];

  useEffect(() => {
    checkCurrentPermissions();
    animationValue.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const checkCurrentPermissions = async () => {
    try {
      const cameraStatus = await check(
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA
      );
      
      // For notifications, we'll check if they're enabled (simplified)
      const notificationStatus = 'granted'; // This would be checked differently in a real app

      setPermissions({
        camera: cameraStatus === RESULTS.GRANTED,
        notifications: notificationStatus === 'granted',
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const result = await request(
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA
      );

      switch (result) {
        case RESULTS.GRANTED:
          setPermissions(prev => ({ ...prev, camera: true }));
          iconAnimations.camera.value = withSequence(
            withSpring(1.2),
            withSpring(1)
          );
          return true;
        
        case RESULTS.DENIED:
          Alert.alert(
            'Camera Permission Denied',
            'You can still use the app, but you won\'t be able to scan items. You can enable this later in settings.',
            [{ text: 'OK' }]
          );
          return false;
        
        case RESULTS.BLOCKED:
          Alert.alert(
            'Camera Permission Blocked',
            'Camera access is blocked. To enable scanning, please go to Settings > Privacy > Camera and enable access for Ordo.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openSettings() },
            ]
          );
          return false;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      // This is a simplified implementation
      // In a real app, you would use a proper notification library
      const granted = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Enable Notifications',
          'Allow Ordo to send you notifications about expiring food items?',
          [
            { text: 'Not Now', onPress: () => resolve(false) },
            { text: 'Allow', onPress: () => resolve(true) },
          ]
        );
      });

      if (granted) {
        setPermissions(prev => ({ ...prev, notifications: true }));
        iconAnimations.notification.value = withSequence(
          withSpring(1.2),
          withSpring(1)
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const handlePermissionRequest = async (permissionType: 'camera' | 'notifications') => {
    setIsLoading(true);
    
    try {
      let granted = false;
      
      if (permissionType === 'camera') {
        granted = await requestCameraPermission();
      } else if (permissionType === 'notifications') {
        granted = await requestNotificationPermission();
      }

      if (granted) {
        // Update user preferences
        await onboardingService.updateUserPreferences({
          [`wants${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)}`]: true,
        } as any);
      }
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < permissionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await onboardingService.updateUserPreferences({
        wantsCamera: permissions.camera,
        wantsNotifications: permissions.notifications,
      });
      onComplete(permissions);
    } catch (error) {
      console.error('Error saving permission preferences:', error);
      onComplete(permissions);
    }
  };

  const handleSkipAll = () => {
    Alert.alert(
      'Skip Permissions',
      'You can enable these permissions later in the app settings. Some features may be limited without these permissions.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        { text: 'Skip All', onPress: onSkip },
      ]
    );
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(animationValue.value, [0, 1], [30, 0]),
        },
      ],
    };
  });

  const currentStepData = permissionSteps[currentStep];
  const currentPermissionKey = currentStepData.id as 'camera' | 'notifications';
  const isCurrentPermissionGranted = permissions[currentPermissionKey];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={currentStepData.color} barStyle="light-content" />
      
      <Animated.View style={[styles.content, animatedContainerStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {permissionSteps.length}
          </Text>
          <Button
            mode="text"
            onPress={handleSkipAll}
            labelStyle={styles.skipText}
          >
            Skip All
          </Button>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {permissionSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressStep,
                {
                  backgroundColor: index <= currentStep 
                    ? currentStepData.color 
                    : '#E0E0E0',
                },
              ]}
            />
          ))}
        </View>

        {/* Permission Card */}
        <Card style={styles.permissionCard}>
          <Card.Content>
            <View style={styles.permissionHeader}>
              <Surface style={[styles.iconContainer, { backgroundColor: currentStepData.color }]}>
                <Icon
                  name={currentStepData.icon}
                  size={40}
                  color="#FFFFFF"
                />
              </Surface>
              
              <View style={styles.permissionStatus}>
                <Icon
                  name={isCurrentPermissionGranted ? 'check-circle' : 'circle-outline'}
                  size={24}
                  color={isCurrentPermissionGranted ? '#4CAF50' : '#E0E0E0'}
                />
              </View>
            </View>

            <Text style={[styles.title, { color: currentStepData.color }]}>
              {currentStepData.title}
            </Text>
            <Text style={styles.subtitle}>
              {currentStepData.subtitle}
            </Text>
            <Text style={styles.description}>
              {currentStepData.description}
            </Text>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Benefits:</Text>
              {currentStepData.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Icon name="check" size={16} color={currentStepData.color} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Permission Toggle */}
            <View style={styles.permissionToggle}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>
                  Enable {currentStepData.title}
                </Text>
                <Text style={styles.toggleDescription}>
                  {isCurrentPermissionGranted ? 'Enabled' : 'Tap to enable'}
                </Text>
              </View>
              <Switch
                value={isCurrentPermissionGranted}
                onValueChange={(value) => {
                  if (value && !isCurrentPermissionGranted) {
                    handlePermissionRequest(currentPermissionKey);
                  }
                }}
                color={currentStepData.color}
                disabled={isCurrentPermissionGranted || isLoading}
              />
            </View>

            {/* Action Button */}
            {!isCurrentPermissionGranted && (
              <Button
                mode="contained"
                onPress={() => handlePermissionRequest(currentPermissionKey)}
                style={[styles.actionButton, { backgroundColor: currentStepData.color }]}
                labelStyle={styles.actionButtonLabel}
                loading={isLoading}
                disabled={isLoading}
              >
                Allow {currentStepData.title}
              </Button>
            )}

            {isCurrentPermissionGranted && (
              <View style={styles.grantedContainer}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.grantedText}>Permission Granted</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Permission Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Permission Status</Text>
          <View style={styles.summaryItems}>
            <View style={styles.summaryItem}>
              <Icon 
                name="camera-outline" 
                size={20} 
                color={permissions.camera ? '#4CAF50' : '#E0E0E0'} 
              />
              <Text style={[
                styles.summaryText,
                { color: permissions.camera ? '#4CAF50' : '#999999' }
              ]}>
                Camera
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon 
                name="bell-outline" 
                size={20} 
                color={permissions.notifications ? '#4CAF50' : '#E0E0E0'} 
              />
              <Text style={[
                styles.summaryText,
                { color: permissions.notifications ? '#4CAF50' : '#999999' }
              ]}>
                Notifications
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 ? (
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.previousButton}
              labelStyle={styles.buttonLabel}
            >
              Previous
            </Button>
          ) : (
            <View style={styles.previousButton} />
          )}

          <Button
            mode="contained"
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: currentStepData.color }]}
            labelStyle={styles.buttonLabel}
          >
            {currentStep === permissionSteps.length - 1 ? 'Continue' : 'Next'}
          </Button>
        </View>

        {/* Help Text */}
        <Text style={styles.helpText}>
          You can always change these permissions later in your device settings
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  skipText: {
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressStep: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  permissionCard: {
    marginBottom: 20,
    elevation: 4,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  permissionStatus: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  permissionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  actionButton: {
    marginTop: 10,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  grantedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    marginTop: 10,
  },
  grantedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previousButton: {
    flex: 0.4,
  },
  nextButton: {
    flex: 0.5,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
});

export default PermissionScreen;
