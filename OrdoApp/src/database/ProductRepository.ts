/**
 * Product Repository Implementation
 * 商品データアクセス層
 */

import { BaseRepository } from './sqlite';
import { ProductSchema, ProductCategory, ProductLocation } from './schema';
import { Product } from '../types';

// =============================================================================
// PRODUCT REPOSITORY
// =============================================================================

export interface ProductCreateInput {
  name: string;
  category: ProductCategory;
  location: ProductLocation;
  expirationDate: Date;
  description?: string;
  barcode?: string;
  subcategory?: string;
  brand?: string;
  locationDetails?: string;
  quantity?: number;
  unit?: string;
  packageSize?: number;
  packageUnit?: string;
  purchaseDate?: Date;
  openedDate?: Date;
  purchasePrice?: number;
  originalPrice?: number;
  currency?: string;
  aiRecognized?: boolean;
  confidence?: number;
  recognitionMetadata?: string;
  primaryImageId?: string;
  notes?: string;
  tags?: string;
  customFields?: string;
  consumptionRate?: number;
  lastConsumedDate?: Date;
  consumptionHistory?: string;
  alertThresholdDays?: number;
  notificationSent?: boolean;
}

export interface ProductFilter {
  category?: ProductCategory;
  location?: ProductLocation;
  isExpired?: boolean;
  expiringWithinDays?: number;
  aiRecognized?: boolean;
  hasNotes?: boolean;
  searchText?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ProductSortOptions {
  field: 'name' | 'expirationDate' | 'addedDate' | 'category' | 'location' | 'brand';
  direction: 'asc' | 'desc';
}

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  public async create(input: ProductCreateInput): Promise<Product> {
    const id = this.generateId();
    const now = this.now();
    
    const sql = `
      INSERT INTO products (
        id, name, description, barcode, category, subcategory, brand,
        location, locationDetails, quantity, unit, packageSize, packageUnit,
        expirationDate, purchaseDate, addedDate, openedDate,
        purchasePrice, originalPrice, currency,
        aiRecognized, confidence, recognitionMetadata, primaryImageId,
        notes, tags, customFields,
        consumptionRate, lastConsumedDate, consumptionHistory,
        alertThresholdDays, notificationSent,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?
      );
    `;

    const params = [
      id, input.name, input.description, input.barcode,
      input.category, input.subcategory, input.brand,
      input.location, input.locationDetails, input.quantity, input.unit,
      input.packageSize, input.packageUnit,
      input.expirationDate.toISOString(), 
      input.purchaseDate?.toISOString(), 
      now,
      input.openedDate?.toISOString(),
      input.purchasePrice, input.originalPrice, input.currency || 'JPY',
      input.aiRecognized ? 1 : 0, input.confidence, input.recognitionMetadata,
      input.primaryImageId,
      input.notes, input.tags, input.customFields,
      input.consumptionRate, 
      input.lastConsumedDate?.toISOString(),
      input.consumptionHistory,
      input.alertThresholdDays, input.notificationSent ? 1 : 0,
      now, now
    ];

    await this.executeQuery(sql, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create product');
    }
    return created;
  }

  public async findById(id: string): Promise<Product | null> {
    const sql = `
      SELECT * FROM products 
      WHERE id = ? AND (isDeleted = 0 OR isDeleted IS NULL);
    `;
    
    const result = await this.executeQuery(sql, [id]);
    
    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToProduct(result[0].rows.item(0));
  }

