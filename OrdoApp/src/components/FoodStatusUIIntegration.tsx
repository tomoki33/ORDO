/**
 * UI表示統合コンポーネント (4時間実装)
 * 
 * 新鮮度・状態分類結果をユーザーフレンドリーなUIで表示
 * - リアルタイム状態表示
 * - インタラクティブな詳細情報
 * - アニメーション付きスコア表示
 * - アクセシブルなデザイン
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { FreshnessScore, FreshnessLevel } from '../services/FreshnessDetectionService';
import { 
  StateClassificationResult, 
  FoodState, 
  QualityGrade, 
  ConsumptionRecommendation 
} from '../services/StateClassificationService';

interface UIIntegrationProps {
  freshnessData: FreshnessScore | null;
  stateData: StateClassificationResult | null;
  isLoading: boolean;
  onRefresh?: () => void;
  onActionTaken?: (action: string) => void;
}

interface StatusCardProps {
  title: string;
  score: number;
  level: string;
  color: string;
  details: string[];
  onPress?: () => void;
}

interface ActionButtonProps {
  text: string;
  type: 'primary' | 'secondary' | 'warning' | 'danger';
  onPress: () => void;
  disabled?: boolean;
}

export const FoodStatusUIIntegration: React.FC<UIIntegrationProps> = ({
  freshnessData,
  stateData,
  isLoading,
  onRefresh,
  onActionTaken
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [animationValues] = useState({
    freshness: new Animated.Value(0),
    state: new Animated.Value(0),
    overall: new Animated.Value(0)
  });

  // アニメーション実行
  useEffect(() => {
    if (freshnessData && stateData) {
      Animated.sequence([
        Animated.timing(animationValues.freshness, {
          toValue: freshnessData.overall,
          duration: 1000,
          useNativeDriver: false
        }),
        Animated.timing(animationValues.state, {
          toValue: stateData.stateScore,
          duration: 1000,
          useNativeDriver: false
        }),
        Animated.timing(animationValues.overall, {
          toValue: (freshnessData.overall + stateData.stateScore) / 2,
          duration: 800,
          useNativeDriver: false
        })
      ]).start();
    }
  }, [freshnessData, stateData]);

  const handleCardPress = useCallback((cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  }, [expandedCard]);

  const handleActionPress = useCallback((action: string) => {
    onActionTaken?.(action);
  }, [onActionTaken]);

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!freshnessData || !stateData) {
    return <EmptyState onRefresh={onRefresh} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 総合ステータスヘッダー */}
      <OverallStatusHeader 
        freshnessData={freshnessData}
        stateData={stateData}
        animationValue={animationValues.overall}
      />

      {/* 新鮮度カード */}
      <StatusCard
        title="新鮮度分析"
        score={freshnessData.overall}
        level={getFreshnessLevelText(freshnessData.prediction)}
        color={getFreshnessColor(freshnessData.prediction)}
        details={getFreshnessDetails(freshnessData)}
        onPress={() => handleCardPress('freshness')}
      />

      {expandedCard === 'freshness' && (
        <FreshnessDetailView data={freshnessData} />
      )}

      {/* 状態分類カード */}
      <StatusCard
        title="状態分類"
        score={stateData.stateScore}
        level={getStateText(stateData.foodState)}
        color={getStateColor(stateData.foodState)}
        details={getStateDetails(stateData)}
        onPress={() => handleCardPress('state')}
      />

      {expandedCard === 'state' && (
        <StateDetailView data={stateData} />
      )}

      {/* 品質グレード */}
      <QualityGradeCard grade={stateData.qualityGrade} />

      {/* 消費推奨 */}
      <ConsumptionRecommendationCard 
        recommendation={stateData.consumptionRecommendation}
        onActionPress={handleActionPress}
      />

      {/* リスク要因 */}
      {stateData.riskFactors.length > 0 && (
        <RiskFactorsCard riskFactors={stateData.riskFactors} />
      )}

      {/* アクションアイテム */}
      <ActionItemsCard 
        actionItems={stateData.actionItems}
        onActionPress={handleActionPress}
      />

      {/* 詳細分析結果 */}
      <DetailedAnalysisCard analysis={stateData.detailedAnalysis} />
    </ScrollView>
  );
};

