import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Button, Surface, IconButton, ProgressBar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { onboardingService } from '../../services/OnboardingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete, onSkip }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const animationValue = useSharedValue(0);
  const slideAnimation = useSharedValue(0);

  const slides = [
    {
      icon: 'food-apple',
      title: 'Welcome to Ordo',
      subtitle: 'Your Smart Food Inventory Manager',
      description: 'Never waste food again with intelligent expiration tracking and smart inventory management.',
      color: '#4CAF50',
    },
    {
      icon: 'camera-outline',
      title: 'Smart Scanning',
      subtitle: 'Scan & Track Effortlessly',
      description: 'Simply scan barcodes or take photos to add items to your inventory instantly.',
      color: '#2196F3',
    },
    {
      icon: 'bell-alert-outline',
      title: 'Smart Notifications',
      subtitle: 'Never Miss Expiration Dates',
      description: 'Get timely alerts before your food expires, helping you save money and reduce waste.',
      color: '#FF9800',
    },
    {
      icon: 'chart-line',
      title: 'Insights & Analytics',
      subtitle: 'Track Your Savings',
      description: 'Monitor your food waste reduction and savings with detailed analytics and insights.',
      color: '#9C27B0',
    },
  ];

  React.useEffect(() => {
    animationValue.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(animationValue.value, [0, 1], [50, 0]),
        },
      ],
    };
  });

  const animatedSlideStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(slideAnimation.value, [0, 1], [0, -screenWidth]),
        },
      ],
    };
  });

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      slideAnimation.value = withSpring(1, {}, () => {
        runOnJS(setCurrentSlide)(currentSlide + 1);
        slideAnimation.value = 0;
      });
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      slideAnimation.value = withSpring(-1, {}, () => {
        runOnJS(setCurrentSlide)(currentSlide - 1);
        slideAnimation.value = 0;
      });
    }
  };

  const handleGetStarted = async () => {
    try {
      await onboardingService.updateUserPreferences({
        preferredLanguage: 'en',
      });
      onComplete();
    } catch (error) {
      console.error('Failed to update preferences:', error);
      onComplete();
    }
  };

  const handleDotPress = (index: number) => {
    setCurrentSlide(index);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={currentSlideData.color} barStyle="light-content" />
      
      <Animated.View style={[styles.content, animatedContainerStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepCounter}>
            {currentSlide + 1} of {slides.length}
          </Text>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <ProgressBar
          progress={(currentSlide + 1) / slides.length}
          color={currentSlideData.color}
          style={styles.progressBar}
        />

        {/* Slide Content */}
        <Animated.View style={[styles.slideContainer, animatedSlideStyle]}>
          <Surface style={[styles.iconContainer, { backgroundColor: currentSlideData.color }]}>
            <Icon
              name={currentSlideData.icon}
              size={80}
              color="#FFFFFF"
            />
          </Surface>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: currentSlideData.color }]}>
              {currentSlideData.title}
            </Text>
            <Text style={styles.subtitle}>
              {currentSlideData.subtitle}
            </Text>
            <Text style={styles.description}>
              {currentSlideData.description}
            </Text>
          </View>
        </Animated.View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentSlide 
                    ? currentSlideData.color 
                    : '#E0E0E0',
                },
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentSlide > 0 ? (
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
            style={[styles.nextButton, { backgroundColor: currentSlideData.color }]}
            labelStyle={styles.buttonLabel}
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Icon name="shield-check" size={20} color={currentSlideData.color} />
            <Text style={styles.featureText}>Privacy First</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="offline" size={20} color={currentSlideData.color} />
            <Text style={styles.featureText}>Works Offline</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="lock" size={20} color={currentSlideData.color} />
            <Text style={styles.featureText}>Data Secure</Text>
          </View>
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCounter: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F5F5F5',
    marginBottom: 40,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 20,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
