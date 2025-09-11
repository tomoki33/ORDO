import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  List,
  ProgressBar,
  Text,
  Divider,
  IconButton,
  FAB,
  Portal,
  Dialog,
  ActivityIndicator,
} from 'react-native-paper';
import {
  localDataProtectionService,
  privacyPolicyService,
  gdprComplianceService,
  securityAuditService,
  type DataAccessLog,
  type GDPRComplianceStatus,
  type SecurityAuditReport,
  type PrivacyConsent,
} from '../services';

interface SecurityDashboardData {
  dataProtectionAudit: {
    totalItems: number;
    encryptedItems: number;
    expiredItems: number;
    corruptedItems: number;
  };
  accessLogs: DataAccessLog[];
  complianceStatus: GDPRComplianceStatus | null;
  consents: { [key: string]: PrivacyConsent };
  latestAuditReport: SecurityAuditReport | null;
  isAuditRunning: boolean;
}

export default function SecurityDashboardScreen() {
  const [data, setData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        dataProtectionAudit,
        accessLogs,
        complianceStatus,
        consents,
        latestAuditReport,
        isAuditRunning,
      ] = await Promise.all([
        localDataProtectionService.performDataAudit(),
        localDataProtectionService.getAccessLogs(50),
        gdprComplianceService.getLatestComplianceStatus(),
        privacyPolicyService.getAllConsents(),
        securityAuditService.getLatestAuditReport(),
        Promise.resolve(securityAuditService.isAuditRunning()),
      ]);

      setData({
        dataProtectionAudit,
        accessLogs,
        complianceStatus,
        consents,
        latestAuditReport,
        isAuditRunning,
      });
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
      Alert.alert('Error', 'Failed to load security dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const runSecurityAudit = async () => {
    try {
      setShowAuditDialog(true);
      setAuditProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setAuditProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const auditReport = await securityAuditService.runFullSecurityAudit();
      
      clearInterval(progressInterval);
      setAuditProgress(100);

      setTimeout(() => {
        setShowAuditDialog(false);
        loadDashboardData();
        
        Alert.alert(
          'Security Audit Complete',
          `Audit completed with a score of ${auditReport.summary.overallScore}%.\n\n` +
          `${auditReport.summary.passedTests}/${auditReport.summary.totalTests} tests passed.\n` +
          `${auditReport.summary.criticalFindings + auditReport.summary.highFindings} critical/high issues found.`,
          [{ text: 'OK' }]
        );
      }, 1000);
    } catch (error) {
      setShowAuditDialog(false);
      console.error('Security audit failed:', error);
      Alert.alert('Audit Failed', 'Failed to run security audit. Please try again.');
    }
  };

  const getComplianceColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#FFC107';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getConsentStatus = (consent: PrivacyConsent): { label: string; color: string } => {
    if (!consent.granted) {
      return { label: 'Not Granted', color: '#F44336' };
    }
    if (consent.withdrawnAt) {
      return { label: 'Withdrawn', color: '#FF9800' };
    }
    if (consent.expiresAt && new Date() > new Date(consent.expiresAt)) {
      return { label: 'Expired', color: '#FF5722' };
    }
    return { label: 'Active', color: '#4CAF50' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Security Dashboard...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to load security data</Text>
        <Button onPress={loadDashboardData}>Retry</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* GDPR Compliance Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>GDPR Compliance Status</Title>
            {data.complianceStatus ? (
              <>
                <View style={styles.complianceHeader}>
                  <Text style={[
                    styles.complianceScore,
                    { color: getComplianceColor(data.complianceStatus.score) }
                  ]}>
                    {data.complianceStatus.score}%
                  </Text>
                  <Chip
                    style={[
                      styles.complianceChip,
                      { backgroundColor: data.complianceStatus.isCompliant ? '#E8F5E8' : '#FFEBEE' }
                    ]}
                    textStyle={{
                      color: data.complianceStatus.isCompliant ? '#2E7D32' : '#C62828'
                    }}
                  >
                    {data.complianceStatus.isCompliant ? 'Compliant' : 'Non-Compliant'}
                  </Chip>
                </View>
                <ProgressBar
                  progress={data.complianceStatus.score / 100}
                  color={getComplianceColor(data.complianceStatus.score)}
                  style={styles.progressBar}
                />
                <Text style={styles.lastAssessment}>
                  Last Assessment: {new Date(data.complianceStatus.lastAssessment).toLocaleDateString()}
                </Text>
                
                {data.complianceStatus.issues.length > 0 && (
                  <View style={styles.issuesContainer}>
                    <Text style={styles.issuesTitle}>Issues Found:</Text>
                    {data.complianceStatus.issues.slice(0, 3).map((issue, index) => (
                      <View key={index} style={styles.issueItem}>
                        <Chip
                          style={[
                            styles.severityChip,
                            { backgroundColor: issue.severity === 'critical' ? '#FFEBEE' : '#FFF3E0' }
                          ]}
                          textStyle={{
                            color: issue.severity === 'critical' ? '#C62828' : '#E65100'
                          }}
                        >
                          {issue.severity}
                        </Chip>
                        <Text style={styles.issueTitle}>{issue.title}</Text>
                      </View>
                    ))}
                    {data.complianceStatus.issues.length > 3 && (
                      <Text style={styles.moreIssues}>
                        +{data.complianceStatus.issues.length - 3} more issues
                      </Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <Paragraph>No compliance assessment available</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Data Protection Audit */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Data Protection Audit</Title>
            <View style={styles.auditGrid}>
              <View style={styles.auditItem}>
                <Text style={styles.auditNumber}>{data.dataProtectionAudit.totalItems}</Text>
                <Text style={styles.auditLabel}>Total Items</Text>
              </View>
              <View style={styles.auditItem}>
                <Text style={[styles.auditNumber, { color: '#4CAF50' }]}>
                  {data.dataProtectionAudit.encryptedItems}
                </Text>
                <Text style={styles.auditLabel}>Encrypted</Text>
              </View>
              <View style={styles.auditItem}>
                <Text style={[styles.auditNumber, { color: '#FF9800' }]}>
                  {data.dataProtectionAudit.expiredItems}
                </Text>
                <Text style={styles.auditLabel}>Expired</Text>
              </View>
              <View style={styles.auditItem}>
                <Text style={[styles.auditNumber, { color: '#F44336' }]}>
                  {data.dataProtectionAudit.corruptedItems}
                </Text>
                <Text style={styles.auditLabel}>Corrupted</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Privacy Consents */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Privacy Consents</Title>
            {Object.keys(data.consents).length > 0 ? (
              Object.entries(data.consents).map(([type, consent]) => {
                const status = getConsentStatus(consent);
                return (
                  <View key={type} style={styles.consentItem}>
                    <Text style={styles.consentType}>{type.replace('_', ' ').toUpperCase()}</Text>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: status.color + '20' }]}
                      textStyle={{ color: status.color }}
                    >
                      {status.label}
                    </Chip>
                  </View>
                );
              })
            ) : (
              <Paragraph>No consents recorded</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Recent Access Logs */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>Recent Data Access</Title>
              <Text style={styles.logCount}>
                {data.accessLogs.length} recent activities
              </Text>
            </View>
            {data.accessLogs.slice(0, 5).map((log, index) => (
              <View key={index} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>{log.action.toUpperCase()}</Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.logKey}>{log.dataKey}</Text>
                <Text style={styles.logClassification}>
                  Classification: {log.classification}
                </Text>
              </View>
            ))}
            {data.accessLogs.length === 0 && (
              <Paragraph>No recent access logs</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Latest Security Audit */}
        {data.latestAuditReport && (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Latest Security Audit</Title>
              <View style={styles.auditSummary}>
                <View style={styles.auditScoreContainer}>
                  <Text style={styles.auditScore}>
                    {data.latestAuditReport.summary.overallScore}%
                  </Text>
                  <Text style={styles.auditScoreLabel}>Overall Score</Text>
                </View>
                <View style={styles.auditStats}>
                  <Text style={styles.auditStat}>
                    {data.latestAuditReport.summary.passedTests}/{data.latestAuditReport.summary.totalTests} Tests Passed
                  </Text>
                  <Text style={styles.auditStat}>
                    {data.latestAuditReport.summary.criticalFindings} Critical Issues
                  </Text>
                  <Text style={styles.auditStat}>
                    Risk Level: {data.latestAuditReport.summary.riskLevel.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.auditDate}>
                Generated: {new Date(data.latestAuditReport.generatedAt).toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="shield-check"
        onPress={runSecurityAudit}
        disabled={data.isAuditRunning}
        label={data.isAuditRunning ? "Running..." : "Run Audit"}
      />

      {/* Audit Progress Dialog */}
      <Portal>
        <Dialog visible={showAuditDialog} dismissable={false}>
          <Dialog.Title>Running Security Audit</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.auditDialogText}>
              Performing comprehensive security assessment...
            </Text>
            <ProgressBar
              progress={auditProgress / 100}
              style={styles.auditProgressBar}
            />
            <Text style={styles.auditProgressText}>
              {Math.round(auditProgress)}% Complete
            </Text>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  complianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceScore: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  complianceChip: {
    alignSelf: 'flex-start',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  lastAssessment: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  issuesContainer: {
    marginTop: 8,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  severityChip: {
    marginRight: 8,
    height: 24,
  },
  issueTitle: {
    flex: 1,
    fontSize: 12,
  },
  moreIssues: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  auditGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  auditItem: {
    alignItems: 'center',
    flex: 1,
  },
  auditNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  auditLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  consentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  consentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusChip: {
    height: 28,
  },
  logCount: {
    fontSize: 12,
    color: '#666',
  },
  logItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logAction: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logKey: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  logClassification: {
    fontSize: 10,
    color: '#666',
  },
  auditSummary: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  auditScoreContainer: {
    alignItems: 'center',
    marginRight: 32,
  },
  auditScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  auditScoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  auditStats: {
    flex: 1,
  },
  auditStat: {
    fontSize: 14,
    marginBottom: 4,
  },
  auditDate: {
    fontSize: 12,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  auditDialogText: {
    marginBottom: 16,
  },
  auditProgressBar: {
    marginBottom: 8,
  },
  auditProgressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  bottomPadding: {
    height: 80,
  },
});
