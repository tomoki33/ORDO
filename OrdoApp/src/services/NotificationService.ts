import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugUtils } from '../utils';
import { sqliteService } from './sqliteService';
import { Product } from '../types';

export interface NotificationConfig {
  enabled: boolean;
  daysBeforeExpiration: number;
  dailyReminderTime: string; // HH:MM format
  weeklyReminderEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ScheduledNotification {
  id: string;
  productId: string;
  type: 'expiration_warning' | 'expired_item' | 'daily_reminder' | 'weekly_summary';
  title: string;
  message: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private defaultConfig: NotificationConfig = {
    enabled: true,
    daysBeforeExpiration: 3,
    dailyReminderTime: '09:00',
    weeklyReminderEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 通知システムを初期化
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Android通知権限をリクエスト
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        DebugUtils.warn('Notification permission denied');
        return false;
      }

      // 通知チャンネルを設定
      this.setupNotificationChannels();

      // 通知設定を読み込み
      await this.loadNotificationConfig();

      // 既存の通知をクリア（開発時）
      if (__DEV__) {
        PushNotification.cancelAllLocalNotifications();
      }

      this.isInitialized = true;
      DebugUtils.log('NotificationService initialized successfully');
      return true;
    } catch (error) {
      DebugUtils.error('Failed to initialize NotificationService:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * 通知権限をリクエスト
   */
  private async requestNotificationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: '通知の許可',
              message: '食品の期限切れをお知らせするために通知の許可が必要です',
              buttonNeutral: '後で確認',
              buttonNegative: 'いいえ',
              buttonPositive: 'はい',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true; // Android 12以下は自動許可
      }
      return true; // iOSはアプリ初回起動時に自動でダイアログ表示
    } catch (error) {
      DebugUtils.error('Failed to request notification permission:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * 通知チャンネルを設定
   */
  private setupNotificationChannels(): void {
    // 期限切れ警告チャンネル
    PushNotification.createChannel(
      {
        channelId: 'expiration_warnings',
        channelName: '期限切れ警告',
        channelDescription: '食品の期限切れが近づいた時の通知',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => DebugUtils.log('Expiration warnings channel created:', created)
    );

    // 期限切れ通知チャンネル
    PushNotification.createChannel(
      {
        channelId: 'expired_items',
        channelName: '期限切れ通知',
        channelDescription: '食品が期限切れになった時の通知',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => DebugUtils.log('Expired items channel created:', created)
    );

    // 日次リマインダーチャンネル
    PushNotification.createChannel(
      {
        channelId: 'daily_reminders',
        channelName: '日次リマインダー',
        channelDescription: '毎日の在庫確認リマインダー',
        playSound: false,
        importance: Importance.DEFAULT,
        vibrate: false,
      },
      (created: boolean) => DebugUtils.log('Daily reminders channel created:', created)
    );
  }

  /**
   * 通知設定を読み込み
   */
  private async loadNotificationConfig(): Promise<void> {
    try {
      const configString = await AsyncStorage.getItem('notification_config');
      if (configString) {
        const config = JSON.parse(configString);
        this.defaultConfig = { ...this.defaultConfig, ...config };
      }
    } catch (error) {
      DebugUtils.error('Failed to load notification config:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 通知設定を保存
   */
  public async saveNotificationConfig(config: Partial<NotificationConfig>): Promise<void> {
    try {
      this.defaultConfig = { ...this.defaultConfig, ...config };
      await AsyncStorage.setItem('notification_config', JSON.stringify(this.defaultConfig));
      DebugUtils.log('Notification config saved:', this.defaultConfig);
    } catch (error) {
      DebugUtils.error('Failed to save notification config:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 通知設定を取得
   */
  public getNotificationConfig(): NotificationConfig {
    return { ...this.defaultConfig };
  }

  /**
   * 商品の期限切れ通知をスケジュール
   */
  public async scheduleExpirationNotifications(products: Product[]): Promise<void> {
    try {
      if (!this.defaultConfig.enabled) return;

      // 既存の期限切れ通知をキャンセル
      await this.cancelNotificationsByType(['expiration_warning', 'expired_item']);

      for (const product of products) {
        if (!product.expirationDate) continue;

        const now = new Date();
        const expirationDate = new Date(product.expirationDate);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // 期限切れ警告通知
        if (daysUntilExpiration <= this.defaultConfig.daysBeforeExpiration && daysUntilExpiration > 0) {
          const warningDate = new Date(expirationDate);
          warningDate.setDate(warningDate.getDate() - this.defaultConfig.daysBeforeExpiration);
          warningDate.setHours(9, 0, 0, 0); // 朝9時に設定

          if (warningDate > now) {
            this.scheduleLocalNotification({
              id: `expiration_warning_${product.id}`,
              productId: product.id,
              type: 'expiration_warning',
              title: '期限切れ警告',
              message: `${product.name}の期限が${daysUntilExpiration}日後に迫っています`,
              scheduledAt: warningDate,
              status: 'pending',
            });
          }
        }

        // 期限切れ通知
        if (daysUntilExpiration <= 0) {
          const expiredDate = new Date(expirationDate);
          expiredDate.setHours(20, 0, 0, 0); // 夜8時に設定

          if (expiredDate > now || daysUntilExpiration === 0) {
            this.scheduleLocalNotification({
              id: `expired_item_${product.id}`,
              productId: product.id,
              type: 'expired_item',
              title: '期限切れ商品',
              message: `${product.name}が期限切れです。確認してください`,
              scheduledAt: daysUntilExpiration === 0 ? expiredDate : new Date(),
              status: 'pending',
            });
          }
        }
      }

      DebugUtils.log(`Scheduled notifications for ${products.length} products`);
    } catch (error) {
      DebugUtils.error('Failed to schedule expiration notifications:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 日次リマインダーをスケジュール
   */
  public async scheduleDailyReminder(): Promise<void> {
    try {
      if (!this.defaultConfig.enabled) return;

      // 既存の日次リマインダーをキャンセル
      await this.cancelNotificationsByType(['daily_reminder']);

      const [hours, minutes] = this.defaultConfig.dailyReminderTime.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      // 今日の時間が過ぎていたら明日に設定
      if (reminderTime <= new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      this.scheduleLocalNotification({
        id: 'daily_reminder',
        productId: '',
        type: 'daily_reminder',
        title: '在庫確認',
        message: '今日も食品の期限をチェックしましょう',
        scheduledAt: reminderTime,
        status: 'pending',
      });

      DebugUtils.log('Daily reminder scheduled for:', reminderTime);
    } catch (error) {
      DebugUtils.error('Failed to schedule daily reminder:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * ローカル通知をスケジュール
   */
  private async scheduleLocalNotification(notification: ScheduledNotification): Promise<void> {
    try {
      // 通知履歴をデータベースに保存
      await sqliteService.addNotificationHistory({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        productId: notification.productId || null,
        scheduledAt: notification.scheduledAt,
        sentAt: null,
        status: 'pending',
      });

      // 実際の通知をスケジュール
      PushNotification.localNotificationSchedule({
        id: notification.id,
        channelId: this.getChannelIdForType(notification.type),
        title: notification.title,
        message: notification.message,
        date: notification.scheduledAt,
        soundName: this.defaultConfig.soundEnabled ? 'default' : undefined,
        vibrate: this.defaultConfig.vibrationEnabled,
        playSound: this.defaultConfig.soundEnabled,
        userInfo: {
          type: notification.type,
          productId: notification.productId,
        },
      });

      DebugUtils.log('Notification scheduled:', notification);
    } catch (error) {
      DebugUtils.error('Failed to schedule local notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 通知タイプに対応するチャンネルIDを取得
   */
  private getChannelIdForType(type: ScheduledNotification['type']): string {
    switch (type) {
      case 'expiration_warning':
        return 'expiration_warnings';
      case 'expired_item':
        return 'expired_items';
      case 'daily_reminder':
      case 'weekly_summary':
        return 'daily_reminders';
      default:
        return 'expiration_warnings';
    }
  }

  /**
   * 特定タイプの通知をキャンセル
   */
  private async cancelNotificationsByType(types: ScheduledNotification['type'][]): Promise<void> {
    try {
      // 実装簡易化のため、全ての通知をキャンセルして再スケジュール
      PushNotification.cancelAllLocalNotifications();
      DebugUtils.log('Cancelled notifications for types:', types);
    } catch (error) {
      DebugUtils.error('Failed to cancel notifications:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * すべての通知をキャンセル
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      PushNotification.cancelAllLocalNotifications();
      DebugUtils.log('All notifications cancelled');
    } catch (error) {
      DebugUtils.error('Failed to cancel all notifications:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 通知履歴を取得
   */
  public async getNotificationHistory(limit: number = 50): Promise<any[]> {
    try {
      return await sqliteService.getNotificationHistory(limit);
    } catch (error) {
      DebugUtils.error('Failed to get notification history:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * 期限切れ商品数を取得
   */
  public async getExpiringProductsCount(): Promise<number> {
    try {
      const products = await sqliteService.getAllProducts();
      const now = new Date();
      const expiringProducts = products.filter(product => {
        if (!product.expirationDate) return false;
        const daysUntilExpiration = Math.ceil((new Date(product.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiration <= this.defaultConfig.daysBeforeExpiration && daysUntilExpiration >= 0;
      });
      return expiringProducts.length;
    } catch (error) {
      DebugUtils.error('Failed to get expiring products count:', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * 通知ハンドラーを設定
   */
  public setupNotificationHandlers(): void {
    // 通知がタップされた時の処理
    PushNotification.configure({
      onNotification: (notification: any) => {
        DebugUtils.log('Notification received:', notification);
        
        if (notification.userInteraction) {
          // 通知がタップされた場合の処理
          this.handleNotificationTap(notification);
        }
      },
      requestPermissions: Platform.OS === 'ios',
    });
  }

  /**
   * 通知タップ時の処理
   */
  private async handleNotificationTap(notification: any): Promise<void> {
    try {
      const { type, productId } = notification.userInfo || {};
      
      // 通知履歴を更新
      await sqliteService.updateNotificationStatus(notification.id, 'sent');
      
      // 通知タイプに応じた画面遷移など
      switch (type) {
        case 'expiration_warning':
        case 'expired_item':
          // 商品詳細画面に遷移する処理をここに追加
          DebugUtils.log('Navigate to product detail:', productId);
          break;
        case 'daily_reminder':
          // ホーム画面に遷移する処理をここに追加
          DebugUtils.log('Navigate to home screen');
          break;
      }
    } catch (error) {
      DebugUtils.error('Failed to handle notification tap:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 即座通知を送信（テスト用）
   */
  public async sendTestNotification(): Promise<void> {
    try {
      PushNotification.localNotification({
        channelId: 'expiration_warnings',
        title: 'テスト通知',
        message: 'Ordo通知システムが正常に動作しています',
        playSound: this.defaultConfig.soundEnabled,
        vibrate: this.defaultConfig.vibrationEnabled,
      });
      DebugUtils.log('Test notification sent');
    } catch (error) {
      DebugUtils.error('Failed to send test notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const notificationService = NotificationService.getInstance();
