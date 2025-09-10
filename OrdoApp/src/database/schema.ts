/**
 * Database Schema Design (4時間実装)
 * 
 * Ordo App データベーススキーマ設計
 * - リレーショナルデータモデル
 * - インデックス最適化
 * - データ整合性制約
 * - バージョン管理
 * - パフォーマンス最適化
 */

// =============================================================================
// SCHEMA VERSION MANAGEMENT
// =============================================================================

// =============================================================================
// TYPE IMPORTS & DEFINITIONS
// =============================================================================

// Base types for database schema
export type ProductCategory = 
  | 'fruits'
  | 'vegetables'
  | 'dairy'
  | 'meat'
  | 'packaged'
  | 'beverages'
  | 'other';

export type ProductLocation = 
  | 'fridge'
  | 'pantry'
  | 'freezer'
  | 'counter'
  | 'other';

export const SCHEMA_VERSION = '1.0.0';
export const MIGRATION_VERSION = 1;

export interface SchemaVersion {
  version: string;
  migrationVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CORE PRODUCT SCHEMA
// =============================================================================

export interface ProductSchema {
  // Primary key
  id: string; // UUID
  
  // Basic information
  name: string; // NOT NULL, INDEX
  description?: string;
  barcode?: string; // UNIQUE INDEX
  
  // Categorization
  category: ProductCategory; // NOT NULL, INDEX
  subcategory?: string;
  brand?: string; // INDEX
  
  // Location & Storage
  location: ProductLocation; // NOT NULL, INDEX
  locationDetails?: string; // specific shelf, drawer, etc.
  
  // Quantities & Units
  quantity?: number; // DEFAULT 1
  unit?: string; // pieces, kg, ml, etc.
  packageSize?: number;
  packageUnit?: string;
  
  // Dates & Lifecycle
  expirationDate: Date; // NOT NULL, INDEX (for freshness queries)
  purchaseDate?: Date; // INDEX
  addedDate: Date; // NOT NULL, DEFAULT CURRENT_TIMESTAMP, INDEX
  openedDate?: Date;
  
  // Pricing & Economics
  purchasePrice?: number;
  originalPrice?: number;
  currency?: string; // DEFAULT 'JPY'
  
  // AI & Recognition
  aiRecognized?: boolean; // DEFAULT false, INDEX
  confidence?: number; // 0.0 to 1.0
  recognitionMetadata?: string; // JSON serialized
  
  // Images & Media
  primaryImageId?: string; // Foreign key to ProductImage
  
  // Notes & Custom Data
  notes?: string; // Full-text search
  tags?: string; // Comma-separated, INDEX
  customFields?: string; // JSON serialized
  
  // Consumption tracking
  consumptionRate?: number; // items per day
  lastConsumedDate?: Date;
  consumptionHistory?: string; // JSON serialized
  
  // Alerts & Notifications
  alertThresholdDays?: number; // Days before expiration to alert
  notificationSent?: boolean; // DEFAULT false
  
  // Metadata
  createdAt: Date; // NOT NULL, DEFAULT CURRENT_TIMESTAMP
  updatedAt: Date; // NOT NULL, DEFAULT CURRENT_TIMESTAMP
  version: number; // For optimistic locking, DEFAULT 1
  isDeleted?: boolean; // Soft delete, DEFAULT false, INDEX
  deletedAt?: Date;
}

// =============================================================================
// PRODUCT IMAGES SCHEMA
// =============================================================================

export interface ProductImageSchema {
  id: string; // UUID, PRIMARY KEY
  productId: string; // Foreign key to Product, NOT NULL, INDEX
  
  // Image metadata
  fileName: string; // Original filename
  filePath: string; // Local storage path
  fileSize: number; // Bytes
  mimeType: string; // image/jpeg, image/png, etc.
  
  // Image properties
  width: number;
  height: number;
  orientation?: number; // EXIF orientation
  
  // Image classification
  isPrimary: boolean; // DEFAULT false, INDEX
  imageType: 'product' | 'barcode' | 'receipt' | 'nutrition' | 'other'; // INDEX
  
  // AI Analysis
  aiAnalyzed?: boolean; // DEFAULT false
  aiTags?: string; // JSON array of detected objects/features
  aiConfidence?: number;
  
  // Cloud sync
  cloudUrl?: string; // URL if synced to cloud storage
  cloudSyncStatus?: 'pending' | 'synced' | 'failed'; // INDEX
  lastSyncAt?: Date;
  
  // Metadata
  createdAt: Date; // NOT NULL, DEFAULT CURRENT_TIMESTAMP
  updatedAt: Date; // NOT NULL, DEFAULT CURRENT_TIMESTAMP
  isDeleted?: boolean; // DEFAULT false, INDEX
  deletedAt?: Date;
}

// =============================================================================
// CATEGORIES SCHEMA
// =============================================================================

export interface CategorySchema {
  id: string; // UUID, PRIMARY KEY
  name: string; // NOT NULL, UNIQUE
  displayName: string; // Localized name
  description?: string;
  
