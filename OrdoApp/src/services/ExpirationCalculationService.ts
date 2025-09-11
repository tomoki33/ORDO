/**
 * 期限計算・管理ロジック (4時間実装)
 * Expiration Calculation and Management Logic
 * 
 * 商品の期限切れ計算、アラート管理、消費予測のロジックを実装
 * - 期限切れ判定アルゴリズム
 * - 消費パターン分析
 * - アラート優先度計算
 * - 期限延長ロジック
 * - 統計分析機能
 */

import { Product, ProductCategory, ProductLocation } from '../types';
import { productRepository } from '../database';

// =============================================================================
// EXPIRATION TYPES AND INTERFACES
// =============================================================================

export interface ExpirationAlert {
  id: string;
  productId: string;
  product: Product;
  alertType: ExpirationAlertType;
  severity: AlertSeverity;
  daysUntilExpiration: number;
  calculatedDate: Date;
  suggestedActions: SuggestedAction[];
  priority: number;
  isAcknowledged: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export enum ExpirationAlertType {
  EXPIRING_SOON = 'expiring_soon',        // 期限が近い
  EXPIRED = 'expired',                    // 期限切れ
  CRITICAL_EXPIRING = 'critical_expiring', // 緊急期限切れ
  CONSUME_PRIORITY = 'consume_priority',   // 消費優先
  WASTE_WARNING = 'waste_warning',         // 廃棄警告
  BATCH_EXPIRING = 'batch_expiring',      // 同種商品まとめて期限切れ
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SuggestedAction {
  type: ActionType;
  title: string;
  description: string;
  priority: number;
  icon?: string;
}

export enum ActionType {
  CONSUME_NOW = 'consume_now',
  COOK_TODAY = 'cook_today',
  FREEZE = 'freeze',
  SHARE = 'share',
  MOVE_LOCATION = 'move_location',
  UPDATE_QUANTITY = 'update_quantity',
  MARK_USED = 'mark_used',
  DISPOSE = 'dispose',
}

export interface ConsumptionPattern {
  productId: string;
  averageConsumptionDays: number;
  consumptionFrequency: number; // times per month
  lastConsumedDate?: Date;
  seasonalTrend?: SeasonalTrend;
  preferredQuantity: number;
  wasteRate: number; // percentage
}

export interface SeasonalTrend {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

export interface ExpirationSettings {
  defaultWarningDays: Record<ProductCategory, number>;
  criticalWarningDays: Record<ProductCategory, number>;
  enableSmartPrediction: boolean;
  considerConsumptionPattern: boolean;
  batchAlertThreshold: number;
  wastePrevention: boolean;
  customRules: ExpirationRule[];
}

export interface ExpirationRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  isActive: boolean;
  priority: number;
}

export interface RuleCondition {
  categories?: ProductCategory[];
  locations?: ProductLocation[];
  brands?: string[];
  daysBeforeExpiration?: number;
  quantity?: { min?: number; max?: number };
  customCondition?: string;
}

export interface RuleAction {
  alertType: ExpirationAlertType;
  severity: AlertSeverity;
  message?: string;
  suggestedActions: ActionType[];
  notificationEnabled: boolean;
}

// =============================================================================
// EXPIRATION CALCULATION SERVICE
// =============================================================================

export class ExpirationCalculationService {
  private settings: ExpirationSettings;
  private consumptionPatterns: Map<string, ConsumptionPattern> = new Map();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadConsumptionPatterns();
  }

  // ---------------------------------------------------------------------------
  // MAIN CALCULATION METHODS
  // ---------------------------------------------------------------------------

  async calculateExpirationAlerts(): Promise<ExpirationAlert[]> {
    try {
      console.log('🔍 Calculating expiration alerts...');
      
      const allProducts = await productRepository.findAll();
      const alerts: ExpirationAlert[] = [];
      
      for (const product of allProducts) {
        const productAlerts = await this.calculateProductAlerts(product);
        alerts.push(...productAlerts);
      }

      // Sort by priority and date
      alerts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.daysUntilExpiration - b.daysUntilExpiration;
      });

      console.log(`✅ Generated ${alerts.length} expiration alerts`);
      return alerts;
    } catch (error) {
      console.error('❌ Failed to calculate expiration alerts:', error);
      return [];
    }
  }

  private async calculateProductAlerts(product: Product): Promise<ExpirationAlert[]> {
    const alerts: ExpirationAlert[] = [];
    const now = new Date();
    const expirationDate = new Date(product.expirationDate);
    const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate, now);

    // Get consumption pattern for better predictions
    const pattern = this.consumptionPatterns.get(product.id);
    const adjustedDays = this.adjustForConsumptionPattern(daysUntilExpiration, pattern);

    // Apply expiration rules
    const applicableRules = this.getApplicableRules(product);
    
    for (const rule of applicableRules) {
      if (this.evaluateRuleCondition(rule.condition, product, adjustedDays)) {
        const alert = this.createAlertFromRule(product, rule, adjustedDays);
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    // Default alerts if no rules apply
    if (alerts.length === 0) {
      const defaultAlert = this.createDefaultAlert(product, adjustedDays);
      if (defaultAlert) {
        alerts.push(defaultAlert);
      }
    }

    return alerts;
  }

  private calculateDaysUntilExpiration(expirationDate: Date, currentDate: Date): number {
    const timeDiff = expirationDate.getTime() - currentDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private adjustForConsumptionPattern(baseDays: number, pattern?: ConsumptionPattern): number {
    if (!this.settings.considerConsumptionPattern || !pattern) {
      return baseDays;
    }

    // Adjust based on consumption frequency
    const consumptionRate = pattern.consumptionFrequency / 30; // per day
    const expectedConsumptionDays = 1 / consumptionRate;

    // If consumption is slower than expiration, increase urgency
    if (expectedConsumptionDays > baseDays) {
      return Math.max(0, baseDays - 1);
    }

    return baseDays;
  }

  // ---------------------------------------------------------------------------
  // RULE EVALUATION
  // ---------------------------------------------------------------------------

  private getApplicableRules(product: Product): ExpirationRule[] {
    return this.settings.customRules.filter(rule => 
      rule.isActive && this.isRuleApplicable(rule, product)
    ).sort((a, b) => b.priority - a.priority);
  }

  private isRuleApplicable(rule: ExpirationRule, product: Product): boolean {
    const condition = rule.condition;

    if (condition.categories && !condition.categories.includes(product.category)) {
      return false;
    }

    if (condition.locations && !condition.locations.includes(product.location)) {
      return false;
    }

    if (condition.brands && product.brand && !condition.brands.includes(product.brand)) {
      return false;
    }

    if (condition.quantity) {
      const productQuantity = product.quantity || 0;
      if (condition.quantity.min && productQuantity < condition.quantity.min) {
        return false;
      }
      if (condition.quantity.max && productQuantity > condition.quantity.max) {
        return false;
      }
    }

    return true;
  }

  private evaluateRuleCondition(
    condition: RuleCondition,
    product: Product,
    daysUntilExpiration: number
  ): boolean {
    if (condition.daysBeforeExpiration !== undefined) {
      return daysUntilExpiration <= condition.daysBeforeExpiration;
    }

    // Add more complex condition evaluation here
    return true;
  }

  // ---------------------------------------------------------------------------
  // ALERT CREATION
  // ---------------------------------------------------------------------------

  private createAlertFromRule(
    product: Product,
    rule: ExpirationRule,
    daysUntilExpiration: number
  ): ExpirationAlert | null {
    const alertId = `${product.id}_${rule.id}_${Date.now()}`;
    
    const suggestedActions = this.generateSuggestedActions(
      product,
      rule.action.suggestedActions,
      daysUntilExpiration
    );

    const priority = this.calculateAlertPriority(
      rule.action.severity,
      daysUntilExpiration,
      product
    );

    return {
      id: alertId,
      productId: product.id,
      product,
      alertType: rule.action.alertType,
      severity: rule.action.severity,
      daysUntilExpiration,
      calculatedDate: new Date(),
      suggestedActions,
      priority,
      isAcknowledged: false,
      createdAt: new Date(),
    };
  }

  private createDefaultAlert(
    product: Product,
    daysUntilExpiration: number
  ): ExpirationAlert | null {
    let alertType: ExpirationAlertType;
    let severity: AlertSeverity;

    const warningDays = this.settings.defaultWarningDays[product.category] || 3;
    const criticalDays = this.settings.criticalWarningDays[product.category] || 1;

    if (daysUntilExpiration < 0) {
      alertType = ExpirationAlertType.EXPIRED;
      severity = AlertSeverity.CRITICAL;
    } else if (daysUntilExpiration <= criticalDays) {
      alertType = ExpirationAlertType.CRITICAL_EXPIRING;
      severity = AlertSeverity.HIGH;
    } else if (daysUntilExpiration <= warningDays) {
      alertType = ExpirationAlertType.EXPIRING_SOON;
      severity = AlertSeverity.MEDIUM;
    } else {
      return null; // No alert needed
    }

    const alertId = `${product.id}_default_${Date.now()}`;
    const suggestedActions = this.generateDefaultSuggestedActions(product, daysUntilExpiration);
    const priority = this.calculateAlertPriority(severity, daysUntilExpiration, product);

    return {
      id: alertId,
      productId: product.id,
      product,
      alertType,
      severity,
      daysUntilExpiration,
      calculatedDate: new Date(),
      suggestedActions,
      priority,
      isAcknowledged: false,
      createdAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // SUGGESTED ACTIONS
  // ---------------------------------------------------------------------------

  private generateSuggestedActions(
    product: Product,
    actionTypes: ActionType[],
    daysUntilExpiration: number
  ): SuggestedAction[] {
    return actionTypes.map(type => this.createSuggestedAction(type, product, daysUntilExpiration));
  }

  private generateDefaultSuggestedActions(
    product: Product,
    daysUntilExpiration: number
  ): SuggestedAction[] {
    const actions: ActionType[] = [];

    if (daysUntilExpiration < 0) {
      actions.push(ActionType.DISPOSE, ActionType.MARK_USED);
    } else if (daysUntilExpiration <= 1) {
      actions.push(ActionType.CONSUME_NOW, ActionType.COOK_TODAY, ActionType.FREEZE);
    } else if (daysUntilExpiration <= 3) {
      actions.push(ActionType.CONSUME_NOW, ActionType.SHARE, ActionType.MOVE_LOCATION);
    } else {
      actions.push(ActionType.UPDATE_QUANTITY);
    }

    return this.generateSuggestedActions(product, actions, daysUntilExpiration);
  }

  private createSuggestedAction(
    type: ActionType,
    product: Product,
    daysUntilExpiration: number
  ): SuggestedAction {
    const actionConfig = this.getActionConfig(type, product, daysUntilExpiration);
    
    return {
      type,
      title: actionConfig.title,
      description: actionConfig.description,
      priority: actionConfig.priority,
      icon: actionConfig.icon,
    };
  }

  private getActionConfig(
    type: ActionType,
    product: Product,
    daysUntilExpiration: number
  ): { title: string; description: string; priority: number; icon?: string } {
    const productName = product.name;
    
    switch (type) {
      case ActionType.CONSUME_NOW:
        return {
          title: '今すぐ消費',
          description: `${productName}を今日中に消費しましょう`,
          priority: 9,
          icon: '🍽️',
        };
      
      case ActionType.COOK_TODAY:
        return {
          title: '今日調理',
          description: `${productName}を使った料理を作りましょう`,
          priority: 8,
          icon: '👨‍🍳',
        };
      
      case ActionType.FREEZE:
        return {
          title: '冷凍保存',
          description: `${productName}を冷凍して保存期間を延ばしましょう`,
          priority: 7,
          icon: '🧊',
        };
      
      case ActionType.SHARE:
        return {
          title: '家族と共有',
          description: `${productName}を家族や友人と分けましょう`,
          priority: 6,
          icon: '🤝',
        };
      
      case ActionType.MOVE_LOCATION:
        return {
          title: '保存場所変更',
          description: `${productName}をより適切な場所に移動しましょう`,
          priority: 5,
          icon: '📦',
        };
      
      case ActionType.UPDATE_QUANTITY:
        return {
          title: '数量更新',
          description: `${productName}の現在の数量を確認・更新しましょう`,
          priority: 4,
          icon: '🔢',
        };
      
      case ActionType.MARK_USED:
        return {
          title: '使用済みマーク',
          description: `${productName}を使用済みとしてマークしましょう`,
          priority: 3,
          icon: '✅',
        };
      
      case ActionType.DISPOSE:
        return {
          title: '適切に廃棄',
          description: `${productName}を適切に廃棄しましょう`,
          priority: 2,
          icon: '🗑️',
        };
      
      default:
        return {
          title: 'アクション',
          description: `${productName}に対してアクションを実行`,
          priority: 1,
        };
    }
  }

  // ---------------------------------------------------------------------------
  // PRIORITY CALCULATION
  // ---------------------------------------------------------------------------

  private calculateAlertPriority(
    severity: AlertSeverity,
    daysUntilExpiration: number,
    product: Product
  ): number {
    let basePriority = 0;

    // Base priority from severity
    switch (severity) {
      case AlertSeverity.CRITICAL:
        basePriority = 100;
        break;
      case AlertSeverity.HIGH:
        basePriority = 75;
        break;
      case AlertSeverity.MEDIUM:
        basePriority = 50;
        break;
      case AlertSeverity.LOW:
        basePriority = 25;
        break;
    }

    // Adjust by days until expiration
    const daysPenalty = Math.max(0, daysUntilExpiration) * 2;
    basePriority = Math.max(0, basePriority - daysPenalty);

    // Adjust by product characteristics
    const categoryMultiplier = this.getCategoryPriorityMultiplier(product.category);
    basePriority *= categoryMultiplier;

    // Adjust by quantity (more quantity = higher priority)
    const quantityBonus = Math.min(10, (product.quantity || 0) * 2);
    basePriority += quantityBonus;

    return Math.round(basePriority);
  }

  private getCategoryPriorityMultiplier(category: ProductCategory): number {
    const multipliers: Record<ProductCategory, number> = {
      dairy: 1.2,
      meat: 1.3,
      vegetables: 1.1,
      fruits: 1.1,
      beverages: 0.9,
      packaged: 0.7,
      other: 1.0,
    };

    return multipliers[category] || 1.0;
  }

  // ---------------------------------------------------------------------------
  // CONSUMPTION PATTERN ANALYSIS
  // ---------------------------------------------------------------------------

  async analyzeConsumptionPatterns(): Promise<void> {
    try {
      console.log('📊 Analyzing consumption patterns...');
      
      const products = await productRepository.findAll();
      
      for (const product of products) {
        const pattern = await this.calculateConsumptionPattern(product);
        if (pattern) {
          this.consumptionPatterns.set(product.id, pattern);
        }
      }

      console.log(`✅ Analyzed patterns for ${this.consumptionPatterns.size} products`);
    } catch (error) {
      console.error('❌ Failed to analyze consumption patterns:', error);
    }
  }

  private async calculateConsumptionPattern(product: Product): Promise<ConsumptionPattern | null> {
    try {
      // This would typically query consumption history from database
      // For now, we'll create a basic pattern based on product characteristics
      
      const baseConsumption = this.getBaseCategoryConsumption(product.category);
      const locationAdjustment = this.getLocationConsumptionAdjustment(product.location);
      
      const averageConsumptionDays = baseConsumption * locationAdjustment;
      const consumptionFrequency = 30 / averageConsumptionDays; // times per month
      
      return {
        productId: product.id,
        averageConsumptionDays,
        consumptionFrequency,
        lastConsumedDate: product.addedDate, // Placeholder
        preferredQuantity: product.quantity || 0,
        wasteRate: 0.1, // 10% default waste rate
      };
    } catch (error) {
      console.error(`Failed to calculate pattern for product ${product.id}:`, error);
      return null;
    }
  }

  private getBaseCategoryConsumption(category: ProductCategory): number {
    const baseDays: Record<ProductCategory, number> = {
      dairy: 5,
      meat: 3,
      vegetables: 7,
      fruits: 5,
      beverages: 10,
      packaged: 30,
      other: 14,
    };

    return baseDays[category] || 14;
  }

  private getLocationConsumptionAdjustment(location: ProductLocation): number {
    const adjustments: Record<ProductLocation, number> = {
      fridge: 1.0,
      freezer: 0.3,  // Frozen items last longer
      pantry: 1.2,
      counter: 1.8,  // Counter items consumed faster
      other: 1.0,
    };

    return adjustments[location] || 1.0;
  }

  // ---------------------------------------------------------------------------
  // BATCH PROCESSING
  // ---------------------------------------------------------------------------

  async findBatchExpiringProducts(): Promise<ExpirationAlert[]> {
    try {
      const alerts = await this.calculateExpirationAlerts();
      const batches = this.groupAlertsByBatch(alerts);
      
      return batches
        .filter(batch => batch.length >= this.settings.batchAlertThreshold)
        .map(batch => this.createBatchAlert(batch))
        .filter(alert => alert !== null) as ExpirationAlert[];
    } catch (error) {
      console.error('Failed to find batch expiring products:', error);
      return [];
    }
  }

  private groupAlertsByBatch(alerts: ExpirationAlert[]): ExpirationAlert[][] {
    const batches: Map<string, ExpirationAlert[]> = new Map();
    
    for (const alert of alerts) {
      const key = this.getBatchKey(alert.product);
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(alert);
    }
    
    return Array.from(batches.values());
  }

  private getBatchKey(product: Product): string {
    return `${product.category}_${product.location}`;
  }

  private createBatchAlert(batch: ExpirationAlert[]): ExpirationAlert | null {
    if (batch.length === 0) return null;
    
    const firstAlert = batch[0];
    const totalProducts = batch.length;
    const avgDaysUntilExpiration = Math.round(
      batch.reduce((sum, alert) => sum + alert.daysUntilExpiration, 0) / totalProducts
    );
    
    return {
      id: `batch_${Date.now()}`,
      productId: 'batch',
      product: firstAlert.product,
      alertType: ExpirationAlertType.BATCH_EXPIRING,
      severity: AlertSeverity.HIGH,
      daysUntilExpiration: avgDaysUntilExpiration,
      calculatedDate: new Date(),
      suggestedActions: [
        {
          type: ActionType.CONSUME_NOW,
          title: `${totalProducts}個の商品を優先消費`,
          description: `${firstAlert.product.category}の商品を計画的に消費しましょう`,
          priority: 9,
          icon: '📦',
        },
      ],
      priority: 90,
      isAcknowledged: false,
      createdAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // SETTINGS AND CONFIGURATION
  // ---------------------------------------------------------------------------

  private getDefaultSettings(): ExpirationSettings {
    return {
      defaultWarningDays: {
        dairy: 2,
        meat: 1,
        vegetables: 3,
        fruits: 2,
        beverages: 7,
        packaged: 14,
        other: 3,
      },
      criticalWarningDays: {
        dairy: 1,
        meat: 0,
        vegetables: 1,
        fruits: 1,
        beverages: 3,
        packaged: 7,
        other: 1,
      },
      enableSmartPrediction: true,
      considerConsumptionPattern: true,
      batchAlertThreshold: 3,
      wastePrevention: true,
      customRules: [],
    };
  }

  private async loadConsumptionPatterns(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, we'll analyze patterns on demand
    await this.analyzeConsumptionPatterns();
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async getActiveAlerts(): Promise<ExpirationAlert[]> {
    const alerts = await this.calculateExpirationAlerts();
    return alerts.filter(alert => !alert.isAcknowledged);
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    // In a real implementation, this would update the database
    console.log(`Alert ${alertId} acknowledged`);
    return true;
  }

  async updateSettings(newSettings: Partial<ExpirationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    console.log('Expiration settings updated');
  }

  getSettings(): ExpirationSettings {
    return { ...this.settings };
  }

  async getConsumptionPattern(productId: string): Promise<ConsumptionPattern | null> {
    return this.consumptionPatterns.get(productId) || null;
  }

  async updateConsumptionPattern(pattern: ConsumptionPattern): Promise<void> {
    this.consumptionPatterns.set(pattern.productId, pattern);
    console.log(`Consumption pattern updated for product ${pattern.productId}`);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const expirationCalculationService = new ExpirationCalculationService();
