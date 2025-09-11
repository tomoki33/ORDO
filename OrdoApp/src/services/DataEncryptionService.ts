import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Keychain from 'react-native-keychain';
import { LoggingService, LogLevel } from './LoggingService';

export interface EncryptionConfig {
  algorithm: 'AES' | 'DES' | 'TripleDES';
  keySize: 128 | 192 | 256;
  mode: 'CBC' | 'CFB' | 'CTR' | 'ECB' | 'OFB';
  padding: 'Pkcs7' | 'AnsiX923' | 'Iso10126' | 'NoPadding' | 'ZeroPadding';
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  algorithm: string;
  keySize: number;
  iterations: number;
  timestamp: number;
}

export interface KeyInfo {
  keyId: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

export class DataEncryptionService {
  private static instance: DataEncryptionService;
  private loggingService: LoggingService;
  private config: EncryptionConfig;
  private currentKeyId: string | null = null;
  private keyRotationInterval: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  private constructor() {
    this.loggingService = new LoggingService();
    this.config = {
      algorithm: 'AES',
      keySize: 256,
      mode: 'CBC',
      padding: 'Pkcs7',
    };
  }

  public static getInstance(): DataEncryptionService {
    if (!DataEncryptionService.instance) {
      DataEncryptionService.instance = new DataEncryptionService();
    }
    return DataEncryptionService.instance;
  }

  // Initialization and key management
  async initialize(): Promise<void> {
    try {
      await this.loadCurrentKeyId();
      if (!this.currentKeyId) {
        await this.generateMasterKey();
      }
      await this.checkKeyRotation();
      await this.logActivity('ENCRYPTION_INIT', 'Encryption service initialized');
    } catch (error) {
      await this.logActivity('ENCRYPTION_INIT_ERROR', 'Failed to initialize encryption service', { error });
      throw error;
    }
  }

  private async generateMasterKey(): Promise<string> {
    try {
      const keyId = this.generateKeyId();
      const masterKey = CryptoJS.lib.WordArray.random(this.config.keySize / 8);
      const keyString = masterKey.toString(CryptoJS.enc.Hex);

      // Store in secure keychain
      await this.storeKeyInKeychain(keyId, keyString);
      
      // Store key metadata
      const keyInfo: KeyInfo = {
        keyId,
        algorithm: this.config.algorithm,
        keySize: this.config.keySize,
        createdAt: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
      };

      await AsyncStorage.setItem(`key_info_${keyId}`, JSON.stringify(keyInfo));
      await AsyncStorage.setItem('current_key_id', keyId);
      
      this.currentKeyId = keyId;
      await this.logActivity('KEY_GENERATION', 'Master key generated', { keyId });
      
      return keyId;
    } catch (error) {
      await this.logActivity('KEY_GENERATION_ERROR', 'Failed to generate master key', { error });
      throw error;
    }
  }

  private async storeKeyInKeychain(keyId: string, key: string): Promise<void> {
    try {
      const keychainOptions = {
        service: `ordo_key_${keyId}`,
        username: 'master_key',
        password: key,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        accessGroup: 'group.com.ordo.keychain',
      };

      if (Platform.OS === 'ios') {
        await Keychain.setInternetCredentials(
          keychainOptions.service,
          keychainOptions.username,
          keychainOptions.password,
          keychainOptions
        );
      } else {
        // Android
        await Keychain.setGenericPassword(
          keychainOptions.username,
          keychainOptions.password,
          {
            service: keychainOptions.service,
            accessControl: keychainOptions.accessControl,
            authenticationType: keychainOptions.authenticationType,
          }
        );
      }
    } catch (error) {
      await this.logActivity('KEYCHAIN_STORE_ERROR', 'Failed to store key in keychain', { error, keyId });
      throw error;
    }
  }

