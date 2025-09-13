import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugUtils } from '../utils';
import { sqliteService } from './sqliteService';
import { Product } from '../types';
import { firebaseService } from './FirebaseServiceSwitcher';
import { userManagementService } from './UserManagementService';

export interface NotificationConfig {
  enabled: boolean;
  daysBeforeExpiration: number;
  dailyReminderTime: string; // HH:MM format
  weeklyReminderEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // 新しい設定項目
  familyNotificationsEnabled: boolean;
  sharedInventoryNotificationsEnabled: boolean;
  shoppingListNotificationsEnabled: boolean;
  activityNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

export interface ScheduledNotification {
  id: string;
  productId: string;
  type: 'expiration_warning' | 'expired_item' | 'daily_reminder' | 'weekly_summary' |
        'family_invitation' | 'member_joined' | 'member_left' | 'role_changed' |
        'inventory_shared' | 'inventory_updated' | 'shopping_item_added' |
        'shopping_item_completed' | 'activity_summary';
  title: string;
  message: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
  // 新しいフィールド
  familyId?: string;
  fromUserId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'inventory' | 'family' | 'shopping' | 'system';
  data?: Record<string, any>;
}

export interface FamilyNotificationData {
  familyId: string;
  fromUserId: string;
  fromUserName: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private userManagement: typeof userManagementService;
  private defaultConfig: NotificationConfig = {
    enabled: true,
    daysBeforeExpiration: 3,
    dailyReminderTime: '09:00',
    weeklyReminderEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    // 新しい設定項目のデフォルト値
    familyNotificationsEnabled: true,
    sharedInventoryNotificationsEnabled: true,
    shoppingListNotificationsEnabled: true,
    activityNotificationsEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };

  private constructor() {
    this.userManagement = userManagementService;
  }

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

  // ============= 新しいファミリー通知機能 =============

