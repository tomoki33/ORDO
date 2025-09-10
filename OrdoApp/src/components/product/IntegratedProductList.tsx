/**
 * Integrated Product List with Search & Filter
 * 検索・フィルター統合商品リスト
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  Card,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Components
import { AdvancedSearchFilter, SortOption, SortOrder } from './SearchFilter';

// Types & Constants
import { Product, ProductCategory, ProductLocation } from '../../types';
import { SPACING, COLORS } from '../../constants';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface IntegratedProductListProps {
  products: Product[];
  onProductPress: (product: Product) => void;
  onProductEdit?: (product: Product) => void;
  onProductDelete?: (product: Product) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
}

// =============================================================================
// PRODUCT ITEM COMPONENT
// =============================================================================

interface ProductItemProps {
  product: Product;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  onPress,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();

  // Freshness calculation
  const getFreshnessInfo = (expirationDate: Date | string) => {
    const now = new Date();
    const expiry = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: COLORS.ERROR, label: '期限切れ', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 1) {
      return { status: 'critical', color: COLORS.ERROR, label: '今日まで', days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'warning', color: COLORS.WARNING, label: `あと${daysUntilExpiry}日`, days: daysUntilExpiry };
    } else {
      return { status: 'fresh', color: COLORS.SUCCESS, label: `あと${daysUntilExpiry}日`, days: daysUntilExpiry };
    }
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

  const getLocationIcon = (location: ProductLocation): string => {
    const icons = {
      fridge: 'kitchen',
      pantry: 'inventory-2',
      freezer: 'ac-unit',
      counter: 'countertops',
      other: 'location-on',
    };
    return icons[location];
  };

  const freshnessInfo = getFreshnessInfo(product.expirationDate);

  return (
    <Card style={[styles.productCard, { backgroundColor: theme.colors.surface }]} onPress={onPress}>
      <Card.Content style={styles.productContent}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={[styles.productBrand, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {product.brand || getCategoryLabel(product.category)}
            </Text>
          </View>

          <View style={styles.productActions}>
            {onEdit && (
              <IconButton
                icon="edit"
                size={20}
                onPress={onEdit}
                style={styles.actionButton}
              />
            )}
            {onDelete && (
              <IconButton
                icon="delete"
                size={20}
                onPress={onDelete}
                iconColor={COLORS.ERROR}
                style={styles.actionButton}
              />
            )}
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <Icon name={getLocationIcon(product.location)} size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
              {product.location === 'fridge' ? '冷蔵庫' :
               product.location === 'pantry' ? 'パントリー' :
               product.location === 'freezer' ? '冷凍庫' :
               product.location === 'counter' ? 'カウンター' : 'その他'}
            </Text>
          </View>

          {product.quantity && (
            <View style={styles.detailRow}>
              <Icon name="inventory" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                {product.quantity} {product.unit || '個'}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="event" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
              {new Date(product.expirationDate).toLocaleDateString('ja-JP')}
            </Text>
          </View>
        </View>

        {/* Freshness Badge */}
        <View style={styles.productFooter}>
          <Chip
            style={[styles.freshnessChip, { backgroundColor: freshnessInfo.color }]}
            textStyle={styles.freshnessText}
            compact
          >
            {freshnessInfo.label}
          </Chip>

          {product.aiRecognized && (
            <Chip
              style={[styles.aiChip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={[styles.aiText, { color: theme.colors.onPrimaryContainer }]}
              icon="auto-awesome"
              compact
            >
              AI認識
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

// =============================================================================
// INTEGRATED PRODUCT LIST COMPONENT
// =============================================================================

export const IntegratedProductList: React.FC<IntegratedProductListProps> = ({
  products,
  onProductPress,
  onProductEdit,
  onProductDelete,
  isLoading = false,
  onRefresh,
  emptyMessage = '商品が見つかりませんでした',
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [currentSort, setCurrentSort] = useState<{ sortBy: SortOption; sortOrder: SortOrder }>({
    sortBy: 'expirationDate',
    sortOrder: 'asc',
  });

  // Handle search results change
  const handleResultsChange = useCallback((results: Product[]) => {
    setFilteredProducts(results);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sortBy: SortOption, sortOrder: SortOrder) => {
    setCurrentSort({ sortBy, sortOrder });
  }, []);

  // Render individual product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <ProductItem
      product={item}
      onPress={() => onProductPress(item)}
      onEdit={onProductEdit ? () => onProductEdit(item) : undefined}
      onDelete={onProductDelete ? () => onProductDelete(item) : undefined}
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          {emptyMessage}
        </Text>
      </Surface>
    </View>
  );

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
        読み込み中...
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search & Filter Component */}
      <AdvancedSearchFilter
        products={products}
        onResultsChange={handleResultsChange}
        onSortChange={handleSortChange}
      />

      {/* Product List */}
      {isLoading ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 },
            filteredProducts.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            ) : undefined
          }
          ListEmptyComponent={renderEmptyState}
          numColumns={1}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
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

  listContent: {
    padding: SPACING.MD,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },

  emptyCard: {
    padding: SPACING.XL,
    borderRadius: 12,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },

  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    textAlign: 'center',
  },

  // Product Item Styles
  productCard: {
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },

  productContent: {
    padding: SPACING.MD,
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },

  productBrand: {
    fontSize: 14,
  },

  productActions: {
    flexDirection: 'row',
  },

  actionButton: {
    margin: 0,
  },

  productDetails: {
    gap: SPACING.XS,
    marginBottom: SPACING.SM,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },

  detailText: {
    fontSize: 14,
  },

  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },

  freshnessChip: {
    height: 28,
  },

  freshnessText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },

  aiChip: {
    height: 28,
  },

  aiText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default IntegratedProductList;
