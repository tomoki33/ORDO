import { BaseRepository } from './sqlite';

export interface ProductImage {
  id: string;
  productId: string;
  imageUri: string;
  imageType: 'product' | 'barcode' | 'receipt' | 'other';
  isPrimary: boolean;
  metadata?: any;
  processedImageUri?: string;
  thumbnailUri?: string;
  originalSize?: number;
  processedSize?: number;
  thumbnailSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  quality?: number;
  aiAnalysisResult?: any;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ProductImageCreateInput {
  productId: string;
  imageUri: string;
  imageType: 'product' | 'barcode' | 'receipt' | 'other';
  isPrimary?: boolean;
  metadata?: any;
  processedImageUri?: string;
  thumbnailUri?: string;
  originalSize?: number;
  processedSize?: number;
  thumbnailSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  quality?: number;
  aiAnalysisResult?: any;
}

export interface ProductImageUpdateInput {
  imageUri?: string;
  imageType?: 'product' | 'barcode' | 'receipt' | 'other';
  isPrimary?: boolean;
  metadata?: any;
  processedImageUri?: string;
  thumbnailUri?: string;
  originalSize?: number;
  processedSize?: number;
  thumbnailSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  quality?: number;
  aiAnalysisResult?: any;
  lastUpdated?: Date;
}

export class ProductImageRepository extends BaseRepository<ProductImage> {
  constructor() {
    super('product_images');
  }

  // Required BaseRepository methods
  async create(imageData: Omit<ProductImage, 'id' | 'createdAt' | 'lastUpdated'>): Promise<ProductImage> {
    return this.transaction(async (tx) => {
      const id = this.generateId();
      const now = this.now();

      // If this is set as primary, unset other primary images for the product
      if (imageData.isPrimary) {
        await tx.executeSql(
          'UPDATE product_images SET isPrimary = 0 WHERE productId = ?',
          [imageData.productId]
        );
      }

      await tx.executeSql(
        `INSERT INTO product_images (
          id, productId, imageUri, imageType, isPrimary, metadata,
          processedImageUri, thumbnailUri, originalSize, processedSize, thumbnailSize,
          mimeType, width, height, quality, aiAnalysisResult, createdAt, lastUpdated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          imageData.productId,
          imageData.imageUri,
          imageData.imageType,
          imageData.isPrimary ? 1 : 0,
          imageData.metadata ? JSON.stringify(imageData.metadata) : null,
          imageData.processedImageUri || null,
          imageData.thumbnailUri || null,
          imageData.originalSize || null,
          imageData.processedSize || null,
          imageData.thumbnailSize || null,
          imageData.mimeType || null,
          imageData.width || null,
          imageData.height || null,
          imageData.quality || null,
          imageData.aiAnalysisResult ? JSON.stringify(imageData.aiAnalysisResult) : null,
          now,
          now
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to create product image');
      }

      return created;
    });
  }

  async findById(id: string): Promise<ProductImage | null> {
    const result = await this.executeQuery(
      'SELECT * FROM product_images WHERE id = ? AND deletedAt IS NULL',
      [id]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToProductImage(result[0].rows.item(0));
  }

  async findAll(): Promise<ProductImage[]> {
    const result = await this.executeQuery(
      'SELECT * FROM product_images WHERE deletedAt IS NULL ORDER BY createdAt DESC'
    );

    const images: ProductImage[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      images.push(this.mapRowToProductImage(result[0].rows.item(i)));
    }

    return images;
  }

  async update(id: string, updates: Partial<ProductImage>): Promise<ProductImage> {
    return this.transaction(async (tx) => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('ProductImage not found');
      }

      // If setting as primary, unset other primary images for the product
      if (updates.isPrimary) {
        await tx.executeSql(
          'UPDATE product_images SET isPrimary = 0 WHERE productId = ? AND id != ?',
          [existing.productId, id]
        );
      }

      const setClause = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          if (key === 'metadata' || key === 'aiAnalysisResult') {
            setClause.push(`${key} = ?`);
            values.push(value ? JSON.stringify(value) : null);
          } else if (key === 'isPrimary') {
            setClause.push(`${key} = ?`);
            values.push(value ? 1 : 0);
          } else if (key === 'lastUpdated') {
            setClause.push(`${key} = ?`);
            values.push(value instanceof Date ? value.toISOString() : value);
          } else {
            setClause.push(`${key} = ?`);
            values.push(value);
          }
        }
      });

      if (setClause.length === 0) {
        return existing;
      }

      setClause.push('lastUpdated = ?');
      values.push(this.now());
      values.push(id);

      await tx.executeSql(
        `UPDATE product_images SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to update product image');
      }

      return updated;
    });
  }

