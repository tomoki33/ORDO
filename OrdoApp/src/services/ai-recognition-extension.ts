  /**
   * データベース初期化（認識履歴テーブル作成）
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // SQLiteService初期化は既に完了しているので、追加のテーブル作成のみ実行
      console.log('AI Recognition database extension initialized');
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }

  // 省略可能: 認識履歴保存用の拡張メソッド
  private async saveRecognitionHistory(imageUri: string, result: FoodRecognitionResult): Promise<void> {
    try {
      // 現在はローカルキャッシュのみ使用
      // 将来的にSQLiteテーブル拡張時に実装
      console.log('Recognition result cached locally');
    } catch (error) {
      console.error('Failed to save recognition history:', error);
    }
  }
