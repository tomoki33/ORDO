/**
 * Recommendation System UI Components
 * 推奨システム UI - ユーザーインターフェース
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { predictiveAlgorithmService, PredictionResult, SmartShoppingList, RecommendationItem } from '../services/PredictiveAlgorithmService';
import { usageAnalyticsEngine, AnalyticsMetrics } from '../services/UsageAnalyticsEngine';

// =============================================================================
// INTERFACES
// =============================================================================

interface RecommendationUIProps {
  onAddToCart?: (item: RecommendationItem) => void;
  onDismissRecommendation?: (productId: string) => void;
  onConfigureSettings?: () => void;
}

interface AnalyticsViewProps {
  metrics: AnalyticsMetrics | null;
  isLoading: boolean;
  onRefresh: () => void;
}

interface ShoppingListViewProps {
  shoppingList: SmartShoppingList | null;
  isLoading: boolean;
  onRefresh: () => void;
  onAddToCart: (item: RecommendationItem) => void;
  onRemoveItem: (productId: string) => void;
}

interface PredictionDetailsProps {
  prediction: PredictionResult;
  onClose: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}

// =============================================================================
// MAIN RECOMMENDATION COMPONENT
// =============================================================================

export const RecommendationSystemUI: React.FC<RecommendationUIProps> = ({
  onAddToCart,
  onDismissRecommendation,
  onConfigureSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'analytics' | 'shopping'>('recommendations');
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [shoppingList, setShoppingList] = useState<SmartShoppingList | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPredictions(),
        loadShoppingList(),
        loadAnalytics(),
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPredictions = async () => {
    const newPredictions = await predictiveAlgorithmService.generatePurchasePredictions();
    setPredictions(newPredictions);
  };

  const loadShoppingList = async () => {
    const newShoppingList = await predictiveAlgorithmService.generateSmartShoppingList();
    setShoppingList(newShoppingList);
  };

  const loadAnalytics = async () => {
    const newAnalytics = usageAnalyticsEngine.getAnalyticsMetrics();
    setAnalytics(newAnalytics);
  };

  const handleRefresh = useCallback(async () => {
    await loadInitialData();
  }, []);

  const handlePredictionPress = (prediction: PredictionResult) => {
    setSelectedPrediction(prediction);
  };

  const handleAcceptPrediction = () => {
    if (selectedPrediction && onAddToCart) {
      const item: RecommendationItem = {
        productId: selectedPrediction.productId,
        productName: selectedPrediction.productName,
        category: selectedPrediction.category,
        recommendedQuantity: selectedPrediction.predictedQuantity,
        urgency: selectedPrediction.priority === 'high' ? 'urgent' : 
                selectedPrediction.priority === 'medium' ? 'soon' : 'future',
        reason: selectedPrediction.reasons.join(', '),
        expectedConsumptionDate: selectedPrediction.predictedDate,
        confidence: selectedPrediction.confidence,
      };
      onAddToCart(item);
    }
    setSelectedPrediction(null);
  };

  const handleDismissPrediction = () => {
    if (selectedPrediction && onDismissRecommendation) {
      onDismissRecommendation(selectedPrediction.productId);
    }
    setSelectedPrediction(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'recommendations':
        return (
          <PredictionsView
            predictions={predictions}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onPredictionPress={handlePredictionPress}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            metrics={analytics}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        );
      case 'shopping':
        return (
          <ShoppingListView
            shoppingList={shoppingList}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onAddToCart={onAddToCart || (() => {})}
            onRemoveItem={(productId) => {
              // 買い物リストからアイテム削除
              if (shoppingList) {
                const updatedItems = shoppingList.items.filter(item => item.productId !== productId);
                setShoppingList({ ...shoppingList, items: updatedItems });
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>購入推奨システム</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            推奨
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            分析
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shopping' && styles.activeTab]}
          onPress={() => setActiveTab('shopping')}
        >
          <Text style={[styles.tabText, activeTab === 'shopping' && styles.activeTabText]}>
            買い物リスト
          </Text>
        </TouchableOpacity>
      </View>

      {/* タブコンテンツ */}
      {renderTabContent()}

      {/* 予測詳細モーダル */}
      {selectedPrediction && (
        <PredictionDetailsModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          onAccept={handleAcceptPrediction}
          onDismiss={handleDismissPrediction}
        />
      )}

      {/* 設定モーダル */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onConfigureSettings={onConfigureSettings}
      />
    </View>
  );
};

// =============================================================================
// PREDICTIONS VIEW
// =============================================================================

