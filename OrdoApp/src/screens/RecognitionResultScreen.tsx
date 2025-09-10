/**
 * Recognition Results Display Screen (6時間実装)
 * 
 * AI認識結果の詳細表示と管理
 * 物体検出、QRコード、バーコード、テキスト認識結果対応
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Share,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  Card,
  Chip,
  IconButton,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  Switch,
  ProgressBar,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Services & Utils
import { enhancedCameraService } from '../services/EnhancedCameraService';
import { SPACING, COLORS } from '../constants';
import { useBreakpoint } from '../design-system/Responsive';

// Types
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { StackParamList } from '../navigation/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface RecognitionResult {
  id: string;
  uri: string;
  type: 'photo' | 'recognition' | 'qr' | 'barcode' | 'text';
  timestamp: string;
  confidence?: number;
  
  // 検出結果
  objects?: DetectedObject[];
  qrCodes?: QRCode[];
  barcodes?: Barcode[];
  textBlocks?: TextBlock[];
  
  // メタデータ
  metadata?: {
    location?: string;
    weather?: string;
    imageSize?: { width: number; height: number };
    processingTime?: number;
  };
}

interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number };
  category?: string;
  description?: string;
}

interface QRCode {
  id: string;
  data: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  format?: string;
}

interface Barcode {
  id: string;
  data: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  format?: string;
}

interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number };
  language?: string;
}

type RecognitionResultScreenNavigationProp = StackNavigationProp<StackParamList, 'RecognitionResult'>;
type RecognitionResultScreenRouteProp = RouteProp<StackParamList, 'RecognitionResult'>;

interface RecognitionResultScreenProps {
  navigation: RecognitionResultScreenNavigationProp;
  route: RecognitionResultScreenRouteProp;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RecognitionResultScreen: React.FC<RecognitionResultScreenProps> = ({
  navigation,
  route,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const screenDimensions = Dimensions.get('window');
  
  // Route params
  const { result } = (route.params as { result?: RecognitionResult }) || {};

  // State
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(result || null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'objects' | 'codes' | 'text'>('overview');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // =============================================================================
  // LIFECYCLE & INITIALIZATION
  // =============================================================================

  useEffect(() => {
    if (!recognitionResult) {
      navigation.goBack();
      return;
    }

    // アニメーション開始
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [recognitionResult, navigation]);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleShare = async () => {
    if (!recognitionResult) return;

    try {
      setIsProcessing(true);
      
      const shareData = {
        title: '認識結果',
        message: generateShareMessage(recognitionResult),
        url: recognitionResult.uri,
      };

      await Share.share(shareData);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('エラー', '共有に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!recognitionResult) return;

    try {
      setIsProcessing(true);
      
      // TODO: データベースに保存
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模擬保存
      
      Alert.alert(
        '保存完了',
        '認識結果が保存されました',
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }) }]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditedData(item);
    setShowEditDialog(true);
  };

  const handleRetake = () => {
    Alert.alert(
      '再撮影',
      '現在の結果を破棄して再撮影しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '再撮影', 
          style: 'destructive',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Camera' })
        },
      ]
    );
  };

  const generateShareMessage = (result: RecognitionResult): string => {
    let message = `認識結果 (${new Date(result.timestamp).toLocaleString('ja-JP')})\n\n`;
    
    if (result.objects && result.objects.length > 0) {
      message += '【検出オブジェクト】\n';
      result.objects.forEach(obj => {
        message += `• ${obj.label} (${Math.round(obj.confidence * 100)}%)\n`;
      });
      message += '\n';
    }
    
    if (result.qrCodes && result.qrCodes.length > 0) {
      message += '【QRコード】\n';
      result.qrCodes.forEach(qr => {
        message += `• ${qr.data}\n`;
      });
      message += '\n';
    }
    
    if (result.barcodes && result.barcodes.length > 0) {
      message += '【バーコード】\n';
      result.barcodes.forEach(barcode => {
        message += `• ${barcode.data} (${barcode.type})\n`;
      });
      message += '\n';
    }
    
    return message.trim();
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderHeader = () => (
    <Surface style={[styles.header, { paddingTop: insets.top + SPACING.MD }]} elevation={2}>
      <View style={styles.headerContent}>
        <IconButton
          icon="arrow-back"
          size={24}
          onPress={() => navigation.goBack()}
        />
        
        <View style={styles.headerTitle}>
          <Text style={[styles.headerTitleText, { color: theme.colors.onSurface }]}>
            認識結果
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {new Date(recognitionResult?.timestamp || '').toLocaleString('ja-JP')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <IconButton
            icon="share"
            size={24}
            onPress={handleShare}
            disabled={isProcessing}
          />
          <IconButton
            icon="edit"
            size={24}
            onPress={() => setShowEditDialog(true)}
            disabled={isProcessing}
          />
        </View>
      </View>
    </Surface>
  );

  const renderImagePreview = () => {
    if (!recognitionResult) return null;

    return (
      <Card style={styles.imageCard}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: recognitionResult.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          
          {/* オーバーレイ情報 */}
          <View style={styles.imageOverlay}>
            <Chip 
              icon="camera" 
              mode="flat"
              style={[styles.imageTypeChip, { backgroundColor: getTypeColor(recognitionResult.type) }]}
            >
              {getTypeLabel(recognitionResult.type)}
            </Chip>
            
            {recognitionResult.confidence && (
              <Chip 
                icon="trending-up" 
                mode="flat"
                style={styles.confidenceChip}
              >
                {Math.round(recognitionResult.confidence * 100)}%
              </Chip>
            )}
          </View>
          
          {/* 検出境界の表示 */}
          {renderDetectionOverlays()}
        </View>
      </Card>
    );
  };

  const renderDetectionOverlays = () => {
    if (!recognitionResult) return null;

    const overlays: React.ReactElement[] = [];

    // オブジェクト検出オーバーレイ
    recognitionResult.objects?.forEach((obj, index) => {
      overlays.push(
        <View
          key={`object-${index}`}
          style={[
            styles.detectionBound,
            {
              left: obj.bounds.x,
              top: obj.bounds.y,
              width: obj.bounds.width,
              height: obj.bounds.height,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <View style={[styles.detectionLabel, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.detectionLabelText, { color: theme.colors.onPrimary }]}>
              {obj.label}
            </Text>
          </View>
        </View>
      );
    });

    // QRコードオーバーレイ
    recognitionResult.qrCodes?.forEach((qr, index) => {
      overlays.push(
        <View
          key={`qr-${index}`}
          style={[
            styles.detectionBound,
            {
              left: qr.bounds.x,
              top: qr.bounds.y,
              width: qr.bounds.width,
              height: qr.bounds.height,
              borderColor: theme.colors.secondary,
            },
          ]}
        >
          <View style={[styles.detectionLabel, { backgroundColor: theme.colors.secondary }]}>
            <Text style={[styles.detectionLabelText, { color: theme.colors.onSecondary }]}>
              QR
            </Text>
          </View>
        </View>
      );
    });

    return overlays;
  };

  const renderTabs = () => (
    <Surface style={styles.tabsContainer} elevation={1}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabs}>
          {[
            { key: 'overview', label: '概要', icon: 'dashboard' },
            { key: 'objects', label: '物体', icon: 'category', count: recognitionResult?.objects?.length },
            { key: 'codes', label: 'コード', icon: 'qr-code-scanner', count: (recognitionResult?.qrCodes?.length || 0) + (recognitionResult?.barcodes?.length || 0) },
            { key: 'text', label: 'テキスト', icon: 'text-fields', count: recognitionResult?.textBlocks?.length },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && [styles.activeTab, { borderBottomColor: theme.colors.primary }],
              ]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Icon 
                name={tab.icon} 
                size={20} 
                color={selectedTab === tab.key ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text 
                style={[
                  styles.tabLabel,
                  { color: selectedTab === tab.key ? theme.colors.primary : theme.colors.onSurfaceVariant }
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <Chip 
                  mode="flat" 
                  compact 
                  style={styles.tabBadge}
                  textStyle={styles.tabBadgeText}
                >
                  {tab.count}
                </Chip>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'objects':
        return renderObjectsTab();
      case 'codes':
        return renderCodesTab();
      case 'text':
        return renderTextTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>認識サマリー</Text>
          
          <View style={styles.summaryGrid}>
            {recognitionResult?.objects && (
              <View style={styles.summaryItem}>
                <Icon name="category" size={24} color={theme.colors.primary} />
                <Text style={[styles.summaryNumber, { color: theme.colors.onSurface }]}>
                  {recognitionResult.objects.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                  オブジェクト
                </Text>
              </View>
            )}
            
            {recognitionResult?.qrCodes && (
              <View style={styles.summaryItem}>
                <Icon name="qr-code" size={24} color={theme.colors.secondary} />
                <Text style={[styles.summaryNumber, { color: theme.colors.onSurface }]}>
                  {recognitionResult.qrCodes.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                  QRコード
                </Text>
              </View>
            )}
            
            {recognitionResult?.barcodes && (
              <View style={styles.summaryItem}>
                <Icon name="barcode-scanner" size={24} color={theme.colors.tertiary} />
                <Text style={[styles.summaryNumber, { color: theme.colors.onSurface }]}>
                  {recognitionResult.barcodes.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                  バーコード
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* メタデータ */}
      {recognitionResult?.metadata && (
        <Card style={styles.metadataCard}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>メタデータ</Text>
            
            {recognitionResult.metadata.imageSize && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                  画像サイズ
                </Text>
                <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
                  {recognitionResult.metadata.imageSize.width} × {recognitionResult.metadata.imageSize.height}
                </Text>
              </View>
            )}
            
            {recognitionResult.metadata.processingTime && (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataLabel, { color: theme.colors.onSurfaceVariant }]}>
                  処理時間
                </Text>
                <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
                  {recognitionResult.metadata.processingTime}ms
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </View>
  );

  const renderObjectsTab = () => (
    <View style={styles.tabContent}>
      {recognitionResult?.objects?.map((obj, index) => (
        <Card key={index} style={styles.detectionCard}>
          <Card.Content>
            <View style={styles.detectionHeader}>
              <Icon name="category" size={24} color={theme.colors.primary} />
              <Text style={[styles.detectionTitle, { color: theme.colors.onSurface }]}>
                {obj.label}
              </Text>
              <Chip mode="outlined" compact>
                {Math.round(obj.confidence * 100)}%
              </Chip>
            </View>
            
            {obj.description && (
              <Text style={[styles.detectionDescription, { color: theme.colors.onSurfaceVariant }]}>
                {obj.description}
              </Text>
            )}
            
            <View style={styles.detectionMeta}>
              <Text style={[styles.detectionPosition, { color: theme.colors.onSurfaceVariant }]}>
                位置: ({Math.round(obj.bounds.x)}, {Math.round(obj.bounds.y)})
              </Text>
              <Text style={[styles.detectionSize, { color: theme.colors.onSurfaceVariant }]}>
                サイズ: {Math.round(obj.bounds.width)}×{Math.round(obj.bounds.height)}
              </Text>
            </View>
          </Card.Content>
          
          <Card.Actions>
            <Button onPress={() => handleEdit(obj)}>編集</Button>
          </Card.Actions>
        </Card>
      ))}
      
      {(!recognitionResult?.objects || recognitionResult.objects.length === 0) && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              オブジェクトが検出されませんでした
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  const renderCodesTab = () => (
    <View style={styles.tabContent}>
      {/* QRコード */}
      {recognitionResult?.qrCodes?.map((qr, index) => (
        <Card key={`qr-${index}`} style={styles.detectionCard}>
          <Card.Content>
            <View style={styles.detectionHeader}>
              <Icon name="qr-code" size={24} color={theme.colors.secondary} />
              <Text style={[styles.detectionTitle, { color: theme.colors.onSurface }]}>
                QRコード
              </Text>
              <Chip mode="outlined" compact>
                {qr.type}
              </Chip>
            </View>
            
            <Text style={[styles.codeData, { color: theme.colors.onSurface }]}>
              {qr.data}
            </Text>
          </Card.Content>
          
          <Card.Actions>
            <Button onPress={() => handleEdit(qr)}>コピー</Button>
            <Button onPress={() => handleEdit(qr)}>開く</Button>
          </Card.Actions>
        </Card>
      ))}
      
      {/* バーコード */}
      {recognitionResult?.barcodes?.map((barcode, index) => (
        <Card key={`barcode-${index}`} style={styles.detectionCard}>
          <Card.Content>
            <View style={styles.detectionHeader}>
              <Icon name="barcode-scanner" size={24} color={theme.colors.tertiary} />
              <Text style={[styles.detectionTitle, { color: theme.colors.onSurface }]}>
                バーコード
              </Text>
              <Chip mode="outlined" compact>
                {barcode.type}
              </Chip>
            </View>
            
            <Text style={[styles.codeData, { color: theme.colors.onSurface }]}>
              {barcode.data}
            </Text>
          </Card.Content>
          
          <Card.Actions>
            <Button onPress={() => handleEdit(barcode)}>コピー</Button>
            <Button onPress={() => handleEdit(barcode)}>検索</Button>
          </Card.Actions>
        </Card>
      ))}
      
      {(!recognitionResult?.qrCodes?.length && !recognitionResult?.barcodes?.length) && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              QRコードやバーコードが検出されませんでした
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  const renderTextTab = () => (
    <View style={styles.tabContent}>
      {recognitionResult?.textBlocks?.map((text, index) => (
        <Card key={index} style={styles.detectionCard}>
          <Card.Content>
            <View style={styles.detectionHeader}>
              <Icon name="text-fields" size={24} color={theme.colors.primary} />
              <Text style={[styles.detectionTitle, { color: theme.colors.onSurface }]}>
                テキスト
              </Text>
              <Chip mode="outlined" compact>
                {Math.round(text.confidence * 100)}%
              </Chip>
            </View>
            
            <Text style={[styles.textContent, { color: theme.colors.onSurface }]}>
              {text.text}
            </Text>
            
            {text.language && (
              <Text style={[styles.textLanguage, { color: theme.colors.onSurfaceVariant }]}>
                言語: {text.language}
              </Text>
            )}
          </Card.Content>
          
          <Card.Actions>
            <Button onPress={() => handleEdit(text)}>コピー</Button>
            <Button onPress={() => handleEdit(text)}>翻訳</Button>
          </Card.Actions>
        </Card>
      ))}
      
      {(!recognitionResult?.textBlocks || recognitionResult.textBlocks.length === 0) && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              テキストが検出されませんでした
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  const renderActionButtons = () => (
    <Surface style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.MD }]} elevation={3}>
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleRetake}
          disabled={isProcessing}
          style={styles.actionButton}
          icon="camera"
        >
          再撮影
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={isProcessing}
          style={styles.actionButton}
          icon="save"
          loading={isProcessing}
        >
          保存
        </Button>
      </View>
    </Surface>
  );

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'recognition': return theme.colors.primary;
      case 'qr': return theme.colors.secondary;
      case 'barcode': return theme.colors.tertiary;
      case 'text': return COLORS.SUCCESS;
      default: return theme.colors.outline;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'photo': return '写真';
      case 'recognition': return '物体認識';
      case 'qr': return 'QRコード';
      case 'barcode': return 'バーコード';
      case 'text': return 'テキスト';
      default: return '不明';
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!recognitionResult) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onBackground, textAlign: 'center', marginTop: 100 }}>
          認識結果が見つかりません
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderImagePreview()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
      
      {renderActionButtons()}
      
      {/* Processing Indicator */}
      {isProcessing && (
        <Portal>
          <View style={styles.processingOverlay}>
            <Surface style={styles.processingCard} elevation={4}>
              <ProgressBar indeterminate color={theme.colors.primary} />
              <Text style={[styles.processingText, { color: theme.colors.onSurface }]}>
                処理中...
              </Text>
            </Surface>
          </View>
        </Portal>
      )}
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: SPACING.MD,
  },

  headerTitleText: {
    fontSize: 20,
    fontWeight: '600',
  },

  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
  },

  content: {
    flex: 1,
    padding: SPACING.MD,
  },

  imageCard: {
    marginBottom: SPACING.LG,
    overflow: 'hidden',
  },

  imageContainer: {
    position: 'relative',
  },

  previewImage: {
    width: '100%',
    height: 250,
  },

  imageOverlay: {
    position: 'absolute',
    top: SPACING.MD,
    left: SPACING.MD,
    right: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  imageTypeChip: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  confidenceChip: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  detectionBound: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },

  detectionLabel: {
    position: 'absolute',
    top: -24,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  detectionLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },

  tabsContainer: {
    marginBottom: SPACING.MD,
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginRight: SPACING.SM,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: SPACING.XS,
  },

  activeTab: {
    borderBottomWidth: 2,
  },

  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  tabBadge: {
    marginLeft: SPACING.XS,
    height: 20,
    minWidth: 20,
  },

  tabBadgeText: {
    fontSize: 10,
  },

  tabContent: {
    gap: SPACING.MD,
  },

  summaryCard: {
    marginBottom: SPACING.MD,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  summaryItem: {
    alignItems: 'center',
    gap: SPACING.XS,
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  summaryLabel: {
    fontSize: 12,
  },

  metadataCard: {
    marginBottom: SPACING.MD,
  },

  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
  },

  metadataLabel: {
    fontSize: 14,
  },

  metadataValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  detectionCard: {
    marginBottom: SPACING.SM,
  },

  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },

  detectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  detectionDescription: {
    fontSize: 14,
    marginBottom: SPACING.SM,
  },

  detectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detectionPosition: {
    fontSize: 12,
  },

  detectionSize: {
    fontSize: 12,
  },

  codeData: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: SPACING.SM,
    borderRadius: 4,
  },

  textContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },

  textLanguage: {
    fontSize: 12,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },

  actionBar: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  actionButton: {
    flex: 1,
  },

  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  processingCard: {
    padding: SPACING.XL,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },

  processingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RecognitionResultScreen;
