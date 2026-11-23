import { DatabaseClient, Category, CategoryType } from '../types';

export const CategoryRepository = {
  async getAll(client: DatabaseClient): Promise<Category[]> {
    return await client.execute<Category>(
      `SELECT * FROM categories WHERE is_archived = 0 ORDER BY name ASC;`
    );
  },

  async getByType(client: DatabaseClient, type: CategoryType): Promise<Category[]> {
    return await client.execute<Category>(
      `SELECT * FROM categories WHERE type = ? AND is_archived = 0 ORDER BY name ASC;`,
      [type]
    );
  },

  async getById(client: DatabaseClient, id: string): Promise<Category | null> {
    const rows = await client.execute<Category>(
      `SELECT * FROM categories WHERE id = ? LIMIT 1;`,
      [id]
    );
    return rows[0] || null;
  },

  async create(
    client: DatabaseClient,
    category: Omit<Category, 'is_default' | 'is_archived'>
  ): Promise<Category> {
    await client.executeMutation(
      `INSERT INTO categories (id, name, type, icon, color, is_default, is_archived)
       VALUES (?, ?, ?, ?, ?, 0, 0);`,
      [category.id, category.name, category.type, category.icon, category.color]
    );
    return {
      ...category,
      is_default: 0,
      is_archived: 0,
    };
  },

  async update(
    client: DatabaseClient,
    id: string,
    updates: Partial<Pick<Category, 'name' | 'icon' | 'color'>>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    if (fields.length === 0) return;
    values.push(id);

    await client.executeMutation(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?;`,
      values
    );
  },

  async archive(client: DatabaseClient, id: string): Promise<void> {
    await client.executeMutation(
      `UPDATE categories SET is_archived = 1 WHERE id = ?;`,
      [id]
    );
  },
};
