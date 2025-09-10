/**
 * Camera UI Components (8時間実装)
 * 
 * 直感的なカメラ撮影インターフェース
 * リアルタイムプレビュー、コントロール、ガイド機能
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  PanResponder,
  Platform,
} from 'react-native';
import {
  Surface,
  IconButton,
  FAB,
  Chip,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Services & Utils
import { enhancedCameraService, EnhancedCameraSettings, CameraState, DetectionResult } from '../../services/EnhancedCameraService';
import { SPACING } from '../../constants';
import { useBreakpoint } from '../../design-system/Responsive';
import { CameraTipsOverlay } from './CameraTipsOverlay';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CameraUIProps {
  onCapturePhoto: (imageUri: string) => void;
  onClose: () => void;
  detectionMode?: 'none' | 'objects' | 'qr' | 'barcode' | 'text' | 'all';
  showGuide?: boolean;
  initialSettings?: Partial<EnhancedCameraSettings>;
}

export interface CameraControlsProps {
  settings: EnhancedCameraSettings;
  state: CameraState;
  onSettingsChange: (settings: Partial<EnhancedCameraSettings>) => void;
  onCapture: () => void;
  onToggleFlash: () => void;
  onToggleCamera: () => void;
  onTimerSet: (seconds: 0 | 3 | 5 | 10) => void;
}

export interface DetectionOverlayProps {
  detectionResult: DetectionResult | null;
  viewSize: { width: number; height: number };
  detectionMode: string;
}

// =============================================================================
// CAMERA UI MAIN COMPONENT
// =============================================================================

export const CameraUI: React.FC<CameraUIProps> = ({
  onCapturePhoto,
  onClose,
  detectionMode = 'none',
  showGuide = true,
  initialSettings = {},
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const screenDimensions = Dimensions.get('window');

  // State
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState<EnhancedCameraSettings>({
    deviceType: 'back',
    flashMode: 'off',
    quality: 'high',
    aspectRatio: '4:3',
    gridLines: true,
    timer: 0,
    sound: true,
    autoSave: true,
    location: false,
    stabilization: true,
    focusMode: 'auto',
    exposureMode: 'auto',
    hdr: false,
    burstMode: false,
    ...initialSettings,
  });
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isBusy: false,
    deviceType: 'back',
    flashMode: 'off',
    isTimerActive: false,
    timerCountdown: 0,
    detectionMode: 'none',
    isDetecting: false,
  });
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [exposureValue, setExposureValue] = useState(0);
  const [showTips, setShowTips] = useState(showGuide);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const timerAnim = useRef(new Animated.Value(0)).current;

  // =============================================================================
  // INITIALIZATION & LIFECYCLE
  // =============================================================================

  useEffect(() => {
    initializeCamera();
    return () => {
      enhancedCameraService.dispose();
    };
  }, []);

  useEffect(() => {
    // アニメーション開始
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeCamera = async () => {
    try {
      // カメラサービスの初期化
      const initialized = await enhancedCameraService.initialize();
      if (!initialized) {
        throw new Error('Camera initialization failed');
      }

      // 設定を適用
      enhancedCameraService.updateSettings(settings);
      enhancedCameraService.setDetectionMode(detectionMode);

      // コールバックを設定
      enhancedCameraService.setCallbacks({
        onStateChange: setCameraState,
        onDetection: setDetectionResult,
        onError: handleCameraError,
        onTimerTick: handleTimerTick,
      });

      setIsReady(true);
    } catch (error) {
      console.error('Camera initialization error:', error);
      handleCameraError('カメラの初期化に失敗しました');
    }
  };

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleCapturePhoto = async () => {
    try {
      const result = await enhancedCameraService.capturePhoto({
        includeBase64: false,
        includeExtra: true,
      });

      if (result) {
        onCapturePhoto(result.uri);
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      handleCameraError('写真の撮影に失敗しました');
    }
  };

  const handleSettingsChange = (newSettings: Partial<EnhancedCameraSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    enhancedCameraService.updateSettings(newSettings);
  };

  const handleCameraError = (error: string) => {
    console.error('Camera error:', error);
    // エラーUI表示のロジック
  };

  const handleTimerTick = (countdown: number) => {
    // タイマーアニメーション
    Animated.sequence([
      Animated.timing(timerAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleTipComplete = (tipId: string) => {
    console.log('Tip completed:', tipId);
    // TODO: トラッキングやユーザープログレス更新
  };

  const handleTipsDismiss = () => {
    setShowTips(false);
  };

  const handleFocusTap = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });

    // フォーカスアニメーション
    Animated.sequence([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPoint(null);
    });

    // 実際のフォーカス設定
    // enhancedCameraService.setFocus({ x: locationX, y: locationY });
  };

  const handleToggleFlash = () => {
    enhancedCameraService.toggleFlash();
  };

  const handleToggleCamera = () => {
    enhancedCameraService.toggleCamera();
  };

  const handleTimerSet = (seconds: 0 | 3 | 5 | 10) => {
    enhancedCameraService.setTimer(seconds);
    handleSettingsChange({ timer: seconds });
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderCameraPreview = () => (
    <View style={styles.cameraContainer}>
      <TouchableOpacity
        style={styles.previewArea}
        activeOpacity={1}
        onPress={handleFocusTap}
      >
        {/* TODO: 実際のカメラプレビューコンポーネント */}
        <View style={[styles.mockPreview, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon name="camera-alt" size={80} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.previewText, { color: theme.colors.onSurfaceVariant }]}>
            カメラプレビュー
          </Text>
        </View>

        {/* グリッド線 */}
        {settings.gridLines && <GridOverlay />}

        {/* 検出結果オーバーレイ */}
        <DetectionOverlay
          detectionResult={detectionResult}
          viewSize={screenDimensions}
          detectionMode={detectionMode}
        />

        {/* フォーカスインジケーター */}
        {focusPoint && (
          <Animated.View
            style={[
              styles.focusIndicator,
              {
                left: focusPoint.x - 40,
                top: focusPoint.y - 40,
                opacity: focusAnim,
                transform: [{ scale: focusAnim }],
              },
            ]}
          >
            <View style={styles.focusRing} />
          </Animated.View>
        )}

        {/* タイマーカウントダウン */}
        {cameraState.isTimerActive && (
          <Animated.View
            style={[
              styles.timerOverlay,
              {
                opacity: timerAnim,
                transform: [{ scale: timerAnim }],
              },
            ]}
          >
            <Text style={styles.timerText}>{cameraState.timerCountdown}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
      
      {/* Tips Overlay */}
      <CameraTipsOverlay
        visible={showTips}
        detectionMode={detectionMode}
        cameraState={cameraState}
        onDismiss={handleTipsDismiss}
        onTipComplete={handleTipComplete}
      />
    </View>
  );

  const renderTopControls = () => (
    <Surface style={[styles.topControls, { paddingTop: insets.top + SPACING.MD }]} elevation={0}>
      <View style={styles.topRow}>
        <IconButton
          icon="close"
          size={28}
          iconColor={theme.colors.onSurface}
          onPress={onClose}
        />

        <View style={styles.topCenterControls}>
          <IconButton
            icon={getFlashIcon()}
            size={24}
            iconColor={cameraState.flashMode !== 'off' ? theme.colors.primary : theme.colors.onSurface}
            onPress={handleToggleFlash}
          />
          <IconButton
            icon={showTips ? 'help' : 'help-outline'}
            size={24}
            iconColor={showTips ? theme.colors.primary : theme.colors.onSurface}
            onPress={() => setShowTips(!showTips)}
          />
          <IconButton
            icon="settings"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={() => setShowSettings(true)}
          />
        </View>

        <IconButton
          icon="flip-camera-ios"
          size={28}
          iconColor={theme.colors.onSurface}
          onPress={handleToggleCamera}
        />
      </View>

      {/* 検出モード表示 */}
      {detectionMode !== 'none' && (
        <View style={styles.detectionModeRow}>
          <Chip
            icon="visibility"
            mode="outlined"
            compact
            textStyle={{ fontSize: 12 }}
          >
            {getDetectionModeLabel(detectionMode)}
          </Chip>
        </View>
      )}
    </Surface>
  );

  const renderBottomControls = () => (
    <Surface style={[styles.bottomControls, { paddingBottom: insets.bottom + SPACING.LG }]} elevation={0}>
      <CameraControls
        settings={settings}
        state={cameraState}
        onSettingsChange={handleSettingsChange}
        onCapture={handleCapturePhoto}
        onToggleFlash={handleToggleFlash}
        onToggleCamera={handleToggleCamera}
        onTimerSet={handleTimerSet}
      />
    </Surface>
  );

  const getFlashIcon = () => {
    switch (cameraState.flashMode) {
      case 'on': return 'flash-on';
      case 'auto': return 'flash-auto';
      default: return 'flash-off';
    }
  };

  const getDetectionModeLabel = (mode: string) => {
    switch (mode) {
      case 'objects': return '物体検出';
      case 'qr': return 'QRコード';
      case 'barcode': return 'バーコード';
      case 'text': return 'テキスト';
      case 'all': return '全検出';
      default: return '検出';
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ProgressBar indeterminate color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          カメラを準備中...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {renderCameraPreview()}
      {renderTopControls()}
      {renderBottomControls()}

      {/* 設定モーダル */}
      <CameraSettingsModal
        visible={showSettings}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={() => setShowSettings(false)}
      />
    </Animated.View>
  );
};

// =============================================================================
// CAMERA CONTROLS COMPONENT
// =============================================================================

const CameraControls: React.FC<CameraControlsProps> = ({
  settings,
  state,
  onSettingsChange,
  onCapture,
  onToggleFlash,
  onToggleCamera,
  onTimerSet,
}) => {
  const theme = useTheme();
  const breakpoint = useBreakpoint();

  const timerOptions = [0, 3, 5, 10] as const;

  return (
    <View style={styles.controlsContainer}>
      {/* タイマー選択 */}
      <View style={styles.timerControls}>
        {timerOptions.map((seconds) => (
          <TouchableOpacity
            key={seconds}
            style={[
              styles.timerButton,
              {
                backgroundColor: settings.timer === seconds
                  ? theme.colors.primary
                  : 'transparent',
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={() => onTimerSet(seconds)}
          >
            <Icon
              name={seconds === 0 ? 'timer-off' : 'timer'}
              size={16}
              color={settings.timer === seconds ? theme.colors.onPrimary : theme.colors.onSurface}
            />
            <Text
              style={[
                styles.timerButtonText,
                {
                  color: settings.timer === seconds ? theme.colors.onPrimary : theme.colors.onSurface,
                },
              ]}
            >
              {seconds === 0 ? 'OFF' : `${seconds}s`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* メインキャプチャーボタン */}
      <View style={styles.captureContainer}>
        <TouchableOpacity style={styles.galleryButton}>
          <Icon name="photo-library" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <FAB
          icon="camera"
          size="large"
          style={[
            styles.captureButton,
            {
              backgroundColor: state.isBusy ? theme.colors.outline : theme.colors.primary,
            },
          ]}
          color={theme.colors.onPrimary}
          onPress={onCapture}
          loading={state.isBusy}
          disabled={state.isBusy || state.isTimerActive}
        />

        <TouchableOpacity style={styles.modeButton}>
          <Icon name="tune" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* 品質・アスペクト比 */}
      <View style={styles.quickSettings}>
        <Chip
          icon="high-quality"
          mode="outlined"
          compact
          onPress={() => {
            const qualities = ['low', 'medium', 'high', 'max'] as const;
            const currentIndex = qualities.indexOf(settings.quality);
            const nextIndex = (currentIndex + 1) % qualities.length;
            onSettingsChange({ quality: qualities[nextIndex] });
          }}
        >
          {settings.quality.toUpperCase()}
        </Chip>

        <Chip
          icon="aspect-ratio"
          mode="outlined"
          compact
          onPress={() => {
            const ratios = ['1:1', '4:3', '16:9'] as const;
            const currentIndex = ratios.indexOf(settings.aspectRatio);
            const nextIndex = (currentIndex + 1) % ratios.length;
            onSettingsChange({ aspectRatio: ratios[nextIndex] });
          }}
        >
          {settings.aspectRatio}
        </Chip>
      </View>
    </View>
  );
};

// =============================================================================
// GRID OVERLAY COMPONENT
// =============================================================================

const GridOverlay: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.gridOverlay}>
      {/* 垂直線 */}
      <View style={[styles.gridLine, styles.verticalLine1, { backgroundColor: theme.colors.outline }]} />
      <View style={[styles.gridLine, styles.verticalLine2, { backgroundColor: theme.colors.outline }]} />
      
      {/* 水平線 */}
      <View style={[styles.gridLine, styles.horizontalLine1, { backgroundColor: theme.colors.outline }]} />
      <View style={[styles.gridLine, styles.horizontalLine2, { backgroundColor: theme.colors.outline }]} />
    </View>
  );
};

// =============================================================================
// DETECTION OVERLAY COMPONENT
// =============================================================================

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detectionResult,
  viewSize,
  detectionMode,
}) => {
  const theme = useTheme();

  if (!detectionResult || detectionMode === 'none') {
    return null;
  }

  return (
    <View style={styles.detectionOverlay}>
      {/* オブジェクト検出結果 */}
      {detectionResult.objects.map((object: any, index: number) => (
        <View
          key={object.id || index}
          style={[
            styles.detectionBox,
            {
              left: object.bounds.x,
              top: object.bounds.y,
              width: object.bounds.width,
              height: object.bounds.height,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <View style={[styles.detectionLabel, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.detectionLabelText, { color: theme.colors.onPrimary }]}>
              {object.label} ({Math.round(object.confidence * 100)}%)
            </Text>
          </View>
        </View>
      ))}

      {/* QRコード検出結果 */}
      {detectionResult.qrCodes.map((qr: any, index: number) => (
        <View
          key={qr.id || index}
          style={[
            styles.detectionBox,
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
              QR: {qr.type}
            </Text>
          </View>
        </View>
      ))}

      {/* バーコード検出結果 */}
      {detectionResult.barcodes.map((barcode: any, index: number) => (
        <View
          key={barcode.id || index}
          style={[
            styles.detectionBox,
            {
              left: barcode.bounds.x,
              top: barcode.bounds.y,
              width: barcode.bounds.width,
              height: barcode.bounds.height,
              borderColor: theme.colors.tertiary,
            },
          ]}
        >
          <View style={[styles.detectionLabel, { backgroundColor: theme.colors.tertiary }]}>
            <Text style={[styles.detectionLabelText, { color: theme.colors.onTertiary }]}>
              {barcode.type}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// =============================================================================
// CAMERA SETTINGS MODAL COMPONENT
// =============================================================================

interface CameraSettingsModalProps {
  visible: boolean;
  settings: EnhancedCameraSettings;
  onSettingsChange: (settings: Partial<EnhancedCameraSettings>) => void;
  onClose: () => void;
}

const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({
  visible,
  settings,
  onSettingsChange,
  onClose,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.settingsModal, { backgroundColor: theme.colors.background }]}>
        <Surface style={[styles.settingsHeader, { paddingTop: insets.top + SPACING.MD }]} elevation={1}>
          <View style={styles.settingsHeaderContent}>
            <IconButton icon="close" onPress={onClose} />
            <Text style={[styles.settingsTitle, { color: theme.colors.onSurface }]}>
              カメラ設定
            </Text>
            <View style={{ width: 48 }} />
          </View>
        </Surface>

        <View style={styles.settingsContent}>
          {/* TODO: 設定項目の実装 */}
          <Text style={{ color: theme.colors.onSurface, textAlign: 'center', marginTop: 100 }}>
            設定項目は今後実装予定
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },

  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    textAlign: 'center',
  },

  cameraContainer: {
    flex: 1,
    position: 'relative',
  },

  previewArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mockPreview: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    textAlign: 'center',
  },

  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topCenterControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detectionModeRow: {
    alignItems: 'center',
    marginTop: SPACING.SM,
  },

  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.LG,
  },

  controlsContainer: {
    alignItems: 'center',
  },

  timerControls: {
    flexDirection: 'row',
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },

  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },

  timerButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  captureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.LG,
  },

  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  captureButton: {
    width: 80,
    height: 80,
  },

  modeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickSettings: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },

  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },

  gridLine: {
    position: 'absolute',
    opacity: 0.3,
  },

  verticalLine1: {
    left: '33.333%',
    top: 0,
    bottom: 0,
    width: 1,
  },

  verticalLine2: {
    left: '66.666%',
    top: 0,
    bottom: 0,
    width: 1,
  },

  horizontalLine1: {
    top: '33.333%',
    left: 0,
    right: 0,
    height: 1,
  },

  horizontalLine2: {
    top: '66.666%',
    left: 0,
    right: 0,
    height: 1,
  },

  focusIndicator: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  focusRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
  },

  timerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
  },

  detectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },

  detectionBox: {
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
    minWidth: 60,
  },

  detectionLabelText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  settingsModal: {
    flex: 1,
  },

  settingsHeader: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },

  settingsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingsTitle: {
    fontSize: 20,
    fontWeight: '600',
  },

  settingsContent: {
    flex: 1,
    padding: SPACING.MD,
  },
});

export default CameraUI;
