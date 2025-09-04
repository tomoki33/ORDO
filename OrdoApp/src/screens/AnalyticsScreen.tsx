import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { AnalyticsScreenNavigationProp } from '../navigation/types';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { Product } from '../types';
import { DateUtils } from '../utils';

interface Props {
  navigation: AnalyticsScreenNavigationProp;
}

/**
 * Analytics Screen - 分析レポート画面
 * 商品管理の統計情報と傾向分析を表示
 */
const AnalyticsScreen: React.FC<Props> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 商品データの読み込み
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // TODO: 実際のStorageService.getProductsを実装
      const storedProducts: Product[] = [];
      setProducts(storedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('エラー', '商品データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 統計データの計算
  const getStats = () => {
    const total = products.length;
    const fresh = products.filter(p => 
      DateUtils.getDaysUntilExpiration(p.expirationDate) > 3
    ).length;
    const expiringSoon = products.filter(p => {
      const days = DateUtils.getDaysUntilExpiration(p.expirationDate);
      return days >= 0 && days <= 3;
    }).length;
    const expired = products.filter(p => 
      DateUtils.getDaysUntilExpiration(p.expirationDate) < 0
    ).length;

    return { total, fresh, expiringSoon, expired };
  };

  // カテゴリ別統計
  const getCategoryStats = () => {
    const categoryMap = new Map<string, number>();
    products.forEach(product => {
      const count = categoryMap.get(product.category) || 0;
      categoryMap.set(product.category, count + 1);
    });
    return Array.from(categoryMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // 上位5カテゴリ
  };

  // 週間追加数の計算
  const getWeeklyAdditions = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return products.filter(_p => {
      // TODO: Product型にcreatedAtプロパティを追加後に実装
      // new Date(p.createdAt) >= oneWeekAgo
      return false; // 暫定的に0を返す
    }).length;
  };

  const stats = getStats();
  const categoryStats = getCategoryStats();
  const weeklyAdditions = getWeeklyAdditions();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>分析データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* サマリーカード */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>概要</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>総商品数</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.SUCCESS }]}>
              {stats.fresh}
            </Text>
            <Text style={styles.summaryLabel}>新鮮</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.WARNING }]}>
              {stats.expiringSoon}
            </Text>
            <Text style={styles.summaryLabel}>期限間近</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.ERROR }]}>
              {stats.expired}
            </Text>
            <Text style={styles.summaryLabel}>期限切れ</Text>
          </View>
        </View>
      </View>

      {/* 週間レポート */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今週の活動</Text>
        <View style={styles.weeklyStats}>
          <View style={styles.weeklyItem}>
            <Text style={styles.weeklyNumber}>{weeklyAdditions}</Text>
            <Text style={styles.weeklyLabel}>商品追加数</Text>
          </View>
          <View style={styles.weeklyItem}>
            <Text style={styles.weeklyNumber}>
              {Math.round(((stats.fresh / (stats.total || 1)) * 100))}%
            </Text>
            <Text style={styles.weeklyLabel}>新鮮度</Text>
          </View>
        </View>
      </View>

      {/* カテゴリ分析 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>カテゴリ別分析</Text>
        {categoryStats.length > 0 ? (
          <View style={styles.categoryList}>
            {categoryStats.map(([category, count], index) => (
              <View key={category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category}</Text>
                  <Text style={styles.categoryCount}>{count}個</Text>
                </View>
                <View style={styles.categoryBar}>
                  <View 
                    style={[
                      styles.categoryBarFill,
                      { 
                        width: `${(count / (categoryStats[0][1] || 1)) * 100}%`,
                        backgroundColor: index === 0 ? COLORS.PRIMARY : COLORS.GRAY_LIGHT,
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>商品を追加するとカテゴリ分析が表示されます</Text>
        )}
      </View>

      {/* 推奨アクション */}
      {(stats.expiringSoon > 0 || stats.expired > 0) && (
        <View style={styles.recommendationCard}>
          <Text style={styles.cardTitle}>推奨アクション</Text>
          {stats.expired > 0 && (
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationIcon}>⚠️</Text>
              <Text style={styles.recommendationText}>
                {stats.expired}個の期限切れ商品を確認してください
              </Text>
            </View>
          )}
          {stats.expiringSoon > 0 && (
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationIcon}>📅</Text>
              <Text style={styles.recommendationText}>
                {stats.expiringSoon}個の商品が期限間近です
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 改善提案 */}
      <View style={styles.tipsCard}>
        <Text style={styles.cardTitle}>管理のコツ</Text>
        <Text style={styles.tipText}>
          • 定期的な在庫チェックで食材ロスを削減
        </Text>
        <Text style={styles.tipText}>
          • 期限間近の商品は冷凍保存を検討
        </Text>
        <Text style={styles.tipText}>
          • カテゴリ別に整理して管理効率をアップ
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    padding: SPACING.MD,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryCard: {
    backgroundColor: COLORS.WHITE,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    elevation: 1,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: TYPOGRAPHY.FONT_SIZE_XXLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.PRIMARY,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weeklyItem: {
    alignItems: 'center',
  },
  weeklyNumber: {
    fontSize: TYPOGRAPHY.FONT_SIZE_XLARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.SECONDARY,
  },
  weeklyLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  categoryList: {
    gap: SPACING.SM,
  },
  categoryItem: {
    marginBottom: SPACING.SM,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
  },
  categoryCount: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  categoryBar: {
    height: 8,
    backgroundColor: COLORS.GRAY_200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recommendationCard: {
    backgroundColor: COLORS.WARNING,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: SPACING.SM,
  },
  recommendationText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.WHITE,
    flex: 1,
  },
  tipsCard: {
    backgroundColor: COLORS.GRAY_50,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.XL,
  },
  tipText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    lineHeight: 20,
  },
});

export default AnalyticsScreen;