  // Hierarchy
  parentId?: string; // Self-referencing foreign key
  level: number; // 0 = root, 1 = subcategory, etc.
  sortOrder: number; // For display ordering
  
  // Visual
  iconName?: string; // Material icon name
  color?: string; // Hex color code
  
  // Properties
  defaultExpirationDays?: number; // Default expiration for this category
  defaultLocation?: ProductLocation;
  
  // AI Training
  keywords?: string; // For AI recognition
  
  // Metadata
  isActive: boolean; // DEFAULT true
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// LOCATIONS SCHEMA
// =============================================================================

export interface LocationSchema {
  id: string; // UUID, PRIMARY KEY
  name: string; // NOT NULL, UNIQUE
  displayName: string;
  description?: string;
  
  // Location properties
  type: ProductLocation; // fridge, pantry, etc.
  temperature?: 'frozen' | 'cold' | 'cool' | 'room' | 'warm'; // Storage temperature
  humidity?: 'low' | 'medium' | 'high';
  
  // Physical properties
  capacity?: number; // Maximum items
  currentCount?: number; // Current item count (calculated)
  
  // Visual
  iconName?: string;
  color?: string;
  
  // Metadata
  isActive: boolean; // DEFAULT true
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// USER PREFERENCES SCHEMA
// =============================================================================

export interface UserPreferencesSchema {
  id: string; // UUID, PRIMARY KEY
  userId?: string; // For multi-user support
  
  // Notification preferences
  enableNotifications: boolean; // DEFAULT true
  expirationWarningDays: number; // DEFAULT 3
  notificationTime: string; // HH:MM format
  
  // Display preferences
  defaultViewMode: 'grid' | 'list'; // DEFAULT 'grid'
  defaultSortBy: string; // DEFAULT 'expirationDate'
  theme: 'light' | 'dark' | 'auto'; // DEFAULT 'auto'
  
  // Language & Locale
  language: string; // DEFAULT 'ja'
  locale: string; // DEFAULT 'ja-JP'
  currency: string; // DEFAULT 'JPY'
  
  // AI preferences
  enableAiRecognition: boolean; // DEFAULT true
  aiConfidenceThreshold: number; // DEFAULT 0.7
  
  // Data preferences
  enableCloudSync: boolean; // DEFAULT false
  enableAnalytics: boolean; // DEFAULT true
  
  // Custom settings
  customSettings?: string; // JSON serialized
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONSUMPTION HISTORY SCHEMA
// =============================================================================

export interface ConsumptionHistorySchema {
  id: string; // UUID, PRIMARY KEY
  productId: string; // Foreign key to Product, INDEX
  
  // Consumption details
  quantityConsumed: number; // NOT NULL
  unit?: string;
  consumedAt: Date; // NOT NULL, INDEX
  
  // Consumption method
  method: 'used' | 'consumed' | 'expired' | 'thrown_away' | 'donated' | 'other';
  reason?: string; // If thrown away or donated
  
  // Quality assessment
  qualityRating?: number; // 1-5 stars
  freshnessAtConsumption?: 'fresh' | 'good' | 'fair' | 'poor' | 'bad';
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt: Date;
}

// =============================================================================
// SHOPPING LIST SCHEMA
// =============================================================================

export interface ShoppingListSchema {
  id: string; // UUID, PRIMARY KEY
  name: string; // DEFAULT 'Shopping List'
  
