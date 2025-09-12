/**
 * Barcode Integration Demo Component
 * バーコードスキャン・自動入力機能のデモとテスト画面
 * 
 * Features:
 * - 各機能のデモンストレーション
 * - ステップバイステップガイド
 * - 機能テスト用UI
 * - 統合状況の表示
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductAutoFillService, ProductData } from '../services/ProductAutoFillService';

interface IntegrationDemoProps {
  navigation: any;
}

export const BarcodeIntegrationDemo: React.FC<IntegrationDemoProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  /**
   * Test barcode scanner service
   */
  const testBarcodeScanner = async () => {
    try {
      setIsLoading(true);
      addTestResult('🔍 バーコードスキャナーテスト開始...');
      
      const service = ProductAutoFillService.getInstance();
      const result = await service.scanAndFill({
        useCache: false,
        enableFallback: true,
        confidenceThreshold: 0.5,
      });

      if (result.success) {
        addTestResult(`✅ スキャン成功: ${result.product?.name || '商品名なし'}`);
        addTestResult(`📊 信頼度: ${Math.round(result.confidence * 100)}%`);
      } else {
        addTestResult(`❌ スキャン失敗: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`💥 エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Test product API service
   */
  const testProductAPI = async () => {
    try {
      setIsLoading(true);
      addTestResult('🌐 商品API連携テスト開始...');
      
      const service = ProductAutoFillService.getInstance();
      const testBarcode = '4901777289277'; // Test barcode
      
      const result = await service.fillProductInfo(testBarcode, {
        useCache: false,
        enableFallback: true,
        confidenceThreshold: 0.3,
      });

      if (result.success && result.product) {
        addTestResult(`✅ API成功: ${result.product.name}`);
        addTestResult(`💰 価格: ¥${result.product.price || 'N/A'}`);
        addTestResult(`🏷️ カテゴリ: ${result.product.category || 'N/A'}`);
      } else {
        addTestResult(`❌ API失敗: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`💥 エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Test navigation to scanner
   */
  const testScannerNavigation = () => {
    try {
      addTestResult('📱 スキャナー画面への遷移テスト...');
      navigation.navigate('BarcodeScanner');
      addTestResult('✅ ナビゲーション成功');
    } catch (error) {
      addTestResult(`❌ ナビゲーション失敗: ${error}`);
    }
  };

  /**
   * Test navigation to form
   */
  const testFormNavigation = () => {
    try {
      addTestResult('📝 フォーム画面への遷移テスト...');
      
      const mockProductData: ProductData = {
        id: 'demo-product-123',
        name: 'テスト商品',
        barcode: '1234567890123',
        description: 'デモ用の商品データです',
        price: 100,
        category: '食品・飲料',
        brand: 'テストブランド',
        imageUrl: '',
        source: 'manual',
        confidence: 0.95,
        lastUpdated: new Date(),
      };

      navigation.navigate('ProductAutoFillForm', {
        productData: mockProductData,
        isFromScan: true,
      });
      addTestResult('✅ ナビゲーション成功');
    } catch (error) {
      addTestResult(`❌ ナビゲーション失敗: ${error}`);
    }
  };

  /**
   * Add test result
   */
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  /**
   * Clear test results
   */
  const clearTestResults = () => {
    setTestResults([]);
  };

  const features = [
    {
      title: 'バーコードスキャン',
      description: 'カメラでバーコードを読み取り、商品情報を自動取得',
      status: '✅ 実装完了',
      action: testBarcodeScanner,
      navAction: testScannerNavigation,
    },
    {
      title: '商品API連携',
      description: '楽天APIから商品情報を取得し、データベースに保存',
      status: '✅ 実装完了',
      action: testProductAPI,
    },
    {
      title: '自動入力フォーム',
      description: 'スキャン結果を商品登録フォームに自動入力',
      status: '✅ 実装完了',
      navAction: testFormNavigation,
    },
    {
      title: 'UI統合',
      description: 'ナビゲーション統合とユーザーインターフェース',
      status: '🚀 統合完了',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>バーコード統合デモ</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Overview */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>実装進捗</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>22時間中 22時間完了 (100%)</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>実装済み機能</Text>
          
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureStatus}>{feature.status}</Text>
              </View>
              <Text style={styles.featureDescription}>{feature.description}</Text>
              
              <View style={styles.featureActions}>
                {feature.action && (
                  <TouchableOpacity
                    style={[styles.testButton, styles.testButtonPrimary]}
                    onPress={feature.action}
                    disabled={isLoading}
                  >
                    <Text style={styles.testButtonText}>機能テスト</Text>
                  </TouchableOpacity>
                )}
                
                {feature.navAction && (
                  <TouchableOpacity
                    style={[styles.testButton, styles.testButtonSecondary]}
                    onPress={feature.navAction}
                  >
                    <Text style={styles.testButtonTextSecondary}>画面表示</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Test Results */}
        <View style={styles.testResultsContainer}>
          <View style={styles.testResultsHeader}>
            <Text style={styles.testResultsTitle}>テスト結果</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearTestResults}>
              <Text style={styles.clearButtonText}>クリア</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.testResultsList}>
            {testResults.length === 0 ? (
              <Text style={styles.noResultsText}>テストを実行してください</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={index} style={styles.testResultItem}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Integration Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>統合概要</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>サービス数</Text>
              <Text style={styles.summaryValue}>3</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>画面数</Text>
              <Text style={styles.summaryValue}>2</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>テスト数</Text>
              <Text style={styles.summaryValue}>16+</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>実装率</Text>
              <Text style={styles.summaryValue}>100%</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>テスト実行中...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
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
  headerSpace: {
    width: 28,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featureStatus: {
    fontSize: 14,
    color: '#28a745',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  featureActions: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  testButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  testButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  testButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  testResultsContainer: {
    marginBottom: 24,
  },
  testResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#dc3545',
  },
  testResultsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  testResultItem: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  summaryContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
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

export default BarcodeIntegrationDemo;