// 総合ステータスヘッダーコンポーネント
const OverallStatusHeader: React.FC<{
  freshnessData: FreshnessScore;
  stateData: StateClassificationResult;
  animationValue: Animated.Value;
}> = ({ freshnessData, stateData, animationValue }) => {
  const overallScore = (freshnessData.overall + stateData.stateScore) / 2;
  const overallStatus = getOverallStatus(overallScore);

  return (
    <View style={[styles.headerCard, { backgroundColor: getOverallColor(overallScore) }]}>
      <Text style={styles.headerTitle}>食品総合評価</Text>
      
      <View style={styles.scoreContainer}>
        <Animated.Text style={[styles.scoreText, { opacity: animationValue.interpolate({
          inputRange: [0, 100],
          outputRange: [0.3, 1]
        })}]}>
          {Math.round(overallScore)}
        </Animated.Text>
        <Text style={styles.scoreUnit}>%</Text>
      </View>

      <Text style={styles.statusText}>{overallStatus}</Text>
      
      <View style={styles.quickInfoContainer}>
        <Text style={styles.quickInfo}>
          新鮮度: {getFreshnessLevelText(freshnessData.prediction)}
        </Text>
        <Text style={styles.quickInfo}>
          状態: {getStateText(stateData.foodState)}
        </Text>
        <Text style={styles.quickInfo}>
          推奨: {getRecommendationText(stateData.consumptionRecommendation)}
        </Text>
      </View>
    </View>
  );
};

// ステータスカードコンポーネント
const StatusCard: React.FC<StatusCardProps> = ({
  title,
  score,
  level,
  color,
  details,
  onPress
}) => {
  return (
    <TouchableOpacity style={styles.statusCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.scoreIndicator, { backgroundColor: color }]}>
          <Text style={styles.scoreIndicatorText}>{score}%</Text>
        </View>
      </View>

      <Text style={[styles.levelText, { color }]}>{level}</Text>

      <View style={styles.detailsContainer}>
        {details.slice(0, 2).map((detail, index) => (
          <Text key={index} style={styles.detailText}>• {detail}</Text>
        ))}
        {details.length > 2 && (
          <Text style={styles.moreText}>他 {details.length - 2} 項目...</Text>
        )}
      </View>

      <Text style={styles.expandHint}>タップして詳細を表示</Text>
    </TouchableOpacity>
  );
};

// 新鮮度詳細ビュー
const FreshnessDetailView: React.FC<{ data: FreshnessScore }> = ({ data }) => {
  return (
    <View style={styles.detailView}>
      <Text style={styles.detailTitle}>新鮮度詳細分析</Text>
      
      <View style={styles.scoreBreakdown}>
        <ScoreBar label="色彩スコア" score={data.colorScore} />
        <ScoreBar label="テクスチャスコア" score={data.textureScore} />
        <ScoreBar label="形状スコア" score={data.shapeScore} />
      </View>

      <View style={styles.metricRow}>
        <MetricItem label="信頼度" value={`${(data.confidence * 100).toFixed(1)}%`} />
        <MetricItem label="推定賞味期限" value={`${data.estimatedShelfLife}日`} />
      </View>
    </View>
  );
};

