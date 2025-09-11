/**
 * ローカル通知システム (8時間実装)
 * Local Notification System
 * 
 * React Nativeでのローカル通知実装
 * - 通知スケジューリング
 * - 通知メッセージ管理
 * - 通知履歴追跡
 * - カスタム通知設定
 * - 通知チャンネル管理
 * - 深層リンク対応
 */

import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ExpirationAlert, 
  ExpirationAlertType, 
  AlertSeverity 
} from './ExpirationCalculationService';
import { Product } from '../types';

// =============================================================================
// NOTIFICATION TYPES AND INTERFACES
// =============================================================================

export interface NotificationSettings {
  enabled: boolean;
  enabledTypes: Record<ExpirationAlertType, boolean>;
  timingSettings: NotificationTiming;
  soundSettings: SoundSettings;
  visualSettings: VisualSettings;
  batchingSettings: BatchingSettings;
  doNotDisturbSettings: DoNotDisturbSettings;
  customMessages: CustomMessageSettings;
}

export interface NotificationTiming {
  morningTime: string;      // "09:00"
  eveningTime: string;      // "18:00"
  enableMorningNotifications: boolean;
  enableEveningNotifications: boolean;
  enableRealtimeNotifications: boolean;
  snoozeMinutes: number;
  maxNotificationsPerDay: number;
  quietHours: {
    start: string;  // "22:00"
    end: string;    // "07:00"
  };
}

export interface SoundSettings {
  enableSound: boolean;
  soundsByType: Record<ExpirationAlertType, string>;
  enableVibration: boolean;
  customSounds: CustomSound[];
}

export interface CustomSound {
  id: string;
  name: string;
  filePath: string;
  isActive: boolean;
}

export interface VisualSettings {
  enableBadge: boolean;
  enableLightIndicator: boolean;
  colorsByType: Record<ExpirationAlertType, string>;
  iconsByType: Record<ExpirationAlertType, string>;
  enableRichNotifications: boolean;
  showProductImage: boolean;
}

export interface BatchingSettings {
  enableBatching: boolean;
  batchTimeoutMinutes: number;
  maxBatchSize: number;
  batchByCategory: boolean;
  batchBySeverity: boolean;
}

export interface DoNotDisturbSettings {
  enableDoNotDisturb: boolean;
  schedule: {
    days: number[]; // 0=Sunday, 1=Monday, etc.
    startTime: string;
    endTime: string;
  }[];
  emergencyOverride: boolean; // Allow critical alerts during DND
}

export interface CustomMessageSettings {
  messageTemplates: Record<ExpirationAlertType, string>;
  enablePersonalization: boolean;
  includeProductName: boolean;
  includeExpirationDate: boolean;
  includeSuggestedActions: boolean;
  customGreetings: string[];
}

export interface ScheduledNotification {
  id: string;
  alertId: string;
  type: ExpirationAlertType;
  title: string;
  message: string;
  scheduledDate: Date;
  productId: string;
  product?: Product;
  isDelivered: boolean;
  isCancelled: boolean;
  createdAt: Date;
  deliveredAt?: Date;
  interactionData?: NotificationInteraction;
}

export interface NotificationInteraction {
  opened: boolean;
  openedAt?: Date;
  action?: string;
  dismissed: boolean;
  dismissedAt?: Date;
  snoozed: boolean;
  snoozeUntil?: Date;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'low' | 'default' | 'high' | 'max';
  sound?: string;
  vibration: boolean;
  lights: boolean;
  badge: boolean;
}

export interface NotificationStatistics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalDismissed: number;
  openRate: number;
  dismissRate: number;
  averageResponseTime: number; // minutes
  mostActiveHour: number;
  typeBreakdown: Record<ExpirationAlertType, number>;
  effectivenessScore: number;
}

// =============================================================================
// LOCAL NOTIFICATION SERVICE
// =============================================================================

export class LocalNotificationService {
  private settings: NotificationSettings;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private notificationQueue: ExpirationAlert[] = [];
  private batchTimer?: NodeJS.Timeout;
  private channels: NotificationChannel[] = [];
  private isInitialized = false;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeNotificationChannels();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing Local Notification Service...');

      // Configure PushNotification
      PushNotification.configure({
        onNotification: this.handleNotificationReceived.bind(this),
        onAction: this.handleNotificationAction.bind(this),
        onRegistrationError: this.handleRegistrationError.bind(this),
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });

