import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Button, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { CameraScreenNavigationProp } from '../navigation/types';
import { COLORS, SPACING } from '../constants';
import { cameraService, ImageResult } from '../services/CameraService';
import { useAppContext } from '../context/AppContext';
import { ProductUtils } from '../utils';

interface Props {
  navigation: CameraScreenNavigationProp;
}

/**
 * Camera Screen - 商品撮影画面
 * AI画像認識で商品を自動的に識別・登録
 */
const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const { storageService } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<ImageResult | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<any | null>(null);

  const handleOpenCamera = async () => {
    try {
      setIsProcessing(true);
      
      const imageResult = await cameraService.showImagePickerOptions({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (imageResult) {
        // 画像を最適化
        const optimizedImage = await cameraService.optimizeImage(imageResult.uri, 'medium');
        
        if (optimizedImage) {
          setCapturedImage(optimizedImage);
          // TODO: AI認識機能を実装（Phase 10で追加予定）
          handleImageRecognition(optimizedImage);
        }
      }
    } catch (error) {
      Alert.alert('エラー', '画像の処理中にエラーが発生しました');
      console.error('Camera error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageRecognition = async (image: ImageResult) => {
    try {
      setIsProcessing(true);
      
      // AI認識を実行
      const aiService = require('../services/AIRecognitionService').aiRecognitionService;
      const result = await aiService.recognizeFood(image.uri);
      
      if (result) {
        setRecognitionResult(result);
        
        Alert.alert(
          '商品を認識しました',
          `${result.name} (信頼度: ${Math.round(result.confidence * 100)}%)`,
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => setCapturedImage(null) },
            { 
              text: '商品を追加', 
              onPress: () => handleAddProduct(image)
            }
          ]
        );
      } else {
        Alert.alert(
          '認識できませんでした',
          '商品情報を手動で入力してください',
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => setCapturedImage(null) },
            { 
              text: '手動で追加', 
              onPress: () => handleAddProduct(image)
            }
          ]
        );
      }
    } catch (error) {
      console.error('AI recognition error:', error);
      Alert.alert(
        '認識エラー',
        '商品認識中にエラーが発生しました',
        [
          { text: 'キャンセル', style: 'cancel', onPress: () => setCapturedImage(null) },
          { 
            text: '手動で追加', 
            onPress: () => handleAddProduct(image)
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = async (image: ImageResult) => {
    try {
      setIsProcessing(true);

      // AI認識結果または デフォルトの商品データを作成
      const productName = recognitionResult?.name || '新しい商品';
      const category = recognitionResult?.category || 'packaged';
      const expirationDate = recognitionResult?.expirationDate;
      
      const newProduct = ProductUtils.createProduct({
        name: productName,
        imageUri: image.uri,
        category: category,
        confidence: recognitionResult?.confidence || 0.5,
        expirationDate: expirationDate,
      });

      // データベースに保存
      await storageService.addProduct(newProduct);

      Alert.alert(
        '追加完了',
        `${productName} が正常に追加されました`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setCapturedImage(null);
              setRecognitionResult(null);
              navigation.navigate('Home');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('エラー', '商品の追加に失敗しました');
      console.error('Add product error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualAdd = () => {
    // TODO: 手動追加画面への遷移を実装
    Alert.alert('開発中', '手動追加機能は開発中です');
  };

  const handleBarcodeScanner = () => {
    // TODO: バーコードスキャナー機能を実装
    Alert.alert('開発中', 'バーコードスキャナー機能は開発中です');
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setRecognitionResult(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ヘッダー */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>商品を追加</Title>
          <Paragraph>
            カメラで撮影すると、AIが自動的に商品を認識します
          </Paragraph>
        </Card.Content>
      </Card>

      {/* 撮影された画像の表示 */}
      {capturedImage && (
        <Card style={styles.imageCard}>
          <Card.Content>
            <Title>撮影した画像</Title>
            <Image source={{ uri: capturedImage.uri }} style={styles.capturedImage} />
            
            {/* AI認識結果の表示 */}
            {recognitionResult && (
              <View style={styles.recognitionResult}>
                <Title style={styles.resultTitle}>AI認識結果</Title>
                <Paragraph style={styles.resultItem}>
                  <strong>商品名:</strong> {recognitionResult.name}
                </Paragraph>
                <Paragraph style={styles.resultItem}>
                  <strong>カテゴリ:</strong> {recognitionResult.category}
                </Paragraph>
                <Paragraph style={styles.resultItem}>
                  <strong>信頼度:</strong> {Math.round(recognitionResult.confidence * 100)}%
                </Paragraph>
                {recognitionResult.expirationDate && (
                  <Paragraph style={styles.resultItem}>
                    <strong>推定期限:</strong> {recognitionResult.expirationDate.toLocaleDateString('ja-JP')}
                  </Paragraph>
                )}
                {recognitionResult.additionalInfo?.storageType && (
                  <Paragraph style={styles.resultItem}>
                    <strong>保存方法:</strong> {recognitionResult.additionalInfo.storageType}
                  </Paragraph>
                )}
              </View>
            )}
            
            <Paragraph>
              サイズ: {cameraService.getImageResolution(capturedImage)}
            </Paragraph>
            <Paragraph>
              ファイルサイズ: {cameraService.getImageFileSize(capturedImage)}
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button onPress={handleRetakePhoto}>撮り直し</Button>
            <Button 
              mode="contained" 
              onPress={() => handleAddProduct(capturedImage)}
              disabled={isProcessing}
            >
              商品を追加
            </Button>
          </Card.Actions>
        </Card>
      )}

      {/* 処理中インジケーター */}
      {isProcessing && (
        <Card style={styles.processingCard}>
          <Card.Content style={styles.processingContent}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Paragraph style={styles.processingText}>
              {capturedImage && !recognitionResult ? 'AI認識中...' : 
               capturedImage && recognitionResult ? '商品を追加中...' : 
               '画像を処理中...'}
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* メインアクションボタン */}
      {!capturedImage && (
        <Button 
          mode="contained" 
          onPress={handleOpenCamera}
          disabled={isProcessing}
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
          icon="camera"
        >
          カメラで撮影
        </Button>
      )}

      {/* サブアクションボタン */}
      {!capturedImage && (
        <View style={styles.secondaryActions}>
          <Button 
            mode="outlined" 
            onPress={handleBarcodeScanner}
            disabled={isProcessing}
            style={styles.secondaryButton}
            icon="barcode-scan"
          >
            バーコード
          </Button>

          <Button 
            mode="outlined" 
            onPress={handleManualAdd}
            disabled={isProcessing}
            style={styles.secondaryButton}
            icon="pencil"
          >
            手動追加
          </Button>
        </View>
      )}

      {/* 使用方法 */}
      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Title>使用方法</Title>
          <View style={styles.instructionItem}>
            <Paragraph style={styles.instructionNumber}>1</Paragraph>
            <Paragraph style={styles.instructionText}>商品をカメラで撮影</Paragraph>
          </View>
          <View style={styles.instructionItem}>
            <Paragraph style={styles.instructionNumber}>2</Paragraph>
            <Paragraph style={styles.instructionText}>AI が商品を自動認識</Paragraph>
          </View>
          <View style={styles.instructionItem}>
            <Paragraph style={styles.instructionNumber}>3</Paragraph>
            <Paragraph style={styles.instructionText}>商品情報を確認・調整</Paragraph>
          </View>
          <View style={styles.instructionItem}>
            <Paragraph style={styles.instructionNumber}>4</Paragraph>
            <Paragraph style={styles.instructionText}>保存してホームに追加</Paragraph>
          </View>
        </Card.Content>
      </Card>

      {/* サポート情報 */}
      <Card style={styles.supportCard}>
        <Card.Content>
          <Title>対応商品</Title>
          <Paragraph>
            野菜、果物、肉類、魚類、調味料、冷凍食品など
          </Paragraph>
          <Paragraph>
            バーコード付き商品も自動認識可能
          </Paragraph>
        </Card.Content>
      </Card>
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
  headerCard: {
    marginBottom: SPACING.LG,
  },
  imageCard: {
    marginBottom: SPACING.LG,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: SPACING.SM,
  },
  processingCard: {
    marginBottom: SPACING.LG,
  },
  processingContent: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  processingText: {
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  primaryButton: {
    marginBottom: SPACING.LG,
  },
  primaryButtonContent: {
    paddingVertical: SPACING.SM,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.XL,
    gap: SPACING.SM,
  },
  secondaryButton: {
    flex: 1,
  },
  instructionsCard: {
    marginBottom: SPACING.LG,
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
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 24,
    marginRight: SPACING.SM,
  },
  instructionText: {
    flex: 1,
  },
  supportCard: {
    marginBottom: SPACING.LG,
  },
  recognitionResult: {
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 8,
    marginVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  resultTitle: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    marginBottom: SPACING.SM,
  },
  resultItem: {
    marginBottom: SPACING.XS,
    fontSize: 14,
  },
});

export default CameraScreen;
