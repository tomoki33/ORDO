/**
 * Statistics Engine Service
 * 在庫データの統計分析エンジン
 */

import { firebaseService } from './FirebaseServiceSwitcher';
import { userManagementService } from './UserManagementService';
import { sqliteService } from './sqliteService';

// 基本データ型
export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  category: string;
  location: string;
  transactionType: 'add' | 'remove' | 'update' | 'expire' | 'consume';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  cost?: number;
  expiryDate?: string;
  userId: string;
  userName: string;
  familyId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ProductData {
  id: string;
  name: string;
  category: string;
  location: string;
  currentQuantity: number;
  unit: string;
  cost?: number;
  expiryDate?: string;
  addedAt: number;
  lastUpdated: number;
  totalAdded: number;
  totalConsumed: number;
  totalExpired: number;
  averageCost: number;
}

// 統計レポート型
export interface CategoryStatistics {
  category: string;
  totalItems: number;
  totalValue: number;
  averageQuantity: number;
  mostAddedProduct: string;
  mostConsumedProduct: string;
  expirationRate: number;
  costPerItem: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  monthlyGrowth: number;
}

export interface LocationStatistics {
  location: string;
  totalItems: number;
  totalValue: number;
  utilizationRate: number;
  expirationRate: number;
  averageStorageDuration: number;
  mostStoredCategory: string;
  capacityUtilization: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  period: string;
  totalTransactions: number;
  totalItemsAdded: number;
  totalItemsConsumed: number;
  totalItemsExpired: number;
  totalValue: number;
  averageCost: number;
  categoryBreakdown: CategoryStatistics[];
  locationBreakdown: LocationStatistics[];
  topProducts: Array<{
    productName: string;
    category: string;
    totalQuantity: number;
    totalValue: number;
    frequency: number;
  }>;
  trends: {
    additionTrend: number;
    consumptionTrend: number;
    costTrend: number;
    expirationTrend: number;
  };
  insights: string[];
  recommendations: string[];
}

export interface YearlyReport {
  year: number;
  totalTransactions: number;
  totalValue: number;
  monthlyBreakdown: MonthlyReport[];
  annualTrends: {
    peakMonth: string;
    lowestMonth: string;
    averageMonthlyGrowth: number;
    seasonalPatterns: Array<{
      season: string;
      averageActivity: number;
      dominantCategories: string[];
    }>;
  };
  categoryAnalysis: Array<{
    category: string;
    yearlyTotal: number;
    yearlyValue: number;
    seasonality: number;
    growth: number;
  }>;
  costAnalysis: {
    totalSpent: number;
    averageMonthlySpend: number;
    costEfficiency: number;
    wasteValue: number;
    savingsOpportunities: string[];
  };
  insights: string[];
  recommendations: string[];
}

export interface TrendData {
  period: string;
  timestamp: number;
  totalItems: number;
  totalValue: number;
  addedItems: number;
  consumedItems: number;
  expiredItems: number;
  averageCost: number;
  categoryDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
}

export interface AnalyticsQuery {
  startDate?: number;
  endDate?: number;
  categories?: string[];
  locations?: string[];
  products?: string[];
  transactionTypes?: string[];
  userId?: string;
  familyId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  metrics?: string[];
  limit?: number;
}

class StatisticsEngineService {
  private transactionCache: Map<string, InventoryTransaction[]> = new Map();
  private productCache: Map<string, ProductData[]> = new Map();
  private statisticsCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  constructor() {
    this.initializeEventListeners();
  }

  /**
   * イベントリスナー初期化
   */
  private initializeEventListeners(): void {
    // ユーザー管理システムからのイベント
    userManagementService.addEventListener((event, data) => {
      if (event === 'family_joined' || event === 'family_left') {
        this.clearCache();
      }
    });
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing Statistics Engine Service...');
    
    try {
      // 既存データの移行処理
      await this.migrateExistingData();
      
      // インデックスの作成
      await this.createAnalyticsIndexes();
      
      console.log('✅ Statistics Engine Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Statistics Engine Service:', error);
      throw error;
    }
  }

  /**
   * 既存データの移行
   */
  private async migrateExistingData(): Promise<void> {
    try {
      // SQLiteから既存の商品データを取得
      const existingProducts = await sqliteService.getAllProducts();
      
      for (const product of existingProducts) {
        // トランザクション履歴が存在しない場合は作成
        await this.ensureTransactionHistory(product);
      }
      
      console.log(`📦 Migrated ${existingProducts.length} existing products`);
    } catch (error) {
      console.error('Failed to migrate existing data:', error);
    }
  }