      // Create notification channels (Android)
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      // Load settings and scheduled notifications
      await this.loadSettings();
      await this.loadScheduledNotifications();

      // Clean up old notifications
      await this.cleanupOldNotifications();

      this.isInitialized = true;
      console.log('✅ Local Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      throw error;
    }
  }

  private initializeNotificationChannels(): void {
    this.channels = [
      {
        id: 'expiration_critical',
        name: 'Critical Expiration Alerts',
        description: 'Urgent notifications for expired or critically expiring items',
        importance: 'max',
        sound: 'default',
        vibration: true,
        lights: true,
        badge: true,
      },
      {
        id: 'expiration_high',
        name: 'High Priority Expiration',
        description: 'Important expiration notifications',
        importance: 'high',
        sound: 'default',
        vibration: true,
        lights: true,
        badge: true,
      },
      {
        id: 'expiration_normal',
        name: 'Expiration Reminders',
        description: 'Regular expiration reminders and tips',
        importance: 'default',
        sound: 'default',
        vibration: false,
        lights: false,
        badge: true,
      },
      {
        id: 'expiration_batch',
        name: 'Batch Notifications',
        description: 'Summarized notifications for multiple items',
        importance: 'default',
        sound: 'default',
        vibration: false,
        lights: false,
        badge: true,
      },
    ];
  }

  private createNotificationChannels(): void {
    this.channels.forEach(channel => {
      PushNotification.createChannel(
        {
          channelId: channel.id,
          channelName: channel.name,
          channelDescription: channel.description,
          playSound: !!channel.sound,
          soundName: channel.sound || 'default',
          importance: this.mapImportanceToAndroid(channel.importance),
          vibrate: channel.vibration,
        },
        (created) => {
          if (created) {
            console.log(`📱 Created notification channel: ${channel.name}`);
          }
        }
      );
    });
  }

  private mapImportanceToAndroid(importance: string): number {
    switch (importance) {
      case 'low': return 2;
      case 'default': return 3;
      case 'high': return 4;
      case 'max': return 5;
      default: return 3;
    }
  }

  // ---------------------------------------------------------------------------
  // CORE NOTIFICATION METHODS
  // ---------------------------------------------------------------------------

  async scheduleNotificationForAlert(alert: ExpirationAlert): Promise<string | null> {
    try {
      if (!this.settings.enabled || !this.settings.enabledTypes[alert.alertType]) {
        console.log(`📴 Notifications disabled for type: ${alert.alertType}`);
        return null;
      }

      if (this.isInDoNotDisturbPeriod() && !this.shouldOverrideDND(alert)) {
        console.log(`🔕 Do not disturb active, queuing notification for later`);
        this.notificationQueue.push(alert);
        return null;
      }

      if (this.settings.batchingSettings.enableBatching) {
        return this.addToBatch(alert);
      }

      return this.scheduleImmediateNotification(alert);
    } catch (error) {
      console.error('❌ Failed to schedule notification for alert:', error);
      return null;
    }
  }

  private async scheduleImmediateNotification(alert: ExpirationAlert): Promise<string> {
    const notificationId = this.generateNotificationId();
    const scheduledDate = new Date();

    const notification: ScheduledNotification = {
      id: notificationId,
      alertId: alert.id,
      type: alert.alertType,
      title: this.generateNotificationTitle(alert),
      message: this.generateNotificationMessage(alert),
      scheduledDate,
      productId: alert.productId,
      product: alert.product,
      isDelivered: false,
      isCancelled: false,
      createdAt: new Date(),
    };

    // Schedule the notification
    const platformNotification = this.createPlatformNotification(notification);
    
    PushNotification.localNotificationSchedule({
      ...platformNotification,
      date: scheduledDate,
    });

    // Store the scheduled notification
    this.scheduledNotifications.set(notificationId, notification);
    await this.saveScheduledNotifications();

    console.log(`🔔 Scheduled notification: ${notification.title}`);
    return notificationId;
  }

  private addToBatch(alert: ExpirationAlert): string {
    this.notificationQueue.push(alert);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.settings.batchingSettings.batchTimeoutMinutes * 60 * 1000);
    }

    if (this.notificationQueue.length >= this.settings.batchingSettings.maxBatchSize) {
      this.processBatch();
    }

    return `batch_${Date.now()}`;
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.notificationQueue.length === 0) return;

    try {
      const batch = [...this.notificationQueue];
      this.notificationQueue = [];

      if (batch.length === 1) {
        await this.scheduleImmediateNotification(batch[0]);
        return;
      }

      const batchNotification = this.createBatchNotification(batch);
      await this.scheduleImmediateNotification(batchNotification);

      console.log(`📦 Processed batch notification for ${batch.length} alerts`);
    } catch (error) {
      console.error('❌ Failed to process notification batch:', error);
    }
  }

  private createBatchNotification(alerts: ExpirationAlert[]): ExpirationAlert {
    const criticalCount = alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length;
    const highCount = alerts.filter(a => a.severity === AlertSeverity.HIGH).length;
    const totalCount = alerts.length;

    const title = criticalCount > 0 
      ? `${criticalCount}個の商品が期限切れです`
      : `${totalCount}個の商品の期限が近づいています`;

    const message = this.generateBatchMessage(alerts);

    // Use the most severe alert as the base
    const mostSevere = alerts.reduce((prev, current) => 
      this.getSeverityWeight(current.severity) > this.getSeverityWeight(prev.severity) 
        ? current 
        : prev
    );

    return {
      ...mostSevere,
      id: `batch_${Date.now()}`,
      alertType: ExpirationAlertType.BATCH_EXPIRING,
    };
  }

  private generateBatchMessage(alerts: ExpirationAlert[]): string {
    const groups = this.groupAlertsByCategory(alerts);
    const messages: string[] = [];

    for (const [category, categoryAlerts] of groups) {
      if (categoryAlerts.length === 1) {
        messages.push(`${categoryAlerts[0].product.name}`);
      } else {
        messages.push(`${category}類 ${categoryAlerts.length}個`);
      }
    }

    return messages.slice(0, 3).join('、') + 
           (messages.length > 3 ? ` など${alerts.length}個` : '');
  }

  private groupAlertsByCategory(alerts: ExpirationAlert[]): Map<string, ExpirationAlert[]> {
    const groups = new Map<string, ExpirationAlert[]>();

    for (const alert of alerts) {
      const category = alert.product.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(alert);
    }

    return groups;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION CONTENT GENERATION
  // ---------------------------------------------------------------------------

  private generateNotificationTitle(alert: ExpirationAlert): string {
    const templates = this.settings.customMessages.messageTemplates;
    const template = templates[alert.alertType];

    if (template) {
      return this.replacePlaceholders(template, alert, 'title');
    }

    switch (alert.alertType) {
      case ExpirationAlertType.EXPIRED:
        return `⚠️ ${alert.product.name}が期限切れです`;
      
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return `🚨 ${alert.product.name}が今日期限切れ`;
      
      case ExpirationAlertType.EXPIRING_SOON:
        return `⏰ ${alert.product.name}の期限が近づいています`;
      
      case ExpirationAlertType.CONSUME_PRIORITY:
        return `🍽️ ${alert.product.name}を優先的に消費しましょう`;
      
      case ExpirationAlertType.WASTE_WARNING:
        return `♻️ ${alert.product.name}の廃棄を防ぎましょう`;
      
      case ExpirationAlertType.BATCH_EXPIRING:
        return `📦 複数の商品の期限が近づいています`;
      
      default:
        return `📅 ${alert.product.name}の期限チェック`;
    }
  }

  private generateNotificationMessage(alert: ExpirationAlert): string {
    const product = alert.product;
    const daysText = this.formatDaysText(alert.daysUntilExpiration);
    
    let message = '';

    if (alert.daysUntilExpiration < 0) {
      message = `${Math.abs(alert.daysUntilExpiration)}日前に期限切れになりました。`;
    } else if (alert.daysUntilExpiration === 0) {
      message = '今日が期限です。';
    } else {
      message = `あと${daysText}で期限切れです。`;
    }

    if (this.settings.customMessages.includeSuggestedActions && alert.suggestedActions.length > 0) {
      const topAction = alert.suggestedActions[0];
      message += ` ${topAction.title}をおすすめします。`;
    }

    if (product.location) {
      message += ` (保存場所: ${product.location})`;
    }

    return message;
  }

  private formatDaysText(days: number): string {
    if (days === 1) return '1日';
    return `${days}日`;
  }

  private replacePlaceholders(template: string, alert: ExpirationAlert, type: 'title' | 'message'): string {
    const product = alert.product;
    const daysText = this.formatDaysText(alert.daysUntilExpiration);

    return template
      .replace(/\{productName\}/g, product.name)
      .replace(/\{daysUntilExpiration\}/g, daysText)
      .replace(/\{category\}/g, product.category)
      .replace(/\{location\}/g, product.location)
      .replace(/\{quantity\}/g, (product.quantity || 0).toString())
      .replace(/\{brand\}/g, product.brand || '')
      .replace(/\{expirationDate\}/g, new Date(product.expirationDate).toLocaleDateString('ja-JP'));
  }

  // ---------------------------------------------------------------------------
  // PLATFORM NOTIFICATION CREATION
  // ---------------------------------------------------------------------------

  private createPlatformNotification(notification: ScheduledNotification): any {
    const channelId = this.getChannelIdForType(notification.type);
    const color = this.settings.visualSettings.colorsByType[notification.type];
    const sound = this.settings.soundSettings.soundsByType[notification.type];

    const platformNotification: any = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      playSound: this.settings.soundSettings.enableSound,
      soundName: sound || 'default',
      number: 1,
      userInfo: {
        alertId: notification.alertId,
        productId: notification.productId,
        type: notification.type,
        scheduledDate: notification.scheduledDate.toISOString(),
      },
    };

    // Android specific properties
    if (Platform.OS === 'android') {
      platformNotification.channelId = channelId;
      platformNotification.color = color;
      platformNotification.vibrate = this.settings.soundSettings.enableVibration;
      platformNotification.priority = this.getAndroidPriority(notification.type);
      platformNotification.importance = this.getAndroidImportance(notification.type);
    }

    // iOS specific properties
    if (Platform.OS === 'ios') {
      platformNotification.alertAction = 'view';
      platformNotification.category = notification.type;
      if (this.settings.visualSettings.enableBadge) {
        platformNotification.applicationIconBadgeNumber = 1;
      }
    }

    return platformNotification;
  }

  private getChannelIdForType(type: ExpirationAlertType): string {
    switch (type) {
      case ExpirationAlertType.EXPIRED:
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return 'expiration_critical';
      
      case ExpirationAlertType.EXPIRING_SOON:
      case ExpirationAlertType.CONSUME_PRIORITY:
      case ExpirationAlertType.WASTE_WARNING:
        return 'expiration_high';
      
      case ExpirationAlertType.BATCH_EXPIRING:
        return 'expiration_batch';
      
      default:
        return 'expiration_normal';
    }
  }

  private getAndroidPriority(type: ExpirationAlertType): string {
    switch (type) {
      case ExpirationAlertType.EXPIRED:
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return 'max';
      case ExpirationAlertType.EXPIRING_SOON:
        return 'high';
      default:
        return 'default';
    }
  }

  private getAndroidImportance(type: ExpirationAlertType): string {
    switch (type) {
      case ExpirationAlertType.EXPIRED:
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return 'max';
      case ExpirationAlertType.EXPIRING_SOON:
        return 'high';
      default:
        return 'default';
    }
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION EVENT HANDLERS
  // ---------------------------------------------------------------------------

  private handleNotificationReceived(notification: any): void {
    try {
      console.log('📥 Notification received:', notification);

      const notificationId = notification.id || notification.userInfo?.id;
      if (notificationId) {
        const scheduledNotification = this.scheduledNotifications.get(notificationId);
        if (scheduledNotification) {
          scheduledNotification.isDelivered = true;
          scheduledNotification.deliveredAt = new Date();
          
          if (!scheduledNotification.interactionData) {
            scheduledNotification.interactionData = {
              opened: false,
              dismissed: false,
              snoozed: false,
            };
          }

          this.saveScheduledNotifications();
        }
      }

      // Handle notification tap
      if (notification.userInteraction) {
        this.handleNotificationTap(notification);
      }
    } catch (error) {
      console.error('❌ Error handling notification received:', error);
    }
  }

  private handleNotificationAction(notification: any): void {
    try {
      console.log('👆 Notification action:', notification);

      const action = notification.action;
      const notificationId = notification.id || notification.userInfo?.id;

      if (notificationId) {
        const scheduledNotification = this.scheduledNotifications.get(notificationId);
        if (scheduledNotification?.interactionData) {
          scheduledNotification.interactionData.action = action;
          this.saveScheduledNotifications();
        }
      }

      // Handle specific actions
      switch (action) {
        case 'snooze':
          this.snoozeNotification(notificationId);
          break;
        case 'mark_consumed':
          this.markProductConsumed(notification.userInfo?.productId);
          break;
        case 'view_product':
          this.openProductDetail(notification.userInfo?.productId);
          break;
        default:
          this.handleNotificationTap(notification);
      }
    } catch (error) {
      console.error('❌ Error handling notification action:', error);
    }
  }

  private handleNotificationTap(notification: any): void {
    try {
      const notificationId = notification.id || notification.userInfo?.id;
      const productId = notification.userInfo?.productId;

      if (notificationId) {
        const scheduledNotification = this.scheduledNotifications.get(notificationId);
        if (scheduledNotification?.interactionData) {
          scheduledNotification.interactionData.opened = true;
          scheduledNotification.interactionData.openedAt = new Date();
          this.saveScheduledNotifications();
        }
      }

      // Navigate to relevant screen
      if (productId) {
        this.openProductDetail(productId);
      } else {
        this.openExpirationOverview();
      }
    } catch (error) {
      console.error('❌ Error handling notification tap:', error);
    }
  }

  private handleRegistrationError(err: any): void {
    console.error('❌ Notification registration error:', err);
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION ACTIONS
  // ---------------------------------------------------------------------------

  private async snoozeNotification(notificationId: string): Promise<void> {
    try {
      const scheduledNotification = this.scheduledNotifications.get(notificationId);
      if (!scheduledNotification) return;

      const snoozeMinutes = this.settings.timingSettings.snoozeMinutes;
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

      if (scheduledNotification.interactionData) {
        scheduledNotification.interactionData.snoozed = true;
        scheduledNotification.interactionData.snoozeUntil = snoozeUntil;
      }

      // Cancel current notification
      PushNotification.cancelLocalNotifications({ id: notificationId });

      // Reschedule for later
      const rescheduledNotification = {
        ...scheduledNotification,
        id: this.generateNotificationId(),
        scheduledDate: snoozeUntil,
        isDelivered: false,
      };

      const platformNotification = this.createPlatformNotification(rescheduledNotification);
      PushNotification.localNotificationSchedule({
        ...platformNotification,
        date: snoozeUntil,
      });

      this.scheduledNotifications.set(rescheduledNotification.id, rescheduledNotification);
      await this.saveScheduledNotifications();

      console.log(`⏰ Notification snoozed for ${snoozeMinutes} minutes`);
    } catch (error) {
      console.error('❌ Failed to snooze notification:', error);
    }
  }

  private async markProductConsumed(productId: string): Promise<void> {
    // This would integrate with the product management system
    console.log(`✅ Marking product ${productId} as consumed`);
    // TODO: Integrate with ProductRepository to update consumption status
  }

  private openProductDetail(productId: string): void {
    // This would navigate to the product detail screen
    console.log(`📱 Opening product detail for ${productId}`);
    // TODO: Integrate with navigation system
  }

  private openExpirationOverview(): void {
    // This would navigate to the expiration overview screen
    console.log(`📱 Opening expiration overview`);
    // TODO: Integrate with navigation system
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSeverityWeight(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 4;
      case AlertSeverity.HIGH: return 3;
      case AlertSeverity.MEDIUM: return 2;
      case AlertSeverity.LOW: return 1;
      default: return 0;
    }
  }

  private isInDoNotDisturbPeriod(): boolean {
    if (!this.settings.doNotDisturbSettings.enableDoNotDisturb) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const schedule of this.settings.doNotDisturbSettings.schedule) {
      if (schedule.days.includes(currentDay)) {
        if (this.isTimeInRange(currentTime, schedule.startTime, schedule.endTime)) {
          return true;
        }
      }
    }

    return false;
  }

  private isTimeInRange(time: string, start: string, end: string): boolean {
    // Handle cases where end time is next day (e.g., 22:00 - 07:00)
    if (start <= end) {
      return time >= start && time <= end;
    } else {
      return time >= start || time <= end;
    }
  }

  private shouldOverrideDND(alert: ExpirationAlert): boolean {
    return this.settings.doNotDisturbSettings.emergencyOverride && 
           alert.severity === AlertSeverity.CRITICAL;
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE METHODS
  // ---------------------------------------------------------------------------

  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (settingsJson) {
        const loadedSettings = JSON.parse(settingsJson);
        this.settings = { ...this.settings, ...loadedSettings };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  private async loadScheduledNotifications(): Promise<void> {
    try {
      const notificationsJson = await AsyncStorage.getItem('scheduled_notifications');
      if (notificationsJson) {
        const notifications: ScheduledNotification[] = JSON.parse(notificationsJson);
        notifications.forEach(notification => {
          // Convert date strings back to Date objects
          notification.scheduledDate = new Date(notification.scheduledDate);
          notification.createdAt = new Date(notification.createdAt);
          if (notification.deliveredAt) {
            notification.deliveredAt = new Date(notification.deliveredAt);
          }
          if (notification.interactionData?.openedAt) {
            notification.interactionData.openedAt = new Date(notification.interactionData.openedAt);
          }
          if (notification.interactionData?.dismissedAt) {
            notification.interactionData.dismissedAt = new Date(notification.interactionData.dismissedAt);
          }
          if (notification.interactionData?.snoozeUntil) {
            notification.interactionData.snoozeUntil = new Date(notification.interactionData.snoozeUntil);
          }
          
          this.scheduledNotifications.set(notification.id, notification);
        });
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  private async saveScheduledNotifications(): Promise<void> {
    try {
      const notifications = Array.from(this.scheduledNotifications.values());
      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  private async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep last 7 days

      const toRemove: string[] = [];
      
      for (const [id, notification] of this.scheduledNotifications) {
        if (notification.createdAt < cutoffDate && notification.isDelivered) {
          toRemove.push(id);
        }
      }

      toRemove.forEach(id => this.scheduledNotifications.delete(id));
      
      if (toRemove.length > 0) {
        await this.saveScheduledNotifications();
        console.log(`🧹 Cleaned up ${toRemove.length} old notifications`);
      }
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async scheduleNotification(alert: ExpirationAlert): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.scheduleNotificationForAlert(alert);
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      PushNotification.cancelLocalNotifications({ id: notificationId });
      
      const notification = this.scheduledNotifications.get(notificationId);
      if (notification) {
        notification.isCancelled = true;
        await this.saveScheduledNotifications();
      }

      console.log(`❌ Cancelled notification: ${notificationId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      PushNotification.cancelAllLocalNotifications();
      
      // Mark all as cancelled
      for (const notification of this.scheduledNotifications.values()) {
        notification.isCancelled = true;
      }
      
      await this.saveScheduledNotifications();
      console.log('❌ Cancelled all notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    console.log('⚙️ Notification settings updated');
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    return Array.from(this.scheduledNotifications.values())
      .filter(n => !n.isCancelled)
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async getNotificationStatistics(): Promise<NotificationStatistics> {
    const notifications = Array.from(this.scheduledNotifications.values());
    const delivered = notifications.filter(n => n.isDelivered);
    const opened = notifications.filter(n => n.interactionData?.opened);
    const dismissed = notifications.filter(n => n.interactionData?.dismissed);

    const totalSent = notifications.length;
    const totalDelivered = delivered.length;
    const totalOpened = opened.length;
    const totalDismissed = dismissed.length;

    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const dismissRate = totalDelivered > 0 ? (totalDismissed / totalDelivered) * 100 : 0;

    // Calculate average response time
    const responseTimes = opened
      .filter(n => n.deliveredAt && n.interactionData?.openedAt)
      .map(n => {
        const delivered = n.deliveredAt!.getTime();
        const opened = n.interactionData!.openedAt!.getTime();
        return (opened - delivered) / (1000 * 60); // minutes
      });
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Type breakdown
    const typeBreakdown: Record<ExpirationAlertType, number> = {} as any;
    for (const type of Object.values(ExpirationAlertType)) {
      typeBreakdown[type] = notifications.filter(n => n.type === type).length;
    }

    // Calculate effectiveness score (0-100)
    const effectivenessScore = Math.round(
      (openRate * 0.6) + ((100 - dismissRate) * 0.4)
    );

    // Most active hour
    const hourCounts: Record<number, number> = {};
    delivered.forEach(n => {
      if (n.deliveredAt) {
        const hour = n.deliveredAt.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    const mostActiveHour = Object.entries(hourCounts)
      .reduce((max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max, 
              { hour: 0, count: 0 }).hour;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalDismissed,
      openRate,
      dismissRate,
      averageResponseTime,
      mostActiveHour,
      typeBreakdown,
      effectivenessScore,
    };
  }

  // ---------------------------------------------------------------------------
  // DEFAULT SETTINGS
  // ---------------------------------------------------------------------------

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      enabledTypes: {
        [ExpirationAlertType.EXPIRED]: true,
        [ExpirationAlertType.CRITICAL_EXPIRING]: true,
        [ExpirationAlertType.EXPIRING_SOON]: true,
        [ExpirationAlertType.CONSUME_PRIORITY]: true,
        [ExpirationAlertType.WASTE_WARNING]: true,
        [ExpirationAlertType.BATCH_EXPIRING]: true,
      },
      timingSettings: {
        morningTime: '09:00',
        eveningTime: '18:00',
        enableMorningNotifications: true,
        enableEveningNotifications: true,
        enableRealtimeNotifications: true,
        snoozeMinutes: 30,
        maxNotificationsPerDay: 10,
        quietHours: {
          start: '22:00',
          end: '07:00',
        },
      },
      soundSettings: {
        enableSound: true,
        soundsByType: {
          [ExpirationAlertType.EXPIRED]: 'default',
          [ExpirationAlertType.CRITICAL_EXPIRING]: 'default',
          [ExpirationAlertType.EXPIRING_SOON]: 'default',
          [ExpirationAlertType.CONSUME_PRIORITY]: 'default',
          [ExpirationAlertType.WASTE_WARNING]: 'default',
          [ExpirationAlertType.BATCH_EXPIRING]: 'default',
        },
        enableVibration: true,
        customSounds: [],
      },
      visualSettings: {
        enableBadge: true,
        enableLightIndicator: true,
        colorsByType: {
          [ExpirationAlertType.EXPIRED]: '#FF4444',
          [ExpirationAlertType.CRITICAL_EXPIRING]: '#FF8800',
          [ExpirationAlertType.EXPIRING_SOON]: '#FFBB33',
          [ExpirationAlertType.CONSUME_PRIORITY]: '#00C851',
          [ExpirationAlertType.WASTE_WARNING]: '#33B5E5',
          [ExpirationAlertType.BATCH_EXPIRING]: '#AA66CC',
        },
        iconsByType: {
          [ExpirationAlertType.EXPIRED]: '⚠️',
          [ExpirationAlertType.CRITICAL_EXPIRING]: '🚨',
          [ExpirationAlertType.EXPIRING_SOON]: '⏰',
          [ExpirationAlertType.CONSUME_PRIORITY]: '🍽️',
          [ExpirationAlertType.WASTE_WARNING]: '♻️',
          [ExpirationAlertType.BATCH_EXPIRING]: '📦',
        },
        enableRichNotifications: true,
        showProductImage: true,
      },
      batchingSettings: {
        enableBatching: true,
        batchTimeoutMinutes: 5,
        maxBatchSize: 5,
        batchByCategory: true,
        batchBySeverity: true,
      },
      doNotDisturbSettings: {
        enableDoNotDisturb: false,
        schedule: [
          {
            days: [0, 1, 2, 3, 4, 5, 6], // All days
            startTime: '22:00',
            endTime: '07:00',
          },
        ],
        emergencyOverride: true,
      },
      customMessages: {
        messageTemplates: {
          [ExpirationAlertType.EXPIRED]: '{productName}が期限切れです',
          [ExpirationAlertType.CRITICAL_EXPIRING]: '{productName}の期限が今日です',
          [ExpirationAlertType.EXPIRING_SOON]: '{productName}があと{daysUntilExpiration}で期限切れ',
          [ExpirationAlertType.CONSUME_PRIORITY]: '{productName}を優先的に消費',
          [ExpirationAlertType.WASTE_WARNING]: '{productName}の廃棄を防止',
          [ExpirationAlertType.BATCH_EXPIRING]: '複数商品の期限チェック',
        },
        enablePersonalization: true,
        includeProductName: true,
        includeExpirationDate: true,
        includeSuggestedActions: true,
        customGreetings: [
          'おはようございます！',
          'こんにちは！',
          'お疲れ様です！',
          'リマインダーです',
        ],
      },
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const localNotificationService = new LocalNotificationService();