  private async retrieveKeyFromKeychain(keyId: string): Promise<string | null> {
    try {
      const service = `ordo_key_${keyId}`;
      
      let credentials;
      if (Platform.OS === 'ios') {
        credentials = await Keychain.getInternetCredentials(service);
      } else {
        credentials = await Keychain.getGenericPassword({ service });
      }

      if (credentials && credentials.password) {
        await this.updateKeyUsage(keyId);
        return credentials.password;
      }
      
      return null;
    } catch (error) {
      await this.logActivity('KEYCHAIN_RETRIEVE_ERROR', 'Failed to retrieve key from keychain', { error, keyId });
      return null;
    }
  }

  // Core encryption methods
  async encrypt(data: string, keyId?: string): Promise<EncryptedData> {
    try {
      const useKeyId = keyId || this.currentKeyId;
      if (!useKeyId) {
        throw new Error('No encryption key available');
      }

      const masterKey = await this.retrieveKeyFromKeychain(useKeyId);
      if (!masterKey) {
        throw new Error('Failed to retrieve encryption key');
      }

      // Generate random salt and IV
      const salt = CryptoJS.lib.WordArray.random(16);
      const iv = CryptoJS.lib.WordArray.random(16);

      // Derive key using PBKDF2
      const iterations = 10000;
      const key = CryptoJS.PBKDF2(masterKey, salt, {
        keySize: this.config.keySize / 32,
        iterations: iterations,
      });

      // Encrypt data
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode[this.config.mode],
        padding: CryptoJS.pad[this.config.padding],
      });

      const encryptedData: EncryptedData = {
        data: encrypted.toString(),
        iv: iv.toString(CryptoJS.enc.Hex),
        salt: salt.toString(CryptoJS.enc.Hex),
        algorithm: this.config.algorithm,
        keySize: this.config.keySize,
        iterations: iterations,
        timestamp: Date.now(),
      };

      await this.logActivity('DATA_ENCRYPTED', 'Data encrypted successfully', {
        keyId: useKeyId,
        dataSize: data.length,
      });

