/**
 * Analytics Charts UI Component
 * 統計グラフとチャートの表示コンポーネント
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { statisticsEngineService, MonthlyReport, YearlyReport, TrendData, CategoryStatistics } from '../services/StatisticsEngineService';
import { userManagementService } from '../services/UserManagementService';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsChartsUIProps {
  onNavigateBack?: () => void;
}

type ChartType = 'trends' | 'categories' | 'locations' | 'costs';
type TimeRange = 'week' | 'month' | 'quarter' | 'year';

interface ChartConfig {
  backgroundColor: string;
  backgroundGradientFrom: string;
  backgroundGradientTo: string;
  decimalPlaces: number;
  color: (opacity?: number) => string;
  labelColor: (opacity?: number) => string;
  style: {
    borderRadius: number;
  };
  propsForDots: {
    r: string;
    strokeWidth: string;
    stroke: string;
  };
}

export const AnalyticsChartsUI: React.FC<AnalyticsChartsUIProps> = ({ onNavigateBack }) => {
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<ChartType>('trends');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStatistics[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);

  // チャート設定
  const chartConfig: ChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f8f9fa',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(60, 60, 67, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const familyGroup = userManagementService.getCurrentFamilyGroup();
      
      if (!familyGroup) {
        Alert.alert('エラー', 'ファミリーグループに参加していません');
        return;
      }

      const now = Date.now();
      const endDate = now;
      let startDate: number;
      let groupBy: 'day' | 'week' | 'month' = 'day';

      switch (timeRange) {
        case 'week':
          startDate = now - (7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'month':
          startDate = now - (30 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'quarter':
          startDate = now - (90 * 24 * 60 * 60 * 1000);
          groupBy = 'week';
          break;
        case 'year':
          startDate = now - (365 * 24 * 60 * 60 * 1000);
          groupBy = 'month';
          break;
        default:
          startDate = now - (30 * 24 * 60 * 60 * 1000);
      }

      // 並列でデータを取得
      const [trends, categories, monthly, yearly] = await Promise.all([
        statisticsEngineService.generateTrendData(startDate, endDate, groupBy, familyGroup.id),
        statisticsEngineService.analyzeCategories(familyGroup.id, { start: startDate, end: endDate }),
        statisticsEngineService.generateMonthlyReport(new Date().getFullYear(), new Date().getMonth() + 1, familyGroup.id),
        statisticsEngineService.generateYearlyReport(new Date().getFullYear(), familyGroup.id),
      ]);

      setTrendData(trends);
      setCategoryStats(categories);
      setMonthlyReport(monthly);
      setYearlyReport(yearly);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
      Alert.alert('エラー', '分析データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // トレンドチャートデータ
  const trendChartData = useMemo(() => {
    if (!trendData.length) return null;

    const labels = trendData.map(item => {
      const date = new Date(item.timestamp);
      switch (timeRange) {
        case 'week':
        case 'month':
          return `${date.getMonth() + 1}/${date.getDate()}`;
        case 'quarter':
          return `${date.getMonth() + 1}月`;
        case 'year':
          return `${date.getMonth() + 1}月`;
        default:
          return date.toLocaleDateString();
      }
    });

    return {
      labels: labels.slice(-10), // 最新10ポイントのみ表示
      datasets: [
        {
          data: trendData.slice(-10).map(item => item.totalItems),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: trendData.slice(-10).map(item => item.expiredItems),
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['追加アイテム', '期限切れアイテム'],
    };
  }, [trendData, timeRange]);

  // カテゴリチャートデータ
  const categoryChartData = useMemo(() => {
    if (!categoryStats.length) return null;

    const topCategories = categoryStats.slice(0, 8); // 上位8カテゴリ
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30',
      '#AF52DE', '#FF2D92', '#5AC8FA', '#FFCC00'
    ];

    return {
      labels: topCategories.map(cat => cat.category),
      datasets: [
        {
          data: topCategories.map(cat => cat.totalItems),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        },
      ],
    };
  }, [categoryStats]);

  // カテゴリ円グラフデータ
  const categoryPieData = useMemo(() => {
    if (!categoryStats.length) return [];

    const topCategories = categoryStats.slice(0, 6);
    const colors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D92'
    ];

    return topCategories.map((cat, index) => ({
      name: cat.category,
      population: cat.totalValue,
      color: colors[index % colors.length],
      legendFontColor: '#3C3C43',
      legendFontSize: 12,
    }));
  }, [categoryStats]);

  // コストトレンドデータ
  const costTrendData = useMemo(() => {
    if (!trendData.length) return null;

    const labels = trendData.map(item => {
      const date = new Date(item.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    return {
      labels: labels.slice(-10),
      datasets: [
        {
          data: trendData.slice(-10).map(item => Math.round(item.totalValue)),
          color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['総コスト'],
    };
  }, [trendData]);

  const renderTrendsChart = () => {
    if (!trendChartData) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>在庫トレンド</Text>
        <LineChart
          data={trendChartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={false}
          withOuterLines={false}
        />
        <View style={styles.chartDescription}>
          <Text style={styles.descriptionText}>
            {timeRange === 'week' ? '過去7日間' : 
             timeRange === 'month' ? '過去30日間' : 
             timeRange === 'quarter' ? '過去3ヶ月間' : '過去1年間'}の在庫変動
          </Text>
        </View>
      </View>
    );
  };

  const renderCategoriesChart = () => {
    if (!categoryChartData) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>カテゴリ別アイテム数</Text>
          <BarChart
            data={categoryChartData}
            width={Math.max(screenWidth - 32, categoryStats.length * 50)}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            withInnerLines={false}
            showValuesOnTopOfBars={true}
            fromZero={true}
          />
        </View>
      </ScrollView>
    );
  };

  const renderCategoriesPieChart = () => {
    if (!categoryPieData.length) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>カテゴリ別コスト分布</Text>
        <PieChart
          data={categoryPieData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    );
  };

  const renderCostChart = () => {
    if (!costTrendData) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>データがありません</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>コストトレンド</Text>
        <LineChart
          data={costTrendData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
          }}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          formatYLabel={(value) => `¥${value}`}
        />
      </View>
    );
  };

  const renderInsights = () => {
    if (!monthlyReport && !yearlyReport) return null;

    const insights = monthlyReport?.insights || yearlyReport?.insights || [];
    const recommendations = monthlyReport?.recommendations || yearlyReport?.recommendations || [];

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>インサイト</Text>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <Icon name="lightbulb-outline" size={20} color="#FF9500" />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>推奨事項</Text>
        {recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Icon name="trending-up" size={20} color="#34C759" />
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStatsOverview = () => {
    if (!monthlyReport) return null;

    const stats = [
      {
        title: '今月の総取引',
        value: monthlyReport.totalTransactions.toString(),
        icon: 'swap-horiz',
        color: '#007AFF',
      },
      {
        title: '追加アイテム',
        value: monthlyReport.totalItemsAdded.toString(),
        icon: 'add-circle-outline',
        color: '#34C759',
      },
      {
        title: '消費アイテム',
        value: monthlyReport.totalItemsConsumed.toString(),
        icon: 'remove-circle-outline',
        color: '#FF9500',
      },
      {
        title: '期限切れアイテム',
        value: monthlyReport.totalItemsExpired.toString(),
        icon: 'warning',
        color: '#FF3B30',
      },
    ];

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>今月の概要</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Icon name={stat.icon} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>分析データを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>分析ダッシュボード</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAnalyticsData}>
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 統計概要 */}
        {renderStatsOverview()}

        {/* 期間選択 */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>表示期間</Text>
          <View style={styles.timeRangeSelector}>
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range as TimeRange)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range === 'week' ? '1週間' :
                   range === 'month' ? '1ヶ月' :
                   range === 'quarter' ? '3ヶ月' : '1年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* チャート選択 */}
        <View style={styles.chartTypeContainer}>
          <Text style={styles.sectionTitle}>表示グラフ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartTypeSelector}>
              {[
                { key: 'trends', label: 'トレンド', icon: 'trending-up' },
                { key: 'categories', label: 'カテゴリ', icon: 'pie-chart' },
                { key: 'locations', label: '場所別', icon: 'location-on' },
                { key: 'costs', label: 'コスト', icon: 'attach-money' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.chartTypeButton,
                    activeChart === type.key && styles.chartTypeButtonActive,
                  ]}
                  onPress={() => setActiveChart(type.key as ChartType)}
                >
                  <Icon
                    name={type.icon}
                    size={20}
                    color={activeChart === type.key ? '#FFFFFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.chartTypeText,
                      activeChart === type.key && styles.chartTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* チャート表示 */}
        <View style={styles.chartsSection}>
          {activeChart === 'trends' && renderTrendsChart()}
          {activeChart === 'categories' && (
            <>
              {renderCategoriesChart()}
              {renderCategoriesPieChart()}
            </>
          )}
          {activeChart === 'costs' && renderCostChart()}
        </View>

        {/* インサイトと推奨事項 */}
        {renderInsights()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  timeRangeContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: 'white',
  },
  chartTypeContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  chartTypeSelector: {
    flexDirection: 'row',
  },
  chartTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 12,
  },
  chartTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  chartTypeText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  chartTypeTextActive: {
    color: 'white',
  },
  chartsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartDescription: {
    marginTop: 8,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyChart: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  insightsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 12,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default AnalyticsChartsUI;
