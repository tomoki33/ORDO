/**
 * Feedback Collection and Analysis Service
 * フィードバック収集・分析システム
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Share, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface FeedbackItem {
  id: string;
  userId: string;
  sessionId?: string;
  testPlanId?: string;
  timestamp: number;
  type: 'bug_report' | 'feature_request' | 'usability_feedback' | 'general_feedback' | 'rating' | 'nps';
  category: 'ui_ux' | 'performance' | 'functionality' | 'content' | 'accessibility' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  source: 'in_app' | 'email' | 'survey' | 'interview' | 'observation' | 'analytics';
  content: FeedbackContent;
  context: FeedbackContext;
  metadata: FeedbackMetadata;
  analysis: FeedbackAnalysis;
  responses: FeedbackResponse[];
}

export interface FeedbackContent {
  title: string;
  description: string;
  rating?: number; // 1-10 scale
  npsScore?: number; // 0-10 scale
  screenshots?: string[];
  audioRecording?: string;
  videoRecording?: string;
  tags: string[];
  suggestedSolution?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  stepsToReproduce?: string[];
  additionalFiles?: string[];
}

export interface FeedbackContext {
  deviceInfo: {
    platform: string;
    osVersion: string;
    appVersion: string;
    buildNumber: string;
    deviceModel: string;
    screenResolution: string;
    availableMemory: number;
    batteryLevel?: number;
    networkType?: string;
  };
  userContext: {
    userSegment?: string;
    experienceLevel?: string;
    usageFrequency?: string;
    primaryUseCase?: string;
    accessibility?: string[];
  };
  sessionContext: {
    currentScreen?: string;
    navigationPath?: string[];
    timeInSession?: number;
    featuresUsed?: string[];
    errorsEncountered?: string[];
    userActions?: string[];
  };
  environmentContext: {
    location?: string;
    timeOfDay?: string;
    connectionQuality?: string;
    ambientConditions?: string;
  };
}

export interface FeedbackMetadata {
  submissionMethod: 'form' | 'voice' | 'gesture' | 'automatic' | 'prompted';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  visibility: 'public' | 'private' | 'team_only';
  language: string;
  responseExpected: boolean;
  followUpAllowed: boolean;
  attachmentCount: number;
  estimatedEffort?: number; // hours to resolve
  businessValue?: number; // 1-10 scale
}

export interface FeedbackAnalysis {
  sentimentScore: number; // -1 to 1
  emotionScores: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  keyPhrases: string[];
  topics: string[];
  similarFeedback: string[];
  rootCauseHypothesis?: string;
  impactAssessment: {
    userImpact: 'low' | 'medium' | 'high';
    businessImpact: 'low' | 'medium' | 'high';
    technicalComplexity: 'low' | 'medium' | 'high';
  };
  actionability: {
    canBeAddressed: boolean;
    requiredSkills: string[];
    estimatedEffort: number;
    dependencies: string[];
  };
}

export interface FeedbackResponse {
  id: string;
  responderId: string;
  responderRole: 'developer' | 'designer' | 'product_manager' | 'support' | 'community';
  timestamp: number;
  type: 'acknowledgment' | 'clarification' | 'solution' | 'update' | 'resolution';
  content: string;
  actions: string[];
  estimatedResolution?: number;
  additionalResources?: string[];
}

export interface FeedbackCampaign {
  id: string;
  name: string;
  description: string;
  objective: string;
  targetAudience: {
    userSegments: string[];
    demographics: any;
    behaviorCriteria: string[];
    sampleSize: number;
  };
  methodology: {
    type: 'survey' | 'interview' | 'focus_group' | 'observation' | 'diary_study';
    duration: number;
    channels: string[];
    incentives?: string[];
  };
  questions: FeedbackQuestion[];
  timeline: {
    startDate: number;
    endDate: number;
    milestones: any[];
  };
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  results: CampaignResults;
}

export interface FeedbackQuestion {
  id: string;
  type: 'text' | 'rating' | 'multiple_choice' | 'ranking' | 'matrix' | 'file_upload';
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  scale?: { min: number; max: number; labels?: string[] };
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  conditionalLogic?: {
    showIf: string;
    condition: string;
    value: any;
  };
}

export interface CampaignResults {
  responseCount: number;
  completionRate: number;
  averageCompletionTime: number;
  responses: CampaignResponse[];
  analytics: {
    demographicBreakdown: any;
    sentimentAnalysis: any;
    keyInsights: string[];
    recommendedActions: string[];
  };
}

export interface CampaignResponse {
  id: string;
  campaignId: string;
  respondentId: string;
  submittedAt: number;
  completionTime: number;
  answers: Record<string, any>;
  metadata: {
    deviceInfo: any;
    location?: string;
    referrer?: string;
  };
}

export interface FeedbackAnalytics {
  overview: {
    totalFeedback: number;
    responseRate: number;
    averageRating: number;
    npsScore: number;
    sentimentBreakdown: Record<string, number>;
  };
  trends: {
    feedbackVolume: TimeSeriesData[];
    ratingTrends: TimeSeriesData[];
    categoryTrends: Record<string, TimeSeriesData[]>;
    seasonalPatterns: any;
  };
  insights: {
    topIssues: IssueInsight[];
    emergingThemes: ThemeInsight[];
    userSegmentAnalysis: SegmentInsight[];
    competitiveAnalysis: CompetitiveInsight[];
  };
  actionItems: {
    criticalIssues: ActionItem[];
    quickWins: ActionItem[];
    longTermImprovements: ActionItem[];
  };
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: any;
}

export interface IssueInsight {
  issue: string;
  frequency: number;
  severity: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedUsers: number;
  businessImpact: string;
  recommendedActions: string[];
}

export interface ThemeInsight {
  theme: string;
  keywords: string[];
  frequency: number;
  sentiment: number;
  relatedFeedback: string[];
  emergenceDate: number;
}

export interface SegmentInsight {
  segment: string;
  feedbackVolume: number;
  averageRating: number;
  topConcerns: string[];
  satisfactionDrivers: string[];
  churnRisk: number;
}

export interface CompetitiveInsight {
  competitor: string;
  userMentions: number;
  sentiment: number;
  comparisonPoints: string[];
  advantages: string[];
  disadvantages: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
  assignee?: string;
  dueDate?: number;
  relatedFeedback: string[];
  success_metrics: string[];
}

class FeedbackCollectionAnalysisService {
  private feedbackItems: FeedbackItem[] = [];
  private campaigns: FeedbackCampaign[] = [];
  private analytics: FeedbackAnalytics | null = null;
  private isInitialized = false;

  private readonly STORAGE_KEYS = {
    FEEDBACK_ITEMS: 'feedback_items',
    CAMPAIGNS: 'feedback_campaigns',
    ANALYTICS: 'feedback_analytics',
    USER_PREFERENCES: 'feedback_user_preferences',
  };

  constructor() {
    this.setupFeedbackCollection();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📝 Initializing Feedback Collection & Analysis Service...');

    try {
      // データ読み込み
      await Promise.all([
        this.loadFeedbackItems(),
        this.loadCampaigns(),
        this.loadAnalytics(),
      ]);

      // 自動分析実行
      await this.performAnalysis();

      this.isInitialized = true;
      console.log('✅ Feedback Collection & Analysis Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Feedback Collection & Analysis Service:', error);
      throw error;
    }
  }

  /**
   * フィードバック収集設定
   */
  private setupFeedbackCollection(): void {
    // アプリ内フィードバック収集の設定
    // 実際の実装では適切なイベントリスナーを設定
  }

  /**
   * フィードバック提出
   */
  async submitFeedback(
    type: FeedbackItem['type'],
    category: FeedbackItem['category'],
    content: Partial<FeedbackContent>,
    severity: FeedbackItem['severity'] = 'medium',
    userId: string = 'anonymous'
  ): Promise<FeedbackItem> {
    console.log('📤 Submitting feedback...');

    const deviceInfo = await this.collectDeviceInfo();
    const sessionContext = await this.collectSessionContext();
    const userContext = await this.collectUserContext();

    const feedbackItem: FeedbackItem = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: Date.now(),
      type,
      category,
      severity,
      status: 'new',
      source: 'in_app',
      content: {
        title: content.title || 'User Feedback',
        description: content.description || '',
        rating: content.rating,
        npsScore: content.npsScore,
        screenshots: content.screenshots || [],
        audioRecording: content.audioRecording,
        videoRecording: content.videoRecording,
        tags: content.tags || [],
        suggestedSolution: content.suggestedSolution,
        expectedBehavior: content.expectedBehavior,
        actualBehavior: content.actualBehavior,
        stepsToReproduce: content.stepsToReproduce || [],
        additionalFiles: content.additionalFiles || [],
      },
      context: {
        deviceInfo,
        userContext,
        sessionContext,
        environmentContext: await this.collectEnvironmentContext(),
      },
      metadata: {
        submissionMethod: 'form',
        urgency: this.determineUrgency(type, severity),
        visibility: 'team_only',
        language: 'ja',
        responseExpected: severity === 'high' || severity === 'critical',
        followUpAllowed: true,
        attachmentCount: (content.screenshots?.length || 0) + 
                         (content.audioRecording ? 1 : 0) + 
                         (content.videoRecording ? 1 : 0) + 
                         (content.additionalFiles?.length || 0),
      },
      analysis: await this.analyzeFeedback(content),
      responses: [],
    };

    this.feedbackItems.push(feedbackItem);
    await this.saveFeedbackItems();

    // 分析更新
    await this.performAnalysis();

    // 緊急度が高い場合は通知
    if (feedbackItem.metadata.urgency === 'urgent' || feedbackItem.severity === 'critical') {
      await this.notifyUrgentFeedback(feedbackItem);
    }

    console.log('✅ Feedback submitted:', feedbackItem.id);
    return feedbackItem;
  }

  /**
   * バグレポート提出
   */
  async submitBugReport(
    title: string,
    description: string,
    stepsToReproduce: string[],
    expectedBehavior: string,
    actualBehavior: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    screenshots?: string[]
  ): Promise<FeedbackItem> {
    return this.submitFeedback('bug_report', 'functionality', {
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      screenshots,
    }, severity);
  }

  /**
   * 機能リクエスト提出
   */
  async submitFeatureRequest(
    title: string,
    description: string,
    suggestedSolution?: string,
    category: FeedbackItem['category'] = 'functionality'
  ): Promise<FeedbackItem> {
    return this.submitFeedback('feature_request', category, {
      title,
      description,
      suggestedSolution,
    }, 'medium');
  }

  /**
   * 評価・レーティング提出
   */
  async submitRating(
    rating: number,
    npsScore?: number,
    comment?: string,
    category: FeedbackItem['category'] = 'other'
  ): Promise<FeedbackItem> {
    return this.submitFeedback('rating', category, {
      title: 'User Rating',
      description: comment || '',
      rating,
      npsScore,
    }, 'low');
  }

  /**
   * フィードバックキャンペーン作成
   */
  async createFeedbackCampaign(
    name: string,
    description: string,
    objective: string,
    questions: FeedbackQuestion[],
    targetAudience: FeedbackCampaign['targetAudience'],
    methodology: FeedbackCampaign['methodology'],
    duration: number // days
  ): Promise<FeedbackCampaign> {
    const now = Date.now();
    const campaign: FeedbackCampaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      objective,
      targetAudience,
      methodology,
      questions,
      timeline: {
        startDate: now,
        endDate: now + (duration * 24 * 60 * 60 * 1000),
        milestones: [],
      },
      status: 'draft',
      results: {
        responseCount: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        responses: [],
        analytics: {
          demographicBreakdown: {},
          sentimentAnalysis: {},
          keyInsights: [],
          recommendedActions: [],
        },
      },
    };

    this.campaigns.push(campaign);
    await this.saveCampaigns();

    console.log('📋 Feedback campaign created:', name);
    return campaign;
  }

  /**
   * キャンペーン開始
   */
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'active';
    campaign.timeline.startDate = Date.now();
    await this.saveCampaigns();

    console.log('▶️ Feedback campaign started:', campaign.name);
  }

  /**
   * キャンペーン回答提出
   */
  async submitCampaignResponse(
    campaignId: string,
    answers: Record<string, any>,
    respondentId: string,
    completionTime: number
  ): Promise<CampaignResponse> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const response: CampaignResponse = {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId,
      respondentId,
      submittedAt: Date.now(),
      completionTime,
      answers,
      metadata: {
        deviceInfo: await this.collectDeviceInfo(),
      },
    };

    campaign.results.responses.push(response);
    campaign.results.responseCount++;
    
    // 完了率更新
    const totalQuestions = campaign.questions.filter(q => q.required).length;
    const completedQuestions = Object.keys(answers).length;
    campaign.results.completionRate = completedQuestions / totalQuestions;

    // 平均完了時間更新
    const allCompletionTimes = campaign.results.responses.map(r => r.completionTime);
    campaign.results.averageCompletionTime = 
      allCompletionTimes.reduce((sum, time) => sum + time, 0) / allCompletionTimes.length;

    await this.saveCampaigns();

    console.log('📊 Campaign response submitted:', response.id);
    return response;
  }

  /**
   * フィードバック分析実行
   */
  async performAnalysis(): Promise<FeedbackAnalytics> {
    console.log('🔍 Performing feedback analysis...');

    const totalFeedback = this.feedbackItems.length;
    const ratings = this.feedbackItems
      .filter(item => item.content.rating !== undefined)
      .map(item => item.content.rating!);
    
    const npsScores = this.feedbackItems
      .filter(item => item.content.npsScore !== undefined)
      .map(item => item.content.npsScore!);

    const averageRating = ratings.length > 0 ? 
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

    const npsScore = this.calculateNPS(npsScores);

    // センチメント分析
    const sentimentBreakdown = this.analyzeSentimentBreakdown();

    // トレンド分析
    const trends = this.analyzeTrends();

    // インサイト生成
    const insights = this.generateInsights();

    // アクションアイテム生成
    const actionItems = this.generateActionItems();

    this.analytics = {
      overview: {
        totalFeedback,
        responseRate: this.calculateResponseRate(),
        averageRating,
        npsScore,
        sentimentBreakdown,
      },
      trends,
      insights,
      actionItems,
    };

    await this.saveAnalytics();

    console.log('✅ Feedback analysis completed');
    return this.analytics;
  }

  /**
   * フィードバックレポート生成
   */
  async generateFeedbackReport(
    startDate?: number,
    endDate?: number,
    format: 'html' | 'json' | 'csv' = 'html'
  ): Promise<string> {
    const filteredFeedback = this.feedbackItems.filter(item => {
      if (startDate && item.timestamp < startDate) return false;
      if (endDate && item.timestamp > endDate) return false;
      return true;
    });

    if (format === 'json') {
      return JSON.stringify({
        feedbackItems: filteredFeedback,
        analytics: this.analytics,
        generatedAt: Date.now(),
      }, null, 2);
    }

    if (format === 'csv') {
      return this.generateCSVReport(filteredFeedback);
    }

    // HTMLレポート生成
    return this.generateHTMLReport(filteredFeedback);
  }

  // === プライベートメソッド ===

  /**
   * デバイス情報収集
   */
  private async collectDeviceInfo(): Promise<any> {
    const [systemName, systemVersion, version, buildNumber, model] = await Promise.all([
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getModel(),
    ]);

    return {
      platform: systemName,
      osVersion: systemVersion,
      appVersion: version,
      buildNumber: buildNumber,
      deviceModel: model,
      screenResolution: 'unknown', // 実際の実装では適切なライブラリを使用
      availableMemory: await DeviceInfo.getFreeDiskStorage(),
    };
  }

  /**
   * セッションコンテキスト収集
   */
  private async collectSessionContext(): Promise<any> {
    return {
      currentScreen: 'unknown', // 実際の実装では現在の画面を取得
      timeInSession: Date.now(), // 実際の実装ではセッション開始時間から計算
      featuresUsed: [], // 実際の実装では使用された機能を追跡
      errorsEncountered: [], // 実際の実装ではエラーログを取得
    };
  }

  /**
   * ユーザーコンテキスト収集
   */
  private async collectUserContext(): Promise<any> {
    return {
      experienceLevel: 'intermediate', // 実際の実装ではユーザープロファイルから取得
      usageFrequency: 'weekly', // 実際の実装では使用頻度を計算
      primaryUseCase: 'inventory_management', // 実際の実装では使用パターンを分析
    };
  }

  /**
   * 環境コンテキスト収集
   */
  private async collectEnvironmentContext(): Promise<any> {
    const now = new Date();
    return {
      timeOfDay: now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening',
      connectionQuality: 'good', // 実際の実装ではネットワーク品質を測定
    };
  }

  /**
   * 緊急度判定
   */
  private determineUrgency(
    type: FeedbackItem['type'], 
    severity: FeedbackItem['severity']
  ): FeedbackItem['metadata']['urgency'] {
    if (type === 'bug_report' && severity === 'critical') return 'urgent';
    if (severity === 'high') return 'high';
    if (type === 'feature_request') return 'low';
    return 'medium';
  }

  /**
   * フィードバック分析
   */
  private async analyzeFeedback(content: Partial<FeedbackContent>): Promise<FeedbackAnalysis> {
    const text = `${content.title || ''} ${content.description || ''}`;
    
    // 簡易センチメント分析
    const sentimentScore = this.calculateSentiment(text);
    
    // キーフレーズ抽出
    const keyPhrases = this.extractKeyPhrases(text);
    
    // トピック抽出
    const topics = this.extractTopics(text);

    return {
      sentimentScore,
      emotionScores: {
        joy: Math.random() * 0.3,
        anger: sentimentScore < -0.3 ? Math.random() * 0.7 + 0.3 : Math.random() * 0.3,
        sadness: sentimentScore < -0.2 ? Math.random() * 0.5 + 0.2 : Math.random() * 0.2,
        fear: Math.random() * 0.2,
        surprise: Math.random() * 0.3,
        disgust: sentimentScore < -0.4 ? Math.random() * 0.4 + 0.2 : Math.random() * 0.2,
      },
      keyPhrases,
      topics,
      similarFeedback: [],
      impactAssessment: {
        userImpact: sentimentScore < -0.5 ? 'high' : sentimentScore < 0 ? 'medium' : 'low',
        businessImpact: content.rating && content.rating < 3 ? 'high' : 'medium',
        technicalComplexity: 'medium',
      },
      actionability: {
        canBeAddressed: true,
        requiredSkills: ['development', 'design'],
        estimatedEffort: 4,
        dependencies: [],
      },
    };
  }

  /**
   * 簡易センチメント分析
   */
  private calculateSentiment(text: string): number {
    const positiveWords = ['良い', '素晴らしい', '便利', '簡単', '快適', '満足', '好き'];
    const negativeWords = ['悪い', '困る', '難しい', '遅い', '不便', '嫌い', 'バグ', 'エラー'];
    
    let score = 0;
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.1;
    });
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * キーフレーズ抽出
   */
  private extractKeyPhrases(text: string): string[] {
    // 簡易実装
    const words = text.split(/\s+/).filter(word => word.length > 2);
    return words.slice(0, 5);
  }

  /**
   * トピック抽出
   */
  private extractTopics(text: string): string[] {
    const topics = ['UI', 'パフォーマンス', '機能', 'バグ', 'デザイン'];
    return topics.filter(topic => text.includes(topic));
  }

  /**
   * NPS計算
   */
  private calculateNPS(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const promoters = scores.filter(score => score >= 9).length;
    const detractors = scores.filter(score => score <= 6).length;
    
    return Math.round(((promoters - detractors) / scores.length) * 100);
  }

  /**
   * レスポンス率計算
   */
  private calculateResponseRate(): number {
    const totalCampaigns = this.campaigns.length;
    if (totalCampaigns === 0) return 0;
    
    const totalTargetResponses = this.campaigns.reduce((sum, campaign) => 
      sum + campaign.targetAudience.sampleSize, 0);
    const totalActualResponses = this.campaigns.reduce((sum, campaign) => 
      sum + campaign.results.responseCount, 0);
    
    return totalTargetResponses > 0 ? totalActualResponses / totalTargetResponses : 0;
  }

  /**
   * センチメント分析内訳
   */
  private analyzeSentimentBreakdown(): Record<string, number> {
    const sentiments = this.feedbackItems.map(item => item.analysis.sentimentScore);
    
    return {
      positive: sentiments.filter(s => s > 0.1).length,
      neutral: sentiments.filter(s => s >= -0.1 && s <= 0.1).length,
      negative: sentiments.filter(s => s < -0.1).length,
    };
  }

  /**
   * トレンド分析
   */
  private analyzeTrends(): FeedbackAnalytics['trends'] {
    // 簡易実装
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const feedbackVolume: TimeSeriesData[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = now - (i * oneDay);
      const count = this.feedbackItems.filter(item => 
        item.timestamp >= date && item.timestamp < date + oneDay
      ).length;
      
      feedbackVolume.push({
        timestamp: date,
        value: count,
      });
    }

    return {
      feedbackVolume,
      ratingTrends: [],
      categoryTrends: {},
      seasonalPatterns: {},
    };
  }

  /**
   * インサイト生成
   */
  private generateInsights(): FeedbackAnalytics['insights'] {
    // トップ問題の特定
    const issueFrequency: Record<string, number> = {};
    this.feedbackItems.forEach(item => {
      item.analysis.topics.forEach(topic => {
        issueFrequency[topic] = (issueFrequency[topic] || 0) + 1;
      });
    });

    const topIssues: IssueInsight[] = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, frequency]) => ({
        issue,
        frequency,
        severity: frequency > 10 ? 'high' : frequency > 5 ? 'medium' : 'low',
        trend: 'stable',
        affectedUsers: frequency,
        businessImpact: `${frequency} reports affecting user experience`,
        recommendedActions: [`Address ${issue} related issues`],
      }));

    return {
      topIssues,
      emergingThemes: [],
      userSegmentAnalysis: [],
      competitiveAnalysis: [],
    };
  }

  /**
   * アクションアイテム生成
   */
  private generateActionItems(): FeedbackAnalytics['actionItems'] {
    const criticalItems = this.feedbackItems.filter(item => item.severity === 'critical');
    const highItems = this.feedbackItems.filter(item => item.severity === 'high');

    const criticalIssues: ActionItem[] = criticalItems.map(item => ({
      id: `action_${item.id}`,
      title: `Fix Critical Issue: ${item.content.title}`,
      description: item.content.description,
      priority: 'critical',
      effort: 'high',
      impact: 'high',
      category: item.category,
      relatedFeedback: [item.id],
      success_metrics: ['Issue resolved', 'User satisfaction improved'],
    }));

    const quickWins: ActionItem[] = this.feedbackItems
      .filter(item => item.analysis.actionability.estimatedEffort <= 2)
      .slice(0, 5)
      .map(item => ({
        id: `quickwin_${item.id}`,
        title: `Quick Fix: ${item.content.title}`,
        description: item.content.description,
        priority: 'medium',
        effort: 'low',
        impact: 'medium',
        category: item.category,
        relatedFeedback: [item.id],
        success_metrics: ['Quick improvement delivered'],
      }));

    return {
      criticalIssues,
      quickWins,
      longTermImprovements: [],
    };
  }

  /**
   * 緊急フィードバック通知
   */
  private async notifyUrgentFeedback(feedback: FeedbackItem): Promise<void> {
    Alert.alert(
      '緊急フィードバック',
      `重要度の高いフィードバックが提出されました：${feedback.content.title}`,
      [
        { text: 'OK', style: 'default' },
        { 
          text: '詳細を確認', 
          onPress: () => {
            // 実際の実装では詳細画面に遷移
            console.log('Show feedback details:', feedback.id);
          }
        },
      ]
    );
  }

  /**
   * CSVレポート生成
   */
  private generateCSVReport(feedbackItems: FeedbackItem[]): string {
    const headers = [
      'ID', 'Type', 'Category', 'Severity', 'Title', 'Description', 
      'Rating', 'Sentiment', 'Status', 'Created', 'User'
    ];
    
    const rows = feedbackItems.map(item => [
      item.id,
      item.type,
      item.category,
      item.severity,
      item.content.title,
      item.content.description,
      item.content.rating || '',
      item.analysis.sentimentScore.toFixed(2),
      item.status,
      new Date(item.timestamp).toISOString(),
      item.userId,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * HTMLレポート生成
   */
  private generateHTMLReport(feedbackItems: FeedbackItem[]): string {
    const analytics = this.analytics;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Feedback Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .feedback-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .critical { border-left: 4px solid #ff3b30; }
        .high { border-left: 4px solid #ff9500; }
        .medium { border-left: 4px solid #ffcc00; }
        .low { border-left: 4px solid #34c759; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Feedback Analysis Report</h1>
        <p><strong>Period:</strong> Last 30 days</p>
        <p><strong>Total Feedback:</strong> ${feedbackItems.length}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <h3>Overview Metrics</h3>
        <div class="metric">
            <strong>Average Rating:</strong> ${analytics?.overview.averageRating.toFixed(1) || 'N/A'}/10
        </div>
        <div class="metric">
            <strong>NPS Score:</strong> ${analytics?.overview.npsScore || 'N/A'}
        </div>
        <div class="metric">
            <strong>Response Rate:</strong> ${((analytics?.overview.responseRate || 0) * 100).toFixed(1)}%
        </div>
    </div>

    <div class="section">
        <h3>Top Issues</h3>
        ${analytics?.insights.topIssues.slice(0, 5).map(issue => `
            <div class="feedback-item ${issue.severity}">
                <h4>${issue.issue}</h4>
                <p><strong>Frequency:</strong> ${issue.frequency} reports</p>
                <p><strong>Severity:</strong> ${issue.severity}</p>
                <p><strong>Business Impact:</strong> ${issue.businessImpact}</p>
            </div>
        `).join('') || 'No issues identified'}
    </div>

    <div class="section">
        <h3>Critical Action Items</h3>
        ${analytics?.actionItems.criticalIssues.map(item => `
            <div class="feedback-item critical">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
                <p><strong>Priority:</strong> ${item.priority} | <strong>Effort:</strong> ${item.effort} | <strong>Impact:</strong> ${item.impact}</p>
            </div>
        `).join('') || 'No critical issues'}
    </div>

    <div class="section">
        <h3>Recent Feedback</h3>
        ${feedbackItems.slice(0, 10).map(item => `
            <div class="feedback-item ${item.severity}">
                <h4>${item.content.title}</h4>
                <p>${item.content.description}</p>
                <p><strong>Type:</strong> ${item.type} | <strong>Category:</strong> ${item.category} | <strong>Severity:</strong> ${item.severity}</p>
                <p><strong>Sentiment:</strong> ${item.analysis.sentimentScore.toFixed(2)} | <strong>Date:</strong> ${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `.trim();
  }

  // === データ永続化メソッド ===

  private async loadFeedbackItems(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.FEEDBACK_ITEMS);
      if (stored) {
        this.feedbackItems = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load feedback items:', error);
    }
  }

  private async saveFeedbackItems(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.FEEDBACK_ITEMS, JSON.stringify(this.feedbackItems));
  }

  private async loadCampaigns(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CAMPAIGNS);
      if (stored) {
        this.campaigns = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }

  private async saveCampaigns(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.CAMPAIGNS, JSON.stringify(this.campaigns));
  }

  private async loadAnalytics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.ANALYTICS);
      if (stored) {
        this.analytics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  private async saveAnalytics(): Promise<void> {
    if (this.analytics) {
      await AsyncStorage.setItem(this.STORAGE_KEYS.ANALYTICS, JSON.stringify(this.analytics));
    }
  }

  // === 公開API ===

  /**
   * フィードバック一覧取得
   */
  getFeedbackItems(): FeedbackItem[] {
    return [...this.feedbackItems];
  }

  /**
   * キャンペーン一覧取得
   */
  getCampaigns(): FeedbackCampaign[] {
    return [...this.campaigns];
  }

  /**
   * 分析結果取得
   */
  getAnalytics(): FeedbackAnalytics | null {
    return this.analytics;
  }

  /**
   * 初期化状態確認
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * サービス状態取得
   */
  getServiceStatus(): {
    isInitialized: boolean;
    totalFeedback: number;
    activeCampaigns: number;
    pendingAnalysis: number;
    averageRating: number;
  } {
    return {
      isInitialized: this.isInitialized,
      totalFeedback: this.feedbackItems.length,
      activeCampaigns: this.campaigns.filter(c => c.status === 'active').length,
      pendingAnalysis: this.feedbackItems.filter(item => item.status === 'new').length,
      averageRating: this.analytics?.overview.averageRating || 0,
    };
  }
}

export const feedbackCollectionAnalysisService = new FeedbackCollectionAnalysisService();