const PredictionsView: React.FC<{
  predictions: PredictionResult[];
  isLoading: boolean;
  onRefresh: () => void;
  onPredictionPress: (prediction: PredictionResult) => void;
}> = ({ predictions, isLoading, onRefresh, onPredictionPress }) => {
  const renderPredictionItem = ({ item }: { item: PredictionResult }) => {
    const daysUntil = Math.ceil((item.predictedDate - Date.now()) / (1000 * 60 * 60 * 24));
    const priorityColor = {
      high: '#FF4444',
      medium: '#FFA500',
      low: '#4CAF50',
    }[item.priority];

    return (
      <TouchableOpacity
        style={styles.predictionCard}
        onPress={() => onPredictionPress(item)}
      >
        <View style={styles.predictionHeader}>
          <Text style={styles.productName}>{item.productName}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
        </View>
        
        <Text style={styles.categoryText}>{item.category}</Text>
        
        <View style={styles.predictionDetails}>
          <Text style={styles.detailText}>
            📅 予測: {daysUntil}日後
          </Text>
          <Text style={styles.detailText}>
            📦 数量: {item.predictedQuantity}個
          </Text>
          <Text style={styles.detailText}>
            🎯 信頼度: {(item.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        
        <Text style={styles.actionText}>
          {item.recommendedAction === 'buy_now' ? '🔥 今すぐ購入' :
           item.recommendedAction === 'buy_soon' ? '⏰ 近日中に購入' :
           item.recommendedAction === 'monitor' ? '👀 監視中' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={predictions}
      renderItem={renderPredictionItem}
      keyExtractor={(item) => item.productId}
      style={styles.predictionsList}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {isLoading ? 'データを読み込み中...' : '推奨はありません'}
          </Text>
        </View>
      }
    />
  );
};

// =============================================================================
// ANALYTICS VIEW
// =============================================================================

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  isLoading,
  onRefresh,
}) => {
  if (isLoading || !metrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>分析データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.analyticsContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      {/* 基本統計 */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>基本統計</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metrics.totalEvents}</Text>
            <Text style={styles.statLabel}>総イベント数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metrics.uniqueProducts}</Text>
            <Text style={styles.statLabel}>登録商品数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(metrics.predictionAccuracy * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>予測精度</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{(metrics.dataQualityScore * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>データ品質</Text>
          </View>
        </View>
      </View>

      {/* よく消費される商品 */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>よく消費される商品</Text>
        {metrics.mostConsumedProducts.slice(0, 5).map((product, index) => (
          <View key={product.productId} style={styles.productRankItem}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productRankName}>{product.productName}</Text>
              <Text style={styles.productRankCount}>消費回数: {product.consumptionCount}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 季節トレンド */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>季節トレンド</Text>
        {metrics.seasonalTrends.map((trend) => (
          <View key={trend.season} style={styles.seasonTrendItem}>
            <Text style={styles.seasonName}>{trend.name}</Text>
            <View style={styles.popularProducts}>
              {trend.popularProducts.slice(0, 3).map((product) => (
                <View key={product.productId} style={styles.trendProduct}>
                  <Text style={styles.trendProductName}>{product.productName}</Text>
                  <Text style={styles.trendIncrease}>
                    +{(product.consumptionIncrease * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// =============================================================================
// SHOPPING LIST VIEW
// =============================================================================

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  shoppingList,
  isLoading,
  onRefresh,
  onAddToCart,
  onRemoveItem,
}) => {
  const renderShoppingItem = ({ item }: { item: RecommendationItem }) => {
    const urgencyColor = {
      urgent: '#FF4444',
      soon: '#FFA500',
      future: '#4CAF50',
    }[item.urgency];

    return (
      <View style={styles.shoppingItem}>
        <View style={styles.shoppingItemHeader}>
          <Text style={styles.shoppingItemName}>{item.productName}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
            <Text style={styles.urgencyText}>
              {item.urgency === 'urgent' ? '緊急' :
               item.urgency === 'soon' ? '近日' : '将来'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.shoppingItemCategory}>{item.category}</Text>
        <Text style={styles.shoppingItemQuantity}>数量: {item.recommendedQuantity}</Text>
        <Text style={styles.shoppingItemReason}>{item.reason}</Text>
        
        {item.estimatedCost && (
          <Text style={styles.shoppingItemCost}>
            推定価格: ¥{item.estimatedCost.toFixed(0)}
          </Text>
        )}
        
        <View style={styles.shoppingItemActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToCart(item)}
          >
            <Text style={styles.addButtonText}>カートに追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemoveItem(item.productId)}
          >
            <Text style={styles.removeButtonText}>削除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading || !shoppingList) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>買い物リストを生成中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.shoppingListContainer}>
      {/* ヘッダー情報 */}
      <View style={styles.shoppingListHeader}>
        <Text style={styles.shoppingListTitle}>
          スマート買い物リスト ({shoppingList.items.length}件)
        </Text>
        <Text style={styles.shoppingListSubtitle}>
          推定総額: ¥{shoppingList.totalEstimatedCost.toFixed(0)}
        </Text>
        <Text style={styles.confidenceText}>
          信頼度: {(shoppingList.confidenceScore * 100).toFixed(0)}%
        </Text>
      </View>

      <FlatList
        data={shoppingList.items}
        renderItem={renderShoppingItem}
        keyExtractor={(item) => item.productId}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>買い物リストが空です</Text>
          </View>
        }
      />
    </View>
  );
};

// =============================================================================
// PREDICTION DETAILS MODAL
// =============================================================================

const PredictionDetailsModal: React.FC<PredictionDetailsProps> = ({
  prediction,
  onClose,
  onAccept,
  onDismiss,
}) => {
  const daysUntil = Math.ceil((prediction.predictedDate - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>予測詳細</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalProductName}>{prediction.productName}</Text>
          <Text style={styles.modalCategory}>{prediction.category}</Text>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>予測情報</Text>
            <Text style={styles.modalText}>予測日: {daysUntil}日後</Text>
            <Text style={styles.modalText}>推奨数量: {prediction.predictedQuantity}</Text>
            <Text style={styles.modalText}>信頼度: {(prediction.confidence * 100).toFixed(0)}%</Text>
            <Text style={styles.modalText}>優先度: {prediction.priority}</Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>根拠</Text>
            {prediction.reasons.map((reason, index) => (
              <Text key={index} style={styles.modalReason}>• {reason}</Text>
            ))}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>使用パターン</Text>
            {prediction.basedOnPatterns.map((pattern, index) => (
              <Text key={index} style={styles.modalPattern}>• {pattern}</Text>
            ))}
          </View>

          {prediction.seasonalFactor && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>季節要因</Text>
              <Text style={styles.modalText}>
                季節調整係数: {prediction.seasonalFactor.toFixed(2)}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>カートに追加</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>この推奨を無視</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// SETTINGS MODAL
// =============================================================================

const SettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfigureSettings?: () => void;
}> = ({ visible, onClose, onConfigureSettings }) => {
  const [enableSeasonalAdjustment, setEnableSeasonalAdjustment] = useState(true);
  const [enableTrendAnalysis, setEnableTrendAnalysis] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.6');
  const [maxRecommendations, setMaxRecommendations] = useState('20');

  const handleSave = async () => {
    try {
      await predictiveAlgorithmService.updateConfig({
        enableSeasonalAdjustment,
        enableTrendAnalysis,
        confidenceThreshold: parseFloat(confidenceThreshold),
        maxRecommendations: parseInt(maxRecommendations),
      });
      Alert.alert('成功', '設定を保存しました。');
      onClose();
    } catch (error) {
      Alert.alert('エラー', '設定の保存に失敗しました。');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>推奨システム設定</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>季節調整を有効にする</Text>
            <Switch
              value={enableSeasonalAdjustment}
              onValueChange={setEnableSeasonalAdjustment}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>トレンド分析を有効にする</Text>
            <Switch
              value={enableTrendAnalysis}
              onValueChange={setEnableTrendAnalysis}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>信頼度しきい値</Text>
            <TextInput
              style={styles.settingInput}
              value={confidenceThreshold}
              onChangeText={setConfidenceThreshold}
              placeholder="0.6"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>最大推奨数</Text>
            <TextInput
              style={styles.settingInput}
              value={maxRecommendations}
              onChangeText={setMaxRecommendations}
              placeholder="20"
              keyboardType="numeric"
            />
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
          {onConfigureSettings && (
            <TouchableOpacity style={styles.advancedButton} onPress={onConfigureSettings}>
              <Text style={styles.advancedButtonText}>詳細設定</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  predictionsList: {
    flex: 1,
    padding: 16,
  },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  predictionDetails: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  analyticsContainer: {
    flex: 1,
    padding: 16,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  productRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 30,
  },
  productInfo: {
    flex: 1,
  },
  productRankName: {
    fontSize: 16,
    color: '#333',
  },
  productRankCount: {
    fontSize: 14,
    color: '#666',
  },
  seasonTrendItem: {
    marginBottom: 16,
  },
  seasonName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  popularProducts: {
    gap: 4,
  },
  trendProduct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  trendProductName: {
    fontSize: 14,
    color: '#444',
  },
  trendIncrease: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  shoppingListContainer: {
    flex: 1,
  },
  shoppingListHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  shoppingListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shoppingListSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  shoppingItem: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shoppingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shoppingItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shoppingItemCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  shoppingItemQuantity: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  shoppingItemReason: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  shoppingItemCost: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  shoppingItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalProductName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 4,
  },
  modalReason: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  modalPattern: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 80,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advancedButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecommendationSystemUI;
