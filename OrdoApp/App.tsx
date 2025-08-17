/**
 * Ordo - AI-powered Home Management App
 * Main Application Entry Point
 * 
 * @format
 */

import React from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
    flex: 1,
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <SafeAreaView style={backgroundStyle}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={backgroundStyle}>
          <OrdoHeader />
          <View style={styles.body}>
            <WelcomeSection />
            <FeatureList />
            <DevelopmentStatus />
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function OrdoHeader(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>🏠 Ordo</Text>
      <Text style={styles.subtitle}>AI-powered Home Management</Text>
    </View>
  );
}

function WelcomeSection(): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Welcome to Ordo</Text>
      <Text style={styles.sectionDescription}>
        Smart home inventory management with AI-powered product recognition
      </Text>
    </View>
  );
}

function FeatureList(): React.JSX.Element {
  const features = [
    { title: '📸 Smart Camera', description: 'AI product recognition' },
    { title: '🥬 Freshness AI', description: 'Food condition analysis' },
    { title: '📋 Inventory', description: 'Smart product management' },
    { title: '⏰ Reminders', description: 'Expiration notifications' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Key Features</Text>
      {features.map((feature, index) => (
        <FeatureItem key={index} feature={feature} />
      ))}
    </View>
  );
}

function FeatureItem({ feature }: { feature: { title: string; description: string } }): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.featureItem}>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </TouchableOpacity>
  );
}

function DevelopmentStatus(): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Development Status</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>🚧 MVP Phase - In Development</Text>
        <Text style={styles.statusDetails}>
          Core features are being implemented. AI recognition and camera functionality coming soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#4A90E2',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  featureItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  statusContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  statusDetails: {
    fontSize: 14,
    color: '#6C5700',
    lineHeight: 20,
  },
});

export default App;
