/**
 * Barcode Scanner Screen
 * バーコードスキャン画面 - UI統合 (4時間実装)
 * 
 * Features:
 * - バーコードスキャンインターフェース
 * - リアルタイムスキャン結果表示
 * - 商品情報自動取得・表示
 * - 手動入力フォールバック
 * - スキャン履歴管理
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarcodeScannerService, BarcodeFormat, ScanResult } from '../services/BarcodeScannerService';
import { RakutenAPIService, ProductInfo } from '../services/RakutenAPIService';
import { ProductAutoFillService, AutoFillResult } from '../services/ProductAutoFillService';

const { width, height } = Dimensions.get('window');

interface BarcodeScannerScreenProps {
  navigation: any;
  route: any;
}

interface ScanHistory {
  id: string;
  barcode: string;
  timestamp: Date;
  result?: AutoFillResult;
}

export const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ({
  navigation,
  route,
}) => {
  // Services
  const [autoFillService] = useState(() => ProductAutoFillService.getInstance());
  
  // State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AutoFillResult | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start scan animation
    const startScanAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startScanAnimation();
    
    return () => {
      autoFillService.cleanup();
    };
  }, []);

  /**
   * Start barcode scanning
   */
  const startScanning = async () => {
    try {
      setIsScanning(true);
      setIsLoading(true);
      setError(null);

      const result = await autoFillService.scanAndFill({
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.6,
      });

      if (result.success && result.product) {
        setScanResult(result);
        addToHistory(result.product.barcode, result);
        setShowProductModal(true);
        
        // Success haptic feedback
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        setError(result.error || 'バーコードが検出できませんでした');
        Alert.alert(
          'スキャンエラー',
          result.error || 'バーコードの読み取りに失敗しました。手動で入力しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '手動入力', onPress: () => setShowManualInput(true) },
            { text: '再試行', onPress: startScanning },
          ]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      Alert.alert('エラー', `スキャンに失敗しました: ${errorMessage}`);
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  };

  /**
   * Manual barcode input
   */
  const handleManualInput = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('エラー', 'バーコードを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      setShowManualInput(false);

      const result = await autoFillService.fillProductInfo(manualBarcode.trim(), {
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.5,
      });

      if (result.success && result.product) {
        setScanResult(result);
        addToHistory(manualBarcode.trim(), result);
        setShowProductModal(true);
      } else {
        Alert.alert('商品が見つかりません', result.error || '商品情報を取得できませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', `商品情報の取得に失敗しました: ${error}`);
    } finally {
      setIsLoading(false);
      setManualBarcode('');
    }
  };

  /**
   * Add scan to history
   */
  const addToHistory = (barcode: string, result?: AutoFillResult) => {
    const historyItem: ScanHistory = {
      id: Date.now().toString(),
      barcode,
      timestamp: new Date(),
      result,
    };

    setScanHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10 items
  };

  /**
   * Add product to inventory
   */
  const addToInventory = () => {
    if (scanResult?.product) {
      // Navigate to add product screen with pre-filled data
      navigation.navigate('AddProduct', {
        productData: {
          name: scanResult.product.name,
          barcode: scanResult.product.barcode,
          price: scanResult.product.price,
          description: scanResult.product.description,
          imageUrl: scanResult.product.imageUrl,
          category: scanResult.product.category,
        },
        isFromScan: true,
      });
      setShowProductModal(false);
    }
  };

  /**
   * Retry scanning from history
   */
  const retryScanFromHistory = async (barcode: string) => {
    setShowHistory(false);
    
    try {
      setIsLoading(true);
      const result = await autoFillService.fillProductInfo(barcode, {
        useCache: true,
        enableFallback: true,
        confidenceThreshold: 0.5,
      });

      if (result.success && result.product) {
        setScanResult(result);
        setShowProductModal(true);
      } else {
        Alert.alert('商品が見つかりません', '商品情報を取得できませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', `商品情報の取得に失敗しました: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderScannerView = () => (
    <View style={styles.scannerContainer}>
      {/* Camera View Placeholder */}
      <View style={styles.cameraView}>
        <Text style={styles.cameraPlaceholder}>
          📷 カメラビュー
          {'\n'}(React Native Vision Camera統合予定)
        </Text>
        
        {/* Scan Overlay */}
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    }),
                  }],
                },
              ]}
            />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            バーコードをフレーム内に合わせてください
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.scanButton, isLoading && styles.scanButtonDisabled]}
          onPress={startScanning}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Text style={styles.scanButtonIcon}>📷</Text>
              <Text style={styles.scanButtonText}>スキャン開始</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.secondaryButtonIcon}>✏️</Text>
            <Text style={styles.secondaryButtonText}>手動入力</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowHistory(true)}
          >
            <Text style={styles.secondaryButtonIcon}>🕐</Text>
            <Text style={styles.secondaryButtonText}>履歴</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderProductModal = () => (
    <Modal
      visible={showProductModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowProductModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowProductModal(false)}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>商品情報</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView style={styles.modalContent}>
          {scanResult?.product && (
            <View style={styles.productCard}>
              {/* Product Image */}
              {scanResult.product.imageUrl ? (
                <Image
                  source={{ uri: scanResult.product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>🖼️</Text>
                </View>
              )}

              {/* Product Info */}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{scanResult.product.name}</Text>
                <Text style={styles.productBarcode}>
                  バーコード: {scanResult.product.barcode}
                </Text>
                <Text style={styles.productPrice}>
                  価格: ¥{scanResult.product.price?.toLocaleString() || '未設定'}
                </Text>
                
                {scanResult.product.description && (
                  <Text style={styles.productDescription}>
                    {scanResult.product.description}
                  </Text>
                )}

                {/* Scan Info */}
                <View style={styles.scanInfo}>
                  <View style={styles.scanInfoRow}>
                    <Text style={styles.scanInfoLabel}>信頼度:</Text>
                    <Text style={styles.scanInfoValue}>
                      {Math.round(scanResult.confidence * 100)}%
                    </Text>
                  </View>
                  <View style={styles.scanInfoRow}>
                    <Text style={styles.scanInfoLabel}>データソース:</Text>
                    <Text style={styles.scanInfoValue}>{scanResult.source}</Text>
                  </View>
                  <View style={styles.scanInfoRow}>
                    <Text style={styles.scanInfoLabel}>処理時間:</Text>
                    <Text style={styles.scanInfoValue}>
                      {scanResult.processTime}ms
                    </Text>
                  </View>
                </View>

                {/* Alternative Products */}
                {scanResult.alternatives && scanResult.alternatives.length > 0 && (
                  <View style={styles.alternativesSection}>
                    <Text style={styles.alternativesTitle}>類似商品</Text>
                    {scanResult.alternatives.slice(0, 3).map((alt, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.alternativeItem}
                        onPress={() => {
                          // Switch to alternative product
                          setScanResult(prev => prev ? {
                            ...prev,
                            product: {
                              ...prev.product!,
                              name: alt.itemName,
                              price: alt.itemPrice,
                              description: alt.itemCaption,
                              imageUrl: alt.imageUrl,
                            },
                          } : null);
                        }}
                      >
                        <Text style={styles.alternativeName}>
                          {alt.itemName}
                        </Text>
                        <Text style={styles.alternativePrice}>
                          ¥{alt.itemPrice.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={() => setShowProductModal(false)}
          >
            <Text style={styles.secondaryActionButtonText}>キャンセル</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={addToInventory}
          >
            <Text style={styles.primaryActionButtonText}>在庫に追加</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderManualInputModal = () => (
    <Modal
      visible={showManualInput}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowManualInput(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.manualInputContainer}>
          <Text style={styles.manualInputTitle}>バーコード手動入力</Text>
          
          <TextInput
            style={styles.manualInputField}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="バーコードを入力してください"
            keyboardType="numeric"
            autoFocus={true}
          />

          <View style={styles.manualInputActions}>
            <TouchableOpacity
              style={[styles.manualInputButton, styles.cancelButton]}
              onPress={() => {
                setShowManualInput(false);
                setManualBarcode('');
              }}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.manualInputButton, styles.confirmButton]}
              onPress={handleManualInput}
              disabled={!manualBarcode.trim()}
            >
              <Text style={styles.confirmButtonText}>検索</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal
      visible={showHistory}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowHistory(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowHistory(false)}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>スキャン履歴</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView style={styles.modalContent}>
          {scanHistory.length > 0 ? (
            scanHistory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => retryScanFromHistory(item.barcode)}
              >
                <View style={styles.historyItemContent}>
                  <Text style={styles.historyBarcode}>{item.barcode}</Text>
                  <Text style={styles.historyTimestamp}>
                    {item.timestamp.toLocaleString('ja-JP')}
                  </Text>
                  {item.result?.product && (
                    <Text style={styles.historyProductName}>
                      {item.result.product.name}
                    </Text>
                  )}
                </View>
                <Text style={styles.chevronIcon}>▶</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>🕐</Text>
              <Text style={styles.emptyHistoryText}>履歴がありません</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>バーコードスキャン</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scanner View */}
      {renderScannerView()}

      {/* Modals */}
      {renderProductModal()}
      {renderManualInputModal()}
      {renderHistoryModal()}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>処理中...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 20,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 32,
  },
  scannerContainer: {
    flex: 1,
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraPlaceholder: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.7,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 200,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
    opacity: 0.8,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  scanButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  secondaryButtonIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE6E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    color: '#666',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalHeaderSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePlaceholderIcon: {
    fontSize: 60,
    color: '#ccc',
  },
  productInfo: {
    gap: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    lineHeight: 24,
  },
  productBarcode: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  scanInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  scanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  scanInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  scanInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  alternativesSection: {
    marginTop: 16,
  },
  alternativesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  alternativeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alternativeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  alternativePrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
  },
  secondaryActionButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 32,
    minWidth: width - 64,
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  manualInputField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  manualInputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  manualInputButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  historyItemContent: {
    flex: 1,
  },
  chevronIcon: {
    fontSize: 16,
    color: '#ccc',
  },
  historyBarcode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    fontFamily: 'monospace',
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyProductName: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryIcon: {
    fontSize: 60,
    color: '#ccc',
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});

export default BarcodeScannerScreen;
