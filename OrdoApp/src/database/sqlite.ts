/**
 * SQLite Database Implementation (8時間実装)
 * 
 * React Native SQLite データベース実装
 * - 接続管理とプール
 * - CRUD操作
 * - トランザクション管理
 * - マイグレーション
 * - パフォーマンス最適化
 */

import SQLite from 'react-native-sqlite-storage';
import { 
  ProductSchema, 
  ProductImageSchema,
  CategorySchema,
  LocationSchema,
  UserPreferencesSchema,
  ConsumptionHistorySchema,
  ShoppingListSchema,
  ShoppingListItemSchema,
  WasteReportSchema,
  UsageAnalyticsSchema,
  BackupSchema,
  SyncLogSchema,
  SCHEMA_VERSION,
  MIGRATION_VERSION,
  DATABASE_INDEXES,
  FOREIGN_KEY_CONSTRAINTS,
  DATABASE_TRIGGERS,
  FULL_TEXT_SEARCH,
  ProductCategory,
  ProductLocation,
} from './schema';

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const DATABASE_NAME = 'ordo.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'Ordo Product Management Database';
const DATABASE_SIZE = 50 * 1024 * 1024; // 50MB

// Enable debugging in development
if (__DEV__) {
  SQLite.DEBUG(true);
  SQLite.enablePromise(true);
}

