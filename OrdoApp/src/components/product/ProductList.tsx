/**
 * Product List Component (8時間実装)
 * 
 * 包括的な商品一覧表示コンポーネント
 * - グリッド/リスト表示切り替え
 * - ソート・フィルタリング
 * - インタラクティブな商品管理
 * - レスポンシブデザイン
 * - パフォーマンス最適化
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  Chip,
  FAB,
  useTheme,
  Menu,
  Divider,
  ProgressBar,
  Badge,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types & Models
import { Product, ProductCategory } from '../../types';
import { SPACING, COLORS } from '../../constants';
import { useBreakpoint } from '../../design-system/Responsive';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ProductListProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  onProductEdit?: (product: Product) => void;
  onProductDelete?: (productId: string) => void;
  onAddProduct?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showAddFab?: boolean;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  viewMode?: 'grid' | 'list';
  sortBy?: ProductSortOption;
  filterBy?: ProductFilter;
  emptyStateMessage?: string;
}

export type ProductSortOption = 
  | 'name' 
  | 'expirationDate' 
  | 'category' 
  | 'addedDate' 
  | 'freshness';

export interface ProductFilter {
  category?: ProductCategory;
  freshness?: 'fresh' | 'good' | 'warning' | 'expired';
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

interface ProductItemProps {
  product: Product;
  viewMode: 'grid' | 'list';
  onPress: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  showActions?: boolean;
}

// =============================================================================
// PRODUCT ITEM COMPONENT
// =============================================================================

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  viewMode,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const getFreshnessInfo = useCallback(() => {
    const today = new Date();
    const expirationDate = new Date(product.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      return { status: 'expired', color: COLORS.ERROR, text: '期限切れ', icon: 'warning' };
    } else if (daysUntilExpiration <= 1) {
      return { status: 'warning', color: COLORS.WARNING, text: '要注意', icon: 'schedule' };
    } else if (daysUntilExpiration <= 3) {
      return { status: 'good', color: COLORS.SECONDARY, text: '注意', icon: 'access_time' };
    } else {
      return { status: 'fresh', color: COLORS.SUCCESS, text: '新鮮', icon: 'check_circle' };
    }
  }, [product.expirationDate]);

  const handleMenuAction = useCallback((action: string) => {
    setMenuVisible(false);
    
    switch (action) {
      case 'edit':
        onEdit?.(product);
        break;
      case 'delete':
        Alert.alert(
          '削除確認',
          `「${product.name}」を削除しますか？`,
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '削除', 
              style: 'destructive',
              onPress: () => onDelete?.(product.id)
            },
          ]
        );
        break;
    }
  }, [product, onEdit, onDelete]);

  const freshnessInfo = getFreshnessInfo();
  const imageUri = product.imageUri || 'https://via.placeholder.com/150?text=No+Image';

  if (viewMode === 'grid') {
    return (
      <Animated.View
        style={[
          styles.gridItem,
          {
            opacity: animatedValue,
            transform: [{
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            }],
          },
        ]}
      >
        <Card
          style={[styles.productCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => onPress(product)}
          elevation={2}
        >
          <View style={styles.cardHeader}>
            <Image
              source={{ uri: imageError ? 'https://via.placeholder.com/150?text=No+Image' : imageUri }}
              style={styles.productImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
            
            {/* Freshness Badge */}
            <View style={[styles.freshnessBadge, { backgroundColor: freshnessInfo.color }]}>
              <Icon name={freshnessInfo.icon} size={16} color="white" />
            </View>

            {/* Actions Menu */}
            {showActions && (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="more-vert"
                    size={20}
                    style={styles.menuButton}
                    onPress={() => setMenuVisible(true)}
                  />
                }
              >
                <Menu.Item onPress={() => handleMenuAction('edit')} title="編集" />
                <Menu.Item onPress={() => handleMenuAction('delete')} title="削除" />
              </Menu>
            )}
          </View>

          <Card.Content style={styles.cardContent}>
            <Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {product.name}
            </Text>
            
            <View style={styles.productMeta}>
              <Chip
                mode="outlined"
                compact
                style={styles.categoryChip}
                textStyle={styles.chipText}
              >
                {product.category}
              </Chip>
              
              <Text style={[styles.expirationDate, { color: freshnessInfo.color }]}>
                {new Date(product.expirationDate).toLocaleDateString('ja-JP')}
              </Text>
            </View>

            {product.quantity && (
              <Text style={[styles.quantity, { color: theme.colors.onSurfaceVariant }]}>
                数量: {product.quantity}
              </Text>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  }

  // List view
  return (
    <Animated.View
      style={[
        styles.listItem,
        {
          opacity: animatedValue,
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <Card
        style={[styles.listCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onPress(product)}
        elevation={1}
      >
        <View style={styles.listCardContent}>
          <Image
            source={{ uri: imageError ? 'https://via.placeholder.com/80?text=No+Image' : imageUri }}
            style={styles.listProductImage}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />

          <View style={styles.listProductInfo}>
            <Text style={[styles.listProductName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {product.name}
            </Text>
            
            <View style={styles.listProductMeta}>
              <Chip
                mode="outlined"
                compact
                style={styles.listCategoryChip}
                textStyle={styles.listChipText}
              >
                {product.category}
              </Chip>
              
              <View style={styles.freshnessContainer}>
                <Icon name={freshnessInfo.icon} size={16} color={freshnessInfo.color} />
                <Text style={[styles.freshnessText, { color: freshnessInfo.color }]}>
                  {freshnessInfo.text}
                </Text>
              </View>
            </View>

            <Text style={[styles.listExpirationDate, { color: theme.colors.onSurfaceVariant }]}>
              期限: {new Date(product.expirationDate).toLocaleDateString('ja-JP')}
            </Text>
          </View>

          {showActions && (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="more-vert"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item onPress={() => handleMenuAction('edit')} title="編集" />
              <Menu.Item onPress={() => handleMenuAction('delete')} title="削除" />
            </Menu>
          )}
        </View>
      </Card>
    </Animated.View>
  );
};

// =============================================================================
// MAIN PRODUCT LIST COMPONENT
// =============================================================================

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onProductPress,
  onProductEdit,
  onProductDelete,
  onAddProduct,
  onRefresh,
  isLoading = false,
  showAddFab = true,
  enableSearch = true,
  enableFiltering = true,
  viewMode: initialViewMode = 'grid',
  sortBy: initialSortBy = 'addedDate',
  filterBy: initialFilterBy = {},
  emptyStateMessage = '商品が見つかりません',
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [sortBy, setSortBy] = useState<ProductSortOption>(initialSortBy);
  const [filterBy, setFilterBy] = useState<ProductFilter>(initialFilterBy);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Calculate grid columns based on screen size
  const numColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    switch (breakpoint) {
      case 'xs': return 2;
      case 'sm': return 2;
      case 'md': return 3;
      case 'lg': return 4;
      default: return 2;
    }
  }, [viewMode, breakpoint]);

  // Sort and filter products
  const processedProducts = useMemo(() => {
    let filtered = [...products];

    // Apply filters
    if (filterBy.category) {
      filtered = filtered.filter(p => p.category === filterBy.category);
    }

    if (filterBy.freshness) {
      filtered = filtered.filter(p => {
        const today = new Date();
        const expirationDate = new Date(p.expirationDate);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterBy.freshness) {
          case 'expired': return daysUntilExpiration < 0;
          case 'warning': return daysUntilExpiration >= 0 && daysUntilExpiration <= 1;
          case 'good': return daysUntilExpiration > 1 && daysUntilExpiration <= 3;
          case 'fresh': return daysUntilExpiration > 3;
          default: return true;
        }
      });
    }

    if (filterBy.searchQuery) {
      const query = filterBy.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expirationDate':
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        case 'category':
          return a.category.localeCompare(b.category);
        case 'addedDate':
          return new Date(b.addedDate || '').getTime() - new Date(a.addedDate || '').getTime();
        case 'freshness':
          const getDaysUntilExpiration = (date: Date) => {
            const today = new Date();
            const expiration = new Date(date);
            return Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          };
          return getDaysUntilExpiration(a.expirationDate) - getDaysUntilExpiration(b.expirationDate);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, filterBy, sortBy]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Sort options
  const sortOptions = [
    { key: 'name', label: '名前順' },
    { key: 'expirationDate', label: '期限順' },
    { key: 'category', label: 'カテゴリ順' },
    { key: 'addedDate', label: '追加日順' },
    { key: 'freshness', label: '新鮮度順' },
  ];

  // Render header
  const renderHeader = () => (
    <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            商品一覧 ({processedProducts.length})
          </Text>
          
          {isLoading && <ProgressBar indeterminate style={styles.progressBar} />}
        </View>

        <View style={styles.headerActions}>
          {/* View Mode Toggle */}
          <View style={styles.viewModeToggle}>
            <IconButton
              icon="view-module"
              selected={viewMode === 'grid'}
              onPress={() => setViewMode('grid')}
              size={24}
            />
            <IconButton
              icon="view-list"
              selected={viewMode === 'list'}
              onPress={() => setViewMode('list')}
              size={24}
            />
          </View>

          {/* Sort Menu */}
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                onPress={() => setSortMenuVisible(true)}
                size={24}
              />
            }
          >
            {sortOptions.map(option => (
              <Menu.Item
                key={option.key}
                onPress={() => {
                  setSortBy(option.key as ProductSortOption);
                  setSortMenuVisible(false);
                }}
                title={option.label}
                leadingIcon={sortBy === option.key ? 'check' : undefined}
              />
            ))}
          </Menu>
        </View>
      </View>
    </Surface>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="inventory-2" size={64} color={theme.colors.onSurfaceVariant} />
      <Text style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
        {emptyStateMessage}
      </Text>
      {showAddFab && onAddProduct && (
        <TouchableOpacity
          style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAddProduct}
        >
          <Text style={[styles.emptyStateButtonText, { color: theme.colors.onPrimary }]}>
            商品を追加
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render item
  const renderItem = ({ item, index }: { item: Product; index: number }) => (
    <ProductItem
      product={item}
      viewMode={viewMode}
      onPress={onProductPress}
      onEdit={onProductEdit}
      onDelete={onProductDelete}
      showActions={!selectionMode}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      
      <FlatList
        data={processedProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`${viewMode}-${numColumns}`} // Force re-render when layout changes
        contentContainerStyle={[
          styles.listContainer,
          processedProducts.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Product FAB */}
      {showAddFab && onAddProduct && (
        <FAB
          icon="add"
          style={[
            styles.fab,
            {
              bottom: insets.bottom + SPACING.LG,
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={onAddProduct}
          label="商品追加"
        />
      )}
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

  header: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },

  progressBar: {
    height: 2,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginRight: SPACING.SM,
  },

  listContainer: {
    padding: SPACING.MD,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Grid styles
  gridItem: {
    flex: 1,
    margin: SPACING.XS,
    maxWidth: '48%',
  },

  productCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  cardHeader: {
    position: 'relative',
    height: 120,
  },

  productImage: {
    width: '100%',
    height: 120,
  },

  freshnessBadge: {
    position: 'absolute',
    top: SPACING.SM,
    left: SPACING.SM,
    borderRadius: 12,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuButton: {
    position: 'absolute',
    top: SPACING.XS,
    right: SPACING.XS,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  cardContent: {
    padding: SPACING.MD,
  },

  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.SM,
    lineHeight: 20,
  },

  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },

  categoryChip: {
    height: 24,
  },

  chipText: {
    fontSize: 11,
  },

  expirationDate: {
    fontSize: 12,
    fontWeight: '500',
  },

  quantity: {
    fontSize: 12,
    marginTop: SPACING.XS,
  },

  // List styles
  listItem: {
    marginBottom: SPACING.SM,
  },

  listCard: {
    borderRadius: 8,
  },

  listCardContent: {
    flexDirection: 'row',
    padding: SPACING.MD,
    alignItems: 'center',
  },

  listProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: SPACING.MD,
  },

  listProductInfo: {
    flex: 1,
  },

  listProductName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },

  listProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },

  listCategoryChip: {
    height: 20,
    marginRight: SPACING.SM,
  },

  listChipText: {
    fontSize: 10,
  },

  freshnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  freshnessText: {
    fontSize: 12,
    marginLeft: SPACING.XS,
    fontWeight: '500',
  },

  listExpirationDate: {
    fontSize: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XXL,
  },

  emptyStateText: {
    fontSize: 16,
    marginTop: SPACING.LG,
    marginBottom: SPACING.XL,
    textAlign: 'center',
  },

  emptyStateButton: {
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },

  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.LG,
  },
});

export default ProductList;
