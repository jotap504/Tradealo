import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_TOKEN } from '../database/database.module';
import * as schema from '../database/schema';

type DB = NodePgDatabase<typeof schema>;
type Category = typeof schema.categories.$inferSelect;
type CategoryAttribute = typeof schema.categoryAttributes.$inferSelect;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CategoryNode extends Omit<Category, 'parentId'> {
  children: CategoryNode[];
}

export interface CategoryDetail extends Category {
  attributes: CategoryAttribute[];
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DB) {}

  async getAll(): Promise<Category[]> {
    return this.db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
  }

  async getTree(): Promise<CategoryNode[]> {
    const all = await this.getAll();
    return this.buildTree(all);
  }

  async getBySlug(idOrSlug: string): Promise<CategoryDetail> {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const predicate = isUuid
      ? eq(schema.categories.id, idOrSlug)
      : eq(schema.categories.slug, idOrSlug);

    const [category] = await this.db
      .select()
      .from(schema.categories)
      .where(predicate)
      .limit(1);

    if (!category)
      throw new NotFoundException(`Category not found: ${idOrSlug}`);

    const attributes = category.isCollectible
      ? await this.db
          .select()
          .from(schema.categoryAttributes)
          .where(eq(schema.categoryAttributes.categoryId, category.id))
          .orderBy(asc(schema.categoryAttributes.sortOrder))
      : [];

    return { ...category, attributes };
  }

  async getRoots(): Promise<Category[]> {
    return this.db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.sortOrder));
  }

  private buildTree(flat: Category[]): CategoryNode[] {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const cat of flat) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of flat) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
