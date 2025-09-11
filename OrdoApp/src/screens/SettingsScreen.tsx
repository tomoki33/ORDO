import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  Text,
  Switch,
  List,
  Card,
  useTheme,
  Divider,
  Button,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsScreenNavigationProp } from '../navigation/types';
import { SPACING, APP_CONFIG } from '../constants';

// Context
import { useTheme as useAppTheme } from '../context/AppContext';

// Services and Repositories
import { CategoryRepository, Category, CategoryWithCount } from '../database/CategoryRepository';
import { DataExportImportService, ExportOptions } from '../services/DataExportImportService';
import { LoggingService } from '../services/LoggingService';

interface Props {
  navigation: SettingsScreenNavigationProp;
}

/**
 * Settings Screen - 設定画面
 * アプリの各種設定とユーザー設定を管理（React Native Paper + Context API対応）
 */
const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [aiRecognition, setAiRecognition] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Category management state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  
  // Export/Import state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeProducts: true,
    includeCategories: true,
    includeLocations: true,
    includeSettings: true,
    format: 'json',
  });

  // Services
  const categoryRepository = new CategoryRepository();
  const exportImportService = new DataExportImportService();
  const loggingService = new LoggingService();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await categoryRepository.getCategoriesWithProductCount();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleExportData = async () => {
    setExportModalVisible(true);
  };

  const executeExport = async () => {
    try {
      setLoading(true);
      const result = await exportImportService.exportData(exportOptions);
      
      if (result.success && result.filePath) {
        Alert.alert(
          'エクスポート完了',
          'データのエクスポートが完了しました。ファイルを共有しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '共有',
              onPress: () => exportImportService.shareExportedData(result.filePath!),
            },
          ]
        );
      } else {
        Alert.alert('エラー', result.error || 'エクスポートに失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', 'エクスポート中にエラーが発生しました');
    } finally {
      setLoading(false);
      setExportModalVisible(false);
    }
  };

  const handleImportData = async () => {
    try {
      const fileResult = await exportImportService.selectImportFile();
      
      if (fileResult.success && fileResult.filePath) {
        Alert.alert(
          'データインポート',
          'インポートを実行すると既存のデータが変更される可能性があります。続行しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '続行',
              onPress: async () => {
                setLoading(true);
                const importResult = await exportImportService.importData(fileResult.filePath!);
                setLoading(false);
                
                if (importResult.success) {
                  Alert.alert('インポート完了', importResult.message);
                  await loadCategories(); // Refresh data
                } else {
                  Alert.alert('インポートエラー', importResult.message);
                }
              },
            },
          ]
        );
      } else {
        if (fileResult.error && !fileResult.error.includes('キャンセル')) {
          Alert.alert('エラー', fileResult.error);
        }
      }
    } catch (error) {
      Alert.alert('エラー', 'インポート中にエラーが発生しました');
    }
  };

  const toggleCategoryActive = async (categoryId: string, isActive: boolean) => {
    try {
      await categoryRepository.update(categoryId, { isActive });
      await loadCategories();
      await loggingService.log('info', 'CATEGORY', 'Category status updated', { categoryId, isActive });
    } catch (error) {
      Alert.alert('エラー', 'カテゴリの状態を変更できませんでした');
      await loggingService.log('error', 'CATEGORY', 'Failed to update category status', { error, categoryId });
    }
  };
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 通知設定 */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            通知設定
          </Text>
          
          <List.Item
            title="プッシュ通知"
            description="期限間近の商品をお知らせ"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={setNotifications}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* AI設定 */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            AI機能
          </Text>
          
          <List.Item
            title="自動商品認識"
            description="カメラでの自動認識を有効化"
            left={(props) => <List.Icon {...props} icon="camera-iris" />}
            right={() => (
              <Switch
                value={aiRecognition}
                onValueChange={setAiRecognition}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* データ管理 */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            データ管理
          </Text>
          
          <List.Item
            title="自動バックアップ"
            description="定期的にデータを保存"
            left={(props) => <List.Icon {...props} icon="backup-restore" />}
            right={() => (
              <Switch
                value={autoBackup}
                onValueChange={setAutoBackup}
              />
            )}
          />

          <Divider style={{ marginVertical: SPACING.SM }} />

          <List.Item
            title="データをエクスポート"
            description="商品データを外部に保存"
            left={(props) => <List.Icon {...props} icon="export" />}
            onPress={handleExportData}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />

          <List.Item
            title="データをインポート"
            description="バックアップファイルから復元"
            left={(props) => <List.Icon {...props} icon="import" />}
            onPress={handleImportData}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Card.Content>
      </Card>

      {/* 表示設定 */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            表示設定
          </Text>
          
          <List.Item
            title="ダークモード"
            description="暗いテーマを使用"
            left={(props) => <List.Icon {...props} icon={isDarkMode ? "weather-night" : "weather-sunny"} />}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* アプリ情報 */}
      <Card style={styles.section}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            アプリ情報
          </Text>
          
          <List.Item
            title="アプリについて"
            description="バージョン情報・利用規約"
            left={(props) => <List.Icon {...props} icon="information" />}
            onPress={handleAbout}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />

          <List.Item
            title="サポート"
            description="ヘルプ・お問い合わせ"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />

          <List.Item
            title="レビューを書く"
            description="App Storeで評価"
            left={(props) => <List.Icon {...props} icon="star" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Card.Content>
      </Card>

      {/* 危険な操作 */}
      <Card style={[styles.section, { borderColor: theme.colors.error, borderWidth: 1 }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.error }]}>
            危険な操作
          </Text>
          
          <List.Item
            title="すべてのデータを削除"
            description="この操作は取り消せません"
            left={(props) => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
            onPress={handleResetData}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.error} />}
          />
        </Card.Content>
      </Card>

      {/* バージョン情報 */}
      <View style={styles.versionInfo}>
        <Text variant="bodyLarge" style={[styles.versionText, { color: theme.colors.onSurface }]}>
          {APP_CONFIG.NAME} v{APP_CONFIG.VERSION}
        </Text>
        <Text variant="bodyMedium" style={[styles.versionDescription, { color: theme.colors.onSurfaceVariant }]}>
          {APP_CONFIG.DESCRIPTION}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: SPACING.MD,
  },
  sectionTitle: {
    marginBottom: SPACING.MD,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    marginHorizontal: SPACING.MD,
  },
  versionText: {
    marginBottom: SPACING.XS,
  },
  versionDescription: {
    textAlign: 'center',
  },
});

export default SettingsScreen;
