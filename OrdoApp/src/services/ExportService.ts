/**
 * Export Service
 * CSV/PDF出力とデータエクスポート機能
 */

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform, Alert } from 'react-native';
import { statisticsEngineService, MonthlyReport, YearlyReport, TrendData, CategoryStatistics } from './StatisticsEngineService';
import { reportGenerationService, GeneratedReport } from './ReportGenerationService';
import { userManagementService } from './UserManagementService';

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel' | 'json';
  includeCharts: boolean;
  includeImages: boolean;
  includeMetadata: boolean;
  compression: 'none' | 'zip';
  password?: string;
  watermark?: string;
  customFileName?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  metadata?: {
    exportedAt: number;
    recordCount: number;
    columnCount: number;
    compressionRatio?: number;
  };
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  columns: ExportColumn[];
  defaultOptions: ExportOptions;
}

export interface ExportColumn {
  id: string;
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  format?: string;
  required: boolean;
  order: number;
}

export interface CSVExportData {
  headers: string[];
  rows: string[][];
  metadata?: Record<string, any>;
}

export interface PDFExportData {
  title: string;
  subtitle?: string;
  content: string;
  metadata?: Record<string, any>;
  charts?: Array<{
    title: string;
    type: string;
    data: any;
  }>;
}

class ExportService {
  private exportTemplates: Map<string, ExportTemplate> = new Map();
  private tempDirectory: string;

  constructor() {
    this.tempDirectory = `${RNFS.DocumentDirectoryPath}/exports`;
    this.initializeTemplates();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📤 Initializing Export Service...');
    
    try {
      // 一時ディレクトリ作成
      await this.ensureDirectoryExists(this.tempDirectory);
      
      // テンプレート読み込み
      await this.loadTemplates();
      
      console.log('✅ Export Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Export Service:', error);
      throw error;
    }
  }

  /**
   * エクスポートテンプレート初期化
   */
  private initializeTemplates(): void {
    // 在庫トランザクションエクスポートテンプレート
    const transactionTemplate: ExportTemplate = {
      id: 'inventory_transactions',
      name: '在庫トランザクション',
      description: '在庫の追加・削除・更新履歴',
      format: 'csv',
      columns: [
        { id: 'timestamp', name: 'timestamp', displayName: '日時', type: 'date', format: 'YYYY-MM-DD HH:mm:ss', required: true, order: 1 },
        { id: 'productName', name: 'productName', displayName: '商品名', type: 'string', required: true, order: 2 },
        { id: 'category', name: 'category', displayName: 'カテゴリ', type: 'string', required: true, order: 3 },
        { id: 'location', name: 'location', displayName: '場所', type: 'string', required: true, order: 4 },
        { id: 'transactionType', name: 'transactionType', displayName: '取引種別', type: 'string', required: true, order: 5 },
        { id: 'quantityChange', name: 'quantityChange', displayName: '数量変更', type: 'number', required: true, order: 6 },
        { id: 'newQuantity', name: 'newQuantity', displayName: '新数量', type: 'number', required: true, order: 7 },
        { id: 'cost', name: 'cost', displayName: 'コスト', type: 'currency', format: 'JPY', required: false, order: 8 },
        { id: 'userName', name: 'userName', displayName: 'ユーザー', type: 'string', required: true, order: 9 },
      ],
      defaultOptions: {
        format: 'csv',
        includeCharts: false,
        includeImages: false,
        includeMetadata: true,
        compression: 'none',
      },
    };

    // カテゴリ統計エクスポートテンプレート
    const categoryStatsTemplate: ExportTemplate = {
      id: 'category_statistics',
      name: 'カテゴリ統計',
      description: 'カテゴリ別の在庫統計情報',
      format: 'csv',
      columns: [
        { id: 'category', name: 'category', displayName: 'カテゴリ', type: 'string', required: true, order: 1 },
        { id: 'totalItems', name: 'totalItems', displayName: '総アイテム数', type: 'number', required: true, order: 2 },
        { id: 'totalValue', name: 'totalValue', displayName: '総価値', type: 'currency', format: 'JPY', required: true, order: 3 },
        { id: 'averageQuantity', name: 'averageQuantity', displayName: '平均数量', type: 'number', format: '0.00', required: true, order: 4 },
        { id: 'mostAddedProduct', name: 'mostAddedProduct', displayName: '最多追加商品', type: 'string', required: false, order: 5 },
        { id: 'mostConsumedProduct', name: 'mostConsumedProduct', displayName: '最多消費商品', type: 'string', required: false, order: 6 },
        { id: 'expirationRate', name: 'expirationRate', displayName: '期限切れ率', type: 'number', format: '0.00%', required: true, order: 7 },
        { id: 'trend', name: 'trend', displayName: 'トレンド', type: 'string', required: true, order: 8 },
      ],
      defaultOptions: {
        format: 'csv',
        includeCharts: false,
        includeImages: false,
        includeMetadata: true,
        compression: 'none',
      },
    };

    // 月次レポートエクスポートテンプレート
    const monthlyReportTemplate: ExportTemplate = {
      id: 'monthly_report',
      name: '月次レポート',
      description: '月間の詳細レポート',
      format: 'pdf',
      columns: [], // PDFテンプレートではcolumnsは使用しない
      defaultOptions: {
        format: 'pdf',
        includeCharts: true,
        includeImages: true,
        includeMetadata: true,
        compression: 'none',
      },
    };

    this.exportTemplates.set(transactionTemplate.id, transactionTemplate);
    this.exportTemplates.set(categoryStatsTemplate.id, categoryStatsTemplate);
    this.exportTemplates.set(monthlyReportTemplate.id, monthlyReportTemplate);
  }

