import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { DataEncryptionService } from './DataEncryptionService';
import { LoggingService } from './LoggingService';

export interface DataProtectionConfig {
  enableEncryption: boolean;
  enableIntegrityCheck: boolean;
  enableAccessLogging: boolean;
  enableDataClassification: boolean;
  automaticBackup: boolean;
  dataRetentionDays: number;
  sensitiveDataExpiry: number; // in hours
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: string[];
  retentionPeriod: number; // in days
  encryptionRequired: boolean;
  accessControlRequired: boolean;
}

export interface DataAccessLog {
  id: string;
  dataKey: string;
  action: 'read' | 'write' | 'delete' | 'access_denied';
  timestamp: Date;
  deviceId: string;
  appVersion: string;
  classification: string;
  success: boolean;
  errorMessage?: string;
}

export interface DataIntegrityCheck {
  dataKey: string;
  hash: string;
  timestamp: Date;
  isValid: boolean;
}

export class LocalDataProtectionService {
  private static instance: LocalDataProtectionService;
  private encryptionService: DataEncryptionService;
  private loggingService: LoggingService;
  private config: DataProtectionConfig;
  private deviceId: string | null = null;

  private readonly SENSITIVE_DATA_KEYS = [
    'user_credentials',
    'personal_info',
    'payment_info',
    'location_data',
    'health_data',
    'biometric_data',
  ];

  private readonly DATA_CLASSIFICATIONS: { [key: string]: DataClassification } = {
    user_data: {
      level: 'confidential',
      categories: ['personal', 'preferences'],
      retentionPeriod: 365,
      encryptionRequired: true,
      accessControlRequired: true,
    },
    product_data: {
      level: 'internal',
      categories: ['inventory', 'food'],
      retentionPeriod: 1095, // 3 years
      encryptionRequired: false,
      accessControlRequired: false,
    },
    settings_data: {
      level: 'internal',
      categories: ['configuration', 'preferences'],
      retentionPeriod: 365,
      encryptionRequired: false,
      accessControlRequired: false,
    },
    analytics_data: {
      level: 'internal',
      categories: ['usage', 'performance'],
      retentionPeriod: 90,
      encryptionRequired: false,
      accessControlRequired: false,
    },
    security_logs: {
      level: 'restricted',
      categories: ['audit', 'security'],
      retentionPeriod: 2555, // 7 years
      encryptionRequired: true,
      accessControlRequired: true,
    },
  };

  private constructor() {
    this.encryptionService = DataEncryptionService.getInstance();
    this.loggingService = new LoggingService();
    this.config = {
      enableEncryption: true,
      enableIntegrityCheck: true,
      enableAccessLogging: true,
      enableDataClassification: true,
      automaticBackup: false,
      dataRetentionDays: 365,
      sensitiveDataExpiry: 24, // 24 hours
    };
  }

