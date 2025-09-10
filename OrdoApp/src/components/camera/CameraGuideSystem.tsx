/**
 * Camera Guide & Help System (4時間実装)
 * 
 * インタラクティブなカメラガイドとヘルプシステム
 * オンボーディング、ツアー、ヘルプ機能
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  Card,
  IconButton,
  useTheme,
  Portal,
  Modal,
  Chip,
  Divider,
  List,
  FAB,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

// Services & Utils
import { SPACING, COLORS } from '../../constants';
import { useBreakpoint } from '../../design-system/Responsive';

// Types
import type { StackNavigationProp } from '@react-navigation/stack';
import type { StackParamList } from '../../navigation/types';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface GuideStep {
  id: string;
  title: string;
  description: string;
  image?: any;
  video?: string;
  tips?: string[];
  overlay?: {
    highlight: { x: number; y: number; width: number; height: number };
    position: 'top' | 'bottom' | 'left' | 'right';
  };
}

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: GuideStep[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
}

interface HelpTopic {
  id: string;
  title: string;
  category: string;
  icon: string;
  content: string;
  relatedTopics?: string[];
  faqs?: { question: string; answer: string }[];
}

type CameraGuideNavigationProp = StackNavigationProp<StackParamList>;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CameraGuideSystem: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CameraGuideNavigationProp>();
  const breakpoint = useBreakpoint();
  const screenDimensions = Dimensions.get('window');

  // State
  const [activeSection, setActiveSection] = useState<'guides' | 'help' | 'tips'>('guides');
  const [selectedGuide, setSelectedGuide] = useState<GuideSection | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [helpTopics, setHelpTopics] = useState<HelpTopic[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // =============================================================================
  // DATA & CONTENT
  // =============================================================================

  const guideSections: GuideSection[] = [
    {
      id: 'basic-camera',
      title: '基本的な撮影方法',
      description: 'カメラの基本的な使い方と撮影のコツ',
      icon: 'camera-alt',
      difficulty: 'beginner',
      duration: '3分',
      steps: [
        {
          id: 'step-1',
          title: 'カメラを起動',
          description: 'ホーム画面からカメラボタンをタップして起動します',
          tips: [
            'カメラアイコンは画面下部にあります',
            '初回起動時はカメラ権限の許可が必要です',
          ],
        },
        {
          id: 'step-2',
          title: '被写体をフレームイン',
          description: '撮影したい商品をカメラのフレーム内に収めます',
          tips: [
            '商品全体が画面に入るようにしてください',
            '背景はシンプルにすると認識精度が向上します',
            '十分な明るさを確保してください',
          ],
        },
        {
          id: 'step-3',
          title: 'シャッターボタンをタップ',
          description: '画面下部の大きな丸いボタンをタップして撮影します',
          tips: [
            'ボタンを軽くタップしてください',
            '撮影中はカメラを動かさないでください',
          ],
        },
      ],
    },
    {
      id: 'ai-recognition',
      title: 'AI認識を活用する',
      description: 'AI物体認識機能の効果的な使い方',
      icon: 'smart-toy',
      difficulty: 'intermediate',
      duration: '5分',
      steps: [
        {
          id: 'ai-step-1',
          title: '認識モードを選択',
          description: '撮影前に適切な認識モードを選択します',
          tips: [
            '一般的な商品: 物体認識モード',
            'QRコード付き商品: QRモード',
            'バーコード付き商品: バーコードモード',
          ],
        },
        {
          id: 'ai-step-2',
          title: '最適な撮影条件',
          description: 'AI認識の精度を上げるための撮影のコツ',
          tips: [
            '商品のラベルや特徴的な部分を正面から撮影',
            '影や反射を避ける',
            'ピントをしっかり合わせる',
            '商品を中央に配置する',
          ],
        },
        {
          id: 'ai-step-3',
          title: '認識結果を確認・編集',
          description: 'AI認識の結果を確認し、必要に応じて編集します',
          tips: [
            '認識結果の信頼度をチェック',
            '間違いがあれば手動で修正',
            '追加情報があれば入力',
          ],
        },
      ],
    },
    {
      id: 'qr-barcode',
      title: 'QR・バーコード撮影',
      description: 'QRコードとバーコードの効果的な読み取り方法',
      icon: 'qr-code-scanner',
      difficulty: 'beginner',
      duration: '2分',
      steps: [
        {
          id: 'qr-step-1',
          title: 'コードを画面中央に配置',
          description: 'QRコードやバーコードを画面の中央に配置します',
          tips: [
            'コード全体がフレーム内に収まるようにする',
            '距離を調整してピントを合わせる',
            '真正面から撮影する',
          ],
        },
        {
          id: 'qr-step-2',
          title: '適切な距離を保つ',
          description: 'コードのサイズに応じて適切な距離を保ちます',
          tips: [
            '小さなコード: 10-15cm',
            '中程度のコード: 20-30cm',
            '大きなコード: 30-50cm',
          ],
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'トラブルシューティング',
      description: '撮影時の問題解決方法',
      icon: 'build',
      difficulty: 'intermediate',
      duration: '4分',
      steps: [
        {
          id: 'trouble-1',
          title: 'ピントが合わない',
          description: 'オートフォーカスが上手く動作しない場合の対処法',
          tips: [
            '画面をタップして手動フォーカス',
            '被写体との距離を調整',
            'レンズを清拭する',
            '明るい場所で撮影する',
          ],
        },
        {
          id: 'trouble-2',
          title: 'AI認識が上手くいかない',
          description: 'AI認識の精度が低い場合の改善方法',
          tips: [
            '照明を改善する',
            '背景をシンプルにする',
            '商品を正面から撮影する',
            '複数回撮影して最適な結果を選ぶ',
          ],
        },
        {
          id: 'trouble-3',
          title: 'アプリが重い・遅い',
          description: 'パフォーマンスの問題を解決する方法',
          tips: [
            'アプリを再起動する',
            '他のアプリを終了する',
            'デバイスを再起動する',
            'ストレージの空き容量を確認する',
          ],
        },
      ],
    },
  ];

  const helpTopicsList: HelpTopic[] = [
    {
      id: 'camera-permissions',
      title: 'カメラ権限について',
      category: '設定',
      icon: 'security',
      content: 'アプリを使用するにはカメラへのアクセス権限が必要です。設定アプリからOrdoの権限を確認し、カメラへのアクセスを有効にしてください。',
      faqs: [
        {
          question: '権限を拒否してしまった場合は？',
          answer: '設定アプリ > アプリ > Ordo > 権限 から手動で有効にできます。',
        },
        {
          question: '権限を与えても動作しない場合は？',
          answer: 'アプリを完全に終了してから再起動してください。',
        },
      ],
    },
    {
      id: 'photo-quality',
      title: '写真の品質設定',
      category: '撮影',
      icon: 'high-quality',
      content: '撮影する写真の品質を調整できます。高品質にするとファイルサイズが大きくなりますが、AI認識の精度が向上します。',
      faqs: [
        {
          question: 'どの品質設定がおすすめですか？',
          answer: '通常は「高」設定で十分です。ストレージが不足している場合は「中」を選択してください。',
        },
      ],
    },
    {
      id: 'ai-accuracy',
      title: 'AI認識の精度向上',
      category: 'AI機能',
      icon: 'psychology',
      content: 'AI認識の精度を向上させるためのベストプラクティスとコツをご紹介します。',
      faqs: [
        {
          question: '認識結果が間違っている場合は？',
          answer: '認識結果画面で手動で修正できます。また、フィードバックを送信していただくとAIの学習に役立ちます。',
        },
      ],
    },
  ];

  // =============================================================================
  // LIFECYCLE & INITIALIZATION
  // =============================================================================

  useEffect(() => {
    setHelpTopics(helpTopicsList);
    
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
  }, []);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleStartGuide = (guide: GuideSection) => {
    setSelectedGuide(guide);
    setCurrentStep(0);
    setShowTutorial(true);
  };

  const handleNextStep = () => {
    if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteTutorial();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteTutorial = () => {
    setShowTutorial(false);
    setSelectedGuide(null);
    setCurrentStep(0);
  };

  const handleStartPractice = () => {
    setShowTutorial(false);
    navigation.navigate('MainTabs', { screen: 'Camera' });
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
        
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          カメラガイド
        </Text>

        <IconButton
          icon="search"
          size={24}
          onPress={() => {
            // TODO: 検索機能
          }}
        />
      </View>
    </Surface>
  );

  const renderSectionTabs = () => (
    <Surface style={styles.tabsContainer} elevation={1}>
      <View style={styles.tabs}>
        {[
          { key: 'guides', label: 'ガイド', icon: 'school' },
          { key: 'help', label: 'ヘルプ', icon: 'help' },
          { key: 'tips', label: 'コツ', icon: 'lightbulb' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeSection === tab.key && [styles.activeTab, { borderBottomColor: theme.colors.primary }],
            ]}
            onPress={() => setActiveSection(tab.key as any)}
          >
            <Icon 
              name={tab.icon} 
              size={20} 
              color={activeSection === tab.key ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text 
              style={[
                styles.tabLabel,
                { color: activeSection === tab.key ? theme.colors.primary : theme.colors.onSurfaceVariant }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Surface>
  );

  const renderGuidesSection = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.guidesGrid}>
        {guideSections.map((guide) => (
          <Card key={guide.id} style={styles.guideCard}>
            <Card.Content>
              <View style={styles.guideHeader}>
                <Icon name={guide.icon} size={32} color={theme.colors.primary} />
                <Chip 
                  mode="outlined" 
                  compact
                  style={[styles.difficultyChip, { borderColor: getDifficultyColor(guide.difficulty) }]}
                  textStyle={{ color: getDifficultyColor(guide.difficulty) }}
                >
                  {getDifficultyLabel(guide.difficulty)}
                </Chip>
              </View>
              
              <Text style={[styles.guideTitle, { color: theme.colors.onSurface }]}>
                {guide.title}
              </Text>
              
              <Text style={[styles.guideDescription, { color: theme.colors.onSurfaceVariant }]}>
                {guide.description}
              </Text>
              
              <View style={styles.guideMeta}>
                <View style={styles.guideMetaItem}>
                  <Icon name="schedule" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.guideMetaText, { color: theme.colors.onSurfaceVariant }]}>
                    {guide.duration}
                  </Text>
                </View>
                
                <View style={styles.guideMetaItem}>
                  <Icon name="list" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.guideMetaText, { color: theme.colors.onSurfaceVariant }]}>
                    {guide.steps.length}ステップ
                  </Text>
                </View>
              </View>
            </Card.Content>
            
            <Card.Actions>
              <Button 
                mode="contained" 
                onPress={() => handleStartGuide(guide)}
                style={styles.startButton}
              >
                ガイドを開始
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </View>
    </ScrollView>
  );

  const renderHelpSection = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {helpTopics.map((topic) => (
        <Card key={topic.id} style={styles.helpCard}>
          <List.Item
            title={topic.title}
            description={topic.category}
            left={() => <Icon name={topic.icon} size={24} color={theme.colors.primary} />}
            right={() => <Icon name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />}
            onPress={() => {
              // TODO: ヘルプ詳細画面に遷移
            }}
          />
        </Card>
      ))}
    </ScrollView>
  );

  const renderTipsSection = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.tipsCard}>
        <Card.Content>
          <Text style={[styles.tipsTitle, { color: theme.colors.onSurface }]}>
            撮影のコツ
          </Text>
          
          {[
            '十分な明るさを確保する',
            '商品を中央に配置する',
            '背景をシンプルにする',
            'ピントをしっかり合わせる',
            '商品全体をフレームに収める',
            '複数の角度から撮影する',
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="check-circle" size={20} color={COLORS.SUCCESS} />
              <Text style={[styles.tipText, { color: theme.colors.onSurface }]}>
                {tip}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderTutorialModal = () => {
    if (!showTutorial || !selectedGuide) return null;

    const currentStepData = selectedGuide.steps[currentStep];
    const isLastStep = currentStep === selectedGuide.steps.length - 1;

    return (
      <Portal>
        <Modal visible={showTutorial} dismissable={false}>
          <View style={styles.tutorialContainer}>
            <Surface style={styles.tutorialCard} elevation={4}>
              {/* ヘッダー */}
              <View style={styles.tutorialHeader}>
                <Text style={[styles.tutorialTitle, { color: theme.colors.onSurface }]}>
                  {selectedGuide.title}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={handleCompleteTutorial}
                />
              </View>

              {/* プログレスバー */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${((currentStep + 1) / selectedGuide.steps.length) * 100}%`,
                        backgroundColor: theme.colors.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                  {currentStep + 1} / {selectedGuide.steps.length}
                </Text>
              </View>

              {/* ステップ内容 */}
              <ScrollView style={styles.tutorialContent}>
                <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                  {currentStepData.title}
                </Text>
                
                <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {currentStepData.description}
                </Text>

                {currentStepData.tips && (
                  <View style={styles.tipsContainer}>
                    <Text style={[styles.tipsHeader, { color: theme.colors.primary }]}>
                      💡 コツ
                    </Text>
                    {currentStepData.tips.map((tip, index) => (
                      <Text key={index} style={[styles.tipText, { color: theme.colors.onSurfaceVariant }]}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* アクションボタン */}
              <View style={styles.tutorialActions}>
                <Button
                  mode="outlined"
                  onPress={handlePrevStep}
                  disabled={currentStep === 0}
                  style={styles.tutorialButton}
                >
                  前へ
                </Button>
                
                <Button
                  mode="contained"
                  onPress={isLastStep ? handleStartPractice : handleNextStep}
                  style={styles.tutorialButton}
                >
                  {isLastStep ? '実践する' : '次へ'}
                </Button>
              </View>
            </Surface>
          </View>
        </Modal>
      </Portal>
    );
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return COLORS.SUCCESS;
      case 'intermediate': return COLORS.WARNING;
      case 'advanced': return COLORS.ERROR;
      default: return theme.colors.outline;
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      default: return '不明';
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'guides':
        return renderGuidesSection();
      case 'help':
        return renderHelpSection();
      case 'tips':
        return renderTipsSection();
      default:
        return renderGuidesSection();
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

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
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      
      {renderHeader()}
      {renderSectionTabs()}
      {renderContent()}
      {renderTutorialModal()}

      {/* クイックアクセスFAB */}
      <FAB
        icon="play-arrow"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Camera' })}
        label="撮影開始"
      />
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
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  tabsContainer: {
    paddingVertical: SPACING.SM,
  },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    marginHorizontal: SPACING.XS,
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

  content: {
    flex: 1,
    padding: SPACING.MD,
  },

  guidesGrid: {
    gap: SPACING.MD,
  },

  guideCard: {
    marginBottom: SPACING.SM,
  },

  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },

  difficultyChip: {
    height: 24,
  },

  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },

  guideDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.MD,
  },

  guideMeta: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  guideMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },

  guideMetaText: {
    fontSize: 12,
  },

  startButton: {
    marginLeft: 'auto',
  },

  helpCard: {
    marginBottom: SPACING.SM,
  },

  tipsCard: {
    marginBottom: SPACING.MD,
  },

  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },

  tipText: {
    fontSize: 14,
    flex: 1,
  },

  tutorialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.LG,
  },

  tutorialCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    padding: SPACING.LG,
  },

  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },

  tutorialTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },

  progressContainer: {
    marginBottom: SPACING.LG,
  },

  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.XS,
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },

  tutorialContent: {
    flex: 1,
    marginBottom: SPACING.LG,
  },

  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },

  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.MD,
  },

  tipsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.MD,
  },

  tipsHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },

  tutorialActions: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },

  tutorialButton: {
    flex: 1,
  },

  fab: {
    position: 'absolute',
    bottom: SPACING.LG,
    right: SPACING.LG,
  },
});

export default CameraGuideSystem;
