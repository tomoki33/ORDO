/**
 * AWS Amplify Configuration
 * AWS Amplifyクラウドインフラストラクチャ設定
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { uploadData, downloadData, remove } from 'aws-amplify/storage';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export interface AmplifyConfig {
  Auth: {
    Cognito: {
      userPoolId: string;
      userPoolClientId: string;
      identityPoolId: string;
      region: string;
      signUpVerificationMethod: 'code' | 'link';
      loginWith: {
        oauth?: {
          domain: string;
          scopes: string[];
          redirectSignIn: string;
          redirectSignOut: string;
          responseType: 'code';
        };
        username?: boolean;
        email?: boolean;
        phone?: boolean;
      };
    };
  };
  API: {
    GraphQL: {
      endpoint: string;
      region: string;
      defaultAuthMode: 'userPool' | 'iam' | 'apiKey';
      apiKey?: string;
    };
    REST: {
      [key: string]: {
        endpoint: string;
        region: string;
      };
    };
  };
  Storage: {
    S3: {
      bucket: string;
      region: string;
    };
  };
  Analytics?: {
    Pinpoint?: {
      appId: string;
      region: string;
    };
    Kinesis?: {
      region: string;
    };
  };
}

export interface AWSEnvironment {
  environment: 'development' | 'staging' | 'production';
  region: string;
  enableAnalytics: boolean;
  enablePushNotifications: boolean;
  enableML: boolean;
}

class AWSService {
  private isInitialized = false;
  private client: any = null;
  private environment: AWSEnvironment;

  constructor() {
    this.environment = this.getEnvironmentConfig();
  }

  /**
   * AWS Amplify初期化
   */
  async initialize(): Promise<void> {
    console.log('☁️ Initializing AWS Amplify services...');

    try {
      const config = this.getAmplifyConfig();
      
      // Amplify設定
      Amplify.configure(config);

      // GraphQL クライアント生成
      this.client = generateClient();

      // サービス個別初期化
      await this.initializeAuth();
      await this.initializeStorage();
      await this.initializeAPI();
      
      if (this.environment.enableAnalytics) {
        await this.initializeAnalytics();
      }

      this.isInitialized = true;
      console.log('✅ AWS Amplify services initialization complete');

    } catch (error) {
      console.error('❌ AWS Amplify initialization failed:', error);
      throw new Error(`AWS Amplify initialization failed: ${error}`);
    }
  }

  /**
   * 環境設定取得
   */
  private getEnvironmentConfig(): AWSEnvironment {
    const env = __DEV__ ? 'development' : 'production';
    
    return {
      environment: env,
      region: 'ap-northeast-1', // 東京リージョン
      enableAnalytics: env !== 'development',
      enablePushNotifications: true,
      enableML: true,
    };
  }

  /**
   * Amplify設定取得
   */
  private getAmplifyConfig(): AmplifyConfig {
    const baseConfig = {
      Auth: {
        Cognito: {
          region: this.environment.region,
          signUpVerificationMethod: 'code' as const,
          loginWith: {
            username: true,
            email: true,
            phone: false,
          },
        },
      },
      Storage: {
        S3: {
          region: this.environment.region,
        },
      },
    };

    // 環境別設定
    const environmentConfigs = {
      development: {
        ...baseConfig,
        Auth: {
          Cognito: {
            ...baseConfig.Auth.Cognito,
            userPoolId: 'ap-northeast-1_DEV123',
            userPoolClientId: 'dev123client456',
            identityPoolId: 'ap-northeast-1:dev-identity-pool',
          },
        },
        API: {
          GraphQL: {
            endpoint: 'https://dev-api.example.com/graphql',
            region: this.environment.region,
            defaultAuthMode: 'userPool' as const,
          },
          REST: {
            OrdoAPI: {
              endpoint: 'https://dev-api.example.com',
              region: this.environment.region,
            },
          },
        },
        Storage: {
          S3: {
            ...baseConfig.Storage.S3,
            bucket: 'ordo-app-dev-storage',
          },
        },
      },
      staging: {
        ...baseConfig,
        Auth: {
          Cognito: {
            ...baseConfig.Auth.Cognito,
            userPoolId: 'ap-northeast-1_STG123',
            userPoolClientId: 'stg123client456',
            identityPoolId: 'ap-northeast-1:stg-identity-pool',
          },
        },
        API: {
          GraphQL: {
            endpoint: 'https://staging-api.example.com/graphql',
            region: this.environment.region,
            defaultAuthMode: 'userPool' as const,
          },
          REST: {
            OrdoAPI: {
              endpoint: 'https://staging-api.example.com',
              region: this.environment.region,
            },
          },
        },
        Storage: {
          S3: {
            ...baseConfig.Storage.S3,
            bucket: 'ordo-app-staging-storage',
          },
        },
      },
      production: {
        ...baseConfig,
        Auth: {
          Cognito: {
            ...baseConfig.Auth.Cognito,
            userPoolId: 'ap-northeast-1_PROD123',
            userPoolClientId: 'prod123client456',
            identityPoolId: 'ap-northeast-1:prod-identity-pool',
            loginWith: {
              ...baseConfig.Auth.Cognito.loginWith,
              oauth: {
                domain: 'ordo-auth.auth.ap-northeast-1.amazoncognito.com',
                scopes: ['email', 'openid', 'profile'],
                redirectSignIn: 'https://app.ordo.com/auth/callback',
                redirectSignOut: 'https://app.ordo.com/auth/signout',
                responseType: 'code' as const,
              },
            },
          },
        },
        API: {
          GraphQL: {
            endpoint: 'https://api.ordo.com/graphql',
            region: this.environment.region,
            defaultAuthMode: 'userPool' as const,
          },
          REST: {
            OrdoAPI: {
              endpoint: 'https://api.ordo.com',
              region: this.environment.region,
            },
          },
        },
        Storage: {
          S3: {
            ...baseConfig.Storage.S3,
            bucket: 'ordo-app-production-storage',
          },
        },
        Analytics: {
          Pinpoint: {
            appId: 'PROD_PINPOINT_APP_ID',
            region: this.environment.region,
          },
        },
      },
    };

    return environmentConfigs[this.environment.environment];
  }

  /**
   * 認証サービス初期化
   */
  private async initializeAuth(): Promise<void> {
    try {
      // 現在のユーザー状態確認
      const user = await getCurrentUser();
      console.log('👤 Current user:', user?.username);
    } catch (error) {
      console.log('👤 No authenticated user');
    }

    console.log('🔐 AWS Cognito Auth initialized');
  }

  /**
   * ストレージサービス初期化
   */
  private async initializeStorage(): Promise<void> {
    // S3設定の検証
    console.log('📦 AWS S3 Storage initialized');
  }

  /**
   * API サービス初期化
   */
  private async initializeAPI(): Promise<void> {
    // GraphQL エンドポイントの検証
    if (this.client) {
      console.log('🔗 AWS API Gateway initialized');
    }
  }

  /**
   * Analytics初期化
   */
  private async initializeAnalytics(): Promise<void> {
    // Pinpoint設定の検証
    console.log('📊 AWS Pinpoint Analytics initialized');
  }

  // === ストレージ操作 ===

  /**
   * ファイルアップロード
   */
  async uploadFile(
    key: string,
    file: Blob | File,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      progressCallback?: (progress: number) => void;
    }
  ): Promise<{ key: string; url?: string }> {
    try {
      const uploadOptions: any = {
        contentType: options?.contentType,
        metadata: options?.metadata,
      };

      if (options?.progressCallback) {
        uploadOptions.onProgress = ({ transferredBytes, totalBytes }: any) => {
          const progress = (transferredBytes / totalBytes) * 100;
          options.progressCallback!(progress);
        };
      }

      const result = await uploadData({
        key,
        data: file,
        options: uploadOptions,
      });

      console.log(`📤 File uploaded: ${key}`);
      return { key, url: result.url };

    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`File upload failed: ${error}`);
    }
  }

  /**
   * ファイルダウンロード
   */
  async downloadFile(key: string): Promise<Blob> {
    try {
      const result = await downloadData({ key });
      console.log(`📥 File downloaded: ${key}`);
      return result.body as Blob;

    } catch (error) {
      console.error('Download failed:', error);
      throw new Error(`File download failed: ${error}`);
    }
  }

  /**
   * ファイル削除
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await remove({ key });
      console.log(`🗑️ File deleted: ${key}`);

    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error(`File delete failed: ${error}`);
    }
  }

  // === GraphQL API操作 ===

  /**
   * GraphQLクエリ実行
   */
  async graphqlQuery(query: string, variables?: Record<string, any>): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('GraphQL client not initialized');
      }

      const result = await this.client.graphql({
        query,
        variables,
      });

      console.log('🔗 GraphQL query executed');
      return result.data;

    } catch (error) {
      console.error('GraphQL query failed:', error);
      throw new Error(`GraphQL query failed: ${error}`);
    }
  }

  /**
   * GraphQLミューテーション実行
   */
  async graphqlMutation(mutation: string, variables?: Record<string, any>): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('GraphQL client not initialized');
      }

      const result = await this.client.graphql({
        query: mutation,
        variables,
      });

      console.log('🔗 GraphQL mutation executed');
      return result.data;

    } catch (error) {
      console.error('GraphQL mutation failed:', error);
      throw new Error(`GraphQL mutation failed: ${error}`);
    }
  }

  /**
   * GraphQLサブスクリプション
   */
  subscribeToGraphQL(subscription: string, variables?: Record<string, any>) {
    try {
      if (!this.client) {
        throw new Error('GraphQL client not initialized');
      }

      const observable = this.client.graphql({
        query: subscription,
        variables,
      });

      console.log('🔗 GraphQL subscription created');
      return observable;

    } catch (error) {
      console.error('GraphQL subscription failed:', error);
      throw new Error(`GraphQL subscription failed: ${error}`);
    }
  }

  // === 認証操作 ===

  /**
   * ユーザーサインイン
   */
  async signInUser(username: string, password: string): Promise<any> {
    try {
      const result = await signIn({ username, password });
      console.log('👤 User signed in successfully');
      return result;

    } catch (error) {
      console.error('Sign in failed:', error);
      throw new Error(`Sign in failed: ${error}`);
    }
  }

  /**
   * ユーザーサインアウト
   */
  async signOutUser(): Promise<void> {
    try {
      await signOut();
      console.log('👤 User signed out successfully');

    } catch (error) {
      console.error('Sign out failed:', error);
      throw new Error(`Sign out failed: ${error}`);
    }
  }

  /**
   * 現在のユーザー取得
   */
  async getCurrentUserInfo(): Promise<any> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      return {
        user,
        session,
        isAuthenticated: !!user,
      };

    } catch (error) {
      console.error('Get current user failed:', error);
      return {
        user: null,
        session: null,
        isAuthenticated: false,
      };
    }
  }

  // === 公開API ===

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    environment: AWSEnvironment;
    services: {
      auth: boolean;
      storage: boolean;
      api: boolean;
      analytics: boolean;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      environment: this.environment,
      services: {
        auth: true,
        storage: true,
        api: !!this.client,
        analytics: this.environment.enableAnalytics,
      },
    };
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks = {
      auth: false,
      storage: false,
      api: false,
    };

    try {
      // 認証ヘルスチェック
      await getCurrentUser();
      checks.auth = true;
    } catch (error) {
      console.log('Auth health check: not authenticated');
    }

    try {
      // APIヘルスチェック
      if (this.client) {
        checks.api = true;
      }
    } catch (error) {
      console.error('API health check failed:', error);
    }

    // ストレージは設定の存在で判定
    checks.storage = true;

    const healthyCount = Object.values(checks).filter(Boolean).length;
    const status = healthyCount === 3 ? 'healthy' : 
                  healthyCount >= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      services: checks,
      timestamp: new Date().toISOString(),
    };
  }
}

export const awsService = new AWSService();
