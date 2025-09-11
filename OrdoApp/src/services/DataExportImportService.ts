import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductRepository } from '../database/ProductRepository';
import { CategoryRepository } from '../database/CategoryRepository';
import { LocationRepository } from '../database/LocationRepository';
import { LoggingService } from './LoggingService';

export interface ExportData {
  version: string;
  exportDate: string;
  appVersion: string;
  data: {
    products: any[];
    categories: any[];
    locations: any[];
    settings: any;
  };
  metadata: {
    productCount: number;
    categoryCount: number;
    locationCount: number;
    totalSize: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    products: number;
    categories: number;
    locations: number;
  };
  errors: string[];
}

export interface ExportOptions {
  includeProducts: boolean;
  includeCategories: boolean;
  includeLocations: boolean;
  includeSettings: boolean;
  format: 'json' | 'csv' | 'xlsx';
  dateRange?: {
    from: Date;
    to: Date;
  };
  categories?: string[];
  locations?: string[];
}

export class DataExportImportService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;
  private locationRepository: LocationRepository;
  private loggingService: LoggingService;

  constructor() {
    this.productRepository = new ProductRepository();
    this.categoryRepository = new CategoryRepository();
    this.locationRepository = new LocationRepository();
    this.loggingService = new LoggingService();
  }

  // Export functionality
  async exportData(options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      await this.loggingService.log('info', 'DATA_EXPORT', 'Starting data export', { options });

      const exportData = await this.prepareExportData(options);
      const fileName = this.generateFileName(options.format);
      const filePath = await this.saveExportFile(exportData, fileName, options.format);

      await this.loggingService.log('info', 'DATA_EXPORT', 'Data export completed', { 
        fileName, 
        filePath,
        metadata: exportData.metadata 
      });

      return { success: true, filePath };
    } catch (error) {
      await this.loggingService.log('error', 'DATA_EXPORT', 'Data export failed', { error });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async shareExportedData(filePath: string): Promise<boolean> {
    try {
      const shareOptions = {
        title: 'Ordo データエクスポート',
        message: 'Ordoアプリからエクスポートされたデータです',
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        type: 'application/json',
      };

      await Share.open(shareOptions);
      await this.loggingService.log('info', 'DATA_EXPORT', 'Data shared successfully', { filePath });
      return true;
    } catch (error) {
      await this.loggingService.log('error', 'DATA_EXPORT', 'Data sharing failed', { error, filePath });
      return false;
    }
  }

  private async prepareExportData(options: ExportOptions): Promise<ExportData> {
    const data: any = {};
    let productCount = 0;
    let categoryCount = 0;
    let locationCount = 0;

    // Export products
    if (options.includeProducts) {
      let products = await this.productRepository.findAll();
      
      // Apply date range filter
      if (options.dateRange) {
        products = products.filter(product => {
          const createdAt = new Date(product.createdAt);
          return createdAt >= options.dateRange!.from && createdAt <= options.dateRange!.to;
        });
      }

      // Apply category filter
      if (options.categories && options.categories.length > 0) {
        products = products.filter(product => 
          options.categories!.includes(product.category)
        );
      }

      // Apply location filter
      if (options.locations && options.locations.length > 0) {
        products = products.filter(product => 
          options.locations!.includes(product.location)
        );
      }

      data.products = products;
      productCount = products.length;
    }

    // Export categories
    if (options.includeCategories) {
      const categories = await this.categoryRepository.findAll();
      data.categories = categories;
      categoryCount = categories.length;
    }

    // Export locations
    if (options.includeLocations) {
      const locations = await this.locationRepository.findAll();
      data.locations = locations;
      locationCount = locations.length;
    }

    // Export settings
    if (options.includeSettings) {
      data.settings = await this.exportSettings();
    }

    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0', // Get from app info
      data,
      metadata: {
        productCount,
        categoryCount,
        locationCount,
        totalSize: JSON.stringify(data).length,
      },
    };

    return exportData;
  }

  private async exportSettings(): Promise<any> {
    try {
      const settingsKeys = [
        'app_settings',
        'notification_settings',
        'ui_preferences',
        'privacy_settings',
        'data_settings',
      ];

      const settings: any = {};
      for (const key of settingsKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          settings[key] = JSON.parse(value);
        }
      }

      return settings;
    } catch (error) {
      await this.loggingService.log('error', 'SETTINGS_EXPORT', 'Failed to export settings', { error });
      return {};
    }
  }

  private generateFileName(format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `ordo-export-${timestamp}.${format}`;
  }

  private async saveExportFile(data: ExportData, fileName: string, format: string): Promise<string> {
    const documentsPath = RNFS.DocumentDirectoryPath;
    const filePath = `${documentsPath}/${fileName}`;

    let content: string;
    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        content = await this.convertToCSV(data);
        break;
      case 'xlsx':
        // For now, fallback to JSON. XLSX would require additional library
        content = JSON.stringify(data, null, 2);
        break;
      default:
        content = JSON.stringify(data, null, 2);
    }

    await RNFS.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  private async convertToCSV(data: ExportData): Promise<string> {
    let csv = '';

    // Add metadata header
    csv += 'Ordo Data Export\n';
    csv += `Export Date,${data.exportDate}\n`;
    csv += `App Version,${data.appVersion}\n`;
    csv += `Products,${data.metadata.productCount}\n`;
    csv += `Categories,${data.metadata.categoryCount}\n`;
    csv += `Locations,${data.metadata.locationCount}\n\n`;

    // Add products CSV
    if (data.data.products && data.data.products.length > 0) {
      csv += 'Products\n';
      csv += 'ID,Name,Category,Location,Expiry Date,Quantity,Status,Created At\n';
      data.data.products.forEach((product: any) => {
        csv += `${product.id},${product.name},${product.category},${product.location},${product.expiryDate},${product.quantity},${product.status},${product.createdAt}\n`;
      });
      csv += '\n';
    }

    // Add categories CSV
    if (data.data.categories && data.data.categories.length > 0) {
      csv += 'Categories\n';
      csv += 'ID,Name,Parent ID,Level,Color,Description,Is Active\n';
      data.data.categories.forEach((category: any) => {
        csv += `${category.id},${category.name},${category.parentId || ''},${category.level},${category.color},${category.description || ''},${category.isActive}\n`;
      });
      csv += '\n';
    }

    // Add locations CSV
    if (data.data.locations && data.data.locations.length > 0) {
      csv += 'Locations\n';
      csv += 'ID,Name,Type,Parent ID,Level,Temperature,Description\n';
      data.data.locations.forEach((location: any) => {
        csv += `${location.id},${location.name},${location.type},${location.parentId || ''},${location.level},${location.temperature || ''},${location.description || ''}\n`;
      });
    }

    return csv;
  }

  // Import functionality
  async selectImportFile(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.json, DocumentPicker.types.csv],
        allowMultiSelection: false,
      });

      const file = result[0];
      if (!file) {
        return { success: false, error: 'ファイルが選択されませんでした' };
      }

      await this.loggingService.log('info', 'FILE_SELECTION', 'Import file selected', { 
        fileName: file.name, 
        type: file.type, 
        size: file.size 
      });

      return { success: true, filePath: file.uri };
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return { success: false, error: 'ファイル選択がキャンセルされました' };
      }
      await this.loggingService.log('error', 'FILE_SELECTION', 'File selection failed', { error });
      return { success: false, error: '文書選択に失敗しました' };
    }
  }

  async importData(filePath: string, options?: ImportOptions): Promise<ImportResult> {
    try {
      await this.loggingService.log('info', 'DATA_IMPORT', 'Starting data import', { filePath, options });

      const fileContent = await RNFS.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent) as ExportData;

      // Validate import data
      const validation = await this.validateImportData(importData);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid import data',
          imported: { products: 0, categories: 0, locations: 0 },
          errors: validation.errors || [],
        };
      }

      // Perform import
      const result = await this.performImport(importData, options);

      await this.loggingService.log('info', 'DATA_IMPORT', 'Data import completed', { 
        result,
        filePath 
      });

      return result;
    } catch (error) {
      await this.loggingService.log('error', 'DATA_IMPORT', 'Data import failed', { error, filePath });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        imported: { products: 0, categories: 0, locations: 0 },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async validateImportData(data: ExportData): Promise<{ isValid: boolean; error?: string; errors?: string[] }> {
    const errors: string[] = [];

    // Check version compatibility
    if (!data.version) {
      errors.push('Export version not found');
    }

    // Check data structure
    if (!data.data) {
      errors.push('No data found in export file');
    }

    // Validate products structure
    if (data.data.products) {
      data.data.products.forEach((product: any, index: number) => {
        if (!product.id || !product.name) {
          errors.push(`Invalid product at index ${index}: missing required fields`);
        }
      });
    }

    // Validate categories structure
    if (data.data.categories) {
      data.data.categories.forEach((category: any, index: number) => {
        if (!category.id || !category.name) {
          errors.push(`Invalid category at index ${index}: missing required fields`);
        }
      });
    }

    // Validate locations structure
    if (data.data.locations) {
      data.data.locations.forEach((location: any, index: number) => {
        if (!location.id || !location.name) {
          errors.push(`Invalid location at index ${index}: missing required fields`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? 'Validation failed' : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async performImport(data: ExportData, options?: ImportOptions): Promise<ImportResult> {
    const imported = { products: 0, categories: 0, locations: 0 };
    const errors: string[] = [];

    try {
      // Import categories first (dependencies)
      if (data.data.categories && (!options || options.includeCategories !== false)) {
        for (const categoryData of data.data.categories) {
          try {
            if (options?.mode === 'update') {
              const existing = await this.categoryRepository.findById(categoryData.id);
              if (existing) {
                await this.categoryRepository.update(categoryData.id, categoryData);
              } else {
                await this.categoryRepository.create(categoryData);
              }
            } else if (options?.mode === 'skip') {
              const existing = await this.categoryRepository.findById(categoryData.id);
              if (!existing) {
                await this.categoryRepository.create(categoryData);
              }
            } else {
              // Replace mode (default)
              await this.categoryRepository.create(categoryData);
            }
            imported.categories++;
          } catch (error) {
            errors.push(`Category ${categoryData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import locations
      if (data.data.locations && (!options || options.includeLocations !== false)) {
        for (const locationData of data.data.locations) {
          try {
            if (options?.mode === 'update') {
              const existing = await this.locationRepository.findById(locationData.id);
              if (existing) {
                await this.locationRepository.update(locationData.id, locationData);
              } else {
                await this.locationRepository.create(locationData);
              }
            } else if (options?.mode === 'skip') {
              const existing = await this.locationRepository.findById(locationData.id);
              if (!existing) {
                await this.locationRepository.create(locationData);
              }
            } else {
              await this.locationRepository.create(locationData);
            }
            imported.locations++;
          } catch (error) {
            errors.push(`Location ${locationData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import products
      if (data.data.products && (!options || options.includeProducts !== false)) {
        for (const productData of data.data.products) {
          try {
            if (options?.mode === 'update') {
              const existing = await this.productRepository.findById(productData.id);
              if (existing) {
                await this.productRepository.update(productData.id, productData);
              } else {
                await this.productRepository.create(productData);
              }
            } else if (options?.mode === 'skip') {
              const existing = await this.productRepository.findById(productData.id);
              if (!existing) {
                await this.productRepository.create(productData);
              }
            } else {
              await this.productRepository.create(productData);
            }
            imported.products++;
          } catch (error) {
            errors.push(`Product ${productData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Import settings
      if (data.data.settings && (!options || options.includeSettings !== false)) {
        await this.importSettings(data.data.settings);
      }

      return {
        success: true,
        message: `Import completed: ${imported.products} products, ${imported.categories} categories, ${imported.locations} locations`,
        imported,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        imported,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async importSettings(settings: any): Promise<void> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }
      await this.loggingService.log('info', 'SETTINGS_IMPORT', 'Settings imported successfully');
    } catch (error) {
      await this.loggingService.log('error', 'SETTINGS_IMPORT', 'Failed to import settings', { error });
      throw error;
    }
  }

  // Utility methods
  async getExportDirectory(): Promise<string> {
    return RNFS.DocumentDirectoryPath;
  }

  async getExportedFiles(): Promise<{ name: string; path: string; size: number; date: Date }[]> {
    try {
      const documentsPath = RNFS.DocumentDirectoryPath;
      const files = await RNFS.readDir(documentsPath);
      
      const exportFiles = files
        .filter(file => file.name.startsWith('ordo-export-'))
        .map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
          date: new Date(file.mtime || 0),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return exportFiles;
    } catch (error) {
      await this.loggingService.log('error', 'FILE_LIST', 'Failed to get exported files', { error });
      return [];
    }
  }

  async deleteExportFile(filePath: string): Promise<boolean> {
    try {
      await RNFS.unlink(filePath);
      await this.loggingService.log('info', 'FILE_DELETE', 'Export file deleted', { filePath });
      return true;
    } catch (error) {
      await this.loggingService.log('error', 'FILE_DELETE', 'Failed to delete export file', { error, filePath });
      return false;
    }
  }
}

export interface ImportOptions {
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeLocations?: boolean;
  includeSettings?: boolean;
  mode?: 'replace' | 'update' | 'skip'; // replace: overwrite existing, update: update if exists, skip: skip if exists
}
