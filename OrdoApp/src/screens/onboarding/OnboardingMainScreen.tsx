import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Button } from 'react-native-paper';

// Import onboarding components
import OnboardingController from './OnboardingController';

interface OnboardingMainScreenProps {
  onComplete: () => void;
}

const OnboardingMainScreen: React.FC<OnboardingMainScreenProps> = ({ onComplete }) => {
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    onComplete();
  };

  if (showOnboarding) {
    return (
      <OnboardingController 
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Ordo</Text>
          <Text style={styles.subtitle}>
            Let's get you started with your smart food inventory manager
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🥑 Smart Scanning</Text>
            <Text style={styles.featureDescription}>
              Scan barcodes or take photos to add items instantly
            </Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🔔 Expiration Alerts</Text>
            <Text style={styles.featureDescription}>
              Never let food go to waste with timely notifications
            </Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>📊 Smart Analytics</Text>
            <Text style={styles.featureDescription}>
              Track your savings and reduce food waste
            </Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🔒 Privacy First</Text>
            <Text style={styles.featureDescription}>
              Your data is encrypted and stays on your device
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleStartOnboarding}
            style={styles.startButton}
            labelStyle={styles.startButtonLabel}
          >
            Start Setup
          </Button>
          
          <Button
            mode="text"
            onPress={onComplete}
            style={styles.skipButton}
            labelStyle={styles.skipButtonLabel}
          >
            Skip Setup
          </Button>
        </View>
      </View>
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
  },
  feature: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  actions: {
    marginTop: 20,
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 4,
    marginBottom: 16,
  },
  startButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 4,
  },
  skipButtonLabel: {
    fontSize: 14,
    color: '#666666',
  },
});

export default OnboardingMainScreen;
