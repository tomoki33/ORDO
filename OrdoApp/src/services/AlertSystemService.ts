/**
 * 警告システム連携サービス (4時間実装)
 * 
 * 食品状態に基づく警告・通知システム
 * - リアルタイム警告生成
 * - 段階的警告レベル管理
 * - プッシュ通知連携
 * - 警告履歴管理
 */

import { Alert } from 'react-native';
import { FreshnessScore, FreshnessLevel } from '../services/FreshnessDetectionService';
import { 
  StateClassificationResult, 
  FoodState, 
  ConsumptionRecommendation,
  RiskFactor 
} from '../services/StateClassificationService';

export enum AlertLevel {
  INFO = 'info',           // 情報 (青)
  SUCCESS = 'success',     // 成功 (緑)
  WARNING = 'warning',     // 警告 (黄)
  DANGER = 'danger',       // 危険 (赤)
  CRITICAL = 'critical'    // 緊急 (深紅)
}

export enum AlertType {
  FRESHNESS_ALERT = 'freshness_alert',
  STATE_ALERT = 'state_alert',
  SAFETY_ALERT = 'safety_alert',
  QUALITY_ALERT = 'quality_alert',
  EXPIRY_ALERT = 'expiry_alert',
  RISK_ALERT = 'risk_alert',
  ACTION_ALERT = 'action_alert'
}

export interface FoodAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  details: string;
  timestamp: number;
  isRead: boolean;
  isActive: boolean;
  expiresAt?: number;
  actions: AlertAction[];
  metadata: {
    foodCategory: string;
    imageUri?: string;
    freshnessScore?: number;
    stateScore?: number;
    riskFactors?: string[];
  };
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  action: string;
  parameters?: Record<string, any>;
}

export interface AlertSettings {
  enablePushNotifications: boolean;
  enableSoundAlerts: boolean;
  alertLevels: {
    [AlertLevel.INFO]: boolean;
    [AlertLevel.SUCCESS]: boolean;
    [AlertLevel.WARNING]: boolean;
    [AlertLevel.DANGER]: boolean;
    [AlertLevel.CRITICAL]: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
  };
  autoMarkReadAfter: number; // 秒
}

export interface AlertSubscriber {
  onAlert: (alert: FoodAlert) => void;
  onAlertDismissed: (alertId: string) => void;
  onAlertExpired: (alertId: string) => void;
}

export class AlertSystemService {
  private static instance: AlertSystemService;
  private alerts: Map<string, FoodAlert> = new Map();
  private subscribers: Set<AlertSubscriber> = new Set();
  private settings: AlertSettings;
  private alertQueue: FoodAlert[] = [];
  private isProcessingQueue = false;

