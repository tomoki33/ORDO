/**
 * Enhanced Product Detail Screen with Edit/Delete Integration
 * 編集・削除機能統合画面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  Button,
  useTheme,
  Portal,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';

// Components
import { ProductEditForm, DeleteConfirmation } from '../components/product/ProductEditDelete';

// Types & Constants
import { Product } from '../types';
import { SPACING, COLORS } from '../constants';

// Navigation Types
type RootStackParamList = {
  ProductDetail: { product: Product };
  ProductEdit: { product: Product };
};

type Props = StackScreenProps<RootStackParamList, 'ProductDetail'>;

// =============================================================================
// ENHANCED PRODUCT DETAIL SCREEN
// =============================================================================

export const EnhancedProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { product: initialProduct } = route.params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const screenWidth = Dimensions.get('window').width;

  // Freshness calculation
  const getFreshnessStatus = (expirationDate: Date | string) => {
    const now = new Date();
    const expiry = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: COLORS.ERROR, label: '期限切れ' };
    } else if (daysUntilExpiry <= 1) {
      return { status: 'critical', color: COLORS.ERROR, label: '今日まで' };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'warning', color: COLORS.WARNING, label: `あと${daysUntilExpiry}日` };
    } else {
      return { status: 'fresh', color: COLORS.SUCCESS, label: `あと${daysUntilExpiry}日` };
    }
  };

  const freshnessInfo = getFreshnessStatus(product.expirationDate);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (updatedProduct: Product) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProduct(updatedProduct);
      setIsEditing(false);
      setSnackbarMessage('商品情報を更新しました');
      setSnackbarVisible(true);
      
      // Update navigation params
      navigation.setParams({ product: updatedProduct });
    } catch (error) {
      Alert.alert('エラー', '商品の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowDeleteConfirmation(false);
      setSnackbarMessage('商品を削除しました');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      Alert.alert('エラー', '商品の削除に失敗しました');
      setShowDeleteConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleShare = () => {
    Alert.alert('共有', `${product.name}の情報を共有します`);
  };

  // =============================================================================
  // RENDER EDIT MODE
  // =============================================================================

  if (isEditing) {
    return (
      <View style={styles.container}>
        <ProductEditForm
          product={product}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          isLoading={isLoading}
        />
      </View>
    );
  }

  // =============================================================================
  // RENDER DETAIL MODE
  // =============================================================================

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.headerActions}>
          <IconButton
            icon="share"
            size={24}
            onPress={handleShare}
          />
          <IconButton
            icon="edit"
            size={24}
            onPress={handleEdit}
          />
          <IconButton
            icon="delete"
            size={24}
            iconColor={COLORS.ERROR}
            onPress={handleDelete}
          />
        </View>
      </Surface>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Card style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
          <Surface style={[styles.heroImageContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.heroPlaceholder, { color: theme.colors.onSurfaceVariant }]}>
              {product.name}
            </Text>
          </Surface>
        </Card>

        {/* Freshness Status */}
        <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>
                消費期限ステータス
              </Text>
              <Surface 
                style={[styles.statusBadge, { backgroundColor: freshnessInfo.color }]}
                elevation={1}
              >
                <Text style={[styles.statusText, { color: 'white' }]}>
                  {freshnessInfo.label}
                </Text>
              </Surface>
            </View>
            
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: theme.colors.onSurfaceVariant }]}>
                  消費期限
                </Text>
                <Text style={[styles.statusValue, { color: theme.colors.onSurface }]}>
                  {new Date(product.expirationDate).toLocaleDateString('ja-JP')}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: theme.colors.onSurfaceVariant }]}>
                  登録日
                </Text>
                <Text style={[styles.statusValue, { color: theme.colors.onSurface }]}>
                  {product.addedDate ? new Date(product.addedDate).toLocaleDateString('ja-JP') : '未設定'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Product Information */}
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              商品情報
            </Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  カテゴリ
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                  {product.category === 'fruits' ? '果物' :
                   product.category === 'vegetables' ? '野菜' :
                   product.category === 'dairy' ? '乳製品' :
                   product.category === 'meat' ? '肉類' :
                   product.category === 'packaged' ? '加工食品' :
                   product.category === 'beverages' ? '飲み物' : 'その他'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  保存場所
                </Text>
                <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                  {product.location === 'fridge' ? '冷蔵庫' :
                   product.location === 'pantry' ? 'パントリー' :
                   product.location === 'freezer' ? '冷凍庫' :
                   product.location === 'counter' ? 'カウンター' : 'その他'}
                </Text>
              </View>

              {product.quantity && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    数量
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {product.quantity} {product.unit || '個'}
                  </Text>
                </View>
              )}

              {product.brand && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    ブランド
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {product.brand}
                  </Text>
                </View>
              )}

              {product.barcode && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    バーコード
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {product.barcode}
                  </Text>
                </View>
              )}
            </View>

            {product.notes && (
              <View style={styles.notesSection}>
                <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                  メモ
                </Text>
                <Text style={[styles.notesText, { color: theme.colors.onSurface }]}>
                  {product.notes}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="edit"
            onPress={handleEdit}
            style={[styles.actionButton, { borderColor: theme.colors.primary }]}
            contentStyle={styles.actionButtonContent}
          >
            編集
          </Button>
          
          <Button
            mode="outlined"
            icon="share"
            onPress={handleShare}
            style={[styles.actionButton, { borderColor: theme.colors.outline }]}
            contentStyle={styles.actionButtonContent}
          >
            共有
          </Button>
          
          <Button
            mode="outlined"
            icon="delete"
            onPress={handleDelete}
            style={[styles.actionButton, { borderColor: COLORS.ERROR }]}
            textColor={COLORS.ERROR}
            contentStyle={styles.actionButtonContent}
          >
            削除
          </Button>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Surface style={[styles.loadingContainer, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
              処理中...
            </Text>
          </Surface>
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        products={[product]}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        visible={showDeleteConfirmation}
      />

      {/* Snackbar */}
      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ backgroundColor: theme.colors.inverseSurface }}
        >
          <Text style={{ color: theme.colors.inverseOnSurface }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    minHeight: 56,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: SPACING.SM,
  },

  headerActions: {
    flexDirection: 'row',
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    padding: SPACING.MD,
  },

  heroCard: {
    marginBottom: SPACING.MD,
    borderRadius: 16,
  },

  heroImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },

  heroPlaceholder: {
    fontSize: 24,
    fontWeight: '600',
  },

  statusCard: {
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },

  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  statusBadge: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },

  statusDetails: {
    gap: SPACING.SM,
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusLabel: {
    fontSize: 14,
  },

  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  infoCard: {
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  infoGrid: {
    gap: SPACING.MD,
  },

  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoLabel: {
    fontSize: 14,
    flex: 1,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  notesSection: {
    marginTop: SPACING.MD,
    gap: SPACING.XS,
  },

  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginTop: SPACING.MD,
  },

  actionButton: {
    flex: 1,
  },

  actionButtonContent: {
    paddingVertical: SPACING.XS,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    padding: SPACING.XL,
    borderRadius: 12,
    alignItems: 'center',
    gap: SPACING.MD,
  },

  loadingText: {
    fontSize: 16,
  },
});

export default EnhancedProductDetailScreen;
