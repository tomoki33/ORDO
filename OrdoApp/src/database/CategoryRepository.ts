import { BaseRepository } from './sqlite';

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  icon?: string;
  color?: string;
  description?: string;
  isSystemCategory: boolean;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreateInput {
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
  description?: string;
  isSystemCategory?: boolean;
  displayOrder?: number;
}

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories');
  }

  async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'level'>): Promise<Category> {
    return this.transaction(async (tx) => {
      const id = this.generateId();
      const now = this.now();

      // Determine level based on parent
      let level = 1;
      if (categoryData.parentId) {
        const parent = await this.findById(categoryData.parentId);
        if (parent) {
          level = parent.level + 1;
        }
      }

      await tx.executeSql(
        `INSERT INTO categories (
          id, name, parentId, level, icon, color, description, 
          isSystemCategory, displayOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          categoryData.name,
          categoryData.parentId || null,
          level,
          categoryData.icon || null,
          categoryData.color || null,
          categoryData.description || null,
          categoryData.isSystemCategory ? 1 : 0,
          categoryData.displayOrder || null,
          now,
          now
        ]
      );

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to create category');
      }

      return created;
    });
  }

  async findById(id: string): Promise<Category | null> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE id = ? AND deletedAt IS NULL',
      [id]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result[0].rows.item(0));
  }

  async findAll(): Promise<Category[]> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE deletedAt IS NULL ORDER BY level ASC, displayOrder ASC, name ASC'
    );

    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      categories.push(this.mapRowToCategory(result[0].rows.item(i)));
    }

    return categories;
  }

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    return this.transaction(async (tx) => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Category not found');
      }

      const setClause = [];
      const values = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'level') {
          if (key === 'isSystemCategory') {
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
        `UPDATE categories SET ${setClause.join(', ')} WHERE id = ?`,
        values
      );

      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to update category');
      }

      return updated;
    });
  }

  async delete(id: string, soft: boolean = true): Promise<boolean> {
    if (soft) {
      const result = await this.executeQuery(
        'UPDATE categories SET deletedAt = ? WHERE id = ?',
        [this.now(), id]
      );
      return result[0].rowsAffected > 0;
    } else {
      const result = await this.executeQuery(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );
      return result[0].rowsAffected > 0;
    }
  }

  // Additional methods specific to Category
  async findRootCategories(): Promise<Category[]> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE parentId IS NULL AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC'
    );

    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      categories.push(this.mapRowToCategory(result[0].rows.item(i)));
    }

    return categories;
  }

  async findByParentId(parentId: string): Promise<Category[]> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE parentId = ? AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC',
      [parentId]
    );

    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      categories.push(this.mapRowToCategory(result[0].rows.item(i)));
    }

    return categories;
  }

  async findByLevel(level: number): Promise<Category[]> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE level = ? AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC',
      [level]
    );

    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      categories.push(this.mapRowToCategory(result[0].rows.item(i)));
    }

    return categories;
  }

  async findSystemCategories(): Promise<Category[]> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE isSystemCategory = 1 AND deletedAt IS NULL ORDER BY displayOrder ASC, name ASC'
    );

    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      categories.push(this.mapRowToCategory(result[0].rows.item(i)));
    }

    return categories;
  }

  async findByName(name: string): Promise<Category | null> {
    const result = await this.executeQuery(
      'SELECT * FROM categories WHERE name = ? AND deletedAt IS NULL',
      [name]
    );

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result[0].rows.item(0));
  }

  async getCategoryPath(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentCategory = await this.findById(categoryId);

    while (currentCategory) {
      path.unshift(currentCategory);
      if (currentCategory.parentId) {
        currentCategory = await this.findById(currentCategory.parentId);
      } else {
        break;
      }
    }

    return path;
  }

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await this.findAll();
    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootNodes: CategoryTreeNode[] = [];

    // Create tree nodes
    allCategories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // Build tree structure
    allCategories.forEach(category => {
      const node = categoryMap.get(category.id)!;
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  async hasChildren(categoryId: string): Promise<boolean> {
    const result = await this.executeQuery(
      'SELECT COUNT(*) as count FROM categories WHERE parentId = ? AND deletedAt IS NULL',
      [categoryId]
    );

    return result[0].rows.item(0).count > 0;
  }

  async updateDisplayOrder(categoryId: string, displayOrder: number): Promise<boolean> {
    const result = await this.executeQuery(
      'UPDATE categories SET displayOrder = ?, updatedAt = ? WHERE id = ?',
      [displayOrder, this.now(), categoryId]
    );

    return result[0].rowsAffected > 0;
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      level: row.level,
      icon: row.icon,
      color: row.color,
      description: row.description,
      isSystemCategory: Boolean(row.isSystemCategory),
      displayOrder: row.displayOrder,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