  // 警告レベル閾値
  private readonly ALERT_THRESHOLDS = {
    freshness: {
      critical: 20,
      danger: 40,
      warning: 60,
      success: 80
    },
    state: {
      critical: 25,
      danger: 45,
      warning: 65,
      success: 80
    },
    safety: {
      critical: 30,
      danger: 50,
      warning: 70,
      success: 85
    }
  };

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeAlertSystem();
  }

  public static getInstance(): AlertSystemService {
    if (!AlertSystemService.instance) {
      AlertSystemService.instance = new AlertSystemService();
    }
    return AlertSystemService.instance;
  }

  /**
   * 警告システム初期化
   */
  private async initializeAlertSystem(): Promise<void> {
    try {
      console.log('🚨 警告システムを初期化中...');

      // 設定読み込み
      await this.loadAlertSettings();
      
      // 期限切れ警告クリーンアップ
      this.startAlertCleanupTimer();
      
      // 警告キュー処理開始
      this.startQueueProcessor();

      console.log('✅ 警告システム初期化完了');

    } catch (error) {
      console.error('❌ 警告システム初期化失敗:', error);
    }
  }

  /**
   * デフォルト設定取得
   */
  private getDefaultSettings(): AlertSettings {
    return {
      enablePushNotifications: true,
      enableSoundAlerts: true,
      alertLevels: {
        [AlertLevel.INFO]: true,
        [AlertLevel.SUCCESS]: true,
        [AlertLevel.WARNING]: true,
        [AlertLevel.DANGER]: true,
        [AlertLevel.CRITICAL]: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00'
      },
      autoMarkReadAfter: 300 // 5分
    };
  }

  /**
   * 設定読み込み
   */
  private async loadAlertSettings(): Promise<void> {
    try {
      // 実装では AsyncStorage から読み込み
      console.log('📋 警告設定読み込み完了');
    } catch (error) {
      console.error('❌ 設定読み込み失敗:', error);
    }
  }

  /**
   * 購読者登録
   */
  public subscribe(subscriber: AlertSubscriber): () => void {
    this.subscribers.add(subscriber);
    
    // 購読解除関数を返す
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * 新鮮度ベース警告生成
   */
  public async generateFreshnessAlert(
    freshnessScore: FreshnessScore,
    foodCategory: string,
    imageUri?: string
  ): Promise<FoodAlert | null> {
    try {
      const alertLevel = this.determineFreshnessAlertLevel(freshnessScore.overall);
      
      if (alertLevel === AlertLevel.INFO) {
        return null; // 問題なしの場合は警告なし
      }

      const alert: FoodAlert = {
        id: this.generateAlertId(),
        type: AlertType.FRESHNESS_ALERT,
        level: alertLevel,
        title: this.getFreshnessAlertTitle(freshnessScore.prediction, alertLevel),
        message: this.getFreshnessAlertMessage(freshnessScore, foodCategory),
        details: this.getFreshnessAlertDetails(freshnessScore),
        timestamp: Date.now(),
        isRead: false,
        isActive: true,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24時間後
        actions: this.generateFreshnessActions(freshnessScore.prediction),
        metadata: {
          foodCategory,
          imageUri,
          freshnessScore: freshnessScore.overall
        }
      };

      await this.processAlert(alert);
      return alert;

    } catch (error) {
      console.error('❌ 新鮮度警告生成失敗:', error);
      return null;
    }
  }

  /**
   * 状態分類ベース警告生成
   */
  public async generateStateAlert(
    stateResult: StateClassificationResult,
    foodCategory: string,
    imageUri?: string
  ): Promise<FoodAlert | null> {
    try {
      const alertLevel = this.determineStateAlertLevel(stateResult.stateScore);
      
      if (alertLevel === AlertLevel.INFO && stateResult.riskFactors.length === 0) {
        return null;
      }

      const alert: FoodAlert = {
        id: this.generateAlertId(),
        type: AlertType.STATE_ALERT,
        level: alertLevel,
        title: this.getStateAlertTitle(stateResult.foodState, alertLevel),
        message: this.getStateAlertMessage(stateResult, foodCategory),
        details: this.getStateAlertDetails(stateResult),
        timestamp: Date.now(),
        isRead: false,
        isActive: true,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        actions: this.generateStateActions(stateResult.consumptionRecommendation),
        metadata: {
          foodCategory,
          imageUri,
          stateScore: stateResult.stateScore,
          riskFactors: stateResult.riskFactors.map(r => r.type)
        }
      };

      await this.processAlert(alert);
      return alert;

    } catch (error) {
      console.error('❌ 状態警告生成失敗:', error);
      return null;
    }
  }

  /**
   * 安全性警告生成
   */
  public async generateSafetyAlert(
    stateResult: StateClassificationResult,
    foodCategory: string
  ): Promise<FoodAlert | null> {
    try {
      const criticalRisks = stateResult.riskFactors.filter(
        r => r.severity === 'critical' || r.severity === 'high'
      );

      if (criticalRisks.length === 0) {
        return null;
      }

      const alert: FoodAlert = {
        id: this.generateAlertId(),
        type: AlertType.SAFETY_ALERT,
        level: AlertLevel.CRITICAL,
        title: '⚠️ 安全性警告',
        message: `${foodCategory}に安全上の重大な懸念があります`,
        details: this.getSafetyAlertDetails(criticalRisks),
        timestamp: Date.now(),
        isRead: false,
        isActive: true,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7日後
        actions: this.generateSafetyActions(criticalRisks),
        metadata: {
          foodCategory,
          riskFactors: criticalRisks.map(r => r.type)
        }
      };

      await this.processAlert(alert);
      return alert;

    } catch (error) {
      console.error('❌ 安全性警告生成失敗:', error);
      return null;
    }
  }

  /**
   * 賞味期限警告生成
   */
  public async generateExpiryAlert(
    estimatedDays: number,
    foodCategory: string
  ): Promise<FoodAlert | null> {
    try {
      let alertLevel: AlertLevel;
      let title: string;
      let message: string;

      if (estimatedDays <= 0) {
        alertLevel = AlertLevel.CRITICAL;
        title = '🚨 賞味期限切れ';
        message = `${foodCategory}の賞味期限が切れています`;
      } else if (estimatedDays <= 1) {
        alertLevel = AlertLevel.DANGER;
        title = '⚠️ 賞味期限間近';
        message = `${foodCategory}の賞味期限が1日以内です`;
      } else if (estimatedDays <= 3) {
        alertLevel = AlertLevel.WARNING;
        title = '⏰ 賞味期限注意';
        message = `${foodCategory}の賞味期限が${estimatedDays}日後です`;
      } else {
        return null; // 警告不要
      }

      const alert: FoodAlert = {
        id: this.generateAlertId(),
        type: AlertType.EXPIRY_ALERT,
        level: alertLevel,
        title,
        message,
        details: this.getExpiryAlertDetails(estimatedDays, foodCategory),
        timestamp: Date.now(),
        isRead: false,
        isActive: true,
        expiresAt: Date.now() + (estimatedDays * 24 * 60 * 60 * 1000),
        actions: this.generateExpiryActions(estimatedDays),
        metadata: {
          foodCategory,
          estimatedDays
        }
      };

      await this.processAlert(alert);
      return alert;

    } catch (error) {
      console.error('❌ 賞味期限警告生成失敗:', error);
      return null;
    }
  }

  /**
   * 複合警告生成（新鮮度 + 状態）
   */
  public async generateCompositeAlert(
    freshnessScore: FreshnessScore,
    stateResult: StateClassificationResult,
    foodCategory: string,
    imageUri?: string
  ): Promise<FoodAlert[]> {
    try {
      const alerts: FoodAlert[] = [];

      // 新鮮度警告
      const freshnessAlert = await this.generateFreshnessAlert(
        freshnessScore, 
        foodCategory, 
        imageUri
      );
      if (freshnessAlert) alerts.push(freshnessAlert);

      // 状態警告
      const stateAlert = await this.generateStateAlert(
        stateResult, 
        foodCategory, 
        imageUri
      );
      if (stateAlert) alerts.push(stateAlert);

      // 安全性警告
      const safetyAlert = await this.generateSafetyAlert(stateResult, foodCategory);
      if (safetyAlert) alerts.push(safetyAlert);

      // 賞味期限警告
      const expiryAlert = await this.generateExpiryAlert(
        freshnessScore.estimatedShelfLife, 
        foodCategory
      );
      if (expiryAlert) alerts.push(expiryAlert);

      return alerts;

    } catch (error) {
      console.error('❌ 複合警告生成失敗:', error);
      return [];
    }
  }

  /**
   * 警告処理
   */
  private async processAlert(alert: FoodAlert): Promise<void> {
    try {
      // 警告を保存
      this.alerts.set(alert.id, alert);

      // 設定チェック
      if (!this.settings.alertLevels[alert.level]) {
        return; // この警告レベルは無効
      }

      // クワイエットアワーチェック
      if (this.isQuietHour()) {
        this.alertQueue.push(alert);
        return;
      }

      // 即座に通知
      await this.notifyAlert(alert);

      // 自動既読タイマー設定
      this.setAutoReadTimer(alert);

    } catch (error) {
      console.error('❌ 警告処理失敗:', error);
    }
  }

  /**
   * 警告通知
   */
  private async notifyAlert(alert: FoodAlert): Promise<void> {
    try {
      // 購読者に通知
      this.subscribers.forEach(subscriber => {
        try {
          subscriber.onAlert(alert);
        } catch (error) {
          console.error('❌ 購読者通知失敗:', error);
        }
      });

      // アプリ内アラート表示
      if (alert.level === AlertLevel.CRITICAL || alert.level === AlertLevel.DANGER) {
        this.showAppAlert(alert);
      }

      // プッシュ通知
      if (this.settings.enablePushNotifications) {
        await this.sendPushNotification(alert);
      }

      // サウンドアラート
      if (this.settings.enableSoundAlerts) {
        this.playAlertSound(alert.level);
      }

      console.log(`🚨 警告通知送信: ${alert.title}`);

    } catch (error) {
      console.error('❌ 警告通知失敗:', error);
    }
  }

  /**
   * アプリ内アラート表示
   */
  private showAppAlert(alert: FoodAlert): void {
    Alert.alert(
      alert.title,
      alert.message,
      alert.actions.map(action => ({
        text: action.label,
        style: action.type === 'destructive' ? 'destructive' : 'default',
        onPress: () => this.handleAlertAction(alert.id, action)
      })).concat([
        {
          text: 'OK',
          style: 'cancel',
          onPress: () => this.markAsRead(alert.id)
        }
      ])
    );
  }

  /**
   * プッシュ通知送信
   */
  private async sendPushNotification(alert: FoodAlert): Promise<void> {
    try {
      // 実装では実際のプッシュ通知サービス（FCM等）を使用
      console.log(`📱 プッシュ通知: ${alert.title}`);
    } catch (error) {
      console.error('❌ プッシュ通知失敗:', error);
    }
  }

  /**
   * アラート音再生
   */
  private playAlertSound(level: AlertLevel): void {
    try {
      // 実装では実際の音響ファイル再生
      const soundFiles = {
        [AlertLevel.INFO]: 'info.wav',
        [AlertLevel.SUCCESS]: 'success.wav',
        [AlertLevel.WARNING]: 'warning.wav',
        [AlertLevel.DANGER]: 'danger.wav',
        [AlertLevel.CRITICAL]: 'critical.wav'
      };

      console.log(`🔊 アラート音再生: ${soundFiles[level]}`);
    } catch (error) {
      console.error('❌ アラート音再生失敗:', error);
    }
  }

  /**
   * 警告アクション処理
   */
  private async handleAlertAction(alertId: string, action: AlertAction): Promise<void> {
    try {
      const alert = this.alerts.get(alertId);
      if (!alert) return;

      // アクション実行
      switch (action.action) {
        case 'consume_now':
          console.log('🍽️ 即座に消費アクション');
          break;
        case 'cook_food':
          console.log('🔥 調理アクション');
          break;
        case 'store_properly':
          console.log('📦 適切な保存アクション');
          break;
        case 'discard_food':
          console.log('🗑️ 廃棄アクション');
          break;
        case 'get_recipe':
          console.log('📖 レシピ取得アクション');
          break;
        case 'set_reminder':
          console.log('⏰ リマインダー設定アクション');
          break;
        default:
          console.log(`❓ 不明なアクション: ${action.action}`);
      }

      // アクション実行後は警告を既読にする
      this.markAsRead(alertId);

    } catch (error) {
      console.error('❌ アクション処理失敗:', error);
    }
  }

  /**
   * 既読マーク
   */
  public markAsRead(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.isRead = true;
      this.subscribers.forEach(subscriber => {
        try {
          subscriber.onAlertDismissed(alertId);
        } catch (error) {
          console.error('❌ 既読通知失敗:', error);
        }
      });
    }
  }

  /**
   * 警告削除
   */
  public dismissAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.isActive = false;
      this.markAsRead(alertId);
    }
  }

  /**
   * 全警告取得
   */
  public getAllAlerts(): FoodAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.isActive)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 未読警告取得
   */
  public getUnreadAlerts(): FoodAlert[] {
    return this.getAllAlerts().filter(alert => !alert.isRead);
  }

  /**
   * 警告レベル別取得
   */
  public getAlertsByLevel(level: AlertLevel): FoodAlert[] {
    return this.getAllAlerts().filter(alert => alert.level === level);
  }

  /**
   * 設定更新
   */
  public updateSettings(newSettings: Partial<AlertSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    // 実装では永続化
    console.log('⚙️ 警告設定更新');
  }

  /**
   * 警告レベル判定（新鮮度）
   */
  private determineFreshnessAlertLevel(score: number): AlertLevel {
    if (score <= this.ALERT_THRESHOLDS.freshness.critical) return AlertLevel.CRITICAL;
    if (score <= this.ALERT_THRESHOLDS.freshness.danger) return AlertLevel.DANGER;
    if (score <= this.ALERT_THRESHOLDS.freshness.warning) return AlertLevel.WARNING;
    if (score >= this.ALERT_THRESHOLDS.freshness.success) return AlertLevel.SUCCESS;
    return AlertLevel.INFO;
  }

  /**
   * 警告レベル判定（状態）
   */
  private determineStateAlertLevel(score: number): AlertLevel {
    if (score <= this.ALERT_THRESHOLDS.state.critical) return AlertLevel.CRITICAL;
    if (score <= this.ALERT_THRESHOLDS.state.danger) return AlertLevel.DANGER;
    if (score <= this.ALERT_THRESHOLDS.state.warning) return AlertLevel.WARNING;
    if (score >= this.ALERT_THRESHOLDS.state.success) return AlertLevel.SUCCESS;
    return AlertLevel.INFO;
  }

  /**
   * クワイエットアワー判定
   */
  private isQuietHour(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = this.settings.quietHours;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * 自動既読タイマー設定
   */
  private setAutoReadTimer(alert: FoodAlert): void {
    setTimeout(() => {
      if (!alert.isRead) {
        this.markAsRead(alert.id);
      }
    }, this.settings.autoMarkReadAfter * 1000);
  }

  /**
   * 警告クリーンアップタイマー開始
   */
  private startAlertCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, alert] of this.alerts.entries()) {
        if (alert.expiresAt && alert.expiresAt < now) {
          alert.isActive = false;
          this.subscribers.forEach(subscriber => {
            try {
              subscriber.onAlertExpired(id);
            } catch (error) {
              console.error('❌ 期限切れ通知失敗:', error);
            }
          });
        }
      }
    }, 60 * 1000); // 1分ごと
  }

  /**
   * 警告キュー処理開始
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessingQueue || this.alertQueue.length === 0) return;
      if (this.isQuietHour()) return;

      this.isProcessingQueue = true;

      while (this.alertQueue.length > 0) {
        const alert = this.alertQueue.shift();
        if (alert) {
          await this.notifyAlert(alert);
        }
      }

      this.isProcessingQueue = false;
    }, 30 * 1000); // 30秒ごと
  }

  /**
   * 警告ID生成
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // メッセージ生成メソッド群
  private getFreshnessAlertTitle(level: FreshnessLevel, alertLevel: AlertLevel): string {
    const titles = {
      [AlertLevel.CRITICAL]: '🚨 緊急: 食品腐敗',
      [AlertLevel.DANGER]: '⚠️ 危険: 新鮮度低下',
      [AlertLevel.WARNING]: '⏰ 注意: 新鮮度注意',
      [AlertLevel.SUCCESS]: '✅ 良好: 新鮮な状態',
      [AlertLevel.INFO]: 'ℹ️ 情報: 新鮮度確認'
    };
    return titles[alertLevel] || '新鮮度警告';
  }

  private getFreshnessAlertMessage(score: FreshnessScore, category: string): string {
    return `${category}の新鮮度が${score.overall}%です。${this.getFreshnessAdvice(score.prediction)}`;
  }

  private getFreshnessAdvice(level: FreshnessLevel): string {
    const advice = {
      [FreshnessLevel.FRESH]: '最高の状態です。',
      [FreshnessLevel.GOOD]: '良好な状態です。',
      [FreshnessLevel.ACCEPTABLE]: '早めの消費をお勧めします。',
      [FreshnessLevel.POOR]: '加熱調理をお勧めします。',
      [FreshnessLevel.SPOILED]: '廃棄することを強く推奨します。'
    };
    return advice[level] || '';
  }

  private getFreshnessAlertDetails(score: FreshnessScore): string {
    return `色彩: ${score.colorScore}%, テクスチャ: ${score.textureScore}%, 形状: ${score.shapeScore}%, 推定賞味期限: ${score.estimatedShelfLife}日`;
  }

  private getStateAlertTitle(state: FoodState, alertLevel: AlertLevel): string {
    const titles = {
      [AlertLevel.CRITICAL]: '🚨 緊急: 食品状態危険',
      [AlertLevel.DANGER]: '⚠️ 危険: 状態悪化',
      [AlertLevel.WARNING]: '⏰ 注意: 状態変化',
      [AlertLevel.SUCCESS]: '✅ 良好: 状態良好',
      [AlertLevel.INFO]: 'ℹ️ 情報: 状態確認'
    };
    return titles[alertLevel] || '状態警告';
  }

  private getStateAlertMessage(result: StateClassificationResult, category: string): string {
    return `${category}の状態スコアが${result.stateScore}%です。${this.getStateAdvice(result.foodState)}`;
  }

  private getStateAdvice(state: FoodState): string {
    const advice = {
      [FoodState.EXCELLENT]: '最高品質を保っています。',
      [FoodState.VERY_GOOD]: '非常に良好な状態です。',
      [FoodState.GOOD]: '良好な状態です。',
      [FoodState.FAIR]: '普通の状態です。',
      [FoodState.POOR]: '状態が悪化しています。',
      [FoodState.BAD]: '状態が非常に悪いです。',
      [FoodState.SPOILED]: '腐敗が進んでいます。'
    };
    return advice[state] || '';
  }

  private getStateAlertDetails(result: StateClassificationResult): string {
    return `品質グレード: ${result.qualityGrade}, リスク要因: ${result.riskFactors.length}件, 推奨: ${result.consumptionRecommendation}`;
  }

  private getSafetyAlertDetails(risks: RiskFactor[]): string {
    return risks.map(r => `${r.type}: ${r.description}`).join('\n');
  }

  private getExpiryAlertDetails(days: number, category: string): string {
    if (days <= 0) {
      return `${category}は賞味期限を過ぎています。安全のため消費を避けることをお勧めします。`;
    }
    return `${category}の推定賞味期限まで${days}日です。早めの消費を検討してください。`;
  }

  // アクション生成メソッド群
  private generateFreshnessActions(level: FreshnessLevel): AlertAction[] {
    const baseActions: AlertAction[] = [
      { id: 'view_details', label: '詳細確認', type: 'secondary', action: 'view_details' }
    ];

    switch (level) {
      case FreshnessLevel.FRESH:
      case FreshnessLevel.GOOD:
        return [
          { id: 'get_recipe', label: 'レシピ提案', type: 'primary', action: 'get_recipe' },
          ...baseActions
        ];
      
      case FreshnessLevel.ACCEPTABLE:
        return [
          { id: 'consume_soon', label: '早めに消費', type: 'primary', action: 'consume_soon' },
          { id: 'set_reminder', label: 'リマインダー', type: 'secondary', action: 'set_reminder' },
          ...baseActions
        ];
      
      case FreshnessLevel.POOR:
        return [
          { id: 'cook_food', label: '加熱調理', type: 'primary', action: 'cook_food' },
          { id: 'discard_food', label: '廃棄', type: 'destructive', action: 'discard_food' },
          ...baseActions
        ];
      
      case FreshnessLevel.SPOILED:
        return [
          { id: 'discard_food', label: '廃棄', type: 'destructive', action: 'discard_food' },
          ...baseActions
        ];
      
      default:
        return baseActions;
    }
  }

  private generateStateActions(recommendation: ConsumptionRecommendation): AlertAction[] {
    const baseActions: AlertAction[] = [
      { id: 'view_analysis', label: '分析結果', type: 'secondary', action: 'view_analysis' }
    ];

    switch (recommendation) {
      case ConsumptionRecommendation.IMMEDIATE_CONSUME:
        return [
          { id: 'consume_now', label: '今すぐ消費', type: 'primary', action: 'consume_now' },
          ...baseActions
        ];
      
      case ConsumptionRecommendation.CONSUME_SOON:
        return [
          { id: 'consume_soon', label: '早めに消費', type: 'primary', action: 'consume_soon' },
          { id: 'set_reminder', label: 'リマインダー', type: 'secondary', action: 'set_reminder' },
          ...baseActions
        ];
      
      case ConsumptionRecommendation.COOK_BEFORE_CONSUME:
        return [
          { id: 'cook_food', label: '加熱調理', type: 'primary', action: 'cook_food' },
          { id: 'discard_food', label: '廃棄', type: 'destructive', action: 'discard_food' },
          ...baseActions
        ];
      
      case ConsumptionRecommendation.DISCARD:
        return [
          { id: 'discard_food', label: '廃棄', type: 'destructive', action: 'discard_food' },
          { id: 'disposal_guide', label: '廃棄方法', type: 'secondary', action: 'disposal_guide' },
          ...baseActions
        ];
      
      default:
        return baseActions;
    }
  }

  private generateSafetyActions(risks: RiskFactor[]): AlertAction[] {
    return [
      { id: 'discard_food', label: '即座に廃棄', type: 'destructive', action: 'discard_food' },
      { id: 'safety_guide', label: '安全ガイド', type: 'secondary', action: 'safety_guide' },
      { id: 'view_risks', label: 'リスク詳細', type: 'secondary', action: 'view_risks' }
    ];
  }

  private generateExpiryActions(days: number): AlertAction[] {
    if (days <= 0) {
      return [
        { id: 'discard_food', label: '廃棄', type: 'destructive', action: 'discard_food' },
        { id: 'disposal_guide', label: '廃棄方法', type: 'secondary', action: 'disposal_guide' }
      ];
    }

    return [
      { id: 'consume_soon', label: '早めに消費', type: 'primary', action: 'consume_soon' },
      { id: 'get_recipe', label: 'レシピ提案', type: 'secondary', action: 'get_recipe' },
      { id: 'set_reminder', label: 'リマインダー', type: 'secondary', action: 'set_reminder' }
    ];
  }

  /**
   * サービス終了処理
   */
  public async dispose(): Promise<void> {
    try {
      this.alerts.clear();
      this.subscribers.clear();
      this.alertQueue = [];
      
      console.log('🔄 警告システム終了');

    } catch (error) {
      console.error('❌ 警告システム終了処理失敗:', error);
    }
  }
}

// シングルトンインスタンスエクスポート
export const alertSystemService = AlertSystemService.getInstance();