  /**
   * 商品のトランザクション履歴を確保
   */
  private async ensureTransactionHistory(product: any): Promise<void> {
    const user = userManagementService.getCurrentUser();
    if (!user) return;

    const transaction: InventoryTransaction = {
      id: `migration_${product.id}_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      category: product.category || 'その他',
      location: product.location || 'その他',
      transactionType: 'add',
      quantityChange: product.quantity || 1,
      previousQuantity: 0,
      newQuantity: product.quantity || 1,
      cost: product.cost,
      expiryDate: product.expirationDate,
      userId: user.id,
      userName: user.displayName || 'Unknown',
      familyId: userManagementService.getCurrentFamilyGroup()?.id,
      timestamp: product.addedAt || Date.now(),
      metadata: {
        migrated: true,
        originalId: product.id,
      },
    };

    await this.recordTransaction(transaction);
  }

  /**
   * 分析用インデックス作成
   */
  private async createAnalyticsIndexes(): Promise<void> {
    try {
      // Firestoreでの複合インデックスは手動作成が必要
      // ここでは将来的なクエリパフォーマンス向上のためのログ出力
      console.log('📊 Analytics indexes should be created in Firestore console:');
      console.log('  - transactions: [familyId, timestamp]');
      console.log('  - transactions: [familyId, category, timestamp]');
      console.log('  - transactions: [familyId, userId, timestamp]');
      console.log('  - transactions: [familyId, transactionType, timestamp]');
    } catch (error) {
      console.error('Failed to create analytics indexes:', error);
    }
  }

  /**
   * トランザクション記録
   */
  async recordTransaction(transaction: InventoryTransaction): Promise<void> {
    try {
      // Firestoreに保存
      await firebaseService.collection('inventoryTransactions')
        .doc(transaction.id)
        .set(transaction);

      // キャッシュクリア
      this.clearCacheForFamily(transaction.familyId);

      console.log(`📊 Transaction recorded: ${transaction.transactionType} - ${transaction.productName}`);
    } catch (error) {
      console.error('Failed to record transaction:', error);
      throw error;
    }
  }

  /**
   * 商品追加時のトランザクション記録
   */
  async recordProductAdd(
    productId: string,
    productName: string,
    category: string,
    location: string,
    quantity: number,
    cost?: number,
    expiryDate?: string
  ): Promise<void> {
    const user = userManagementService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const transaction: InventoryTransaction = {
      id: `add_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName,
      category,
      location,
      transactionType: 'add',
      quantityChange: quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      cost,
      expiryDate,
      userId: user.id,
      userName: user.displayName || 'Unknown',
      familyId: userManagementService.getCurrentFamilyGroup()?.id,
      timestamp: Date.now(),
    };

    await this.recordTransaction(transaction);
  }

  /**
   * 商品更新時のトランザクション記録
   */
  async recordProductUpdate(
    productId: string,
    productName: string,
    category: string,
    location: string,
    previousQuantity: number,
    newQuantity: number,
    cost?: number
  ): Promise<void> {
    const user = userManagementService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const transaction: InventoryTransaction = {
      id: `update_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName,
      category,
      location,
      transactionType: 'update',
      quantityChange: newQuantity - previousQuantity,
      previousQuantity,
      newQuantity,
      cost,
      userId: user.id,
      userName: user.displayName || 'Unknown',
      familyId: userManagementService.getCurrentFamilyGroup()?.id,
      timestamp: Date.now(),
    };

    await this.recordTransaction(transaction);
  }

  /**
   * 商品消費時のトランザクション記録
   */
  async recordProductConsumption(
    productId: string,
    productName: string,
    category: string,
    location: string,
    consumedQuantity: number,
    previousQuantity: number
  ): Promise<void> {
    const user = userManagementService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const transaction: InventoryTransaction = {
      id: `consume_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName,
      category,
      location,
      transactionType: 'consume',
      quantityChange: -consumedQuantity,
      previousQuantity,
      newQuantity: previousQuantity - consumedQuantity,
      userId: user.id,
      userName: user.displayName || 'Unknown',
      familyId: userManagementService.getCurrentFamilyGroup()?.id,
      timestamp: Date.now(),
    };

    await this.recordTransaction(transaction);
  }