  public async findAll(options?: {
    filter?: ProductFilter;
    sort?: ProductSortOptions;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    let sql = `
      SELECT * FROM products 
      WHERE (isDeleted = 0 OR isDeleted IS NULL)
    `;
    const params: any[] = [];

    // Apply filters
    if (options?.filter) {
      const { filter } = options;
      
      if (filter.category) {
        sql += ` AND category = ?`;
        params.push(filter.category);
      }
      
      if (filter.location) {
        sql += ` AND location = ?`;
        params.push(filter.location);
      }
      
      if (filter.isExpired !== undefined) {
        if (filter.isExpired) {
          sql += ` AND expirationDate < ?`;
          params.push(new Date().toISOString());
        } else {
          sql += ` AND expirationDate >= ?`;
          params.push(new Date().toISOString());
        }
      }
      
      if (filter.expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filter.expiringWithinDays);
        sql += ` AND expirationDate <= ?`;
        params.push(futureDate.toISOString());
      }
      
      if (filter.aiRecognized !== undefined) {
        sql += ` AND aiRecognized = ?`;
        params.push(filter.aiRecognized ? 1 : 0);
      }
      
      if (filter.hasNotes !== undefined) {
        if (filter.hasNotes) {
          sql += ` AND notes IS NOT NULL AND notes != ''`;
        } else {
          sql += ` AND (notes IS NULL OR notes = '')`;
        }
      }
      
      if (filter.searchText) {
        sql += ` AND (
          name LIKE ? OR 
          description LIKE ? OR 
          brand LIKE ? OR 
          notes LIKE ? OR 
          tags LIKE ?
        )`;
        const searchPattern = `%${filter.searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      if (filter.dateRange) {
        sql += ` AND expirationDate BETWEEN ? AND ?`;
        params.push(
          filter.dateRange.start.toISOString(),
          filter.dateRange.end.toISOString()
        );
      }
    }

    // Apply sorting
    if (options?.sort) {
      const { field, direction } = options.sort;
      sql += ` ORDER BY ${field} ${direction.toUpperCase()}`;
    } else {
      sql += ` ORDER BY expirationDate ASC`;
    }

    // Apply pagination
    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
      
      if (options?.offset) {
        sql += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    const result = await this.executeQuery(sql, params);
    const products: Product[] = [];
    
    for (let i = 0; i < result[0].rows.length; i++) {
      products.push(this.mapRowToProduct(result[0].rows.item(i)));
    }

    return products;
  }

  public async update(id: string, updates: Partial<ProductCreateInput>): Promise<Product> {
    const setParts: string[] = [];
    const params: any[] = [];

    // Build SET clause dynamically
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setParts.push(`${key} = ?`);
        
        if (value instanceof Date) {
          params.push(value.toISOString());
        } else if (typeof value === 'boolean') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    }

    if (setParts.length === 0) {
      throw new Error('No updates provided');
    }

    // Add updatedAt and version increment
    setParts.push('updatedAt = ?', 'version = version + 1');
    params.push(this.now());
    params.push(id);

    const sql = `
      UPDATE products 
      SET ${setParts.join(', ')}
      WHERE id = ?;
    `;

    await this.executeQuery(sql, params);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update product');
    }
    return updated;
  }

  public async delete(id: string, soft: boolean = true): Promise<boolean> {
    if (soft) {
      // Soft delete
      const sql = `
        UPDATE products 
        SET isDeleted = 1, deletedAt = ?, updatedAt = ?
        WHERE id = ?;
      `;
      const now = this.now();
      await this.executeQuery(sql, [now, now, id]);
    } else {
      // Hard delete
      const sql = `DELETE FROM products WHERE id = ?;`;
      await this.executeQuery(sql, [id]);
    }

    return true;
  }

  // =============================================================================
  // SPECIALIZED QUERIES
  // =============================================================================

  public async findExpiringProducts(days: number = 3): Promise<Product[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.findAll({
      filter: { expiringWithinDays: days },
      sort: { field: 'expirationDate', direction: 'asc' }
    });
  }

  public async findExpiredProducts(): Promise<Product[]> {
    return this.findAll({
      filter: { isExpired: true },
      sort: { field: 'expirationDate', direction: 'desc' }
    });
  }

  public async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.findAll({
      filter: { category },
      sort: { field: 'name', direction: 'asc' }
    });
  }

  public async findByLocation(location: ProductLocation): Promise<Product[]> {
    return this.findAll({
      filter: { location },
      sort: { field: 'name', direction: 'asc' }
    });
  }

  public async findByBarcode(barcode: string): Promise<Product | null> {
    const sql = `
      SELECT * FROM products 
      WHERE barcode = ? AND (isDeleted = 0 OR isDeleted IS NULL);
    `;
    
    const result = await this.executeQuery(sql, [barcode]);
    
    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToProduct(result[0].rows.item(0));
  }

  public async search(query: string, limit: number = 50): Promise<Product[]> {
    // Use FTS for better search performance
    const sql = `
      SELECT p.* FROM products p
      JOIN products_fts fts ON p.id = fts.id
      WHERE products_fts MATCH ? 
      AND (p.isDeleted = 0 OR p.isDeleted IS NULL)
      ORDER BY rank
      LIMIT ?;
    `;

    try {
      const result = await this.executeQuery(sql, [query, limit]);
      const products: Product[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        products.push(this.mapRowToProduct(result[0].rows.item(i)));
      }

      return products;
    } catch (error) {
      // Fallback to regular search if FTS fails
      return this.findAll({
        filter: { searchText: query },
        limit
      });
    }
  }

  public async getStatistics(): Promise<{
    total: number;
    expired: number;
    expiringSoon: number;
    byCategory: Record<ProductCategory, number>;
    byLocation: Record<ProductLocation, number>;
  }> {
    const stats = {
      total: 0,
      expired: 0,
      expiringSoon: 0,
      byCategory: {} as Record<ProductCategory, number>,
      byLocation: {} as Record<ProductLocation, number>,
    };

    // Total count
    const totalResult = await this.executeQuery(`
      SELECT COUNT(*) as count FROM products 
      WHERE (isDeleted = 0 OR isDeleted IS NULL);
    `);
    stats.total = totalResult[0].rows.item(0).count;

    // Expired count
    const expiredResult = await this.executeQuery(`
      SELECT COUNT(*) as count FROM products 
      WHERE expirationDate < ? AND (isDeleted = 0 OR isDeleted IS NULL);
    `, [new Date().toISOString()]);
    stats.expired = expiredResult[0].rows.item(0).count;

    // Expiring soon (within 3 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const expiringSoonResult = await this.executeQuery(`
      SELECT COUNT(*) as count FROM products 
      WHERE expirationDate BETWEEN ? AND ? AND (isDeleted = 0 OR isDeleted IS NULL);
    `, [new Date().toISOString(), futureDate.toISOString()]);
    stats.expiringSoon = expiringSoonResult[0].rows.item(0).count;

    // By category
    const categoryResult = await this.executeQuery(`
      SELECT category, COUNT(*) as count FROM products 
      WHERE (isDeleted = 0 OR isDeleted IS NULL)
      GROUP BY category;
    `);
    for (let i = 0; i < categoryResult[0].rows.length; i++) {
      const row = categoryResult[0].rows.item(i);
      stats.byCategory[row.category as ProductCategory] = row.count;
    }

    // By location
    const locationResult = await this.executeQuery(`
      SELECT location, COUNT(*) as count FROM products 
      WHERE (isDeleted = 0 OR isDeleted IS NULL)
      GROUP BY location;
    `);
    for (let i = 0; i < locationResult[0].rows.length; i++) {
      const row = locationResult[0].rows.item(i);
      stats.byLocation[row.location as ProductLocation] = row.count;
    }

    return stats;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      category: row.category as ProductCategory,
      location: row.location as ProductLocation,
      expirationDate: new Date(row.expirationDate),
      addedDate: new Date(row.addedDate),
      quantity: row.quantity,
      unit: row.unit,
      brand: row.brand,
      barcode: row.barcode,
      imageUri: row.primaryImageId, // Map to imageUri for compatibility
      notes: row.notes,
      confidence: row.confidence,
      aiRecognized: Boolean(row.aiRecognized),
    };
  }
}

export default ProductRepository;
