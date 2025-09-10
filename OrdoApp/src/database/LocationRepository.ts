import { BaseRepository } from './sqlite';

export interface Location {
  id: string;
  name: string;
  type: 'refrigerator' | 'freezer' | 'pantry' | 'cabinet' | 'counter' | 'other';
  parentId?: string;
  level: number;
  temperature?: number;
  humidity?: number;
  description?: string;
  isSystemLocation: boolean;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationCreateInput {
  name: string;
  type: 'refrigerator' | 'freezer' | 'pantry' | 'cabinet' | 'counter' | 'other';
  parentId?: string;
  temperature?: number;
  humidity?: number;
  description?: string;
  isSystemLocation?: boolean;
  displayOrder?: number;
}

export class LocationRepository extends BaseRepository<Location> {
  constructor() {
    super('locations');
  }

  async create(locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'level'>): Promise<Location> {
    return this.transaction(async (tx) => {
      const id = this.generateId();
      const now = this.now();

      // Determine level based on parent
      let level = 1;
      if (locationData.parentId) {
        const parent = await this.findById(locationData.parentId);
        if (parent) {
          level = parent.level + 1;
        }
      }

      await tx.executeSql(
        `INSERT INTO locations (
          id, name, type, parentId, level, temperature, humidity, 
          description, isSystemLocation, displayOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          locationData.name,
          locationData.type,
          locationData.parentId || null,
          level,
          locationData.temperature || null,
          locationData.humidity || null,
          locationData.description || null,
          locationData.isSystemLocation ? 1 : 0,
          locationData.displayOrder || null,
          now,
          now
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to create location');
      }

      return created;
    });
  }

  async findById(id: string): Promise<Location | null> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE id = ? AND deletedAt IS NULL',
      [id]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToLocation(result[0].rows.item(0));
  }

  async findAll(): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE deletedAt IS NULL ORDER BY level ASC, displayOrder ASC, name ASC'
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async update(id: string, updates: Partial<Location>): Promise<Location> {
    return this.transaction(async (tx) => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Location not found');
      }

      const setClause = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'level') {
          if (key === 'isSystemLocation') {
            setClause.push(`${key} = ?`);
            values.push(value ? 1 : 0);
          } else if (key === 'updatedAt') {
            setClause.push(`${key} = ?`);
            values.push(value instanceof Date ? value.toISOString() : value);
          } else {
            setClause.push(`${key} = ?`);
            values.push(value);
          }
        }
      });

      // Update level if parent changed
      if (updates.parentId !== undefined) {
        let newLevel = 1;
        if (updates.parentId) {
          const parent = await this.findById(updates.parentId);
          if (parent) {
            newLevel = parent.level + 1;
          }
        }
        setClause.push('level = ?');
        values.push(newLevel);
      }

      if (setClause.length === 0) {
        return existing;
      }

      setClause.push('updatedAt = ?');
      values.push(this.now());
      values.push(id);

      await tx.executeSql(
        `UPDATE locations SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to update location');
      }

      return updated;
    });
  }

  async delete(id: string, soft: boolean = true): Promise<boolean> {
    if (soft) {
      const result = await this.executeQuery(
        'UPDATE locations SET deletedAt = ? WHERE id = ?',
        [this.now(), id]
      );
      return result[0].rowsAffected > 0;
    } else {
      const result = await this.executeQuery(
        'DELETE FROM locations WHERE id = ?',
        [id]
      );
      return result[0].rowsAffected > 0;
    }
  }

  // Additional methods specific to Location
  async findByType(type: string): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE type = ? AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC',
      [type]
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async findRootLocations(): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE parentId IS NULL AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC'
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async findByParentId(parentId: string): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE parentId = ? AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC',
      [parentId]
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async findByLevel(level: number): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE level = ? AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC',
      [level]
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async findSystemLocations(): Promise<Location[]> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE isSystemLocation = 1 AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC'
    );

    const locations: Location[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      locations.push(this.mapRowToLocation(result[0].rows.item(i)));
    }

    return locations;
  }

  async findByName(name: string): Promise<Location | null> {
    const result = await this.executeQuery(
      'SELECT * FROM locations WHERE name = ? AND deletedAt IS NULL',
      [name]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToLocation(result[0].rows.item(0));
  }

  async getLocationPath(locationId: string): Promise<Location[]> {
    const path: Location[] = [];
    let currentLocation = await this.findById(locationId);

    while (currentLocation) {
      path.unshift(currentLocation);
      if (currentLocation.parentId) {
        currentLocation = await this.findById(currentLocation.parentId);
      } else {
        break;
      }
    }

    return path;
  }

  async getLocationTree(): Promise<LocationTreeNode[]> {
    const allLocations = await this.findAll();
    const locationMap = new Map<string, LocationTreeNode>();
    const rootNodes: LocationTreeNode[] = [];

    // Create tree nodes
    allLocations.forEach(location => {
      locationMap.set(location.id, {
        ...location,
        children: []
      });
    });

    // Build tree structure
    allLocations.forEach(location => {
      const node = locationMap.get(location.id)!;
      if (location.parentId) {
        const parent = locationMap.get(location.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  async hasChildren(locationId: string): Promise<boolean> {
    const result = await this.executeQuery(
      'SELECT COUNT(*) as count FROM locations WHERE parentId = ? AND deletedAt IS NULL',
      [locationId]
    );

    return result[0].rows.item(0).count > 0;
  }

  async updateDisplayOrder(locationId: string, displayOrder: number): Promise<boolean> {
    const result = await this.executeQuery(
      'UPDATE locations SET displayOrder = ?, updatedAt = ? WHERE id = ?',
      [displayOrder, this.now(), locationId]
    );

    return result[0].rowsAffected > 0;
  }

  async updateEnvironment(locationId: string, temperature?: number, humidity?: number): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (temperature !== undefined) {
      updates.push('temperature = ?');
      values.push(temperature);
    }

    if (humidity !== undefined) {
      updates.push('humidity = ?');
      values.push(humidity);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updatedAt = ?');
    values.push(this.now());
    values.push(locationId);

    const result = await this.executeQuery(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return result[0].rowsAffected > 0;
  }

  async getProductCount(locationId: string): Promise<number> {
    const result = await this.executeQuery(
      'SELECT COUNT(*) as count FROM products WHERE location = ? AND deletedAt IS NULL',
      [locationId]
    );

    return result[0].rows.item(0).count;
  }

  private mapRowToLocation(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'refrigerator' | 'freezer' | 'pantry' | 'cabinet' | 'counter' | 'other',
      parentId: row.parentId,
      level: row.level,
      temperature: row.temperature,
      humidity: row.humidity,
      description: row.description,
      isSystemLocation: Boolean(row.isSystemLocation),
      displayOrder: row.displayOrder,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
}
