import React from 'react';
import { UserGuideScreen } from '../../src/screens/onboarding/UserGuideScreen';
import {
  renderScreen,
  fireEvents,
  waitForAsync,
  mockNavigation,
  assertions,
  testSetup,
} from '../utils/testHelpers';
import { mockUserGuideData } from '../fixtures/onboardingData';

// Mock search functionality
const mockSearchService = {
  searchGuides: jest.fn(),
  getPopularGuides: jest.fn(),
  getCategoryGuides: jest.fn(),
};

jest.mock('../../src/services/SearchService', () => ({
  SearchService: {
    getInstance: () => mockSearchService,
  },
}));

describe('UserGuideScreen', () => {
  let navigation;

  beforeEach(() => {
    testSetup.beforeEach();
    navigation = mockNavigation.create();
    
    // Setup default mock responses
    mockSearchService.searchGuides.mockResolvedValue(mockUserGuideData.searchResults);
    mockSearchService.getPopularGuides.mockResolvedValue(mockUserGuideData.popularGuides);
    mockSearchService.getCategoryGuides.mockResolvedValue(mockUserGuideData.categoryGuides);
  });

  afterEach(() => {
    testSetup.afterEach();
  });

  describe('Rendering', () => {
    it('should render user guide screen with title', () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      assertions.toBeVisible(getByText('User Guide'));
    });

    it('should render search functionality', () => {
      const { getByPlaceholderText } = renderScreen(UserGuideScreen, { navigation });
      
      assertions.toBeVisible(getByPlaceholderText('Search guides...'));
    });

    it('should render category tabs', () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      assertions.toBeVisible(getByText('Getting Started'));
      assertions.toBeVisible(getByText('Camera'));
      assertions.toBeVisible(getByText('Organization'));
      assertions.toBeVisible(getByText('Advanced'));
    });

    it('should render popular guides section', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Popular Guides'));
      });
    });
  });

  describe('Search Functionality', () => {
    it('should perform search on text input', async () => {
      const { getByPlaceholderText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'camera');
      
      await waitForAsync(() => {
        expect(mockSearchService.searchGuides).toHaveBeenCalledWith('camera');
      });
    });

    it('should display search results', async () => {
      const { getByPlaceholderText, getByText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'photo');
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('How to take better photos'));
      });
    });

    it('should clear search results', async () => {
      const { getByPlaceholderText, getByTestId, queryByText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'photo');
      
      await waitForAsync(() => {
        const clearButton = getByTestId('clear-search');
        fireEvents.press(clearButton);
      });
      
      expect(queryByText('How to take better photos')).toBeNull();
    });

    it('should handle empty search results', async () => {
      mockSearchService.searchGuides.mockResolvedValue([]);
      
      const { getByPlaceholderText, getByText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'nonexistent');
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('No guides found'));
      });
    });
  });

  describe('Category Navigation', () => {
    it('should switch between categories', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Camera'));
      
      expect(mockSearchService.getCategoryGuides).toHaveBeenCalledWith('camera');
    });

    it('should display category-specific content', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Organization'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Organizing Your Photos'));
      });
    });

    it('should maintain active category state', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      const cameraTab = getByText('Camera');
      await fireEvents.pressAndWait(cameraTab);
      
      // Tab should be marked as active
      expect(cameraTab.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: expect.any(String) })
      );
    });
  });

  describe('Guide Content Display', () => {
    it('should render guide items with titles and descriptions', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Getting Started with Ordo'));
        assertions.toBeVisible(getByText('Learn the basics of using the app'));
      });
    });

    it('should show guide difficulty levels', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Beginner'));
        assertions.toBeVisible(getByText('Intermediate'));
      });
    });

    it('should display estimated reading time', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('5 min read'));
      });
    });

    it('should show guide completion status', async () => {
      const { getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        const completedGuide = getByTestId('guide-completed-indicator');
        assertions.toBeVisible(completedGuide);
      });
    });
  });

  describe('Guide Interaction', () => {
    it('should navigate to guide detail on tap', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Getting Started with Ordo'));
      });
      
      mockNavigation.expectNavigate(navigation, 'GuideDetailScreen', {
        guideId: 'getting-started',
      });
    });

    it('should bookmark guides', async () => {
      const { getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        const bookmarkButton = getByTestId('bookmark-button-getting-started');
        fireEvents.press(bookmarkButton);
      });
      
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('bookmarked_guides', expect.any(String));
    });

    it('should share guides', async () => {
      const { getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        const shareButton = getByTestId('share-button-getting-started');
        fireEvents.press(shareButton);
      });
      
      expect(require('react-native').Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Getting Started with Ordo'),
      });
    });
  });

  describe('Onboarding Integration', () => {
    it('should complete onboarding when guide accessed', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Finish Onboarding'));
      });
      
      mockNavigation.expectNavigate(navigation, 'MainApp');
    });

    it('should save onboarding completion state', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Finish Onboarding'));
      
      expect(require('@react-native-async-storage/async-storage').setItem)
        .toHaveBeenCalledWith('onboarding_completed', 'true');
    });

    it('should track guide usage analytics', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Getting Started with Ordo'));
      });
      
      // Analytics should be tracked
      expect(global.mockAnalytics.track).toHaveBeenCalledWith('guide_accessed', {
        guideId: 'getting-started',
        category: 'getting-started',
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching guides', () => {
      mockSearchService.getPopularGuides.mockReturnValue(new Promise(() => {}));
      
      const { getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      assertions.toBeVisible(getByTestId('loading-indicator'));
    });

    it('should hide loading indicator after data loads', async () => {
      const { queryByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        expect(queryByTestId('loading-indicator')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle search service errors', async () => {
      mockSearchService.searchGuides.mockRejectedValue(new Error('Search failed'));
      
      const { getByPlaceholderText, getByText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'test');
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Search failed. Please try again.'));
      });
    });

    it('should handle category loading errors', async () => {
      mockSearchService.getCategoryGuides.mockRejectedValue(new Error('Network error'));
      
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await fireEvents.pressAndWait(getByText('Camera'));
      
      await waitForAsync(() => {
        assertions.toBeVisible(getByText('Failed to load guides'));
      });
    });

    it('should provide retry functionality', async () => {
      mockSearchService.getPopularGuides
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockUserGuideData.popularGuides);
      
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        fireEvents.press(getByText('Retry'));
      });
      
      expect(mockSearchService.getPopularGuides).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderScreen(UserGuideScreen, { navigation });
      
      assertions.toBeVisible(getByLabelText('Search user guides'));
      assertions.toBeVisible(getByLabelText('Guide categories'));
    });

    it('should support screen reader navigation', async () => {
      const { getByText } = renderScreen(UserGuideScreen, { navigation });
      
      const guideItem = getByText('Getting Started with Ordo');
      expect(guideItem.props.accessibilityHint).toContain('Double tap to open guide');
    });

    it('should announce search results to screen readers', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      fireEvents.changeText(searchInput, 'camera');
      
      await waitForAsync(() => {
        const resultsAnnouncement = getByTestId('search-results-announcement');
        expect(resultsAnnouncement.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('Performance', () => {
    it('should render guide list efficiently', async () => {
      const startTime = performance.now();
      
      renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(150);
      });
    });

    it('should implement virtual scrolling for large lists', async () => {
      // Mock large dataset
      const largeGuideList = Array.from({ length: 100 }, (_, i) => ({
        id: `guide-${i}`,
        title: `Guide ${i}`,
        description: `Description ${i}`,
      }));
      
      mockSearchService.getPopularGuides.mockResolvedValue(largeGuideList);
      
      const { getByTestId } = renderScreen(UserGuideScreen, { navigation });
      
      await waitForAsync(() => {
        const virtualizedList = getByTestId('virtualized-guide-list');
        assertions.toBeVisible(virtualizedList);
      });
    });

    it('should debounce search input', async () => {
      const { getByPlaceholderText } = renderScreen(UserGuideScreen, { navigation });
      
      const searchInput = getByPlaceholderText('Search guides...');
      
      // Rapid typing
      fireEvents.changeText(searchInput, 'c');
      fireEvents.changeText(searchInput, 'ca');
      fireEvents.changeText(searchInput, 'cam');
      fireEvents.changeText(searchInput, 'came');
      fireEvents.changeText(searchInput, 'camera');
      
      await waitForAsync(() => {
        // Should only call search once after debounce delay
        expect(mockSearchService.searchGuides).toHaveBeenCalledTimes(1);
        expect(mockSearchService.searchGuides).toHaveBeenCalledWith('camera');
      });
    });
  });
});
