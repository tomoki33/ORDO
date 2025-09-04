/**
 * SQLite データベースサービス
 * React Native SQLite Storage を使用したデータ永続化層
 */

import SQLite, { DatabaseParams, Transaction, SQLError } from 'react-native-sqlite-storage';
import { Product, User, UserPreferences } from '../types';
import { DebugUtils } from '../utils';

// SQLite設定
SQLite.DEBUG(false);
SQLite.enablePromise(true);

export interface DatabaseConfig {
  name: string;
  version: string;
  displayName: string;
  size: number;
}

export const DATABASE_CONFIG: DatabaseConfig = {
  name: 'ordo_app.db',
  version: '1.0',
  displayName: 'Ordo App Database',
  size: 5 * 1024 * 1024, // 5MB
};

/**
 * SQLite Database Service
 * 商品データとユーザー設定の永続化を管理
 */
export class SQLiteService {
  private static instance: SQLiteService;
  private database: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  /**
   * データベース初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      DebugUtils.time('Database Initialize');
      
      this.database = await SQLite.openDatabase({
        name: DATABASE_CONFIG.name,
        location: 'default',
      });

      await this.createTables();
      await this.runMigrations();
      
      this.isInitialized = true;
      DebugUtils.log('SQLite database initialized successfully');
      
    } catch (error) {
      DebugUtils.error('Failed to initialize database', error as Error);
      throw error;
    } finally {
      DebugUtils.timeEnd('Database Initialize');
    }
  }

  /**
   * テーブル作成
   */
  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const queries = [
      // 商品テーブル
      `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        expiration_date TEXT NOT NULL,
        added_date TEXT NOT NULL,
        location TEXT NOT NULL,
        quantity INTEGER,
        unit TEXT,
        brand TEXT,
        barcode TEXT,
        image_uri TEXT,
        notes TEXT,
        confidence REAL,
        ai_recognized INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
      `,
      // ユーザー設定テーブル
      `
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        notifications INTEGER DEFAULT 1,
        expiration_warning_days INTEGER DEFAULT 3,
        default_location TEXT DEFAULT 'fridge',
        theme TEXT DEFAULT 'light',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
      `,
      // AI認識キャッシュテーブル
      `
      CREATE TABLE IF NOT EXISTS ai_recognition_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_hash TEXT UNIQUE NOT NULL,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence REAL NOT NULL,
        expiration_days INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
      `,
      // 通知履歴テーブル
      `
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
      `,
    ];