  // List properties
  isActive: boolean; // DEFAULT true
  color?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ShoppingListItemSchema {
  id: string; // UUID, PRIMARY KEY
  listId: string; // Foreign key to ShoppingList, INDEX
  
  // Item details
  productName: string; // NOT NULL
  category?: ProductCategory;
  quantity?: number;
  unit?: string;
  
  // Reference to existing product (if restocking)
  originalProductId?: string; // Foreign key to Product
  
  // Purchase details
  estimatedPrice?: number;
  actualPrice?: number;
  
  // Status
  isCompleted: boolean; // DEFAULT false, INDEX
  completedAt?: Date;
  
  // Priority & Notes
  priority: 'low' | 'medium' | 'high' | 'urgent'; // DEFAULT 'medium', INDEX
  notes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// ANALYTICS & REPORTS SCHEMA
// =============================================================================

export interface WasteReportSchema {
  id: string; // UUID, PRIMARY KEY
  
  // Report period
  periodStart: Date; // NOT NULL, INDEX
  periodEnd: Date; // NOT NULL, INDEX
  
  // Waste statistics
  totalItemsWasted: number;
  totalValueWasted?: number;
  wasteByCategory?: string; // JSON serialized
  wasteByLocation?: string; // JSON serialized
  
  // Trends
  improvementSuggestions?: string; // JSON serialized
  
  // Metadata
  generatedAt: Date;
}

export interface UsageAnalyticsSchema {
  id: string; // UUID, PRIMARY KEY
  
  // Analytics period
  date: Date; // NOT NULL, UNIQUE INDEX
  
  // Usage metrics
  activeProducts: number;
  newProductsAdded: number;
  productsConsumed: number;
  productsExpired: number;
  
  // User behavior
  appOpenCount: number;
  averageSessionDuration?: number; // seconds
  featuresUsed?: string; // JSON array
  
  // Performance metrics
  aiRecognitionAccuracy?: number;
  
  // Metadata
  createdAt: Date;
}

// =============================================================================
// BACKUP & SYNC SCHEMA
// =============================================================================

export interface BackupSchema {
  id: string; // UUID, PRIMARY KEY
  
  // Backup metadata
  fileName: string; // NOT NULL
  filePath?: string; // Local backup file path
  fileSize: number; // Bytes
  
  // Backup content
  dataVersion: string;
  contentHash: string; // SHA-256 hash for integrity
  isIncremental: boolean; // DEFAULT false
  
  // Backup type
  type: 'manual' | 'automatic' | 'pre_migration';
  scope: 'full' | 'products_only' | 'images_only' | 'preferences_only';
  
  // Cloud sync
  cloudUrl?: string;
  cloudSyncStatus?: 'pending' | 'uploaded' | 'failed';
  
  // Status
  status: 'creating' | 'completed' | 'failed' | 'corrupted';
  errorMessage?: string;
  
  // Metadata
  createdAt: Date;
  completedAt?: Date;
}

export interface SyncLogSchema {
  id: string; // UUID, PRIMARY KEY
  
  // Sync session
  sessionId: string; // Groups related sync operations
  
  // Sync details
  entity: 'product' | 'image' | 'preference' | 'category' | 'location';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  
  // Sync status
  status: 'pending' | 'synced' | 'conflict' | 'failed';
  retryCount: number; // DEFAULT 0
  
  // Conflict resolution
  conflictResolution?: 'local_wins' | 'remote_wins' | 'merged' | 'manual';
  localVersion?: number;
  remoteVersion?: number;
  
  // Error handling
  errorCode?: string;
  errorMessage?: string;
  
  // Metadata
  attemptedAt: Date;
  completedAt?: Date;
}

// =============================================================================
// DATABASE INDEXES
// =============================================================================

export const DATABASE_INDEXES = {
  products: [
    'CREATE INDEX idx_products_expiration ON products(expirationDate)',
    'CREATE INDEX idx_products_category ON products(category)',
    'CREATE INDEX idx_products_location ON products(location)',
    'CREATE INDEX idx_products_added_date ON products(addedDate)',
    'CREATE INDEX idx_products_ai_recognized ON products(aiRecognized)',
    'CREATE INDEX idx_products_name ON products(name)',
    'CREATE INDEX idx_products_brand ON products(brand)',
    'CREATE INDEX idx_products_deleted ON products(isDeleted)',
    'CREATE UNIQUE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL',
    'CREATE INDEX idx_products_tags ON products(tags)',
    'CREATE INDEX idx_products_purchase_date ON products(purchaseDate)',
  ],
  
  productImages: [
    'CREATE INDEX idx_images_product_id ON productImages(productId)',
    'CREATE INDEX idx_images_is_primary ON productImages(isPrimary)',
    'CREATE INDEX idx_images_type ON productImages(imageType)',
    'CREATE INDEX idx_images_sync_status ON productImages(cloudSyncStatus)',
    'CREATE INDEX idx_images_deleted ON productImages(isDeleted)',
  ],
  
  categories: [
    'CREATE UNIQUE INDEX idx_categories_name ON categories(name)',
    'CREATE INDEX idx_categories_parent ON categories(parentId)',
    'CREATE INDEX idx_categories_level ON categories(level)',
    'CREATE INDEX idx_categories_active ON categories(isActive)',
  ],
  
  locations: [
    'CREATE UNIQUE INDEX idx_locations_name ON locations(name)',
    'CREATE INDEX idx_locations_type ON locations(type)',
    'CREATE INDEX idx_locations_active ON locations(isActive)',
  ],
  
  consumptionHistory: [
    'CREATE INDEX idx_consumption_product_id ON consumptionHistory(productId)',
    'CREATE INDEX idx_consumption_date ON consumptionHistory(consumedAt)',
    'CREATE INDEX idx_consumption_method ON consumptionHistory(method)',
  ],
  
  shoppingListItems: [
    'CREATE INDEX idx_shopping_items_list_id ON shoppingListItems(listId)',
    'CREATE INDEX idx_shopping_items_completed ON shoppingListItems(isCompleted)',
    'CREATE INDEX idx_shopping_items_priority ON shoppingListItems(priority)',
    'CREATE INDEX idx_shopping_items_product_id ON shoppingListItems(originalProductId)',
  ],
  
  wasteReports: [
    'CREATE INDEX idx_waste_reports_period ON wasteReports(periodStart, periodEnd)',
  ],
  
  usageAnalytics: [
    'CREATE UNIQUE INDEX idx_analytics_date ON usageAnalytics(date)',
  ],
  
  syncLog: [
    'CREATE INDEX idx_sync_log_session ON syncLog(sessionId)',
    'CREATE INDEX idx_sync_log_entity ON syncLog(entity, entityId)',
    'CREATE INDEX idx_sync_log_status ON syncLog(status)',
    'CREATE INDEX idx_sync_log_attempted ON syncLog(attemptedAt)',
  ],
};

// =============================================================================
// FOREIGN KEY CONSTRAINTS
// =============================================================================

export const FOREIGN_KEY_CONSTRAINTS = {
  productImages: [
    'FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE',
  ],
  
  categories: [
    'FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL',
  ],
  
  consumptionHistory: [
    'FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE',
  ],
  
  shoppingListItems: [
    'FOREIGN KEY (listId) REFERENCES shoppingLists(id) ON DELETE CASCADE',
    'FOREIGN KEY (originalProductId) REFERENCES products(id) ON DELETE SET NULL',
  ],
};

// =============================================================================
// DATABASE TRIGGERS
// =============================================================================

export const DATABASE_TRIGGERS = {
  // Automatically update updatedAt timestamp
  updateTimestamp: `
    CREATE TRIGGER update_products_timestamp 
    AFTER UPDATE ON products 
    FOR EACH ROW 
    BEGIN 
      UPDATE products SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `,
  
  // Increment version for optimistic locking
  incrementVersion: `
    CREATE TRIGGER increment_product_version 
    AFTER UPDATE ON products 
    FOR EACH ROW 
    BEGIN 
      UPDATE products SET version = OLD.version + 1 WHERE id = NEW.id;
    END;
  `,
  
  // Maintain location current count
  updateLocationCount: `
    CREATE TRIGGER update_location_count 
    AFTER INSERT ON products 
    FOR EACH ROW 
    BEGIN 
      UPDATE locations 
      SET currentCount = currentCount + 1 
      WHERE name = NEW.location;
    END;
  `,
  
  // Clean up orphaned images
  cleanupOrphanedImages: `
    CREATE TRIGGER cleanup_images 
    AFTER UPDATE OF isDeleted ON products 
    FOR EACH ROW 
    WHEN NEW.isDeleted = 1 
    BEGIN 
      UPDATE productImages 
      SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP 
      WHERE productId = NEW.id;
    END;
  `,
};

// =============================================================================
// FULL-TEXT SEARCH CONFIGURATION
// =============================================================================

export const FULL_TEXT_SEARCH = {
  // Virtual table for full-text search on products
  productSearch: `
    CREATE VIRTUAL TABLE products_fts USING fts5(
      id UNINDEXED,
      name,
      description,
      brand,
      notes,
      tags,
      content='products',
      content_rowid='rowid'
    );
  `,
  
  // Triggers to maintain FTS index
  ftsInsert: `
    CREATE TRIGGER products_fts_insert AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(id, name, description, brand, notes, tags)
      VALUES (new.id, new.name, new.description, new.brand, new.notes, new.tags);
    END;
  `,
  
  ftsUpdate: `
    CREATE TRIGGER products_fts_update AFTER UPDATE ON products BEGIN
      UPDATE products_fts SET
        name = new.name,
        description = new.description,
        brand = new.brand,
        notes = new.notes,
        tags = new.tags
      WHERE id = new.id;
    END;
  `,
  
  ftsDelete: `
    CREATE TRIGGER products_fts_delete AFTER DELETE ON products BEGIN
      DELETE FROM products_fts WHERE id = old.id;
    END;
  `,
};

// =============================================================================
// TYPE EXPORTS (Re-export for compatibility)
// =============================================================================

// Export enum values for database constraints
export const PRODUCT_CATEGORIES = [
  'fruits', 'vegetables', 'dairy', 'meat', 'packaged', 'beverages', 'other'
] as const;

export const PRODUCT_LOCATIONS = [
  'fridge', 'pantry', 'freezer', 'counter', 'other'
] as const;

export const CONSUMPTION_METHODS = [
  'used', 'consumed', 'expired', 'thrown_away', 'donated', 'other'
] as const;

export const PRIORITY_LEVELS = [
  'low', 'medium', 'high', 'urgent'
] as const;

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateSchema = (schema: any): SchemaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation logic would go here
  // This is a placeholder for comprehensive schema validation
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
