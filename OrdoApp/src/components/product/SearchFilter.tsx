/**
 * Advanced Search & Filter Components (4時間実装)
 * 
 * 高度な検索・フィルター機能
 * - リアルタイム検索
 * - 複数条件フィルター
 * - ソート機能
 * - 検索履歴
 * - 保存された検索
 * - 音声検索
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  Button,
  TextInput,
  Chip,
  Menu,
  Divider,
  Modal,
  Portal,
  Switch,
  SegmentedButtons,
  useTheme,
  Badge,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types & Models
import { Product, ProductCategory, ProductLocation, FreshnessLevel } from '../../types';
import { SPACING, COLORS } from '../../constants';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface SearchFilterProps {
  products: Product[];
  onResultsChange: (filteredProducts: Product[]) => void;
  onSortChange?: (sortBy: SortOption, sortOrder: SortOrder) => void;
}

export interface FilterCriteria {
  searchText: string;
  categories: ProductCategory[];
  locations: ProductLocation[];
  freshnessLevels: FreshnessLevel[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  quantityRange: {
    min?: number;
    max?: number;
  };
  hasNotes: boolean | null;
  aiRecognized: boolean | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

export type SortOption = 'name' | 'expirationDate' | 'addedDate' | 'category' | 'freshness' | 'quantity';
export type SortOrder = 'asc' | 'desc';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'brand' | 'recent';
  count?: number;
}

interface VoiceSearchResult {
  text: string;
  confidence: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getFreshnessLevel = (expirationDate: Date | string): FreshnessLevel => {
  const now = new Date();
  const expiry = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 1) return 'urgent';
  if (daysUntilExpiry <= 3) return 'warning';
  if (daysUntilExpiry <= 7) return 'moderate';
  return 'fresh';
};

const generateSearchSuggestions = (products: Product[], searchText: string): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = [];
  const searchLower = searchText.toLowerCase();

  // Product name suggestions
  const productNames = new Set<string>();
  products.forEach(product => {
    if (product.name.toLowerCase().includes(searchLower) && !productNames.has(product.name)) {
      productNames.add(product.name);
      suggestions.push({
        id: `product-${product.id}`,
        text: product.name,
        type: 'product',
      });
    }
  });

  // Category suggestions
  const categories = new Set<string>();
  products.forEach(product => {
    const categoryLabel = getCategoryLabel(product.category);
    if (categoryLabel.toLowerCase().includes(searchLower) && !categories.has(product.category)) {
      categories.add(product.category);
      const categoryProducts = products.filter(p => p.category === product.category);
      suggestions.push({
        id: `category-${product.category}`,
        text: categoryLabel,
        type: 'category',
        count: categoryProducts.length,
      });
    }
  });

  // Brand suggestions
  const brands = new Set<string>();
  products.forEach(product => {
    if (product.brand && product.brand.toLowerCase().includes(searchLower) && !brands.has(product.brand)) {
      brands.add(product.brand);
      const brandProducts = products.filter(p => p.brand === product.brand);
      suggestions.push({
        id: `brand-${product.brand}`,
        text: product.brand,
        type: 'brand',
        count: brandProducts.length,
      });
    }
  });

  return suggestions.slice(0, 10);
};

const getCategoryLabel = (category: ProductCategory): string => {
  const labels = {
    fruits: '果物',
    vegetables: '野菜',
    dairy: '乳製品',
    meat: '肉類',
    packaged: '加工食品',
    beverages: '飲み物',
    other: 'その他',
  };
  return labels[category];
};

const getLocationLabel = (location: ProductLocation): string => {
  const labels = {
    fridge: '冷蔵庫',
    pantry: 'パントリー',
    freezer: '冷凍庫',
    counter: 'カウンター',
    other: 'その他',
  };
  return labels[location];
};

const getFreshnessLabel = (level: FreshnessLevel): string => {
  const labels = {
    fresh: '新鮮',
    moderate: '普通',
    warning: '注意',
    urgent: '緊急',
    expired: '期限切れ',
  };
  return labels[level];
};

// =============================================================================
// MAIN SEARCH & FILTER COMPONENT
// =============================================================================

export const AdvancedSearchFilter: React.FC<SearchFilterProps> = ({
  products,
  onResultsChange,
  onSortChange,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Search & Filter State
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    searchText: '',
    categories: [],
    locations: [],
    freshnessLevels: [],
    dateRange: {},
    quantityRange: {},
    hasNotes: null,
    aiRecognized: null,
  });

  // Sort State
  const [sortBy, setSortBy] = useState<SortOption>('expirationDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // UI State
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Voice Search State
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [voiceSearchSupported, setVoiceSearchSupported] = useState(Platform.OS === 'ios');

  // Animation
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const filterBadgeAnimation = useRef(new Animated.Value(0)).current;

  // =============================================================================
  // SEARCH & FILTER LOGIC
  // =============================================================================

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Text search
    if (filterCriteria.searchText.trim()) {
      const searchLower = filterCriteria.searchText.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.notes?.toLowerCase().includes(searchLower) ||
        product.barcode?.includes(searchLower)
      );
    }

    // Category filter
    if (filterCriteria.categories.length > 0) {
      filtered = filtered.filter(product =>
        filterCriteria.categories.includes(product.category)
      );
    }

    // Location filter
    if (filterCriteria.locations.length > 0) {
      filtered = filtered.filter(product =>
        filterCriteria.locations.includes(product.location)
      );
    }

    // Freshness filter
    if (filterCriteria.freshnessLevels.length > 0) {
      filtered = filtered.filter(product => {
        const level = getFreshnessLevel(product.expirationDate);
        return filterCriteria.freshnessLevels.includes(level);
      });
    }

    // Date range filter
    if (filterCriteria.dateRange.start || filterCriteria.dateRange.end) {
      filtered = filtered.filter(product => {
        const expiry = new Date(product.expirationDate);
        if (filterCriteria.dateRange.start && expiry < filterCriteria.dateRange.start) return false;
        if (filterCriteria.dateRange.end && expiry > filterCriteria.dateRange.end) return false;
        return true;
      });
    }

    // Quantity range filter
    if (filterCriteria.quantityRange.min !== undefined || filterCriteria.quantityRange.max !== undefined) {
      filtered = filtered.filter(product => {
        if (!product.quantity) return false;
        if (filterCriteria.quantityRange.min !== undefined && product.quantity < filterCriteria.quantityRange.min) return false;
        if (filterCriteria.quantityRange.max !== undefined && product.quantity > filterCriteria.quantityRange.max) return false;
        return true;
      });
    }

    // Notes filter
    if (filterCriteria.hasNotes !== null) {
      filtered = filtered.filter(product => {
        const hasNotes = !!product.notes && product.notes.trim().length > 0;
        return filterCriteria.hasNotes ? hasNotes : !hasNotes;
      });
    }

    // AI Recognition filter
    if (filterCriteria.aiRecognized !== null) {
      filtered = filtered.filter(product =>
        filterCriteria.aiRecognized ? product.aiRecognized : !product.aiRecognized
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'expirationDate':
          aValue = new Date(a.expirationDate);
          bValue = new Date(b.expirationDate);
          break;
        case 'addedDate':
          aValue = new Date(a.addedDate);
          bValue = new Date(b.addedDate);
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'freshness':
          const aLevel = getFreshnessLevel(a.expirationDate);
          const bLevel = getFreshnessLevel(b.expirationDate);
          const freshnessOrder = ['expired', 'urgent', 'warning', 'moderate', 'fresh'];
          aValue = freshnessOrder.indexOf(aLevel);
          bValue = freshnessOrder.indexOf(bLevel);
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, filterCriteria, sortBy, sortOrder]);

  // Update results when filtered products change
  useEffect(() => {
    onResultsChange(filteredAndSortedProducts);
  }, [filteredAndSortedProducts, onResultsChange]);

  // Update sort callback
  useEffect(() => {
    onSortChange?.(sortBy, sortOrder);
  }, [sortBy, sortOrder, onSortChange]);

  // Generate suggestions when search text changes
  useEffect(() => {
    if (searchText.trim().length > 0) {
      const newSuggestions = generateSearchSuggestions(products, searchText);
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchText, products]);

  // Update filter criteria when search text changes
  useEffect(() => {
    setFilterCriteria(prev => ({ ...prev, searchText }));
  }, [searchText]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.timing(searchBarAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      // Add to recent searches
      const newRecent = [searchText.trim(), ...recentSearches.filter(s => s !== searchText.trim())].slice(0, 10);
      setRecentSearches(newRecent);
    }
    handleSearchBlur();
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setSearchText(suggestion.text);
    handleSearchSubmit();
  };

  const handleClearSearch = () => {
    setSearchText('');
    setFilterCriteria(prev => ({ ...prev, searchText: '' }));
  };

  const handleAdvancedFilterToggle = () => {
    setShowAdvancedFilter(!showAdvancedFilter);
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filterCriteria.categories.length > 0) count++;
    if (filterCriteria.locations.length > 0) count++;
    if (filterCriteria.freshnessLevels.length > 0) count++;
    if (filterCriteria.dateRange.start || filterCriteria.dateRange.end) count++;
    if (filterCriteria.quantityRange.min !== undefined || filterCriteria.quantityRange.max !== undefined) count++;
    if (filterCriteria.hasNotes !== null) count++;
    if (filterCriteria.aiRecognized !== null) count++;
    return count;
  };

  const handleClearAllFilters = () => {
    setFilterCriteria({
      searchText: '',
      categories: [],
      locations: [],
      freshnessLevels: [],
      dateRange: {},
      quantityRange: {},
      hasNotes: null,
      aiRecognized: null,
    });
    setSearchText('');
  };

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) {
      Alert.alert('エラー', '検索名を入力してください');
      return;
    }

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName.trim(),
      criteria: { ...filterCriteria },
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1,
    };

    setSavedSearches(prev => [...prev, newSavedSearch]);
    setSaveSearchName('');
    setShowSaveSearchDialog(false);
  };

  const handleLoadSavedSearch = (savedSearch: SavedSearch) => {
    setFilterCriteria(savedSearch.criteria);
    setSearchText(savedSearch.criteria.searchText);
    
    // Update last used
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === savedSearch.id
          ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
          : s
      )
    );
  };

  const handleVoiceSearch = async () => {
    if (!voiceSearchSupported) {
      Alert.alert('音声検索', 'この端末では音声検索がサポートされていません');
      return;
    }

    setIsVoiceSearching(true);
    try {
      // Simulate voice recognition
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: VoiceSearchResult = {
        text: 'りんご',
        confidence: 0.95,
      };
      
      setSearchText(mockResult.text);
      handleSearchSubmit();
    } catch (error) {
      Alert.alert('エラー', '音声認識に失敗しました');
    } finally {
      setIsVoiceSearching(false);
    }
  };

  // =============================================================================
  // RENDER SEARCH BAR
  // =============================================================================

  const renderSearchBar = () => (
    <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
      <View style={styles.searchInputContainer}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onSubmitEditing={handleSearchSubmit}
          placeholder="商品を検索..."
          left={<TextInput.Icon icon="magnify" />}
          right={
            <View style={styles.searchActions}>
              {searchText.length > 0 && (
                <TextInput.Icon icon="close" onPress={handleClearSearch} />
              )}
              <TextInput.Icon
                icon={isVoiceSearching ? 'microphone' : 'microphone-outline'}
                onPress={handleVoiceSearch}
                style={isVoiceSearching ? { color: COLORS.ERROR } : undefined}
              />
            </View>
          }
          style={styles.searchInput}
        />
      </View>

      <View style={styles.searchFilters}>
        <Button
          mode={showAdvancedFilter ? 'contained' : 'outlined'}
          icon="filter-variant"
          onPress={handleAdvancedFilterToggle}
          style={styles.filterButton}
          contentStyle={styles.filterButtonContent}
        >
          フィルター
          {getActiveFilterCount() > 0 && (
            <Badge style={styles.filterBadge}>{getActiveFilterCount()}</Badge>
          )}
        </Button>

        <Menu
          visible={showSortMenu}
          onDismiss={() => setShowSortMenu(false)}
          anchor={
            <Button
              mode="outlined"
              icon={sortOrder === 'asc' ? 'sort-ascending' : 'sort-descending'}
              onPress={() => setShowSortMenu(true)}
              style={styles.sortButton}
              contentStyle={styles.sortButtonContent}
            >
              並び替え
            </Button>
          }
        >
          <Menu.Item
            onPress={() => { setSortBy('expirationDate'); setShowSortMenu(false); }}
            title="消費期限"
            leadingIcon={sortBy === 'expirationDate' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => { setSortBy('name'); setShowSortMenu(false); }}
            title="商品名"
            leadingIcon={sortBy === 'name' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => { setSortBy('addedDate'); setShowSortMenu(false); }}
            title="登録日"
            leadingIcon={sortBy === 'addedDate' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => { setSortBy('category'); setShowSortMenu(false); }}
            title="カテゴリ"
            leadingIcon={sortBy === 'category' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => { setSortBy('freshness'); setShowSortMenu(false); }}
            title="新鮮度"
            leadingIcon={sortBy === 'freshness' ? 'check' : undefined}
          />
          <Divider />
          <Menu.Item
            onPress={() => {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              setShowSortMenu(false);
            }}
            title={sortOrder === 'asc' ? '降順' : '昇順'}
            leadingIcon={sortOrder === 'asc' ? 'sort-ascending' : 'sort-descending'}
          />
        </Menu>
      </View>

      {(getActiveFilterCount() > 0 || searchText.length > 0) && (
        <View style={styles.activeFiltersContainer}>
          <Button
            mode="text"
            icon="close"
            onPress={handleClearAllFilters}
            style={styles.clearFiltersButton}
            textColor={COLORS.ERROR}
          >
            すべてクリア
          </Button>
        </View>
      )}
    </Surface>
  );

  // =============================================================================
  // RENDER SUGGESTIONS
  // =============================================================================

  const renderSuggestions = () => {
    if (!isSearchFocused || (suggestions.length === 0 && recentSearches.length === 0)) {
      return null;
    }

    return (
      <Surface style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface }]} elevation={3}>
        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsSectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              候補
            </Text>
            {suggestions.map((suggestion) => (
              <Surface
                key={suggestion.id}
                style={styles.suggestionItem}
                onTouchStart={() => handleSuggestionPress(suggestion)}
              >
                <Icon
                  name={
                    suggestion.type === 'product' ? 'shopping-cart' :
                    suggestion.type === 'category' ? 'category' :
                    suggestion.type === 'brand' ? 'business' : 'history'
                  }
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.suggestionText, { color: theme.colors.onSurface }]}>
                  {suggestion.text}
                </Text>
                {suggestion.count && (
                  <Badge style={styles.suggestionBadge}>{suggestion.count}</Badge>
                )}
              </Surface>
            ))}
          </View>
        )}

        {recentSearches.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsSectionTitle, { color: theme.colors.onSurfaceVariant }]}>
              最近の検索
            </Text>
            {recentSearches.slice(0, 5).map((search, index) => (
              <Surface
                key={index}
                style={styles.suggestionItem}
                onTouchStart={() => setSearchText(search)}
              >
                <Icon name="history" size={20} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.suggestionText, { color: theme.colors.onSurface }]}>
                  {search}
                </Text>
              </Surface>
            ))}
          </View>
        )}
      </Surface>
    );
  };

  // =============================================================================
  // RENDER ADVANCED FILTERS
  // =============================================================================

  const renderAdvancedFilters = () => {
    if (!showAdvancedFilter) return null;

    return (
      <Card style={[styles.advancedFiltersCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              カテゴリ
            </Text>
            <View style={styles.chipContainer}>
              {(['fruits', 'vegetables', 'dairy', 'meat', 'packaged', 'beverages', 'other'] as ProductCategory[]).map((category) => (
                <Chip
                  key={category}
                  selected={filterCriteria.categories.includes(category)}
                  onPress={() => {
                    setFilterCriteria(prev => ({
                      ...prev,
                      categories: prev.categories.includes(category)
                        ? prev.categories.filter(c => c !== category)
                        : [...prev.categories, category],
                    }));
                  }}
                  style={styles.filterChip}
                >
                  {getCategoryLabel(category)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              保存場所
            </Text>
            <View style={styles.chipContainer}>
              {(['fridge', 'pantry', 'freezer', 'counter', 'other'] as ProductLocation[]).map((location) => (
                <Chip
                  key={location}
                  selected={filterCriteria.locations.includes(location)}
                  onPress={() => {
                    setFilterCriteria(prev => ({
                      ...prev,
                      locations: prev.locations.includes(location)
                        ? prev.locations.filter(l => l !== location)
                        : [...prev.locations, location],
                    }));
                  }}
                  style={styles.filterChip}
                >
                  {getLocationLabel(location)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              新鮮度
            </Text>
            <View style={styles.chipContainer}>
              {(['fresh', 'moderate', 'warning', 'urgent', 'expired'] as FreshnessLevel[]).map((level) => (
                <Chip
                  key={level}
                  selected={filterCriteria.freshnessLevels.includes(level)}
                  onPress={() => {
                    setFilterCriteria(prev => ({
                      ...prev,
                      freshnessLevels: prev.freshnessLevels.includes(level)
                        ? prev.freshnessLevels.filter(l => l !== level)
                        : [...prev.freshnessLevels, level],
                    }));
                  }}
                  style={styles.filterChip}
                >
                  {getFreshnessLabel(level)}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              その他の条件
            </Text>
            
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                メモあり
              </Text>
              <Switch
                value={filterCriteria.hasNotes === true}
                onValueChange={(value) => {
                  setFilterCriteria(prev => ({
                    ...prev,
                    hasNotes: value ? true : null,
                  }));
                }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
                AI認識商品
              </Text>
              <Switch
                value={filterCriteria.aiRecognized === true}
                onValueChange={(value) => {
                  setFilterCriteria(prev => ({
                    ...prev,
                    aiRecognized: value ? true : null,
                  }));
                }}
              />
            </View>
          </View>

          <View style={styles.filterActions}>
            <Button
              mode="outlined"
              onPress={() => setShowSaveSearchDialog(true)}
              style={styles.actionButton}
              disabled={getActiveFilterCount() === 0}
            >
              検索を保存
            </Button>
            
            <Button
              mode="text"
              onPress={handleClearAllFilters}
              style={styles.actionButton}
              textColor={COLORS.ERROR}
              disabled={getActiveFilterCount() === 0}
            >
              クリア
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // =============================================================================
  // RENDER SAVED SEARCHES
  // =============================================================================

  const renderSavedSearches = () => {
    if (savedSearches.length === 0) return null;

    return (
      <Card style={[styles.savedSearchesCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            保存済み検索
          </Text>
          
          {savedSearches.map((savedSearch) => (
            <Surface
              key={savedSearch.id}
              style={[styles.savedSearchItem, { backgroundColor: theme.colors.surfaceVariant }]}
              onTouchStart={() => handleLoadSavedSearch(savedSearch)}
            >
              <View style={styles.savedSearchContent}>
                <Text style={[styles.savedSearchName, { color: theme.colors.onSurface }]}>
                  {savedSearch.name}
                </Text>
                <Text style={[styles.savedSearchInfo, { color: theme.colors.onSurfaceVariant }]}>
                  使用回数: {savedSearch.useCount} | 最終使用: {savedSearch.lastUsed.toLocaleDateString('ja-JP')}
                </Text>
              </View>
              <IconButton
                icon="delete"
                size={20}
                onPress={() => {
                  setSavedSearches(prev => prev.filter(s => s.id !== savedSearch.id));
                }}
                iconColor={COLORS.ERROR}
              />
            </Surface>
          ))}
        </Card.Content>
      </Card>
    );
  };

  // =============================================================================
  // RENDER RESULTS SUMMARY
  // =============================================================================

  const renderResultsSummary = () => (
    <View style={styles.resultsSummary}>
      <Text style={[styles.resultsText, { color: theme.colors.onSurfaceVariant }]}>
        {filteredAndSortedProducts.length}件の商品が見つかりました
      </Text>
    </View>
  );

  // =============================================================================
  // RENDER MAIN COMPONENT
  // =============================================================================

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderSuggestions()}
      {renderAdvancedFilters()}
      {renderSavedSearches()}
      {renderResultsSummary()}

      {/* Save Search Dialog */}
      <Portal>
        <Modal
          visible={showSaveSearchDialog}
          onDismiss={() => setShowSaveSearchDialog(false)}
          contentContainerStyle={[styles.saveSearchModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            検索を保存
          </Text>
          
          <TextInput
            label="検索名"
            value={saveSearchName}
            onChangeText={setSaveSearchName}
            style={styles.saveSearchInput}
          />
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowSaveSearchDialog(false)}
              style={styles.modalButton}
            >
              キャンセル
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveSearch}
              style={styles.modalButton}
            >
              保存
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Search Bar Styles
  searchContainer: {
    margin: SPACING.MD,
    borderRadius: 12,
    padding: SPACING.MD,
  },

  searchInputContainer: {
    marginBottom: SPACING.SM,
  },

  searchInput: {
    backgroundColor: 'transparent',
  },

  searchActions: {
    flexDirection: 'row',
  },

  searchFilters: {
    flexDirection: 'row',
    gap: SPACING.SM,
    alignItems: 'center',
  },

  filterButton: {
    flex: 1,
  },

  filterButtonContent: {
    paddingVertical: SPACING.XS,
  },

  filterBadge: {
    marginLeft: SPACING.XS,
  },

  sortButton: {
    minWidth: 120,
  },

  sortButtonContent: {
    paddingVertical: SPACING.XS,
  },

  activeFiltersContainer: {
    marginTop: SPACING.SM,
    alignItems: 'flex-end',
  },

  clearFiltersButton: {
    margin: 0,
  },

  // Suggestions Styles
  suggestionsContainer: {
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
    borderRadius: 12,
    maxHeight: 300,
  },

  suggestionsSection: {
    padding: SPACING.MD,
  },

  suggestionsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.SM,
    textTransform: 'uppercase',
  },

  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.XS,
  },

  suggestionText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: 14,
  },

  suggestionBadge: {
    marginLeft: SPACING.SM,
  },

  // Advanced Filters Styles
  advancedFiltersCard: {
    margin: SPACING.MD,
    borderRadius: 12,
  },

  filterSection: {
    marginBottom: SPACING.LG,
  },

  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.XS,
  },

  filterChip: {
    marginBottom: SPACING.XS,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },

  switchLabel: {
    fontSize: 14,
  },

  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },

  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.XS,
  },

  // Saved Searches Styles
  savedSearchesCard: {
    margin: SPACING.MD,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  savedSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.SM,
  },

  savedSearchContent: {
    flex: 1,
  },

  savedSearchName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },

  savedSearchInfo: {
    fontSize: 12,
  },

  // Results Summary Styles
  resultsSummary: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.SM,
  },

  resultsText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Modal Styles
  saveSearchModal: {
    margin: SPACING.XL,
    padding: SPACING.LG,
    borderRadius: 12,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },

  saveSearchInput: {
    marginBottom: SPACING.LG,
  },

  modalActions: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  modalButton: {
    flex: 1,
  },
});

export default AdvancedSearchFilter;