    // インデックス作成
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_expiration ON products (expiration_date)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)',
      'CREATE INDEX IF NOT EXISTS idx_products_location ON products (location)',
      'CREATE INDEX IF NOT EXISTS idx_products_added_date ON products (added_date)',
      'CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_recognition_cache (image_hash)',
      'CREATE INDEX IF NOT EXISTS idx_notification_product ON notification_history (product_id)',
    ];

    try {
      // テーブル作成
      for (const query of queries) {
        await this.database.executeSql(query);
      }

      // インデックス作成
      for (const index of indexes) {
        await this.database.executeSql(index);
      }

      DebugUtils.log('Database tables and indexes created successfully');
    } catch (error) {
      DebugUtils.error('Failed to create database tables', error as Error);
      throw error;
    }
  }

  /**
   * データベースマイグレーション
   */
  private async runMigrations(): Promise<void> {
    // 将来のスキーマ変更時にマイグレーション処理を実装
    // 現在はバージョン1.0なので何もしない
    DebugUtils.log('Database migrations completed');
  }

  /**
   * 商品データの挿入
   */
  public async insertProduct(product: Product): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const query = `
      INSERT INTO products (
        id, name, category, expiration_date, added_date, location,
        quantity, unit, brand, barcode, image_uri, notes, confidence, ai_recognized
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      product.id,
      product.name,
      product.category,
      product.expirationDate.toISOString(),
      product.addedDate.toISOString(),
      product.location,
      product.quantity || null,
      product.unit || null,
      product.brand || null,
      product.barcode || null,
      product.imageUri || null,
      product.notes || null,
      product.confidence || null,
      product.aiRecognized ? 1 : 0,
    ];

    try {
      await this.database.executeSql(query, params);
      DebugUtils.log('Product inserted successfully', product.id);
    } catch (error) {
      DebugUtils.error('Failed to insert product', error as Error);
      throw error;
    }
  }

  /**
   * 商品データの更新
   */
  public async updateProduct(product: Product): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const query = `
      UPDATE products SET
        name = ?, category = ?, expiration_date = ?, location = ?,
        quantity = ?, unit = ?, brand = ?, barcode = ?, image_uri = ?,
        notes = ?, confidence = ?, ai_recognized = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      product.name,
      product.category,
      product.expirationDate.toISOString(),
      product.location,
      product.quantity || null,
      product.unit || null,
      product.brand || null,
      product.barcode || null,
      product.imageUri || null,
      product.notes || null,
      product.confidence || null,
      product.aiRecognized ? 1 : 0,
      product.id,
    ];

    try {
      const result = await this.database.executeSql(query, params);
      if (result[0].rowsAffected === 0) {
        throw new Error(`Product with ID ${product.id} not found`);
      }
      DebugUtils.log('Product updated successfully', product.id);
    } catch (error) {
      DebugUtils.error('Failed to update product', error as Error);
      throw error;
    }
  }

  /**
   * 商品データの削除
   */
  public async deleteProduct(productId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // 関連する通知履歴も削除
      await this.database.executeSql(
        'DELETE FROM notification_history WHERE product_id = ?',
        [productId]
      );

      // 商品データを削除
      const result = await this.database.executeSql(
        'DELETE FROM products WHERE id = ?',
        [productId]
      );

      if (result[0].rowsAffected === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      DebugUtils.log('Product deleted successfully', productId);
    } catch (error) {
      DebugUtils.error('Failed to delete product', error as Error);
      throw error;
    }
  }

  /**
   * 全商品データの取得
   */
  public async getAllProducts(): Promise<Product[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.executeSql(
        'SELECT * FROM products ORDER BY added_date DESC'
      );

      const products: Product[] = [];
      const rows = result[0].rows;

      for (let i = 0; i < rows.length; i++) {
        const row = rows.item(i);
        products.push(this.mapRowToProduct(row));
      }

      DebugUtils.log('Products loaded from database', products.length);
      return products;
    } catch (error) {
      DebugUtils.error('Failed to load products', error as Error);
      throw error;
    }
  }

  /**
   * 条件付き商品検索
   */
  public async searchProducts(filters: {
    category?: string;
    location?: string;
    expiringInDays?: number;
    searchTerm?: string;
  }): Promise<Product[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    // カテゴリフィルター
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    // 場所フィルター
    if (filters.location) {
      query += ' AND location = ?';
      params.push(filters.location);
    }

    // 期限切れ間近フィルター
    if (filters.expiringInDays !== undefined) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringInDays);
      query += ' AND expiration_date <= ?';
      params.push(futureDate.toISOString());
    }

    // 商品名検索
    if (filters.searchTerm) {
      query += ' AND (name LIKE ? OR brand LIKE ?)';
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY expiration_date ASC';

    try {
      const result = await this.database.executeSql(query, params);
      const products: Product[] = [];
      const rows = result[0].rows;

      for (let i = 0; i < rows.length; i++) {
        const row = rows.item(i);
        products.push(this.mapRowToProduct(row));
      }

      return products;
    } catch (error) {
      DebugUtils.error('Failed to search products', error as Error);
      throw error;
    }
  }

  /**
   * ユーザー設定の保存
   */
  public async saveUserSettings(settings: UserPreferences): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const query = `
      INSERT OR REPLACE INTO user_settings (
        id, notifications, expiration_warning_days, default_location, theme, updated_at
      ) VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const params = [
      settings.notifications ? 1 : 0,
      settings.expirationWarningDays,
      settings.defaultLocation,
      settings.theme,
    ];

    try {
      await this.database.executeSql(query, params);
      DebugUtils.log('User settings saved successfully');
    } catch (error) {
      DebugUtils.error('Failed to save user settings', error as Error);
      throw error;
    }
  }

  /**
   * ユーザー設定の読み込み
   */
  public async loadUserSettings(): Promise<UserPreferences | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.executeSql(
        'SELECT * FROM user_settings WHERE id = 1'
      );

      if (result[0].rows.length === 0) {
        return null;
      }

      const row = result[0].rows.item(0);
      return {
        notifications: row.notifications === 1,
        expirationWarningDays: row.expiration_warning_days,
        defaultLocation: row.default_location,
        theme: row.theme,
      };
    } catch (error) {
      DebugUtils.error('Failed to load user settings', error as Error);
      throw error;
    }
  }

  /**
   * データベースクリーンアップ（期限切れ商品の削除等）
   */
  public async cleanup(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // 30日以上経過した期限切れ商品を削除
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      await this.database.executeSql(
        'DELETE FROM products WHERE expiration_date < ?',
        [cutoffDate.toISOString()]
      );

      // 古い通知履歴を削除（90日以上前）
      const notificationCutoff = new Date();
      notificationCutoff.setDate(notificationCutoff.getDate() - 90);

      await this.database.executeSql(
        'DELETE FROM notification_history WHERE sent_at < ?',
        [notificationCutoff.toISOString()]
      );

      DebugUtils.log('Database cleanup completed');
    } catch (error) {
      DebugUtils.error('Failed to cleanup database', error as Error);
      throw error;
    }
  }

  /**
   * データベース行から商品オブジェクトへの変換
   */
  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      expirationDate: new Date(row.expiration_date),
      addedDate: new Date(row.added_date),
      location: row.location,
      quantity: row.quantity,
      unit: row.unit,
      brand: row.brand,
      barcode: row.barcode,
      imageUri: row.image_uri,
      notes: row.notes,
      confidence: row.confidence,
      aiRecognized: row.ai_recognized === 1,
    };
  }

  /**
   * 通知履歴を追加
   */
  public async addNotificationHistory(notification: {
    type: string;
    title: string;
    message: string;
    productId: string | null;
    scheduledAt: Date;
    sentAt: Date | null;
    status: string;
  }): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        `INSERT INTO notification_history 
         (type, title, message, product_id, scheduled_at, sent_at, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          notification.type,
          notification.title,
          notification.message,
          notification.productId,
          notification.scheduledAt.toISOString(),
          notification.sentAt ? notification.sentAt.toISOString() : null,
          notification.status,
        ]
      );
      DebugUtils.log('Notification history added successfully');
    } catch (error) {
      DebugUtils.error('Failed to add notification history', error as Error);
      throw error;
    }
  }

  /**
   * 通知履歴を取得
   */
  public async getNotificationHistory(limit: number = 50): Promise<any[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.executeSql(
        `SELECT * FROM notification_history 
         ORDER BY scheduled_at DESC 
         LIMIT ?`,
        [limit]
      );

      const notifications: any[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        notifications.push({
          ...row,
          scheduledAt: new Date(row.scheduled_at),
          sentAt: row.sent_at ? new Date(row.sent_at) : null,
        });
      }
      return notifications;
    } catch (error) {
      DebugUtils.error('Failed to get notification history', error as Error);
      throw error;
    }
  }

  /**
   * 通知ステータスを更新
   */
  public async updateNotificationStatus(notificationId: string, status: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(
        `UPDATE notification_history 
         SET status = ?, sent_at = ? 
         WHERE id = ?`,
        [status, new Date().toISOString(), notificationId]
      );
      DebugUtils.log('Notification status updated successfully');
    } catch (error) {
      DebugUtils.error('Failed to update notification status', error as Error);
      throw error;
    }
  }

  /**
   * データベース接続を閉じる
   */
  public async close(): Promise<void> {
    if (this.database) {
      try {
        await this.database.close();
        this.database = null;
        this.isInitialized = false;
        DebugUtils.log('Database connection closed');
      } catch (error) {
        DebugUtils.error('Failed to close database', error as Error);
        throw error;
      }
    }
  }
}

// シングルトンインスタンスをエクスポート
export const sqliteService = SQLiteService.getInstance();