// 状態詳細ビュー
const StateDetailView: React.FC<{ data: StateClassificationResult }> = ({ data }) => {
  return (
    <View style={styles.detailView}>
      <Text style={styles.detailTitle}>状態分類詳細</Text>
      
      <View style={styles.analysisGrid}>
        <AnalysisItem 
          title="視覚的外観"
          analysis={data.detailedAnalysis.visualAppearance}
        />
        <AnalysisItem 
          title="構造的完全性"
          analysis={data.detailedAnalysis.structuralIntegrity}
        />
        <AnalysisItem 
          title="劣化レベル"
          analysis={data.detailedAnalysis.degradationLevel}
        />
        <AnalysisItem 
          title="安全性評価"
          analysis={data.detailedAnalysis.safetyAssessment}
        />
      </View>

      <View style={styles.metricRow}>
        <MetricItem label="信頼度" value={`${(data.confidence * 100).toFixed(1)}%`} />
        <MetricItem label="品質グレード" value={getQualityGradeText(data.qualityGrade)} />
      </View>
    </View>
  );
};

// 品質グレードカード
const QualityGradeCard: React.FC<{ grade: QualityGrade }> = ({ grade }) => {
  const gradeColor = getQualityGradeColor(grade);
  const gradeText = getQualityGradeText(grade);
  const gradeDescription = getQualityGradeDescription(grade);

  return (
    <View style={[styles.gradeCard, { borderLeftColor: gradeColor }]}>
      <View style={styles.gradeHeader}>
        <Text style={styles.gradeTitle}>品質グレード</Text>
        <Text style={[styles.gradeText, { color: gradeColor }]}>{gradeText}</Text>
      </View>
      <Text style={styles.gradeDescription}>{gradeDescription}</Text>
    </View>
  );
};

// 消費推奨カード
const ConsumptionRecommendationCard: React.FC<{
  recommendation: ConsumptionRecommendation;
  onActionPress: (action: string) => void;
}> = ({ recommendation, onActionPress }) => {
  const recommendationData = getRecommendationData(recommendation);

  return (
    <View style={[styles.recommendationCard, { backgroundColor: recommendationData.backgroundColor }]}>
      <Text style={styles.recommendationTitle}>消費推奨</Text>
      <Text style={[styles.recommendationText, { color: recommendationData.textColor }]}>
        {recommendationData.text}
      </Text>
      <Text style={styles.recommendationDescription}>
        {recommendationData.description}
      </Text>

      <View style={styles.actionButtonsContainer}>
        {recommendationData.actions.map((action, index) => (
          <ActionButton
            key={index}
            text={action.text}
            type={action.type}
            onPress={() => onActionPress(action.action)}
          />
        ))}
      </View>
    </View>
  );
};

// リスク要因カード
const RiskFactorsCard: React.FC<{ riskFactors: any[] }> = ({ riskFactors }) => {
  return (
    <View style={styles.riskCard}>
      <Text style={styles.riskTitle}>⚠️ リスク要因</Text>
      {riskFactors.map((risk, index) => (
        <View key={index} style={[styles.riskItem, { 
          backgroundColor: getRiskSeverityColor(risk.severity) 
        }]}>
          <Text style={styles.riskType}>{getRiskTypeText(risk.type)}</Text>
          <Text style={styles.riskDescription}>{risk.description}</Text>
          <Text style={styles.riskMitigation}>対策: {risk.mitigation}</Text>
        </View>
      ))}
    </View>
  );
};

// アクションアイテムカード
const ActionItemsCard: React.FC<{
  actionItems: string[];
  onActionPress: (action: string) => void;
}> = ({ actionItems, onActionPress }) => {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionTitle}>📋 推奨アクション</Text>
      {actionItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.actionItem}
          onPress={() => onActionPress(item)}
        >
          <Text style={styles.actionText}>• {item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 詳細分析カード
const DetailedAnalysisCard: React.FC<{ analysis: any }> = ({ analysis }) => {
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.analysisTitle}>詳細分析結果</Text>
      
      <View style={styles.analysisGrid}>
        <AnalysisItem title="視覚的外観" analysis={analysis.visualAppearance} />
        <AnalysisItem title="構造的完全性" analysis={analysis.structuralIntegrity} />
        <AnalysisItem title="劣化レベル" analysis={analysis.degradationLevel} />
        <AnalysisItem title="安全性評価" analysis={analysis.safetyAssessment} />
      </View>
    </View>
  );
};

