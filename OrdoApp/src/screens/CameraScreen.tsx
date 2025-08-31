import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CameraScreenNavigationProp } from '../navigation/types';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';

interface Props {
  navigation: CameraScreenNavigationProp;
}

/**
 * Camera Screen - 商品撮影画面
 * AI画像認識で商品を自動的に識別・登録
 */
const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const handleOpenCamera = () => {
    Alert.alert(
      'カメラ機能',
      '商品を撮影してAI認識を開始しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '撮影開始', onPress: () => {
          // TODO: 実際のカメラ機能を実装
          Alert.alert('開発中', 'カメラ機能は開発中です');
        }}
      ]
    );
  };

  const handleManualAdd = () => {
    Alert.alert('開発中', '手動追加機能は開発中です');
  };

  const handleBarcodeScanner = () => {
    Alert.alert('開発中', 'バーコードスキャナー機能は開発中です');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>商品を追加</Text>
        <Text style={styles.subtitle}>
          カメラで撮影すると、AIが自動的に商品を認識します
        </Text>
      </View>

      {/* メインアクションボタン */}
      <TouchableOpacity style={styles.primaryButton} onPress={handleOpenCamera}>
        <Text style={styles.primaryButtonText}>📷 カメラで撮影</Text>
      </TouchableOpacity>

      {/* サブアクションボタン */}
      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBarcodeScanner}>
          <Text style={styles.secondaryButtonText}>📊 バーコードスキャン</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleManualAdd}>
          <Text style={styles.secondaryButtonText}>✍️ 手動で追加</Text>
        </TouchableOpacity>
      </View>

      {/* 使用方法 */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>使用方法</Text>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>商品をカメラで撮影</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>AI が商品を自動認識</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>商品情報を確認・調整</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>4</Text>
          <Text style={styles.instructionText}>保存してホームに追加</Text>
        </View>
      </View>

      {/* サポート情報 */}
      <View style={styles.supportContainer}>
        <Text style={styles.supportTitle}>対応商品</Text>
        <Text style={styles.supportText}>
          野菜、果物、肉類、魚類、調味料、冷凍食品など
        </Text>
        <Text style={styles.supportText}>
          バーコード付き商品も自動認識可能
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
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE_HERO,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.LG,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SPACING.LG,
    elevation: 2,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.WHITE,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.XL,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    padding: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
    borderWidth: 1,
    borderColor: COLORS.GRAY_200,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  instructionsContainer: {
    backgroundColor: COLORS.WHITE,
    padding: SPACING.LG,
    borderRadius: 12,
    marginBottom: SPACING.LG,
  },
  instructionsTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_LARGE,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.PRIMARY,
    color: COLORS.WHITE,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    lineHeight: 24,
    marginRight: SPACING.SM,
  },
  instructionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  supportContainer: {
    backgroundColor: COLORS.GRAY_50,
    padding: SPACING.LG,
    borderRadius: 12,
  },
  supportTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE_MEDIUM,
    fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  supportText: {
    fontSize: TYPOGRAPHY.FONT_SIZE_SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    lineHeight: 20,
  },
});

export default CameraScreen;
