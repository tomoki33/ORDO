/**
 * Report Generation Service
 * レポート生成とドキュメント作成機能
 */

import { statisticsEngineService, MonthlyReport, YearlyReport, TrendData, CategoryStatistics } from './StatisticsEngineService';
import { userManagementService } from './UserManagementService';

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'monthly' | 'yearly' | 'custom' | 'summary';
  description: string;
  sections: ReportSection[];
  defaultSettings: ReportSettings;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'insights' | 'recommendations';
  content?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  dataSource?: string;
  isRequired: boolean;
  order: number;
}

export interface ReportSettings {
  includeCharts: boolean;
  includeInsights: boolean;
  includeRecommendations: boolean;
  includeDetailedStats: boolean;
  dateFormat: 'US' | 'JP' | 'ISO';
  currency: 'JPY' | 'USD' | 'EUR';
  language: 'ja' | 'en';
  chartStyle: 'modern' | 'classic' | 'minimal';
  colorTheme: 'blue' | 'green' | 'orange' | 'purple';
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  title: string;
  subtitle?: string;
  generatedAt: number;
  period: {
    start: number;
    end: number;
    description: string;
  };
  familyId: string;
  familyName: string;
  generatedBy: string;
  settings: ReportSettings;
  content: {
    html: string;
    markdown: string;
    plainText: string;
  };
  data: {
    summary: any;
    charts: any[];
    tables: any[];
    insights: string[];
    recommendations: string[];
  };
  metadata: {
    totalPages: number;
    wordCount: number;
    chartCount: number;
    tableCount: number;
    fileSize: number;
  };
}

export interface ReportQuery {
  templateId?: string;
  type: 'monthly' | 'yearly' | 'custom' | 'summary';
  startDate: number;
  endDate: number;
  familyId?: string;
  includeCategories?: string[];
  includeLocations?: string[];
  settings?: Partial<ReportSettings>;
}

class ReportGenerationService {
  private templates: Map<string, ReportTemplate> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing Report Generation Service...');
    
