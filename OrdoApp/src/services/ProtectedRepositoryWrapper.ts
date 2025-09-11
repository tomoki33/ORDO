import { BaseRepository } from '../database/sqlite';
import { localDataProtectionService } from './LocalDataProtectionService';

/**
 * Protected Repository Wrapper
 * Adds data protection capabilities to any repository
 */
export class ProtectedRepositoryWrapper<T> {
  private repository: BaseRepository<T>;
  private dataClassification: string;

  constructor(repository: BaseRepository<T>, dataClassification: string = 'product_data') {
    this.repository = repository;
    this.dataClassification = dataClassification;
  }

  // Wrapper methods that add protection
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const result = await this.repository.create(data);
    
    // Store protected metadata
    await localDataProtectionService.protectedStore(
      `repository_${this.repository.constructor.name}_${(result as any).id}`,
      {
        action: 'create',
        timestamp: new Date(),
        dataId: (result as any).id,
      },
      this.dataClassification
    );

    return result;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.repository.findById(id);
    
    if (result) {
      // Log data access
      await localDataProtectionService.protectedStore(
        `access_log_${this.repository.constructor.name}_${id}`,
        {
          action: 'read',
          timestamp: new Date(),
          dataId: id,
        },
        'analytics_data'
      );
    }

    return result;
  }

  async findAll(): Promise<T[]> {
    const results = await this.repository.findAll();
    
    // Log bulk access
    await localDataProtectionService.protectedStore(
      `bulk_access_${this.repository.constructor.name}_${Date.now()}`,
      {
        action: 'bulk_read',
        timestamp: new Date(),
        count: results.length,
      },
      'analytics_data'
    );

    return results;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.repository.update(id, data);
    
    if (result) {
      // Store update metadata
      await localDataProtectionService.protectedStore(
        `repository_update_${this.repository.constructor.name}_${id}`,
        {
          action: 'update',
          timestamp: new Date(),
          dataId: id,
          updatedFields: Object.keys(data),
        },
        this.dataClassification
      );
    }

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    
    if (result) {
      // Store deletion metadata and clean up protected data
      await localDataProtectionService.protectedStore(
        `repository_delete_${this.repository.constructor.name}_${id}`,
        {
          action: 'delete',
          timestamp: new Date(),
          dataId: id,
        },
        'security_logs'
      );

      // Clean up any protected data related to this entity
      await localDataProtectionService.protectedRemove(
        `repository_${this.repository.constructor.name}_${id}`
      );
    }

    return result;
  }

  // Get the wrapped repository for direct access if needed
  getWrappedRepository(): BaseRepository<T> {
    return this.repository;
  }
}

/**
 * Factory for creating protected repository instances
 */
export class ProtectedRepositoryFactory {
  static wrap<T>(
    repository: BaseRepository<T>, 
    dataClassification?: string
  ): ProtectedRepositoryWrapper<T> {
    return new ProtectedRepositoryWrapper(repository, dataClassification);
  }

  static wrapWithUserDataClassification<T>(
    repository: BaseRepository<T>
  ): ProtectedRepositoryWrapper<T> {
    return new ProtectedRepositoryWrapper(repository, 'user_data');
  }

  static wrapWithConfidentialClassification<T>(
    repository: BaseRepository<T>
  ): ProtectedRepositoryWrapper<T> {
    return new ProtectedRepositoryWrapper(repository, 'user_data');
  }
}
