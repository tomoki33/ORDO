/**
 * Product Detail Screen (6時間実装)
 * 
 * 商品詳細情報表示・管理画面
 * - 詳細情報表示
 * - 新鮮度分析と予測
 * - 関連商品提案
 * - アクション管理
 * - 履歴追跡
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Share,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  Button,
  Chip,
  Divider,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  ProgressBar,
  FAB,
  Badge,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// Types & Models
import { Product, ProductCategory } from '../../types';
import { SPACING, COLORS, TYPOGRAPHY } from '../../constants';
import { StackParamList, ProductDetailScreenNavigationProp } from '../../navigation/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface ProductDetailProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onShare?: (product: Product) => void;
  onAddToShoppingList?: (product: Product) => void;
  isLoading?: boolean;
}

interface ProductActionMenuProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onAddToShoppingList: () => void;
}

interface FreshnessAnalysisProps {
  product: Product;
  freshnessScore?: number;
  prediction?: {
    daysRemaining: number;
    confidence: number;
    recommendation: string;
  };
}

interface ProductMetadataProps {
  product: Product;
}

interface RelatedProductsProps {
  category: ProductCategory;
  excludeId: string;
  onProductPress: (product: Product) => void;
}

type ProductDetailRouteProp = RouteProp<StackParamList, 'ProductDetail'>;

// =============================================================================
// FRESHNESS ANALYSIS COMPONENT
// =============================================================================

const FreshnessAnalysis: React.FC<FreshnessAnalysisProps> = ({
  product,
  freshnessScore = 0.8,
  prediction,
}) => {
  const theme = useTheme();
  
  const getFreshnessInfo = useCallback(() => {
    const today = new Date();
    const expirationDate = new Date(product.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      return { 
        status: 'expired', 
        color: COLORS.ERROR, 
        text: '期限切れ', 
        icon: 'warning',
        progress: 0,
        description: '消費期限を過ぎています。破棄することをお勧めします。',
      };
    } else if (daysUntilExpiration <= 1) {
      return { 
        status: 'urgent', 
        color: COLORS.ERROR, 
        text: '緊急', 
        icon: 'schedule',
        progress: 0.2,
        description: '今日中に消費してください。',
      };
    } else if (daysUntilExpiration <= 3) {
      return { 
        status: 'warning', 
        color: COLORS.WARNING, 
        text: '要注意', 
        icon: 'access_time',
        progress: 0.5,
        description: '数日以内に消費することをお勧めします。',
      };
    } else if (daysUntilExpiration <= 7) {
      return { 
        status: 'good', 
        color: COLORS.SECONDARY, 
        text: '良好', 
        icon: 'check',
        progress: 0.7,
        description: '1週間以内に消費してください。',
      };
    } else {
      return { 
        status: 'fresh', 
        color: COLORS.SUCCESS, 
        text: '新鮮', 
        icon: 'check_circle',
        progress: 0.9,
        description: '十分に新鮮です。',
      };
    }
  }, [product.expirationDate]);

  const freshnessInfo = getFreshnessInfo();

  return (
    <Card style={[styles.analysisCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.analysisHeader}>
          <View style={styles.freshnessIndicator}>
            <Icon name={freshnessInfo.icon} size={24} color={freshnessInfo.color} />
            <Text style={[styles.freshnessStatus, { color: freshnessInfo.color }]}>
              {freshnessInfo.text}
            </Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreValue, { color: theme.colors.onSurface }]}>
              {Math.round(freshnessScore * 100)}%
            </Text>
            <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant }]}>
              新鮮度
            </Text>
          </View>
        </View>

        <ProgressBar
          progress={freshnessInfo.progress}
          color={freshnessInfo.color}
          style={styles.progressBar}
        />

        <Text style={[styles.analysisDescription, { color: theme.colors.onSurfaceVariant }]}>
          {freshnessInfo.description}
        </Text>

        {prediction && (
          <View style={styles.predictionContainer}>
            <Text style={[styles.predictionTitle, { color: theme.colors.onSurface }]}>
              AI予測
            </Text>
            <Text style={[styles.predictionText, { color: theme.colors.onSurfaceVariant }]}>
              残り{prediction.daysRemaining}日（信頼度: {Math.round(prediction.confidence * 100)}%）
            </Text>
            <Text style={[styles.recommendationText, { color: theme.colors.onSurfaceVariant }]}>
              {prediction.recommendation}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

// =============================================================================
// PRODUCT METADATA COMPONENT
// =============================================================================

const ProductMetadata: React.FC<ProductMetadataProps> = ({ product }) => {
  const theme = useTheme();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card style={[styles.metadataCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          商品情報
        </Text>

        <View style={styles.metadataGrid}>
          <View style={styles.metadataItem}>
            <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
              カテゴリ
            </Text>
            <Chip mode="outlined" compact>
              {product.category}
            </Chip>
          </View>

          <View style={styles.metadataItem}>
            <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
              保存場所
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {product.location}
            </Text>
          </View>

          {product.quantity && (
            <View style={styles.metadataItem}>
              <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                数量
              </Text>
              <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
                {product.quantity} {product.unit || '個'}
              </Text>
            </View>
          )}

          {product.brand && (
            <View style={styles.metadataItem}>
              <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                ブランド
              </Text>
              <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
                {product.brand}
              </Text>
            </View>
          )}

          <View style={styles.metadataItem}>
            <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
              消費期限
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {formatDate(product.expirationDate)}
            </Text>
          </View>

          <View style={styles.metadataItem}>
            <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
              追加日
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {formatDate(product.addedDate)}
            </Text>
          </View>

          {product.confidence && (
            <View style={styles.metadataItem}>
              <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                AI認識信頼度
              </Text>
              <View style={styles.confidenceContainer}>
                <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
                  {Math.round(product.confidence * 100)}%
                </Text>
                {product.aiRecognized && (
                  <Icon name="psychology" size={16} color={theme.colors.primary} />
                )}
              </View>
            </View>
          )}
        </View>

        {product.notes && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.notesSection}>
              <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                メモ
              </Text>
              <Text style={[styles.notesText, { color: theme.colors.onSurface }]}>
                {product.notes}
              </Text>
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
};

// =============================================================================
// PRODUCT ACTION MENU COMPONENT
// =============================================================================

const ProductActionMenu: React.FC<ProductActionMenuProps> = ({
  product,
  onEdit,
  onDelete,
  onShare,
  onAddToShoppingList,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.actionMenu}>
      <Button
        mode="contained"
        onPress={onEdit}
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        contentStyle={styles.actionButtonContent}
        icon="edit"
      >
        編集
      </Button>

      <Button
        mode="outlined"
        onPress={onShare}
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        icon="share"
      >
        共有
      </Button>

      <Button
        mode="outlined"
        onPress={onAddToShoppingList}
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        icon="shopping-cart"
      >
        買い物リスト
      </Button>

      <Button
        mode="text"
        onPress={onDelete}
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        textColor={COLORS.ERROR}
        icon="delete"
      >
        削除
      </Button>
    </View>
  );
};

// =============================================================================
// RELATED PRODUCTS COMPONENT
// =============================================================================

const RelatedProducts: React.FC<RelatedProductsProps> = ({
  category,
  excludeId,
  onProductPress,
}) => {
  const theme = useTheme();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Mock related products - 実際の実装では適切なサービスから取得
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: 'related-1',
        name: '関連商品 1',
        category,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        addedDate: new Date(),
        location: 'pantry',
        imageUri: 'https://via.placeholder.com/100?text=Product1',
      },
      {
        id: 'related-2',
        name: '関連商品 2',
        category,
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        addedDate: new Date(),
        location: 'fridge',
        imageUri: 'https://via.placeholder.com/100?text=Product2',
      },
    ].filter(p => p.id !== excludeId);

    setRelatedProducts(mockProducts);
  }, [category, excludeId]);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.relatedCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          関連商品
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.relatedGrid}>
            {relatedProducts.map((product) => (
              <View key={product.id} style={styles.relatedItem}>
                <Surface
                  style={[styles.relatedItemCard, { backgroundColor: theme.colors.surfaceVariant }]}
                  elevation={1}
                >
                  <Image
                    source={{ uri: product.imageUri || 'https://via.placeholder.com/80?text=No+Image' }}
                    style={styles.relatedImage}
                    resizeMode="cover"
                  />
                  <Text
                    style={[styles.relatedName, { color: theme.colors.onSurface }]}
                    numberOfLines={2}
                  >
                    {product.name}
                  </Text>
                  <Button
                    mode="text"
                    compact
                    onPress={() => onProductPress(product)}
                    style={styles.relatedButton}
                  >
                    詳細
                  </Button>
                </Surface>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card.Content>
    </Card>
  );
};

// =============================================================================
// MAIN PRODUCT DETAIL SCREEN
// =============================================================================

export const ProductDetailScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailRouteProp>();
  
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Extract productId from route params
  const { productId } = route.params;

  // Load product data
  useEffect(() => {
    loadProduct();
  }, [productId]);

  // Fade in animation
  useEffect(() => {
    if (product) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [product, fadeAnim]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      
      // Mock product loading - 実際の実装では適切なサービスから取得
      const mockProduct: Product = {
        id: productId,
        name: 'サンプル商品',
        category: 'fruits',
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        addedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: 'fridge',
        quantity: 2,
        unit: '個',
        brand: 'サンプルブランド',
        imageUri: 'https://via.placeholder.com/300?text=Product+Image',
        notes: 'これはサンプル商品のメモです。',
        confidence: 0.95,
        aiRecognized: true,
      };

      setProduct(mockProduct);
    } catch (error) {
      console.error('Failed to load product:', error);
      Alert.alert('エラー', '商品情報の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProduct();
    setRefreshing(false);
  };

  const handleEdit = () => {
    if (product) {
      navigation.navigate('EditProduct', { productId: product.id });
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      // Mock delete operation
      Alert.alert('削除完了', '商品が削除されました');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to delete product:', error);
      Alert.alert('エラー', '商品の削除に失敗しました');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      await Share.share({
        message: `商品: ${product.name}\nカテゴリ: ${product.category}\n消費期限: ${new Date(product.expirationDate).toLocaleDateString('ja-JP')}`,
        title: '商品情報を共有',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleAddToShoppingList = () => {
    if (product) {
      Alert.alert('追加完了', '買い物リストに追加されました');
    }
  };

  const handleRelatedProductPress = (relatedProduct: Product) => {
    navigation.push('ProductDetail', { productId: relatedProduct.id });
  };

  if (isLoading || !product) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ProgressBar indeterminate />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          読み込み中...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: product.imageUri || 'https://via.placeholder.com/300?text=No+Image' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay}>
              <Text style={[styles.productTitle, { color: COLORS.WHITE }]}>
                {product.name}
              </Text>
            </View>
          </View>

          {/* Freshness Analysis */}
          <FreshnessAnalysis
            product={product}
            freshnessScore={0.8}
            prediction={{
              daysRemaining: 5,
              confidence: 0.92,
              recommendation: '冷蔵保存を続けることをお勧めします。',
            }}
          />

          {/* Product Metadata */}
          <ProductMetadata product={product} />

          {/* Related Products */}
          <RelatedProducts
            category={product.category}
            excludeId={product.id}
            onProductPress={handleRelatedProductPress}
          />

          {/* Action Menu */}
          <ProductActionMenu
            product={product}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShare={handleShare}
            onAddToShoppingList={handleAddToShoppingList}
          />
        </Animated.View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>削除確認</Dialog.Title>
          <Dialog.Content>
            <Text>「{product.name}」を削除してもよろしいですか？</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>キャンセル</Button>
            <Button onPress={confirmDelete} textColor={COLORS.ERROR}>削除</Button>
          </Dialog.Actions>
        </Dialog>
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },

  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
  },

  // Hero section
  heroContainer: {
    height: 250,
    position: 'relative',
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: SPACING.LG,
  },

  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Analysis card
  analysisCard: {
    margin: SPACING.MD,
    borderRadius: 12,
  },

  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },

  freshnessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  freshnessStatus: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.SM,
  },

  scoreContainer: {
    alignItems: 'center',
  },

  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  scoreLabel: {
    fontSize: 12,
  },

  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.MD,
  },

  analysisDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  predictionContainer: {
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },

  predictionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },

  predictionText: {
    fontSize: 13,
    marginBottom: SPACING.XS,
  },

  recommendationText: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Metadata card
  metadataCard: {
    margin: SPACING.MD,
    borderRadius: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  metadataGrid: {
    gap: SPACING.MD,
  },

  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
  },

  metadataLabel: {
    fontSize: 14,
    flex: 1,
  },

  metadataValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },

  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.XS,
  },

  divider: {
    marginVertical: SPACING.MD,
  },

  notesSection: {
    gap: SPACING.SM,
  },

  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Action menu
  actionMenu: {
    padding: SPACING.MD,
    gap: SPACING.SM,
  },

  actionButton: {
    borderRadius: 8,
  },

  actionButtonContent: {
    height: 48,
  },

  // Related products
  relatedCard: {
    margin: SPACING.MD,
    borderRadius: 12,
  },

  relatedGrid: {
    flexDirection: 'row',
    gap: SPACING.MD,
    paddingHorizontal: SPACING.XS,
  },

  relatedItem: {
    width: 120,
  },

  relatedItemCard: {
    borderRadius: 8,
    padding: SPACING.SM,
    alignItems: 'center',
  },

  relatedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: SPACING.SM,
  },

  relatedName: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.SM,
    minHeight: 32,
  },

  relatedButton: {
    marginTop: 'auto',
  },
});

export default ProductDetailScreen;
