/**
 * Ordo App - Home Screen
 * Main dashboard screen with product overview and quick actions
 */

import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { 
  Text, 
  Card, 
  Button as PaperButton,
  Surface,
  useTheme,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { Product } from '../types';
import { ProductCard } from '../components';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';
import { ProductUtils } from '../utils';
import type { StackParamList } from '../navigation/types';

// Context
import { useAppContext, useProducts, useFilters } from '../context/AppContext';

type HomeScreenNavigationProp = StackNavigationProp<StackParamList>;

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { expiringProductsCount } = useAppContext();
  const { products, isLoading, loadProducts } = useProducts();
  const { } = useFilters();

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAddProduct = () => {
    navigation.navigate('BarcodeScanner');
  };

  const handleAddProductManual = () => {
    navigation.navigate('ProductAutoFillForm', {});
  };

  const handleViewDemo = () => {
    // Navigate to demo screen - for development/testing
    Alert.alert(
      'バーコード統合デモ',
      '実装した機能のデモンストレーションを表示しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '表示', onPress: () => console.log('Demo navigation would go here') },
      ]
    );
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
      expiringSoon: expiringProductsCount,
      fresh: ProductUtils.filterByFreshness(products, 'fresh').length,
      expired: ProductUtils.filterByFreshness(products, 'expired').length,
    };
    return stats;
  };

  const stats = getProductStats();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          読み込み中...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {getWelcomeMessage()}
        </Text>
        <Text variant="displayMedium" style={[styles.appTitle, { color: theme.colors.primary }]}>
          Ordo
        </Text>
      </Surface>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.total}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              総商品数
            </Text>
          </Card.Content>
        </Card>
        
        <Card style={[styles.statCard, stats.expiringSoon > 0 && { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content style={styles.statCardContent}>
            <Text variant="displaySmall" 
                  style={[styles.statNumber, 
                         { color: stats.expiringSoon > 0 ? theme.colors.onErrorContainer : theme.colors.primary }]}>
              {stats.expiringSoon}
            </Text>
            <Text variant="bodyMedium" 
                  style={{ color: stats.expiringSoon > 0 ? theme.colors.onErrorContainer : theme.colors.onSurface }}>
              期限間近
            </Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.fresh}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              新鮮
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <PaperButton 
          mode="contained" 
          onPress={handleAddProduct}
          icon="barcode-scan"
          contentStyle={styles.addButtonContent}
          style={[styles.addButton, { marginBottom: SPACING.SM }]}
        >
          バーコードで追加
        </PaperButton>
        
        <PaperButton 
          mode="outlined" 
          onPress={handleAddProductManual}
          icon="pencil-plus"
          contentStyle={styles.addButtonContent}
          style={styles.addButton}
        >
          手動で追加
        </PaperButton>
      </View>

      {/* Expiring Products Section */}
      {expiringProducts.length > 0 && (
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              期限間近の商品
            </Text>
            <Chip icon="alert-circle" mode="outlined" compact textStyle={{ fontSize: 12 }}>
              {expiringProducts.length}件
            </Chip>
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
            <PaperButton
              mode="outlined"
              onPress={handleViewAllProducts}
              style={styles.viewAllButton}
            >
              すべて表示
            </PaperButton>
          )}
        </Surface>
      )}

      {/* Recent Products Section */}
      {sortedProducts.length > 0 && (
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              最近の商品
            </Text>
          </View>
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => handleProductPress(product)}
            />
          ))}
        </Surface>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <Card style={styles.emptyState}>
          <Card.Content style={styles.emptyStateContent}>
            <Text variant="headlineSmall" style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}>
              商品がありません
            </Text>
            <Text variant="bodyLarge" style={[styles.emptyStateDescription, { color: theme.colors.onSurfaceVariant }]}>
              カメラで商品を撮影して管理を始めましょう
            </Text>
            <PaperButton
              mode="contained"
              onPress={handleAddProduct}
              icon="barcode-scan"
              style={styles.emptyStateButton}
              contentStyle={styles.emptyStateButtonContent}
            >
              バーコードで最初の商品を追加
            </PaperButton>
          </Card.Content>
        </Card>
      )}

      {/* All Products Button */}
      {products.length > 5 && (
        <View style={styles.bottomActions}>
          <PaperButton
            mode="outlined"
            onPress={handleViewAllProducts}
            contentStyle={styles.addButtonContent}
          >
            すべての商品を表示
          </PaperButton>
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

  statCardContent: {
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

  addButtonContent: {
    paddingVertical: SPACING.SM,
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

  emptyStateContent: {
    alignItems: 'center',
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

  emptyStateButtonContent: {
    paddingVertical: SPACING.SM,
  },

  bottomActions: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
});

export default HomeScreen;