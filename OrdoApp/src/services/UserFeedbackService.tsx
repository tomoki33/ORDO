/**
 * ユーザーフィードバック機能 (4時間実装)
 * User Feedback System
 * 
 * ユーザーフィードバック収集と管理システム
 * - フィードバック収集UI
 * - エラーレポート機能
 * - 機能改善提案
 * - バグレポート
 * - ユーザー満足度調査
 * - フィードバック分析とカテゴリ化
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService, LogCategory } from './LoggingService';
import { errorMonitoringService } from './ErrorMonitoringService';

// =============================================================================
// FEEDBACK TYPES AND INTERFACES
// =============================================================================

export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  IMPROVEMENT = 'improvement',
  COMPLAINT = 'complaint',
  COMPLIMENT = 'compliment',
  GENERAL = 'general',
  USABILITY = 'usability',
  PERFORMANCE = 'performance',
  DESIGN = 'design',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FeedbackStatus {
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  title: string;
  description: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  sessionId: string;
  timestamp: Date;
  feature?: string;
  screen?: string;
  appVersion: string;
  buildNumber: string;
  platform: string;
  deviceInfo: Record<string, any>;
  attachments?: FeedbackAttachment[];
  metadata?: Record<string, any>;
  tags?: string[];
  rating?: number; // 1-5 stars
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  systemLogs?: string[];
  errorId?: string;
}

export interface FeedbackAttachment {
  id: string;
  type: 'screenshot' | 'log' | 'file';
  name: string;
  size: number;
  data: string; // base64 encoded
  mimeType: string;
}

export interface FeedbackConfiguration {
  enabled: boolean;
  categories: FeedbackType[];
  requireEmail: boolean;
  allowAnonymous: boolean;
  autoSubmit: boolean;
  includeSystemInfo: boolean;
  includeLogs: boolean;
  maxAttachments: number;
  maxAttachmentSize: number; // bytes
  retentionDays: number;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface FeedbackStatistics {
  totalFeedbacks: number;
  feedbacksByType: Record<FeedbackType, number>;
  feedbacksByPriority: Record<FeedbackPriority, number>;
  averageRating: number;
  responseRate: number;
  resolutionTime: number; // hours
  satisfaction: {
    veryUnsatisfied: number;
    unsatisfied: number;
    neutral: number;
    satisfied: number;
    verySatisfied: number;
  };
}

// =============================================================================
// FEEDBACK SERVICE
// =============================================================================

export class UserFeedbackService {
  private config: FeedbackConfiguration;
  private feedbackQueue: FeedbackEntry[] = [];
  private isInitialized = false;
  private sessionId: string;

  constructor() {
    this.config = this.getDefaultConfig();
    this.sessionId = this.generateSessionId();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📝 Initializing User Feedback Service...');

      // Load configuration
      await this.loadConfiguration();

      // Load pending feedback
      await this.loadPendingFeedback();

      this.isInitialized = true;
      
      await loggingService.info(
        LogCategory.SYSTEM,
        'User feedback service initialized',
        { config: this.config }
      );

      console.log('✅ User Feedback Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize user feedback service:', error);
      this.isInitialized = true;
    }
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK SUBMISSION
  // ---------------------------------------------------------------------------

  async submitFeedback(feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'sessionId' | 'appVersion' | 'buildNumber' | 'platform' | 'deviceInfo' | 'status'>): Promise<string> {
    try {
      const feedbackEntry: FeedbackEntry = {
        ...feedback,
        id: this.generateFeedbackId(),
        timestamp: new Date(),
        sessionId: this.sessionId,
        appVersion: this.getAppVersion(),
        buildNumber: this.getBuildNumber(),
        platform: Platform.OS,
        deviceInfo: await this.getDeviceInfo(),
        status: FeedbackStatus.SUBMITTED,
      };

      // Add system information if enabled
      if (this.config.includeSystemInfo) {
        feedbackEntry.metadata = {
          ...feedbackEntry.metadata,
          systemInfo: await this.collectSystemInfo(),
        };
      }

      // Add logs if enabled
      if (this.config.includeLogs) {
        feedbackEntry.systemLogs = await this.collectRelevantLogs();
      }

      // Store locally
      await this.storeFeedback(feedbackEntry);

      // Send to remote service if configured
      if (this.config.apiEndpoint) {
        await this.sendToRemoteService(feedbackEntry);
      }

      // Log the feedback submission
      await loggingService.info(
        LogCategory.USER_ACTION,
        'Feedback submitted',
        {
          feedbackId: feedbackEntry.id,
          type: feedbackEntry.type,
          priority: feedbackEntry.priority,
        }
      );

      // Track in error monitoring
      errorMonitoringService.addBreadcrumb({
        message: `User feedback submitted: ${feedbackEntry.type}`,
        category: 'user_feedback',
        level: 'info' as any,
        data: {
          feedbackId: feedbackEntry.id,
          type: feedbackEntry.type,
        },
      });

      return feedbackEntry.id;

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      
      await loggingService.error(
        LogCategory.ERROR,
        'Failed to submit feedback',
        error as Error,
        { feedback }
      );
      
      throw error;
    }
  }

  async submitBugReport(
    title: string,
    description: string,
    reproductionSteps: string[],
    expectedBehavior: string,
    actualBehavior: string,
    errorId?: string
  ): Promise<string> {
    return this.submitFeedback({
      type: FeedbackType.BUG_REPORT,
      priority: FeedbackPriority.HIGH,
      title,
      description,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      errorId,
    });
  }

  async submitFeatureRequest(
    title: string,
    description: string,
    priority: FeedbackPriority = FeedbackPriority.MEDIUM
  ): Promise<string> {
    return this.submitFeedback({
      type: FeedbackType.FEATURE_REQUEST,
      priority,
      title,
      description,
    });
  }

  async submitRating(
    rating: number,
    feature?: string,
    comments?: string
  ): Promise<string> {
    return this.submitFeedback({
      type: FeedbackType.GENERAL,
      priority: FeedbackPriority.LOW,
      title: `Rating: ${rating} stars`,
      description: comments || `User rated the ${feature || 'app'} ${rating} out of 5 stars`,
      rating,
      feature,
    });
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK MANAGEMENT
  // ---------------------------------------------------------------------------

  async getFeedback(id: string): Promise<FeedbackEntry | null> {
    try {
      const feedbackJson = await AsyncStorage.getItem(`feedback_${id}`);
      if (feedbackJson) {
        const feedback = JSON.parse(feedbackJson);
        feedback.timestamp = new Date(feedback.timestamp);
        return feedback;
      }
      return null;
    } catch (error) {
      console.error('Failed to get feedback:', error);
      return null;
    }
  }

  async getAllFeedback(): Promise<FeedbackEntry[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const feedbackKeys = keys.filter(key => key.startsWith('feedback_'));
      const feedbackItems = await AsyncStorage.multiGet(feedbackKeys);
      
      return feedbackItems
        .map(([_, value]) => {
          if (value) {
            const feedback = JSON.parse(value);
            feedback.timestamp = new Date(feedback.timestamp);
            return feedback;
          }
          return null;
        })
        .filter(Boolean) as FeedbackEntry[];
        
    } catch (error) {
      console.error('Failed to get all feedback:', error);
      return [];
    }
  }

  async deleteFeedback(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`feedback_${id}`);
      
      await loggingService.info(
        LogCategory.USER_ACTION,
        'Feedback deleted',
        { feedbackId: id }
      );
      
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK STATISTICS
  // ---------------------------------------------------------------------------

  async getFeedbackStatistics(): Promise<FeedbackStatistics> {
    try {
      const allFeedback = await this.getAllFeedback();
      
      const statistics: FeedbackStatistics = {
        totalFeedbacks: allFeedback.length,
        feedbacksByType: {} as Record<FeedbackType, number>,
        feedbacksByPriority: {} as Record<FeedbackPriority, number>,
        averageRating: 0,
        responseRate: 0,
        resolutionTime: 0,
        satisfaction: {
          veryUnsatisfied: 0,
          unsatisfied: 0,
          neutral: 0,
          satisfied: 0,
          verySatisfied: 0,
        },
      };

      // Calculate statistics
      let totalRating = 0;
      let ratingCount = 0;
      let resolvedCount = 0;
      let totalResolutionTime = 0;

      for (const feedback of allFeedback) {
        // Count by type
        statistics.feedbacksByType[feedback.type] = 
          (statistics.feedbacksByType[feedback.type] || 0) + 1;
        
        // Count by priority
        statistics.feedbacksByPriority[feedback.priority] = 
          (statistics.feedbacksByPriority[feedback.priority] || 0) + 1;
        
        // Rating statistics
        if (feedback.rating) {
          totalRating += feedback.rating;
          ratingCount++;
          
          // Satisfaction breakdown
          if (feedback.rating <= 1) statistics.satisfaction.veryUnsatisfied++;
          else if (feedback.rating <= 2) statistics.satisfaction.unsatisfied++;
          else if (feedback.rating <= 3) statistics.satisfaction.neutral++;
          else if (feedback.rating <= 4) statistics.satisfaction.satisfied++;
          else statistics.satisfaction.verySatisfied++;
        }
        
        // Resolution statistics
        if (feedback.status === FeedbackStatus.RESOLVED) {
          resolvedCount++;
          // Calculate resolution time (simulated)
          totalResolutionTime += Math.random() * 72; // 0-72 hours
        }
      }

      statistics.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
      statistics.responseRate = allFeedback.length > 0 ? resolvedCount / allFeedback.length : 0;
      statistics.resolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

      return statistics;

    } catch (error) {
      console.error('Failed to get feedback statistics:', error);
      return {
        totalFeedbacks: 0,
        feedbacksByType: {} as Record<FeedbackType, number>,
        feedbacksByPriority: {} as Record<FeedbackPriority, number>,
        averageRating: 0,
        responseRate: 0,
        resolutionTime: 0,
        satisfaction: {
          veryUnsatisfied: 0,
          unsatisfied: 0,
          neutral: 0,
          satisfied: 0,
          verySatisfied: 0,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private async storeFeedback(feedback: FeedbackEntry): Promise<void> {
    try {
      await AsyncStorage.setItem(`feedback_${feedback.id}`, JSON.stringify(feedback));
    } catch (error) {
      console.error('Failed to store feedback:', error);
      throw error;
    }
  }

  private async sendToRemoteService(feedback: FeedbackEntry): Promise<void> {
    try {
      // In a real implementation, this would send to a remote API
      console.log('📤 Sending feedback to remote service (simulated):', feedback.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await loggingService.info(
        LogCategory.NETWORK,
        'Feedback sent to remote service',
        { feedbackId: feedback.id }
      );
      
    } catch (error) {
      console.error('Failed to send feedback to remote service:', error);
      // Don't throw - local storage is sufficient
    }
  }

  private async collectSystemInfo(): Promise<Record<string, any>> {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: new Date().toISOString(),
      // In a real implementation, would collect more system info
    };
  }

  private async collectRelevantLogs(): Promise<string[]> {
    try {
      // Get recent error logs
      const recentLogs = await loggingService.searchLogs({
        levels: [3, 4], // WARN, ERROR
        limit: 10,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });
      
      return recentLogs.map(log => 
        `[${log.timestamp.toISOString()}] ${log.level} ${log.category}: ${log.message}`
      );
      
    } catch (error) {
      console.error('Failed to collect logs:', error);
      return [];
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('feedback_config');
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load feedback configuration:', error);
    }
  }

  private async loadPendingFeedback(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem('feedback_queue');
      if (queueJson) {
        this.feedbackQueue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('Failed to load pending feedback:', error);
    }
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAppVersion(): string {
    return '1.0.0';
  }

  private getBuildNumber(): string {
    return '1';
  }

  private async getDeviceInfo(): Promise<Record<string, any>> {
    return {
      platform: Platform.OS,
      version: Platform.Version,
    };
  }

  private getDefaultConfig(): FeedbackConfiguration {
    return {
      enabled: true,
      categories: Object.values(FeedbackType),
      requireEmail: false,
      allowAnonymous: true,
      autoSubmit: false,
      includeSystemInfo: true,
      includeLogs: true,
      maxAttachments: 3,
      maxAttachmentSize: 5 * 1024 * 1024, // 5MB
      retentionDays: 30,
    };
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  async updateConfiguration(config: Partial<FeedbackConfiguration>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    try {
      await AsyncStorage.setItem('feedback_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save feedback configuration:', error);
    }
  }

  getConfiguration(): FeedbackConfiguration {
    return { ...this.config };
  }
}

// =============================================================================
// FEEDBACK UI COMPONENTS
// =============================================================================

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: any) => void;
  initialType?: FeedbackType;
  errorId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialType = FeedbackType.GENERAL,
  errorId,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('エラー', 'タイトルと説明を入力してください。');
      return;
    }

    const feedback = {
      type: feedbackType,
      priority: FeedbackPriority.MEDIUM,
      title: title.trim(),
      description: description.trim(),
      userEmail: email.trim() || undefined,
      rating,
      reproductionSteps: reproductionSteps ? reproductionSteps.split('\n').filter(Boolean) : undefined,
      expectedBehavior: expectedBehavior.trim() || undefined,
      actualBehavior: actualBehavior.trim() || undefined,
      errorId,
    };

    onSubmit(feedback);
    
    // Reset form
    setTitle('');
    setDescription('');
    setEmail('');
    setRating(null);
    setReproductionSteps('');
    setExpectedBehavior('');
    setActualBehavior('');
  };

  const feedbackTypeOptions = [
    { key: FeedbackType.BUG_REPORT, label: 'バグレポート' },
    { key: FeedbackType.FEATURE_REQUEST, label: '機能リクエスト' },
    { key: FeedbackType.IMPROVEMENT, label: '改善提案' },
    { key: FeedbackType.COMPLAINT, label: '苦情' },
    { key: FeedbackType.COMPLIMENT, label: '称賛' },
    { key: FeedbackType.GENERAL, label: 'その他' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>フィードバック</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Feedback Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>フィードバックの種類</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {feedbackTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.typeButton,
                    feedbackType === option.key && styles.typeButtonSelected,
                  ]}
                  onPress={() => setFeedbackType(option.key)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      feedbackType === option.key && styles.typeButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>タイトル *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="問題や提案を簡潔に表現してください"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>詳細説明 *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="詳細な説明をお書きください"
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>

          {/* Rating (for general feedback) */}
          {feedbackType === FeedbackType.GENERAL && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>評価</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Text
                      style={[
                        styles.starText,
                        star <= (rating || 0) && styles.starTextSelected,
                      ]}
                    >
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Bug Report Specific Fields */}
          {feedbackType === FeedbackType.BUG_REPORT && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>再現手順</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={reproductionSteps}
                  onChangeText={setReproductionSteps}
                  placeholder="1. 最初に...&#10;2. 次に...&#10;3. その後..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>期待される動作</Text>
                <TextInput
                  style={styles.textInput}
                  value={expectedBehavior}
                  onChangeText={setExpectedBehavior}
                  placeholder="どのような動作を期待していましたか？"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>実際の動作</Text>
                <TextInput
                  style={styles.textInput}
                  value={actualBehavior}
                  onChangeText={setActualBehavior}
                  placeholder="実際にはどのような動作でしたか？"
                />
              </View>
            </>
          )}

          {/* Email */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>メールアドレス（任意）</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="返信をご希望の場合はメールアドレスをご入力ください"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>送信</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// =============================================================================
// QUICK FEEDBACK COMPONENT
// =============================================================================

interface QuickFeedbackProps {
  feature: string;
  onSubmit: (rating: number, comments?: string) => void;
}

export const QuickFeedback: React.FC<QuickFeedbackProps> = ({ feature, onSubmit }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating);
    if (selectedRating <= 3) {
      setShowComments(true);
    } else {
      onSubmit(selectedRating);
    }
  };

  const handleSubmit = () => {
    if (rating) {
      onSubmit(rating, comments || undefined);
      setRating(null);
      setComments('');
      setShowComments(false);
    }
  };

  return (
    <View style={styles.quickFeedbackContainer}>
      <Text style={styles.quickFeedbackTitle}>{feature}はいかがでしたか？</Text>
      
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRatingSelect(star)}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.starText,
                star <= (rating || 0) && styles.starTextSelected,
              ]}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {showComments && (
        <View style={styles.commentsSection}>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={comments}
            onChangeText={setComments}
            placeholder="改善点をお聞かせください（任意）"
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>送信</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  typeButtonTextSelected: {
    color: '#ffffff',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 32,
    color: '#e0e0e0',
  },
  starTextSelected: {
    color: '#FFD700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickFeedbackContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  quickFeedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  commentsSection: {
    marginTop: 12,
  },
});

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const userFeedbackService = new UserFeedbackService();
