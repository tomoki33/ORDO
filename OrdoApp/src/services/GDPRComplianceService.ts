import { privacyPolicyService, DataSubjectRequest, PrivacyConsent } from './PrivacyPolicyService';
import { localDataProtectionService } from './LocalDataProtectionService';
import { DataEncryptionService } from './DataEncryptionService';
import { Alert } from 'react-native';

export interface GDPRComplianceStatus {
  isCompliant: boolean;
  issues: ComplianceIssue[];
  lastAssessment: Date;
  score: number; // 0-100
  recommendations: string[];
}

export interface ComplianceIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'consent' | 'data_protection' | 'rights' | 'transparency' | 'security';
  title: string;
  description: string;
  recommendation: string;
  autoFixable: boolean;
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface DataMapping {
  dataType: string;
  category: 'personal' | 'sensitive' | 'anonymous' | 'pseudonymous';
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  purposes: string[];
  retentionPeriod: number;
  dataSubjects: string[];
  transferredToThirdParties: boolean;
  thirdParties?: string[];
  securityMeasures: string[];
  location: 'device' | 'cloud' | 'third_party';
}

export interface DataSubjectRights {
  access: boolean;          // Article 15
  rectification: boolean;   // Article 16
  erasure: boolean;         // Article 17
  restriction: boolean;     // Article 18
  portability: boolean;     // Article 20
  objection: boolean;       // Article 21
  automatedDecision: boolean; // Article 22
}

export interface BreachIncident {
  id: string;
  detectedAt: Date;
  reportedAt?: Date;
  category: 'confidentiality' | 'integrity' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDataTypes: string[];
  affectedSubjects: number;
  rootCause: string;
  containmentActions: string[];
  notificationRequired: boolean;
  supervisoryAuthorityNotified: boolean;
  dataSubjectsNotified: boolean;
  status: 'detected' | 'contained' | 'investigated' | 'resolved';
  resolution?: string;
}

export class GDPRComplianceService {
  private static instance: GDPRComplianceService;
  private encryptionService: DataEncryptionService;

  private readonly GDPR_REQUIREMENTS = {
    CONSENT_EXPIRY_MONTHS: 12,
    BREACH_NOTIFICATION_HOURS: 72,
    DATA_SUBJECT_RESPONSE_DAYS: 30,
    RETENTION_REVIEW_MONTHS: 6,
  };

  private readonly DATA_MAPPINGS: DataMapping[] = [
    {
      dataType: 'user_preferences',
      category: 'personal',
      legalBasis: 'consent',
      purposes: ['service_provision', 'personalization'],
      retentionPeriod: 365,
      dataSubjects: ['app_users'],
      transferredToThirdParties: false,
      securityMeasures: ['encryption', 'access_controls'],
      location: 'device',
    },
    {
      dataType: 'product_data',
      category: 'anonymous',
      legalBasis: 'legitimate_interests',
      purposes: ['inventory_management'],
      retentionPeriod: 1095,
      dataSubjects: ['app_users'],
      transferredToThirdParties: false,
      securityMeasures: ['local_storage', 'backup_encryption'],
      location: 'device',
    },
    {
      dataType: 'usage_analytics',
      category: 'pseudonymous',
      legalBasis: 'consent',
      purposes: ['service_improvement', 'analytics'],
      retentionPeriod: 90,
      dataSubjects: ['app_users'],
      transferredToThirdParties: false,
      securityMeasures: ['anonymization', 'aggregation'],
      location: 'device',
    },
    {
      dataType: 'device_identifiers',
      category: 'personal',
      legalBasis: 'legitimate_interests',
      purposes: ['security', 'fraud_prevention'],
      retentionPeriod: 365,
      dataSubjects: ['app_users'],
      transferredToThirdParties: false,
      securityMeasures: ['hashing', 'encryption'],
      location: 'device',
    },
  ];

  private constructor() {
    this.encryptionService = DataEncryptionService.getInstance();
  }

