import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'minimal';
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Ordo App Logo Component
 * AI ホーム管理アプリのロゴ
 * 
 * デザインコンセプト:
 * - 円形ベース：統合と完全性を表現
 * - AIネットワーク：接続されたノードパターン
 * - ホーム要素：家の形状を抽象化
 * - グラデーション：革新性と未来感
 */
export const OrdoLogo: React.FC<LogoProps> = ({
  size = 120,
  variant = 'full',
  colors = {
    primary: '#6366F1',
    secondary: '#8B5CF6', 
    accent: '#10B981',
  },
}) => {
  const renderFullLogo = () => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        {/* メイングラデーション */}
        <LinearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary} />
          <Stop offset="100%" stopColor={colors.secondary} />
        </LinearGradient>
        
        {/* アクセントグラデーション */}
        <LinearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor={colors.primary} />
        </LinearGradient>
      </Defs>
      
      {/* 外側の円（ベース） */}
      <Circle
        cx="60"
        cy="60"
        r="55"
        fill="url(#mainGradient)"
        opacity="0.1"
      />
      
      {/* メインの円 */}
      <Circle
        cx="60"
        cy="60"
        r="45"
        fill="url(#mainGradient)"
      />
      
      {/* ホームアイコン（抽象化） */}
      <Path
        d="M35 65 L60 45 L85 65 L85 85 L70 85 L70 70 L50 70 L50 85 L35 85 Z"
        fill="white"
        opacity="0.9"
      />
      
      {/* AIネットワークノード */}
      <G>
        {/* 中央ノード */}
        <Circle cx="60" cy="60" r="3" fill="white" />
        
        {/* 周辺ノード */}
        <Circle cx="45" cy="50" r="2" fill="url(#accentGradient)" />
        <Circle cx="75" cy="50" r="2" fill="url(#accentGradient)" />
        <Circle cx="45" cy="70" r="2" fill="url(#accentGradient)" />
        <Circle cx="75" cy="70" r="2" fill="url(#accentGradient)" />
        
        {/* 接続線 */}
        <Path
          d="M60 60 L45 50 M60 60 L75 50 M60 60 L45 70 M60 60 L75 70"
          stroke="white"
          strokeWidth="1"
          opacity="0.6"
        />
      </G>
      
      {/* スマート要素（小さな点） */}
      <G opacity="0.4">
        <Circle cx="40" cy="40" r="1" fill="white" />
        <Circle cx="80" cy="40" r="1" fill="white" />
        <Circle cx="40" cy="80" r="1" fill="white" />
        <Circle cx="80" cy="80" r="1" fill="white" />
      </G>
    </Svg>
  );

  const renderIconOnly = () => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary} />
          <Stop offset="100%" stopColor={colors.secondary} />
        </LinearGradient>
      </Defs>
      
      {/* シンプルな円形ベース */}
      <Circle
        cx="60"
        cy="60"
        r="50"
        fill="url(#iconGradient)"
      />
      
      {/* "O"文字をスタイライズ */}
      <Path
        d="M60 30 A30 30 0 1 1 60 90 A30 30 0 1 1 60 30 Z M60 40 A20 20 0 1 0 60 80 A20 20 0 1 0 60 40 Z"
        fill="white"
      />
      
      {/* 中央のドット（AI要素） */}
      <Circle cx="60" cy="60" r="4" fill={colors.accent} />
    </Svg>
  );

  const renderMinimal = () => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle
        cx="60"
        cy="60"
        r="50"
        fill={colors.primary}
      />
      <Path
        d="M35 65 L60 45 L85 65 L85 85 L35 85 Z"
        fill="white"
        opacity="0.9"
      />
    </Svg>
  );

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {variant === 'full' && renderFullLogo()}
      {variant === 'icon' && renderIconOnly()}
      {variant === 'minimal' && renderMinimal()}
    </View>
  );
};

export default OrdoLogo;
