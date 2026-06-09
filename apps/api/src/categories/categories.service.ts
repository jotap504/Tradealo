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

    const attributes = await this.getAttributesForCategory(category.id);
    return { ...category, attributes };
  }

  /**
   * Devuelve atributos de la categoría, heredando de los ancestros si la
   * categoría hoja no tiene propios. Esto permite definir atributos a nivel
   * "Calzado > Zapatillas" sin repetirlos en cada subcategoría hija.
   */
  async getAttributesForCategory(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    let cursorId: string | null = categoryId;
    while (cursorId) {
      const attrs = await this.db
        .select()
        .from(schema.categoryAttributes)
        .where(eq(schema.categoryAttributes.categoryId, cursorId))
        .orderBy(asc(schema.categoryAttributes.sortOrder));
      if (attrs.length > 0) return attrs;

      const [parent] = await this.db
        .select({ parentId: schema.categories.parentId })
        .from(schema.categories)
        .where(eq(schema.categories.id, cursorId))
        .limit(1);
      cursorId = parent?.parentId ?? null;
    }
    return [];
  }

  async findBySlugPath(slugs: string[]): Promise<Category | null> {
    if (slugs.length === 0) return null;
    const all = await this.getAll();
    const bySlug = new Map(all.map((c) => [c.slug, c]));
    const last = bySlug.get(slugs[slugs.length - 1]);
    if (!last) return null;

    let cursor: Category | undefined = last;
    for (let i = slugs.length - 1; i > 0; i -= 1) {
      if (!cursor) return null;
      const expectedParentSlug = slugs[i - 1];
      const parent: Category | undefined = cursor.parentId
        ? all.find((c) => c.id === cursor!.parentId)
        : undefined;
      if (!parent || parent.slug !== expectedParentSlug) return null;
      cursor = parent;
    }
    return last;
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
