/**
 * Advanced Conflict Resolution Service
 * 高度なコンフリクト解決システム
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEngine } from './SynchronizationEngine';
import { authService } from './AuthenticationService';

export interface ConflictResolutionRule {
  id: string;
  collection: string;
  field?: string;
  priority: number;
  strategy: ConflictResolutionStrategy;
  condition?: (local: any, remote: any) => boolean;
  resolver?: (local: any, remote: any) => any;
  enabled: boolean;
}

export type ConflictResolutionStrategy = 
  | 'timestamp-wins'
  | 'client-wins' 
  | 'server-wins'
  | 'merge-deep'
  | 'merge-shallow'
  | 'manual'
  | 'field-priority'
  | 'user-preference'
  | 'ai-assisted'
  | 'custom';

export interface ConflictAnalysis {
  id: string;
  collection: string;
  conflictType: 'data' | 'schema' | 'version' | 'deletion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictedFields: string[];
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
  userImpact: 'none' | 'minor' | 'major' | 'breaking';
  autoResolvable: boolean;
  recommendedStrategy: ConflictResolutionStrategy;
  reasoning: string[];
}

export interface ResolutionResult {
  success: boolean;
  resolvedData: any;
  strategy: ConflictResolutionStrategy;
  appliedRules: string[];
  warnings: string[];
  requiresUserAction: boolean;
  confidence: number;
}

export interface ConflictResolutionConfig {
  enableAIAssisted: boolean;
  enableAutoMerge: boolean;
  enableUserPreferences: boolean;
  conflictTimeout: number; // minutes
  maxConflictHistory: number;
  enableConflictPrevention: boolean;
  enableFieldLevelResolution: boolean;
}

class ConflictResolutionService {
  private isInitialized = false;
  private resolutionRules: ConflictResolutionRule[] = [];
  private conflictHistory: Array<{ id: string; timestamp: number; resolution: ResolutionResult }> = [];
  private userPreferences: Map<string, ConflictResolutionStrategy> = new Map();
  private pendingManualResolutions: Map<string, ConflictAnalysis> = new Map();

  private config: ConflictResolutionConfig = {
    enableAIAssisted: true,
    enableAutoMerge: true,
    enableUserPreferences: true,
    conflictTimeout: 30, // 30分
    maxConflictHistory: 1000,
    enableConflictPrevention: true,
    enableFieldLevelResolution: true,
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * コンフリクト解決サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('⚔️ Initializing Conflict Resolution Service...');

    try {
      // 保存された設定とルールを復元
      await this.restoreConfiguration();
      await this.restoreUserPreferences();
      await this.restoreConflictHistory();

      // 期限切れのマニュアル解決待ちをクリーンアップ
      await this.cleanupExpiredManualResolutions();

      this.isInitialized = true;
      console.log('✅ Conflict Resolution Service initialized');

    } catch (error) {
      console.error('❌ Conflict Resolution Service initialization failed:', error);
      throw new Error(`Conflict resolution initialization failed: ${error}`);
    }
  }

  /**
   * デフォルトルールの初期化
   */
  private initializeDefaultRules(): void {
    this.resolutionRules = [
      // 高優先度: クリティカルデータ
      {
        id: 'critical-data-server-wins',
        collection: '*',
        field: 'id',
        priority: 100,
        strategy: 'server-wins',
        condition: (local, remote) => local.critical || remote.critical,
        enabled: true,
      },

      // プロダクトデータ: タイムスタンプ優先
      {
        id: 'product-timestamp-wins',
        collection: 'products',
        priority: 90,
        strategy: 'timestamp-wins',
        enabled: true,
      },

      // インベントリ: サーバー優先（一貫性重視）
      {
        id: 'inventory-server-wins',
        collection: 'inventory',
        priority: 85,
        strategy: 'server-wins',
        enabled: true,
      },

      // ユーザー設定: 深いマージ
      {
        id: 'user-preferences-merge',
        collection: 'user_preferences',
        priority: 80,
        strategy: 'merge-deep',
        enabled: true,
      },

      // 音声コマンド履歴: クライアント優先
      {
        id: 'voice-commands-client-wins',
        collection: 'voice_commands',
        priority: 75,
        strategy: 'client-wins',
        enabled: true,
      },

      // ショッピングリスト: マージ戦略
      {
        id: 'shopping-list-merge',
        collection: 'shopping_lists',
        priority: 70,
        strategy: 'merge-shallow',
        enabled: true,
      },

      // 削除競合: マニュアル確認
      {
        id: 'deletion-conflict-manual',
        collection: '*',
        priority: 95,
        strategy: 'manual',
        condition: (local, remote) => local._deleted !== remote._deleted,
        enabled: true,
      },

      // デフォルト: AI支援解決
      {
        id: 'default-ai-assisted',
        collection: '*',
        priority: 1,
        strategy: 'ai-assisted',
        enabled: true,
      },
    ];

    console.log(`⚔️ Initialized ${this.resolutionRules.length} default resolution rules`);
  }

  /**
   * コンフリクト分析
   */
  async analyzeConflict(
    collection: string,
    id: string,
    localData: any,
    remoteData: any
  ): Promise<ConflictAnalysis> {
    console.log(`🔍 Analyzing conflict for ${collection}/${id}`);

    const conflictedFields = this.identifyConflictedFields(localData, remoteData);
    const conflictType = this.determineConflictType(localData, remoteData);
    const severity = this.assessConflictSeverity(conflictedFields, localData, remoteData);
    const userImpact = this.assessUserImpact(collection, conflictedFields);
    
    // 自動解決可能性評価
    const autoResolvable = this.evaluateAutoResolvability(
      collection,
      conflictType,
      severity,
      conflictedFields
    );

    // 推奨戦略決定
    const recommendedStrategy = await this.determineRecommendedStrategy(
      collection,
      conflictedFields,
      localData,
      remoteData,
      severity
    );

    // 推論理由生成
    const reasoning = this.generateReasoning(
      conflictType,
      severity,
      conflictedFields,
      recommendedStrategy
    );

    const analysis: ConflictAnalysis = {
      id,
      collection,
      conflictType,
      severity,
      conflictedFields,
      localData,
      remoteData,
      localTimestamp: localData.timestamp || 0,
      remoteTimestamp: remoteData.timestamp || 0,
      userImpact,
      autoResolvable,
      recommendedStrategy,
      reasoning,
    };

    console.log(`🔍 Conflict analysis completed: ${severity} severity, ${autoResolvable ? 'auto-resolvable' : 'manual required'}`);
    return analysis;
  }

  /**
   * コンフリクト解決実行
   */
  async resolveConflict(analysis: ConflictAnalysis): Promise<ResolutionResult> {
    console.log(`⚔️ Resolving conflict for ${analysis.collection}/${analysis.id}`);

    try {
      // 適用可能ルールを取得
      const applicableRules = this.getApplicableRules(analysis);
      
      if (applicableRules.length === 0) {
        throw new Error('No applicable resolution rules found');
      }

      // 最高優先度のルールを選択
      const selectedRule = applicableRules[0];
      console.log(`📋 Selected rule: ${selectedRule.id} (${selectedRule.strategy})`);

      // 戦略に基づいて解決実行
      const result = await this.executeResolutionStrategy(
        selectedRule.strategy,
        analysis,
        selectedRule
      );

      // 結果をキャッシュ
      if (result.success) {
        await this.cacheResolution(analysis.id, result);
      }

      // 統計更新
      this.updateResolutionStats(result);

      return result;

    } catch (error) {
      console.error(`❌ Conflict resolution failed: ${error}`);
      return {
        success: false,
        resolvedData: analysis.localData,
        strategy: 'manual',
        appliedRules: [],
        warnings: [`Resolution failed: ${error}`],
        requiresUserAction: true,
        confidence: 0,
      };
    }
  }

  /**
   * 競合フィールド特定
   */
  private identifyConflictedFields(localData: any, remoteData: any): string[] {
    const conflictedFields: string[] = [];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);

    for (const key of allKeys) {
      if (localData[key] !== remoteData[key]) {
        // ディープコンペア対応
        if (typeof localData[key] === 'object' && typeof remoteData[key] === 'object') {
          if (JSON.stringify(localData[key]) !== JSON.stringify(remoteData[key])) {
            conflictedFields.push(key);
          }
        } else {
          conflictedFields.push(key);
        }
      }
    }

    return conflictedFields;
  }

  /**
   * コンフリクトタイプ決定
   */
  private determineConflictType(localData: any, remoteData: any): ConflictAnalysis['conflictType'] {
    // 削除競合
    if (localData._deleted !== remoteData._deleted) {
      return 'deletion';
    }

    // バージョン競合
    if (localData.version && remoteData.version && localData.version !== remoteData.version) {
      return 'version';
    }

    // スキーマ競合
    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    const keyDiff = localKeys.length !== remoteKeys.length ||
                   !localKeys.every(key => remoteKeys.includes(key));
    
    if (keyDiff) {
      return 'schema';
    }

    return 'data';
  }

  /**
   * 深刻度評価
   */
  private assessConflictSeverity(
    conflictedFields: string[],
    localData: any,
    remoteData: any
  ): ConflictAnalysis['severity'] {
    // クリティカルフィールドの競合
    const criticalFields = ['id', 'userId', 'critical', '_deleted'];
    const hasCriticalConflict = conflictedFields.some(field => criticalFields.includes(field));
    
    if (hasCriticalConflict) {
      return 'critical';
    }

    // 多数のフィールド競合
    if (conflictedFields.length > 5) {
      return 'high';
    }

    // 重要フィールドの競合
    const importantFields = ['name', 'quantity', 'price', 'status'];
    const hasImportantConflict = conflictedFields.some(field => importantFields.includes(field));
    
    if (hasImportantConflict) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * ユーザー影響度評価
   */
  private assessUserImpact(
    collection: string,
    conflictedFields: string[]
  ): ConflictAnalysis['userImpact'] {
    // コレクション別影響度
    const highImpactCollections = ['products', 'inventory', 'shopping_lists'];
    const criticalFields = ['name', 'quantity', 'price', 'expiryDate'];

    if (highImpactCollections.includes(collection)) {
      const hasCriticalFieldConflict = conflictedFields.some(field => 
        criticalFields.includes(field)
      );
      
      if (hasCriticalFieldConflict) {
        return 'major';
      }
      return 'minor';
    }

    if (conflictedFields.length > 3) {
      return 'minor';
    }

    return 'none';
  }

  /**
   * 自動解決可能性評価
   */
  private evaluateAutoResolvability(
    collection: string,
    conflictType: ConflictAnalysis['conflictType'],
    severity: ConflictAnalysis['severity'],
    conflictedFields: string[]
  ): boolean {
    // クリティカル競合は手動解決
    if (severity === 'critical') {
      return false;
    }

    // 削除競合は手動解決
    if (conflictType === 'deletion') {
      return false;
    }

    // 大量フィールド競合は手動解決
    if (conflictedFields.length > 10) {
      return false;
    }

    // その他は自動解決可能
    return true;
  }

  /**
   * 推奨戦略決定
   */
  private async determineRecommendedStrategy(
    collection: string,
    conflictedFields: string[],
    localData: any,
    remoteData: any,
    severity: ConflictAnalysis['severity']
  ): Promise<ConflictResolutionStrategy> {
    // ユーザー設定優先
    if (this.config.enableUserPreferences) {
      const userPref = this.userPreferences.get(collection);
      if (userPref) {
        return userPref;
      }
    }

    // AI支援判定
    if (this.config.enableAIAssisted && severity !== 'critical') {
      const aiRecommendation = await this.getAIRecommendation(
        collection,
        conflictedFields,
        localData,
        remoteData
      );
      if (aiRecommendation) {
        return aiRecommendation;
      }
    }

    // ルールベース判定
    const applicableRules = this.resolutionRules
      .filter(rule => this.isRuleApplicable(rule, collection, localData, remoteData))
      .sort((a, b) => b.priority - a.priority);

    if (applicableRules.length > 0) {
      return applicableRules[0].strategy;
    }

    // デフォルト戦略
    return 'timestamp-wins';
  }

  /**
   * AI推奨戦略取得
   */
  private async getAIRecommendation(
    collection: string,
    conflictedFields: string[],
    localData: any,
    remoteData: any
  ): Promise<ConflictResolutionStrategy | null> {
    try {
      // AI分析ロジック（簡略版）
      const analysisData = {
        collection,
        conflictedFields,
        localTimestamp: localData.timestamp,
        remoteTimestamp: remoteData.timestamp,
        fieldTypes: conflictedFields.map(field => typeof localData[field]),
      };

      // パターン認識
      if (collection === 'user_preferences' && conflictedFields.every(f => typeof localData[f] === 'object')) {
        return 'merge-deep';
      }

      if (collection === 'inventory' && conflictedFields.includes('quantity')) {
        return 'server-wins';
      }

      if (localData.timestamp > remoteData.timestamp + 60000) { // 1分以上新しい
        return 'timestamp-wins';
      }

      return 'merge-shallow';

    } catch (error) {
      console.error('AI recommendation failed:', error);
      return null;
    }
  }

  /**
   * 推論理由生成
   */
  private generateReasoning(
    conflictType: ConflictAnalysis['conflictType'],
    severity: ConflictAnalysis['severity'],
    conflictedFields: string[],
    strategy: ConflictResolutionStrategy
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`競合タイプ: ${conflictType}`);
    reasoning.push(`深刻度: ${severity}`);
    reasoning.push(`競合フィールド数: ${conflictedFields.length}`);
    reasoning.push(`推奨戦略: ${strategy}`);

    // 戦略選択理由
    switch (strategy) {
      case 'timestamp-wins':
        reasoning.push('タイムスタンプに基づく解決が最も適切');
        break;
      case 'server-wins':
        reasoning.push('一貫性保持のためサーバーデータを優先');
        break;
      case 'client-wins':
        reasoning.push('ローカル変更を優先して保持');
        break;
      case 'merge-deep':
        reasoning.push('複雑なオブジェクトの深いマージが適切');
        break;
      case 'manual':
        reasoning.push('手動解決が必要な重要な競合');
        break;
    }

    return reasoning;
  }

  /**
   * 適用可能ルール取得
   */
  private getApplicableRules(analysis: ConflictAnalysis): ConflictResolutionRule[] {
    return this.resolutionRules
      .filter(rule => this.isRuleApplicable(rule, analysis.collection, analysis.localData, analysis.remoteData))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * ルール適用可能性チェック
   */
  private isRuleApplicable(
    rule: ConflictResolutionRule,
    collection: string,
    localData: any,
    remoteData: any
  ): boolean {
    if (!rule.enabled) {
      return false;
    }

    // コレクション適用性
    if (rule.collection !== '*' && rule.collection !== collection) {
      return false;
    }

    // 条件チェック
    if (rule.condition && !rule.condition(localData, remoteData)) {
      return false;
    }

    return true;
  }

  /**
   * 解決戦略実行
   */
  private async executeResolutionStrategy(
    strategy: ConflictResolutionStrategy,
    analysis: ConflictAnalysis,
    rule?: ConflictResolutionRule
  ): Promise<ResolutionResult> {
    const { localData, remoteData } = analysis;
    let resolvedData: any;
    let confidence = 0.8;
    const warnings: string[] = [];
    let requiresUserAction = false;

    switch (strategy) {
      case 'timestamp-wins':
        resolvedData = analysis.localTimestamp > analysis.remoteTimestamp ? localData : remoteData;
        confidence = 0.9;
        break;

      case 'client-wins':
        resolvedData = localData;
        confidence = 0.85;
        break;

      case 'server-wins':
        resolvedData = remoteData;
        confidence = 0.85;
        break;

      case 'merge-deep':
        resolvedData = this.deepMerge(localData, remoteData);
        confidence = 0.75;
        break;

      case 'merge-shallow':
        resolvedData = { ...remoteData, ...localData };
        confidence = 0.7;
        break;

      case 'field-priority':
        resolvedData = this.mergeByFieldPriority(localData, remoteData, analysis.collection);
        confidence = 0.8;
        break;

      case 'ai-assisted':
        const aiResult = await this.performAIAssistedResolution(analysis);
        resolvedData = aiResult.data;
        confidence = aiResult.confidence;
        warnings.push(...aiResult.warnings);
        break;

      case 'custom':
        if (rule?.resolver) {
          resolvedData = rule.resolver(localData, remoteData);
          confidence = 0.9;
        } else {
          throw new Error('Custom resolver not defined');
        }
        break;

      case 'manual':
        // マニュアル解決待ちキューに追加
        this.pendingManualResolutions.set(analysis.id, analysis);
        requiresUserAction = true;
        resolvedData = localData; // 仮の値
        confidence = 0;
        warnings.push('Manual resolution required');
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    return {
      success: true,
      resolvedData,
      strategy,
      appliedRules: rule ? [rule.id] : [],
      warnings,
      requiresUserAction,
      confidence,
    };
  }

  /**
   * 深いマージ
   */
  private deepMerge(local: any, remote: any): any {
    const result = { ...remote };

    for (const [key, localValue] of Object.entries(local)) {
      if (remote.hasOwnProperty(key)) {
        const remoteValue = remote[key];
        
        if (typeof localValue === 'object' && typeof remoteValue === 'object' &&
            !Array.isArray(localValue) && !Array.isArray(remoteValue)) {
          result[key] = this.deepMerge(localValue, remoteValue);
        } else {
          // タイムスタンプで判定
          if (local.timestamp > remote.timestamp) {
            result[key] = localValue;
          }
        }
      } else {
        result[key] = localValue;
      }
    }

    return result;
  }

  /**
   * フィールド優先度によるマージ
   */
  private mergeByFieldPriority(local: any, remote: any, collection: string): any {
    const fieldPriorities: Record<string, Record<string, 'local' | 'remote'>> = {
      products: {
        name: 'local',
        quantity: 'remote',
        price: 'remote',
        category: 'local',
        description: 'local',
      },
      inventory: {
        quantity: 'remote',
        location: 'local',
        expiryDate: 'remote',
      },
      user_preferences: {
        theme: 'local',
        language: 'local',
        notifications: 'local',
      },
    };

    const priorities = fieldPriorities[collection] || {};
    const result = { ...remote };

    for (const [key, localValue] of Object.entries(local)) {
      const priority = priorities[key];
      
      if (priority === 'local') {
        result[key] = localValue;
      } else if (priority === 'remote') {
        result[key] = remote[key];
      } else {
        // デフォルト: タイムスタンプ判定
        if (local.timestamp > remote.timestamp) {
          result[key] = localValue;
        }
      }
    }

    return result;
  }

  /**
   * AI支援解決
   */
  private async performAIAssistedResolution(analysis: ConflictAnalysis): Promise<{
    data: any;
    confidence: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let confidence = 0.6;

    try {
      // 簡易AI判定ロジック
      const { localData, remoteData, conflictedFields, collection } = analysis;
      
      // パターンマッチング
      if (collection === 'user_preferences') {
        const merged = this.deepMerge(localData, remoteData);
        confidence = 0.8;
        return { data: merged, confidence, warnings };
      }

      if (collection === 'inventory' && conflictedFields.includes('quantity')) {
        // 在庫数は通常サーバーを信頼
        confidence = 0.85;
        return { data: remoteData, confidence, warnings };
      }

      // タイムスタンプベース判定
      const timestampDiff = Math.abs(localData.timestamp - remoteData.timestamp);
      if (timestampDiff > 300000) { // 5分以上の差
        const newerData = localData.timestamp > remoteData.timestamp ? localData : remoteData;
        confidence = 0.9;
        return { data: newerData, confidence, warnings };
      }

      // デフォルト: 浅いマージ
      const merged = { ...remoteData, ...localData };
      warnings.push('AI confidence low, using shallow merge');
      return { data: merged, confidence: 0.6, warnings };

    } catch (error) {
      console.error('AI assisted resolution failed:', error);
      warnings.push(`AI resolution failed: ${error}`);
      return { data: analysis.localData, confidence: 0.3, warnings };
    }
  }

  /**
   * 解決結果キャッシュ
   */
  private async cacheResolution(conflictId: string, result: ResolutionResult): Promise<void> {
    const cacheEntry = {
      id: conflictId,
      timestamp: Date.now(),
      resolution: result,
    };

    this.conflictHistory.push(cacheEntry);

    // 履歴サイズ制限
    if (this.conflictHistory.length > this.config.maxConflictHistory) {
      this.conflictHistory.shift();
    }

    // 永続化
    await AsyncStorage.setItem('ordo_conflict_history', JSON.stringify(this.conflictHistory));
  }

  /**
   * 統計更新
   */
  private updateResolutionStats(result: ResolutionResult): void {
    // 統計データ更新（実装は省略）
    console.log(`📊 Resolution stats updated: ${result.strategy} (confidence: ${result.confidence})`);
  }

  // === 設定とデータ復元 ===

  /**
   * 設定復元
   */
  private async restoreConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('ordo_conflict_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      const savedRules = await AsyncStorage.getItem('ordo_conflict_rules');
      if (savedRules) {
        this.resolutionRules = JSON.parse(savedRules);
      }
    } catch (error) {
      console.error('Failed to restore conflict configuration:', error);
    }
  }

  /**
   * ユーザー設定復元
   */
  private async restoreUserPreferences(): Promise<void> {
    try {
      const savedPrefs = await AsyncStorage.getItem('ordo_conflict_user_prefs');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        this.userPreferences = new Map(Object.entries(prefs));
      }
    } catch (error) {
      console.error('Failed to restore user preferences:', error);
    }
  }

  /**
   * 競合履歴復元
   */
  private async restoreConflictHistory(): Promise<void> {
    try {
      const savedHistory = await AsyncStorage.getItem('ordo_conflict_history');
      if (savedHistory) {
        this.conflictHistory = JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error('Failed to restore conflict history:', error);
    }
  }

  /**
   * 期限切れマニュアル解決クリーンアップ
   */
  private async cleanupExpiredManualResolutions(): Promise<void> {
    const now = Date.now();
    const timeout = this.config.conflictTimeout * 60 * 1000;

    for (const [id, analysis] of this.pendingManualResolutions) {
      if (now - analysis.remoteTimestamp > timeout) {
        console.log(`🧹 Cleaning up expired manual resolution: ${id}`);
        this.pendingManualResolutions.delete(id);
      }
    }
  }

  // === 公開API ===

  /**
   * ユーザー設定更新
   */
  async setUserPreference(collection: string, strategy: ConflictResolutionStrategy): Promise<void> {
    this.userPreferences.set(collection, strategy);
    
    const prefs = Object.fromEntries(this.userPreferences);
    await AsyncStorage.setItem('ordo_conflict_user_prefs', JSON.stringify(prefs));
    
    console.log(`👤 User preference set: ${collection} -> ${strategy}`);
  }

  /**
   * カスタムルール追加
   */
  addCustomRule(rule: Omit<ConflictResolutionRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const fullRule: ConflictResolutionRule = { ...rule, id };
    
    this.resolutionRules.push(fullRule);
    this.resolutionRules.sort((a, b) => b.priority - a.priority);
    
    console.log(`➕ Custom rule added: ${id}`);
    return id;
  }

  /**
   * ルール削除
   */
  removeRule(ruleId: string): boolean {
    const index = this.resolutionRules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.resolutionRules.splice(index, 1);
      console.log(`➖ Rule removed: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * マニュアル解決実行
   */
  async resolveManually(conflictId: string, resolvedData: any): Promise<boolean> {
    const analysis = this.pendingManualResolutions.get(conflictId);
    if (!analysis) {
      return false;
    }

    try {
      // マニュアル解決結果を適用
      const result: ResolutionResult = {
        success: true,
        resolvedData,
        strategy: 'manual',
        appliedRules: ['manual-user-decision'],
        warnings: [],
        requiresUserAction: false,
        confidence: 1.0,
      };

      await this.cacheResolution(conflictId, result);
      this.pendingManualResolutions.delete(conflictId);
      
      console.log(`✅ Manual resolution completed: ${conflictId}`);
      return true;

    } catch (error) {
      console.error(`❌ Manual resolution failed: ${error}`);
      return false;
    }
  }

  /**
   * 待機中マニュアル解決取得
   */
  getPendingManualResolutions(): ConflictAnalysis[] {
    return Array.from(this.pendingManualResolutions.values());
  }

  /**
   * 統計取得
   */
  getConflictStats(): {
    totalResolutions: number;
    successfulResolutions: number;
    pendingManualResolutions: number;
    averageConfidence: number;
    strategyCounts: Record<ConflictResolutionStrategy, number>;
    recentConflicts: number;
  } {
    const totalResolutions = this.conflictHistory.length;
    const successfulResolutions = this.conflictHistory.filter(h => h.resolution.success).length;
    const pendingManual = this.pendingManualResolutions.size;
    
    const confidences = this.conflictHistory.map(h => h.resolution.confidence);
    const averageConfidence = confidences.length > 0 ? 
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

    const strategyCounts: Record<string, number> = {};
    this.conflictHistory.forEach(h => {
      const strategy = h.resolution.strategy;
      strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    });

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentConflicts = this.conflictHistory.filter(h => h.timestamp > oneDayAgo).length;

    return {
      totalResolutions,
      successfulResolutions,
      pendingManualResolutions: pendingManual,
      averageConfidence,
      strategyCounts: strategyCounts as Record<ConflictResolutionStrategy, number>,
      recentConflicts,
    };
  }

  /**
   * 設定更新
   */
  async updateConfig(newConfig: Partial<ConflictResolutionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('ordo_conflict_config', JSON.stringify(this.config));
    console.log('⚔️ Conflict resolution config updated');
  }

  /**
   * サービス状態取得
   */
  getStatus(): {
    isInitialized: boolean;
    activeRules: number;
    pendingResolutions: number;
    config: ConflictResolutionConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      activeRules: this.resolutionRules.filter(r => r.enabled).length,
      pendingResolutions: this.pendingManualResolutions.size,
      config: { ...this.config },
    };
  }
}

export const conflictResolutionService = new ConflictResolutionService();