// ヘルパーコンポーネント
const LoadingIndicator: React.FC = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>分析中...</Text>
  </View>
);

const EmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>データがありません</Text>
    {onRefresh && (
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshText}>再分析</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <View style={styles.scoreBarContainer}>
    <Text style={styles.scoreBarLabel}>{label}</Text>
    <View style={styles.scoreBarTrack}>
      <View style={[styles.scoreBarFill, { width: `${score}%` }]} />
    </View>
    <Text style={styles.scoreBarValue}>{score}%</Text>
  </View>
);

const MetricItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const AnalysisItem: React.FC<{ title: string; analysis: any }> = ({ title, analysis }) => (
  <View style={styles.analysisItem}>
    <Text style={styles.analysisItemTitle}>{title}</Text>
    <Text style={[styles.analysisScore, { color: getAnalysisLevelColor(analysis.level) }]}>
      {analysis.score}%
    </Text>
    <Text style={styles.analysisLevel}>{getAnalysisLevelText(analysis.level)}</Text>
  </View>
);

const ActionButton: React.FC<ActionButtonProps> = ({ text, type, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.actionButton, styles[`${type}Button`], disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.actionButtonText, styles[`${type}ButtonText`]]}>{text}</Text>
  </TouchableOpacity>
);

// ユーティリティ関数
const getFreshnessLevelText = (level: FreshnessLevel): string => {
  const texts = {
    [FreshnessLevel.FRESH]: '新鮮',
    [FreshnessLevel.GOOD]: '良好',
    [FreshnessLevel.ACCEPTABLE]: '許容',
    [FreshnessLevel.POOR]: '悪い',
    [FreshnessLevel.SPOILED]: '腐敗'
  };
  return texts[level] || '不明';
};

const getFreshnessColor = (level: FreshnessLevel): string => {
  const colors = {
    [FreshnessLevel.FRESH]: '#4CAF50',
    [FreshnessLevel.GOOD]: '#8BC34A',
    [FreshnessLevel.ACCEPTABLE]: '#FFC107',
    [FreshnessLevel.POOR]: '#FF9800',
    [FreshnessLevel.SPOILED]: '#F44336'
  };
  return colors[level] || '#757575';
};

const getStateText = (state: FoodState): string => {
  const texts = {
    [FoodState.EXCELLENT]: '最高品質',
    [FoodState.VERY_GOOD]: '非常に良好',
    [FoodState.GOOD]: '良好',
    [FoodState.FAIR]: '普通',
    [FoodState.POOR]: '悪い',
    [FoodState.BAD]: '非常に悪い',
    [FoodState.SPOILED]: '腐敗'
  };
  return texts[state] || '不明';
};

const getStateColor = (state: FoodState): string => {
  const colors = {
    [FoodState.EXCELLENT]: '#4CAF50',
    [FoodState.VERY_GOOD]: '#66BB6A',
    [FoodState.GOOD]: '#8BC34A',
    [FoodState.FAIR]: '#FFC107',
    [FoodState.POOR]: '#FF9800',
    [FoodState.BAD]: '#FF5722',
    [FoodState.SPOILED]: '#F44336'
  };
  return colors[state] || '#757575';
};

const getQualityGradeText = (grade: QualityGrade): string => {
  const texts = {
    [QualityGrade.PREMIUM]: 'プレミアム',
    [QualityGrade.STANDARD]: '標準',
    [QualityGrade.ECONOMY]: 'エコノミー',
    [QualityGrade.SUBSTANDARD]: '基準未満'
  };
  return texts[grade] || '不明';
};

const getQualityGradeColor = (grade: QualityGrade): string => {
  const colors = {
    [QualityGrade.PREMIUM]: '#9C27B0',
    [QualityGrade.STANDARD]: '#2196F3',
    [QualityGrade.ECONOMY]: '#FF9800',
    [QualityGrade.SUBSTANDARD]: '#F44336'
  };
  return colors[grade] || '#757575';
};

