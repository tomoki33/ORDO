import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { OrdoLogo } from './OrdoLogo';
import { BRANDING } from '../../config/branding';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  skipAnimation?: boolean;
}

/**
 * Ordo App Splash Screen Component
 * アプリ起動時のスプラッシュ画面
 * 
 * 特徴:
 * - ブランドロゴの表示
 * - フェードインアニメーション
 * - アプリ名とタグラインの表示
 * - ローディング効果
 * - 自動非表示機能
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
  skipAnimation = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (skipAnimation) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      textFadeAnim.setValue(1);
      setShowContent(true);
      return;
    }

    const animationSequence = Animated.sequence([
      // フェードイン + スケールアップ
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      
      // 少し待機
      Animated.delay(300),
      
      // テキストフェードイン
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      
      // 表示時間
      Animated.delay(BRANDING.SPLASH_SCREEN.AUTO_HIDE_DELAY - 1700),
      
      // フェードアウト
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    setShowContent(true);
    animationSequence.start(() => {
      onAnimationComplete?.();
    });
  }, [skipAnimation, fadeAnim, scaleAnim, textFadeAnim, onAnimationComplete]);

  if (!showContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={BRANDING.SPLASH_SCREEN.BACKGROUND_COLOR}
        barStyle="light-content"
        translucent={true}
      />
      
      {/* メインコンテンツ */}
      <View style={styles.content}>
        {/* ロゴアニメーション */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <OrdoLogo
            size={BRANDING.SPLASH_SCREEN.LOGO_SIZE}
            variant="full"
            colors={{
              primary: BRANDING.BRAND_COLORS.WHITE,
              secondary: BRANDING.BRAND_COLORS.GRAY_LIGHT,
              accent: BRANDING.BRAND_COLORS.ACCENT,
            }}
          />
        </Animated.View>

        {/* アプリ名・タグライン */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
            },
          ]}
        >
          <Text style={styles.appName}>{BRANDING.APP_NAME}</Text>
          <Text style={styles.tagline}>{BRANDING.APP_TAGLINE}</Text>
        </Animated.View>
      </View>

      {/* バージョン情報 */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: textFadeAnim,
          },
        ]}
      >
        <Text style={styles.version}>v{BRANDING.APP_VERSION}</Text>
      </Animated.View>

      {/* 背景グラデーション効果 */}
      <View style={styles.backgroundGradient} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRANDING.SPLASH_SCREEN.BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: BRANDING.BRAND_COLORS.WHITE,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: BRANDING.BRAND_COLORS.GRAY_LIGHT,
    letterSpacing: 1,
    textAlign: 'center',
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: BRANDING.BRAND_COLORS.GRAY_LIGHT,
    opacity: 0.7,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // グラデーション効果のためのオーバーレイ
    opacity: 0.1,
  },
});

export default SplashScreen;
