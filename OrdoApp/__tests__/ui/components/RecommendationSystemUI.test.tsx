/**
 * RecommendationSystemUI Snapshot Tests
 * レコメンデーションシステムUIのスナップショットテスト
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import RecommendationSystemUI from '../../../src/components/RecommendationSystemUI';

// Mock services
jest.mock('../../../src/services/PredictiveAlgorithmService', () => ({
  predictiveAlgorithmService: {
    generatePurchasePredictions: jest.fn(() => Promise.resolve([])),
    generateSmartShoppingList: jest.fn(() => Promise.resolve([])),
    getUserProfile: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('../../../src/services/UsageAnalyticsEngine', () => ({
  usageAnalyticsEngine: {
    getAnalytics: jest.fn(() => Promise.resolve({
      totalProducts: 10,
      totalUsage: 25,
      averageUsagePerProduct: 2.5,
      topCategories: [],
      usageByTimeOfDay: {},
      usageByDayOfWeek: {},
      seasonalTrends: {},
    })),
    getConsumptionPatterns: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../../../src/services/LearningDataAccumulationService', () => ({
  learningDataAccumulationService: {
    recordUserFeedback: jest.fn(() => Promise.resolve()),
    getModelPerformanceMetrics: jest.fn(() => Promise.resolve({})),
  },
}));

const renderWithProvider = (component) => {
  return render(
    <PaperProvider>
      {component}
    </PaperProvider>
  );
};

describe('RecommendationSystemUI Snapshots', () => {
  const defaultProps = {
    onAddToCart: jest.fn(),
    onDismissRecommendation: jest.fn(),
    onConfigureSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Snapshots', () => {
    test('should match snapshot in initial state', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      expect(toJSON()).toMatchSnapshot('recommendation-system-initial');
    });

    test('should match snapshot with loading state', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          isLoading={true}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('recommendation-system-loading');
    });

    test('should match snapshot with error state', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          error="Failed to load recommendations"
        />
      );
      
      expect(toJSON()).toMatchSnapshot('recommendation-system-error');
    });
  });

  describe('Tab Snapshots', () => {
    test('should match snapshot for recommendations tab', async () => {
      const { toJSON, getByText } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      // Wait for initial render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(toJSON()).toMatchSnapshot('recommendations-tab');
    });

    test('should match snapshot for analytics tab', async () => {
      const { toJSON, getByText } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      // Switch to analytics tab
      const analyticsTab = getByText('Analytics');
      analyticsTab.props.onPress();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(toJSON()).toMatchSnapshot('analytics-tab');
    });

    test('should match snapshot for shopping list tab', async () => {
      const { toJSON, getByText } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      // Switch to shopping list tab
      const shoppingTab = getByText('Shopping List');
      shoppingTab.props.onPress();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(toJSON()).toMatchSnapshot('shopping-list-tab');
    });
  });

  describe('Data State Snapshots', () => {
    test('should match snapshot with recommendation data', () => {
      // Mock data
      const mockRecommendations = [
        {
          id: '1',
          productName: 'りんご',
          confidence: 0.9,
          reason: 'よく購入される商品です',
          category: 'fruits',
          estimatedPrice: 200,
        },
        {
          id: '2',
          productName: 'バナナ',
          confidence: 0.8,
          reason: '在庫が少なくなっています',
          category: 'fruits',
          estimatedPrice: 150,
        },
      ];
      
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          recommendations={mockRecommendations}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('recommendations-with-data');
    });

    test('should match snapshot with analytics data', () => {
      const mockAnalytics = {
        totalProducts: 15,
        totalUsage: 50,
        averageUsagePerProduct: 3.3,
        topCategories: [
          { name: 'fruits', count: 20 },
          { name: 'vegetables', count: 15 },
        ],
        usageByTimeOfDay: {
          morning: 10,
          afternoon: 15,
          evening: 25,
        },
        seasonalTrends: {
          spring: 0.8,
          summer: 1.2,
          autumn: 1.0,
          winter: 0.9,
        },
      };
      
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          analytics={mockAnalytics}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('analytics-with-data');
    });

    test('should match snapshot with shopping list data', () => {
      const mockShoppingList = [
        {
          id: '1',
          productName: 'りんご',
          quantity: 3,
          priority: 'high',
          estimatedPrice: 600,
          category: 'fruits',
        },
        {
          id: '2',
          productName: 'パン',
          quantity: 1,
          priority: 'medium',
          estimatedPrice: 200,
          category: 'bakery',
        },
      ];
      
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          shoppingList={mockShoppingList}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('shopping-list-with-data');
    });
  });

  describe('Interactive State Snapshots', () => {
    test('should match snapshot when recommendation is selected', async () => {
      const mockRecommendations = [
        {
          id: '1',
          productName: 'りんご',
          confidence: 0.9,
          reason: 'よく購入される商品です',
          category: 'fruits',
          estimatedPrice: 200,
        },
      ];
      
      const { toJSON, getByTestId } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          recommendations={mockRecommendations}
        />
      );
      
      // Simulate selecting a recommendation
      const recommendationItem = getByTestId('recommendation-item-1');
      recommendationItem.props.onPress();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(toJSON()).toMatchSnapshot('recommendation-selected');
    });

    test('should match snapshot with settings modal open', async () => {
      const { toJSON, getByTestId } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      // Open settings modal
      const settingsButton = getByTestId('settings-button');
      settingsButton.props.onPress();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(toJSON()).toMatchSnapshot('settings-modal-open');
    });
  });

  describe('Responsive Design Snapshots', () => {
    test('should match snapshot on different screen sizes', () => {
      // Mock different screen dimensions
      const originalDimensions = require('react-native').Dimensions.get;
      
      // Test tablet size
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 768,
        height: 1024,
      }));
      
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      expect(toJSON()).toMatchSnapshot('tablet-layout');
      
      // Restore original dimensions
      require('react-native').Dimensions.get = originalDimensions;
    });

    test('should match snapshot in landscape orientation', () => {
      // Mock landscape dimensions
      const originalDimensions = require('react-native').Dimensions.get;
      
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 812,
        height: 375,
      }));
      
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI {...defaultProps} />
      );
      
      expect(toJSON()).toMatchSnapshot('landscape-layout');
      
      // Restore original dimensions
      require('react-native').Dimensions.get = originalDimensions;
    });
  });

  describe('Theme Snapshots', () => {
    test('should match snapshot with light theme', () => {
      const lightTheme = {
        colors: {
          primary: '#6200ee',
          surface: '#ffffff',
          background: '#f6f6f6',
          text: '#000000',
        },
      };
      
      const { toJSON } = render(
        <PaperProvider theme={lightTheme}>
          <RecommendationSystemUI {...defaultProps} />
        </PaperProvider>
      );
      
      expect(toJSON()).toMatchSnapshot('light-theme');
    });

    test('should match snapshot with dark theme', () => {
      const darkTheme = {
        colors: {
          primary: '#bb86fc',
          surface: '#121212',
          background: '#000000',
          text: '#ffffff',
        },
      };
      
      const { toJSON } = render(
        <PaperProvider theme={darkTheme}>
          <RecommendationSystemUI {...defaultProps} />
        </PaperProvider>
      );
      
      expect(toJSON()).toMatchSnapshot('dark-theme');
    });
  });

  describe('Empty State Snapshots', () => {
    test('should match snapshot with no recommendations', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          recommendations={[]}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('no-recommendations');
    });

    test('should match snapshot with no analytics data', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          analytics={null}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('no-analytics');
    });

    test('should match snapshot with empty shopping list', () => {
      const { toJSON } = renderWithProvider(
        <RecommendationSystemUI 
          {...defaultProps}
          shoppingList={[]}
        />
      );
      
      expect(toJSON()).toMatchSnapshot('empty-shopping-list');
    });
  });
});