    try {
      await this.loadTemplates();
      console.log('✅ Report Generation Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Report Generation Service:', error);
      throw error;
    }
  }

  /**
   * デフォルトテンプレート初期化
   */
  private initializeTemplates(): void {
    // 月次レポートテンプレート
    const monthlyTemplate: ReportTemplate = {
      id: 'monthly_standard',
      name: '月次レポート',
      type: 'monthly',
      description: '月間の在庫管理活動とトレンドの詳細レポート',
      sections: [
        {
          id: 'executive_summary',
          title: 'エグゼクティブサマリー',
          type: 'summary',
          isRequired: true,
          order: 1,
        },
        {
          id: 'monthly_overview',
          title: '月間概要',
          type: 'table',
          dataSource: 'monthly_stats',
          isRequired: true,
          order: 2,
        },
        {
          id: 'trend_analysis',
          title: 'トレンド分析',
          type: 'chart',
          chartType: 'line',
          dataSource: 'trends',
          isRequired: true,
          order: 3,
        },
        {
          id: 'category_breakdown',
          title: 'カテゴリ別分析',
          type: 'chart',
          chartType: 'pie',
          dataSource: 'categories',
          isRequired: true,
          order: 4,
        },
        {
          id: 'insights',
          title: 'インサイト',
          type: 'insights',
          isRequired: true,
          order: 5,
        },
        {
          id: 'recommendations',
          title: '推奨事項',
          type: 'recommendations',
          isRequired: true,
          order: 6,
        },
      ],
      defaultSettings: {
        includeCharts: true,
        includeInsights: true,
        includeRecommendations: true,
        includeDetailedStats: true,
        dateFormat: 'JP',
        currency: 'JPY',
        language: 'ja',
        chartStyle: 'modern',
        colorTheme: 'blue',
      },
    };

    // 年次レポートテンプレート
    const yearlyTemplate: ReportTemplate = {
      id: 'yearly_comprehensive',
      name: '年次総合レポート',
      type: 'yearly',
      description: '年間の包括的な在庫管理分析とパフォーマンスレポート',
      sections: [
        {
          id: 'executive_summary',
          title: 'エグゼクティブサマリー',
          type: 'summary',
          isRequired: true,
          order: 1,
        },
        {
          id: 'yearly_overview',
          title: '年間概要',
          type: 'table',
          dataSource: 'yearly_stats',
          isRequired: true,
          order: 2,
        },
        {
          id: 'monthly_breakdown',
          title: '月別推移',
          type: 'chart',
          chartType: 'bar',
          dataSource: 'monthly_breakdown',
          isRequired: true,
          order: 3,
        },
        {
          id: 'seasonal_analysis',
          title: '季節性分析',
          type: 'chart',
          chartType: 'area',
          dataSource: 'seasonal_patterns',
          isRequired: true,
          order: 4,
        },
        {
          id: 'category_performance',
          title: 'カテゴリパフォーマンス',
          type: 'table',
          dataSource: 'category_analysis',
          isRequired: true,
          order: 5,
        },
        {
          id: 'cost_analysis',
          title: 'コスト分析',
          type: 'chart',
          chartType: 'line',
          dataSource: 'cost_analysis',
          isRequired: true,
          order: 6,
        },
        {
          id: 'insights',
          title: '年次インサイト',
          type: 'insights',
          isRequired: true,
          order: 7,
        },
        {
          id: 'recommendations',
          title: '来年に向けた推奨事項',
          type: 'recommendations',
          isRequired: true,
          order: 8,
        },
      ],
      defaultSettings: {
        includeCharts: true,
        includeInsights: true,
        includeRecommendations: true,
        includeDetailedStats: true,
        dateFormat: 'JP',
        currency: 'JPY',
        language: 'ja',
        chartStyle: 'modern',
        colorTheme: 'blue',
      },
    };

    // サマリーレポートテンプレート
    const summaryTemplate: ReportTemplate = {
      id: 'summary_quick',
      name: 'クイックサマリー',
      type: 'summary',
      description: '簡潔な概要レポート',
      sections: [
        {
          id: 'key_metrics',
          title: '主要指標',
          type: 'summary',
          isRequired: true,
          order: 1,
        },
        {
          id: 'top_insights',
          title: '主要インサイト',
          type: 'insights',
          isRequired: true,
          order: 2,
        },
        {
          id: 'quick_recommendations',
          title: 'アクションアイテム',
          type: 'recommendations',
          isRequired: true,
          order: 3,
        },
      ],
      defaultSettings: {
        includeCharts: false,
        includeInsights: true,
        includeRecommendations: true,
        includeDetailedStats: false,
        dateFormat: 'JP',
        currency: 'JPY',
        language: 'ja',
        chartStyle: 'minimal',
        colorTheme: 'blue',
      },
    };

    this.templates.set(monthlyTemplate.id, monthlyTemplate);
    this.templates.set(yearlyTemplate.id, yearlyTemplate);
    this.templates.set(summaryTemplate.id, summaryTemplate);
  }

  /**
   * テンプレート読み込み
   */
  private async loadTemplates(): Promise<void> {
    // 将来的にはFirestoreからカスタムテンプレートを読み込み
    console.log(`📋 Loaded ${this.templates.size} report templates`);
  }

  /**
   * レポート生成
   */
  async generateReport(query: ReportQuery): Promise<GeneratedReport> {
    try {
      console.log(`📊 Generating report: ${query.type}`);

      const templateId = query.templateId || this.getDefaultTemplateId(query.type);
      const template = this.templates.get(templateId);
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const user = userManagementService.getCurrentUser();
      const familyGroup = userManagementService.getCurrentFamilyGroup();
      
      if (!user || !familyGroup) {
        throw new Error('User not authenticated or not in family group');
      }

      const familyId = query.familyId || familyGroup.id;
      const settings = { ...template.defaultSettings, ...query.settings };

      // データ収集
      const reportData = await this.collectReportData(query, familyId);

      // レポート生成
      const report = await this.buildReport(template, reportData, {
        familyId,
        familyName: familyGroup.name,
        generatedBy: user.displayName,
        period: {
          start: query.startDate,
          end: query.endDate,
          description: this.formatPeriodDescription(query.startDate, query.endDate, query.type),
        },
        settings,
      });

      // キャッシュに保存
      this.generatedReports.set(report.id, report);

      console.log(`✅ Report generated: ${report.id}`);
      return report;

    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * レポートデータ収集
   */
  private async collectReportData(query: ReportQuery, familyId: string): Promise<any> {
    try {
      console.log('📊 Collecting report data...');

      const data: any = {
        raw: {},
        processed: {},
      };

      switch (query.type) {
        case 'monthly':
          const date = new Date(query.startDate);
          data.raw.monthlyReport = await statisticsEngineService.generateMonthlyReport(
            date.getFullYear(),
            date.getMonth() + 1,
            familyId
          );
          break;

        case 'yearly':
          const year = new Date(query.startDate).getFullYear();
          data.raw.yearlyReport = await statisticsEngineService.generateYearlyReport(year, familyId);
          break;

        case 'custom':
        case 'summary':
          // カスタム期間のデータ収集
          const [trends, categories] = await Promise.all([
            statisticsEngineService.generateTrendData(query.startDate, query.endDate, 'day', familyId),
            statisticsEngineService.analyzeCategories(familyId, { start: query.startDate, end: query.endDate }),
          ]);
          
          data.raw.trends = trends;
          data.raw.categories = categories;
          break;
      }

      // データ処理
      data.processed = this.processReportData(data.raw, query.type);

      return data;

    } catch (error) {
      console.error('Failed to collect report data:', error);
      throw error;
    }
  }

  /**
   * レポートデータ処理
   */
  private processReportData(rawData: any, reportType: string): any {
    const processed: any = {};

    switch (reportType) {
      case 'monthly':
        if (rawData.monthlyReport) {
          processed.summary = this.createMonthlySummary(rawData.monthlyReport);
          processed.charts = this.createMonthlyCharts(rawData.monthlyReport);
          processed.tables = this.createMonthlyTables(rawData.monthlyReport);
        }
        break;

      case 'yearly':
        if (rawData.yearlyReport) {
          processed.summary = this.createYearlySummary(rawData.yearlyReport);
          processed.charts = this.createYearlyCharts(rawData.yearlyReport);
          processed.tables = this.createYearlyTables(rawData.yearlyReport);
        }
        break;

      case 'custom':
      case 'summary':
        processed.summary = this.createCustomSummary(rawData);
        processed.charts = this.createCustomCharts(rawData);
        processed.tables = this.createCustomTables(rawData);
        break;
    }

    return processed;
  }

  /**
   * レポート構築
   */
  private async buildReport(
    template: ReportTemplate,
    data: any,
    metadata: {
      familyId: string;
      familyName: string;
      generatedBy: string;
      period: { start: number; end: number; description: string };
      settings: ReportSettings;
    }
  ): Promise<GeneratedReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // レポートのタイトルと副題
    const title = this.generateReportTitle(template, metadata.period);
    const subtitle = `${metadata.familyName} - ${metadata.period.description}`;

    // セクション別コンテンツ生成
    const sections = await this.generateReportSections(template.sections, data, metadata.settings);

    // HTML, Markdown, プレーンテキスト生成
    const content = {
      html: this.generateHTML(title, subtitle, sections, metadata.settings),
      markdown: this.generateMarkdown(title, subtitle, sections),
      plainText: this.generatePlainText(title, subtitle, sections),
    };

    // メタデータ計算
    const reportMetadata = {
      totalPages: Math.ceil(content.plainText.length / 2000), // 1ページ約2000文字と仮定
      wordCount: content.plainText.split(/\s+/).length,
      chartCount: data.processed.charts?.length || 0,
      tableCount: data.processed.tables?.length || 0,
      fileSize: content.html.length + content.markdown.length + content.plainText.length,
    };

    const report: GeneratedReport = {
      id: reportId,
      templateId: template.id,
      title,
      subtitle,
      generatedAt: Date.now(),
      period: metadata.period,
      familyId: metadata.familyId,
      familyName: metadata.familyName,
      generatedBy: metadata.generatedBy,
      settings: metadata.settings,
      content,
      data: {
        summary: data.processed.summary || {},
        charts: data.processed.charts || [],
        tables: data.processed.tables || [],
        insights: this.extractInsights(data),
        recommendations: this.extractRecommendations(data),
      },
      metadata: reportMetadata,
    };

    return report;
  }

  /**
   * レポートタイトル生成
   */
  private generateReportTitle(template: ReportTemplate, period: { start: number; end: number; description: string }): string {
    const baseTitle = template.name;
    const year = new Date(period.start).getFullYear();
    const month = new Date(period.start).getMonth() + 1;

    switch (template.type) {
      case 'monthly':
        return `${year}年${month}月 ${baseTitle}`;
      case 'yearly':
        return `${year}年 ${baseTitle}`;
      case 'summary':
        return `${period.description} ${baseTitle}`;
      default:
        return `${period.description} カスタムレポート`;
    }
  }

  /**
   * レポートセクション生成
   */
  private async generateReportSections(
    sections: ReportSection[],
    data: any,
    settings: ReportSettings
  ): Promise<Array<{ section: ReportSection; content: string }>> {
    const generatedSections: Array<{ section: ReportSection; content: string }> = [];

    for (const section of sections.sort((a, b) => a.order - b.order)) {
      let content = '';

      switch (section.type) {
        case 'summary':
          content = this.generateSummaryContent(data.processed.summary, settings);
          break;
        case 'chart':
          if (settings.includeCharts) {
            content = this.generateChartContent(section, data.processed.charts, settings);
          }
          break;
        case 'table':
          if (settings.includeDetailedStats) {
            content = this.generateTableContent(section, data.processed.tables, settings);
          }
          break;
        case 'insights':
          if (settings.includeInsights) {
            content = this.generateInsightsContent(data, settings);
          }
          break;
        case 'recommendations':
          if (settings.includeRecommendations) {
            content = this.generateRecommendationsContent(data, settings);
          }
          break;
      }

      if (content || section.isRequired) {
        generatedSections.push({ section, content });
      }
    }

    return generatedSections;
  }

  /**
   * HTML生成
   */
  private generateHTML(
    title: string,
    subtitle: string,
    sections: Array<{ section: ReportSection; content: string }>,
    settings: ReportSettings
  ): string {
    const colorTheme = this.getColorTheme(settings.colorTheme);
    
    let html = `
<!DOCTYPE html>
<html lang="${settings.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid ${colorTheme.primary};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 {
            color: ${colorTheme.primary};
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        h2 {
            color: ${colorTheme.secondary};
            font-size: 1.8em;
            border-left: 4px solid ${colorTheme.primary};
            padding-left: 15px;
            margin-top: 30px;
        }
        .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }
        .chart-placeholder {
            background-color: #e9e9e9;
            border: 2px dashed #ccc;
            padding: 40px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: ${colorTheme.primary};
            color: white;
        }
        .insight {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 10px 0;
        }
        .recommendation {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <p>生成日時: ${new Date().toLocaleDateString(settings.language === 'ja' ? 'ja-JP' : 'en-US')}</p>
    </div>
`;

    sections.forEach(({ section, content }) => {
      if (content) {
        html += `
    <div class="section">
        <h2>${section.title}</h2>
        ${content}
    </div>`;
      }
    });

    html += `
    <div class="footer">
        <p>このレポートはOrdoアプリによって自動生成されました</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Markdown生成
   */
  private generateMarkdown(
    title: string,
    subtitle: string,
    sections: Array<{ section: ReportSection; content: string }>
  ): string {
    let markdown = `# ${title}\n\n`;
    markdown += `${subtitle}\n\n`;
    markdown += `生成日時: ${new Date().toLocaleDateString('ja-JP')}\n\n`;
    markdown += `---\n\n`;

    sections.forEach(({ section, content }) => {
      if (content) {
        markdown += `## ${section.title}\n\n`;
        markdown += `${content}\n\n`;
      }
    });

    markdown += `---\n\n`;
    markdown += `*このレポートはOrdoアプリによって自動生成されました*\n`;

    return markdown;
  }

  /**
   * プレーンテキスト生成
   */
  private generatePlainText(
    title: string,
    subtitle: string,
    sections: Array<{ section: ReportSection; content: string }>
  ): string {
    let text = `${title}\n`;
    text += `${'='.repeat(title.length)}\n\n`;
    text += `${subtitle}\n\n`;
    text += `生成日時: ${new Date().toLocaleDateString('ja-JP')}\n\n`;

    sections.forEach(({ section, content }) => {
      if (content) {
        text += `${section.title}\n`;
        text += `${'-'.repeat(section.title.length)}\n\n`;
        // HTMLタグを除去してプレーンテキストに変換
        const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        text += `${plainContent}\n\n`;
      }
    });

    text += `このレポートはOrdoアプリによって自動生成されました\n`;

    return text;
  }

  // === コンテンツ生成メソッド ===

  private generateSummaryContent(summary: any, settings: ReportSettings): string {
    if (!summary) return '';

    return `
<div class="summary">
    <p>このレポートは在庫管理活動の包括的な分析を提供します。</p>
    <ul>
        <li>総取引数: ${summary.totalTransactions || 0}</li>
        <li>追加アイテム: ${summary.totalItemsAdded || 0}</li>
        <li>消費アイテム: ${summary.totalItemsConsumed || 0}</li>
        <li>期限切れアイテム: ${summary.totalItemsExpired || 0}</li>
        <li>総コスト: ${this.formatCurrency(summary.totalValue || 0, settings.currency)}</li>
    </ul>
</div>`;
  }

  private generateChartContent(section: ReportSection, charts: any[], settings: ReportSettings): string {
    return `<div class="chart-placeholder">
        <p>📊 ${section.chartType || 'グラフ'}チャート</p>
        <p>チャートデータはエクスポート時に生成されます</p>
    </div>`;
  }

  private generateTableContent(section: ReportSection, tables: any[], settings: ReportSettings): string {
    const table = tables.find(t => t.source === section.dataSource);
    if (!table) return '';

    let html = '<table>';
    
    // ヘッダー
    if (table.headers) {
      html += '<thead><tr>';
      table.headers.forEach((header: string) => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead>';
    }

    // データ行
    html += '<tbody>';
    if (table.rows) {
      table.rows.forEach((row: any[]) => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${cell}</td>`;
        });
        html += '</tr>';
      });
    }
    html += '</tbody></table>';

    return html;
  }

  private generateInsightsContent(data: any, settings: ReportSettings): string {
    const insights = this.extractInsights(data);
    if (!insights.length) return '';

    let html = '';
    insights.forEach(insight => {
      html += `<div class="insight">💡 ${insight}</div>`;
    });

    return html;
  }

  private generateRecommendationsContent(data: any, settings: ReportSettings): string {
    const recommendations = this.extractRecommendations(data);
    if (!recommendations.length) return '';

    let html = '';
    recommendations.forEach(rec => {
      html += `<div class="recommendation">📈 ${rec}</div>`;
    });

    return html;
  }

  // === ユーティリティメソッド ===

  private getDefaultTemplateId(type: string): string {
    switch (type) {
      case 'monthly': return 'monthly_standard';
      case 'yearly': return 'yearly_comprehensive';
      case 'summary': return 'summary_quick';
      default: return 'summary_quick';
    }
  }

  private formatPeriodDescription(startDate: number, endDate: number, type: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    switch (type) {
      case 'monthly':
        return `${start.getFullYear()}年${start.getMonth() + 1}月`;
      case 'yearly':
        return `${start.getFullYear()}年`;
      default:
        return `${start.toLocaleDateString('ja-JP')} - ${end.toLocaleDateString('ja-JP')}`;
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    switch (currency) {
      case 'JPY':
        return `¥${amount.toLocaleString('ja-JP')}`;
      case 'USD':
        return `$${amount.toLocaleString('en-US')}`;
      case 'EUR':
        return `€${amount.toLocaleString('de-DE')}`;
      default:
        return amount.toString();
    }
  }

  private getColorTheme(theme: string): { primary: string; secondary: string } {
    switch (theme) {
      case 'blue':
        return { primary: '#007AFF', secondary: '#5AC8FA' };
      case 'green':
        return { primary: '#34C759', secondary: '#30D158' };
      case 'orange':
        return { primary: '#FF9500', secondary: '#FF9F0A' };
      case 'purple':
        return { primary: '#AF52DE', secondary: '#BF5AF2' };
      default:
        return { primary: '#007AFF', secondary: '#5AC8FA' };
    }
  }

  private extractInsights(data: any): string[] {
    const insights: string[] = [];
    
    if (data.raw.monthlyReport?.insights) {
      insights.push(...data.raw.monthlyReport.insights);
    }
    
    if (data.raw.yearlyReport?.insights) {
      insights.push(...data.raw.yearlyReport.insights);
    }

    return insights;
  }

  private extractRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    if (data.raw.monthlyReport?.recommendations) {
      recommendations.push(...data.raw.monthlyReport.recommendations);
    }
    
    if (data.raw.yearlyReport?.recommendations) {
      recommendations.push(...data.raw.yearlyReport.recommendations);
    }

    return recommendations;
  }

  // データ処理用ヘルパーメソッド
  private createMonthlySummary(monthlyReport: MonthlyReport): any {
    return {
      totalTransactions: monthlyReport.totalTransactions,
      totalItemsAdded: monthlyReport.totalItemsAdded,
      totalItemsConsumed: monthlyReport.totalItemsConsumed,
      totalItemsExpired: monthlyReport.totalItemsExpired,
      totalValue: monthlyReport.totalValue,
      averageCost: monthlyReport.averageCost,
    };
  }

  private createMonthlyCharts(monthlyReport: MonthlyReport): any[] {
    return [
      {
        id: 'category_breakdown',
        type: 'pie',
        title: 'カテゴリ別分布',
        data: monthlyReport.categoryBreakdown,
      },
      {
        id: 'trends',
        type: 'line',
        title: 'トレンド',
        data: monthlyReport.trends,
      },
    ];
  }

  private createMonthlyTables(monthlyReport: MonthlyReport): any[] {
    return [
      {
        source: 'monthly_stats',
        headers: ['指標', '値'],
        rows: [
          ['総取引数', monthlyReport.totalTransactions],
          ['追加アイテム', monthlyReport.totalItemsAdded],
          ['消費アイテム', monthlyReport.totalItemsConsumed],
          ['期限切れアイテム', monthlyReport.totalItemsExpired],
        ],
      },
    ];
  }

  private createYearlySummary(yearlyReport: YearlyReport): any {
    return {
      totalTransactions: yearlyReport.totalTransactions,
      totalValue: yearlyReport.totalValue,
      peakMonth: yearlyReport.annualTrends.peakMonth,
      lowestMonth: yearlyReport.annualTrends.lowestMonth,
    };
  }

  private createYearlyCharts(yearlyReport: YearlyReport): any[] {
    return [
      {
        id: 'monthly_breakdown',
        type: 'bar',
        title: '月別推移',
        data: yearlyReport.monthlyBreakdown,
      },
    ];
  }

  private createYearlyTables(yearlyReport: YearlyReport): any[] {
    return [
      {
        source: 'yearly_stats',
        headers: ['指標', '値'],
        rows: [
          ['年間総取引数', yearlyReport.totalTransactions],
          ['年間総コスト', yearlyReport.totalValue],
        ],
      },
    ];
  }

  private createCustomSummary(rawData: any): any {
    return {
      totalTransactions: rawData.trends?.length || 0,
      categories: rawData.categories?.length || 0,
    };
  }

  private createCustomCharts(rawData: any): any[] {
    return [];
  }

  private createCustomTables(rawData: any): any[] {
    return [];
  }

  // === 公開API ===

  /**
   * 利用可能なテンプレート取得
   */
  getAvailableTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * テンプレート取得
   */
  getTemplate(templateId: string): ReportTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * 生成済みレポート取得
   */
  getGeneratedReport(reportId: string): GeneratedReport | null {
    return this.generatedReports.get(reportId) || null;
  }

  /**
   * レポート一覧取得
   */
  getGeneratedReports(): GeneratedReport[] {
    return Array.from(this.generatedReports.values());
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.generatedReports.clear();
    console.log('📊 Report Generation Service cleanup completed');
  }
}

export const reportGenerationService = new ReportGenerationService();
