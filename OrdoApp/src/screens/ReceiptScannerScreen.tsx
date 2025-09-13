/**
 * Receipt Scanner Screen
 * レシートOCR機能の統合画面
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  ProgressBar,
  Chip,
  FAB,
  Portal,
  Modal,
  List,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import ImagePicker, { ImagePickerResponse, MediaType } from 'react-native-image-picker';

// Services
import { OCRService, RecognizedText } from '../services/OCRService';
import { ReceiptAnalysisService, ParsedReceipt } from '../services/ReceiptAnalysisService';
import { ProductMappingService, MappedReceiptData } from '../services/ProductMappingService';

// Types
import type { StackParamList } from '../navigation/types';

const { width } = Dimensions.get('window');

type ReceiptScannerNavigationProp = StackNavigationProp<StackParamList>;

interface ProcessingStage {
  stage: 'idle' | 'capturing' | 'ocr' | 'analysis' | 'mapping' | 'complete' | 'error';
  progress: number;
  message: string;
}

export const ReceiptScannerScreen: React.FC = () => {
  const navigation = useNavigation<ReceiptScannerNavigationProp>();
  
  // State
  const [processingStage, setProcessingStage] = useState<ProcessingStage>({
    stage: 'idle',
    progress: 0,
    message: 'レシートの写真を撮影してください',
  });
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOCRResult] = useState<RecognizedText | null>(null);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [mappedData, setMappedData] = useState<MappedReceiptData | null>(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  /**
   * 画像キャプチャ
   */
  const handleCaptureImage = useCallback(() => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    Alert.alert(
      'レシート撮影',
      '撮影方法を選択してください',
      [
        {
          text: 'カメラで撮影',
          onPress: () => {
            ImagePicker.launchCamera(options, handleImageResponse);
          },
        },
        {
          text: 'ギャラリーから選択',
          onPress: () => {
            ImagePicker.launchImageLibrary(options, handleImageResponse);
          },
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ]
    );
  }, []);

  /**
   * 画像レスポンス処理
   */
  const handleImageResponse = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('エラー', '画像の取得に失敗しました');
      return;
    }

    setCapturedImage(asset.uri);
    processReceipt(asset.uri);
  }, []);

  /**
   * レシート処理メイン関数
   */
  const processReceipt = useCallback(async (imageUri: string) => {
    try {
      // Stage 1: OCR処理
      setProcessingStage({
        stage: 'ocr',
        progress: 0.2,
        message: '画像からテキストを読み取り中...',
      });

      const ocrResult = await OCRService.recognizeReceipt(imageUri);
      setOCRResult(ocrResult);

      // OCR品質チェック
      const quality = OCRService.evaluateTextQuality(ocrResult);
      if (quality.quality === 'low') {
        Alert.alert(
          '画質について',
          `OCRの精度が低い可能性があります。\n\n${quality.suggestions.join('\n')}`,
          [
            { text: '再撮影', onPress: () => resetProcessing() },
            { text: '続行', onPress: () => continueProcessing(ocrResult) },
          ]
        );
        return;
      }

      await continueProcessing(ocrResult);

    } catch (error) {
      console.error('Receipt processing failed:', error);
      setProcessingStage({
        stage: 'error',
        progress: 0,
        message: `処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      });
    }
  }, []);

  /**
   * 処理継続
   */
  const continueProcessing = useCallback(async (ocrResult: RecognizedText) => {
    try {
      // Stage 2: レシート解析
      setProcessingStage({
        stage: 'analysis',
        progress: 0.5,
        message: 'レシートを解析中...',
      });

      const parsedReceipt = await ReceiptAnalysisService.analyzeReceipt(ocrResult);
      setParsedReceipt(parsedReceipt);

      // Stage 3: 商品マッピング
      setProcessingStage({
        stage: 'mapping',
        progress: 0.8,
        message: '商品データをマッピング中...',
      });

      const mappedData = await ProductMappingService.mapReceiptToProducts(parsedReceipt);
      setMappedData(mappedData);

      // Stage 4: 完了
      setProcessingStage({
        stage: 'complete',
        progress: 1.0,
        message: `${mappedData.productMappings.length}個の商品を検出しました`,
      });

      // 結果の検証と警告
      const validation = ProductMappingService.validateMappingResults(mappedData);
      if (!validation.isReliable && validation.recommendations.length > 0) {
        Alert.alert(
          '結果について',
          validation.recommendations.join('\n'),
          [
            { text: '確認', onPress: () => {} },
          ]
        );
      }

    } catch (error) {
      console.error('Processing continuation failed:', error);
      setProcessingStage({
        stage: 'error',
        progress: 0,
        message: `処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      });
    }
  }, []);

  /**
   * 処理リセット
   */
  const resetProcessing = useCallback(() => {
    setCapturedImage(null);
    setOCRResult(null);
    setParsedReceipt(null);
    setMappedData(null);
    setProcessingStage({
      stage: 'idle',
      progress: 0,
      message: 'レシートの写真を撮影してください',
    });
  }, []);

  /**
   * 商品を在庫に追加
   */
  const handleAddToInventory = useCallback(() => {
    if (!mappedData) return;

    Alert.alert(
      '在庫に追加',
      `${mappedData.productMappings.length}個の商品を在庫に追加しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '追加',
          onPress: () => {
            // 実際の実装では、商品データを在庫システムに追加
            Alert.alert('完了', '商品を在庫に追加しました');
            navigation.goBack();
          },
        },
      ]
    );
  }, [mappedData, navigation]);

  /**
   * レンダリング：アイドル状態
   */
  const renderIdleState = () => (
    <View style={styles.centerContainer}>
      <Card style={styles.instructionCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            📄 レシートスキャナー
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            レシートの写真を撮影すると、自動的に商品情報を読み取り、在庫に追加できます。
          </Text>
          
          <View style={styles.tipsContainer}>
            <Text variant="labelLarge" style={styles.tipsTitle}>
              📷 撮影のコツ
            </Text>
            <Text style={styles.tipText}>• レシート全体が写るように撮影</Text>
            <Text style={styles.tipText}>• 明るい場所で撮影</Text>
            <Text style={styles.tipText}>• レシートを平らに置く</Text>
            <Text style={styles.tipText}>• 影が入らないように注意</Text>
          </View>
        </Card.Content>
      </Card>

      <FAB
        icon="camera"
        label="レシートを撮影"
        style={styles.fab}
        onPress={handleCaptureImage}
      />
    </View>
  );

  /**
   * レンダリング：処理中状態
   */
  const renderProcessingState = () => (
    <View style={styles.centerContainer}>
      {capturedImage && (
        <Card style={styles.imageCard}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
        </Card>
      )}

      <Card style={styles.progressCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.progressTitle}>
            {processingStage.message}
          </Text>
          <ProgressBar progress={processingStage.progress} style={styles.progressBar} />
          <ActivityIndicator size="large" style={styles.activityIndicator} />
        </Card.Content>
      </Card>

      <Button mode="outlined" onPress={resetProcessing} style={styles.cancelButton}>
        キャンセル
      </Button>
    </View>
  );

  /**
   * レンダリング：完了状態
   */
  const renderCompleteState = () => {
    if (!mappedData || !parsedReceipt) return null;

    return (
      <ScrollView style={styles.container}>
        {/* 画像プレビュー */}
        {capturedImage && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: capturedImage }} style={styles.imagePreview} />
                <IconButton
                  icon="fullscreen"
                  onPress={() => setShowImageModal(true)}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* レシート情報 */}
        <Card style={styles.resultCard}>
          <Card.Title title="📋 レシート情報" />
          <Card.Content>
            {parsedReceipt.storeName && (
              <Text style={styles.receiptInfo}>店舗: {parsedReceipt.storeName}</Text>
            )}
            {parsedReceipt.date && (
              <Text style={styles.receiptInfo}>
                日付: {parsedReceipt.date.toLocaleDateString('ja-JP')}
              </Text>
            )}
            {parsedReceipt.totalAmount && (
              <Text style={styles.receiptInfo}>合計: ¥{parsedReceipt.totalAmount.toLocaleString()}</Text>
            )}
            <Text style={styles.receiptInfo}>
              信頼度: {Math.round(parsedReceipt.confidence * 100)}%
            </Text>
          </Card.Content>
        </Card>

        {/* マッピング結果サマリー */}
        <Card style={styles.resultCard}>
          <Card.Title title="📊 解析結果" />
          <Card.Content>
            <View style={styles.summaryContainer}>
              <Chip icon="check" style={styles.summaryChip}>
                認識: {mappedData.summary.matchedItems}件
              </Chip>
              <Chip icon="help" style={styles.summaryChip}>
                推定: {mappedData.summary.suggestedItems}件
              </Chip>
              <Chip icon="alert" style={styles.summaryChip}>
                不明: {mappedData.summary.unknownItems}件
              </Chip>
            </View>
            <Text style={styles.confidenceText}>
              総合信頼度: {Math.round(mappedData.summary.overallConfidence * 100)}%
            </Text>
          </Card.Content>
        </Card>

        {/* 商品リスト */}
        <Card style={styles.resultCard}>
          <Card.Title 
            title={`🛍️ 検出商品 (${mappedData.productMappings.length}件)`}
            right={(props) => (
              <IconButton
                {...props}
                icon="format-list-bulleted"
                onPress={() => setShowDetailsModal(true)}
              />
            )}
          />
          <Card.Content>
            {mappedData.productMappings.slice(0, 3).map((mapping, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {mapping.suggestedProduct?.name || mapping.receiptItem.name}
                  </Text>
                  <Text style={styles.productDetails}>
                    {mapping.suggestedProduct?.category} • ¥{mapping.receiptItem.price.toLocaleString()}
                  </Text>
                </View>
                <Chip
                  mode="outlined"
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(mapping.mappingStatus) }
                  ]}
                >
                  {getStatusLabel(mapping.mappingStatus)}
                </Chip>
              </View>
            ))}
            
            {mappedData.productMappings.length > 3 && (
              <Button
                mode="text"
                onPress={() => setShowDetailsModal(true)}
                style={styles.showMoreButton}
              >
                他 {mappedData.productMappings.length - 3} 件を表示
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* アクションボタン */}
        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            icon="plus"
            onPress={handleAddToInventory}
            style={styles.addButton}
          >
            在庫に追加
          </Button>
          
          <Button
            mode="outlined"
            icon="camera"
            onPress={resetProcessing}
            style={styles.retakeButton}
          >
            再撮影
          </Button>
        </View>
      </ScrollView>
    );
  };

  /**
   * エラー状態のレンダリング
   */
  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <Card style={styles.errorCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.errorTitle}>
            ⚠️ エラーが発生しました
          </Text>
          <Text style={styles.errorMessage}>
            {processingStage.message}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.errorActions}>
        <Button mode="contained" onPress={resetProcessing} style={styles.retryButton}>
          最初からやり直し
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()}>
          戻る
        </Button>
      </View>
    </View>
  );

  // ヘルパー関数
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched': return '#e8f5e8';
      case 'suggested': return '#fff3e0';
      case 'unknown': return '#ffebee';
      default: return '#f5f5f5';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'matched': return '確認済み';
      case 'suggested': return '推定';
      case 'unknown': return '不明';
      default: return '';
    }
  };

  // メインレンダリング
  const renderMainContent = () => {
    switch (processingStage.stage) {
      case 'idle':
        return renderIdleState();
      case 'ocr':
      case 'analysis':
      case 'mapping':
        return renderProcessingState();
      case 'complete':
        return renderCompleteState();
      case 'error':
        return renderErrorState();
      default:
        return renderIdleState();
    }
  };

  return (
    <View style={styles.container}>
      {renderMainContent()}

      {/* 詳細モーダル */}
      <Portal>
        <Modal
          visible={showDetailsModal}
          onDismiss={() => setShowDetailsModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            検出商品一覧
          </Text>
          <ScrollView style={styles.modalContent}>
            {mappedData?.productMappings.map((mapping, index) => (
              <View key={index}>
                <List.Item
                  title={mapping.suggestedProduct?.name || mapping.receiptItem.name}
                  description={`${mapping.suggestedProduct?.category} • ¥${mapping.receiptItem.price.toLocaleString()}`}
                  right={() => (
                    <Chip mode="outlined" style={{ backgroundColor: getStatusColor(mapping.mappingStatus) }}>
                      {getStatusLabel(mapping.mappingStatus)}
                    </Chip>
                  )}
                />
                {index < (mappedData?.productMappings.length || 0) - 1 && <Divider />}
              </View>
            ))}
          </ScrollView>
          <Button mode="contained" onPress={() => setShowDetailsModal(false)}>
            閉じる
          </Button>
        </Modal>
      </Portal>

      {/* 画像拡大モーダル */}
      <Portal>
        <Modal
          visible={showImageModal}
          onDismiss={() => setShowImageModal(false)}
          contentContainerStyle={styles.imageModalContainer}
        >
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.fullscreenImage} />
          )}
          <IconButton
            icon="close"
            iconColor="#white"
            style={styles.closeImageButton}
            onPress={() => setShowImageModal(false)}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  instructionCard: {
    width: '100%',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  tipsTitle: {
    marginBottom: 8,
  },
  tipText: {
    marginBottom: 4,
    fontSize: 14,
  },
  fab: {
    backgroundColor: '#6200ea',
  },
  imageCard: {
    width: '100%',
    marginBottom: 16,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  progressCard: {
    width: '100%',
    marginBottom: 16,
  },
  progressTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    marginBottom: 16,
  },
  activityIndicator: {
    marginBottom: 16,
  },
  cancelButton: {
    width: '100%',
  },
  resultCard: {
    margin: 16,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  receiptInfo: {
    marginBottom: 4,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  summaryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
  },
  statusChip: {
    marginLeft: 8,
  },
  showMoreButton: {
    marginTop: 8,
  },
  actionContainer: {
    padding: 16,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#4caf50',
  },
  retakeButton: {
    borderColor: '#6200ea',
  },
  errorCard: {
    width: '100%',
    marginBottom: 24,
  },
  errorTitle: {
    textAlign: 'center',
    color: '#d32f2f',
    marginBottom: 16,
  },
  errorMessage: {
    textAlign: 'center',
    fontSize: 16,
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#ff9800',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalContent: {
    maxHeight: 400,
    marginBottom: 16,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width - 40,
    height: (width - 40) * 1.3,
    resizeMode: 'contain',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
});

export default ReceiptScannerScreen;