  public static getInstance(): LocalDataProtectionService {
    if (!LocalDataProtectionService.instance) {
      LocalDataProtectionService.instance = new LocalDataProtectionService();
    }
    return LocalDataProtectionService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadDeviceId();
      await this.encryptionService.initialize();
      await this.loadConfiguration();
      await this.performDataAudit();
      await this.cleanupExpiredData();
      
      console.log('[DataProtection] Service initialized successfully');
    } catch (error) {
      console.error('[DataProtection] Failed to initialize:', error);
      throw error;
    }
  }

  // Core data protection methods
  async protectedStore(key: string, data: any, classification?: string): Promise<void> {
    try {
      const dataClassification = this.getDataClassification(key, classification);
      
      // Log access attempt
      if (this.config.enableAccessLogging) {
        await this.logDataAccess(key, 'write', dataClassification.level);
      }

      let processedData = data;
      
      // Add metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        classification: dataClassification.level,
        deviceId: this.deviceId,
        appVersion: await this.getAppVersion(),
        dataType: typeof data,
      };

      processedData = { ...processedData, _metadata: metadata };

      // Encrypt if required
      if (dataClassification.encryptionRequired || this.config.enableEncryption) {
        if (this.isSensitiveData(key)) {
          await this.encryptionService.secureStore(key, processedData);
        } else {
          const encryptedData = await this.encryptionService.encryptObject(processedData);
          await AsyncStorage.setItem(`protected_${key}`, JSON.stringify(encryptedData));
        }
      } else {
        await AsyncStorage.setItem(`protected_${key}`, JSON.stringify(processedData));
      }

      // Create integrity check
      if (this.config.enableIntegrityCheck) {
        await this.createIntegrityCheck(key, processedData);
      }

      // Set expiration for sensitive data
      if (this.isSensitiveData(key)) {
        await this.setSensitiveDataExpiration(key);
      }

      console.log(`[DataProtection] Data stored with protection: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logDataAccess(key, 'write', 'unknown', false, errorMessage);
      console.error('[DataProtection] Failed to store protected data:', error);
      throw error;
    }
  }

  async protectedRetrieve<T>(key: string): Promise<T | null> {
    try {
      const dataClassification = this.getDataClassification(key);
      
      // Check if data has expired
      if (this.isSensitiveData(key)) {
        const isExpired = await this.checkSensitiveDataExpiration(key);
        if (isExpired) {
          await this.protectedRemove(key);
          await this.logDataAccess(key, 'access_denied', dataClassification.level, false, 'Data expired');
          return null;
        }
      }

      // Log access attempt
      if (this.config.enableAccessLogging) {
        await this.logDataAccess(key, 'read', dataClassification.level);
      }

      let rawData: string | null;
      
      // Retrieve data based on encryption status
      if (dataClassification.encryptionRequired || this.config.enableEncryption) {
        if (this.isSensitiveData(key)) {
          const data = await this.encryptionService.secureRetrieve<T>(key);
          return data;
        } else {
          rawData = await AsyncStorage.getItem(`protected_${key}`);
          if (!rawData) return null;
          
          const encryptedData = JSON.parse(rawData);
          const decryptedData = await this.encryptionService.decryptObject<T>(encryptedData);
          return decryptedData;
        }
      } else {
        rawData = await AsyncStorage.getItem(`protected_${key}`);
        if (!rawData) return null;
        
        const data = JSON.parse(rawData) as T;
        
        // Verify integrity if enabled
        if (this.config.enableIntegrityCheck) {
          const isValid = await this.verifyIntegrityCheck(key, data);
          if (!isValid) {
            await this.logDataAccess(key, 'access_denied', dataClassification.level, false, 'Integrity check failed');
            throw new Error('Data integrity check failed');
          }
        }
        
        return data;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logDataAccess(key, 'read', 'unknown', false, errorMessage);
      console.error('[DataProtection] Failed to retrieve protected data:', error);
      return null;
    }
  }

  async protectedRemove(key: string): Promise<void> {
    try {
      const dataClassification = this.getDataClassification(key);
      
      // Log access attempt
      if (this.config.enableAccessLogging) {
        await this.logDataAccess(key, 'delete', dataClassification.level);
      }

      // Remove data based on storage method
      if (this.isSensitiveData(key)) {
        await this.encryptionService.secureRemove(key);
      } else {
        await AsyncStorage.removeItem(`protected_${key}`);
      }

      // Remove integrity check
      await AsyncStorage.removeItem(`integrity_${key}`);
      
      // Remove expiration data
      await AsyncStorage.removeItem(`expiry_${key}`);

      console.log(`[DataProtection] Protected data removed: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logDataAccess(key, 'delete', 'unknown', false, errorMessage);
      console.error('[DataProtection] Failed to remove protected data:', error);
      throw error;
    }
  }

  // Data classification and policy enforcement
  private getDataClassification(key: string, override?: string): DataClassification {
    if (override && this.DATA_CLASSIFICATIONS[override]) {
      return this.DATA_CLASSIFICATIONS[override];
    }

    // Determine classification based on key pattern
    for (const [classKey, classification] of Object.entries(this.DATA_CLASSIFICATIONS)) {
      if (key.includes(classKey) || key.startsWith(classKey)) {
        return classification;
      }
    }

    // Default classification
    return this.DATA_CLASSIFICATIONS.product_data;
  }

  private isSensitiveData(key: string): boolean {
    return this.SENSITIVE_DATA_KEYS.some(sensitiveKey => 
      key.includes(sensitiveKey) || key.startsWith(sensitiveKey)
    );
  }

  // Integrity checking
  private async createIntegrityCheck(key: string, data: any): Promise<void> {
    try {
      const dataString = JSON.stringify(data);
      const hash = await this.encryptionService.generateHash(dataString);
      
      const integrityCheck: DataIntegrityCheck = {
        dataKey: key,
        hash,
        timestamp: new Date(),
        isValid: true,
      };

      await AsyncStorage.setItem(`integrity_${key}`, JSON.stringify(integrityCheck));
    } catch (error) {
      console.error('[DataProtection] Failed to create integrity check:', error);
    }
  }

  private async verifyIntegrityCheck(key: string, data: any): Promise<boolean> {
    try {
      const integrityCheckString = await AsyncStorage.getItem(`integrity_${key}`);
      if (!integrityCheckString) {
        return false; // No integrity check found
      }

      const integrityCheck: DataIntegrityCheck = JSON.parse(integrityCheckString);
      const dataString = JSON.stringify(data);
      const currentHash = await this.encryptionService.generateHash(dataString);

      return integrityCheck.hash === currentHash;
    } catch (error) {
      console.error('[DataProtection] Failed to verify integrity check:', error);
      return false;
    }
  }

  // Sensitive data expiration
  private async setSensitiveDataExpiration(key: string): Promise<void> {
    try {
      const expirationTime = Date.now() + (this.config.sensitiveDataExpiry * 60 * 60 * 1000);
      await AsyncStorage.setItem(`expiry_${key}`, expirationTime.toString());
    } catch (error) {
      console.error('[DataProtection] Failed to set data expiration:', error);
    }
  }

  private async checkSensitiveDataExpiration(key: string): Promise<boolean> {
    try {
      const expirationString = await AsyncStorage.getItem(`expiry_${key}`);
      if (!expirationString) {
        return false; // No expiration set
      }

      const expirationTime = parseInt(expirationString);
      return Date.now() > expirationTime;
    } catch (error) {
      console.error('[DataProtection] Failed to check data expiration:', error);
      return false;
    }
  }

  // Access logging
  private async logDataAccess(
    dataKey: string,
    action: 'read' | 'write' | 'delete' | 'access_denied',
    classification: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logEntry: DataAccessLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        dataKey,
        action,
        timestamp: new Date(),
        deviceId: this.deviceId || 'unknown',
        appVersion: await this.getAppVersion(),
        classification,
        success,
        errorMessage,
      };

      // Store access log securely
      const logs = await this.getAccessLogs();
      logs.push(logEntry);

      // Keep only recent logs (last 1000 entries)
      const recentLogs = logs.slice(-1000);
      
      await this.encryptionService.secureStore('access_logs', recentLogs);
    } catch (error) {
      console.error('[DataProtection] Failed to log data access:', error);
    }
  }

  async getAccessLogs(limit?: number): Promise<DataAccessLog[]> {
    try {
      const logs = await this.encryptionService.secureRetrieve<DataAccessLog[]>('access_logs') || [];
      return limit ? logs.slice(-limit) : logs;
    } catch (error) {
      console.error('[DataProtection] Failed to retrieve access logs:', error);
      return [];
    }
  }

  // Data audit and cleanup
  async performDataAudit(): Promise<{
    totalItems: number;
    encryptedItems: number;
    expiredItems: number;
    corruptedItems: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const protectedKeys = allKeys.filter(key => key.startsWith('protected_'));
      
      let encryptedItems = 0;
      let expiredItems = 0;
      let corruptedItems = 0;

      for (const key of protectedKeys) {
        const dataKey = key.replace('protected_', '');
        
        // Check if encrypted
        if (this.isSensitiveData(dataKey) || this.getDataClassification(dataKey).encryptionRequired) {
          encryptedItems++;
        }

        // Check if expired
        if (this.isSensitiveData(dataKey)) {
          const isExpired = await this.checkSensitiveDataExpiration(dataKey);
          if (isExpired) {
            expiredItems++;
          }
        }

        // Check integrity
        if (this.config.enableIntegrityCheck) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              const parsedData = JSON.parse(data);
              const isValid = await this.verifyIntegrityCheck(dataKey, parsedData);
              if (!isValid) {
                corruptedItems++;
              }
            }
          } catch (error) {
            corruptedItems++;
          }
        }
      }

      const auditResult = {
        totalItems: protectedKeys.length,
        encryptedItems,
        expiredItems,
        corruptedItems,
      };

      console.log('[DataProtection] Data audit completed:', auditResult);
      return auditResult;
    } catch (error) {
      console.error('[DataProtection] Failed to perform data audit:', error);
      throw error;
    }
  }

  async cleanupExpiredData(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const protectedKeys = allKeys.filter(key => key.startsWith('protected_'));
      let cleanedCount = 0;

      for (const key of protectedKeys) {
        const dataKey = key.replace('protected_', '');
        
        if (this.isSensitiveData(dataKey)) {
          const isExpired = await this.checkSensitiveDataExpiration(dataKey);
          if (isExpired) {
            await this.protectedRemove(dataKey);
            cleanedCount++;
          }
        }
      }

      console.log(`[DataProtection] Cleaned up ${cleanedCount} expired items`);
      return cleanedCount;
    } catch (error) {
      console.error('[DataProtection] Failed to cleanup expired data:', error);
      return 0;
    }
  }

  // Configuration management
  async updateConfiguration(config: Partial<DataProtectionConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await this.encryptionService.secureStore('data_protection_config', this.config);
      console.log('[DataProtection] Configuration updated');
    } catch (error) {
      console.error('[DataProtection] Failed to update configuration:', error);
      throw error;
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await this.encryptionService.secureRetrieve<DataProtectionConfig>('data_protection_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('[DataProtection] Failed to load configuration:', error);
    }
  }

  getConfiguration(): DataProtectionConfig {
    return { ...this.config };
  }

  // Utility methods
  private async loadDeviceId(): Promise<void> {
    try {
      this.deviceId = await DeviceInfo.getUniqueId();
    } catch (error) {
      console.error('[DataProtection] Failed to get device ID:', error);
      this.deviceId = 'unknown';
    }
  }

  private async getAppVersion(): Promise<string> {
    try {
      return await DeviceInfo.getVersion();
    } catch (error) {
      return 'unknown';
    }
  }

  // Emergency methods
  async emergencyDataWipe(): Promise<void> {
    try {
      Alert.alert(
        'Emergency Data Wipe',
        'This will permanently delete all protected data. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Wipe',
            style: 'destructive',
            onPress: async () => {
              await this.performEmergencyWipe();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[DataProtection] Failed to initiate emergency wipe:', error);
    }
  }

  private async performEmergencyWipe(): Promise<void> {
    try {
      // Remove all protected data
      const allKeys = await AsyncStorage.getAllKeys();
      const protectedKeys = allKeys.filter(key => 
        key.startsWith('protected_') || 
        key.startsWith('encrypted_') ||
        key.startsWith('integrity_') ||
        key.startsWith('expiry_')
      );

      for (const key of protectedKeys) {
        await AsyncStorage.removeItem(key);
      }

      // Clear encryption service
      await this.encryptionService.clearAllEncryptedData();
      await this.encryptionService.destroyAllKeys();

      // Log the emergency wipe
      console.log('[DataProtection] Emergency data wipe completed');
    } catch (error) {
      console.error('[DataProtection] Failed to perform emergency wipe:', error);
      throw error;
    }
  }

  // Data export for compliance
  async exportDataForCompliance(): Promise<{
    personalData: any[];
    accessLogs: DataAccessLog[];
    dataClassifications: any;
  }> {
    try {
      const personalData: any[] = [];
      const allKeys = await AsyncStorage.getAllKeys();
      const protectedKeys = allKeys.filter(key => key.startsWith('protected_'));

      for (const key of protectedKeys) {
        const dataKey = key.replace('protected_', '');
        const classification = this.getDataClassification(dataKey);
        
        if (classification.level === 'confidential' || classification.level === 'restricted') {
          try {
            const data = await this.protectedRetrieve(dataKey);
            personalData.push({
              key: dataKey,
              classification: classification.level,
              categories: classification.categories,
              data: data ? '[DATA_PRESENT]' : '[NO_DATA]', // Don't export actual sensitive data
            });
          } catch (error) {
            personalData.push({
              key: dataKey,
              classification: classification.level,
              error: 'Failed to access data',
            });
          }
        }
      }

      const accessLogs = await this.getAccessLogs();

      return {
        personalData,
        accessLogs,
        dataClassifications: this.DATA_CLASSIFICATIONS,
      };
    } catch (error) {
      console.error('[DataProtection] Failed to export compliance data:', error);
      throw error;
    }
  }
}

// Singleton instance
export const localDataProtectionService = LocalDataProtectionService.getInstance();