  async delete(id: string, soft: boolean = true): Promise<boolean> {
    if (soft) {
      const result = await this.executeQuery(
        'UPDATE product_images SET deletedAt = ? WHERE id = ?',
        [this.now(), id]
      );
      return result[0].rowsAffected > 0;
    } else {
      const result = await this.executeQuery(
        'DELETE FROM product_images WHERE id = ?',
        [id]
      );
      return result[0].rowsAffected > 0;
    }
  }

  // Additional methods specific to ProductImage
  async findByProductId(productId: string): Promise<ProductImage[]> {
    const result = await this.executeQuery(
      'SELECT * FROM product_images WHERE productId = ? AND deletedAt IS NULL ORDER BY isPrimary DESC, createdAt ASC',
      [productId]
    );

    const images: ProductImage[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      images.push(this.mapRowToProductImage(result[0].rows.item(i)));
    }

    return images;
  }

  async findPrimaryByProductId(productId: string): Promise<ProductImage | null> {
    const result = await this.executeQuery(
      'SELECT * FROM product_images WHERE productId = ? AND isPrimary = 1 AND deletedAt IS NULL',
      [productId]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToProductImage(result[0].rows.item(0));
  }

  async setPrimary(id: string): Promise<boolean> {
    return this.transaction(async (tx) => {
      const image = await this.findById(id);
      if (!image) {
        return false;
      }

      // Unset all primary images for this product
      await tx.executeSql(
        'UPDATE product_images SET isPrimary = 0 WHERE productId = ?',
        [image.productId]
      );

      // Set this image as primary
      await tx.executeSql(
        'UPDATE product_images SET isPrimary = 1, lastUpdated = ? WHERE id = ?',
        [this.now(), id]
      );

      return true;
    });
  }

  async deleteByProductId(productId: string, soft: boolean = true): Promise<number> {
    if (soft) {
      const result = await this.executeQuery(
        'UPDATE product_images SET deletedAt = ? WHERE productId = ? AND deletedAt IS NULL',
        [this.now(), productId]
      );
      return result[0].rowsAffected;
    } else {
      const result = await this.executeQuery(
        'DELETE FROM product_images WHERE productId = ?',
        [productId]
      );
      return result[0].rowsAffected;
    }
  }

  async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    originalSize: number;
    processedSize: number;
    thumbnailSize: number;
    averageSize: number;
  }> {
    const result = await this.executeQuery(
      `SELECT 
        COUNT(*) as totalImages,
        COALESCE(SUM(originalSize), 0) as originalSize,
        COALESCE(SUM(processedSize), 0) as processedSize,
        COALESCE(SUM(thumbnailSize), 0) as thumbnailSize
      FROM product_images 
      WHERE deletedAt IS NULL`
    );

    const row = result[0].rows.item(0);
    const totalSize = row.originalSize + row.processedSize + row.thumbnailSize;
    const averageSize = row.totalImages > 0 ? totalSize / row.totalImages : 0;

    return {
      totalImages: row.totalImages,
      totalSize,
      originalSize: row.originalSize,
      processedSize: row.processedSize,
      thumbnailSize: row.thumbnailSize,
      averageSize,
    };
  }

  async cleanupOrphanedImages(): Promise<string[]> {
    const result = await this.executeQuery(
      `SELECT pi.id, pi.imageUri 
      FROM product_images pi 
      LEFT JOIN products p ON pi.productId = p.id 
      WHERE p.id IS NULL AND pi.deletedAt IS NULL`
    );

    const orphanedIds: string[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      orphanedIds.push(result[0].rows.item(i).id);
    }

    if (orphanedIds.length > 0) {
      const placeholders = orphanedIds.map(() => '?').join(',');
      await this.executeQuery(
        `UPDATE product_images SET deletedAt = ? WHERE id IN (${placeholders})`,
        [this.now(), ...orphanedIds]
      );
    }

    return orphanedIds;
  }

  private mapRowToProductImage(row: any): ProductImage {
    return {
      id: row.id,
      productId: row.productId,
      imageUri: row.imageUri,
      imageType: row.imageType as 'product' | 'barcode' | 'receipt' | 'other',
      isPrimary: Boolean(row.isPrimary),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      processedImageUri: row.processedImageUri,
      thumbnailUri: row.thumbnailUri,
      originalSize: row.originalSize,
      processedSize: row.processedSize,
      thumbnailSize: row.thumbnailSize,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      quality: row.quality,
      aiAnalysisResult: row.aiAnalysisResult ? JSON.parse(row.aiAnalysisResult) : undefined,
      createdAt: new Date(row.createdAt),
      lastUpdated: new Date(row.lastUpdated),
    };
  }
}