  /**
   * 期限切れ記録
   */
  async recordProductExpiration(
    productId: string,
    productName: string,
    category: string,
    location: string,
    expiredQuantity: number,
    cost?: number
  ): Promise<void> {
    const user = userManagementService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const transaction: InventoryTransaction = {
      id: `expire_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId,
      productName,
      category,
      location,
      transactionType: 'expire',
      quantityChange: -expiredQuantity,
      previousQuantity: expiredQuantity,
      newQuantity: 0,
      cost,
      userId: user.id,
      userName: user.displayName || 'Unknown',
      familyId: userManagementService.getCurrentFamilyGroup()?.id,
      timestamp: Date.now(),
      metadata: {
        wasteValue: cost ? cost * expiredQuantity : undefined,
      },
    };

    await this.recordTransaction(transaction);
  }

  /**
   * トランザクション履歴取得
   */
  async getTransactions(query: AnalyticsQuery = {}): Promise<InventoryTransaction[]> {
    try {
      const user = userManagementService.getCurrentUser();
      const familyId = query.familyId || userManagementService.getCurrentFamilyGroup()?.id;
      
      if (!familyId) {
        return [];
      }

      // キャッシュチェック
      const cacheKey = this.generateCacheKey('transactions', query);
      if (this.isCacheValid(cacheKey)) {
        return this.transactionCache.get(cacheKey) || [];
      }

      let firestoreQuery = firebaseService.collection('inventoryTransactions')
        .where('familyId', '==', familyId);

      // 日付範囲フィルター
      if (query.startDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '>=', query.startDate);
      }
      if (query.endDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '<=', query.endDate);
      }

      // ソート
      firestoreQuery = firestoreQuery.orderBy('timestamp', 'desc');

      // 制限
      if (query.limit) {
        firestoreQuery = firestoreQuery.limit(query.limit);
      }

      const snapshot = await firestoreQuery.get();
      const transactions = snapshot.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      })) as InventoryTransaction[];

      // 追加フィルタリング（Firestoreの制限により）
      let filteredTransactions = transactions;

      if (query.categories?.length) {
        filteredTransactions = filteredTransactions.filter(t => 
          query.categories!.includes(t.category)
        );
      }

      if (query.locations?.length) {
        filteredTransactions = filteredTransactions.filter(t => 
          query.locations!.includes(t.location)
        );
      }

      if (query.products?.length) {
        filteredTransactions = filteredTransactions.filter(t => 
          query.products!.includes(t.productName)
        );
      }

      if (query.transactionTypes?.length) {
        filteredTransactions = filteredTransactions.filter(t => 
          query.transactionTypes!.includes(t.transactionType)
        );
      }

      if (query.userId) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.userId === query.userId
        );
      }

      // キャッシュに保存
      this.transactionCache.set(cacheKey, filteredTransactions);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return filteredTransactions;
    } catch (error) {
      console.error('Failed to get transactions:', error);
      throw error;
    }
  }

  /**
   * 月次レポート生成
   */
  async generateMonthlyReport(year: number, month: number, familyId?: string): Promise<MonthlyReport> {
    try {
      const cacheKey = `monthly_${year}_${month}_${familyId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.statisticsCache.get(cacheKey);
      }

      const startDate = new Date(year, month - 1, 1).getTime();
      const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

      const transactions = await this.getTransactions({
        startDate,
        endDate,
        familyId,
      });

      // 基本統計
      const totalTransactions = transactions.length;
      const totalItemsAdded = transactions
        .filter(t => t.transactionType === 'add')
        .reduce((sum, t) => sum + t.quantityChange, 0);
      const totalItemsConsumed = transactions
        .filter(t => t.transactionType === 'consume')
        .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
      const totalItemsExpired = transactions
        .filter(t => t.transactionType === 'expire')
        .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

      const totalValue = transactions
        .filter(t => t.cost)
        .reduce((sum, t) => sum + (t.cost! * Math.abs(t.quantityChange)), 0);
      const averageCost = totalValue / (totalItemsAdded || 1);

      // カテゴリ別分析
      const categoryBreakdown = await this.analyzeCategoriesByPeriod(transactions);

      // 場所別分析
      const locationBreakdown = await this.analyzeLocationsByPeriod(transactions);

      // 人気商品
      const topProducts = this.analyzeTopProducts(transactions).slice(0, 10);

      // トレンド分析
      const trends = await this.calculateTrends(year, month, familyId);

      // インサイトと推奨事項
      const insights = this.generateMonthlyInsights(transactions, {
        totalItemsAdded,
        totalItemsConsumed,
        totalItemsExpired,
        totalValue,
      });

      const recommendations = this.generateMonthlyRecommendations(transactions, categoryBreakdown);

      const monthlyReport: MonthlyReport = {
        year,
        month,
        period: `${year}年${month}月`,
        totalTransactions,
        totalItemsAdded,
        totalItemsConsumed,
        totalItemsExpired,
        totalValue,
        averageCost,
        categoryBreakdown,
        locationBreakdown,
        topProducts,
        trends,
        insights,
        recommendations,
      };

      // キャッシュに保存
      this.statisticsCache.set(cacheKey, monthlyReport);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return monthlyReport;
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
      throw error;
    }
  }

