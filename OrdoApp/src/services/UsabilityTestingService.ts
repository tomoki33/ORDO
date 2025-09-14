/**
 * Usability Testing Service
 * ユーザビリティテストの計画・実施・分析
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface UsabilityTestPlan {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  targetAudience: TargetAudience;
  methodology: TestMethodology;
  scenarios: TestScenario[];
  metrics: UsabilityMetric[];
  timeline: TestTimeline;
  resources: TestResource[];
  status: 'planning' | 'recruiting' | 'executing' | 'analyzing' | 'completed';
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface TargetAudience {
  demographics: {
    ageRange: { min: number; max: number };
    gender: 'male' | 'female' | 'any';
    location: string[];
    languages: string[];
  };
  userSegments: UserSegment[];
  sampleSize: number;
  recruitmentCriteria: string[];
  exclusionCriteria: string[];
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  percentage: number; // 全体に占める割合
}

export interface TestMethodology {
  type: 'moderated' | 'unmoderated' | 'hybrid';
  environment: 'lab' | 'remote' | 'field';
  duration: number; // minutes
  tools: string[];
  dataCollection: {
    screenRecording: boolean;
    audioRecording: boolean;
    clickTracking: boolean;
    eyeTracking: boolean;
    biometricData: boolean;
  };
  analysis: {
    quantitative: boolean;
    qualitative: boolean;
    heatmaps: boolean;
    userJourneyMapping: boolean;
    sentimentAnalysis: boolean;
  };
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  objective: string;
  preconditions: string[];
  steps: TestStep[];
  expectedOutcomes: string[];
  successCriteria: string[];
  timeAllocation: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface TestStep {
  id: string;
  order: number;
  instruction: string;
  expectedBehavior: string;
  notes?: string;
  timeLimit?: number; // seconds
  isOptional: boolean;
}

export interface UsabilityMetric {
  id: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative';
  category: 'efficiency' | 'effectiveness' | 'satisfaction' | 'learnability' | 'memorability' | 'errors';
  measurement: {
    unit: string;
    scale?: { min: number; max: number };
    benchmark?: number;
    target?: number;
  };
  calculationMethod: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TestTimeline {
  phases: TestPhase[];
  milestones: TestMilestone[];
  totalDuration: number; // days
  startDate: number;
  endDate: number;
}

export interface TestPhase {
  id: string;
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  deliverables: string[];
  dependencies: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
}

export interface TestMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: number;
  status: 'pending' | 'completed' | 'missed';
  deliverables: string[];
}

export interface TestResource {
  id: string;
  type: 'human' | 'tool' | 'facility' | 'budget';
  name: string;
  description: string;
  availability: {
    startDate: number;
    endDate: number;
    allocation: number; // percentage
  };
  cost?: number;
  contact?: string;
}

export interface UsabilityTestSession {
  id: string;
  testPlanId: string;
  participantId: string;
  moderatorId?: string;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  environment: 'remote' | 'in_person';
  recordings: {
    screen?: string;
    audio?: string;
    camera?: string;
  };
  scenarioResults: ScenarioResult[];
  overallFeedback: string;
  technicalIssues: string[];
  notes: string;
}

export interface TestParticipant {
  id: string;
  profile: ParticipantProfile;
  recruitment: {
    source: string;
    recruitedAt: number;
    recruiterNotes: string;
    screeningResponses: Record<string, any>;
    consentGiven: boolean;
    compensationAmount?: number;
  };
  sessions: string[]; // session IDs
  overallRating: number;
  feedback: string;
  followUpAllowed: boolean;
}

export interface ParticipantProfile {
  demographics: {
    age: number;
    gender: string;
    location: string;
    occupation: string;
    education: string;
    income?: string;
  };
  technicalProfile: {
    deviceExperience: Record<string, number>; // device type -> years
    appUsageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
    techSavviness: number; // 1-10 scale
    accessibilityNeeds: string[];
  };
  userBehavior: {
    preferredInteractionStyle: string;
    commonUseCases: string[];
    painPoints: string[];
    motivations: string[];
  };
  contact: {
    email: string;
    phone?: string;
    preferredMethod: 'email' | 'phone' | 'text';
    timezone: string;
    availability: string[];
  };
}

export interface ScenarioResult {
  scenarioId: string;
  startTime: number;
  endTime: number;
  duration: number;
  completed: boolean;
  success: boolean;
  stepResults: StepResult[];
  errors: UsabilityError[];
  userFeedback: string;
  observerNotes: string;
  metrics: Record<string, number>;
}

export interface StepResult {
  stepId: string;
  startTime: number;
  endTime: number;
  duration: number;
  completed: boolean;
  success: boolean;
  attempts: number;
  errors: string[];
  userComment?: string;
  observerNotes?: string;
}

export interface UsabilityError {
  id: string;
  timestamp: number;
  type: 'navigation' | 'input' | 'understanding' | 'technical' | 'design';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string; // screen/component
  userAction: string;
  expectedBehavior: string;
  actualBehavior: string;
  resolution?: string;
  impact: string;
}

export interface UsabilityInsights {
  overallUsabilityScore: number;
  categoryScores: Record<string, number>;
  keyFindings: Finding[];
  usabilityIssues: UsabilityIssue[];
  userJourneyAnalysis: JourneyAnalysis;
  recommendationsPrioritized: Recommendation[];
  benchmarkComparisons: BenchmarkComparison[];
  participantSegmentAnalysis: SegmentAnalysis[];
}

export interface Finding {
  id: string;
  category: string;
  type: 'positive' | 'negative' | 'observation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: string[];
  affectedUsers: number;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface UsabilityIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  affectedScenarios: string[];
  affectedUserSegments: string[];
  rootCause: string;
  businessImpact: string;
  designImplications: string[];
  technicalImplications: string[];
}

export interface JourneyAnalysis {
  commonPaths: JourneyPath[];
  dropOffPoints: DropOffPoint[];
  painPoints: PainPoint[];
  delightMoments: DelightMoment[];
  alternativeFlows: AlternativeFlow[];
}

export interface JourneyPath {
  path: string[];
  frequency: number;
  averageDuration: number;
  successRate: number;
  userSegments: string[];
}

export interface DropOffPoint {
  location: string;
  dropOffRate: number;
  reasons: string[];
  affectedSegments: string[];
}

export interface PainPoint {
  location: string;
  description: string;
  intensity: number; // 1-10
  frequency: number;
  causes: string[];
  userQuotes: string[];
}

export interface DelightMoment {
  location: string;
  description: string;
  frequency: number;
  userQuotes: string[];
  designElements: string[];
}

export interface AlternativeFlow {
  originalPath: string[];
  alternativePath: string[];
  frequency: number;
  efficiency: number;
  userType: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'design' | 'content' | 'functionality' | 'performance' | 'accessibility';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  rationale: string;
  implementationNotes: string[];
  successMetrics: string[];
  relatedIssues: string[];
  targetAudience: string[];
}

export interface BenchmarkComparison {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  industryAverage: number;
  competitorValues: Record<string, number>;
  performance: 'below' | 'at' | 'above';
  improvementOpportunity: number;
}

export interface SegmentAnalysis {
  segmentId: string;
  segmentName: string;
  participantCount: number;
  performanceMetrics: Record<string, number>;
  uniqueBehaviors: string[];
  specificIssues: string[];
  recommendations: string[];
}

class UsabilityTestingService {
  private testPlans: UsabilityTestPlan[] = [];
  private sessions: UsabilityTestSession[] = [];
  private participants: TestParticipant[] = [];
  private insights: UsabilityInsights | null = null;
  private isInitialized = false;

  private readonly STORAGE_KEYS = {
    TEST_PLANS: 'usability_test_plans',
    SESSIONS: 'usability_sessions',
    PARTICIPANTS: 'test_participants',
    INSIGHTS: 'usability_insights',
  };

  constructor() {
    // 初期化
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('🧪 Initializing Usability Testing Service...');

    try {
      // データ読み込み
      await Promise.all([
        this.loadTestPlans(),
        this.loadSessions(),
        this.loadParticipants(),
        this.loadInsights(),
      ]);

      this.isInitialized = true;
      console.log('✅ Usability Testing Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Usability Testing Service:', error);
      throw error;
    }
  }

  /**
   * ユーザビリティテスト計画作成
   */
  async createTestPlan(
    name: string,
    description: string,
    objectives: string[],
    targetAudience: TargetAudience,
    methodology: TestMethodology
  ): Promise<UsabilityTestPlan> {
    const testPlan: UsabilityTestPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      objectives,
      targetAudience,
      methodology,
      scenarios: [],
      metrics: this.getDefaultMetrics(),
      timeline: this.createDefaultTimeline(),
      resources: [],
      status: 'planning',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system', // 実際の実装ではユーザーIDを使用
    };

    this.testPlans.push(testPlan);
    await this.saveTestPlans();

    console.log('📋 Usability test plan created:', name);
    return testPlan;
  }

  /**
   * テストシナリオ追加
   */
  async addTestScenario(
    testPlanId: string,
    scenario: Omit<TestScenario, 'id'>
  ): Promise<TestScenario> {
    const testPlan = this.testPlans.find(plan => plan.id === testPlanId);
    if (!testPlan) {
      throw new Error(`Test plan not found: ${testPlanId}`);
    }

    const newScenario: TestScenario = {
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...scenario,
    };

    testPlan.scenarios.push(newScenario);
    testPlan.updatedAt = Date.now();
    await this.saveTestPlans();

    console.log('📝 Test scenario added:', newScenario.name);
    return newScenario;
  }

  /**
   * テスト参加者登録
   */
  async registerParticipant(
    profile: ParticipantProfile,
    recruitmentSource: string = 'direct',
    recruiterNotes: string = ''
  ): Promise<TestParticipant> {
    const participant: TestParticipant = {
      id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      profile,
      recruitment: {
        source: recruitmentSource,
        recruitedAt: Date.now(),
        recruiterNotes,
        screeningResponses: {},
        consentGiven: false,
        compensationAmount: 0,
      },
      sessions: [],
      overallRating: 0,
      feedback: '',
      followUpAllowed: false,
    };

    this.participants.push(participant);
    await this.saveParticipants();

    console.log('👤 Test participant registered:', profile.contact.email);
    return participant;
  }

  /**
   * テストセッションスケジュール
   */
  async scheduleTestSession(
    testPlanId: string,
    participantId: string,
    scheduledAt: number,
    moderatorId?: string,
    environment: 'remote' | 'in_person' = 'remote'
  ): Promise<UsabilityTestSession> {
    const testPlan = this.testPlans.find(plan => plan.id === testPlanId);
    if (!testPlan) {
      throw new Error(`Test plan not found: ${testPlanId}`);
    }

    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const session: UsabilityTestSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testPlanId,
      participantId,
      moderatorId,
      scheduledAt,
      status: 'scheduled',
      environment,
      recordings: {},
      scenarioResults: [],
      overallFeedback: '',
      technicalIssues: [],
      notes: '',
    };

    this.sessions.push(session);
    participant.sessions.push(session.id);

    await Promise.all([
      this.saveSessions(),
      this.saveParticipants(),
    ]);

    console.log('📅 Test session scheduled:', session.id);
    return session;
  }

  /**
   * テストセッション開始
   */
  async startTestSession(sessionId: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.startedAt = Date.now();
    session.status = 'in_progress';
    await this.saveSessions();

    console.log('▶️ Test session started:', sessionId);
  }

  /**
   * シナリオ実行結果記録
   */
  async recordScenarioResult(
    sessionId: string,
    scenarioId: string,
    result: Omit<ScenarioResult, 'scenarioId'>
  ): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const scenarioResult: ScenarioResult = {
      scenarioId,
      ...result,
    };

    session.scenarioResults.push(scenarioResult);
    await this.saveSessions();

    console.log('📊 Scenario result recorded:', { sessionId, scenarioId, success: result.success });
  }

  /**
   * テストセッション完了
   */
  async completeTestSession(
    sessionId: string,
    overallFeedback: string,
    technicalIssues: string[] = [],
    notes: string = ''
  ): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.completedAt = Date.now();
    session.duration = session.completedAt - (session.startedAt || session.scheduledAt);
    session.status = 'completed';
    session.overallFeedback = overallFeedback;
    session.technicalIssues = technicalIssues;
    session.notes = notes;

    await this.saveSessions();

    console.log('✅ Test session completed:', sessionId);
  }

  /**
   * ユーザビリティ分析実行
   */
  async analyzeUsabilityData(testPlanId?: string): Promise<UsabilityInsights> {
    console.log('🔍 Analyzing usability data...');

    const relevantSessions = testPlanId 
      ? this.sessions.filter(s => s.testPlanId === testPlanId && s.status === 'completed')
      : this.sessions.filter(s => s.status === 'completed');

    if (relevantSessions.length === 0) {
      throw new Error('No completed sessions found for analysis');
    }

    // 全体的なユーザビリティスコア計算
    const overallUsabilityScore = this.calculateOverallUsabilityScore(relevantSessions);

    // カテゴリ別スコア計算
    const categoryScores = this.calculateCategoryScores(relevantSessions);

    // 主要な発見事項抽出
    const keyFindings = this.extractKeyFindings(relevantSessions);

    // ユーザビリティ問題特定
    const usabilityIssues = this.identifyUsabilityIssues(relevantSessions);

    // ユーザージャーニー分析
    const userJourneyAnalysis = this.analyzeUserJourneys(relevantSessions);

    // 推奨事項生成
    const recommendationsPrioritized = this.generateRecommendations(usabilityIssues, keyFindings);

    // ベンチマーク比較
    const benchmarkComparisons = this.performBenchmarkComparisons(categoryScores);

    // 参加者セグメント分析
    const participantSegmentAnalysis = this.analyzeParticipantSegments(relevantSessions);

    this.insights = {
      overallUsabilityScore,
      categoryScores,
      keyFindings,
      usabilityIssues,
      userJourneyAnalysis,
      recommendationsPrioritized,
      benchmarkComparisons,
      participantSegmentAnalysis,
    };

    await this.saveInsights();

    console.log('✅ Usability analysis completed. Overall score:', overallUsabilityScore);
    return this.insights;
  }

  /**
   * テストレポート生成
   */
  async generateTestReport(testPlanId: string, format: 'html' | 'pdf' | 'json' = 'html'): Promise<string> {
    const testPlan = this.testPlans.find(plan => plan.id === testPlanId);
    if (!testPlan) {
      throw new Error(`Test plan not found: ${testPlanId}`);
    }

    const sessions = this.sessions.filter(s => s.testPlanId === testPlanId && s.status === 'completed');
    const insights = await this.analyzeUsabilityData(testPlanId);

    if (format === 'json') {
      return JSON.stringify({
        testPlan,
        sessions,
        insights,
        generatedAt: Date.now(),
      }, null, 2);
    }

    // HTMLレポート生成
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Usability Test Report - ${testPlan.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .finding { border-left: 4px solid #007AFF; padding: 15px; margin: 10px 0; background: #f0f8ff; }
        .issue { border-left: 4px solid #ff3b30; padding: 15px; margin: 10px 0; background: #fff5f5; }
        .recommendation { border-left: 4px solid #34c759; padding: 15px; margin: 10px 0; background: #f0fff4; }
        .chart { height: 300px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; display: flex; align-items: center; justify-content: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Usability Test Report</h1>
        <h2>${testPlan.name}</h2>
        <p><strong>Test Period:</strong> ${new Date(testPlan.timeline.startDate).toLocaleDateString()} - ${new Date(testPlan.timeline.endDate).toLocaleDateString()}</p>
        <p><strong>Participants:</strong> ${sessions.length} completed sessions</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="section">
        <h3>Executive Summary</h3>
        <div class="metric">
            <h4>Overall Usability Score: ${insights.overallUsabilityScore}/100</h4>
            <p>Based on ${sessions.length} user testing sessions across ${testPlan.scenarios.length} scenarios.</p>
        </div>
    </div>

    <div class="section">
        <h3>Key Metrics</h3>
        ${Object.entries(insights.categoryScores).map(([category, score]) => `
            <div class="metric">
                <strong>${category.charAt(0).toUpperCase() + category.slice(1)}:</strong> ${score}/100
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Key Findings</h3>
        ${insights.keyFindings.slice(0, 5).map(finding => `
            <div class="finding">
                <h4>${finding.title}</h4>
                <p>${finding.description}</p>
                <p><strong>Impact:</strong> ${finding.impact} | <strong>Affected Users:</strong> ${finding.affectedUsers}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Critical Issues</h3>
        ${insights.usabilityIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high').map(issue => `
            <div class="issue">
                <h4>${issue.title} (${issue.severity.toUpperCase()})</h4>
                <p>${issue.description}</p>
                <p><strong>Frequency:</strong> ${issue.frequency} occurrences</p>
                <p><strong>Root Cause:</strong> ${issue.rootCause}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Recommendations</h3>
        ${insights.recommendationsPrioritized.slice(0, 10).map(rec => `
            <div class="recommendation">
                <h4>${rec.title} (${rec.priority.toUpperCase()} Priority)</h4>
                <p>${rec.description}</p>
                <p><strong>Expected Impact:</strong> ${rec.impact} | <strong>Effort:</strong> ${rec.effort}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Session Summary</h3>
        <table>
            <thead>
                <tr>
                    <th>Session</th>
                    <th>Participant</th>
                    <th>Duration</th>
                    <th>Scenarios Completed</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.map(session => {
                  const participant = this.participants.find(p => p.id === session.participantId);
                  const successfulScenarios = session.scenarioResults.filter(r => r.success).length;
                  const successRate = session.scenarioResults.length > 0 
                    ? (successfulScenarios / session.scenarioResults.length * 100).toFixed(1)
                    : '0';
                  
                  return `
                    <tr>
                        <td>${session.id.substr(-8)}</td>
                        <td>${participant?.profile.demographics.age}歳 ${participant?.profile.demographics.gender}</td>
                        <td>${session.duration ? Math.round(session.duration / 60000) : 'N/A'} min</td>
                        <td>${session.scenarioResults.length}</td>
                        <td>${successRate}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Methodology</h3>
        <p><strong>Type:</strong> ${testPlan.methodology.type}</p>
        <p><strong>Environment:</strong> ${testPlan.methodology.environment}</p>
        <p><strong>Duration:</strong> ${testPlan.methodology.duration} minutes per session</p>
        <p><strong>Data Collection:</strong> ${Object.entries(testPlan.methodology.dataCollection)
          .filter(([_, enabled]) => enabled)
          .map(([method, _]) => method)
          .join(', ')}</p>
    </div>
</body>
</html>
    `.trim();

    return htmlReport;
  }

  // === プライベートメソッド ===

  /**
   * デフォルトメトリクス取得
   */
  private getDefaultMetrics(): UsabilityMetric[] {
    return [
      {
        id: 'task_completion_rate',
        name: 'Task Completion Rate',
        description: 'Percentage of tasks completed successfully',
        type: 'quantitative',
        category: 'effectiveness',
        measurement: {
          unit: 'percentage',
          scale: { min: 0, max: 100 },
          benchmark: 80,
          target: 90,
        },
        calculationMethod: 'successful_tasks / total_tasks * 100',
        priority: 'high',
      },
      {
        id: 'task_completion_time',
        name: 'Task Completion Time',
        description: 'Average time to complete tasks',
        type: 'quantitative',
        category: 'efficiency',
        measurement: {
          unit: 'seconds',
          benchmark: 120,
          target: 90,
        },
        calculationMethod: 'sum(task_durations) / completed_tasks',
        priority: 'high',
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        description: 'Number of errors per task',
        type: 'quantitative',
        category: 'errors',
        measurement: {
          unit: 'errors_per_task',
          benchmark: 0.5,
          target: 0.2,
        },
        calculationMethod: 'total_errors / total_tasks',
        priority: 'medium',
      },
      {
        id: 'user_satisfaction',
        name: 'User Satisfaction',
        description: 'Overall satisfaction score',
        type: 'qualitative',
        category: 'satisfaction',
        measurement: {
          unit: 'score',
          scale: { min: 1, max: 10 },
          benchmark: 7,
          target: 8,
        },
        calculationMethod: 'average(satisfaction_ratings)',
        priority: 'high',
      },
      {
        id: 'learnability',
        name: 'Learnability',
        description: 'How quickly users learn to use the interface',
        type: 'quantitative',
        category: 'learnability',
        measurement: {
          unit: 'improvement_percentage',
          scale: { min: 0, max: 100 },
          benchmark: 30,
          target: 50,
        },
        calculationMethod: '(first_time - repeat_time) / first_time * 100',
        priority: 'medium',
      },
    ];
  }

  /**
   * デフォルトタイムライン作成
   */
  private createDefaultTimeline(): TestTimeline {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return {
      phases: [
        {
          id: 'planning',
          name: 'Planning & Preparation',
          description: 'Test plan creation and scenario development',
          startDate: now,
          endDate: now + 7 * oneDay,
          deliverables: ['Test Plan', 'Scenarios', 'Recruitment Plan'],
          dependencies: [],
          status: 'not_started',
        },
        {
          id: 'recruitment',
          name: 'Participant Recruitment',
          description: 'Finding and screening test participants',
          startDate: now + 7 * oneDay,
          endDate: now + 14 * oneDay,
          deliverables: ['Recruited Participants', 'Scheduled Sessions'],
          dependencies: ['planning'],
          status: 'not_started',
        },
        {
          id: 'execution',
          name: 'Test Execution',
          description: 'Running usability testing sessions',
          startDate: now + 14 * oneDay,
          endDate: now + 21 * oneDay,
          deliverables: ['Session Recordings', 'Raw Data'],
          dependencies: ['recruitment'],
          status: 'not_started',
        },
        {
          id: 'analysis',
          name: 'Data Analysis',
          description: 'Analyzing test results and generating insights',
          startDate: now + 21 * oneDay,
          endDate: now + 28 * oneDay,
          deliverables: ['Analysis Report', 'Recommendations'],
          dependencies: ['execution'],
          status: 'not_started',
        },
      ],
      milestones: [
        {
          id: 'test_plan_complete',
          name: 'Test Plan Complete',
          description: 'Test plan and scenarios finalized',
          dueDate: now + 7 * oneDay,
          status: 'pending',
          deliverables: ['Approved Test Plan'],
        },
        {
          id: 'participants_recruited',
          name: 'Participants Recruited',
          description: 'All participants recruited and scheduled',
          dueDate: now + 14 * oneDay,
          status: 'pending',
          deliverables: ['10+ Participants Confirmed'],
        },
        {
          id: 'testing_complete',
          name: 'Testing Complete',
          description: 'All testing sessions completed',
          dueDate: now + 21 * oneDay,
          status: 'pending',
          deliverables: ['10+ Completed Sessions'],
        },
        {
          id: 'final_report',
          name: 'Final Report',
          description: 'Final analysis and recommendations delivered',
          dueDate: now + 28 * oneDay,
          status: 'pending',
          deliverables: ['Usability Report', 'Improvement Roadmap'],
        },
      ],
      totalDuration: 28,
      startDate: now,
      endDate: now + 28 * oneDay,
    };
  }

  /**
   * 全体的なユーザビリティスコア計算
   */
  private calculateOverallUsabilityScore(sessions: UsabilityTestSession[]): number {
    if (sessions.length === 0) return 0;

    let totalScore = 0;
    let validSessions = 0;

    sessions.forEach(session => {
      if (session.scenarioResults.length > 0) {
        const successRate = session.scenarioResults.filter(r => r.success).length / session.scenarioResults.length;
        const avgDuration = session.scenarioResults.reduce((sum, r) => sum + r.duration, 0) / session.scenarioResults.length;
        const errorCount = session.scenarioResults.reduce((sum, r) => sum + r.errors.length, 0);

        // スコア計算（簡易版）
        let sessionScore = successRate * 60; // 成功率 (60点満点)
        sessionScore += Math.max(0, 20 - (avgDuration / 30000) * 10); // 効率性 (20点満点)
        sessionScore += Math.max(0, 20 - errorCount * 2); // エラー率 (20点満点)

        totalScore += Math.min(100, sessionScore);
        validSessions++;
      }
    });

    return validSessions > 0 ? Math.round(totalScore / validSessions) : 0;
  }

  /**
   * カテゴリ別スコア計算
   */
  private calculateCategoryScores(sessions: UsabilityTestSession[]): Record<string, number> {
    const categories = ['effectiveness', 'efficiency', 'satisfaction', 'learnability', 'errors'];
    const scores: Record<string, number> = {};

    categories.forEach(category => {
      // 各カテゴリのスコア計算ロジック（簡易版）
      switch (category) {
        case 'effectiveness':
          scores[category] = this.calculateEffectivenessScore(sessions);
          break;
        case 'efficiency':
          scores[category] = this.calculateEfficiencyScore(sessions);
          break;
        case 'satisfaction':
          scores[category] = this.calculateSatisfactionScore(sessions);
          break;
        case 'learnability':
          scores[category] = this.calculateLearnabilityScore(sessions);
          break;
        case 'errors':
          scores[category] = this.calculateErrorScore(sessions);
          break;
        default:
          scores[category] = 75; // デフォルト値
      }
    });

    return scores;
  }

  private calculateEffectivenessScore(sessions: UsabilityTestSession[]): number {
    const totalTasks = sessions.reduce((sum, s) => sum + s.scenarioResults.length, 0);
    const successfulTasks = sessions.reduce((sum, s) => sum + s.scenarioResults.filter(r => r.success).length, 0);
    return totalTasks > 0 ? Math.round((successfulTasks / totalTasks) * 100) : 0;
  }

  private calculateEfficiencyScore(sessions: UsabilityTestSession[]): number {
    const durations = sessions.flatMap(s => s.scenarioResults.map(r => r.duration));
    if (durations.length === 0) return 0;
    
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const benchmark = 120000; // 2分
    return Math.max(0, Math.round(100 - ((avgDuration - benchmark) / benchmark) * 50));
  }

  private calculateSatisfactionScore(sessions: UsabilityTestSession[]): number {
    // 満足度の計算（フィードバックの感情分析などを想定）
    return 78; // 簡易版では固定値
  }

  private calculateLearnabilityScore(sessions: UsabilityTestSession[]): number {
    // 学習しやすさの計算
    return 72; // 簡易版では固定値
  }

  private calculateErrorScore(sessions: UsabilityTestSession[]): number {
    const totalTasks = sessions.reduce((sum, s) => sum + s.scenarioResults.length, 0);
    const totalErrors = sessions.reduce((sum, s) => 
      sum + s.scenarioResults.reduce((errorSum, r) => errorSum + r.errors.length, 0), 0);
    
    if (totalTasks === 0) return 100;
    const errorRate = totalErrors / totalTasks;
    return Math.max(0, Math.round(100 - errorRate * 50));
  }

  /**
   * 主要な発見事項抽出
   */
  private extractKeyFindings(sessions: UsabilityTestSession[]): Finding[] {
    const findings: Finding[] = [];

    // 成功率の分析
    const successRates = sessions.map(s => 
      s.scenarioResults.length > 0 ? s.scenarioResults.filter(r => r.success).length / s.scenarioResults.length : 0
    );
    const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;

    if (avgSuccessRate < 0.7) {
      findings.push({
        id: 'low_success_rate',
        category: 'effectiveness',
        type: 'negative',
        severity: 'high',
        title: 'Low Task Completion Rate',
        description: `Average task completion rate is ${(avgSuccessRate * 100).toFixed(1)}%, below the 70% threshold.`,
        evidence: [`${sessions.length} sessions analyzed`, `Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`],
        affectedUsers: sessions.length,
        confidence: 0.9,
        impact: 'high',
        effort: 'medium',
        priority: 1,
      });
    }

    // 共通のエラーパターン分析
    const allErrors = sessions.flatMap(s => s.scenarioResults.flatMap(r => r.errors));
    const errorTypes = allErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(errorTypes).forEach(([type, count]) => {
      if (count >= sessions.length * 0.3) { // 30%以上のユーザーに影響
        findings.push({
          id: `common_error_${type}`,
          category: 'errors',
          type: 'negative',
          severity: count >= sessions.length * 0.5 ? 'high' : 'medium',
          title: `Common ${type} Error Pattern`,
          description: `${count} occurrences of ${type} errors across sessions.`,
          evidence: [`${count} occurrences`, `Affects ${Math.round(count/sessions.length*100)}% of users`],
          affectedUsers: count,
          confidence: 0.8,
          impact: 'medium',
          effort: 'medium',
          priority: 2,
        });
      }
    });

    return findings.sort((a, b) => a.priority - b.priority);
  }

  /**
   * ユーザビリティ問題特定
   */
  private identifyUsabilityIssues(sessions: UsabilityTestSession[]): UsabilityIssue[] {
    const issues: UsabilityIssue[] = [];

    // エラー分析による問題特定
    const errorsByLocation: Record<string, UsabilityError[]> = {};
    sessions.forEach(session => {
      session.scenarioResults.forEach(result => {
        result.errors.forEach(error => {
          if (!errorsByLocation[error.location]) {
            errorsByLocation[error.location] = [];
          }
          errorsByLocation[error.location].push(error);
        });
      });
    });

    Object.entries(errorsByLocation).forEach(([location, errors]) => {
      if (errors.length >= 3) { // 3回以上発生した問題
        const severityCounts = errors.reduce((acc, error) => {
          acc[error.severity] = (acc[error.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const maxSeverity = Object.entries(severityCounts)
          .sort(([,a], [,b]) => b - a)[0][0] as 'low' | 'medium' | 'high' | 'critical';

        issues.push({
          id: `issue_${location}_${Date.now()}`,
          title: `Usability Issue at ${location}`,
          description: `Multiple users experienced difficulties at ${location}`,
          category: errors[0].type,
          severity: maxSeverity,
          frequency: errors.length,
          affectedScenarios: [...new Set(errors.map(e => 'scenario'))], // 簡易版
          affectedUserSegments: ['all'], // 簡易版
          rootCause: `Common interaction problems at ${location}`,
          businessImpact: `${errors.length} user failures at critical touchpoint`,
          designImplications: ['Improve UI clarity', 'Add visual feedback'],
          technicalImplications: ['Review component behavior', 'Add error handling'],
        });
      }
    });

    return issues;
  }

  /**
   * ユーザージャーニー分析
   */
  private analyzeUserJourneys(sessions: UsabilityTestSession[]): JourneyAnalysis {
    // 簡易版の実装
    return {
      commonPaths: [
        {
          path: ['home', 'product_scan', 'product_details', 'add_to_inventory'],
          frequency: Math.floor(sessions.length * 0.8),
          averageDuration: 180000, // 3分
          successRate: 0.85,
          userSegments: ['all'],
        },
      ],
      dropOffPoints: [
        {
          location: 'product_scan',
          dropOffRate: 0.15,
          reasons: ['Camera permission issues', 'Poor lighting'],
          affectedSegments: ['older_users'],
        },
      ],
      painPoints: [
        {
          location: 'product_scan',
          description: 'Users struggle with camera positioning',
          intensity: 7,
          frequency: Math.floor(sessions.length * 0.3),
          causes: ['Unclear instructions', 'No visual feedback'],
          userQuotes: ['I don\'t know how to position the camera', 'It\'s not detecting the product'],
        },
      ],
      delightMoments: [
        {
          location: 'ai_recognition',
          description: 'Users impressed by accurate product recognition',
          frequency: Math.floor(sessions.length * 0.6),
          userQuotes: ['Wow, it recognized it perfectly!', 'That was faster than I expected'],
          designElements: ['Visual feedback', 'Confidence score'],
        },
      ],
      alternativeFlows: [],
    };
  }

  /**
   * 推奨事項生成
   */
  private generateRecommendations(issues: UsabilityIssue[], findings: Finding[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    issues.forEach(issue => {
      if (issue.severity === 'high' || issue.severity === 'critical') {
        recommendations.push({
          id: `rec_${issue.id}`,
          title: `Address ${issue.title}`,
          description: `Implement design changes to resolve the ${issue.category} issue`,
          category: 'design',
          priority: issue.severity === 'critical' ? 'critical' : 'high',
          effort: 'medium',
          impact: 'high',
          rationale: `This issue affects ${issue.frequency} users and has ${issue.severity} severity`,
          implementationNotes: issue.designImplications,
          successMetrics: ['Reduced error rate', 'Improved task completion'],
          relatedIssues: [issue.id],
          targetAudience: issue.affectedUserSegments,
        });
      }
    });

    findings.forEach(finding => {
      if (finding.type === 'negative' && finding.severity === 'high') {
        recommendations.push({
          id: `rec_${finding.id}`,
          title: `Improve ${finding.category}`,
          description: finding.description,
          category: 'functionality',
          priority: 'high',
          effort: finding.effort,
          impact: finding.impact,
          rationale: `Critical finding affecting ${finding.affectedUsers} users`,
          implementationNotes: ['Analyze root cause', 'Implement targeted fixes'],
          successMetrics: ['Improved user satisfaction', 'Reduced task time'],
          relatedIssues: [finding.id],
          targetAudience: ['all'],
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * ベンチマーク比較
   */
  private performBenchmarkComparisons(categoryScores: Record<string, number>): BenchmarkComparison[] {
    const benchmarks = {
      effectiveness: { benchmark: 80, industry: 75 },
      efficiency: { benchmark: 75, industry: 70 },
      satisfaction: { benchmark: 80, industry: 78 },
      learnability: { benchmark: 70, industry: 68 },
      errors: { benchmark: 85, industry: 80 },
    };

    return Object.entries(categoryScores).map(([metric, currentValue]) => ({
      metric,
      currentValue,
      benchmarkValue: benchmarks[metric as keyof typeof benchmarks]?.benchmark || 75,
      industryAverage: benchmarks[metric as keyof typeof benchmarks]?.industry || 70,
      competitorValues: {}, // 実際の実装では競合他社のデータを使用
      performance: currentValue >= (benchmarks[metric as keyof typeof benchmarks]?.benchmark || 75) ? 'above' : 'below',
      improvementOpportunity: Math.max(0, (benchmarks[metric as keyof typeof benchmarks]?.benchmark || 75) - currentValue),
    }));
  }

  /**
   * 参加者セグメント分析
   */
  private analyzeParticipantSegments(sessions: UsabilityTestSession[]): SegmentAnalysis[] {
    // 簡易版の実装
    return [
      {
        segmentId: 'tech_savvy',
        segmentName: 'Tech-Savvy Users',
        participantCount: Math.floor(sessions.length * 0.4),
        performanceMetrics: {
          task_completion_rate: 85,
          average_task_time: 90,
          error_rate: 0.2,
        },
        uniqueBehaviors: ['Skip onboarding', 'Use shortcuts', 'Explore advanced features'],
        specificIssues: ['Want more customization options'],
        recommendations: ['Add advanced features', 'Provide power user shortcuts'],
      },
      {
        segmentId: 'casual_users',
        segmentName: 'Casual Users',
        participantCount: Math.floor(sessions.length * 0.6),
        performanceMetrics: {
          task_completion_rate: 70,
          average_task_time: 150,
          error_rate: 0.5,
        },
        uniqueBehaviors: ['Follow guided flows', 'Need clear instructions', 'Prefer simple UI'],
        specificIssues: ['Confused by complex navigation', 'Need more guidance'],
        recommendations: ['Simplify UI', 'Add more tooltips', 'Improve onboarding'],
      },
    ];
  }

  // === データ永続化メソッド ===

  private async loadTestPlans(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.TEST_PLANS);
      if (stored) {
        this.testPlans = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load test plans:', error);
    }
  }

  private async saveTestPlans(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.TEST_PLANS, JSON.stringify(this.testPlans));
  }

  private async loadSessions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSIONS);
      if (stored) {
        this.sessions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  private async saveSessions(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
  }

  private async loadParticipants(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PARTICIPANTS);
      if (stored) {
        this.participants = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  }

  private async saveParticipants(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.PARTICIPANTS, JSON.stringify(this.participants));
  }

  private async loadInsights(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.INSIGHTS);
      if (stored) {
        this.insights = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }

  private async saveInsights(): Promise<void> {
    if (this.insights) {
      await AsyncStorage.setItem(this.STORAGE_KEYS.INSIGHTS, JSON.stringify(this.insights));
    }
  }

  // === 公開API ===

  /**
   * テスト計画一覧取得
   */
  getTestPlans(): UsabilityTestPlan[] {
    return [...this.testPlans];
  }

  /**
   * セッション一覧取得
   */
  getSessions(): UsabilityTestSession[] {
    return [...this.sessions];
  }

  /**
   * 参加者一覧取得
   */
  getParticipants(): TestParticipant[] {
    return [...this.participants];
  }

  /**
   * インサイト取得
   */
  getInsights(): UsabilityInsights | null {
    return this.insights;
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
    testPlansCount: number;
    activeSessionsCount: number;
    participantsCount: number;
    hasInsights: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      testPlansCount: this.testPlans.length,
      activeSessionsCount: this.sessions.filter(s => s.status === 'in_progress').length,
      participantsCount: this.participants.length,
      hasInsights: !!this.insights,
    };
  }
}

export const usabilityTestingService = new UsabilityTestingService();