  /**
   * ファミリーメンバーに通知を送信
   */
  public async sendFamilyNotification(notificationData: FamilyNotificationData): Promise<void> {
    try {
      if (!this.defaultConfig.familyNotificationsEnabled) return;

      const familyGroup = this.userManagement.getCurrentFamilyGroup();
      if (!familyGroup) {
        throw new Error('Family group not found');
      }
      const familyMembers = familyGroup.members;
      
      // 送信者以外のメンバーに通知
      const recipients = familyMembers.filter((member: any) => member.userId !== notificationData.fromUserId);

      for (const member of recipients) {
        // ユーザーの通知設定を確認
        const memberConfig = await this.getUserNotificationConfig(member.userId);
        if (!memberConfig?.familyNotificationsEnabled) continue;

        // 静寂時間の確認
        if (this.isInQuietHours(memberConfig)) {
          // 緊急でない通知は後で送信
          if (notificationData.type !== 'security_alert') {
            await this.scheduleDelayedNotification(notificationData, member.userId);
            continue;
          }
        }

        const notificationId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 通知データを保存
        await firebaseService.collection('familyNotifications')
          .doc(notificationId)
          .set({
            ...notificationData,
            recipientUserId: member.userId,
            id: notificationId,
            isRead: false,
            createdAt: Date.now(),
          });

        // ローカル通知を送信
        await this.sendLocalNotification({
          id: notificationId,
          productId: '',
          type: notificationData.type as any,
          title: notificationData.title,
          message: notificationData.message,
          scheduledAt: new Date(),
          status: 'pending',
          familyId: notificationData.familyId,
          fromUserId: notificationData.fromUserId,
          category: 'family',
          priority: 'medium',
          data: notificationData.data,
        });
      }

      DebugUtils.log('Family notification sent to', recipients.length, 'members');
    } catch (error) {
      DebugUtils.error('Failed to send family notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 共有在庫の変更通知
   */
  public async sendSharedInventoryNotification(
    familyId: string,
    fromUserId: string,
    action: 'added' | 'updated' | 'removed' | 'low_stock' | 'expired',
    itemName: string,
    itemId?: string
  ): Promise<void> {
    try {
      if (!this.defaultConfig.sharedInventoryNotificationsEnabled) return;

      const fromUser = await this.userManagement.getCurrentUser();
      const userName = fromUser?.displayName || 'メンバー';

      let title: string;
      let message: string;
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

      switch (action) {
        case 'added':
          title = '在庫追加';
          message = `${userName}が${itemName}を在庫に追加しました`;
          priority = 'low';
          break;
        case 'updated':
          title = '在庫更新';
          message = `${userName}が${itemName}の情報を更新しました`;
          priority = 'low';
          break;
        case 'removed':
          title = '在庫削除';
          message = `${userName}が${itemName}を在庫から削除しました`;
          priority = 'medium';
          break;
        case 'low_stock':
          title = '在庫不足';
          message = `${itemName}の在庫が少なくなっています`;
          priority = 'high';
          break;
        case 'expired':
          title = '期限切れ';
          message = `${itemName}の期限が切れています`;
          priority = 'urgent';
          break;
      }

      await this.sendFamilyNotification({
        familyId,
        fromUserId,
        fromUserName: userName,
        type: `inventory_${action}`,
        title,
        message,
        data: { itemName, itemId, action },
        timestamp: Date.now(),
      });
    } catch (error) {
      DebugUtils.error('Failed to send shared inventory notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 買い物リストの通知
   */
  public async sendShoppingListNotification(
    familyId: string,
    fromUserId: string,
    action: 'item_added' | 'item_completed' | 'list_created' | 'list_shared',
    details: { listName?: string; itemName?: string; listId?: string }
  ): Promise<void> {
    try {
      if (!this.defaultConfig.shoppingListNotificationsEnabled) return;

      const fromUser = await this.userManagement.getCurrentUser();
      const userName = fromUser?.displayName || 'メンバー';

      let title: string;
      let message: string;

      switch (action) {
        case 'item_added':
          title = '買い物リスト追加';
          message = `${userName}が${details.itemName}を買い物リストに追加しました`;
          break;
        case 'item_completed':
          title = '買い物完了';
          message = `${userName}が${details.itemName}を購入しました`;
          break;
        case 'list_created':
          title = '買い物リスト作成';
          message = `${userName}が新しい買い物リスト「${details.listName}」を作成しました`;
          break;
        case 'list_shared':
          title = '買い物リスト共有';
          message = `${userName}が買い物リスト「${details.listName}」を共有しました`;
          break;
      }

      await this.sendFamilyNotification({
        familyId,
        fromUserId,
        fromUserName: userName,
        type: action,
        title,
        message,
        data: details,
        timestamp: Date.now(),
      });
    } catch (error) {
      DebugUtils.error('Failed to send shopping list notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * ファミリー管理の通知
   */
  public async sendFamilyManagementNotification(
    familyId: string,
    fromUserId: string,
    action: 'member_invited' | 'member_joined' | 'member_left' | 'role_changed',
    targetUserName: string,
    details?: { newRole?: string; oldRole?: string }
  ): Promise<void> {
    try {
      if (!this.defaultConfig.familyNotificationsEnabled) return;

      const fromUser = await this.userManagement.getCurrentUser();
      const userName = fromUser?.displayName || 'メンバー';

      let title: string;
      let message: string;
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

      switch (action) {
        case 'member_invited':
          title = 'メンバー招待';
          message = `${userName}が${targetUserName}をファミリーに招待しました`;
          break;
        case 'member_joined':
          title = '新メンバー参加';
          message = `${targetUserName}がファミリーに参加しました`;
          priority = 'high';
          break;
        case 'member_left':
          title = 'メンバー退出';
          message = `${targetUserName}がファミリーから退出しました`;
          priority = 'high';
          break;
        case 'role_changed':
          title = '役割変更';
          message = `${targetUserName}の役割が${details?.oldRole}から${details?.newRole}に変更されました`;
          break;
      }

      await this.sendFamilyNotification({
        familyId,
        fromUserId,
        fromUserName: userName,
        type: action,
        title,
        message,
        data: { targetUserName, ...details },
        timestamp: Date.now(),
      });
    } catch (error) {
      DebugUtils.error('Failed to send family management notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 活動サマリー通知
   */
  public async sendActivitySummaryNotification(familyId: string): Promise<void> {
    try {
      if (!this.defaultConfig.activityNotificationsEnabled) return;

      // 過去24時間の活動を取得
      const activities = await this.getFamilyActivities(familyId, 24);
      if (activities.length === 0) return;

      const summary = this.generateActivitySummary(activities);
      
      await this.sendFamilyNotification({
        familyId,
        fromUserId: 'system',
        fromUserName: 'システム',
        type: 'activity_summary',
        title: '活動サマリー',
        message: summary,
        data: { activityCount: activities.length },
        timestamp: Date.now(),
      });
    } catch (error) {
      DebugUtils.error('Failed to send activity summary notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ============= ヘルパーメソッド =============

  /**
   * ユーザーの通知設定を取得
   */
  private async getUserNotificationConfig(userId: string): Promise<NotificationConfig | null> {
    try {
      const configString = await AsyncStorage.getItem(`notification_config_${userId}`);
      if (configString) {
        return JSON.parse(configString);
      }
      return this.defaultConfig;
    } catch (error) {
      DebugUtils.error('Failed to get user notification config:', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * 静寂時間中かどうかを確認
   */
  private isInQuietHours(config: NotificationConfig): boolean {
    if (!config.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(config.quietHoursStart);
    const end = this.timeToMinutes(config.quietHoursEnd);

    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // 日をまたぐ場合
      return current >= start || current <= end;
    }
  }

  /**
   * 時間を分に変換
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 遅延通知をスケジュール
   */
  private async scheduleDelayedNotification(
    notificationData: FamilyNotificationData,
    userId: string
  ): Promise<void> {
    try {
      const config = await this.getUserNotificationConfig(userId);
      if (!config) return;

      // 静寂時間終了後に送信するようにスケジュール
      const endTime = config.quietHoursEnd;
      const [hours, minutes] = endTime.split(':').map(Number);
      
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // 翌日の場合
      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await this.scheduleLocalNotification({
        id: `delayed_${Date.now()}_${userId}`,
        productId: '',
        type: notificationData.type as any,
        title: notificationData.title,
        message: notificationData.message,
        scheduledAt: scheduledTime,
        status: 'pending',
        familyId: notificationData.familyId,
        fromUserId: notificationData.fromUserId,
        category: 'family',
        data: notificationData.data,
      });
    } catch (error) {
      DebugUtils.error('Failed to schedule delayed notification:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * ファミリーの活動を取得
   */
  private async getFamilyActivities(familyId: string, hours: number): Promise<any[]> {
    try {
      const since = Date.now() - (hours * 60 * 60 * 1000);
      const snapshot = await firebaseService.collection('familyActivities')
        .where('familyId', '==', familyId)
        .where('timestamp', '>=', since)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      DebugUtils.error('Failed to get family activities:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * 活動サマリーを生成
   */
  private generateActivitySummary(activities: any[]): string {
    const activityTypes = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summaryParts: string[] = [];
    
    if (activityTypes.inventory_added) {
      summaryParts.push(`在庫追加: ${activityTypes.inventory_added}件`);
    }
    if (activityTypes.shopping_completed) {
      summaryParts.push(`買い物完了: ${activityTypes.shopping_completed}件`);
    }
    if (activityTypes.member_activity) {
      summaryParts.push(`メンバー活動: ${activityTypes.member_activity}件`);
    }

    return summaryParts.length > 0 
      ? `過去24時間の活動: ${summaryParts.join(', ')}`
      : '過去24時間に新しい活動がありました';
  }

  /**
   * ローカル通知を送信（拡張版）
   */
  private async sendLocalNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const channelId = this.getChannelIdForType(notification.type);
      
      PushNotification.localNotification({
        id: notification.id,
        channelId,
        title: notification.title,
        message: notification.message,
        soundName: this.defaultConfig.soundEnabled ? 'default' : undefined,
        vibrate: this.defaultConfig.vibrationEnabled,
        playSound: this.defaultConfig.soundEnabled,
        userInfo: {
          type: notification.type,
          productId: notification.productId,
          familyId: notification.familyId,
          fromUserId: notification.fromUserId,
          category: notification.category,
          priority: notification.priority,
          data: notification.data,
        },
      });

      // 通知履歴をFirestoreに保存
      await firebaseService.collection('notificationHistory')
        .add({
          ...notification,
          sentAt: Date.now(),
          status: 'sent',
        });

      DebugUtils.log('Local notification sent:', notification.title);
    } catch (error) {
      DebugUtils.error('Failed to send local notification:', error instanceof Error ? error : new Error(String(error)));
    }
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
