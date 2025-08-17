/**
 * Ordo App - Home Screen
 * Main dashboard screen with product overview and quick actions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Product } from '../types';
import { Button, ProductCard } from '../components';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { StorageService, ProductStorage } from '../services';
import { ProductUtils, DateUtils, DebugUtils } from '../utils';

export const HomeScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      DebugUtils.time('Load Products');
      const loadedProducts = await StorageService.loadProducts();
      setProducts(loadedProducts);
      DebugUtils.log('Products loaded', loadedProducts.length);
    } catch (error) {
      DebugUtils.error('Failed to load products', error as Error);
      Alert.alert('エラー', '商品データの読み込みに失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
      DebugUtils.timeEnd('Load Products');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleAddProduct = () => {
    // TODO: Navigate to camera or add product screen
    Alert.alert('開発中', 'カメラ機能は開発中です');
  };

  const handleProductPress = (product: Product) => {
    // TODO: Navigate to product detail screen
    Alert.alert('商品詳細', `${product.name}の詳細画面に移動します（開発中）`);
  };

  const handleViewAllProducts = () => {
    // TODO: Navigate to product list screen
    Alert.alert('商品一覧', '商品一覧画面に移動します（開発中）');
  };

  // Get products expiring soon
  const expiringProducts = ProductUtils.getExpiringProducts(products, 3);
  const sortedProducts = ProductUtils.sortByExpiration(products).slice(0, 5);

  const getWelcomeMessage = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  const getProductStats = () => {
    const stats = {
      total: products.length,
      expiringSoon: expiringProducts.length,
      fresh: ProductUtils.filterByFreshness(products, 'fresh').length,
      expired: ProductUtils.filterByFreshness(products, 'expired').length,
    };
    return stats;
  };

  const stats = getProductStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>{getWelcomeMessage()}</Text>
        <Text style={styles.appTitle}>Ordo</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>総商品数</Text>
        </View>
        <View style={[styles.statCard, stats.expiringSoon > 0 && styles.statCardWarning]}>
          <Text style={[styles.statNumber, stats.expiringSoon > 0 && styles.statNumberWarning]}>
            {stats.expiringSoon}
          </Text>
          <Text style={styles.statLabel}>期限間近</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.fresh}</Text>
          <Text style={styles.statLabel}>新鮮</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Button
          title="📷 商品を追加"
          onPress={handleAddProduct}
          variant="primary"
          size="large"
          style={styles.addButton}
        />
      </View>

      {/* Expiring Products Section */}
      {expiringProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚠️ 期限間近の商品</Text>
            <Text style={styles.sectionCount}>({expiringProducts.length})</Text>
          </View>
          {expiringProducts.slice(0, 3).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => handleProductPress(product)}
              showLocation={false}
            />
          ))}
          {expiringProducts.length > 3 && (
            <Button
              title="すべて表示"
              onPress={handleViewAllProducts}
              variant="outline"
              size="small"
              style={styles.viewAllButton}
            />
          )}
        </View>
      )}

      {/* Recent Products Section */}
      {sortedProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 最近の商品</Text>
          </View>
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => handleProductPress(product)}
            />
          ))}
        </View>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>商品がありません</Text>
          <Text style={styles.emptyStateDescription}>
            カメラで商品を撮影して管理を始めましょう
          </Text>
          <Button
            title="最初の商品を追加"
            onPress={handleAddProduct}
            variant="primary"
            style={styles.emptyStateButton}
          />
        </View>
      )}

      {/* All Products Button */}
      {products.length > 5 && (
        <View style={styles.bottomActions}>
          <Button
            title="すべての商品を表示"
            onPress={handleViewAllProducts}
            variant="outline"
            size="large"
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
  },

  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    color: COLORS.TEXT_SECONDARY,
  },

  header: {
    padding: SPACING.LG,
    backgroundColor: COLORS.WHITE,
    marginBottom: SPACING.MD,
  },

  welcomeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },

  appTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_HERO,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.PRIMARY,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    padding: SPACING.MD,
    borderRadius: 12,
    alignItems: 'center',
  },

  statCardWarning: {
    backgroundColor: COLORS.WARNING,
  },

  statNumber: {
    fontSize: TYPOGRAPHY.FONT_SIZE_XXLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },

  statNumberWarning: {
    color: COLORS.WHITE,
  },

  statLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },

  actionsContainer: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
  },

  addButton: {
    marginBottom: SPACING.SM,
  },

  section: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
  },

  sectionCount: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },

  viewAllButton: {
    marginTop: SPACING.SM,
  },

  emptyState: {
    alignItems: 'center',
    padding: SPACING.XXL,
    backgroundColor: COLORS.WHITE,
    margin: SPACING.MD,
    borderRadius: 12,
  },

  emptyStateTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_XLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },

  emptyStateDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
    lineHeight: 22,
  },

  emptyStateButton: {
    minWidth: 200,
  },

  bottomActions: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
});
