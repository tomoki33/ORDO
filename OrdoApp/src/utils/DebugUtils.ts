/**
 * デバッグユーティリティクラス
 * 開発時のログ出力とデバッグ情報の管理
 */
export class DebugUtils {
  private static isDebugMode = __DEV__ || false;

  /**
   * デバッグログを出力
   */
  public static log(...args: any[]): void {
    if (this.isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * エラーログを出力
   */
  public static error(...args: any[]): void {
    if (this.isDebugMode) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * 警告ログを出力
   */
  public static warn(...args: any[]): void {
    if (this.isDebugMode) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * 情報ログを出力
   */
  public static info(...args: any[]): void {
    if (this.isDebugMode) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * オブジェクトの内容を詳細に出力
   */
  public static dump(obj: any, label?: string): void {
    if (this.isDebugMode) {
      if (label) {
        console.log(`[DEBUG] ${label}:`, JSON.stringify(obj, null, 2));
      } else {
        console.log('[DEBUG] Object:', JSON.stringify(obj, null, 2));
      }
    }
  }

  private static timers: Map<string, number> = new Map();

  /**
   * 実行時間を測定
   */
  public static time(label: string): void {
    if (this.isDebugMode) {
      this.timers.set(label, Date.now());
      this.log(`[TIMER] Started: ${label}`);
    }
  }

  /**
   * 実行時間を終了して出力
   */
  public static timeEnd(label: string): void {
    if (this.isDebugMode) {
      const startTime = this.timers.get(label);
      if (startTime) {
        const duration = Date.now() - startTime;
        this.log(`[TIMER] ${label}: ${duration}ms`);
        this.timers.delete(label);
      }
    }
  }

  /**
   * デバッグモードの設定
   */
  public static setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
  }

  /**
   * デバッグモードの状態を取得
   */
  public static isDebugEnabled(): boolean {
    return this.isDebugMode;
  }

  /**
   * アプリの情報をログ出力
   */
  public static logAppInfo(appName: string, version: string): void {
    this.log(`=== ${appName} v${version} ===`);
    this.log(`Debug Mode: ${this.isDebugMode}`);
    this.log(`Platform: ${require('react-native').Platform.OS}`);
  }

  /**
   * エラーをフォーマットして出力
   */
  public static logError(error: Error, context?: string): void {
    if (context) {
      this.error(`[${context}] Error:`, error.message);
    } else {
      this.error('Error:', error.message);
    }
    
    if (error.stack) {
      this.error('Stack trace:', error.stack);
    }
  }

  /**
   * パフォーマンス測定開始
   */
  public static startPerformanceLog(operation: string): number {
    if (this.isDebugMode) {
      const startTime = Date.now();
      this.log(`Starting operation: ${operation}`);
      return startTime;
    }
    return 0;
  }

  /**
   * パフォーマンス測定終了
   */
  public static endPerformanceLog(operation: string, startTime: number): void {
    if (this.isDebugMode && startTime > 0) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.log(`Completed operation: ${operation} (${duration}ms)`);
    }
  }
}
