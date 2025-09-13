/**
 * Voice UI Components
 * 音声認識用のUIコンポーネント群
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { voiceRecognitionService, VoiceRecognitionResult } from '../services/VoiceRecognitionService';
import { voiceCommandService } from '../services/VoiceCommandAnalysisService';
import { multilingualService } from '../services/MultilingualExtensionService';

const { width, height } = Dimensions.get('window');

// === 音声認識ボタンコンポーネント ===
interface VoiceRecognitionButtonProps {
  onStart?: () => void;
  onStop?: () => void;
  onResult?: (result: VoiceRecognitionResult) => void;
  onError?: (error: any) => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  disabled?: boolean;
}

export const VoiceRecognitionButton: React.FC<VoiceRecognitionButtonProps> = ({
  onStart,
  onStop,
  onResult,
  onError,
  style,
  size = 'medium',
  theme = 'light',
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (disabled) return;

    try {
      if (isListening) {
        await handleStopListening();
      } else {
        await handleStartListening();
      }
    } catch (error) {
      console.error('Voice recognition error:', error);
      onError?.(error);
    }
  };

  const handleStartListening = async () => {
    setIsListening(true);
    setIsProcessing(false);
    onStart?.();

    // スケールアニメーション
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();

    try {
      await voiceCommandService.startListening();
    } catch (error) {
      setIsListening(false);
      throw error;
    }
  };

  const handleStopListening = async () => {
    setIsListening(false);
    setIsProcessing(true);
    onStop?.();

    // スケールアニメーション
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      await voiceCommandService.stopListening();
    } finally {
      setIsProcessing(false);
    }
  };

  const getSizeStyles = () => {
    const sizes = {
      small: { width: 50, height: 50, borderRadius: 25 },
      medium: { width: 70, height: 70, borderRadius: 35 },
      large: { width: 90, height: 90, borderRadius: 45 },
    };
    return sizes[size];
  };

  const getThemeStyles = () => {
    const themes = {
      light: {
        backgroundColor: isListening ? '#FF6B6B' : '#4ECDC4',
        shadowColor: '#000',
      },
      dark: {
        backgroundColor: isListening ? '#FF8A8A' : '#6EE8E0',
        shadowColor: '#FFF',
      },
    };
    return themes[theme];
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isProcessing}
      style={[styles.voiceButton, getSizeStyles(), getThemeStyles(), style]}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.buttonInner,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.pulseRing,
            getSizeStyles(),
            {
              backgroundColor: getThemeStyles().backgroundColor,
              opacity: isListening ? 0.3 : 0,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        
        {isProcessing ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <View style={styles.microphoneIcon}>
            <View style={[styles.micBody, { backgroundColor: '#FFF' }]} />
            <View style={[styles.micStand, { backgroundColor: '#FFF' }]} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// === 音声フィードバックコンポーネント ===
interface VoiceFeedbackProps {
  isVisible: boolean;
  text: string;
  confidence?: number;
  language?: string;
  onDismiss?: () => void;
  style?: any;
}

export const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({
  isVisible,
  text,
  confidence = 0,
  language = 'ja-JP',
  onDismiss,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 自動消去タイマー
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  return (
    <Animated.View
      style={[
        styles.feedbackContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.feedbackContent}>
        <Text style={styles.feedbackText}>{text}</Text>
        
        <View style={styles.feedbackMeta}>
          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceLabel}>信頼度</Text>
            <View style={styles.confidenceTrack}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${confidence * 100}%`,
                    backgroundColor: getConfidenceColor(),
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
          </View>
          
          <Text style={styles.languageIndicator}>{language}</Text>
        </View>
        
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// === 音声波形ビジュアライザー ===
interface VoiceVisualizerProps {
  isActive: boolean;
  audioLevel?: number;
  style?: any;
  color?: string;
  barCount?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive,
  audioLevel = 0,
  style,
  color = '#4ECDC4',
  barCount = 5,
}) => {
  const animValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      startVisualization();
    } else {
      stopVisualization();
    }
  }, [isActive]);

  const startVisualization = () => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: 200 + Math.random() * 300,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 200 + Math.random() * 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animValues.forEach((value, index) => {
      createAnimation(value, index * 100).start();
    });
  };

  const stopVisualization = () => {
    animValues.forEach(value => {
      value.stopAnimation();
      Animated.timing(value, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View style={[styles.visualizerContainer, style]}>
      {animValues.map((animValue, index) => (
        <Animated.View
          key={index}
          style={[
            styles.visualizerBar,
            {
              backgroundColor: color,
              transform: [{ scaleY: animValue }],
            },
          ]}
        />
      ))}
    </View>
  );
};

// === 言語選択コンポーネント ===
interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  style?: any;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  useEffect(() => {
    const languages = multilingualService.getSupportedLanguages();
    setSupportedLanguages(languages);
  }, []);

  const getLanguageDisplayName = (langCode: string) => {
    const model = multilingualService.getLanguageModel(langCode);
    return model ? `${model.nativeName} (${model.name})` : langCode;
  };

  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language);
    setIsExpanded(false);
  };

  return (
    <View style={[styles.languageSelectorContainer, style]}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.languageSelectorButton}
      >
        <Text style={styles.languageSelectorText}>
          {getLanguageDisplayName(currentLanguage)}
        </Text>
        <Text style={styles.languageSelectorArrow}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.languageDropdown}>
          {supportedLanguages.map(language => (
            <TouchableOpacity
              key={language}
              onPress={() => handleLanguageSelect(language)}
              style={[
                styles.languageOption,
                language === currentLanguage && styles.languageOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  language === currentLanguage && styles.languageOptionTextActive,
                ]}
              >
                {getLanguageDisplayName(language)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// === 音声コマンドヘルプコンポーネント ===
interface VoiceCommandHelpProps {
  isVisible: boolean;
  onClose: () => void;
  language?: string;
}

export const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isVisible,
  onClose,
  language = 'ja-JP',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getCommandExamples = () => {
    const model = multilingualService.getLanguageModel(language);
    if (!model) return [];

    const examples = [
      { intent: 'ADD_PRODUCT', example: language === 'ja-JP' ? 'りんごを3つ追加' : 'Add 3 apples' },
      { intent: 'REMOVE_PRODUCT', example: language === 'ja-JP' ? 'バナナを削除' : 'Remove bananas' },
      { intent: 'SEARCH_PRODUCT', example: language === 'ja-JP' ? '牛乳を検索' : 'Search for milk' },
      { intent: 'CHECK_INVENTORY', example: language === 'ja-JP' ? '在庫を確認' : 'Check inventory' },
      { intent: 'SHOW_EXPIRY', example: language === 'ja-JP' ? '期限を確認' : 'Check expiry dates' },
    ];

    return examples;
  };

  return (
    <Animated.View
      style={[
        styles.helpOverlay,
        { opacity: fadeAnim },
      ]}
    >
      <View style={styles.helpContainer}>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>
            {language === 'ja-JP' ? '音声コマンド一覧' : 'Voice Commands'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.helpCloseButton}>
            <Text style={styles.helpCloseText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContent}>
          <Text style={styles.helpDescription}>
            {language === 'ja-JP' 
              ? 'マイクボタンを押して、以下のような音声コマンドを話してください：' 
              : 'Press the microphone button and speak commands like these:'}
          </Text>

          {getCommandExamples().map((item, index) => (
            <View key={index} style={styles.helpExample}>
              <Text style={styles.helpExampleText}>"{item.example}"</Text>
            </View>
          ))}

          <Text style={styles.helpTips}>
            {language === 'ja-JP' 
              ? 'コツ: 静かな環境で、はっきりと話してください。' 
              : 'Tips: Speak clearly in a quiet environment.'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// === スタイル定義 ===
const styles = StyleSheet.create({
  // 音声認識ボタン
  voiceButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonInner: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  microphoneIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 12,
    height: 20,
    borderRadius: 6,
    marginBottom: 4,
  },
  micStand: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },

  // 音声フィードバック
  feedbackContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  feedbackContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  feedbackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceBar: {
    flex: 1,
    marginRight: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  confidenceTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  languageIndicator: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },

  // 音声ビジュアライザー
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  visualizerBar: {
    width: 4,
    height: 30,
    marginHorizontal: 2,
    borderRadius: 2,
  },

  // 言語選択
  languageSelectorContainer: {
    position: 'relative',
  },
  languageSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 150,
  },
  languageSelectorText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  languageSelectorArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  languageDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    marginTop: 4,
  },
  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  languageOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  languageOptionText: {
    fontSize: 14,
    color: '#333',
  },
  languageOptionTextActive: {
    color: '#1976D2',
    fontWeight: '600',
  },

  // ヘルプ
  helpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  helpContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    maxHeight: height * 0.8,
    width: width - 40,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  helpCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpCloseText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  helpContent: {
    padding: 20,
  },
  helpDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  helpExample: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  helpExampleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  helpTips: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
});
