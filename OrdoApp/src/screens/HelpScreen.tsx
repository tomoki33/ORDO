import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  useTheme,
  Divider,
  Button,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, APP_CONFIG } from '../constants';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
}

const HelpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const theme = useTheme();

  const helpItems: HelpItem[] = [
    {
      id: 'getting_started',
      title: '始め方',
      description: 'Ordoアプリの基本的な使い方',
      icon: 'play-circle',
      content: `
Ordoアプリへようこそ！

【基本的な使い方】
1. 商品を追加する
   - ホーム画面の「+」ボタンをタップ
   - カメラで商品を撮影するか、手動で入力
   - 期限日、保存場所、カテゴリを設定

2. 商品を管理する
   - ホーム画面で商品一覧を確認
   - 期限が近い商品は色で表示
   - タップして詳細情報を確認・編集

3. 通知を受け取る
   - 設定で通知を有効にする
   - 期限間近や在庫不足をお知らせ
      `,
    },
    {
      id: 'ai_recognition',
      title: 'AI商品認識',
      description: 'カメラでの自動商品認識機能',
      icon: 'camera-iris',
      content: `
【AI商品認識機能】

Ordoは先進のAI技術により、カメラで撮影した商品を自動で認識します。

【使い方】
1. 商品追加画面でカメラボタンをタップ
2. 商品にカメラを向けて撮影
3. AIが商品名、カテゴリ、推定期限を自動入力
4. 必要に応じて情報を修正して保存

【認識精度を上げるコツ】
- 商品のラベルやパッケージがはっきり見えるように撮影
- 明るい場所で撮影する
- 商品全体がフレームに収まるように撮影

【対応商品】
- 食品（野菜、果物、肉、魚、乳製品など）
- 調味料・調味品
- 冷凍食品
- インスタント食品
      `,
    },
    {
      id: 'categories',
      title: 'カテゴリ管理',
      description: '商品カテゴリの作成と管理',
      icon: 'folder',
      content: `
【カテゴリ管理機能】

商品を効率的に分類・管理するためのカテゴリ機能です。

【基本操作】
1. 設定 > カテゴリ管理でカテゴリ一覧を表示
2. 「追加」でカテゴリを新規作成
3. 既存カテゴリはタップして編集
4. スイッチでカテゴリの有効/無効を切り替え

【カテゴリの特徴】
- 階層構造（親カテゴリ > 子カテゴリ）
- カテゴリ別に色分け表示
- 各カテゴリの商品数を表示
- デフォルト期限日の設定可能

【おすすめカテゴリ】
- 野菜・果物
- 肉・魚
- 乳製品
- 調味料
- 冷凍食品
- パン・穀物
      `,
    },
    {
      id: 'locations',
      title: '保存場所管理',
      description: '商品の保存場所設定と管理',
      icon: 'map-marker',
      content: `
【保存場所管理】

商品の保存場所を効率的に管理する機能です。

【保存場所の種類】
- 冷蔵庫（上段、中段、下段、ドアポケット）
- 冷凍庫（上段、下段、引き出し）
- 常温（キッチン、パントリー、食器棚）
- その他（カウンター、冷暗所など）

【温度・湿度管理】
- 各保存場所に温度設定可能
- 湿度レベルの記録
- 適切な保存環境の提案

【階層管理】
- 大分類 > 小分類の階層構造
- 例：冷蔵庫 > 野菜室 > 左側
- 詳細な場所指定で管理しやすく
      `,
    },
    {
      id: 'notifications',
      title: '通知設定',
      description: '期限切れ警告や在庫通知の設定',
      icon: 'bell',
      content: `
【通知機能】

商品の期限切れや在庫管理をサポートする通知機能です。

【通知の種類】
1. 期限切れ警告
   - 期限3日前、1日前、当日に通知
   - 通知タイミングは設定で変更可能

2. 在庫不足アラート
   - 設定した最低在庫数を下回った時
   - 商品別に在庫しきい値を設定

3. 日次リマインダー
   - 毎日決まった時間に在庫状況をお知らせ
   - 期限間近の商品をまとめて表示

【通知設定】
- 設定 > 通知設定で詳細調整
- 音・バイブレーションの設定
- 通知時間帯の指定
      `,
    },
    {
      id: 'data_management',
      title: 'データ管理',
      description: 'バックアップ、エクスポート、インポート',
      icon: 'database',
      content: `
【データ管理機能】

大切な商品データを安全に管理する機能です。

【自動バックアップ】
- 設定で自動バックアップを有効化
- 定期的にデータを自動保存
- 端末の故障や機種変更時も安心

【データエクスポート】
- 商品データをファイルに書き出し
- JSON、CSVファイル形式に対応
- メール、クラウドストレージで共有可能

【データインポート】
- エクスポートしたファイルからデータ復元
- 他の端末からのデータ移行
- 既存データとの統合・更新

【エクスポート内容】
- 商品データ（名前、期限、場所など）
- カテゴリ設定
- 保存場所設定
- アプリ設定
      `,
    },
  ];

  const handleContactSupport = () => {
    const email = 'support@ordo-app.com';
    const subject = 'Ordoアプリについてのお問い合わせ';
    const body = `
Ordoアプリバージョン: ${APP_CONFIG.VERSION}
端末情報: 
お問い合わせ内容:

`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'メールアプリが見つかりません',
        `以下のメールアドレスまでお問い合わせください：\n${email}`
      );
    });
  };

  const handleWebsite = () => {
    const url = 'https://ordo-app.com';
    Linking.openURL(url).catch(() => {
      Alert.alert('エラー', 'ウェブサイトを開けませんでした');
    });
  };

  const handleRateApp = () => {
    // App Store / Google Play Store のリンク
    const url = 'https://apps.apple.com/app/ordo';
    Linking.openURL(url).catch(() => {
      Alert.alert('エラー', 'App Storeを開けませんでした');
    });
  };

  const renderHelpItem = (item: HelpItem) => (
    <Card key={item.id} style={styles.helpCard}>
      <Card.Content>
        <View style={styles.helpHeader}>
          <Icon name={item.icon} size={24} color={theme.colors.primary} />
          <View style={styles.helpTitleContainer}>
            <Text variant="titleMedium" style={styles.helpTitle}>
              {item.title}
            </Text>
            <Text variant="bodyMedium" style={[styles.helpDescription, { color: theme.colors.onSurfaceVariant }]}>
              {item.description}
            </Text>
          </View>
        </View>
        <Text variant="bodyMedium" style={[styles.helpContent, { color: theme.colors.onSurface }]}>
          {item.content}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* アプリ情報セクション */}
        <Card style={styles.section}>
          <Card.Content>
            <View style={styles.appHeader}>
              <Icon name="food-apple" size={48} color={theme.colors.primary} />
              <View style={styles.appInfo}>
                <Text variant="headlineMedium" style={styles.appName}>
                  {APP_CONFIG.NAME}
                </Text>
                <Text variant="bodyLarge" style={[styles.appVersion, { color: theme.colors.onSurfaceVariant }]}>
                  バージョン {APP_CONFIG.VERSION}
                </Text>
                <Text variant="bodyMedium" style={[styles.appDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {APP_CONFIG.DESCRIPTION}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* ヘルプセクション */}
        <View style={styles.helpSection}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            ヘルプ・使い方
          </Text>
          {helpItems.map(renderHelpItem)}
        </View>

        {/* サポートセクション */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              サポート・お問い合わせ
            </Text>
            
            <List.Item
              title="サポートに連絡"
              description="ご質問・ご要望はこちら"
              left={(props) => <List.Icon {...props} icon="email" />}
              onPress={handleContactSupport}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />

            <List.Item
              title="公式ウェブサイト"
              description="最新情報・FAQ"
              left={(props) => <List.Icon {...props} icon="web" />}
              onPress={handleWebsite}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />

            <List.Item
              title="アプリを評価"
              description="App Storeでレビューを書く"
              left={(props) => <List.Icon {...props} icon="star" />}
              onPress={handleRateApp}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* 法的情報 */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              法的情報
            </Text>
            
            <List.Item
              title="プライバシーポリシー"
              description="個人情報の取り扱いについて"
              left={(props) => <List.Icon {...props} icon="shield-check" />}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />

            <List.Item
              title="利用規約"
              description="アプリご利用時の規約"
              left={(props) => <List.Icon {...props} icon="file-document" />}
              onPress={() => navigation.navigate('Terms')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />

            <List.Item
              title="ライセンス情報"
              description="オープンソースライセンス"
              left={(props) => <List.Icon {...props} icon="code-tags" />}
              onPress={() => navigation.navigate('Licenses')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        {/* 開発者情報 */}
        <View style={styles.developerInfo}>
          <Text variant="bodyMedium" style={[styles.developerText, { color: theme.colors.onSurfaceVariant }]}>
            Developed with ❤️ by Ordo Team
          </Text>
          <Text variant="bodySmall" style={[styles.copyright, { color: theme.colors.onSurfaceVariant }]}>
            © 2024 Ordo. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    marginBottom: SPACING.MD,
    fontWeight: '600',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  appInfo: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  appName: {
    fontWeight: 'bold',
  },
  appVersion: {
    marginTop: SPACING.XS,
  },
  appDescription: {
    marginTop: SPACING.SM,
    lineHeight: 20,
  },
  helpSection: {
    marginBottom: SPACING.LG,
  },
  helpCard: {
    marginBottom: SPACING.MD,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  helpTitleContainer: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  helpTitle: {
    fontWeight: '600',
  },
  helpDescription: {
    marginTop: SPACING.XS,
    lineHeight: 18,
  },
  helpContent: {
    lineHeight: 22,
    marginTop: SPACING.SM,
  },
  developerInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    marginTop: SPACING.LG,
  },
  developerText: {
    marginBottom: SPACING.XS,
  },
  copyright: {
    fontSize: 12,
  },
});

export default HelpScreen;
