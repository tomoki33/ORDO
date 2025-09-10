/**
 * Database Repository Index
 * 
 * Centralized exports for all database repositories and related types
 * SQLite/Realm実装 (8h) - Repository Layer
 */

// Core database infrastructure
import db, { BaseRepository, DatabaseManager } from './sqlite';
import { ProductRepository } from './ProductRepository';
import { ProductImageRepository } from './ProductImageRepository';
import { CategoryRepository } from './CategoryRepository';
import { LocationRepository } from './LocationRepository';

export { db, BaseRepository, DatabaseManager };

// Schema and types
export * from './schema';

// Repository implementations
export { ProductRepository };
export type { ProductCreateInput } from './ProductRepository';

export { ProductImageRepository };
export type { 
  ProductImage, 
  ProductImageCreateInput, 
  ProductImageUpdateInput 
} from './ProductImageRepository';

export { CategoryRepository };
export type { 
  Category, 
  CategoryCreateInput, 
  CategoryTreeNode 
} from './CategoryRepository';

export { LocationRepository };
export type { 
  Location, 
  LocationCreateInput, 
  LocationTreeNode 
} from './LocationRepository';

// Database initialization and setup
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.initialize();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Repository instances (singleton pattern)
export const productRepository = new ProductRepository();
export const productImageRepository = new ProductImageRepository();
export const categoryRepository = new CategoryRepository();
export const locationRepository = new LocationRepository();

// Database utilities
export const getDatabaseInfo = async () => {
  return await db.getDatabaseInfo();
};

export const closeDatabase = async (): Promise<void> => {
  await db.close();
  console.log('✅ Database closed successfully');
};
