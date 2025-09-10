/**
 * Camera Tips Overlay Component
 * 
 * インタラクティブなカメラ撮影ガイドオーバーレイ
 * リアルタイムでの撮影ヒントとガイダンス
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  IconButton,
  useTheme,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Utils
import { SPACING, COLORS } from '../../constants';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface TipData {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  trigger: 'auto' | 'manual' | 'detection';
  duration?: number;
}

interface CameraTipsOverlayProps {
  visible: boolean;
  detectionMode: string;
  cameraState: any;
  onDismiss: () => void;
  onTipComplete: (tipId: string) => void;
}

export type { CameraTipsOverlayProps };

// =============================================================================
// COMPONENT
// =============================================================================

export const CameraTipsOverlay: React.FC<CameraTipsOverlayProps> = ({
  visible,
  detectionMode,
  cameraState,
  onDismiss,
  onTipComplete,
}) => {
  const theme = useTheme();
  const screenDimensions = Dimensions.get('window');

  // State
  const [currentTip, setCurrentTip] = useState<TipData | null>(null);
  const [tipQueue, setTipQueue] = useState<TipData[]>([]);
  const [showAllTips, setShowAllTips] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // =============================================================================
  // TIP DATA
  // =============================================================================

  const tips: TipData[] = [
    {
      id: 'center-subject',
      title: '商品を中央に配置',
      description: '撮影したい商品を画面の中央に配置してください',
      icon: 'center-focus-strong',
      position: { x: screenDimensions.width / 2, y: screenDimensions.height / 2 },
      trigger: 'auto',
      duration: 3000,
    },
    {
      id: 'good-lighting',
      title: '十分な明るさを確保',
      description: '明るい場所で撮影すると認識精度が向上します',
      icon: 'wb-sunny',
      position: { x: 50, y: 100 },
      trigger: 'auto',
      duration: 4000,
    },
    {
      id: 'focus-tap',
      title: 'タップでフォーカス',
      description: '画面をタップするとその位置にピントを合わせます',
      icon: 'center-focus-weak',
      position: { x: screenDimensions.width - 100, y: 150 },
      trigger: 'manual',
    },
    {
      id: 'qr-distance',
      title: '適切な距離を保つ',
      description: 'QRコードから20-30cm離れて撮影してください',
      icon: 'straighten',
      position: { x: screenDimensions.width / 2, y: 200 },
      trigger: 'detection',
    },
    {
      id: 'barcode-angle',
      title: '真正面から撮影',
      description: 'バーコードは真正面から撮影すると読み取りやすくなります',
      icon: 'crop-rotate',
      position: { x: screenDimensions.width / 2, y: screenDimensions.height - 200 },
      trigger: 'detection',
    },
    {
      id: 'grid-guide',
      title: '三分割法を活用',
      description: 'グリッド線を参考に被写体を配置してください',
      icon: 'grid-on',
      position: { x: 100, y: screenDimensions.height / 2 },
      trigger: 'manual',
    },
  ];

  // =============================================================================
  // LIFECYCLE & EFFECTS
  // =============================================================================

  useEffect(() => {
    if (visible) {
      showInitialTips();
    } else {
      hideTips();
    }
  }, [visible, detectionMode]);

  useEffect(() => {
    if (currentTip && currentTip.duration) {
      const timer = setTimeout(() => {
        handleTipComplete(currentTip.id);
      }, currentTip.duration);

      return () => clearTimeout(timer);
    }
  }, [currentTip]);

  // =============================================================================
  // TIP MANAGEMENT
  // =============================================================================

  const showInitialTips = () => {
    // 検出モードに応じて適切なTipを選択
    const relevantTips = tips.filter(tip => {
      if (tip.trigger === 'auto') return true;
      if (tip.trigger === 'detection') {
        return (
          (detectionMode === 'qr' && tip.id === 'qr-distance') ||
          (detectionMode === 'barcode' && tip.id === 'barcode-angle')
        );
      }
      return false;
    });

    setTipQueue(relevantTips);
    
    if (relevantTips.length > 0) {
      showNextTip(relevantTips);
    }
  };

  const showNextTip = (queue: TipData[]) => {
    if (queue.length === 0) return;

    const nextTip = queue[0];
    setCurrentTip(nextTip);
    setTipQueue(queue.slice(1));

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

    // パルスアニメーション
    startPulseAnimation();
  };

  const hideTips = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentTip(null);
      setTipQueue([]);
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleTipComplete = (tipId: string) => {
    onTipComplete(tipId);
    
    // 次のTipを表示
    if (tipQueue.length > 0) {
      setTimeout(() => {
        showNextTip(tipQueue);
      }, 500);
    } else {
      hideTips();
    }
  };

  const handleTipDismiss = () => {
    if (currentTip) {
      handleTipComplete(currentTip.id);
    }
  };

  const handleShowAllTips = () => {
    setShowAllTips(!showAllTips);
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderTipBalloon = (tip: TipData) => {
    const isNearBottom = tip.position.y > screenDimensions.height - 200;
    const isNearRight = tip.position.x > screenDimensions.width - 150;

    return (
      <Animated.View
        key={tip.id}
        style={[
          styles.tipBalloon,
          {
            top: isNearBottom ? tip.position.y - 120 : tip.position.y + 40,
            left: isNearRight ? tip.position.x - 200 : tip.position.x - 100,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Surface style={[styles.balloonContent, { backgroundColor: theme.colors.surface }]} elevation={4}>
          <View style={styles.balloonHeader}>
            <Icon name={tip.icon} size={20} color={theme.colors.primary} />
            <Text style={[styles.balloonTitle, { color: theme.colors.onSurface }]}>
              {tip.title}
            </Text>
            <IconButton
              icon="close"
              size={16}
              onPress={handleTipDismiss}
            />
          </View>
          
          <Text style={[styles.balloonDescription, { color: theme.colors.onSurfaceVariant }]}>
            {tip.description}
          </Text>
        </Surface>

        {/* 指すためのポインター */}
        <View 
          style={[
            styles.balloonPointer,
            { backgroundColor: theme.colors.surface },
            isNearBottom ? styles.pointerTop : styles.pointerBottom,
            { left: isNearRight ? 150 : 100 },
          ]} 
        />
      </Animated.View>
    );
  };

  const renderTipMarker = (tip: TipData) => (
    <Animated.View
      key={`marker-${tip.id}`}
      style={[
        styles.tipMarker,
        {
          left: tip.position.x - 20,
          top: tip.position.y - 20,
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { 
              scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2],
              })
            },
          ],
        },
      ]}
    >
      <Surface style={[styles.markerCircle, { backgroundColor: theme.colors.primary }]} elevation={3}>
        <Icon name={tip.icon} size={20} color={theme.colors.onPrimary} />
      </Surface>
    </Animated.View>
  );

  const renderQuickTipsPanel = () => {
    if (!showAllTips) return null;

    return (
      <Animated.View style={[styles.quickTipsPanel, { opacity: fadeAnim }]}>
        <Surface style={[styles.tipsPanel, { backgroundColor: theme.colors.surface }]} elevation={4}>
          <View style={styles.tipsPanelHeader}>
            <Text style={[styles.tipsPanelTitle, { color: theme.colors.onSurface }]}>
              撮影のコツ
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setShowAllTips(false)}
            />
          </View>

          {tips.slice(0, 4).map((tip, index) => (
            <View key={tip.id} style={styles.quickTipItem}>
              <Icon name={tip.icon} size={16} color={theme.colors.primary} />
              <Text style={[styles.quickTipText, { color: theme.colors.onSurfaceVariant }]}>
                {tip.title}
              </Text>
            </View>
          ))}
        </Surface>
      </Animated.View>
    );
  };

  const renderTipsToggle = () => (
    <TouchableOpacity
      style={[styles.tipsToggle, { backgroundColor: theme.colors.primary }]}
      onPress={handleShowAllTips}
    >
      <Icon name="help" size={24} color={theme.colors.onPrimary} />
    </TouchableOpacity>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* 現在のTip */}
      {currentTip && (
        <>
          {renderTipMarker(currentTip)}
          {renderTipBalloon(currentTip)}
        </>
      )}

      {/* クイックTipsパネル */}
      {renderQuickTipsPanel()}

      {/* Tipsトグルボタン */}
      {!currentTip && renderTipsToggle()}

      {/* プログレスインジケーター */}
      {tipQueue.length > 0 && (
        <View style={styles.progressIndicator}>
          <Chip 
            mode="flat"
            style={[styles.progressChip, { backgroundColor: theme.colors.primary }]}
            textStyle={{ color: theme.colors.onPrimary }}
          >
            あと{tipQueue.length}個のヒント
          </Chip>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },

  tipMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tipBalloon: {
    position: 'absolute',
    width: 200,
    maxWidth: 250,
  },

  balloonContent: {
    padding: SPACING.MD,
    borderRadius: 8,
  },

  balloonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.XS,
  },

  balloonTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  balloonDescription: {
    fontSize: 12,
    lineHeight: 16,
  },

  balloonPointer: {
    position: 'absolute',
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
  },

  pointerBottom: {
    top: -6,
  },

  pointerTop: {
    bottom: -6,
  },

  quickTipsPanel: {
    position: 'absolute',
    top: 100,
    right: SPACING.MD,
    width: 200,
  },

  tipsPanel: {
    padding: SPACING.MD,
    borderRadius: 8,
  },

  tipsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },

  tipsPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  quickTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    marginBottom: SPACING.XS,
  },

  quickTipText: {
    fontSize: 12,
    flex: 1,
  },

  tipsToggle: {
    position: 'absolute',
    top: 120,
    right: SPACING.MD,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  progressChip: {
    opacity: 0.9,
  },
});

export default CameraTipsOverlay;