  /**
   * テンプレート読み込み
   */
  private async loadTemplates(): Promise<void> {
    console.log(`📋 Loaded ${this.exportTemplates.size} export templates`);
  }

  /**
   * CSV エクスポート
   */
  async exportToCSV(
    templateId: string,
    startDate: number,
    endDate: number,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      console.log(`📊 Exporting to CSV: ${templateId}`);

      const template = this.exportTemplates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const familyGroup = userManagementService.getCurrentFamilyGroup();
      if (!familyGroup) {
        throw new Error('Family group not found');
      }

      // データ取得
      const data = await this.getExportData(templateId, startDate, endDate, familyGroup.id);
      
      // CSV生成
      const csvData = await this.generateCSV(data, template, options);
      
      // ファイル保存
      const fileName = options.customFileName || this.generateFileName(template.name, 'csv', startDate, endDate);
      const filePath = `${this.tempDirectory}/${fileName}`;
      
      await RNFS.writeFile(filePath, csvData.content, 'utf8');
      
      // ファイル情報取得
      const fileStats = await RNFS.stat(filePath);
      
      const result: ExportResult = {
        success: true,
        filePath,
        fileName,
        fileSize: fileStats.size,
        mimeType: 'text/csv',
        metadata: {
          exportedAt: Date.now(),
          recordCount: csvData.rowCount,
          columnCount: csvData.columnCount,
        },
      };

      console.log(`✅ CSV export completed: ${fileName}`);
      return result;

    } catch (error) {
      console.error('Failed to export CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * PDF エクスポート
   */
  async exportToPDF(
    reportId: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      console.log(`📄 Exporting to PDF: ${reportId}`);

      const report = reportGenerationService.getGeneratedReport(reportId);
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // PDFデータ準備
      const pdfData: PDFExportData = {
        title: report.title,
        subtitle: report.subtitle,
        content: report.content.html,
        metadata: {
          generatedAt: report.generatedAt,
          familyName: report.familyName,
          generatedBy: report.generatedBy,
        },
      };

      if (options.includeCharts && report.data.charts) {
        pdfData.charts = report.data.charts;
      }

      // PDF生成（シンプルなHTML to PDF変換）
      const pdfContent = await this.generatePDF(pdfData, options);
      
      // ファイル保存
      const fileName = options.customFileName || this.generateFileName(report.title, 'pdf');
      const filePath = `${this.tempDirectory}/${fileName}`;
      
      await RNFS.writeFile(filePath, pdfContent, 'utf8');
      
      // ファイル情報取得
      const fileStats = await RNFS.stat(filePath);
      
      const result: ExportResult = {
        success: true,
        filePath,
        fileName,
        fileSize: fileStats.size,
        mimeType: 'application/pdf',
        metadata: {
          exportedAt: Date.now(),
          recordCount: 1, // PDF = 1レポート
          columnCount: 0,
        },
      };

      console.log(`✅ PDF export completed: ${fileName}`);
      return result;

    } catch (error) {
      console.error('Failed to export PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Excel エクスポート
   */
  async exportToExcel(
    templateId: string,
    startDate: number,
    endDate: number,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      console.log(`📊 Exporting to Excel: ${templateId}`);

      // Excel形式の場合、CSVとして出力し、拡張子を変更
      const csvResult = await this.exportToCSV(templateId, startDate, endDate, options);
      
      if (!csvResult.success || !csvResult.filePath) {
        return csvResult;
      }

      // ファイル名をExcel形式に変更
      const excelFileName = csvResult.fileName!.replace('.csv', '.xlsx');
      const excelFilePath = csvResult.filePath.replace('.csv', '.xlsx');
      
      // ファイル名変更
      await RNFS.moveFile(csvResult.filePath, excelFilePath);
      
      return {
        ...csvResult,
        fileName: excelFileName,
        filePath: excelFilePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

    } catch (error) {
      console.error('Failed to export Excel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * JSON エクスポート
   */
  async exportToJSON(
    templateId: string,
    startDate: number,
    endDate: number,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      console.log(`📊 Exporting to JSON: ${templateId}`);

      const familyGroup = userManagementService.getCurrentFamilyGroup();
      if (!familyGroup) {
        throw new Error('Family group not found');
      }

      // データ取得
      const data = await this.getExportData(templateId, startDate, endDate, familyGroup.id);
      
      // JSON生成
      const jsonData = {
        exportInfo: {
          templateId,
          familyId: familyGroup.id,
          familyName: familyGroup.name,
          exportedAt: Date.now(),
          startDate,
          endDate,
          exportedBy: userManagementService.getCurrentUser()?.displayName || 'Unknown',
        },
        data,
      };

      const jsonContent = JSON.stringify(jsonData, null, 2);
      
      // ファイル保存
      const fileName = options.customFileName || this.generateFileName('export', 'json', startDate, endDate);
      const filePath = `${this.tempDirectory}/${fileName}`;
      
      await RNFS.writeFile(filePath, jsonContent, 'utf8');
      
      // ファイル情報取得
      const fileStats = await RNFS.stat(filePath);
      
      const result: ExportResult = {
        success: true,
        filePath,
        fileName,
        fileSize: fileStats.size,
        mimeType: 'application/json',
        metadata: {
          exportedAt: Date.now(),
          recordCount: Array.isArray(data) ? data.length : 1,
          columnCount: 0,
        },
      };

      console.log(`✅ JSON export completed: ${fileName}`);
      return result;

    } catch (error) {
      console.error('Failed to export JSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ファイル共有
   */
  async shareFile(exportResult: ExportResult): Promise<void> {
    try {
      if (!exportResult.success || !exportResult.filePath) {
        throw new Error('Invalid export result');
      }

      const shareOptions = {
        title: 'データエクスポート',
        message: `Ordoアプリからエクスポートされたファイル: ${exportResult.fileName}`,
        url: Platform.OS === 'ios' ? exportResult.filePath : `file://${exportResult.filePath}`,
        type: exportResult.mimeType,
      };

      await Share.open(shareOptions);
      console.log('📤 File shared successfully');

    } catch (error) {
      console.error('Failed to share file:', error);
      Alert.alert('エラー', 'ファイルの共有に失敗しました');
    }
  }

  /**
   * ファイル削除
   */
  async deleteExportFile(filePath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log(`🗑️ Export file deleted: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to delete export file:', error);
    }
  }

  // === プライベートメソッド ===

  /**
   * エクスポートデータ取得
   */
  private async getExportData(templateId: string, startDate: number, endDate: number, familyId: string): Promise<any> {
    switch (templateId) {
      case 'inventory_transactions':
        return await statisticsEngineService.getTransactions({
          startDate,
          endDate,
          familyId,
        });

      case 'category_statistics':
        return await statisticsEngineService.analyzeCategories(familyId, {
          start: startDate,
          end: endDate,
        });

      case 'monthly_report':
        const date = new Date(startDate);
        return await statisticsEngineService.generateMonthlyReport(
          date.getFullYear(),
          date.getMonth() + 1,
          familyId
        );

      default:
        throw new Error(`Unknown template: ${templateId}`);
    }
  }

  /**
   * CSV生成
   */
  private async generateCSV(
    data: any[],
    template: ExportTemplate,
    options: Partial<ExportOptions>
  ): Promise<{ content: string; rowCount: number; columnCount: number }> {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array for CSV export');
    }

    // ヘッダー行生成
    const headers = template.columns
      .sort((a, b) => a.order - b.order)
      .map(col => col.displayName);

    // データ行生成
    const rows = data.map(item => {
      return template.columns
        .sort((a, b) => a.order - b.order)
        .map(col => this.formatCellValue(item[col.name], col));
    });

    // CSV形式に変換
    const csvLines = [headers, ...rows];
    const csvContent = csvLines
      .map(row => row.map(cell => this.escapeCsvCell(cell)).join(','))
      .join('\n');

    // メタデータ追加
    let content = csvContent;
    if (options.includeMetadata) {
      const metadata = [
        `# エクスポート情報`,
        `# 作成日時: ${new Date().toLocaleString('ja-JP')}`,
        `# テンプレート: ${template.name}`,
        `# レコード数: ${data.length}`,
        '',
      ].join('\n');
      
      content = metadata + csvContent;
    }

    return {
      content,
      rowCount: data.length,
      columnCount: headers.length,
    };
  }

  /**
   * PDF生成（HTML版）
   */
  private async generatePDF(data: PDFExportData, options: Partial<ExportOptions>): Promise<string> {
    // 実際のPDF生成は外部ライブラリが必要
    // ここでは拡張されたHTMLを返す
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.title}</title>
    <style>
        @page { margin: 1in; size: A4; }
        body { font-family: 'Helvetica', sans-serif; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
        .chart-placeholder { border: 1px dashed #ccc; padding: 20px; margin: 10px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.title}</h1>
        ${data.subtitle ? `<h2>${data.subtitle}</h2>` : ''}
        <p>生成日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>
    
    ${data.content}
    
    ${options.includeCharts && data.charts ? data.charts.map(chart => 
      `<div class="chart-placeholder">
        <h3>${chart.title}</h3>
        <p>[${chart.type}チャートプレースホルダー]</p>
      </div>`
    ).join('') : ''}
    
    <div class="footer">
        <p>このレポートはOrdoアプリによって生成されました</p>
        ${options.watermark ? `<p>Watermark: ${options.watermark}</p>` : ''}
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * セル値フォーマット
   */
  private formatCellValue(value: any, column: ExportColumn): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (column.type) {
      case 'date':
        if (typeof value === 'number') {
          const date = new Date(value);
          return date.toLocaleString('ja-JP');
        }
        return String(value);

      case 'number':
        if (typeof value === 'number') {
          if (column.format) {
            if (column.format.includes('%')) {
              return `${(value * 100).toFixed(2)}%`;
            } else if (column.format.includes('.')) {
              const decimals = column.format.split('.')[1].length;
              return value.toFixed(decimals);
            }
          }
          return value.toString();
        }
        return String(value);

      case 'currency':
        if (typeof value === 'number') {
          const format = column.format || 'JPY';
          switch (format) {
            case 'JPY':
              return `¥${value.toLocaleString('ja-JP')}`;
            case 'USD':
              return `$${value.toLocaleString('en-US')}`;
            default:
              return value.toString();
          }
        }
        return String(value);

      case 'boolean':
        return value ? 'はい' : 'いいえ';

      default:
        return String(value);
    }
  }

  /**
   * CSVセルエスケープ
   */
  private escapeCsvCell(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * ファイル名生成
   */
  private generateFileName(baseName: string, extension: string, startDate?: number, endDate?: number): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    let fileName = `${baseName}_${timestamp}`;

    if (startDate && endDate) {
      const start = new Date(startDate).toISOString().slice(0, 10);
      const end = new Date(endDate).toISOString().slice(0, 10);
      fileName = `${baseName}_${start}_to_${end}`;
    }

    return `${fileName}.${extension}`;
  }

  /**
   * ディレクトリ存在確認・作成
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        await RNFS.mkdir(dirPath);
      }
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw error;
    }
  }

  // === 公開API ===

  /**
   * 利用可能なテンプレート取得
   */
  getAvailableTemplates(): ExportTemplate[] {
    return Array.from(this.exportTemplates.values());
  }

  /**
   * テンプレート取得
   */
  getTemplate(templateId: string): ExportTemplate | null {
    return this.exportTemplates.get(templateId) || null;
  }

  /**
   * 一時ファイル一覧取得
   */
  async getTempFiles(): Promise<string[]> {
    try {
      const exists = await RNFS.exists(this.tempDirectory);
      if (!exists) {
        return [];
      }

      const files = await RNFS.readDir(this.tempDirectory);
      return files.map(file => file.path);
    } catch (error) {
      console.error('Failed to get temp files:', error);
      return [];
    }
  }

  /**
   * 一時ファイルクリーンアップ
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await this.getTempFiles();
      await Promise.all(files.map(file => this.deleteExportFile(file)));
      console.log(`🧹 Cleaned up ${files.length} temp files`);
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.cleanupTempFiles();
    console.log('📤 Export Service cleanup completed');
  }
}

export const exportService = new ExportService();
