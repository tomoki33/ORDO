import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SettingsScreenNavigationProp } from '../navigation/types';
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../constants';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

/**
 * Settings Screen - 設定画面
 * アプリの各種設定とユーザー設定を管理
 */
const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [aiRecognition, setAiRecognition] = useState(true);

  const handleExportData = () => {
    Alert.alert(
      'データエクスポート',
      '商品データをエクスポートしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'エクスポート', onPress: () => {
          Alert.alert('開発中', 'データエクスポート機能は開発中です');
        }}
      ]
    );
  };

  const handleImportData = () => {
    Alert.alert(
      'データインポート',
      'データファイルから商品データを復元しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'インポート', onPress: () => {
          Alert.alert('開発中', 'データインポート機能は開発中です');
        }}
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'データリセット',
      'すべての商品データが削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('開発中', 'データリセット機能は開発中です');
          }
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      `${APP_CONFIG.NAME} について`,
      `バージョン: ${APP_CONFIG.VERSION}\n${APP_CONFIG.DESCRIPTION}\n\nAI搭載の食材管理アプリです。`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知設定</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>プッシュ通知</Text>
            <Text style={styles.settingDescription}>期限間近の商品をお知らせ</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: COLORS.GRAY_200, true: COLORS.PRIMARY }}
            thumbColor={notifications ? COLORS.WHITE : COLORS.GRAY_MEDIUM}
          />
        </View>
      </View>

      {/* AI設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI機能</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>自動商品認識</Text>
            <Text style={styles.settingDescription}>カメラでの自動認識を有効化</Text>
          </View>
          <Switch
            value={aiRecognition}
            onValueChange={setAiRecognition}
            trackColor={{ false: COLORS.GRAY_200, true: COLORS.PRIMARY }}
            thumbColor={aiRecognition ? COLORS.WHITE : COLORS.GRAY_MEDIUM}
          />
        </View>
      </View>

      {/* データ管理 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ管理</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>自動バックアップ</Text>
            <Text style={styles.settingDescription}>定期的にデータを保存</Text>
          </View>
          <Switch
            value={autoBackup}
            onValueChange={setAutoBackup}
            trackColor={{ false: COLORS.GRAY_200, true: COLORS.PRIMARY }}
            thumbColor={autoBackup ? COLORS.WHITE : COLORS.GRAY_MEDIUM}
          />
        </View>

        <TouchableOpacity style={styles.actionItem} onPress={handleExportData}>
          <Text style={styles.actionLabel}>📤 データをエクスポート</Text>
          <Text style={styles.actionDescription}>商品データを外部に保存</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleImportData}>
          <Text style={styles.actionLabel}>📥 データをインポート</Text>
          <Text style={styles.actionDescription}>バックアップファイルから復元</Text>
        </TouchableOpacity>
      </View>

      {/* 表示設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>表示設定</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>ダークモード</Text>
            <Text style={styles.settingDescription}>暗いテーマを使用</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: COLORS.GRAY_200, true: COLORS.PRIMARY }}
            thumbColor={darkMode ? COLORS.WHITE : COLORS.GRAY_MEDIUM}
            disabled={true} // 開発中は無効
          />
        </View>
      </View>

      {/* アプリ情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ情報</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleAbout}>
          <Text style={styles.actionLabel}>ℹ️ アプリについて</Text>
          <Text style={styles.actionDescription}>バージョン情報・利用規約</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>📞 サポート</Text>
          <Text style={styles.actionDescription}>ヘルプ・お問い合わせ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionLabel}>⭐ レビューを書く</Text>
          <Text style={styles.actionDescription}>App Storeで評価</Text>
        </TouchableOpacity>
      </View>

      {/* 危険な操作 */}
      <View style={styles.dangerSection}>
        <Text style={[styles.sectionTitle, { color: COLORS.ERROR }]}>危険な操作</Text>
        
        <TouchableOpacity 
          style={[styles.actionItem, styles.dangerItem]} 
          onPress={handleResetData}
        >
          <Text style={[styles.actionLabel, { color: COLORS.ERROR }]}>
            🗑️ すべてのデータを削除
          </Text>
          <Text style={styles.actionDescription}>
            この操作は取り消せません
          </Text>
        </TouchableOpacity>
      </View>

      {/* バージョン情報 */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>
          {APP_CONFIG.NAME} v{APP_CONFIG.VERSION}
        </Text>
        <Text style={styles.versionDescription}>
          {APP_CONFIG.DESCRIPTION}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    padding: SPACING.MD,
  },
  section: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    elevation: 1,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dangerSection: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    borderColor: COLORS.ERROR,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
    marginBottom: SPACING.SM,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  settingLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  actionItem: {
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
    marginBottom: SPACING.SM,
  },
  dangerItem: {
    borderBottomColor: COLORS.ERROR,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  versionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  versionDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default SettingsScreen;
