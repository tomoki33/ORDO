import { localDataProtectionService } from './LocalDataProtectionService';
import { DataEncryptionService } from './DataEncryptionService';

export interface PrivacyConsent {
  id: string;
  consentType: 'data_collection' | 'analytics' | 'marketing' | 'cookies' | 'location' | 'biometric';
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  withdrawnAt?: Date;
  expiresAt?: Date;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  description: string;
  dataTypes: string[];
  reason?: string;
  response?: string;
  attachments?: string[];
}

export interface PrivacyPolicyVersion {
  version: string;
  effectiveDate: Date;
  content: PrivacyPolicyContent;
  isActive: boolean;
  acceptanceRequired: boolean;
}

export interface PrivacyPolicyContent {
  title: string;
  sections: PrivacyPolicySection[];
  lastUpdated: Date;
  contactInfo: ContactInfo;
  legalBasis: LegalBasis[];
}

export interface PrivacyPolicySection {
  id: string;
  title: string;
  content: string;
  subsections?: PrivacyPolicySection[];
  isRequired: boolean;
  consentType?: string;
}

export interface ContactInfo {
  companyName: string;
  address: string;
  email: string;
  phone?: string;
  website?: string;
  dpoEmail?: string; // Data Protection Officer
}

export interface LegalBasis {
  type: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  description: string;
  dataTypes: string[];
  purposes: string[];
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // in days
  legalBasis: string;
  deletionMethod: 'automatic' | 'manual' | 'anonymization';
  exceptions: string[];
}

export class PrivacyPolicyService {
  private static instance: PrivacyPolicyService;
  private encryptionService: DataEncryptionService;

  private readonly CURRENT_POLICY_VERSION = '1.0.0';
  private readonly CONSENT_EXPIRY_DAYS = 365; // 1 year

  private constructor() {
    this.encryptionService = DataEncryptionService.getInstance();
  }