  /**
   * 年次レポート生成
   */
  async generateYearlyReport(year: number, familyId?: string): Promise<YearlyReport> {
    try {
      const cacheKey = `yearly_${year}_${familyId}`;
      if (this.isCacheValid(cacheKey)) {
        return this.statisticsCache.get(cacheKey);
      }

      // 月次レポートを並列取得
      const monthlyReports = await Promise.all(
        Array.from({ length: 12 }, (_, i) => 
          this.generateMonthlyReport(year, i + 1, familyId)
        )
      );

      // 年間統計
      const totalTransactions = monthlyReports.reduce((sum, report) => sum + report.totalTransactions, 0);
      const totalValue = monthlyReports.reduce((sum, report) => sum + report.totalValue, 0);

      // 月別ピーク分析
      const monthlyValues = monthlyReports.map((report, index) => ({
        month: index + 1,
        monthName: `${index + 1}月`,
        value: report.totalValue,
        transactions: report.totalTransactions,
      }));

      const peakMonth = monthlyValues.reduce((max, current) => 
        current.value > max.value ? current : max
      ).monthName;

      const lowestMonth = monthlyValues.reduce((min, current) => 
        current.value < min.value ? current : min
      ).monthName;

      // 成長率計算
      const monthlyGrowthRates = monthlyValues.slice(1).map((current, index) => {
        const previous = monthlyValues[index];
        return previous.value > 0 ? (current.value - previous.value) / previous.value * 100 : 0;
      });
      const averageMonthlyGrowth = monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length;

      // 季節パターン分析
      const seasonalPatterns = this.analyzeSeasonalPatterns(monthlyReports);

      // カテゴリ年間分析
      const categoryAnalysis = this.analyzeYearlyCategorys(monthlyReports);

      // コスト分析
      const costAnalysis = this.analyzeCosts(monthlyReports);

      // インサイトと推奨事項
      const insights = this.generateYearlyInsights(monthlyReports, {
        peakMonth,
        lowestMonth,
        averageMonthlyGrowth,
      });

      const recommendations = this.generateYearlyRecommendations(monthlyReports, categoryAnalysis);

      const yearlyReport: YearlyReport = {
        year,
        totalTransactions,
        totalValue,
        monthlyBreakdown: monthlyReports,
        annualTrends: {
          peakMonth,
          lowestMonth,
          averageMonthlyGrowth,
          seasonalPatterns,
        },
        categoryAnalysis,
        costAnalysis,
        insights,
        recommendations,
      };

      // キャッシュに保存
      this.statisticsCache.set(cacheKey, yearlyReport);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION * 2); // 年次レポートは長めにキャッシュ

      return yearlyReport;
    } catch (error) {
      console.error('Failed to generate yearly report:', error);
      throw error;
    }
  }

  /**
   * トレンドデータ生成
   */
  async generateTrendData(
    startDate: number,
    endDate: number,
    groupBy: 'day' | 'week' | 'month' = 'day',
    familyId?: string
  ): Promise<TrendData[]> {
    try {
      const transactions = await this.getTransactions({
        startDate,
        endDate,
        familyId,
      });

      const trendMap = new Map<string, TrendData>();

      // 期間ごとにグループ化
      transactions.forEach(transaction => {
        const periodKey = this.getPeriodKey(transaction.timestamp, groupBy);
        
        if (!trendMap.has(periodKey)) {
          trendMap.set(periodKey, {
            period: periodKey,
            timestamp: this.getPeriodTimestamp(periodKey, groupBy),
            totalItems: 0,
            totalValue: 0,
            addedItems: 0,
            consumedItems: 0,
            expiredItems: 0,
            averageCost: 0,
            categoryDistribution: {},
            locationDistribution: {},
          });
        }

        const trendData = trendMap.get(periodKey)!;
        const quantity = Math.abs(transaction.quantityChange);
        const value = transaction.cost ? transaction.cost * quantity : 0;

        trendData.totalItems += quantity;
        trendData.totalValue += value;

        switch (transaction.transactionType) {
          case 'add':
            trendData.addedItems += quantity;
            break;
          case 'consume':
            trendData.consumedItems += quantity;
            break;
          case 'expire':
            trendData.expiredItems += quantity;
            break;
        }

        // カテゴリ分布
        trendData.categoryDistribution[transaction.category] = 
          (trendData.categoryDistribution[transaction.category] || 0) + quantity;

        // 場所分布
        trendData.locationDistribution[transaction.location] = 
          (trendData.locationDistribution[transaction.location] || 0) + quantity;
      });

      // 平均コスト計算
      Array.from(trendMap.values()).forEach(data => {
        data.averageCost = data.totalItems > 0 ? data.totalValue / data.totalItems : 0;
      });

      return Array.from(trendMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Failed to generate trend data:', error);
      throw error;
    }
  }

  /**
   * カテゴリ別分析
   */
  async analyzeCategories(familyId?: string, period?: { start: number; end: number }): Promise<CategoryStatistics[]> {
    try {
      const query: AnalyticsQuery = { familyId };
      if (period) {
        query.startDate = period.start;
        query.endDate = period.end;
      }

      const transactions = await this.getTransactions(query);
      return this.analyzeCategoriesByPeriod(transactions);
    } catch (error) {
      console.error('Failed to analyze categories:', error);
      throw error;
    }
  }

  // === プライベートメソッド ===

  /**
   * カテゴリ別分析（期間内）
   */
  private async analyzeCategoriesByPeriod(transactions: InventoryTransaction[]): Promise<CategoryStatistics[]> {
    const categoryMap = new Map<string, {
      transactions: InventoryTransaction[];
      totalItems: number;
      totalValue: number;
      addedItems: number;
      consumedItems: number;
      expiredItems: number;
      products: Set<string>;
    }>();

    // カテゴリごとにデータ集計
    transactions.forEach(transaction => {
      const category = transaction.category;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          transactions: [],
          totalItems: 0,
          totalValue: 0,
          addedItems: 0,
          consumedItems: 0,
          expiredItems: 0,
          products: new Set(),
        });
      }

      const data = categoryMap.get(category)!;
      data.transactions.push(transaction);
      
      const quantity = Math.abs(transaction.quantityChange);
      const value = transaction.cost ? transaction.cost * quantity : 0;
      
      data.totalItems += quantity;
      data.totalValue += value;
      data.products.add(transaction.productName);

      switch (transaction.transactionType) {
        case 'add':
          data.addedItems += quantity;
          break;
        case 'consume':
          data.consumedItems += quantity;
          break;
        case 'expire':
          data.expiredItems += quantity;
          break;
      }
    });

    // 統計計算
    const categoryStats: CategoryStatistics[] = [];

    for (const [category, data] of categoryMap) {
      // 最も追加された商品
      const addedProducts = new Map<string, number>();
      data.transactions
        .filter(t => t.transactionType === 'add')
        .forEach(t => {
          addedProducts.set(t.productName, 
            (addedProducts.get(t.productName) || 0) + t.quantityChange
          );
        });
      const mostAddedProduct = this.getTopEntry(addedProducts) || 'なし';

      // 最も消費された商品
      const consumedProducts = new Map<string, number>();
      data.transactions
        .filter(t => t.transactionType === 'consume')
        .forEach(t => {
          consumedProducts.set(t.productName, 
            (consumedProducts.get(t.productName) || 0) + Math.abs(t.quantityChange)
          );
        });
      const mostConsumedProduct = this.getTopEntry(consumedProducts) || 'なし';

      // 期限切れ率
      const expirationRate = data.addedItems > 0 ? (data.expiredItems / data.addedItems) * 100 : 0;

      // アイテムあたりコスト
      const costPerItem = data.totalItems > 0 ? data.totalValue / data.totalItems : 0;

      // トレンド分析（簡易版）
      const trend = this.calculateCategoryTrend(data.transactions);

      // 月次成長率（簡易計算）
      const monthlyGrowth = this.calculateMonthlyGrowth(data.transactions);

      categoryStats.push({
        category,
        totalItems: data.totalItems,
        totalValue: data.totalValue,
        averageQuantity: data.totalItems / data.products.size,
        mostAddedProduct,
        mostConsumedProduct,
        expirationRate,
        costPerItem,
        trend,
        monthlyGrowth,
      });
    }

    return categoryStats.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * 場所別分析（期間内）
   */
  private async analyzeLocationsByPeriod(transactions: InventoryTransaction[]): Promise<LocationStatistics[]> {
    const locationMap = new Map<string, {
      transactions: InventoryTransaction[];
      totalItems: number;
      totalValue: number;
      categories: Map<string, number>;
      storageDurations: number[];
    }>();

    transactions.forEach(transaction => {
      const location = transaction.location;
      
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          transactions: [],
          totalItems: 0,
          totalValue: 0,
          categories: new Map(),
          storageDurations: [],
        });
      }

      const data = locationMap.get(location)!;
      data.transactions.push(transaction);
      
      const quantity = Math.abs(transaction.quantityChange);
      const value = transaction.cost ? transaction.cost * quantity : 0;
      
      data.totalItems += quantity;
      data.totalValue += value;
      
      // カテゴリ分布
      data.categories.set(transaction.category, 
        (data.categories.get(transaction.category) || 0) + quantity
      );
    });

    const locationStats: LocationStatistics[] = [];

    for (const [location, data] of locationMap) {
      // 利用率（簡易計算）
      const utilizationRate = this.calculateLocationUtilization(data.transactions);

      // 期限切れ率
      const expiredItems = data.transactions
        .filter(t => t.transactionType === 'expire')
        .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
      const expirationRate = data.totalItems > 0 ? (expiredItems / data.totalItems) * 100 : 0;

      // 平均保存期間
      const averageStorageDuration = this.calculateAverageStorageDuration(data.transactions);

      // 最も保存されているカテゴリ
      const mostStoredCategory = this.getTopEntry(data.categories) || 'なし';

      // 容量利用率（仮の計算）
      const capacityUtilization = Math.min(data.totalItems / 100, 1) * 100; // 100を最大容量と仮定

      locationStats.push({
        location,
        totalItems: data.totalItems,
        totalValue: data.totalValue,
        utilizationRate,
        expirationRate,
        averageStorageDuration,
        mostStoredCategory,
        capacityUtilization,
      });
    }

    return locationStats.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * 人気商品分析
   */
  private analyzeTopProducts(transactions: InventoryTransaction[]): Array<{
    productName: string;
    category: string;
    totalQuantity: number;
    totalValue: number;
    frequency: number;
  }> {
    const productMap = new Map<string, {
      category: string;
      totalQuantity: number;
      totalValue: number;
      frequency: number;
    }>();

    transactions.forEach(transaction => {
      const product = transaction.productName;
      
      if (!productMap.has(product)) {
        productMap.set(product, {
          category: transaction.category,
          totalQuantity: 0,
          totalValue: 0,
          frequency: 0,
        });
      }

      const data = productMap.get(product)!;
      const quantity = Math.abs(transaction.quantityChange);
      const value = transaction.cost ? transaction.cost * quantity : 0;
      
      data.totalQuantity += quantity;
      data.totalValue += value;
      data.frequency++;
    });

    return Array.from(productMap.entries())
      .map(([productName, data]) => ({
        productName,
        category: data.category,
        totalQuantity: data.totalQuantity,
        totalValue: data.totalValue,
        frequency: data.frequency,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * トレンド計算
   */
  private async calculateTrends(year: number, month: number, familyId?: string): Promise<{
    additionTrend: number;
    consumptionTrend: number;
    costTrend: number;
    expirationTrend: number;
  }> {
    try {
      // 前月のデータを取得
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      const prevMonthTransactions = await this.getTransactions({
        startDate: new Date(prevYear, prevMonth - 1, 1).getTime(),
        endDate: new Date(prevYear, prevMonth, 0, 23, 59, 59).getTime(),
        familyId,
      });

      const currentMonthTransactions = await this.getTransactions({
        startDate: new Date(year, month - 1, 1).getTime(),
        endDate: new Date(year, month, 0, 23, 59, 59).getTime(),
        familyId,
      });

      // 各メトリクスの計算
      const calculateMetric = (transactions: InventoryTransaction[], type: string) => {
        return transactions
          .filter(t => t.transactionType === type)
          .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
      };

      const calculateCost = (transactions: InventoryTransaction[]) => {
        return transactions
          .filter(t => t.cost)
          .reduce((sum, t) => sum + (t.cost! * Math.abs(t.quantityChange)), 0);
      };

      const prevAdditions = calculateMetric(prevMonthTransactions, 'add');
      const currentAdditions = calculateMetric(currentMonthTransactions, 'add');
      const additionTrend = prevAdditions > 0 ? ((currentAdditions - prevAdditions) / prevAdditions) * 100 : 0;

      const prevConsumptions = calculateMetric(prevMonthTransactions, 'consume');
      const currentConsumptions = calculateMetric(currentMonthTransactions, 'consume');
      const consumptionTrend = prevConsumptions > 0 ? ((currentConsumptions - prevConsumptions) / prevConsumptions) * 100 : 0;

      const prevCost = calculateCost(prevMonthTransactions);
      const currentCost = calculateCost(currentMonthTransactions);
      const costTrend = prevCost > 0 ? ((currentCost - prevCost) / prevCost) * 100 : 0;

      const prevExpirations = calculateMetric(prevMonthTransactions, 'expire');
      const currentExpirations = calculateMetric(currentMonthTransactions, 'expire');
      const expirationTrend = prevExpirations > 0 ? ((currentExpirations - prevExpirations) / prevExpirations) * 100 : 0;

      return {
        additionTrend,
        consumptionTrend,
        costTrend,
        expirationTrend,
      };
    } catch (error) {
      console.error('Failed to calculate trends:', error);
      return {
        additionTrend: 0,
        consumptionTrend: 0,
        costTrend: 0,
        expirationTrend: 0,
      };
    }
  }

  /**
   * 季節パターン分析
   */
  private analyzeSeasonalPatterns(monthlyReports: MonthlyReport[]): Array<{
    season: string;
    averageActivity: number;
    dominantCategories: string[];
  }> {
    const seasons = [
      { name: '春', months: [3, 4, 5] },
      { name: '夏', months: [6, 7, 8] },
      { name: '秋', months: [9, 10, 11] },
      { name: '冬', months: [12, 1, 2] },
    ];

    return seasons.map(season => {
      const seasonReports = monthlyReports.filter(report => 
        season.months.includes(report.month)
      );

      const averageActivity = seasonReports.length > 0
        ? seasonReports.reduce((sum, report) => sum + report.totalTransactions, 0) / seasonReports.length
        : 0;

      // 支配的カテゴリの算出
      const categoryTotals = new Map<string, number>();
      seasonReports.forEach(report => {
        report.categoryBreakdown.forEach(category => {
          categoryTotals.set(category.category, 
            (categoryTotals.get(category.category) || 0) + category.totalValue
          );
        });
      });

      const dominantCategories = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);

      return {
        season: season.name,
        averageActivity,
        dominantCategories,
      };
    });
  }

  /**
   * 年間カテゴリ分析
   */
  private analyzeYearlyCategorys(monthlyReports: MonthlyReport[]): Array<{
    category: string;
    yearlyTotal: number;
    yearlyValue: number;
    seasonality: number;
    growth: number;
  }> {
    const categoryMap = new Map<string, {
      monthlyValues: number[];
      yearlyTotal: number;
      yearlyValue: number;
    }>();

    // 月別データ集計
    monthlyReports.forEach((report, monthIndex) => {
      report.categoryBreakdown.forEach(category => {
        if (!categoryMap.has(category.category)) {
          categoryMap.set(category.category, {
            monthlyValues: new Array(12).fill(0),
            yearlyTotal: 0,
            yearlyValue: 0,
          });
        }

        const data = categoryMap.get(category.category)!;
        data.monthlyValues[monthIndex] = category.totalValue;
        data.yearlyTotal += category.totalItems;
        data.yearlyValue += category.totalValue;
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => {
      // 季節性計算（標準偏差を使用）
      const mean = data.yearlyValue / 12;
      const variance = data.monthlyValues.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / 12;
      const seasonality = Math.sqrt(variance) / mean * 100;

      // 成長率計算（最初の3ヶ月と最後の3ヶ月を比較）
      const firstQuarter = data.monthlyValues.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
      const lastQuarter = data.monthlyValues.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
      const growth = firstQuarter > 0 ? ((lastQuarter - firstQuarter) / firstQuarter) * 100 : 0;

      return {
        category,
        yearlyTotal: data.yearlyTotal,
        yearlyValue: data.yearlyValue,
        seasonality: isNaN(seasonality) ? 0 : seasonality,
        growth: isNaN(growth) ? 0 : growth,
      };
    }).sort((a, b) => b.yearlyValue - a.yearlyValue);
  }

  /**
   * コスト分析
   */
  private analyzeCosts(monthlyReports: MonthlyReport[]): {
    totalSpent: number;
    averageMonthlySpend: number;
    costEfficiency: number;
    wasteValue: number;
    savingsOpportunities: string[];
  } {
    const totalSpent = monthlyReports.reduce((sum, report) => sum + report.totalValue, 0);
    const averageMonthlySpend = totalSpent / 12;

    // コスト効率（消費アイテム価値 / 総支出）
    const totalConsumed = monthlyReports.reduce((sum, report) => sum + report.totalItemsConsumed, 0);
    const totalAdded = monthlyReports.reduce((sum, report) => sum + report.totalItemsAdded, 0);
    const costEfficiency = totalAdded > 0 ? (totalConsumed / totalAdded) * 100 : 0;

    // 廃棄価値（期限切れアイテムの推定価値）
    const totalExpired = monthlyReports.reduce((sum, report) => sum + report.totalItemsExpired, 0);
    const wasteValue = (totalExpired / totalAdded) * totalSpent;

    // 節約機会
    const savingsOpportunities: string[] = [];
    
    if (wasteValue > totalSpent * 0.1) {
      savingsOpportunities.push('期限切れ削減により年間' + Math.round(wasteValue) + '円の節約可能');
    }
    
    if (costEfficiency < 80) {
      savingsOpportunities.push('購入計画の改善により効率性向上が可能');
    }

    // 最も高コストなカテゴリからの節約提案
    const categoryTotals = new Map<string, number>();
    monthlyReports.forEach(report => {
      report.categoryBreakdown.forEach(category => {
        categoryTotals.set(category.category,
          (categoryTotals.get(category.category) || 0) + category.totalValue
        );
      });
    });

    const topCostCategory = this.getTopEntry(categoryTotals);
    if (topCostCategory && categoryTotals.get(topCostCategory)! > totalSpent * 0.3) {
      savingsOpportunities.push(`${topCostCategory}の購入見直しで大幅な節約が可能`);
    }

    return {
      totalSpent,
      averageMonthlySpend,
      costEfficiency,
      wasteValue,
      savingsOpportunities,
    };
  }

  /**
   * 月次インサイト生成
   */
  private generateMonthlyInsights(
    transactions: InventoryTransaction[],
    summary: {
      totalItemsAdded: number;
      totalItemsConsumed: number;
      totalItemsExpired: number;
      totalValue: number;
    }
  ): string[] {
    const insights: string[] = [];

    // 基本活動レベル
    if (transactions.length > 50) {
      insights.push('今月は活発な在庫管理活動が行われました');
    } else if (transactions.length < 10) {
      insights.push('今月の在庫活動は控えめでした');
    }

    // 期限切れ率
    const expirationRate = summary.totalItemsAdded > 0 
      ? (summary.totalItemsExpired / summary.totalItemsAdded) * 100 
      : 0;
    
    if (expirationRate > 15) {
      insights.push(`期限切れ率が${Math.round(expirationRate)}%と高めです`);
    } else if (expirationRate < 5) {
      insights.push('期限切れが少なく、効率的な管理ができています');
    }

    // 消費率
    const consumptionRate = summary.totalItemsAdded > 0 
      ? (summary.totalItemsConsumed / summary.totalItemsAdded) * 100 
      : 0;
    
    if (consumptionRate > 80) {
      insights.push('購入した商品の多くが活用されています');
    } else if (consumptionRate < 50) {
      insights.push('在庫の回転率改善の余地があります');
    }

    // 平均コスト
    if (summary.totalValue > 0) {
      const avgCost = summary.totalValue / summary.totalItemsAdded;
      if (avgCost > 500) {
        insights.push('比較的高価な商品が多く購入されています');
      } else if (avgCost < 100) {
        insights.push('コストパフォーマンスの良い買い物ができています');
      }
    }

    return insights;
  }

  /**
   * 月次推奨事項生成
   */
  private generateMonthlyRecommendations(
    transactions: InventoryTransaction[],
    categoryBreakdown: CategoryStatistics[]
  ): string[] {
    const recommendations: string[] = [];

    // 期限切れが多いカテゴリ
    const highExpirationCategories = categoryBreakdown
      .filter(cat => cat.expirationRate > 20)
      .slice(0, 2);
    
    highExpirationCategories.forEach(category => {
      recommendations.push(`${category.category}の購入量を調整し、期限切れを削減しましょう`);
    });

    // 高コストカテゴリの最適化
    const highCostCategories = categoryBreakdown
      .filter(cat => cat.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 1);
    
    if (highCostCategories.length > 0) {
      recommendations.push(`${highCostCategories[0].category}のコスト最適化を検討してみてください`);
    }

    // トレンド基づく推奨
    const decreasingCategories = categoryBreakdown
      .filter(cat => cat.trend === 'decreasing')
      .slice(0, 1);
    
    if (decreasingCategories.length > 0) {
      recommendations.push(`${decreasingCategories[0].category}の在庫補充を検討してください`);
    }

    // 一般的な推奨事項
    if (recommendations.length === 0) {
      recommendations.push('現在の在庫管理は良好です。このペースを維持しましょう');
    }

    return recommendations;
  }

  /**
   * 年次インサイト生成
   */
  private generateYearlyInsights(
    monthlyReports: MonthlyReport[],
    trends: { peakMonth: string; lowestMonth: string; averageMonthlyGrowth: number }
  ): string[] {
    const insights: string[] = [];

    // ピーク月分析
    insights.push(`${trends.peakMonth}が最も活発な在庫管理月でした`);
    insights.push(`${trends.lowestMonth}は比較的静かな月でした`);

    // 成長傾向
    if (trends.averageMonthlyGrowth > 5) {
      insights.push('在庫管理活動が着実に増加しています');
    } else if (trends.averageMonthlyGrowth < -5) {
      insights.push('在庫管理活動が減少傾向にあります');
    } else {
      insights.push('安定した在庫管理パターンを維持しています');
    }

    // 年間総合評価
    const totalValue = monthlyReports.reduce((sum, report) => sum + report.totalValue, 0);
    const totalExpired = monthlyReports.reduce((sum, report) => sum + report.totalItemsExpired, 0);
    const totalAdded = monthlyReports.reduce((sum, report) => sum + report.totalItemsAdded, 0);
    
    const annualExpirationRate = totalAdded > 0 ? (totalExpired / totalAdded) * 100 : 0;
    
    if (annualExpirationRate < 10) {
      insights.push('年間を通じて効率的な在庫管理ができています');
    } else if (annualExpirationRate > 20) {
      insights.push('期限切れ削減が来年の重要課題です');
    }

    return insights;
  }

  /**
   * 年次推奨事項生成
   */
  private generateYearlyRecommendations(
    monthlyReports: MonthlyReport[],
    categoryAnalysis: Array<{ category: string; yearlyTotal: number; yearlyValue: number; seasonality: number; growth: number }>
  ): string[] {
    const recommendations: string[] = [];

    // 高季節性カテゴリ
    const highSeasonalityCategories = categoryAnalysis
      .filter(cat => cat.seasonality > 50)
      .slice(0, 2);
    
    highSeasonalityCategories.forEach(category => {
      recommendations.push(`${category.category}は季節性が高いため、計画的な購入を心がけましょう`);
    });

    // 成長カテゴリ
    const growthCategories = categoryAnalysis
      .filter(cat => cat.growth > 20)
      .slice(0, 2);
    
    growthCategories.forEach(category => {
      recommendations.push(`${category.category}の需要が増加しています。供給体制を見直しましょう`);
    });

    // 衰退カテゴリ
    const decliningCategories = categoryAnalysis
      .filter(cat => cat.growth < -20)
      .slice(0, 1);
    
    if (decliningCategories.length > 0) {
      recommendations.push(`${decliningCategories[0].category}の需要が減少しています。購入量の調整を検討してください`);
    }

    // 全体的な推奨事項
    recommendations.push('来年はデータ駆動型の在庫管理でさらなる効率化を目指しましょう');

    return recommendations;
  }

  // === ユーティリティメソッド ===

  /**
   * 期間キー生成
   */
  private getPeriodKey(timestamp: number, groupBy: 'day' | 'week' | 'month'): string {
    const date = new Date(timestamp);
    
    switch (groupBy) {
      case 'day':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * 期間タイムスタンプ取得
   */
  private getPeriodTimestamp(periodKey: string, groupBy: 'day' | 'week' | 'month'): number {
    switch (groupBy) {
      case 'day':
        return new Date(periodKey).getTime();
      case 'week':
        const [year, week] = periodKey.split('-W');
        return new Date(parseInt(year), 0, parseInt(week) * 7).getTime();
      case 'month':
        const [yearStr, monthStr] = periodKey.split('-');
        return new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).getTime();
      default:
        return new Date(periodKey).getTime();
    }
  }

  /**
   * 最頻値取得
   */
  private getTopEntry(map: Map<string, number>): string | null {
    if (map.size === 0) return null;
    
    return Array.from(map.entries())
      .reduce((max, current) => current[1] > max[1] ? current : max)[0];
  }

  /**
   * カテゴリトレンド計算
   */
  private calculateCategoryTrend(transactions: InventoryTransaction[]): 'increasing' | 'decreasing' | 'stable' {
    if (transactions.length < 4) return 'stable';

    // 時系列で並び替え
    const sortedTransactions = transactions.sort((a, b) => a.timestamp - b.timestamp);
    
    // 前半と後半で比較
    const midPoint = Math.floor(sortedTransactions.length / 2);
    const firstHalf = sortedTransactions.slice(0, midPoint);
    const secondHalf = sortedTransactions.slice(midPoint);

    const firstHalfValue = firstHalf.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
    const secondHalfValue = secondHalf.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

    const difference = (secondHalfValue - firstHalfValue) / firstHalfValue * 100;

    if (difference > 10) return 'increasing';
    if (difference < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * 月次成長率計算
   */
  private calculateMonthlyGrowth(transactions: InventoryTransaction[]): number {
    if (transactions.length === 0) return 0;

    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    const recentTransactions = transactions.filter(t => t.timestamp >= oneMonthAgo);
    const olderTransactions = transactions.filter(t => t.timestamp < oneMonthAgo);

    if (olderTransactions.length === 0) return 0;

    const recentValue = recentTransactions.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
    const olderValue = olderTransactions.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

    return olderValue > 0 ? ((recentValue - olderValue) / olderValue) * 100 : 0;
  }

  /**
   * 場所利用率計算
   */
  private calculateLocationUtilization(transactions: InventoryTransaction[]): number {
    // 簡易計算：追加と削除のバランス
    const additions = transactions
      .filter(t => t.transactionType === 'add')
      .reduce((sum, t) => sum + t.quantityChange, 0);
    
    const removals = transactions
      .filter(t => ['consume', 'expire', 'remove'].includes(t.transactionType))
      .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

    return additions > 0 ? (removals / additions) * 100 : 0;
  }

  /**
   * 平均保存期間計算
   */
  private calculateAverageStorageDuration(transactions: InventoryTransaction[]): number {
    // 簡易実装：全期間の平均
    if (transactions.length === 0) return 0;

    const timestamps = transactions.map(t => t.timestamp);
    const duration = Math.max(...timestamps) - Math.min(...timestamps);
    
    return duration / (1000 * 60 * 60 * 24); // 日数
  }

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(type: string, query: any): string {
    return `${type}_${JSON.stringify(query)}`;
  }

  /**
   * キャッシュ有効性チェック
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? expiry > Date.now() : false;
  }

  /**
   * ファミリー別キャッシュクリア
   */
  private clearCacheForFamily(familyId?: string): void {
    const keysToDelete: string[] = [];
    
    this.transactionCache.forEach((_, key) => {
      if (!familyId || key.includes(familyId)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.transactionCache.delete(key);
      this.statisticsCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  /**
   * キャッシュクリア
   */
  private clearCache(): void {
    this.transactionCache.clear();
    this.productCache.clear();
    this.statisticsCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.clearCache();
    console.log('📊 Statistics Engine Service cleanup completed');
  }
}

export const statisticsEngineService = new StatisticsEngineService();
