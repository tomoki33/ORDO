import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Surface, IconButton, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CameraTutorialScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

const CameraTutorialScreen: React.FC<CameraTutorialScreenProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const animationValue = useSharedValue(0);
  const scanAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);

  const tutorialSteps = [
    {
      id: 'camera_intro',
      title: 'Smart Camera Scanning',
      subtitle: 'Add items instantly with your camera',
      description: 'Use your camera to scan barcodes or take photos of food items to add them to your inventory automatically.',
      icon: 'camera-outline',
      color: '#2196F3',
      demo: 'camera_preview',
    },
    {
      id: 'barcode_scan',
      title: 'Barcode Scanning',
      subtitle: 'Point and scan barcodes',
      description: 'Align the barcode within the scanning frame. The app will automatically detect and add the product information.',
      icon: 'barcode-scan',
      color: '#4CAF50',
      demo: 'barcode_demo',
    },
    {
      id: 'photo_capture',
      title: 'Photo Recognition',
      subtitle: 'Take photos of fresh items',
      description: 'For fresh produce and items without barcodes, take a clear photo and let AI identify the item for you.',
      icon: 'camera-plus',
      color: '#FF9800',
      demo: 'photo_demo',
    },
    {
      id: 'manual_entry',
      title: 'Manual Entry',
      subtitle: 'Add details manually',
      description: 'You can always add or edit item details manually, including expiration dates, quantities, and storage locations.',
      icon: 'pencil-plus',
      color: '#9C27B0',
      demo: 'manual_demo',
    },
  ];

  React.useEffect(() => {
    animationValue.value = withSpring(1, { damping: 15, stiffness: 150 });
    
    // Start scanning animation
    scanAnimation.value = withRepeat(
      withSequence(
        withSpring(0, { duration: 500 }),
        withSpring(1, { duration: 1000 }),
        withSpring(0, { duration: 500 })
      ),
      -1,
      false
    );

    // Pulse animation for interactive elements
    pulseAnimation.value = withRepeat(
      withSpring(1.1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

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

  const animatedScanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(scanAnimation.value, [0, 1], [0, 200]),
        },
      ],
      opacity: interpolate(scanAnimation.value, [0, 0.5, 1], [0, 1, 0]),
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: pulseAnimation.value,
        },
      ],
    };
  });

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
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

  const handleComplete = () => {
    onComplete();
  };

  const handleTryDemo = () => {
    Alert.alert(
      'Demo Mode',
      'This would open the camera in demo mode. In the actual app, you would be able to try scanning here.',
      [
        { text: 'Continue Tutorial', style: 'cancel' },
        { text: 'Finish Tutorial', onPress: handleComplete },
      ]
    );
  };

  const renderDemo = (demoType: string) => {
    switch (demoType) {
      case 'camera_preview':
        return (
          <View style={styles.demoContainer}>
            <Surface style={styles.cameraPreview}>
              <View style={styles.cameraFrame}>
                <Text style={styles.cameraText}>Camera Preview</Text>
                <Icon name="camera" size={40} color="#FFFFFF" />
              </View>
            </Surface>
          </View>
        );

      case 'barcode_demo':
        return (
          <View style={styles.demoContainer}>
            <Surface style={styles.barcodeDemo}>
              <View style={styles.scanningFrame}>
                <View style={styles.scanningCorners}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />
                <View style={styles.barcodeExample}>
                  <Text style={styles.barcodeText}>||||| |||||</Text>
                  <Text style={styles.barcodeNumber}>1234567890</Text>
                </View>
              </View>
            </Surface>
          </View>
        );

      case 'photo_demo':
        return (
          <View style={styles.demoContainer}>
            <Surface style={styles.photoDemo}>
              <View style={styles.photoFrame}>
                <Icon name="apple" size={60} color="#4CAF50" />
                <Text style={styles.photoText}>Fresh Apple</Text>
                <View style={styles.aiIndicator}>
                  <Icon name="brain" size={16} color="#2196F3" />
                  <Text style={styles.aiText}>AI Identified</Text>
                </View>
              </View>
            </Surface>
          </View>
        );

      case 'manual_demo':
        return (
          <View style={styles.demoContainer}>
            <Card style={styles.manualDemo}>
              <Card.Content>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Item Name</Text>
                  <Text style={styles.fieldValue}>Organic Milk</Text>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Expiry Date</Text>
                  <Text style={styles.fieldValue}>2024-01-15</Text>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <Text style={styles.fieldValue}>Refrigerator</Text>
                </View>
              </Card.Content>
            </Card>
          </View>
        );

      default:
        return null;
    }
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={currentStepData.color} barStyle="light-content" />
      
      <Animated.View style={[styles.content, animatedContainerStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onSkip} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.stepCounter}>
            {currentStep + 1} of {tutorialSteps.length}
          </Text>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Dots */}
        <View style={styles.progressDots}>
          {tutorialSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor: index === currentStep 
                    ? currentStepData.color 
                    : '#E0E0E0',
                  width: index === currentStep ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Step Content */}
        <View style={styles.stepContent}>
          <Surface style={[styles.iconContainer, { backgroundColor: currentStepData.color }]}>
            <Icon
              name={currentStepData.icon}
              size={48}
              color="#FFFFFF"
            />
          </Surface>

          <Text style={[styles.title, { color: currentStepData.color }]}>
            {currentStepData.title}
          </Text>
          <Text style={styles.subtitle}>
            {currentStepData.subtitle}
          </Text>
          <Text style={styles.description}>
            {currentStepData.description}
          </Text>
        </View>

        {/* Demo Section */}
        <View style={styles.demoSection}>
          {renderDemo(currentStepData.demo)}
        </View>

        {/* Try Demo Button */}
        <Animated.View style={animatedPulseStyle}>
          <Button
            mode="outlined"
            onPress={handleTryDemo}
            style={[styles.demoButton, { borderColor: currentStepData.color }]}
            labelStyle={[styles.demoButtonLabel, { color: currentStepData.color }]}
            icon="play"
          >
            Try Interactive Demo
          </Button>
        </Animated.View>

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
            {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Icon name="lightbulb-outline" size={16} color="#666666" />
          <Text style={styles.tipsText}>
            Tip: You can always access the camera tutorial from the help section
          </Text>
        </View>
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
  backButton: {
    padding: 8,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stepContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  demoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  demoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  cameraPreview: {
    width: 250,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  cameraFrame: {
    alignItems: 'center',
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  barcodeDemo: {
    width: 250,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  scanningFrame: {
    width: 200,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningCorners: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  barcodeExample: {
    alignItems: 'center',
  },
  barcodeText: {
    fontSize: 20,
    fontFamily: 'monospace',
    color: '#333333',
    marginBottom: 4,
  },
  barcodeNumber: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
  },
  photoDemo: {
    width: 250,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  photoFrame: {
    alignItems: 'center',
  },
  photoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
    marginBottom: 8,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  manualDemo: {
    width: 250,
    elevation: 4,
  },
  formField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
  },
  demoButton: {
    marginHorizontal: 40,
    marginBottom: 20,
  },
  demoButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});

export default CameraTutorialScreen;