  public static getInstance(): PrivacyPolicyService {
    if (!PrivacyPolicyService.instance) {
      PrivacyPolicyService.instance = new PrivacyPolicyService();
    }
    return PrivacyPolicyService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.encryptionService.initialize();
      await this.createDefaultPrivacyPolicy();
      await this.createDefaultDataRetentionPolicies();
      console.log('[PrivacyPolicy] Service initialized successfully');
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to initialize:', error);
      throw error;
    }
  }

  // ===== Privacy Policy Management =====

  async createDefaultPrivacyPolicy(): Promise<void> {
    try {
      const existingPolicy = await this.getCurrentPrivacyPolicy();
      if (existingPolicy) {
        return; // Already exists
      }

      const defaultPolicy: PrivacyPolicyVersion = {
        version: this.CURRENT_POLICY_VERSION,
        effectiveDate: new Date(),
        isActive: true,
        acceptanceRequired: true,
        content: {
          title: 'Ordo - Privacy Policy',
          lastUpdated: new Date(),
          contactInfo: {
            companyName: 'Ordo App',
            address: 'Not specified',
            email: 'privacy@ordoapp.com',
            dpoEmail: 'dpo@ordoapp.com',
          },
          sections: [
            {
              id: 'data_collection',
              title: 'Data Collection',
              content: `We collect the following types of data to provide you with our food inventory management services:

• Product Information: Names, expiration dates, locations, categories
• Usage Analytics: App usage patterns, feature utilization
• Device Information: Device identifiers, operating system information
• Location Data: For location-based product organization (optional)

All data is stored locally on your device and encrypted for your protection.`,
              isRequired: true,
              consentType: 'data_collection',
            },
            {
              id: 'data_use',
              title: 'How We Use Your Data',
              content: `Your data is used exclusively for:

• Providing inventory management functionality
• Improving app performance and user experience
• Generating expiration notifications and reminders
• Organizing products by location and category

We do not sell, share, or distribute your personal data to third parties.`,
              isRequired: true,
            },
            {
              id: 'data_storage',
              title: 'Data Storage and Security',
              content: `Your data is:

• Stored locally on your device using encrypted databases
• Protected with industry-standard AES-256 encryption
• Automatically backed up with your device's backup system
• Never transmitted to external servers without your explicit consent

You have full control over your data at all times.`,
              isRequired: true,
            },
            {
              id: 'your_rights',
              title: 'Your Rights',
              content: `Under applicable privacy laws, you have the right to:

• Access your personal data
• Correct inaccurate information
• Delete your data (Right to be Forgotten)
• Export your data (Data Portability)
• Restrict processing of your data
• Object to certain processing activities

You can exercise these rights through the app's settings or by contacting us.`,
              isRequired: true,
            },
            {
              id: 'analytics',
              title: 'Analytics and Improvements',
              content: `With your consent, we may collect anonymous usage analytics to improve the app. This includes:

• Feature usage statistics
• Performance metrics
• Error reports (anonymized)

You can opt out of analytics collection at any time in the app settings.`,
              isRequired: false,
              consentType: 'analytics',
            },
            {
              id: 'contact',
              title: 'Contact Information',
              content: `For privacy-related questions or to exercise your rights, contact us at:

Email: privacy@ordoapp.com
Data Protection Officer: dpo@ordoapp.com

We will respond to your request within 30 days as required by law.`,
              isRequired: true,
            },
          ],
          legalBasis: [
            {
              type: 'consent',
              description: 'User consent for data processing',
              dataTypes: ['product_data', 'usage_analytics'],
              purposes: ['service_provision', 'app_improvement'],
            },
            {
              type: 'legitimate_interests',
              description: 'Legitimate interest in providing core functionality',
              dataTypes: ['product_data', 'device_info'],
              purposes: ['core_functionality', 'security'],
            },
          ],
        },
      };

      await localDataProtectionService.protectedStore(
        'privacy_policy_current',
        defaultPolicy,
        'security_logs'
      );

      console.log('[PrivacyPolicy] Default privacy policy created');
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to create default privacy policy:', error);
    }
  }

  async getCurrentPrivacyPolicy(): Promise<PrivacyPolicyVersion | null> {
    try {
      return await localDataProtectionService.protectedRetrieve<PrivacyPolicyVersion>(
        'privacy_policy_current'
      );
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get current privacy policy:', error);
      return null;
    }
  }

  async updatePrivacyPolicy(content: PrivacyPolicyContent): Promise<PrivacyPolicyVersion> {
    try {
      const currentPolicy = await this.getCurrentPrivacyPolicy();
      const newVersion = this.incrementVersion(currentPolicy?.version || '1.0.0');

      const newPolicy: PrivacyPolicyVersion = {
        version: newVersion,
        effectiveDate: new Date(),
        content,
        isActive: true,
        acceptanceRequired: true,
      };

      // Archive current policy
      if (currentPolicy) {
        await localDataProtectionService.protectedStore(
          `privacy_policy_${currentPolicy.version}`,
          { ...currentPolicy, isActive: false },
          'security_logs'
        );
      }

      // Store new policy
      await localDataProtectionService.protectedStore(
        'privacy_policy_current',
        newPolicy,
        'security_logs'
      );

      // Invalidate all existing consents that require re-acceptance
      await this.invalidateConsentsForNewPolicy(newPolicy);

      console.log(`[PrivacyPolicy] Updated to version ${newVersion}`);
      return newPolicy;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to update privacy policy:', error);
      throw error;
    }
  }

  // ===== Consent Management =====

  async recordConsent(
    consentType: PrivacyConsent['consentType'],
    granted: boolean,
    userAgent?: string,
    ipAddress?: string
  ): Promise<PrivacyConsent> {
    try {
      const consent: PrivacyConsent = {
        id: `consent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        consentType,
        granted,
        timestamp: new Date(),
        version: this.CURRENT_POLICY_VERSION,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      };

      // Store individual consent
      await localDataProtectionService.protectedStore(
        `consent_${consentType}`,
        consent,
        'user_data'
      );

      // Update consent registry
      const consentRegistry = await this.getConsentRegistry();
      consentRegistry[consentType] = consent;
      await localDataProtectionService.protectedStore(
        'consent_registry',
        consentRegistry,
        'user_data'
      );

      console.log(`[PrivacyPolicy] Recorded consent: ${consentType} = ${granted}`);
      return consent;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to record consent:', error);
      throw error;
    }
  }

  async getConsent(consentType: PrivacyConsent['consentType']): Promise<PrivacyConsent | null> {
    try {
      const consent = await localDataProtectionService.protectedRetrieve<PrivacyConsent>(
        `consent_${consentType}`
      );

      // Check if consent has expired
      if (consent && consent.expiresAt && new Date() > new Date(consent.expiresAt)) {
        await this.withdrawConsent(consentType, 'expired');
        return null;
      }

      return consent;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get consent:', error);
      return null;
    }
  }

  async getAllConsents(): Promise<{ [key: string]: PrivacyConsent }> {
    try {
      const consentRegistry = await localDataProtectionService.protectedRetrieve<{
        [key: string]: PrivacyConsent;
      }>('consent_registry');
      return consentRegistry || {};
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get all consents:', error);
      return {};
    }
  }

  async withdrawConsent(
    consentType: PrivacyConsent['consentType'],
    reason: string = 'user_request'
  ): Promise<void> {
    try {
      const consent = await this.getConsent(consentType);
      if (consent) {
        const withdrawnConsent: PrivacyConsent = {
          ...consent,
          granted: false,
          withdrawnAt: new Date(),
        };

        await localDataProtectionService.protectedStore(
          `consent_${consentType}`,
          withdrawnConsent,
          'user_data'
        );

        // Update registry
        const consentRegistry = await this.getConsentRegistry();
        consentRegistry[consentType] = withdrawnConsent;
        await localDataProtectionService.protectedStore(
          'consent_registry',
          consentRegistry,
          'user_data'
        );

        // Log withdrawal
        await localDataProtectionService.protectedStore(
          `consent_withdrawal_${Date.now()}`,
          {
            consentType,
            withdrawnAt: new Date(),
            reason,
            originalConsentId: consent.id,
          },
          'security_logs'
        );

        console.log(`[PrivacyPolicy] Withdrawn consent: ${consentType} (${reason})`);
      }
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to withdraw consent:', error);
      throw error;
    }
  }

  async hasValidConsent(consentType: PrivacyConsent['consentType']): Promise<boolean> {
    try {
      const consent = await this.getConsent(consentType);
      return consent?.granted === true && !consent.withdrawnAt;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to check consent validity:', error);
      return false;
    }
  }

  // ===== Data Subject Requests =====

  async createDataSubjectRequest(
    type: DataSubjectRequest['type'],
    description: string,
    dataTypes: string[]
  ): Promise<DataSubjectRequest> {
    try {
      const request: DataSubjectRequest = {
        id: `dsr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        type,
        status: 'pending',
        requestedAt: new Date(),
        description,
        dataTypes,
      };

      await localDataProtectionService.protectedStore(
        `data_subject_request_${request.id}`,
        request,
        'security_logs'
      );

      // Add to requests index
      const requestsIndex = await this.getDataSubjectRequestsIndex();
      requestsIndex.push(request.id);
      await localDataProtectionService.protectedStore(
        'data_subject_requests_index',
        requestsIndex,
        'security_logs'
      );

      console.log(`[PrivacyPolicy] Created data subject request: ${type}`);
      return request;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to create data subject request:', error);
      throw error;
    }
  }

  async getDataSubjectRequest(requestId: string): Promise<DataSubjectRequest | null> {
    try {
      return await localDataProtectionService.protectedRetrieve<DataSubjectRequest>(
        `data_subject_request_${requestId}`
      );
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get data subject request:', error);
      return null;
    }
  }

  async getAllDataSubjectRequests(): Promise<DataSubjectRequest[]> {
    try {
      const index = await this.getDataSubjectRequestsIndex();
      const requests: DataSubjectRequest[] = [];

      for (const requestId of index) {
        const request = await this.getDataSubjectRequest(requestId);
        if (request) {
          requests.push(request);
        }
      }

      return requests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get all data subject requests:', error);
      return [];
    }
  }

  async processDataSubjectRequest(requestId: string, response?: string): Promise<DataSubjectRequest | null> {
    try {
      const request = await this.getDataSubjectRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      const updatedRequest: DataSubjectRequest = {
        ...request,
        status: 'processing',
        processedAt: new Date(),
        response,
      };

      await localDataProtectionService.protectedStore(
        `data_subject_request_${request.id}`,
        updatedRequest,
        'security_logs'
      );

      // Execute the request based on type
      switch (request.type) {
        case 'access':
          await this.handleDataAccessRequest(updatedRequest);
          break;
        case 'erasure':
          await this.handleDataErasureRequest(updatedRequest);
          break;
        case 'portability':
          await this.handleDataPortabilityRequest(updatedRequest);
          break;
        default:
          // For other types, mark as completed with manual processing
          break;
      }

      const completedRequest: DataSubjectRequest = {
        ...updatedRequest,
        status: 'completed',
        completedAt: new Date(),
      };

      await localDataProtectionService.protectedStore(
        `data_subject_request_${request.id}`,
        completedRequest,
        'security_logs'
      );

      console.log(`[PrivacyPolicy] Processed data subject request: ${request.type}`);
      return completedRequest;
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to process data subject request:', error);
      throw error;
    }
  }

  // ===== Data Retention Management =====

  async createDefaultDataRetentionPolicies(): Promise<void> {
    try {
      const defaultPolicies: DataRetentionPolicy[] = [
        {
          dataType: 'product_data',
          retentionPeriod: 1095, // 3 years
          legalBasis: 'legitimate_interests',
          deletionMethod: 'automatic',
          exceptions: ['active_products', 'user_favorites'],
        },
        {
          dataType: 'user_data',
          retentionPeriod: 365, // 1 year
          legalBasis: 'consent',
          deletionMethod: 'manual',
          exceptions: ['account_essential'],
        },
        {
          dataType: 'analytics_data',
          retentionPeriod: 90, // 3 months
          legalBasis: 'consent',
          deletionMethod: 'automatic',
          exceptions: [],
        },
        {
          dataType: 'security_logs',
          retentionPeriod: 2555, // 7 years
          legalBasis: 'legal_obligation',
          deletionMethod: 'automatic',
          exceptions: ['active_incidents'],
        },
      ];

      await localDataProtectionService.protectedStore(
        'data_retention_policies',
        defaultPolicies,
        'security_logs'
      );

      console.log('[PrivacyPolicy] Default data retention policies created');
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to create data retention policies:', error);
    }
  }

  async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    try {
      const policies = await localDataProtectionService.protectedRetrieve<DataRetentionPolicy[]>(
        'data_retention_policies'
      );
      return policies || [];
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get data retention policies:', error);
      return [];
    }
  }

  // ===== Privacy Dashboard =====

  async getPrivacyDashboard(): Promise<{
    currentPolicy: PrivacyPolicyVersion | null;
    consents: { [key: string]: PrivacyConsent };
    dataSubjectRequests: DataSubjectRequest[];
    dataRetentionPolicies: DataRetentionPolicy[];
    lastDataAudit?: Date;
  }> {
    try {
      const [currentPolicy, consents, requests, retentionPolicies] = await Promise.all([
        this.getCurrentPrivacyPolicy(),
        this.getAllConsents(),
        this.getAllDataSubjectRequests(),
        this.getDataRetentionPolicies(),
      ]);

      const lastAudit = await localDataProtectionService.protectedRetrieve<{ date: Date }>('last_data_audit');

      return {
        currentPolicy,
        consents,
        dataSubjectRequests: requests,
        dataRetentionPolicies: retentionPolicies,
        lastDataAudit: lastAudit?.date,
      };
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to get privacy dashboard:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  private async getConsentRegistry(): Promise<{ [key: string]: PrivacyConsent }> {
    try {
      const registry = await localDataProtectionService.protectedRetrieve<{
        [key: string]: PrivacyConsent;
      }>('consent_registry');
      return registry || {};
    } catch (error) {
      return {};
    }
  }

  private async getDataSubjectRequestsIndex(): Promise<string[]> {
    try {
      const index = await localDataProtectionService.protectedRetrieve<string[]>(
        'data_subject_requests_index'
      );
      return index || [];
    } catch (error) {
      return [];
    }
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  private async invalidateConsentsForNewPolicy(policy: PrivacyPolicyVersion): Promise<void> {
    try {
      if (!policy.acceptanceRequired) return;

      const consents = await this.getAllConsents();
      for (const [consentType, consent] of Object.entries(consents)) {
        if (consent.version !== policy.version) {
          await this.withdrawConsent(consentType as PrivacyConsent['consentType'], 'policy_update');
        }
      }
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to invalidate consents:', error);
    }
  }

  private async handleDataAccessRequest(request: DataSubjectRequest): Promise<void> {
    try {
      const complianceData = await localDataProtectionService.exportDataForCompliance();
      
      // Store the exported data as part of the request response
      const response = {
        requestId: request.id,
        exportedAt: new Date(),
        data: complianceData,
      };

      await localDataProtectionService.protectedStore(
        `data_export_${request.id}`,
        response,
        'security_logs'
      );
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to handle data access request:', error);
    }
  }

  private async handleDataErasureRequest(request: DataSubjectRequest): Promise<void> {
    try {
      // This is a sensitive operation that would need careful implementation
      // For now, we'll log the request for manual processing
      await localDataProtectionService.protectedStore(
        `erasure_log_${request.id}`,
        {
          requestId: request.id,
          action: 'data_erasure_requested',
          timestamp: new Date(),
          dataTypes: request.dataTypes,
          note: 'Manual processing required for data erasure',
        },
        'security_logs'
      );
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to handle data erasure request:', error);
    }
  }

  private async handleDataPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    try {
      const exportData = await localDataProtectionService.exportDataForCompliance();
      
      // Create a portable data export
      const portableData = {
        requestId: request.id,
        exportedAt: new Date(),
        format: 'JSON',
        data: exportData.personalData,
        metadata: {
          version: this.CURRENT_POLICY_VERSION,
          dataTypes: request.dataTypes,
        },
      };

      await localDataProtectionService.protectedStore(
        `portable_data_${request.id}`,
        portableData,
        'security_logs'
      );
    } catch (error) {
      console.error('[PrivacyPolicy] Failed to handle data portability request:', error);
    }
  }
}

// Singleton instance
export const privacyPolicyService = PrivacyPolicyService.getInstance();
