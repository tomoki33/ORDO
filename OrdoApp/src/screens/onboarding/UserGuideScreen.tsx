import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Button,
  Surface,
  Card,
  Searchbar,
  Chip,
  List,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface UserGuideScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'basics' | 'advanced' | 'features' | 'troubleshooting';
  estimatedReadTime: number;
  steps: GuideStep[];
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'image' | 'video' | 'interactive';
  content: string;
  tips?: string[];
  warnings?: string[];
}

const UserGuideScreen: React.FC<UserGuideScreenProps> = ({ onComplete, onSkip }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<GuideSection | null>(null);
  const [showModal, setShowModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const animationValue = useSharedValue(0);

  const guideCategories = [
    { id: 'all', title: 'All', icon: 'view-grid-outline' },
    { id: 'basics', title: 'Basics', icon: 'book-open-outline' },
    { id: 'features', title: 'Features', icon: 'star-outline' },
    { id: 'advanced', title: 'Advanced', icon: 'cog-outline' },
    { id: 'troubleshooting', title: 'Help', icon: 'help-circle-outline' },
  ];

  const guideSections: GuideSection[] = [
    {
      id: 'getting_started',
      title: 'Getting Started',
      description: 'Learn the basics of using Ordo to manage your food inventory',
      icon: 'play-circle-outline',
      color: '#4CAF50',
      category: 'basics',
      estimatedReadTime: 5,
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Ordo',
          description: 'Your journey to zero food waste begins here',
          type: 'text',
          content: 'Ordo helps you track your food inventory, monitor expiration dates, and reduce food waste. With smart scanning and intelligent notifications, managing your kitchen has never been easier.',
          tips: [
            'Start by adding a few items to get familiar with the app',
            'Enable notifications to never miss expiration dates',
            'Use the camera feature for quick item addition',
          ],
        },
        {
          id: 'first_item',
          title: 'Adding Your First Item',
          description: 'Learn how to add items to your inventory',
          type: 'interactive',
          content: 'You can add items in three ways: scan barcodes, take photos, or manually enter details. Each method is designed for different types of food items.',
          tips: [
            'Barcode scanning works best for packaged goods',
            'Photo recognition is great for fresh produce',
            'Manual entry gives you full control over item details',
          ],
        },
      ],
    },
    {
      id: 'camera_scanning',
      title: 'Camera & Scanning',
      description: 'Master the camera features for quick inventory management',
      icon: 'camera-outline',
      color: '#2196F3',
      category: 'features',
      estimatedReadTime: 7,
      steps: [
        {
          id: 'barcode_scan',
          title: 'Barcode Scanning',
          description: 'How to scan product barcodes effectively',
          type: 'interactive',
          content: 'Point your camera at the barcode and align it within the scanning frame. The app will automatically detect and add the product information.',
          tips: [
            'Ensure good lighting for best results',
            'Hold the camera steady during scanning',
            'Clean the camera lens if scanning fails',
          ],
          warnings: [
            'Some generic or store-brand items may not be recognized',
            'Very small or damaged barcodes may be difficult to scan',
          ],
        },
        {
          id: 'photo_recognition',
          title: 'Photo Recognition',
          description: 'Using AI to identify food items from photos',
          type: 'interactive',
          content: 'Take clear photos of fresh produce or items without barcodes. Our AI will attempt to identify the item and suggest details.',
          tips: [
            'Use good lighting and clear backgrounds',
            'Show the item clearly in the photo',
            'Multiple angles can improve recognition',
          ],
        },
      ],
    },
    {
      id: 'inventory_management',
      title: 'Inventory Management',
      description: 'Organize and track your food items effectively',
      icon: 'clipboard-list-outline',
      color: '#FF9800',
      category: 'features',
      estimatedReadTime: 8,
      steps: [
        {
          id: 'categories',
          title: 'Organizing by Categories',
          description: 'Use categories to keep your inventory organized',
          type: 'text',
          content: 'Organize items by food type, storage location, or custom categories. This makes finding and managing items much easier.',
          tips: [
            'Create categories that match your cooking style',
            'Use location-based categories for easy finding',
            'Regular category cleanup keeps things organized',
          ],
        },
        {
          id: 'expiration_tracking',
          title: 'Expiration Date Tracking',
          description: 'Never let food go to waste again',
          type: 'text',
          content: 'Track expiration dates and get timely notifications. The app uses color coding and alerts to help you use items before they spoil.',
          tips: [
            'Set up notifications for your preferred timing',
            'Use the color coding system for quick visual assessment',
            'Check the expiration overview regularly',
          ],
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Smart Notifications',
      description: 'Configure alerts and reminders',
      icon: 'bell-outline',
      color: '#9C27B0',
      category: 'features',
      estimatedReadTime: 4,
      steps: [
        {
          id: 'setup_notifications',
          title: 'Setting Up Notifications',
          description: 'Configure when and how you receive alerts',
          type: 'text',
          content: 'Customize notification timing, frequency, and types to match your lifestyle and preferences.',
          tips: [
            'Set notifications for times when you typically shop',
            'Choose notification types that work for your schedule',
            'Adjust frequency to avoid notification fatigue',
          ],
        },
      ],
    },
    {
      id: 'privacy_security',
      title: 'Privacy & Security',
      description: 'Your data protection and privacy settings',
      icon: 'shield-check-outline',
      color: '#607D8B',
      category: 'advanced',
      estimatedReadTime: 6,
      steps: [
        {
          id: 'data_protection',
          title: 'Data Protection',
          description: 'How your data is protected in Ordo',
          type: 'text',
          content: 'Ordo uses advanced encryption to protect your data. All personal information is stored securely on your device with optional cloud backup.',
          tips: [
            'Regular backups help protect against data loss',
            'Review privacy settings periodically',
            'Understand what data is collected and why',
          ],
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and how to resolve them',
      icon: 'wrench-outline',
      color: '#F44336',
      category: 'troubleshooting',
      estimatedReadTime: 10,
      steps: [
        {
          id: 'camera_issues',
          title: 'Camera Not Working',
          description: 'Solutions for camera-related problems',
          type: 'text',
          content: 'If the camera is not working properly, check permissions, clean the lens, ensure good lighting, and restart the app if needed.',
          warnings: [
            'Camera permission must be granted for scanning features',
            'Damaged camera hardware may require device repair',
          ],
        },
        {
          id: 'sync_issues',
          title: 'Sync Problems',
          description: 'Fixing data synchronization issues',
          type: 'text',
          content: 'Sync issues can usually be resolved by checking internet connection, refreshing the app, or re-logging into your account.',
        },
      ],
    },
  ];

  React.useEffect(() => {
    animationValue.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const filteredSections = guideSections.filter(section => {
    const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleSectionPress = (section: GuideSection) => {
    setSelectedSection(section);
    setShowModal(true);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@ordo.app?subject=Help Request');
  };

  const handleVisitFAQ = () => {
    Linking.openURL('https://ordo.app/faq');
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
      transform: [
        {
          translateY: interpolate(animationValue.value, [0, 1], [20, 0]),
        },
      ],
    };
  });

  const renderGuideModal = () => {
    if (!selectedSection) return null;

    return (
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Surface style={[styles.modalIcon, { backgroundColor: selectedSection.color }]}>
                <Icon name={selectedSection.icon} size={24} color="#FFFFFF" />
              </Surface>
              <Text style={[styles.modalTitle, { color: selectedSection.color }]}>
                {selectedSection.title}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              {selectedSection.description}
            </Text>

            <View style={styles.modalMeta}>
              <View style={styles.metaItem}>
                <Icon name="clock-outline" size={16} color="#666666" />
                <Text style={styles.metaText}>
                  {selectedSection.estimatedReadTime} min read
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="bookmark-outline" size={16} color="#666666" />
                <Text style={styles.metaText}>
                  {selectedSection.steps.length} steps
                </Text>
              </View>
            </View>

            <Divider style={styles.modalDivider} />

            {selectedSection.steps.map((step, index) => (
              <View key={step.id} style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, { backgroundColor: selectedSection.color }]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>

                <Text style={styles.stepDescription}>{step.description}</Text>
                <Text style={styles.stepContent}>{step.content}</Text>

                {step.tips && step.tips.length > 0 && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>💡 Tips:</Text>
                    {step.tips.map((tip, tipIndex) => (
                      <Text key={tipIndex} style={styles.tipText}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {step.warnings && step.warnings.length > 0 && (
                  <View style={styles.warningsContainer}>
                    <Text style={styles.warningsTitle}>⚠️ Important:</Text>
                    {step.warnings.map((warning, warningIndex) => (
                      <Text key={warningIndex} style={styles.warningText}>
                        • {warning}
                      </Text>
                    ))}
                  </View>
                )}

                {index < selectedSection.steps.length - 1 && (
                  <Divider style={styles.stepDivider} />
                )}
              </View>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      
      <Animated.View style={[styles.content, animatedContainerStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>User Guide & Help</Text>
            <Text style={styles.subtitle}>
              Everything you need to know about Ordo
            </Text>
          </View>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search guides and help topics..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          icon="magnify"
        />

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {guideCategories.map(category => (
            <Chip
              key={category.id}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.selectedCategoryChip,
              ]}
              textStyle={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.selectedCategoryChipText,
              ]}
              icon={category.icon}
            >
              {category.title}
            </Chip>
          ))}
        </ScrollView>

        {/* Guide Sections */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.sectionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredSections.map(section => (
            <Card
              key={section.id}
              style={styles.sectionCard}
              onPress={() => handleSectionPress(section)}
            >
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Surface style={[styles.sectionIcon, { backgroundColor: section.color }]}>
                    <Icon name={section.icon} size={20} color="#FFFFFF" />
                  </Surface>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionDescription}>{section.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#CCCCCC" />
                </View>
                <View style={styles.sectionMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="clock-outline" size={14} color="#999999" />
                    <Text style={styles.sectionMetaText}>
                      {section.estimatedReadTime} min
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="bookmark-outline" size={14} color="#999999" />
                    <Text style={styles.sectionMetaText}>
                      {section.steps.length} steps
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}

          {filteredSections.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="magnify" size={48} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>No guides found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or category filter
              </Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Need More Help?</Text>
            
            <List.Section>
              <List.Item
                title="Contact Support"
                description="Get personalized help from our team"
                left={props => <List.Icon {...props} icon="email-outline" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={handleContactSupport}
                style={styles.quickActionItem}
              />
              
              <List.Item
                title="Visit FAQ"
                description="Browse frequently asked questions"
                left={props => <List.Icon {...props} icon="help-circle-outline" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={handleVisitFAQ}
                style={styles.quickActionItem}
              />
              
              <List.Item
                title="App Tutorial"
                description="Restart the onboarding tutorial"
                left={props => <List.Icon {...props} icon="play-circle-outline" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {/* Would restart onboarding */}}
                style={styles.quickActionItem}
              />
            </List.Section>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            mode="outlined"
            onPress={onSkip}
            style={styles.skipBottomButton}
            labelStyle={styles.skipBottomButtonLabel}
          >
            Skip for Now
          </Button>
          <Button
            mode="contained"
            onPress={onComplete}
            style={styles.completeButton}
            labelStyle={styles.completeButtonLabel}
          >
            Complete Setup
          </Button>
        </View>
      </Animated.View>

      {renderGuideModal()}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  selectedCategoryChip: {
    backgroundColor: '#2196F3',
  },
  categoryChipText: {
    color: '#666666',
    fontSize: 12,
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
  },
  sectionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  sectionMetaText: {
    fontSize: 11,
    color: '#999999',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
  quickActions: {
    marginTop: 20,
    paddingBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  quickActionItem: {
    backgroundColor: '#F8F9FA',
    marginBottom: 4,
    borderRadius: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  skipBottomButton: {
    flex: 0.4,
    marginRight: 12,
  },
  skipBottomButtonLabel: {
    fontSize: 14,
  },
  completeButton: {
    flex: 0.6,
    backgroundColor: '#4CAF50',
  },
  completeButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
    elevation: 8,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modalDivider: {
    marginBottom: 20,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  stepContent: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 12,
  },
  tipsContainer: {
    backgroundColor: '#F1F8E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#388E3C',
    lineHeight: 18,
    marginBottom: 4,
  },
  warningsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
    marginBottom: 4,
  },
  stepDivider: {
    marginTop: 16,
  },
});

export default UserGuideScreen;