const getQualityGradeDescription = (grade: QualityGrade): string => {
  const descriptions = {
    [QualityGrade.PREMIUM]: '最高品質の食品です。栄養価が高く、味も優れています。',
    [QualityGrade.STANDARD]: '標準的な品質の食品です。安全で栄養価も適切です。',
    [QualityGrade.ECONOMY]: '経済的な品質レベルです。基本的な栄養は確保されています。',
    [QualityGrade.SUBSTANDARD]: '品質基準を下回っています。消費には注意が必要です。'
  };
  return descriptions[grade] || '品質情報が不明です。';
};

const getRecommendationText = (recommendation: ConsumptionRecommendation): string => {
  const texts = {
    [ConsumptionRecommendation.IMMEDIATE_CONSUME]: '即座に消費',
    [ConsumptionRecommendation.CONSUME_SOON]: '早めに消費',
    [ConsumptionRecommendation.CONSUME_NORMALLY]: '通常消費',
    [ConsumptionRecommendation.CONSUME_CAREFULLY]: '注意して消費',
    [ConsumptionRecommendation.COOK_BEFORE_CONSUME]: '加熱後消費',
    [ConsumptionRecommendation.DISCARD]: '廃棄推奨'
  };
  return texts[recommendation] || '不明';
};

const getRecommendationData = (recommendation: ConsumptionRecommendation) => {
  const data = {
    [ConsumptionRecommendation.IMMEDIATE_CONSUME]: {
      text: '今すぐ消費してください',
      description: '最高の状態です。今が一番美味しく安全に召し上がれます。',
      backgroundColor: '#E8F5E8',
      textColor: '#2E7D32',
      actions: [
        { text: '調理する', type: 'primary' as const, action: 'cook' },
        { text: '保存方法確認', type: 'secondary' as const, action: 'storage_tips' }
      ]
    },
    [ConsumptionRecommendation.CONSUME_SOON]: {
      text: '早めの消費をお勧めします',
      description: '品質は良好ですが、なるべく早く消費することを推奨します。',
      backgroundColor: '#FFF3E0',
      textColor: '#E65100',
      actions: [
        { text: '調理する', type: 'primary' as const, action: 'cook' },
        { text: '保存する', type: 'secondary' as const, action: 'store' }
      ]
    },
    [ConsumptionRecommendation.CONSUME_NORMALLY]: {
      text: '通常通り消費できます',
      description: '適切な状態です。通常の調理・保存方法で問題ありません。',
      backgroundColor: '#F3E5F5',
      textColor: '#7B1FA2',
      actions: [
        { text: '調理する', type: 'primary' as const, action: 'cook' },
        { text: 'レシピ提案', type: 'secondary' as const, action: 'recipes' }
      ]
    },
    [ConsumptionRecommendation.CONSUME_CAREFULLY]: {
      text: '注意深く消費してください',
      description: '品質に一部問題があります。少量から試して異常がないか確認してください。',
      backgroundColor: '#FFF8E1',
      textColor: '#F57F17',
      actions: [
        { text: '少量で試す', type: 'warning' as const, action: 'test_small' },
        { text: '廃棄する', type: 'danger' as const, action: 'discard' }
      ]
    },
    [ConsumptionRecommendation.COOK_BEFORE_CONSUME]: {
      text: '十分に加熱してから消費',
      description: '生での消費は避け、必ず十分に加熱調理してからお召し上がりください。',
      backgroundColor: '#FFEBEE',
      textColor: '#C62828',
      actions: [
        { text: '加熱調理', type: 'warning' as const, action: 'cook_thoroughly' },
        { text: '廃棄する', type: 'danger' as const, action: 'discard' }
      ]
    },
    [ConsumptionRecommendation.DISCARD]: {
      text: '廃棄することを強く推奨',
      description: '安全上の理由により、消費せずに適切に廃棄することをお勧めします。',
      backgroundColor: '#FFEBEE',
      textColor: '#D32F2F',
      actions: [
        { text: '廃棄する', type: 'danger' as const, action: 'discard' },
        { text: '廃棄方法', type: 'secondary' as const, action: 'disposal_guide' }
      ]
    }
  };

  return data[recommendation] || {
    text: '推奨不明',
    description: '推奨情報が利用できません。',
    backgroundColor: '#F5F5F5',
    textColor: '#757575',
    actions: []
  };
};