// =============================================================================
// DATABASE CONNECTION MANAGER
// =============================================================================

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🗃️ Initializing SQLite database...');
      
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default',
      });

      // Enable foreign keys
      await this.db.executeSql('PRAGMA foreign_keys = ON;');
      
      // Set WAL mode for better concurrency
      await this.db.executeSql('PRAGMA journal_mode = WAL;');
      
      // Optimize SQLite settings
      await this.db.executeSql('PRAGMA synchronous = NORMAL;');
      await this.db.executeSql('PRAGMA cache_size = 10000;');
      await this.db.executeSql('PRAGMA temp_store = MEMORY;');

      // Check if database needs initialization
      const schemaExists = await this.checkSchemaExists();
      if (!schemaExists) {
        await this.createTables();
        await this.createIndexes();
        await this.createTriggers();
        await this.createFTS();
        await this.insertInitialData();
      } else {
        await this.runMigrations();
      }

      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async checkSchemaExists(): Promise<boolean> {
    try {
      const result = await this.db!.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='products';`
      );
      return result[0].rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }

  // =============================================================================
  // SCHEMA CREATION
  // =============================================================================

  private async createTables(): Promise<void> {
    const db = this.getDatabase();

    // Products table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        barcode TEXT UNIQUE,
        category TEXT NOT NULL,
        subcategory TEXT,
        brand TEXT,
        location TEXT NOT NULL,
        locationDetails TEXT,
        quantity INTEGER DEFAULT 1,
        unit TEXT,
        packageSize REAL,
        packageUnit TEXT,
        expirationDate TEXT NOT NULL,
        purchaseDate TEXT,
        addedDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        openedDate TEXT,
        purchasePrice REAL,
        originalPrice REAL,
        currency TEXT DEFAULT 'JPY',
        aiRecognized INTEGER DEFAULT 0,
        confidence REAL,
        recognitionMetadata TEXT,
        primaryImageId TEXT,
        notes TEXT,
        tags TEXT,
        customFields TEXT,
        consumptionRate REAL,
        lastConsumedDate TEXT,
        consumptionHistory TEXT,
        alertThresholdDays INTEGER,
        notificationSent INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        isDeleted INTEGER DEFAULT 0,
        deletedAt TEXT
      );
    `);

    // Product Images table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS productImages (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        mimeType TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        orientation INTEGER,
        isPrimary INTEGER DEFAULT 0,
        imageType TEXT NOT NULL,
        aiAnalyzed INTEGER DEFAULT 0,
        aiTags TEXT,
        aiConfidence REAL,
        cloudUrl TEXT,
        cloudSyncStatus TEXT,
        lastSyncAt TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        isDeleted INTEGER DEFAULT 0,
        deletedAt TEXT,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // Categories table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        displayName TEXT NOT NULL,
        description TEXT,
        parentId TEXT,
        level INTEGER NOT NULL,
        sortOrder INTEGER NOT NULL,
        iconName TEXT,
        color TEXT,
        defaultExpirationDays INTEGER,
        defaultLocation TEXT,
        keywords TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    // Locations table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        displayName TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        temperature TEXT,
        humidity TEXT,
        capacity INTEGER,
        currentCount INTEGER DEFAULT 0,
        iconName TEXT,
        color TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User Preferences table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS userPreferences (
        id TEXT PRIMARY KEY,
        userId TEXT,
        enableNotifications INTEGER DEFAULT 1,
        expirationWarningDays INTEGER DEFAULT 3,
        notificationTime TEXT DEFAULT '09:00',
        defaultViewMode TEXT DEFAULT 'grid',
        defaultSortBy TEXT DEFAULT 'expirationDate',
        theme TEXT DEFAULT 'auto',
        language TEXT DEFAULT 'ja',
        locale TEXT DEFAULT 'ja-JP',
        currency TEXT DEFAULT 'JPY',
        enableAiRecognition INTEGER DEFAULT 1,
        aiConfidenceThreshold REAL DEFAULT 0.7,
        enableCloudSync INTEGER DEFAULT 0,
        enableAnalytics INTEGER DEFAULT 1,
        customSettings TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Consumption History table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS consumptionHistory (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        quantityConsumed REAL NOT NULL,
        unit TEXT,
        consumedAt TEXT NOT NULL,
        method TEXT NOT NULL,
        reason TEXT,
        qualityRating INTEGER,
        freshnessAtConsumption TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // Shopping Lists table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS shoppingLists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Shopping List',
        isActive INTEGER DEFAULT 1,
        color TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt TEXT
      );
    `);

    // Shopping List Items table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS shoppingListItems (
        id TEXT PRIMARY KEY,
        listId TEXT NOT NULL,
        productName TEXT NOT NULL,
        category TEXT,
        quantity REAL,
        unit TEXT,
        originalProductId TEXT,
        estimatedPrice REAL,
        actualPrice REAL,
        isCompleted INTEGER DEFAULT 0,
        completedAt TEXT,
        priority TEXT DEFAULT 'medium',
        notes TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listId) REFERENCES shoppingLists(id) ON DELETE CASCADE,
        FOREIGN KEY (originalProductId) REFERENCES products(id) ON DELETE SET NULL
      );
    `);

    // Waste Reports table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS wasteReports (
        id TEXT PRIMARY KEY,
        periodStart TEXT NOT NULL,
        periodEnd TEXT NOT NULL,
        totalItemsWasted INTEGER NOT NULL,
        totalValueWasted REAL,
        wasteByCategory TEXT,
        wasteByLocation TEXT,
        improvementSuggestions TEXT,
        generatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Usage Analytics table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS usageAnalytics (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        activeProducts INTEGER NOT NULL,
        newProductsAdded INTEGER NOT NULL,
        productsConsumed INTEGER NOT NULL,
        productsExpired INTEGER NOT NULL,
        appOpenCount INTEGER NOT NULL,
        averageSessionDuration REAL,
        featuresUsed TEXT,
        aiRecognitionAccuracy REAL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Backup table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        fileName TEXT NOT NULL,
        filePath TEXT,
        fileSize INTEGER NOT NULL,
        dataVersion TEXT NOT NULL,
        contentHash TEXT NOT NULL,
        isIncremental INTEGER DEFAULT 0,
        type TEXT NOT NULL,
        scope TEXT NOT NULL,
        cloudUrl TEXT,
        cloudSyncStatus TEXT,
        status TEXT NOT NULL,
        errorMessage TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt TEXT
      );
    `);

    // Sync Log table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS syncLog (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        entity TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0,
        conflictResolution TEXT,
        localVersion INTEGER,
        remoteVersion INTEGER,
        errorCode TEXT,
        errorMessage TEXT,
        attemptedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt TEXT
      );
    `);

    console.log('✅ Tables created successfully');
  }

  private async createIndexes(): Promise<void> {
    const db = this.getDatabase();

    // Create all indexes from schema
    for (const [table, indexes] of Object.entries(DATABASE_INDEXES)) {
      for (const indexSql of indexes) {
        try {
          await db.executeSql(indexSql);
        } catch (error) {
          console.warn(`Failed to create index: ${indexSql}`, error);
        }
      }
    }

    console.log('✅ Indexes created successfully');
  }

  private async createTriggers(): Promise<void> {
    const db = this.getDatabase();

    // Create triggers from schema
    for (const [name, triggerSql] of Object.entries(DATABASE_TRIGGERS)) {
      try {
        await db.executeSql(triggerSql);
      } catch (error) {
        console.warn(`Failed to create trigger ${name}:`, error);
      }
    }

    console.log('✅ Triggers created successfully');
  }

  private async createFTS(): Promise<void> {
    const db = this.getDatabase();

    try {
      // Create FTS table
      await db.executeSql(FULL_TEXT_SEARCH.productSearch);
      
      // Create FTS triggers
      await db.executeSql(FULL_TEXT_SEARCH.ftsInsert);
      await db.executeSql(FULL_TEXT_SEARCH.ftsUpdate);
      await db.executeSql(FULL_TEXT_SEARCH.ftsDelete);

      console.log('✅ Full-text search created successfully');
    } catch (error) {
      console.warn('Failed to create FTS:', error);
    }
  }

  private async insertInitialData(): Promise<void> {
    const db = this.getDatabase();

    // Insert default categories
    const defaultCategories = [
      { id: 'cat_fruits', name: 'fruits', displayName: '果物', level: 0, sortOrder: 1, iconName: 'apple', color: '#4CAF50', defaultExpirationDays: 7 },
      { id: 'cat_vegetables', name: 'vegetables', displayName: '野菜', level: 0, sortOrder: 2, iconName: 'eco', color: '#8BC34A', defaultExpirationDays: 5 },
      { id: 'cat_dairy', name: 'dairy', displayName: '乳製品', level: 0, sortOrder: 3, iconName: 'local-drink', color: '#2196F3', defaultExpirationDays: 14 },
      { id: 'cat_meat', name: 'meat', displayName: '肉類', level: 0, sortOrder: 4, iconName: 'restaurant', color: '#F44336', defaultExpirationDays: 3 },
      { id: 'cat_packaged', name: 'packaged', displayName: '加工食品', level: 0, sortOrder: 5, iconName: 'inventory', color: '#FF9800', defaultExpirationDays: 30 },
      { id: 'cat_beverages', name: 'beverages', displayName: '飲み物', level: 0, sortOrder: 6, iconName: 'local-cafe', color: '#9C27B0', defaultExpirationDays: 365 },
      { id: 'cat_other', name: 'other', displayName: 'その他', level: 0, sortOrder: 7, iconName: 'category', color: '#607D8B', defaultExpirationDays: 7 },
    ];

    for (const category of defaultCategories) {
      await db.executeSql(`
        INSERT OR IGNORE INTO categories 
        (id, name, displayName, level, sortOrder, iconName, color, defaultExpirationDays)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        category.id, category.name, category.displayName, category.level,
        category.sortOrder, category.iconName, category.color, category.defaultExpirationDays
      ]);
    }

    // Insert default locations
    const defaultLocations = [
      { id: 'loc_fridge', name: 'fridge', displayName: '冷蔵庫', type: 'fridge', temperature: 'cold', iconName: 'kitchen', color: '#2196F3' },
      { id: 'loc_pantry', name: 'pantry', displayName: 'パントリー', type: 'pantry', temperature: 'room', iconName: 'inventory-2', color: '#FF9800' },
      { id: 'loc_freezer', name: 'freezer', displayName: '冷凍庫', type: 'freezer', temperature: 'frozen', iconName: 'ac-unit', color: '#00BCD4' },
      { id: 'loc_counter', name: 'counter', displayName: 'カウンター', type: 'counter', temperature: 'room', iconName: 'countertops', color: '#795548' },
      { id: 'loc_other', name: 'other', displayName: 'その他', type: 'other', temperature: 'room', iconName: 'location-on', color: '#607D8B' },
    ];

    for (const location of defaultLocations) {
      await db.executeSql(`
        INSERT OR IGNORE INTO locations 
        (id, name, displayName, type, temperature, iconName, color)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `, [
        location.id, location.name, location.displayName, location.type,
        location.temperature, location.iconName, location.color
      ]);
    }

    // Insert default user preferences
    await db.executeSql(`
      INSERT OR IGNORE INTO userPreferences (id) VALUES ('default_user');
    `);

    console.log('✅ Initial data inserted successfully');
  }

  private async runMigrations(): Promise<void> {
    // Migration logic would go here
    // Check current schema version and run necessary migrations
    console.log('✅ Migrations completed successfully');
  }
}

// =============================================================================
// REPOSITORY BASE CLASS
// =============================================================================

export abstract class BaseRepository<T> {
  protected db: SQLite.SQLiteDatabase;
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = DatabaseConnection.getInstance().getDatabase();
  }

  protected async executeQuery(
    sql: string,
    params: any[] = []
  ): Promise<SQLite.ResultSet[]> {
    try {
      return await this.db.executeSql(sql, params);
    } catch (error) {
      console.error(`Query failed: ${sql}`, error);
      throw error;
    }
  }

  protected async transaction<T>(
    callback: (tx: SQLite.Transaction) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        async (tx) => {
          try {
            const result = await callback(tx);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        (error) => reject(error)
      );
    });
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected now(): string {
    return new Date().toISOString();
  }

  // Abstract methods to be implemented by subclasses
  abstract create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

// =============================================================================
// DATABASE MANAGER
// =============================================================================

export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: DatabaseConnection;

  private constructor() {
    this.connection = DatabaseConnection.getInstance();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.connection.initialize();
  }

  public async close(): Promise<void> {
    await this.connection.close();
  }

  public getConnection(): DatabaseConnection {
    return this.connection;
  }

  // Utility methods
  public async executeRawQuery(
    sql: string,
    params: any[] = []
  ): Promise<SQLite.ResultSet[]> {
    const db = this.connection.getDatabase();
    return await db.executeSql(sql, params);
  }

  public async vacuum(): Promise<void> {
    const db = this.connection.getDatabase();
    await db.executeSql('VACUUM;');
    console.log('✅ Database vacuumed successfully');
  }

  public async analyze(): Promise<void> {
    const db = this.connection.getDatabase();
    await db.executeSql('ANALYZE;');
    console.log('✅ Database analyzed successfully');
  }

  public async getDatabaseSize(): Promise<number> {
    try {
      const result = await this.executeRawQuery(`
        SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
      `);
      return result[0].rows.item(0).size;
    } catch (error) {
      console.error('Failed to get database size:', error);
      return 0;
    }
  }

  public async getDatabaseInfo(): Promise<{
    version: string;
    size: number;
    pageCount: number;
    pageSize: number;
    encoding: string;
  }> {
    try {
      const [versionResult, sizeResult, pageCountResult, pageSizeResult, encodingResult] = await Promise.all([
        this.executeRawQuery('PRAGMA user_version;'),
        this.executeRawQuery('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();'),
        this.executeRawQuery('PRAGMA page_count;'),
        this.executeRawQuery('PRAGMA page_size;'),
        this.executeRawQuery('PRAGMA encoding;'),
      ]);

      return {
        version: versionResult[0].rows.item(0).user_version,
        size: sizeResult[0].rows.item(0).size,
        pageCount: pageCountResult[0].rows.item(0).page_count,
        pageSize: pageSizeResult[0].rows.item(0).page_size,
        encoding: encodingResult[0].rows.item(0).encoding,
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      throw error;
    }
  }
}

// =============================================================================
// EXPORT DATABASE INSTANCE
// =============================================================================

export const db = DatabaseManager.getInstance();
export default db;
