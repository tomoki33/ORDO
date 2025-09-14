/**
 * TestFlight Configuration Service
 * TestFlightとInternal Testing環境の設定管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface TestFlightConfiguration {
  bundleId: string;
  appStoreConnectTeamId: string;
  testGroups: TestGroup[];
  buildSettings: BuildSettings;
  distributionSettings: DistributionSettings;
  reviewSettings: ReviewSettings;
  betaAppReviewInfo: BetaAppReviewInfo;
  metadata: TestFlightMetadata;
}

export interface TestGroup {
  id: string;
  name: string;
  description: string;
  isInternal: boolean;
  maxTesters: number;
  currentTesters: number;
  inviteSettings: {
    autoAcceptInvites: boolean;
    requiresApproval: boolean;
    allowFeedback: boolean;
  };
  testingFeatures: string[];
  targetBuilds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BuildSettings {
  version: string;
  buildNumber: string;
  minOSVersion: string;
  supportedDevices: string[];
  configurations: {
    debug: BuildConfiguration;
    release: BuildConfiguration;
    beta: BuildConfiguration;
  };
  signing: {
    codeSigningIdentity: string;
    provisioningProfile: string;
    developmentTeam: string;
  };
  entitlements: string[];
  capabilities: string[];
}

export interface BuildConfiguration {
  name: string;
  bundleIdentifier: string;
  displayName: string;
  preprocessorMacros: Record<string, string>;
  buildFlags: string[];
  optimizationLevel: 'none' | 'fast' | 'aggressive';
  debugSymbols: boolean;
  crashReporting: boolean;
}

export interface DistributionSettings {
  automaticDistribution: boolean;
  distributionGroups: string[];
  releaseNotes: {
    [version: string]: {
      en: string;
      ja: string;
      [locale: string]: string;
    };
  };
  betaTestingSchedule: {
    startDate?: number;
    endDate?: number;
    maxDuration: number; // days
  };
  notifications: {
    newBuildAvailable: boolean;
    feedbackReceived: boolean;
    crashReports: boolean;
  };
}

export interface ReviewSettings {
  betaAppReview: {
    required: boolean;
    autoSubmit: boolean;
    skipWaitingForReview: boolean;
  };
  appReviewInformation: {
    contactEmail: string;
    contactPhone: string;
    demoAccountRequired: boolean;
    demoUsername?: string;
    demoPassword?: string;
    notes?: string;
  };
  contentRights: {
    containsThirdPartyContent: boolean;
    hasContentRightsDeclaration: boolean;
  };
}

export interface BetaAppReviewInfo {
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  demoAccountRequired: boolean;
  demoAccountUsername?: string;
  demoAccountPassword?: string;
  reviewNotes?: string;
}

export interface TestFlightMetadata {
  betaLicenseAgreement?: {
    [locale: string]: string;
  };
  betaReviewInformation?: {
    [locale: string]: {
      feedbackEmail: string;
      marketingUrl?: string;
      privacyPolicyUrl?: string;
      description: string;
    };
  };
  localizations: {
    [locale: string]: {
      description: string;
      keywords: string[];
      releaseNotes: string;
      whatsNew: string;
    };
  };
}

export interface TestFlightBuild {
  id: string;
  version: string;
  buildNumber: string;
  uploadDate: number;
  processingState: 'processing' | 'valid' | 'invalid' | 'ready_for_beta_testing';
  reviewState: 'waiting_for_review' | 'in_review' | 'approved' | 'rejected';
  distributionState: 'ready' | 'distributing' | 'completed';
  fileSize: number;
  minOSVersion: string;
  supportedDevices: string[];
  testingEnabled: boolean;
  expirationDate: number;
  downloadUrl?: string;
  installInstructions?: string;
  releaseNotes: Record<string, string>;
  metrics: {
    downloads: number;
    installations: number;
    crashes: number;
    sessions: number;
  };
}

export interface InternalTester {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  inviteDate: number;
  inviteState: 'pending' | 'accepted' | 'declined' | 'expired';
  lastActiveDate?: number;
  testGroups: string[];
  devices: TestDevice[];
  feedbackCount: number;
  crashReports: number;
  betaVersionsInstalled: string[];
}

export interface TestDevice {
  id: string;
  name: string;
  model: string;
  osVersion: string;
  udid: string;
  registrationDate: number;
  lastSeenDate?: number;
  isActive: boolean;
}

export interface TestFlightAnalytics {
  totalBuilds: number;
  activeBuilds: number;
  totalTesters: number;
  activeTesters: number;
  totalDownloads: number;
  totalInstallations: number;
  crashRate: number;
  averageSessionDuration: number;
  buildMetrics: {
    [buildVersion: string]: {
      downloads: number;
      installations: number;
      crashes: number;
      sessions: number;
      averageRating: number;
      feedbackCount: number;
    };
  };
  deviceDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

class TestFlightConfigurationService {
  private configuration: TestFlightConfiguration | null = null;
  private builds: TestFlightBuild[] = [];
  private testers: InternalTester[] = [];
  private isInitialized = false;

  private readonly STORAGE_KEYS = {
    TESTFLIGHT_CONFIG: 'testflight_configuration',
    BUILDS: 'testflight_builds',
    TESTERS: 'internal_testers',
    ANALYTICS: 'testflight_analytics',
  };

  constructor() {
    // 初期化
  }

  /**
   * サービス初期化
   */
  async initialize(): Promise<void> {
    console.log('✈️ Initializing TestFlight Configuration Service...');

    try {
      // 設定読み込み
      await this.loadConfiguration();

      // ビルド情報読み込み
      await this.loadBuilds();

      // テスター情報読み込み
      await this.loadTesters();

      // デフォルト設定作成（初回起動時）
      if (!this.configuration) {
        await this.createDefaultConfiguration();
      }

      this.isInitialized = true;
      console.log('✅ TestFlight Configuration Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize TestFlight Configuration Service:', error);
      throw error;
    }
  }

  /**
   * デフォルト設定作成
   */
  private async createDefaultConfiguration(): Promise<void> {
    const bundleId = await DeviceInfo.getBundleId();
    const version = await DeviceInfo.getVersion();
    const buildNumber = await DeviceInfo.getBuildNumber();

    this.configuration = {
      bundleId,
      appStoreConnectTeamId: '', // 実際の値を設定する必要がある
      testGroups: [
        {
          id: 'internal-team',
          name: 'Internal Team',
          description: 'Internal development team members',
          isInternal: true,
          maxTesters: 25,
          currentTesters: 0,
          inviteSettings: {
            autoAcceptInvites: true,
            requiresApproval: false,
            allowFeedback: true,
          },
          testingFeatures: ['all'],
          targetBuilds: ['beta'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'external-beta',
          name: 'External Beta Testers',
          description: 'External beta testing group',
          isInternal: false,
          maxTesters: 100,
          currentTesters: 0,
          inviteSettings: {
            autoAcceptInvites: false,
            requiresApproval: true,
            allowFeedback: true,
          },
          testingFeatures: ['core', 'ui'],
          targetBuilds: ['beta', 'release-candidate'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      buildSettings: {
        version,
        buildNumber,
        minOSVersion: '13.0',
        supportedDevices: ['iPhone', 'iPad'],
        configurations: {
          debug: {
            name: 'Debug',
            bundleIdentifier: `${bundleId}.debug`,
            displayName: 'Ordo (Debug)',
            preprocessorMacros: {
              'DEBUG': '1',
              'BETA_TESTING': '1',
            },
            buildFlags: ['-DDEBUG'],
            optimizationLevel: 'none',
            debugSymbols: true,
            crashReporting: true,
          },
          release: {
            name: 'Release',
            bundleIdentifier: bundleId,
            displayName: 'Ordo',
            preprocessorMacros: {},
            buildFlags: ['-DRELEASE'],
            optimizationLevel: 'aggressive',
            debugSymbols: false,
            crashReporting: true,
          },
          beta: {
            name: 'Beta',
            bundleIdentifier: `${bundleId}.beta`,
            displayName: 'Ordo (Beta)',
            preprocessorMacros: {
              'BETA_TESTING': '1',
            },
            buildFlags: ['-DBETA'],
            optimizationLevel: 'fast',
            debugSymbols: true,
            crashReporting: true,
          },
        },
        signing: {
          codeSigningIdentity: 'iPhone Distribution',
          provisioningProfile: 'match AdHoc',
          developmentTeam: '', // 実際のチームIDを設定
        },
        entitlements: [
          'com.apple.developer.associated-domains',
          'com.apple.developer.camera',
          'com.apple.developer.photo-library',
        ],
        capabilities: [
          'Camera',
          'Photo Library',
          'Push Notifications',
          'Background App Refresh',
        ],
      },
      distributionSettings: {
        automaticDistribution: false,
        distributionGroups: ['internal-team'],
        releaseNotes: {
          [version]: {
            en: 'Beta version with latest features and improvements.',
            ja: '最新機能と改善を含むベータ版です。',
          },
        },
        betaTestingSchedule: {
          maxDuration: 90, // 90日間
        },
        notifications: {
          newBuildAvailable: true,
          feedbackReceived: true,
          crashReports: true,
        },
      },
      reviewSettings: {
        betaAppReview: {
          required: true,
          autoSubmit: false,
          skipWaitingForReview: false,
        },
        appReviewInformation: {
          contactEmail: 'support@ordo-app.com',
          contactPhone: '+81-90-1234-5678',
          demoAccountRequired: false,
          notes: 'AI-powered home inventory management app for beta testing.',
        },
        contentRights: {
          containsThirdPartyContent: true,
          hasContentRightsDeclaration: true,
        },
      },
      betaAppReviewInfo: {
        contactFirstName: 'Test',
        contactLastName: 'User',
        contactPhone: '+81-90-1234-5678',
        contactEmail: 'support@ordo-app.com',
        demoAccountRequired: false,
        reviewNotes: 'This is a beta version of Ordo app for testing purposes.',
      },
      metadata: {
        betaLicenseAgreement: {
          en: 'Beta License Agreement for Ordo App Testing',
          ja: 'Ordoアプリテスト用ベータライセンス契約',
        },
        betaReviewInformation: {
          en: {
            feedbackEmail: 'beta-feedback@ordo-app.com',
            privacyPolicyUrl: 'https://ordo-app.com/privacy',
            description: 'AI-powered home inventory management for efficient household organization.',
          },
          ja: {
            feedbackEmail: 'beta-feedback@ordo-app.com',
            privacyPolicyUrl: 'https://ordo-app.com/privacy-ja',
            description: 'AI搭載の家庭用在庫管理アプリで効率的な家庭運営をサポートします。',
          },
        },
        localizations: {
          en: {
            description: 'AI-powered home inventory management app',
            keywords: ['AI', 'inventory', 'home', 'management', 'organization'],
            releaseNotes: 'Beta version with new features',
            whatsNew: 'Enhanced AI recognition and improved user interface',
          },
          ja: {
            description: 'AI搭載家庭用在庫管理アプリ',
            keywords: ['AI', '在庫管理', '家庭', '管理', '整理'],
            releaseNotes: '新機能を含むベータ版',
            whatsNew: 'AI認識機能の向上とユーザーインターフェースの改善',
          },
        },
      },
    };

    await this.saveConfiguration();
    console.log('📋 Default TestFlight configuration created');
  }

  /**
   * テストグループ作成
   */
  async createTestGroup(
    name: string,
    description: string,
    isInternal: boolean = false,
    maxTesters: number = 100
  ): Promise<TestGroup> {
    if (!this.configuration) {
      throw new Error('TestFlight configuration not initialized');
    }

    const testGroup: TestGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      isInternal,
      maxTesters,
      currentTesters: 0,
      inviteSettings: {
        autoAcceptInvites: isInternal,
        requiresApproval: !isInternal,
        allowFeedback: true,
      },
      testingFeatures: ['core'],
      targetBuilds: ['beta'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.configuration.testGroups.push(testGroup);
    await this.saveConfiguration();

    console.log('👥 Test group created:', name);
    return testGroup;
  }

  /**
   * 内部テスター追加
   */
  async addInternalTester(
    email: string,
    firstName: string,
    lastName: string,
    testGroupIds: string[] = []
  ): Promise<InternalTester> {
    const tester: InternalTester = {
      id: `tester_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      firstName,
      lastName,
      inviteDate: Date.now(),
      inviteState: 'pending',
      testGroups: testGroupIds,
      devices: [],
      feedbackCount: 0,
      crashReports: 0,
      betaVersionsInstalled: [],
    };

    this.testers.push(tester);
    await this.saveTesters();

    // テストグループのテスター数更新
    if (this.configuration) {
      testGroupIds.forEach(groupId => {
        const group = this.configuration!.testGroups.find(g => g.id === groupId);
        if (group) {
          group.currentTesters++;
        }
      });
      await this.saveConfiguration();
    }

    console.log('👤 Internal tester added:', email);
    return tester;
  }

  /**
   * ビルド情報追加
   */
  async addBuild(
    version: string,
    buildNumber: string,
    fileSize: number,
    releaseNotes: Record<string, string>
  ): Promise<TestFlightBuild> {
    const build: TestFlightBuild = {
      id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version,
      buildNumber,
      uploadDate: Date.now(),
      processingState: 'processing',
      reviewState: 'waiting_for_review',
      distributionState: 'ready',
      fileSize,
      minOSVersion: this.configuration?.buildSettings.minOSVersion || '13.0',
      supportedDevices: this.configuration?.buildSettings.supportedDevices || ['iPhone', 'iPad'],
      testingEnabled: false,
      expirationDate: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90日後
      releaseNotes,
      metrics: {
        downloads: 0,
        installations: 0,
        crashes: 0,
        sessions: 0,
      },
    };

    this.builds.push(build);
    await this.saveBuilds();

    console.log('📦 Build added:', `${version} (${buildNumber})`);
    return build;
  }

  /**
   * ビルドステータス更新
   */
  async updateBuildStatus(
    buildId: string,
    processingState?: TestFlightBuild['processingState'],
    reviewState?: TestFlightBuild['reviewState'],
    distributionState?: TestFlightBuild['distributionState']
  ): Promise<void> {
    const build = this.builds.find(b => b.id === buildId);
    if (!build) {
      throw new Error(`Build not found: ${buildId}`);
    }

    if (processingState) {
      build.processingState = processingState;
    }
    if (reviewState) {
      build.reviewState = reviewState;
    }
    if (distributionState) {
      build.distributionState = distributionState;
    }

    // ビルドが承認された場合、テスト配信を有効化
    if (reviewState === 'approved') {
      build.testingEnabled = true;
    }

    await this.saveBuilds();
    console.log('📦 Build status updated:', buildId, { processingState, reviewState, distributionState });
  }

  /**
   * テスター招待
   */
  async inviteTester(testerId: string, buildIds: string[]): Promise<void> {
    const tester = this.testers.find(t => t.id === testerId);
    if (!tester) {
      throw new Error(`Tester not found: ${testerId}`);
    }

    // 実際の実装では App Store Connect API を使用
    console.log(`📤 Inviting tester ${tester.email} to builds:`, buildIds);

    // テスターの状態を招待済みに更新
    tester.inviteState = 'pending';
    await this.saveTesters();
  }

  /**
   * フィードバック記録
   */
  async recordFeedback(testerId: string, buildId: string, feedback: any): Promise<void> {
    const tester = this.testers.find(t => t.id === testerId);
    if (tester) {
      tester.feedbackCount++;
      await this.saveTesters();
    }

    const build = this.builds.find(b => b.id === buildId);
    if (build) {
      // ビルドメトリクス更新は別途実装
    }

    console.log('💬 Feedback recorded:', { testerId, buildId });
  }

  /**
   * クラッシュレポート記録
   */
  async recordCrashReport(testerId: string, buildId: string, crashData: any): Promise<void> {
    const tester = this.testers.find(t => t.id === testerId);
    if (tester) {
      tester.crashReports++;
      await this.saveTesters();
    }

    const build = this.builds.find(b => b.id === buildId);
    if (build) {
      build.metrics.crashes++;
      await this.saveBuilds();
    }

    console.log('💥 Crash report recorded:', { testerId, buildId });
  }

  /**
   * TestFlight分析データ取得
   */
  async getTestFlightAnalytics(): Promise<TestFlightAnalytics> {
    const totalBuilds = this.builds.length;
    const activeBuilds = this.builds.filter(b => b.testingEnabled && b.expirationDate > Date.now()).length;
    const totalTesters = this.testers.length;
    const activeTesters = this.testers.filter(t => t.inviteState === 'accepted').length;

    const totalDownloads = this.builds.reduce((sum, build) => sum + build.metrics.downloads, 0);
    const totalInstallations = this.builds.reduce((sum, build) => sum + build.metrics.installations, 0);
    const totalCrashes = this.builds.reduce((sum, build) => sum + build.metrics.crashes, 0);
    const totalSessions = this.builds.reduce((sum, build) => sum + build.metrics.sessions, 0);

    const crashRate = totalSessions > 0 ? totalCrashes / totalSessions : 0;

    const buildMetrics: { [buildVersion: string]: any } = {};
    this.builds.forEach(build => {
      buildMetrics[build.version] = {
        downloads: build.metrics.downloads,
        installations: build.metrics.installations,
        crashes: build.metrics.crashes,
        sessions: build.metrics.sessions,
        averageRating: 0, // TODO: 評価データを実装
        feedbackCount: 0, // TODO: フィードバック数を実装
      };
    });

    // デバイス分布
    const deviceDistribution: Record<string, number> = {};
    this.testers.forEach(tester => {
      tester.devices.forEach(device => {
        const key = device.model;
        deviceDistribution[key] = (deviceDistribution[key] || 0) + 1;
      });
    });

    // OS分布
    const osDistribution: Record<string, number> = {};
    this.testers.forEach(tester => {
      tester.devices.forEach(device => {
        const key = device.osVersion;
        osDistribution[key] = (osDistribution[key] || 0) + 1;
      });
    });

    return {
      totalBuilds,
      activeBuilds,
      totalTesters,
      activeTesters,
      totalDownloads,
      totalInstallations,
      crashRate,
      averageSessionDuration: 0, // TODO: 実装
      buildMetrics,
      deviceDistribution,
      osDistribution,
      geographicDistribution: {}, // TODO: 実装
    };
  }

  /**
   * Fastlane設定生成
   */
  async generateFastlaneConfig(): Promise<string> {
    if (!this.configuration) {
      throw new Error('TestFlight configuration not initialized');
    }

    const config = `
# Fastfile for Ordo App
default_platform(:ios)

platform :ios do
  before_all do
    setup_circle_ci
    cocoapods(clean_install: true)
  end

  desc "Run tests"
  lane :tests do
    run_tests(
      workspace: "OrdoApp.xcworkspace",
      scheme: "OrdoApp",
      device: "iPhone 15"
    )
  end

  desc "Build for TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "OrdoApp.xcodeproj")
    
    build_app(
      workspace: "OrdoApp.xcworkspace",
      scheme: "OrdoApp",
      configuration: "Beta",
      export_method: "app-store",
      export_options: {
        provisioningProfiles: {
          "${this.configuration.bundleId}.beta" => "match AdHoc ${this.configuration.bundleId}.beta"
        }
      }
    )
    
    upload_to_testflight(
      api_key_path: "fastlane/AuthKey.json",
      team_id: "${this.configuration.appStoreConnectTeamId}",
      groups: ["${this.configuration.testGroups.map(g => g.name).join('", "')}"],
      beta_app_review_info: {
        contact_email: "${this.configuration.betaAppReviewInfo.contactEmail}",
        contact_first_name: "${this.configuration.betaAppReviewInfo.contactFirstName}",
        contact_last_name: "${this.configuration.betaAppReviewInfo.contactLastName}",
        contact_phone: "${this.configuration.betaAppReviewInfo.contactPhone}",
        demo_account_required: ${this.configuration.betaAppReviewInfo.demoAccountRequired},
        notes: "${this.configuration.betaAppReviewInfo.reviewNotes || ''}"
      },
      localized_app_info: {
        "en-US" => {
          feedback_email: "${this.configuration.metadata.betaReviewInformation?.en?.feedbackEmail || ''}",
          marketing_url: "${this.configuration.metadata.betaReviewInformation?.en?.marketingUrl || ''}",
          privacy_policy_url: "${this.configuration.metadata.betaReviewInformation?.en?.privacyPolicyUrl || ''}",
          description: "${this.configuration.metadata.betaReviewInformation?.en?.description || ''}"
        },
        "ja" => {
          feedback_email: "${this.configuration.metadata.betaReviewInformation?.ja?.feedbackEmail || ''}",
          marketing_url: "${this.configuration.metadata.betaReviewInformation?.ja?.marketingUrl || ''}",
          privacy_policy_url: "${this.configuration.metadata.betaReviewInformation?.ja?.privacyPolicyUrl || ''}",
          description: "${this.configuration.metadata.betaReviewInformation?.ja?.description || ''}"
        }
      },
      localized_build_info: {
        "en-US" => {
          whats_new: "${this.configuration.metadata.localizations.en?.whatsNew || ''}"
        },
        "ja" => {
          whats_new: "${this.configuration.metadata.localizations.ja?.whatsNew || ''}"
        }
      }
    )
    
    slack(
      message: "New beta build uploaded to TestFlight! 🚀",
      channel: "#beta-testing"
    )
  end

  desc "Deploy to App Store"
  lane :release do
    build_app(
      workspace: "OrdoApp.xcworkspace",
      scheme: "OrdoApp",
      configuration: "Release"
    )
    
    upload_to_app_store(
      force: true,
      reject_if_possible: true,
      metadata_path: "./fastlane/metadata",
      screenshot_path: "./fastlane/screenshots"
    )
  end

  error do |lane, exception|
    slack(
      message: "Build failed in lane: #{lane} with error: #{exception}",
      success: false,
      channel: "#beta-testing"
    )
  end
end
    `.trim();

    return config;
  }

  // === プライベートメソッド ===

  /**
   * 設定読み込み
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.TESTFLIGHT_CONFIG);
      if (stored) {
        this.configuration = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load TestFlight configuration:', error);
    }
  }

  /**
   * ビルド情報読み込み
   */
  private async loadBuilds(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.BUILDS);
      if (stored) {
        this.builds = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load builds:', error);
    }
  }

  /**
   * テスター情報読み込み
   */
  private async loadTesters(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.TESTERS);
      if (stored) {
        this.testers = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load testers:', error);
    }
  }

  /**
   * 設定保存
   */
  private async saveConfiguration(): Promise<void> {
    if (this.configuration) {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.TESTFLIGHT_CONFIG,
        JSON.stringify(this.configuration)
      );
    }
  }

  /**
   * ビルド情報保存
   */
  private async saveBuilds(): Promise<void> {
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.BUILDS,
      JSON.stringify(this.builds)
    );
  }

  /**
   * テスター情報保存
   */
  private async saveTesters(): Promise<void> {
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.TESTERS,
      JSON.stringify(this.testers)
    );
  }

  // === 公開API ===

  /**
   * 設定取得
   */
  getConfiguration(): TestFlightConfiguration | null {
    return this.configuration;
  }

  /**
   * ビルド一覧取得
   */
  getBuilds(): TestFlightBuild[] {
    return [...this.builds];
  }

  /**
   * テスター一覧取得
   */
  getTesters(): InternalTester[] {
    return [...this.testers];
  }

  /**
   * テストグループ一覧取得
   */
  getTestGroups(): TestGroup[] {
    return this.configuration?.testGroups || [];
  }

  /**
   * 初期化状態確認
   */
  isReady(): boolean {
    return this.isInitialized && !!this.configuration;
  }
}

export const testFlightConfigurationService = new TestFlightConfigurationService();
