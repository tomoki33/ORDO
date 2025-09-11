/**
 * 通知設定画面 (4時間実装)
 * Notification Settings Screen
 * 
 * ユーザーが通知設定をカスタマイズできるUI
 * - 通知ON/OFF設定
 * - 通知タイミング設定
 * - 音・バイブレーション設定
 * - Do Not Disturb設定
 * - カスタムメッセージ設定
 * - 通知プレビュー機能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  localNotificationService,
  NotificationSettings,
} from '../services/LocalNotificationService';
import { 
  ExpirationAlertType, 
  AlertSeverity 
} from '../services/ExpirationCalculationService';
import { ProductLocation } from '../types';

// =============================================================================
// INTERFACES
// =============================================================================

interface NotificationSettingsScreenProps {
  navigation: any;
}

interface TimePickerState {
  visible: boolean;
  type: 'morning' | 'evening' | 'quietStart' | 'quietEnd';
  time: Date;
}

interface SoundPickerState {
  visible: boolean;
  alertType: ExpirationAlertType;
  selectedSound: string;
}

// =============================================================================
// NOTIFICATION SETTINGS SCREEN COMPONENT
// =============================================================================

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  navigation,
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timePicker, setTimePicker] = useState<TimePickerState>({
    visible: false,
    type: 'morning',
    time: new Date(),
  });
  const [soundPicker, setSoundPicker] = useState<SoundPickerState>({
    visible: false,
    alertType: ExpirationAlertType.EXPIRING_SOON,
    selectedSound: 'default',
  });

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadSettings();
  }, []);

  // ---------------------------------------------------------------------------
  // METHODS
  // ---------------------------------------------------------------------------

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = localNotificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      setSaving(true);
      await localNotificationService.updateSettings(newSettings);
      setSettings(newSettings);
      Alert.alert('保存完了', '通知設定を保存しました');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    if (!settings) return;
    
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  const updateTimingSettings = useCallback((updates: Partial<NotificationSettings['timingSettings']>) => {
    if (!settings) return;
    
    updateSettings({
      timingSettings: { ...settings.timingSettings, ...updates },
    });
  }, [settings, updateSettings]);

  const updateSoundSettings = useCallback((updates: Partial<NotificationSettings['soundSettings']>) => {
    if (!settings) return;
    
    updateSettings({
      soundSettings: { ...settings.soundSettings, ...updates },
    });
  }, [settings, updateSettings]);

  const updateVisualSettings = useCallback((updates: Partial<NotificationSettings['visualSettings']>) => {
    if (!settings) return;
    
    updateSettings({
      visualSettings: { ...settings.visualSettings, ...updates },
    });
  }, [settings, updateSettings]);

  const updateBatchingSettings = useCallback((updates: Partial<NotificationSettings['batchingSettings']>) => {
    if (!settings) return;
    
    updateSettings({
      batchingSettings: { ...settings.batchingSettings, ...updates },
    });
  }, [settings, updateSettings]);

  const updateDoNotDisturbSettings = useCallback((updates: Partial<NotificationSettings['doNotDisturbSettings']>) => {
    if (!settings) return;
    
    updateSettings({
      doNotDisturbSettings: { ...settings.doNotDisturbSettings, ...updates },
    });
  }, [settings, updateSettings]);

  const toggleNotificationType = useCallback((alertType: ExpirationAlertType) => {
    if (!settings) return;
    
    updateSettings({
      enabledTypes: {
        ...settings.enabledTypes,
        [alertType]: !settings.enabledTypes[alertType],
      },
    });
  }, [settings, updateSettings]);

  // ---------------------------------------------------------------------------
  // TIME PICKER HANDLERS
  // ---------------------------------------------------------------------------

  const showTimePicker = (type: TimePickerState['type'], currentTime: string) => {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    
    setTimePicker({
      visible: true,
      type,
      time,
    });
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setTimePicker(prev => ({ ...prev, visible: false }));
    }

    if (selectedTime && settings) {
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
      
      switch (timePicker.type) {
        case 'morning':
          updateTimingSettings({ morningTime: timeString });
          break;
        case 'evening':
          updateTimingSettings({ eveningTime: timeString });
          break;
        case 'quietStart':
          updateTimingSettings({ 
            quietHours: { ...settings.timingSettings.quietHours, start: timeString } 
          });
          break;
        case 'quietEnd':
          updateTimingSettings({ 
            quietHours: { ...settings.timingSettings.quietHours, end: timeString } 
          });
          break;
      }
    }

    if (Platform.OS === 'ios') {
      setTimePicker(prev => ({ ...prev, visible: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // TEST NOTIFICATION
  // ---------------------------------------------------------------------------

  const sendTestNotification = async () => {
    try {
      const testAlert = {
        id: 'test_notification',
        productId: 'test_product',
        product: {
          id: 'test_product',
          name: 'テスト商品',
          category: 'dairy' as const,
          location: 'refrigerator' as ProductLocation,
          expirationDate: new Date(),
          addedDate: new Date(),
        },
        alertType: ExpirationAlertType.EXPIRING_SOON,
        severity: AlertSeverity.MEDIUM,
        daysUntilExpiration: 2,
        calculatedDate: new Date(),
        suggestedActions: [],
        priority: 50,
        isAcknowledged: false,
        createdAt: new Date(),
      };

      await localNotificationService.scheduleNotification(testAlert);
      Alert.alert('テスト通知送信', '通知をスケジュールしました');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('エラー', 'テスト通知の送信に失敗しました');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER METHODS
  // ---------------------------------------------------------------------------

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>通知設定</Text>
      <TouchableOpacity 
        style={styles.testButton}
        onPress={sendTestNotification}
      >
        <Icon name="notifications" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderMainToggle = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="notifications" size={24} color="#007AFF" />
        <Text style={styles.sectionTitle}>通知を有効にする</Text>
        <Switch
          value={settings?.enabled || false}
          onValueChange={(value) => updateSettings({ enabled: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.enabled ? '#007AFF' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderNotificationTypes = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>通知タイプ</Text>
      {Object.values(ExpirationAlertType).map((alertType) => (
        <View key={alertType} style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{getAlertTypeLabel(alertType)}</Text>
            <Text style={styles.settingDescription}>{getAlertTypeDescription(alertType)}</Text>
          </View>
          <Switch
            value={settings?.enabledTypes[alertType] || false}
            onValueChange={() => toggleNotificationType(alertType)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings?.enabledTypes[alertType] ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      ))}
    </View>
  );

  const renderTimingSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>通知タイミング</Text>
      
      {/* Morning notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>朝の通知</Text>
          <Text style={styles.settingDescription}>朝の定期通知を有効にする</Text>
        </View>
        <Switch
          value={settings?.timingSettings.enableMorningNotifications || false}
          onValueChange={(value) => updateTimingSettings({ enableMorningNotifications: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.timingSettings.enableMorningNotifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {settings?.timingSettings.enableMorningNotifications && (
        <TouchableOpacity 
          style={styles.timeRow}
          onPress={() => showTimePicker('morning', settings.timingSettings.morningTime)}
        >
          <Text style={styles.timeLabel}>朝の通知時刻</Text>
          <Text style={styles.timeValue}>{settings.timingSettings.morningTime}</Text>
          <Icon name="access-time" size={20} color="#666" />
        </TouchableOpacity>
      )}

      {/* Evening notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>夕方の通知</Text>
          <Text style={styles.settingDescription}>夕方の定期通知を有効にする</Text>
        </View>
        <Switch
          value={settings?.timingSettings.enableEveningNotifications || false}
          onValueChange={(value) => updateTimingSettings({ enableEveningNotifications: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.timingSettings.enableEveningNotifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {settings?.timingSettings.enableEveningNotifications && (
        <TouchableOpacity 
          style={styles.timeRow}
          onPress={() => showTimePicker('evening', settings.timingSettings.eveningTime)}
        >
          <Text style={styles.timeLabel}>夕方の通知時刻</Text>
          <Text style={styles.timeValue}>{settings.timingSettings.eveningTime}</Text>
          <Icon name="access-time" size={20} color="#666" />
        </TouchableOpacity>
      )}

      {/* Realtime notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>リアルタイム通知</Text>
          <Text style={styles.settingDescription}>期限切れ検出時の即座の通知</Text>
        </View>
        <Switch
          value={settings?.timingSettings.enableRealtimeNotifications || false}
          onValueChange={(value) => updateTimingSettings({ enableRealtimeNotifications: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.timingSettings.enableRealtimeNotifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {/* Snooze minutes */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>スヌーズ時間</Text>
          <Text style={styles.settingDescription}>{settings?.timingSettings.snoozeMinutes || 30}分</Text>
        </View>
        <View style={styles.valueControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              const current = settings?.timingSettings.snoozeMinutes || 30;
              updateTimingSettings({ snoozeMinutes: Math.max(5, current - 5) });
            }}
          >
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.valueText}>{settings?.timingSettings.snoozeMinutes || 30}</Text>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              const current = settings?.timingSettings.snoozeMinutes || 30;
              updateTimingSettings({ snoozeMinutes: Math.min(120, current + 5) });
            }}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Max notifications per day */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>1日の最大通知数</Text>
          <Text style={styles.settingDescription}>{settings?.timingSettings.maxNotificationsPerDay || 10}件</Text>
        </View>
        <View style={styles.valueControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              const current = settings?.timingSettings.maxNotificationsPerDay || 10;
              updateTimingSettings({ maxNotificationsPerDay: Math.max(1, current - 1) });
            }}
          >
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.valueText}>{settings?.timingSettings.maxNotificationsPerDay || 10}</Text>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              const current = settings?.timingSettings.maxNotificationsPerDay || 10;
              updateTimingSettings({ maxNotificationsPerDay: Math.min(50, current + 1) });
            }}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSoundSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>サウンドとバイブレーション</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>サウンドを有効にする</Text>
          <Text style={styles.settingDescription}>通知音を再生する</Text>
        </View>
        <Switch
          value={settings?.soundSettings.enableSound || false}
          onValueChange={(value) => updateSoundSettings({ enableSound: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.soundSettings.enableSound ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>バイブレーションを有効にする</Text>
          <Text style={styles.settingDescription}>通知時にバイブレーション</Text>
        </View>
        <Switch
          value={settings?.soundSettings.enableVibration || false}
          onValueChange={(value) => updateSoundSettings({ enableVibration: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.soundSettings.enableVibration ? '#007AFF' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderVisualSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>表示設定</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>バッジを表示</Text>
          <Text style={styles.settingDescription}>アプリアイコンにバッジ表示</Text>
        </View>
        <Switch
          value={settings?.visualSettings.enableBadge || false}
          onValueChange={(value) => updateVisualSettings({ enableBadge: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.visualSettings.enableBadge ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>リッチ通知</Text>
          <Text style={styles.settingDescription}>詳細な通知内容を表示</Text>
        </View>
        <Switch
          value={settings?.visualSettings.enableRichNotifications || false}
          onValueChange={(value) => updateVisualSettings({ enableRichNotifications: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.visualSettings.enableRichNotifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>商品画像を表示</Text>
          <Text style={styles.settingDescription}>通知に商品画像を含める</Text>
        </View>
        <Switch
          value={settings?.visualSettings.showProductImage || false}
          onValueChange={(value) => updateVisualSettings({ showProductImage: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.visualSettings.showProductImage ? '#007AFF' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderBatchingSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>通知のまとめ設定</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>通知をまとめる</Text>
          <Text style={styles.settingDescription}>複数の通知を1つにまとめて表示</Text>
        </View>
        <Switch
          value={settings?.batchingSettings.enableBatching || false}
          onValueChange={(value) => updateBatchingSettings({ enableBatching: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.batchingSettings.enableBatching ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {settings?.batchingSettings.enableBatching && (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>まとめタイムアウト</Text>
              <Text style={styles.settingDescription}>{settings.batchingSettings.batchTimeoutMinutes}分</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={60}
              step={1}
              value={settings.batchingSettings.batchTimeoutMinutes}
              onValueChange={(value) => updateBatchingSettings({ batchTimeoutMinutes: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#000000"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>最大まとめ数</Text>
              <Text style={styles.settingDescription}>{settings.batchingSettings.maxBatchSize}件</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={20}
              step={1}
              value={settings.batchingSettings.maxBatchSize}
              onValueChange={(value) => updateBatchingSettings({ maxBatchSize: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#000000"
              thumbStyle={{ backgroundColor: '#007AFF' }}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderDoNotDisturbSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>サイレント時間</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>サイレント時間を有効にする</Text>
          <Text style={styles.settingDescription}>指定時間は通知を送信しない</Text>
        </View>
        <Switch
          value={settings?.doNotDisturbSettings.enableDoNotDisturb || false}
          onValueChange={(value) => updateDoNotDisturbSettings({ enableDoNotDisturb: value })}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={settings?.doNotDisturbSettings.enableDoNotDisturb ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      {settings?.doNotDisturbSettings.enableDoNotDisturb && (
        <>
          <TouchableOpacity 
            style={styles.timeRow}
            onPress={() => showTimePicker('quietStart', settings.timingSettings.quietHours.start)}
          >
            <Text style={styles.timeLabel}>開始時刻</Text>
            <Text style={styles.timeValue}>{settings.timingSettings.quietHours.start}</Text>
            <Icon name="access-time" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.timeRow}
            onPress={() => showTimePicker('quietEnd', settings.timingSettings.quietHours.end)}
          >
            <Text style={styles.timeLabel}>終了時刻</Text>
            <Text style={styles.timeValue}>{settings.timingSettings.quietHours.end}</Text>
            <Icon name="access-time" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>緊急時オーバーライド</Text>
              <Text style={styles.settingDescription}>緊急通知はサイレント時間も表示</Text>
            </View>
            <Switch
              value={settings?.doNotDisturbSettings.emergencyOverride || false}
              onValueChange={(value) => updateDoNotDisturbSettings({ emergencyOverride: value })}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings?.doNotDisturbSettings.emergencyOverride ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderTimePicker = () => {
    if (!timePicker.visible) return null;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={timePicker.visible}
        onRequestClose={() => setTimePicker(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={() => setTimePicker(prev => ({ ...prev, visible: false }))}>
                <Text style={styles.timePickerCancel}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>時刻を選択</Text>
              <TouchableOpacity onPress={() => setTimePicker(prev => ({ ...prev, visible: false }))}>
                <Text style={styles.timePickerDone}>完了</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timePickerContent}>
              <Text style={styles.timePickerNote}>時刻選択機能は開発中です</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ---------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------------------------

  const getAlertTypeLabel = (alertType: ExpirationAlertType): string => {
    switch (alertType) {
      case ExpirationAlertType.EXPIRED:
        return '期限切れ通知';
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return '緊急期限切れ通知';
      case ExpirationAlertType.EXPIRING_SOON:
        return '期限間近通知';
      case ExpirationAlertType.CONSUME_PRIORITY:
        return '消費優先通知';
      case ExpirationAlertType.WASTE_WARNING:
        return '廃棄警告通知';
      case ExpirationAlertType.BATCH_EXPIRING:
        return 'まとめ通知';
      default:
        return '通知';
    }
  };

  const getAlertTypeDescription = (alertType: ExpirationAlertType): string => {
    switch (alertType) {
      case ExpirationAlertType.EXPIRED:
        return '既に期限切れの商品について通知';
      case ExpirationAlertType.CRITICAL_EXPIRING:
        return '今日期限切れの商品について通知';
      case ExpirationAlertType.EXPIRING_SOON:
        return '数日以内に期限切れの商品について通知';
      case ExpirationAlertType.CONSUME_PRIORITY:
        return '優先的に消費すべき商品について通知';
      case ExpirationAlertType.WASTE_WARNING:
        return '廃棄防止のための通知';
      case ExpirationAlertType.BATCH_EXPIRING:
        return '複数商品をまとめた通知';
      default:
        return '';
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>設定の読み込みに失敗しました</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderMainToggle()}
        {settings.enabled && (
          <>
            {renderNotificationTypes()}
            {renderTimingSettings()}
            {renderSoundSettings()}
            {renderVisualSettings()}
            {renderBatchingSettings()}
            {renderDoNotDisturbSettings()}
          </>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
      {renderTimePicker()}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  testButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  timeLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  slider: {
    width: 120,
    height: 40,
  },
  valueControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 40,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  timePickerCancel: {
    fontSize: 16,
    color: '#666666',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timePickerDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  timePicker: {
    height: 200,
  },
  timePickerContent: {
    padding: 40,
    alignItems: 'center',
  },
  timePickerNote: {
    fontSize: 16,
    color: '#666666',
  },
  bottomPadding: {
    height: 32,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#ff4444',
  },
});

export default NotificationSettingsScreen;