const getOverallStatus = (score: number): string => {
  if (score >= 90) return '優秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '普通';
  if (score >= 60) return '注意';
  if (score >= 40) return '警告';
  return '危険';
};

const getOverallColor = (score: number): string => {
  if (score >= 90) return '#4CAF50';
  if (score >= 80) return '#8BC34A';
  if (score >= 70) return '#FFC107';
  if (score >= 60) return '#FF9800';
  if (score >= 40) return '#FF5722';
  return '#F44336';
};

const getFreshnessDetails = (data: FreshnessScore): string[] => {
  const details = [];
  details.push(`色彩スコア: ${data.colorScore}%`);
  details.push(`テクスチャ: ${data.textureScore}%`);
  details.push(`形状: ${data.shapeScore}%`);
  details.push(`信頼度: ${(data.confidence * 100).toFixed(1)}%`);
  details.push(`推定賞味期限: ${data.estimatedShelfLife}日`);
  return details;
};

const getStateDetails = (data: StateClassificationResult): string[] => {
  const details = [];
  details.push(`品質グレード: ${getQualityGradeText(data.qualityGrade)}`);
  details.push(`信頼度: ${(data.confidence * 100).toFixed(1)}%`);
  details.push(`リスク要因: ${data.riskFactors.length}件`);
  details.push(`推奨アクション: ${data.actionItems.length}件`);
  return details;
};

const getRiskSeverityColor = (severity: string): string => {
  const colors = {
    low: '#E8F5E8',
    medium: '#FFF8E1',
    high: '#FFE0B2',
    critical: '#FFEBEE'
  };
  return colors[severity as keyof typeof colors] || '#F5F5F5';
};

const getRiskTypeText = (type: string): string => {
  const texts = {
    safety: '安全性',
    quality: '品質',
    nutritional: '栄養',
    environmental: '環境'
  };
  return texts[type as keyof typeof texts] || '不明';
};

const getAnalysisLevelColor = (level: string): string => {
  const colors = {
    excellent: '#4CAF50',
    good: '#8BC34A',
    caution: '#FFC107',
    warning: '#FF9800',
    critical: '#F44336'
  };
  return colors[level as keyof typeof colors] || '#757575';
};

const getAnalysisLevelText = (level: string): string => {
  const texts = {
    excellent: '優秀',
    good: '良好',
    caution: '注意',
    warning: '警告',
    critical: '危険'
  };
  return texts[level as keyof typeof texts] || '不明';
};

// スタイル定義
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreUnit: {
    fontSize: 24,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickInfo: {
    fontSize: 12,
    color: '#FFFFFF',
    marginHorizontal: 8,
    opacity: 0.9,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  scoreIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  expandHint: {
    fontSize: 12,
    color: '#2196F3',
    textAlign: 'center',
    marginTop: 8,
  },
  detailView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  scoreBreakdown: {
    marginBottom: 16,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreBarLabel: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
  scoreBarTrack: {
    flex: 2,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  scoreBarValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    minWidth: 40,
    textAlign: 'right',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analysisItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  analysisItemTitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    textAlign: 'center',
  },
  analysisScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  analysisLevel: {
    fontSize: 12,
    color: '#616161',
  },
  gradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradeDescription: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#212121',
  },
  warningButtonText: {
    color: '#FFFFFF',
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  riskItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  riskType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  riskDescription: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 4,
  },
  riskMitigation: {
    fontSize: 12,
    color: '#616161',
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  actionItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FoodStatusUIIntegration;