  public static getInstance(): GDPRComplianceService {
    if (!GDPRComplianceService.instance) {
      GDPRComplianceService.instance = new GDPRComplianceService();
    }
    return GDPRComplianceService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.encryptionService.initialize();
      await this.createDataMappings();
      await this.performComplianceAssessment();
      console.log('[GDPR] Compliance service initialized successfully');
    } catch (error) {
      console.error('[GDPR] Failed to initialize compliance service:', error);
      throw error;
    }
  }

  // ===== Compliance Assessment =====

  async performComplianceAssessment(): Promise<GDPRComplianceStatus> {
    try {
      const issues: ComplianceIssue[] = [];
      let score = 100;

      // Check consent management
      const consentIssues = await this.assessConsentCompliance();
      issues.push(...consentIssues);

      // Check data protection measures
      const protectionIssues = await this.assessDataProtectionCompliance();
      issues.push(...protectionIssues);

      // Check data subject rights implementation
      const rightsIssues = await this.assessDataSubjectRightsCompliance();
      issues.push(...rightsIssues);

      // Check transparency requirements
      const transparencyIssues = await this.assessTransparencyCompliance();
      issues.push(...transparencyIssues);

      // Check security measures
      const securityIssues = await this.assessSecurityCompliance();
      issues.push(...securityIssues);

      // Calculate compliance score
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const highIssues = issues.filter(i => i.severity === 'high').length;
      const mediumIssues = issues.filter(i => i.severity === 'medium').length;
      const lowIssues = issues.filter(i => i.severity === 'low').length;

      score -= (criticalIssues * 25) + (highIssues * 15) + (mediumIssues * 5) + (lowIssues * 2);
      score = Math.max(0, score);

      const complianceStatus: GDPRComplianceStatus = {
        isCompliant: score >= 80 && criticalIssues === 0,
        issues,
        lastAssessment: new Date(),
        score,
        recommendations: this.generateRecommendations(issues),
      };

      // Store assessment results
      await localDataProtectionService.protectedStore(
        'gdpr_compliance_assessment',
        complianceStatus,
        'security_logs'
      );

      console.log(`[GDPR] Compliance assessment completed. Score: ${score}%`);
      return complianceStatus;
    } catch (error) {
      console.error('[GDPR] Failed to perform compliance assessment:', error);
      throw error;
    }
  }

  async getLatestComplianceStatus(): Promise<GDPRComplianceStatus | null> {
    try {
      return await localDataProtectionService.protectedRetrieve<GDPRComplianceStatus>(
        'gdpr_compliance_assessment'
      );
    } catch (error) {
      console.error('[GDPR] Failed to get compliance status:', error);
      return null;
    }
  }

  // ===== Individual Compliance Checks =====

  private async assessConsentCompliance(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    try {
      const consents = await privacyPolicyService.getAllConsents();
      const policy = await privacyPolicyService.getCurrentPrivacyPolicy();

      // Check if privacy policy exists
      if (!policy) {
        issues.push({
          id: 'missing_privacy_policy',
          severity: 'critical',
          category: 'transparency',
          title: 'Missing Privacy Policy',
          description: 'No privacy policy found',
          recommendation: 'Create and publish a comprehensive privacy policy',
          autoFixable: true,
          detectedAt: new Date(),
        });
      }

      // Check consent expiry
      for (const [type, consent] of Object.entries(consents)) {
        if (consent.expiresAt && new Date() > new Date(consent.expiresAt)) {
          issues.push({
            id: `expired_consent_${type}`,
            severity: 'high',
            category: 'consent',
            title: `Expired Consent: ${type}`,
            description: `Consent for ${type} has expired`,
            recommendation: 'Request renewed consent from user',
            autoFixable: false,
            detectedAt: new Date(),
          });
        }
      }

      // Check for required consents
      const requiredConsents = ['data_collection'];
      for (const required of requiredConsents) {
        if (!consents[required] || !consents[required].granted) {
          issues.push({
            id: `missing_required_consent_${required}`,
            severity: 'critical',
            category: 'consent',
            title: `Missing Required Consent: ${required}`,
            description: `Required consent for ${required} is missing or not granted`,
            recommendation: 'Obtain explicit consent before processing data',
            autoFixable: false,
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('[GDPR] Error assessing consent compliance:', error);
    }

    return issues;
  }

  private async assessDataProtectionCompliance(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    try {
      const protectionConfig = localDataProtectionService.getConfiguration();

      // Check encryption enabled
      if (!protectionConfig.enableEncryption) {
        issues.push({
          id: 'encryption_disabled',
          severity: 'high',
          category: 'data_protection',
          title: 'Data Encryption Disabled',
          description: 'Personal data encryption is not enabled',
          recommendation: 'Enable data encryption for personal data protection',
          autoFixable: true,
          detectedAt: new Date(),
        });
      }

      // Check integrity checking
      if (!protectionConfig.enableIntegrityCheck) {
        issues.push({
          id: 'integrity_check_disabled',
          severity: 'medium',
          category: 'data_protection',
          title: 'Data Integrity Checking Disabled',
          description: 'Data integrity verification is not enabled',
          recommendation: 'Enable data integrity checking to detect tampering',
          autoFixable: true,
          detectedAt: new Date(),
        });
      }

      // Check access logging
      if (!protectionConfig.enableAccessLogging) {
        issues.push({
          id: 'access_logging_disabled',
          severity: 'medium',
          category: 'data_protection',
          title: 'Access Logging Disabled',
          description: 'Data access logging is not enabled',
          recommendation: 'Enable access logging for audit trails',
          autoFixable: true,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('[GDPR] Error assessing data protection compliance:', error);
    }

    return issues;
  }

  private async assessDataSubjectRightsCompliance(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    try {
      // Check if data subject rights are implemented
      const rightsImplemented = await this.checkDataSubjectRightsImplementation();

      if (!rightsImplemented.access) {
        issues.push({
          id: 'missing_right_to_access',
          severity: 'high',
          category: 'rights',
          title: 'Right to Access Not Implemented',
          description: 'Data subjects cannot access their personal data',
          recommendation: 'Implement data export functionality for user access',
          autoFixable: false,
          detectedAt: new Date(),
        });
      }

      if (!rightsImplemented.erasure) {
        issues.push({
          id: 'missing_right_to_erasure',
          severity: 'high',
          category: 'rights',
          title: 'Right to Erasure Not Implemented',
          description: 'Data subjects cannot request deletion of their data',
          recommendation: 'Implement secure data deletion functionality',
          autoFixable: false,
          detectedAt: new Date(),
        });
      }

      if (!rightsImplemented.portability) {
        issues.push({
          id: 'missing_right_to_portability',
          severity: 'medium',
          category: 'rights',
          title: 'Right to Data Portability Not Implemented',
          description: 'Data subjects cannot export their data in a portable format',
          recommendation: 'Implement data export in machine-readable format',
          autoFixable: false,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('[GDPR] Error assessing data subject rights compliance:', error);
    }

    return issues;
  }

  private async assessTransparencyCompliance(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    try {
      const policy = await privacyPolicyService.getCurrentPrivacyPolicy();

      if (policy) {
        // Check required sections
        const requiredSections = ['data_collection', 'data_use', 'your_rights', 'contact'];
        const existingSections = policy.content.sections.map(s => s.id);

        for (const required of requiredSections) {
          if (!existingSections.includes(required)) {
            issues.push({
              id: `missing_policy_section_${required}`,
              severity: 'medium',
              category: 'transparency',
              title: `Missing Policy Section: ${required}`,
              description: `Privacy policy is missing required section: ${required}`,
              recommendation: `Add ${required} section to privacy policy`,
              autoFixable: false,
              detectedAt: new Date(),
            });
          }
        }

        // Check if contact information is complete
        const contact = policy.content.contactInfo;
        if (!contact.email || !contact.dpoEmail) {
          issues.push({
            id: 'incomplete_contact_info',
            severity: 'high',
            category: 'transparency',
            title: 'Incomplete Contact Information',
            description: 'Privacy policy lacks complete contact information',
            recommendation: 'Add complete contact information including DPO email',
            autoFixable: false,
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('[GDPR] Error assessing transparency compliance:', error);
    }

    return issues;
  }

  private async assessSecurityCompliance(): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    try {
      // Check if encryption service is working by testing a simple operation
      try {
        await this.encryptionService.secureStore('gdpr_security_test', { test: true });
        await this.encryptionService.secureRetrieve('gdpr_security_test');
        await this.encryptionService.secureRemove('gdpr_security_test');
      } catch (error) {
        issues.push({
          id: 'encryption_service_issues',
          severity: 'critical',
          category: 'security',
          title: 'Encryption Service Issues',
          description: 'Data encryption service is not working properly',
          recommendation: 'Initialize encryption service and check configuration',
          autoFixable: true,
          detectedAt: new Date(),
        });
      }

      // Check data audit
      const auditResult = await localDataProtectionService.performDataAudit();
      if (auditResult.corruptedItems > 0) {
        issues.push({
          id: 'data_integrity_issues',
          severity: 'high',
          category: 'security',
          title: 'Data Integrity Issues Detected',
          description: `${auditResult.corruptedItems} corrupted data items found`,
          recommendation: 'Investigate and restore corrupted data items',
          autoFixable: false,
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('[GDPR] Error assessing security compliance:', error);
    }

    return issues;
  }

  // ===== Data Subject Rights Implementation =====

  async handleDataSubjectRequest(
    type: DataSubjectRequest['type'],
    description: string,
    dataTypes: string[]
  ): Promise<DataSubjectRequest> {
    try {
      // Create the request through privacy policy service
      const request = await privacyPolicyService.createDataSubjectRequest(type, description, dataTypes);

      // Log the request for GDPR compliance tracking
      await localDataProtectionService.protectedStore(
        `gdpr_request_${request.id}`,
        {
          requestId: request.id,
          type,
          timestamp: new Date(),
          dataTypes,
          processedUnderGDPR: true,
          responseDeadline: new Date(Date.now() + this.GDPR_REQUIREMENTS.DATA_SUBJECT_RESPONSE_DAYS * 24 * 60 * 60 * 1000),
        },
        'security_logs'
      );

      // Auto-process if possible
      if (this.canAutoProcess(type)) {
        await this.autoProcessDataSubjectRequest(request);
      }

      return request;
    } catch (error) {
      console.error('[GDPR] Failed to handle data subject request:', error);
      throw error;
    }
  }

  private canAutoProcess(type: DataSubjectRequest['type']): boolean {
    return ['access', 'portability'].includes(type);
  }

  private async autoProcessDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    try {
      switch (request.type) {
        case 'access':
          await this.processRightToAccess(request);
          break;
        case 'portability':
          await this.processRightToPortability(request);
          break;
        default:
          // Manual processing required
          break;
      }
    } catch (error) {
      console.error('[GDPR] Failed to auto-process data subject request:', error);
    }
  }

  private async processRightToAccess(request: DataSubjectRequest): Promise<void> {
    try {
      const complianceData = await localDataProtectionService.exportDataForCompliance();
      
      const accessResponse = {
        requestId: request.id,
        processedAt: new Date(),
        dataCategories: this.DATA_MAPPINGS.map(m => ({
          type: m.dataType,
          category: m.category,
          legalBasis: m.legalBasis,
          purposes: m.purposes,
          retentionPeriod: m.retentionPeriod,
        })),
        personalData: complianceData.personalData,
        accessLogs: complianceData.accessLogs.filter(log => 
          request.dataTypes.length === 0 || request.dataTypes.some(type => log.dataKey.includes(type))
        ),
      };

      await localDataProtectionService.protectedStore(
        `access_response_${request.id}`,
        accessResponse,
        'security_logs'
      );

      // Mark request as processed
      await privacyPolicyService.processDataSubjectRequest(
        request.id,
        'Data access request processed. Personal data export generated.'
      );
    } catch (error) {
      console.error('[GDPR] Failed to process right to access:', error);
    }
  }

  private async processRightToPortability(request: DataSubjectRequest): Promise<void> {
    try {
      const exportData = await localDataProtectionService.exportDataForCompliance();
      
      const portabilityResponse = {
        requestId: request.id,
        processedAt: new Date(),
        format: 'JSON',
        data: exportData.personalData.filter(item => 
          request.dataTypes.length === 0 || request.dataTypes.some(type => item.key.includes(type))
        ),
        metadata: {
          exportedAt: new Date(),
          dataTypes: request.dataTypes,
          format: 'machine-readable JSON',
          gdprCompliant: true,
        },
      };

      await localDataProtectionService.protectedStore(
        `portability_response_${request.id}`,
        portabilityResponse,
        'security_logs'
      );

      // Mark request as processed
      await privacyPolicyService.processDataSubjectRequest(
        request.id,
        'Data portability request processed. Machine-readable export generated.'
      );
    } catch (error) {
      console.error('[GDPR] Failed to process right to portability:', error);
    }
  }

  // ===== Breach Management =====

  async reportDataBreach(
    category: BreachIncident['category'],
    severity: BreachIncident['severity'],
    affectedDataTypes: string[],
    affectedSubjects: number,
    rootCause: string,
    containmentActions: string[]
  ): Promise<BreachIncident> {
    try {
      const breach: BreachIncident = {
        id: `breach_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        detectedAt: new Date(),
        category,
        severity,
        affectedDataTypes,
        affectedSubjects,
        rootCause,
        containmentActions,
        notificationRequired: this.assessNotificationRequirement(severity, affectedSubjects),
        supervisoryAuthorityNotified: false,
        dataSubjectsNotified: false,
        status: 'detected',
      };

      await localDataProtectionService.protectedStore(
        `data_breach_${breach.id}`,
        breach,
        'security_logs'
      );

      // Check if 72-hour notification is required
      if (breach.notificationRequired) {
        await this.scheduleBreachNotification(breach);
      }

      console.log(`[GDPR] Data breach reported: ${breach.id}`);
      return breach;
    } catch (error) {
      console.error('[GDPR] Failed to report data breach:', error);
      throw error;
    }
  }

  private assessNotificationRequirement(
    severity: BreachIncident['severity'],
    affectedSubjects: number
  ): boolean {
    // GDPR requires notification for breaches likely to result in risk to rights and freedoms
    return severity === 'high' || severity === 'critical' || affectedSubjects > 0;
  }

  private async scheduleBreachNotification(breach: BreachIncident): Promise<void> {
    try {
      const notificationDeadline = new Date(
        breach.detectedAt.getTime() + this.GDPR_REQUIREMENTS.BREACH_NOTIFICATION_HOURS * 60 * 60 * 1000
      );

      await localDataProtectionService.protectedStore(
        `breach_notification_${breach.id}`,
        {
          breachId: breach.id,
          deadline: notificationDeadline,
          supervisoryAuthorityRequired: true,
          dataSubjectsRequired: breach.severity === 'high' || breach.severity === 'critical',
          status: 'pending',
        },
        'security_logs'
      );

      console.log(`[GDPR] Breach notification scheduled for ${notificationDeadline}`);
    } catch (error) {
      console.error('[GDPR] Failed to schedule breach notification:', error);
    }
  }

  // ===== Utility Methods =====

  private async createDataMappings(): Promise<void> {
    try {
      await localDataProtectionService.protectedStore(
        'gdpr_data_mappings',
        this.DATA_MAPPINGS,
        'security_logs'
      );
    } catch (error) {
      console.error('[GDPR] Failed to create data mappings:', error);
    }
  }

  private async checkDataSubjectRightsImplementation(): Promise<DataSubjectRights> {
    // This would check if the UI and backend support for each right is implemented
    return {
      access: true,          // Implemented via data export
      rectification: false,  // Would need data editing functionality
      erasure: true,         // Implemented via data deletion
      restriction: false,    // Would need processing restriction
      portability: true,     // Implemented via portable export
      objection: false,      // Would need opt-out functionality
      automatedDecision: false, // No automated decision making in app
    };
  }

  private generateRecommendations(issues: ComplianceIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.category === 'consent')) {
      recommendations.push('Review and update consent management processes');
    }

    if (issues.some(i => i.category === 'data_protection')) {
      recommendations.push('Strengthen data protection technical measures');
    }

    if (issues.some(i => i.category === 'rights')) {
      recommendations.push('Implement missing data subject rights functionality');
    }

    if (issues.some(i => i.category === 'transparency')) {
      recommendations.push('Update privacy policy and transparency measures');
    }

    if (issues.some(i => i.category === 'security')) {
      recommendations.push('Enhance security controls and monitoring');
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    if (criticalIssues > 0) {
      recommendations.unshift('Address critical compliance issues immediately');
    }

    return recommendations;
  }

  // ===== Public API =====

  async getGDPRDashboard(): Promise<{
    complianceStatus: GDPRComplianceStatus | null;
    dataSubjectRequests: DataSubjectRequest[];
    activeBreach: BreachIncident | null;
    dataMapping: DataMapping[];
    rightsImplemented: DataSubjectRights;
  }> {
    try {
      const [complianceStatus, requests, rightsImplemented] = await Promise.all([
        this.getLatestComplianceStatus(),
        privacyPolicyService.getAllDataSubjectRequests(),
        this.checkDataSubjectRightsImplementation(),
      ]);

      const dataMapping = await localDataProtectionService.protectedRetrieve<DataMapping[]>(
        'gdpr_data_mappings'
      ) || this.DATA_MAPPINGS;

      // Check for active breaches
      const activeBreach = null; // Would implement breach retrieval

      return {
        complianceStatus,
        dataSubjectRequests: requests,
        activeBreach,
        dataMapping,
        rightsImplemented,
      };
    } catch (error) {
      console.error('[GDPR] Failed to get GDPR dashboard:', error);
      throw error;
    }
  }

  async performImpactAssessment(
    processingActivity: string,
    dataTypes: string[],
    purposes: string[]
  ): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    dpiaNnecessary: boolean;
    recommendations: string[];
  }> {
    try {
      // Simplified DPIA assessment
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      const recommendations: string[] = [];

      // Check for high-risk processing
      const sensitiveDataTypes = ['health_data', 'biometric_data', 'location_data'];
      const hasSensitiveData = dataTypes.some(type => sensitiveDataTypes.includes(type));

      if (hasSensitiveData) {
        riskLevel = 'high';
        recommendations.push('Conduct full Data Protection Impact Assessment (DPIA)');
      }

      const automatedPurposes = ['profiling', 'automated_decision'];
      const hasAutomatedProcessing = purposes.some(purpose => automatedPurposes.includes(purpose));

      if (hasAutomatedProcessing) {
        riskLevel = 'high';
        recommendations.push('Implement safeguards for automated processing');
      }

      const dpiaNnecessary = riskLevel === 'high';

      if (dpiaNnecessary) {
        recommendations.push('Document processing necessity and proportionality');
        recommendations.push('Implement additional security measures');
        recommendations.push('Consider consultation with supervisory authority');
      }

      return {
        riskLevel,
        dpiaNnecessary,
        recommendations,
      };
    } catch (error) {
      console.error('[GDPR] Failed to perform impact assessment:', error);
      throw error;
    }
  }
}

// Singleton instance
export const gdprComplianceService = GDPRComplianceService.getInstance();
