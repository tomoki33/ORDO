/**
 * Improvement Implementation Tracking Service
 * 改善点実装の追跡・管理システム
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface ImprovementItem {
  id: string;
  title: string;
  description: string;
  category: 'bug_fix' | 'feature_enhancement' | 'performance' | 'usability' | 'accessibility' | 'security' | 'ui_ux';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  status: 'backlog' | 'planning' | 'in_progress' | 'testing' | 'completed' | 'cancelled' | 'on_hold';
  source: ImprovementSource;
  assignee?: string;
  reviewer?: string;
  estimatedHours: number;
  actualHours?: number;
  startDate?: number;
  targetDate?: number;
  completedDate?: number;
  tags: string[];
  relatedItems: string[];
  dependencies: string[];
  milestones: Milestone[];
  progress: Progress;
  qualityMetrics: QualityMetrics;
  userImpact: UserImpact;
  businessValue: BusinessValue;
  implementationNotes: ImplementationNote[];
  testingResults: TestingResult[];
  deploymentInfo: DeploymentInfo;
  feedbackReferences: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ImprovementSource {
  type: 'user_feedback' | 'usability_test' | 'analytics' | 'code_review' | 'support_ticket' | 'team_suggestion';
  sourceId: string;
  sourceDetails: string;
  reportedBy: string;
  reportedAt: number;
  confidence: number; // 0-1
  evidenceLevel: 'low' | 'medium' | 'high';
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: number;
  completedDate?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  deliverables: string[];
  acceptanceCriteria: string[];
  blockers: string[];
}

export interface Progress {
  overallProgress: number; // 0-100
  phaseProgress: {
    analysis: number;
    design: number;
    implementation: number;
    testing: number;
    deployment: number;
  };
  timeProgress: number; // based on elapsed time vs estimated
  milestoneProgress: number; // based on completed milestones
  lastUpdated: number;
  updatedBy: string;
  notes: string;
}

export interface QualityMetrics {
  codeQuality: {
    linesOfCode: number;
    complexity: number;
    coverage: number;
    codeReviewScore: number;
    staticAnalysisScore: number;
  };
  testingMetrics: {
    testCases: number;
    passRate: number;
    automationCoverage: number;
    performanceImpact: number;
    regressionTests: number;
  };
  userAcceptance: {
    userSatisfaction: number;
    usabilityScore: number;
    errorReduction: number;
    taskCompletionImprovement: number;
  };
}

export interface UserImpact {
  affectedUsers: number;
  userSegments: string[];
  impactType: 'positive' | 'negative' | 'neutral';
  impactAreas: string[];
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
  improvementMeasures: {
    taskCompletionTime: number; // percentage improvement
    errorReduction: number; // percentage reduction
    userSatisfaction: number; // score improvement
    usageIncrease: number; // percentage increase
  };
}

export interface BusinessValue {
  revenueImpact: number;
  costSaving: number;
  riskReduction: number;
  strategicValue: number; // 1-10 scale
  competitiveAdvantage: number; // 1-10 scale
  customerRetention: number; // percentage improvement
  marketShare: number; // percentage impact
  brandValue: number; // 1-10 scale
  roi: number; // return on investment
  paybackPeriod: number; // months
}

export interface ImplementationNote {
  id: string;
  timestamp: number;
  author: string;
  type: 'progress_update' | 'blocker' | 'solution' | 'decision' | 'risk' | 'change_request';
  title: string;
  content: string;
  attachments?: string[];
  relatedCode?: string[];
  impact?: string;
  actionRequired?: boolean;
  assignee?: string;
}

export interface TestingResult {
  id: string;
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'usability' | 'accessibility' | 'security';
  testDate: number;
  tester: string;
  environment: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  testCases: TestCase[];
  overallResult: string;
  issues: TestIssue[];
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  actualResult: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  executionTime: number;
  notes?: string;
}

export interface TestIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  workaround?: string;
  status: 'open' | 'fixed' | 'wont_fix' | 'duplicate';
}

export interface DeploymentInfo {
  environment: 'development' | 'staging' | 'production';
  deploymentDate?: number;
  deployedBy?: string;
  deploymentMethod: string;
  rollbackPlan: string;
  monitoringPlan: string;
  rolloutStrategy: 'immediate' | 'gradual' | 'feature_flag' | 'ab_test';
  rolloutPercentage: number;
  healthChecks: HealthCheck[];
  postDeploymentTasks: string[];
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  lastChecked: number;
  metrics: Record<string, number>;
  thresholds: Record<string, number>;
  alerts: string[];
}

export interface ImprovementPlan {
  id: string;
  name: string;
  description: string;
  objective: string;
  scope: string[];
  timeline: {
    startDate: number;
    endDate: number;
    phases: PlanPhase[];
  };
  budget: {
    allocated: number;
    spent: number;
    projected: number;
  };
  resources: PlanResource[];
  improvements: string[]; // improvement IDs
  risks: Risk[];
  successCriteria: SuccessCriteria[];
  stakeholders: Stakeholder[];
  communication: CommunicationPlan;
  status: 'draft' | 'approved' | 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  deliverables: string[];
  dependencies: string[];
  resources: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
}

export interface PlanResource {
  id: string;
  type: 'human' | 'financial' | 'technical' | 'external';
  name: string;
  allocation: number; // percentage or hours
  cost: number;
  availability: {
    startDate: number;
    endDate: number;
  };
  skills: string[];
  role: string;
}

export interface Risk {
  id: string;
  description: string;
  category: 'technical' | 'resource' | 'timeline' | 'business' | 'external';
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  contingency: string;
  owner: string;
  status: 'identified' | 'mitigated' | 'occurred' | 'resolved';
}

export interface SuccessCriteria {
  id: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  measurement: string;
  timeframe: string;
  importance: 'low' | 'medium' | 'high';
  achieved?: boolean;
  actualValue?: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  department: string;
  influence: 'low' | 'medium' | 'high';
  interest: 'low' | 'medium' | 'high';
  communicationPreference: string;
  expectations: string[];
  concerns: string[];
}

export interface CommunicationPlan {
  frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
  channels: string[];
  stakeholderGroups: string[];
  reportingStructure: string;
  escalationPath: string[];
  meetingSchedule: Meeting[];
}

export interface Meeting {
  type: string;
  frequency: string;
  attendees: string[];
  agenda: string[];
  duration: number;
}

export interface ImprovementAnalytics {
  overview: {
    totalImprovements: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    averageCompletionTime: number;
    totalBusinessValue: number;
    totalCostSavings: number;
  };
  trends: {
    completionTrend: TimeSeriesData[];
    effortAccuracy: TimeSeriesData[];
    priorityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
  };
  performance: {
    onTimeDelivery: number;
    budgetAdherence: number;
    qualityScore: number;
    stakeholderSatisfaction: number;
    reworkRate: number;
  };
  insights: {
    bottlenecks: Bottleneck[];
    successFactors: SuccessFactor[];
    riskIndicators: RiskIndicator[];
    recommendations: AnalyticsRecommendation[];
  };
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: any;
}

export interface Bottleneck {
  area: string;
  description: string;
  impact: string;
  frequency: number;
  averageDelay: number;
  suggestedSolutions: string[];
}

export interface SuccessFactor {
  factor: string;
  correlation: number;
  examples: string[];
  recommendedActions: string[];
}

export interface RiskIndicator {
  indicator: string;
  currentValue: number;
  threshold: number;
  trend: 'improving' | 'stable' | 'worsening';
  prediction: string;
}

export interface AnalyticsRecommendation {
  category: string;
  recommendation: string;
  rationale: string;
  expectedImpact: string;
  implementationEffort: string;
  priority: 'low' | 'medium' | 'high';
}

class ImprovementImplementationTrackingService {
  private improvements: ImprovementItem[] = [];
  private plans: ImprovementPlan[] = [];
  private analytics: ImprovementAnalytics | null = null;
  private isInitialized = false;

  private readonly STORAGE_KEYS = {
    IMPROVEMENTS: 'improvement_items',
    PLANS: 'improvement_plans',
    ANALYTICS: 'improvement_analytics',
    SETTINGS: 'improvement_settings',
  };

  constructor() {
    this.setupTracking();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing Improvement Implementation Tracking Service...');

    try {
      // データ読み込み
      await Promise.all([
        this.loadImprovements(),
        this.loadPlans(),
        this.loadAnalytics(),
      ]);

      // 分析実行
      await this.performAnalysis();

      this.isInitialized = true;
      console.log('✅ Improvement Implementation Tracking Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Improvement Implementation Tracking Service:', error);
      throw error;
    }
  }

  /**
   * 改善項目作成
   */
  async createImprovementItem(
    title: string,
    description: string,
    category: ImprovementItem['category'],
    priority: ImprovementItem['priority'],
    source: ImprovementSource,
    estimatedHours: number = 8
  ): Promise<ImprovementItem> {
    const improvement: ImprovementItem = {
      id: `improvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category,
      priority,
      impact: this.calculateImpact(priority, category),
      effort: this.calculateEffort(estimatedHours),
      status: 'backlog',
      source,
      estimatedHours,
      tags: [],
      relatedItems: [],
      dependencies: [],
      milestones: [],
      progress: {
        overallProgress: 0,
        phaseProgress: {
          analysis: 0,
          design: 0,
          implementation: 0,
          testing: 0,
          deployment: 0,
        },
        timeProgress: 0,
        milestoneProgress: 0,
        lastUpdated: Date.now(),
        updatedBy: 'system',
        notes: '',
      },
      qualityMetrics: {
        codeQuality: {
          linesOfCode: 0,
          complexity: 0,
          coverage: 0,
          codeReviewScore: 0,
          staticAnalysisScore: 0,
        },
        testingMetrics: {
          testCases: 0,
          passRate: 0,
          automationCoverage: 0,
          performanceImpact: 0,
          regressionTests: 0,
        },
        userAcceptance: {
          userSatisfaction: 0,
          usabilityScore: 0,
          errorReduction: 0,
          taskCompletionImprovement: 0,
        },
      },
      userImpact: {
        affectedUsers: 0,
        userSegments: [],
        impactType: 'positive',
        impactAreas: [],
        beforeMetrics: {},
        afterMetrics: {},
        improvementMeasures: {
          taskCompletionTime: 0,
          errorReduction: 0,
          userSatisfaction: 0,
          usageIncrease: 0,
        },
      },
      businessValue: {
        revenueImpact: 0,
        costSaving: 0,
        riskReduction: 0,
        strategicValue: 5,
        competitiveAdvantage: 5,
        customerRetention: 0,
        marketShare: 0,
        brandValue: 5,
        roi: 0,
        paybackPeriod: 12,
      },
      implementationNotes: [],
      testingResults: [],
      deploymentInfo: {
        environment: 'development',
        deploymentMethod: 'standard',
        rollbackPlan: 'Standard rollback procedure',
        monitoringPlan: 'Standard monitoring',
        rolloutStrategy: 'immediate',
        rolloutPercentage: 100,
        healthChecks: [],
        postDeploymentTasks: [],
      },
      feedbackReferences: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.improvements.push(improvement);
    await this.saveImprovements();

    console.log('📝 Improvement item created:', title);
    return improvement;
  }

  /**
   * 改善項目状態更新
   */
  async updateImprovementStatus(
    improvementId: string,
    status: ImprovementItem['status'],
    notes?: string,
    updatedBy: string = 'system'
  ): Promise<void> {
    const improvement = this.improvements.find(item => item.id === improvementId);
    if (!improvement) {
      throw new Error(`Improvement not found: ${improvementId}`);
    }

    const oldStatus = improvement.status;
    improvement.status = status;
    improvement.updatedAt = Date.now();

    // 状態変更に応じてタイムスタンプ更新
    if (status === 'in_progress' && !improvement.startDate) {
      improvement.startDate = Date.now();
    } else if (status === 'completed' && !improvement.completedDate) {
      improvement.completedDate = Date.now();
      improvement.progress.overallProgress = 100;
    }

    // 実装ノート追加
    if (notes) {
      await this.addImplementationNote(improvementId, 'progress_update', 'Status Update', notes, updatedBy);
    }

    await this.saveImprovements();

    console.log('📊 Improvement status updated:', improvementId, `${oldStatus} → ${status}`);
  }

  /**
   * 進捗更新
   */
  async updateProgress(
    improvementId: string,
    phaseProgress: Partial<Progress['phaseProgress']>,
    notes: string = '',
    updatedBy: string = 'system'
  ): Promise<void> {
    const improvement = this.improvements.find(item => item.id === improvementId);
    if (!improvement) {
      throw new Error(`Improvement not found: ${improvementId}`);
    }

    // フェーズ進捗更新
    improvement.progress.phaseProgress = {
      ...improvement.progress.phaseProgress,
      ...phaseProgress,
    };

    // 全体進捗計算
    const phases = Object.values(improvement.progress.phaseProgress);
    improvement.progress.overallProgress = 
      phases.reduce((sum, progress) => sum + progress, 0) / phases.length;

    // 時間進捗計算
    if (improvement.startDate && improvement.targetDate) {
      const elapsed = Date.now() - improvement.startDate;
      const total = improvement.targetDate - improvement.startDate;
      improvement.progress.timeProgress = Math.min(100, (elapsed / total) * 100);
    }

    improvement.progress.lastUpdated = Date.now();
    improvement.progress.updatedBy = updatedBy;
    improvement.progress.notes = notes;
    improvement.updatedAt = Date.now();

    await this.saveImprovements();

    console.log('📈 Progress updated:', improvementId, `${improvement.progress.overallProgress.toFixed(1)}%`);
  }

  /**
   * マイルストーン追加
   */
  async addMilestone(
    improvementId: string,
    name: string,
    description: string,
    targetDate: number,
    deliverables: string[] = [],
    acceptanceCriteria: string[] = []
  ): Promise<Milestone> {
    const improvement = this.improvements.find(item => item.id === improvementId);
    if (!improvement) {
      throw new Error(`Improvement not found: ${improvementId}`);
    }

    const milestone: Milestone = {
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      targetDate,
      status: 'pending',
      deliverables,
      acceptanceCriteria,
      blockers: [],
    };

    improvement.milestones.push(milestone);
    improvement.updatedAt = Date.now();
    await this.saveImprovements();

    console.log('🎯 Milestone added:', name);
    return milestone;
  }

  /**
   * 実装ノート追加
   */
  async addImplementationNote(
    improvementId: string,
    type: ImplementationNote['type'],
    title: string,
    content: string,
    author: string = 'system',
    actionRequired: boolean = false,
    assignee?: string
  ): Promise<ImplementationNote> {
    const improvement = this.improvements.find(item => item.id === improvementId);
    if (!improvement) {
      throw new Error(`Improvement not found: ${improvementId}`);
    }

    const note: ImplementationNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      author,
      type,
      title,
      content,
      actionRequired,
      assignee,
    };

    improvement.implementationNotes.push(note);
    improvement.updatedAt = Date.now();
    await this.saveImprovements();

    console.log('📝 Implementation note added:', title);
    return note;
  }

  /**
   * テスト結果記録
   */
  async recordTestingResult(
    improvementId: string,
    testType: TestingResult['testType'],
    status: TestingResult['status'],
    testCases: TestCase[],
    tester: string,
    environment: string = 'development',
    issues: TestIssue[] = []
  ): Promise<TestingResult> {
    const improvement = this.improvements.find(item => item.id === improvementId);
    if (!improvement) {
      throw new Error(`Improvement not found: ${improvementId}`);
    }

    const testResult: TestingResult = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testType,
      testDate: Date.now(),
      tester,
      environment,
      status,
      testCases,
      overallResult: this.calculateOverallTestResult(testCases),
      issues,
      metrics: this.calculateTestMetrics(testCases),
      recommendations: this.generateTestRecommendations(testCases, issues),
    };

    improvement.testingResults.push(testResult);
    improvement.updatedAt = Date.now();

    // テスト指標更新
    improvement.qualityMetrics.testingMetrics.testCases = testCases.length;
    improvement.qualityMetrics.testingMetrics.passRate = 
      testCases.filter(tc => tc.status === 'passed').length / testCases.length * 100;

    await this.saveImprovements();

    console.log('🧪 Testing result recorded:', testType, status);
    return testResult;
  }

  /**
   * 改善計画作成
   */
  async createImprovementPlan(
    name: string,
    description: string,
    objective: string,
    improvementIds: string[],
    timeline: { startDate: number; endDate: number },
    budget: number
  ): Promise<ImprovementPlan> {
    const plan: ImprovementPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      objective,
      scope: [],
      timeline: {
        startDate: timeline.startDate,
        endDate: timeline.endDate,
        phases: this.createDefaultPlanPhases(timeline.startDate, timeline.endDate),
      },
      budget: {
        allocated: budget,
        spent: 0,
        projected: budget,
      },
      resources: [],
      improvements: improvementIds,
      risks: [],
      successCriteria: [],
      stakeholders: [],
      communication: {
        frequency: 'weekly',
        channels: ['email', 'slack'],
        stakeholderGroups: ['development', 'product', 'design'],
        reportingStructure: 'Weekly status reports',
        escalationPath: ['tech_lead', 'product_manager', 'director'],
        meetingSchedule: [],
      },
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plans.push(plan);
    await this.savePlans();

    console.log('📋 Improvement plan created:', name);
    return plan;
  }

  /**
   * 分析実行
   */
  async performAnalysis(): Promise<ImprovementAnalytics> {
    console.log('🔍 Performing improvement analytics...');

    const totalImprovements = this.improvements.length;
    const completed = this.improvements.filter(item => item.status === 'completed').length;
    const inProgress = this.improvements.filter(item => item.status === 'in_progress').length;
    const completionRate = totalImprovements > 0 ? completed / totalImprovements : 0;

    // 平均完了時間計算
    const completedItems = this.improvements.filter(item => 
      item.status === 'completed' && item.startDate && item.completedDate
    );
    const averageCompletionTime = completedItems.length > 0 
      ? completedItems.reduce((sum, item) => 
          sum + (item.completedDate! - item.startDate!), 0) / completedItems.length
      : 0;

    // ビジネス価値計算
    const totalBusinessValue = this.improvements.reduce((sum, item) => 
      sum + item.businessValue.revenueImpact + item.businessValue.costSaving, 0);

    const totalCostSavings = this.improvements.reduce((sum, item) => 
      sum + item.businessValue.costSaving, 0);

    // トレンド分析
    const trends = this.analyzeTrends();

    // パフォーマンス分析
    const performance = this.analyzePerformance();

    // インサイト生成
    const insights = this.generateInsights();

    this.analytics = {
      overview: {
        totalImprovements,
        completed,
        inProgress,
        completionRate,
        averageCompletionTime,
        totalBusinessValue,
        totalCostSavings,
      },
      trends,
      performance,
      insights,
    };

    await this.saveAnalytics();

    console.log('✅ Improvement analytics completed');
    return this.analytics;
  }

  /**
   * レポート生成
   */
  async generateReport(
    format: 'html' | 'json' | 'csv' = 'html',
    includePlans: boolean = true
  ): Promise<string> {
    if (format === 'json') {
      return JSON.stringify({
        improvements: this.improvements,
        plans: includePlans ? this.plans : [],
        analytics: this.analytics,
        generatedAt: Date.now(),
      }, null, 2);
    }

    if (format === 'csv') {
      return this.generateCSVReport();
    }

    return this.generateHTMLReport(includePlans);
  }

  // === プライベートメソッド ===

  /**
   * トラッキング設定
   */
  private setupTracking(): void {
    // 自動進捗更新のセットアップ
    setInterval(() => {
      this.updateAutomaticProgress();
    }, 60000); // 1分間隔
  }

  /**
   * 自動進捗更新
   */
  private async updateAutomaticProgress(): Promise<void> {
    const activeImprovements = this.improvements.filter(item => 
      item.status === 'in_progress' && item.startDate
    );

    for (const improvement of activeImprovements) {
      if (improvement.targetDate && improvement.startDate) {
        const elapsed = Date.now() - improvement.startDate;
        const total = improvement.targetDate - improvement.startDate;
        const timeProgress = Math.min(100, (elapsed / total) * 100);
        
        if (timeProgress !== improvement.progress.timeProgress) {
          improvement.progress.timeProgress = timeProgress;
          improvement.updatedAt = Date.now();
        }
      }
    }

    await this.saveImprovements();
  }

  /**
   * インパクト計算
   */
  private calculateImpact(priority: string, category: string): ImprovementItem['impact'] {
    if (priority === 'critical') return 'high';
    if (priority === 'high') return 'high';
    if (category === 'security' || category === 'performance') return 'high';
    if (priority === 'medium') return 'medium';
    return 'low';
  }

  /**
   * エフォート計算
   */
  private calculateEffort(hours: number): ImprovementItem['effort'] {
    if (hours <= 4) return 'low';
    if (hours <= 16) return 'medium';
    return 'high';
  }

  /**
   * デフォルト計画フェーズ作成
   */
  private createDefaultPlanPhases(startDate: number, endDate: number): PlanPhase[] {
    const duration = endDate - startDate;
    const phaseCount = 4;
    const phaseDuration = duration / phaseCount;

    return [
      {
        id: 'analysis',
        name: 'Analysis & Planning',
        description: 'Requirements analysis and detailed planning',
        startDate: startDate,
        endDate: startDate + phaseDuration,
        deliverables: ['Requirements Document', 'Technical Design'],
        dependencies: [],
        resources: [],
        status: 'not_started',
      },
      {
        id: 'design',
        name: 'Design & Architecture',
        description: 'System design and architecture',
        startDate: startDate + phaseDuration,
        endDate: startDate + phaseDuration * 2,
        deliverables: ['System Design', 'UI/UX Mockups'],
        dependencies: ['analysis'],
        resources: [],
        status: 'not_started',
      },
      {
        id: 'implementation',
        name: 'Implementation',
        description: 'Code development and implementation',
        startDate: startDate + phaseDuration * 2,
        endDate: startDate + phaseDuration * 3,
        deliverables: ['Working Software', 'Unit Tests'],
        dependencies: ['design'],
        resources: [],
        status: 'not_started',
      },
      {
        id: 'testing',
        name: 'Testing & Deployment',
        description: 'Testing and production deployment',
        startDate: startDate + phaseDuration * 3,
        endDate: endDate,
        deliverables: ['Test Results', 'Production Deployment'],
        dependencies: ['implementation'],
        resources: [],
        status: 'not_started',
      },
    ];
  }

  /**
   * テスト結果計算
   */
  private calculateOverallTestResult(testCases: TestCase[]): string {
    const passed = testCases.filter(tc => tc.status === 'passed').length;
    const total = testCases.length;
    const passRate = total > 0 ? passed / total : 0;

    if (passRate >= 0.95) return 'Excellent';
    if (passRate >= 0.8) return 'Good';
    if (passRate >= 0.6) return 'Fair';
    return 'Poor';
  }

  /**
   * テスト指標計算
   */
  private calculateTestMetrics(testCases: TestCase[]): Record<string, number> {
    const total = testCases.length;
    const passed = testCases.filter(tc => tc.status === 'passed').length;
    const failed = testCases.filter(tc => tc.status === 'failed').length;
    const avgExecutionTime = total > 0 
      ? testCases.reduce((sum, tc) => sum + tc.executionTime, 0) / total
      : 0;

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total * 100 : 0,
      avgExecutionTime,
    };
  }

  /**
   * テスト推奨事項生成
   */
  private generateTestRecommendations(testCases: TestCase[], issues: TestIssue[]): string[] {
    const recommendations: string[] = [];

    const failedTests = testCases.filter(tc => tc.status === 'failed');
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length}件の失敗テストを修正してください`);
    }

    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`${criticalIssues.length}件の重要な問題を優先的に対応してください`);
    }

    const avgExecutionTime = testCases.reduce((sum, tc) => sum + tc.executionTime, 0) / testCases.length;
    if (avgExecutionTime > 5000) { // 5秒以上
      recommendations.push('テスト実行時間の最適化を検討してください');
    }

    return recommendations;
  }

  /**
   * トレンド分析
   */
  private analyzeTrends(): ImprovementAnalytics['trends'] {
    // 簡易実装
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    const completionTrend: TimeSeriesData[] = [];
    for (let i = 12; i >= 0; i--) {
      const date = now - (i * oneWeek);
      const completed = this.improvements.filter(item => 
        item.completedDate && 
        item.completedDate >= date && 
        item.completedDate < date + oneWeek
      ).length;
      
      completionTrend.push({
        timestamp: date,
        value: completed,
      });
    }

    const priorityDistribution = this.improvements.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = this.improvements.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceDistribution = this.improvements.reduce((acc, item) => {
      acc[item.source.type] = (acc[item.source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      completionTrend,
      effortAccuracy: [],
      priorityDistribution,
      categoryDistribution,
      sourceDistribution,
    };
  }

  /**
   * パフォーマンス分析
   */
  private analyzePerformance(): ImprovementAnalytics['performance'] {
    const completedItems = this.improvements.filter(item => item.status === 'completed');
    
    // 期限内完了率
    const onTimeItems = completedItems.filter(item => 
      item.targetDate && item.completedDate && item.completedDate <= item.targetDate
    );
    const onTimeDelivery = completedItems.length > 0 ? onTimeItems.length / completedItems.length * 100 : 0;

    // 工数精度
    const budgetItems = completedItems.filter(item => item.actualHours);
    const accurateItems = budgetItems.filter(item => 
      Math.abs((item.actualHours! - item.estimatedHours) / item.estimatedHours) <= 0.2 // 20%以内
    );
    const budgetAdherence = budgetItems.length > 0 ? accurateItems.length / budgetItems.length * 100 : 0;

    // 品質スコア（テスト合格率の平均）
    const testResults = this.improvements.flatMap(item => item.testingResults);
    const qualityScore = testResults.length > 0 
      ? testResults.reduce((sum, result) => sum + (result.metrics.passRate || 0), 0) / testResults.length
      : 0;

    return {
      onTimeDelivery,
      budgetAdherence,
      qualityScore,
      stakeholderSatisfaction: 80, // 簡易実装では固定値
      reworkRate: 10, // 簡易実装では固定値
    };
  }

  /**
   * インサイト生成
   */
  private generateInsights(): ImprovementAnalytics['insights'] {
    // ボトルネック分析
    const statusCounts = this.improvements.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bottlenecks: Bottleneck[] = [];
    if ((statusCounts.testing || 0) > (statusCounts.completed || 0) * 0.5) {
      bottlenecks.push({
        area: 'testing',
        description: 'テスト工程でのボトルネックが発生しています',
        impact: '完了までの時間が延長される可能性があります',
        frequency: statusCounts.testing || 0,
        averageDelay: 5, // 日数
        suggestedSolutions: ['テスト自動化の導入', 'テストリソースの増強'],
      });
    }

    const successFactors: SuccessFactor[] = [
      {
        factor: '明確な要件定義',
        correlation: 0.8,
        examples: ['要件が明確な改善項目は平均20%早く完了'],
        recommendedActions: ['要件定義プロセスの標準化'],
      },
    ];

    const riskIndicators: RiskIndicator[] = [
      {
        indicator: 'スコープクリープ率',
        currentValue: 15,
        threshold: 10,
        trend: 'worsening',
        prediction: '要件変更による遅延リスクが増加中',
      },
    ];

    const recommendations: AnalyticsRecommendation[] = [
      {
        category: 'プロセス改善',
        recommendation: 'テスト自動化の導入を検討してください',
        rationale: 'テスト工程でのボトルネックが確認されています',
        expectedImpact: '完了時間の20%短縮が期待できます',
        implementationEffort: 'medium',
        priority: 'high',
      },
    ];

    return {
      bottlenecks,
      successFactors,
      riskIndicators,
      recommendations,
    };
  }

  /**
   * CSVレポート生成
   */
  private generateCSVReport(): string {
    const headers = [
      'ID', 'Title', 'Category', 'Priority', 'Status', 'Progress', 
      'Estimated Hours', 'Actual Hours', 'Created', 'Completed', 'Assignee'
    ];
    
    const rows = this.improvements.map(item => [
      item.id,
      item.title,
      item.category,
      item.priority,
      item.status,
      `${item.progress.overallProgress.toFixed(1)}%`,
      item.estimatedHours,
      item.actualHours || '',
      new Date(item.createdAt).toISOString(),
      item.completedDate ? new Date(item.completedDate).toISOString() : '',
      item.assignee || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * HTMLレポート生成
   */
  private generateHTMLReport(includePlans: boolean): string {
    const analytics = this.analytics;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Improvement Implementation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .improvement-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .critical { border-left: 4px solid #ff3b30; }
        .high { border-left: 4px solid #ff9500; }
        .medium { border-left: 4px solid #ffcc00; }
        .low { border-left: 4px solid #34c759; }
        .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { background: #007AFF; height: 100%; transition: width 0.3s; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Improvement Implementation Report</h1>
        <p><strong>Total Improvements:</strong> ${analytics?.overview.totalImprovements || 0}</p>
        <p><strong>Completion Rate:</strong> ${((analytics?.overview.completionRate || 0) * 100).toFixed(1)}%</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <h3>Overview Metrics</h3>
        <div class="metric">
            <strong>Completed:</strong> ${analytics?.overview.completed || 0} / ${analytics?.overview.totalImprovements || 0}
        </div>
        <div class="metric">
            <strong>In Progress:</strong> ${analytics?.overview.inProgress || 0}
        </div>
        <div class="metric">
            <strong>Average Completion Time:</strong> ${analytics?.overview.averageCompletionTime ? Math.round(analytics.overview.averageCompletionTime / (24 * 60 * 60 * 1000)) : 0} days
        </div>
        <div class="metric">
            <strong>Total Business Value:</strong> $${(analytics?.overview.totalBusinessValue || 0).toLocaleString()}
        </div>
    </div>

    <div class="section">
        <h3>Performance Metrics</h3>
        <div class="metric">
            <strong>On-Time Delivery:</strong> ${analytics?.performance.onTimeDelivery.toFixed(1) || 0}%
        </div>
        <div class="metric">
            <strong>Budget Adherence:</strong> ${analytics?.performance.budgetAdherence.toFixed(1) || 0}%
        </div>
        <div class="metric">
            <strong>Quality Score:</strong> ${analytics?.performance.qualityScore.toFixed(1) || 0}%
        </div>
    </div>

    <div class="section">
        <h3>Active Improvements</h3>
        ${this.improvements.filter(item => item.status === 'in_progress').map(item => `
            <div class="improvement-item ${item.priority}">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${item.progress.overallProgress}%"></div>
                </div>
                <p><strong>Progress:</strong> ${item.progress.overallProgress.toFixed(1)}% | 
                   <strong>Priority:</strong> ${item.priority} | 
                   <strong>Assignee:</strong> ${item.assignee || 'Unassigned'}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Recent Completions</h3>
        ${this.improvements.filter(item => item.status === 'completed').slice(0, 10).map(item => `
            <div class="improvement-item">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
                <p><strong>Completed:</strong> ${item.completedDate ? new Date(item.completedDate).toLocaleDateString() : 'N/A'} | 
                   <strong>Category:</strong> ${item.category} | 
                   <strong>Business Value:</strong> $${(item.businessValue.revenueImpact + item.businessValue.costSaving).toLocaleString()}</p>
            </div>
        `).join('')}
    </div>

    ${includePlans ? `
    <div class="section">
        <h3>Improvement Plans</h3>
        ${this.plans.map(plan => `
            <div class="improvement-item">
                <h4>${plan.name}</h4>
                <p>${plan.description}</p>
                <p><strong>Status:</strong> ${plan.status} | 
                   <strong>Budget:</strong> $${plan.budget.allocated.toLocaleString()} | 
                   <strong>Improvements:</strong> ${plan.improvements.length}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h3>Recommendations</h3>
        ${analytics?.insights.recommendations.map(rec => `
            <div class="improvement-item">
                <h4>${rec.recommendation}</h4>
                <p>${rec.rationale}</p>
                <p><strong>Expected Impact:</strong> ${rec.expectedImpact} | 
                   <strong>Priority:</strong> ${rec.priority}</p>
            </div>
        `).join('') || 'No recommendations available'}
    </div>
</body>
</html>
    `.trim();
  }

  // === データ永続化メソッド ===

  private async loadImprovements(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.IMPROVEMENTS);
      if (stored) {
        this.improvements = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load improvements:', error);
    }
  }

  private async saveImprovements(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.IMPROVEMENTS, JSON.stringify(this.improvements));
  }

  private async loadPlans(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PLANS);
      if (stored) {
        this.plans = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  }

  private async savePlans(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.PLANS, JSON.stringify(this.plans));
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
   * 改善項目一覧取得
   */
  getImprovements(): ImprovementItem[] {
    return [...this.improvements];
  }

  /**
   * 改善計画一覧取得
   */
  getPlans(): ImprovementPlan[] {
    return [...this.plans];
  }

  /**
   * 分析結果取得
   */
  getAnalytics(): ImprovementAnalytics | null {
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
    totalImprovements: number;
    activeImprovements: number;
    completedImprovements: number;
    activePlans: number;
    completionRate: number;
  } {
    return {
      isInitialized: this.isInitialized,
      totalImprovements: this.improvements.length,
      activeImprovements: this.improvements.filter(item => item.status === 'in_progress').length,
      completedImprovements: this.improvements.filter(item => item.status === 'completed').length,
      activePlans: this.plans.filter(plan => plan.status === 'active').length,
      completionRate: this.analytics?.overview.completionRate || 0,
    };
  }
}

export const improvementImplementationTrackingService = new ImprovementImplementationTrackingService();