      return encryptedData;
    } catch (error) {
      await this.logActivity('ENCRYPTION_ERROR', 'Failed to encrypt data', { error });
      throw error;
    }
  }

  async decrypt(encryptedData: EncryptedData, keyId?: string): Promise<string> {
    try {
      const useKeyId = keyId || this.currentKeyId;
      if (!useKeyId) {
        throw new Error('No decryption key available');
      }

      const masterKey = await this.retrieveKeyFromKeychain(useKeyId);
      if (!masterKey) {
        throw new Error('Failed to retrieve decryption key');
      }

      // Reconstruct salt and IV
      const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

      // Derive key using same parameters
      const key = CryptoJS.PBKDF2(masterKey, salt, {
        keySize: encryptedData.keySize / 32,
        iterations: encryptedData.iterations,
      });

      // Decrypt data
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
        iv: iv,
        mode: CryptoJS.mode[this.config.mode],
        padding: CryptoJS.pad[this.config.padding],
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Failed to decrypt data - invalid key or corrupted data');
      }

      await this.logActivity('DATA_DECRYPTED', 'Data decrypted successfully', {
        keyId: useKeyId,
        dataSize: decryptedString.length,
      });

      return decryptedString;
    } catch (error) {
      await this.logActivity('DECRYPTION_ERROR', 'Failed to decrypt data', { error });
      throw error;
    }
  }

  // High-level encryption methods for common data types
  async encryptObject(obj: any, keyId?: string): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, keyId);
  }

  async decryptObject<T>(encryptedData: EncryptedData, keyId?: string): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, keyId);
    return JSON.parse(jsonString) as T;
  }

  async encryptFile(filePath: string, keyId?: string): Promise<EncryptedData> {
    // For React Native, this would work with react-native-fs
    // Implementation would read file content and encrypt it
    throw new Error('File encryption not implemented - requires react-native-fs');
  }

  // Secure storage methods
  async secureStore(key: string, data: any): Promise<void> {
    try {
      const encryptedData = await this.encryptObject(data);
      await AsyncStorage.setItem(`encrypted_${key}`, JSON.stringify(encryptedData));
      await this.logActivity('SECURE_STORE', 'Data stored securely', { key });
    } catch (error) {
      await this.logActivity('SECURE_STORE_ERROR', 'Failed to store data securely', { error, key });
      throw error;
    }
  }

  async secureRetrieve<T>(key: string): Promise<T | null> {
    try {
      const encryptedDataString = await AsyncStorage.getItem(`encrypted_${key}`);
      if (!encryptedDataString) {
        return null;
      }

      const encryptedData: EncryptedData = JSON.parse(encryptedDataString);
      const data = await this.decryptObject<T>(encryptedData);
      
      await this.logActivity('SECURE_RETRIEVE', 'Data retrieved securely', { key });
      return data;
    } catch (error) {
      await this.logActivity('SECURE_RETRIEVE_ERROR', 'Failed to retrieve data securely', { error, key });
      return null;
    }
  }

  async secureRemove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`encrypted_${key}`);
      await this.logActivity('SECURE_REMOVE', 'Secure data removed', { key });
    } catch (error) {
      await this.logActivity('SECURE_REMOVE_ERROR', 'Failed to remove secure data', { error, key });
      throw error;
    }
  }

  // Key management
  async rotateKeys(): Promise<string> {
    try {
      const oldKeyId = this.currentKeyId;
      const newKeyId = await this.generateMasterKey();
      
      // Re-encrypt all secure data with new key
      await this.reEncryptAllData(oldKeyId!, newKeyId);
      
      // Clean up old key
      if (oldKeyId) {
        await this.deleteKey(oldKeyId);
      }

      await this.logActivity('KEY_ROTATION', 'Key rotation completed', { 
        oldKeyId, 
        newKeyId 
      });

      return newKeyId;
    } catch (error) {
      await this.logActivity('KEY_ROTATION_ERROR', 'Key rotation failed', { error });
      throw error;
    }
  }

  private async reEncryptAllData(oldKeyId: string, newKeyId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => key.startsWith('encrypted_'));

      for (const key of encryptedKeys) {
        const encryptedDataString = await AsyncStorage.getItem(key);
        if (encryptedDataString) {
          const encryptedData: EncryptedData = JSON.parse(encryptedDataString);
          const decryptedData = await this.decrypt(encryptedData, oldKeyId);
          const reEncryptedData = await this.encrypt(decryptedData, newKeyId);
          await AsyncStorage.setItem(key, JSON.stringify(reEncryptedData));
        }
      }

      await this.logActivity('DATA_RE_ENCRYPTION', 'All data re-encrypted', {
        oldKeyId,
        newKeyId,
        dataCount: encryptedKeys.length,
      });
    } catch (error) {
      await this.logActivity('DATA_RE_ENCRYPTION_ERROR', 'Failed to re-encrypt data', { error });
      throw error;
    }
  }

  private async checkKeyRotation(): Promise<void> {
    try {
      if (!this.currentKeyId) return;

      const keyInfoString = await AsyncStorage.getItem(`key_info_${this.currentKeyId}`);
      if (!keyInfoString) return;

      const keyInfo: KeyInfo = JSON.parse(keyInfoString);
      const keyAge = Date.now() - new Date(keyInfo.createdAt).getTime();

      if (keyAge > this.keyRotationInterval) {
        await this.logActivity('KEY_ROTATION_NEEDED', 'Key rotation needed', {
          keyId: this.currentKeyId,
          keyAge: keyAge,
        });
        // Auto-rotate keys if needed
        // await this.rotateKeys();
      }
    } catch (error) {
      await this.logActivity('KEY_ROTATION_CHECK_ERROR', 'Failed to check key rotation', { error });
    }
  }

  // Utility methods
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async loadCurrentKeyId(): Promise<void> {
    try {
      this.currentKeyId = await AsyncStorage.getItem('current_key_id');
    } catch (error) {
      await this.logActivity('LOAD_KEY_ID_ERROR', 'Failed to load current key ID', { error });
    }
  }

  private async updateKeyUsage(keyId: string): Promise<void> {
    try {
      const keyInfoString = await AsyncStorage.getItem(`key_info_${keyId}`);
      if (keyInfoString) {
        const keyInfo: KeyInfo = JSON.parse(keyInfoString);
        keyInfo.lastUsed = new Date();
        keyInfo.usageCount += 1;
        await AsyncStorage.setItem(`key_info_${keyId}`, JSON.stringify(keyInfo));
      }
    } catch (error) {
      // Silent fail - not critical
    }
  }

  private async deleteKey(keyId: string): Promise<void> {
    try {
      const service = `ordo_key_${keyId}`;
      
      if (Platform.OS === 'ios') {
        await Keychain.resetInternetCredentials(service);
      } else {
        await Keychain.resetGenericPassword({ service });
      }

      await AsyncStorage.removeItem(`key_info_${keyId}`);
      await this.logActivity('KEY_DELETION', 'Key deleted', { keyId });
    } catch (error) {
      await this.logActivity('KEY_DELETION_ERROR', 'Failed to delete key', { error, keyId });
    }
  }

  // Configuration methods
  updateConfig(config: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EncryptionConfig {
    return { ...this.config };
  }

  getCurrentKeyId(): string | null {
    return this.currentKeyId;
  }

  async getKeyInfo(keyId?: string): Promise<KeyInfo | null> {
    try {
      const useKeyId = keyId || this.currentKeyId;
      if (!useKeyId) return null;

      const keyInfoString = await AsyncStorage.getItem(`key_info_${useKeyId}`);
      if (!keyInfoString) return null;

      return JSON.parse(keyInfoString) as KeyInfo;
    } catch (error) {
      return null;
    }
  }

  // Security methods
  async verifyIntegrity(encryptedData: EncryptedData): Promise<boolean> {
    try {
      const decrypted = await this.decrypt(encryptedData);
      return decrypted !== null && decrypted !== undefined;
    } catch (error) {
      return false;
    }
  }

  async generateHash(data: string): Promise<string> {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  async generateSalt(length: number = 16): Promise<string> {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }

  // Cleanup methods
  async clearAllEncryptedData(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const encryptedKeys = allKeys.filter(key => key.startsWith('encrypted_'));
      
      for (const key of encryptedKeys) {
        await AsyncStorage.removeItem(key);
      }

      await this.logActivity('CLEAR_ENCRYPTED_DATA', 'All encrypted data cleared', {
        clearedCount: encryptedKeys.length,
      });
    } catch (error) {
      await this.logActivity('CLEAR_ENCRYPTED_DATA_ERROR', 'Failed to clear encrypted data', { error });
      throw error;
    }
  }

  async destroyAllKeys(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keyInfoKeys = allKeys.filter(key => key.startsWith('key_info_'));
      
      for (const keyInfoKey of keyInfoKeys) {
        const keyId = keyInfoKey.replace('key_info_', '');
        await this.deleteKey(keyId);
      }

      await AsyncStorage.removeItem('current_key_id');
      this.currentKeyId = null;

      await this.logActivity('DESTROY_ALL_KEYS', 'All encryption keys destroyed');
    } catch (error) {
      await this.logActivity('DESTROY_ALL_KEYS_ERROR', 'Failed to destroy all keys', { error });
      throw error;
    }
  }

  private async logActivity(
    activity: string, 
    message: string, 
    metadata?: any
  ): Promise<void> {
    try {
      // Use existing logging service but avoid logging sensitive data
      const safeMetadata = metadata ? {
        ...metadata,
        // Remove sensitive fields
        key: metadata.key ? '[REDACTED]' : undefined,
        masterKey: undefined,
        password: undefined,
      } : undefined;

      // Note: LoggingService.log method may need to be made public or we need a different approach
      console.log(`[DataEncryption] ${activity}: ${message}`, safeMetadata);
    } catch (error) {
      console.error('Failed to log encryption activity:', error);
    }
  }
}

// Singleton instance
export const dataEncryptionService = DataEncryptionService.getInstance();
