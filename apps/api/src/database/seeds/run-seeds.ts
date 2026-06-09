import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { inArray } from 'drizzle-orm'
import * as schema from '../schema'
import { CONFIG_SEED } from './config.seed'
import { CATEGORIES_SEED, CATEGORY_ATTRIBUTES_SEED } from './categories.seed'

async function runSeeds(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  console.log('▶ Seeding system_configs...')
  for (const entry of CONFIG_SEED) {
    await db
      .insert(schema.systemConfigs)
      .values({
        key: entry.key,
        category: entry.category,
        label: entry.label,
        dataType: entry.dataType as typeof schema.systemConfigs.$inferInsert['dataType'],
        value: entry.value as unknown as Record<string, unknown>,
        defaultValue: entry.defaultValue as unknown as Record<string, unknown>,
        unit: entry.unit ?? null,
        isPublic: entry.isPublic,
        validation: entry.validation as Record<string, unknown> | null,
      })
      .onConflictDoNothing()
  }
  console.log(`  ✓ ${CONFIG_SEED.length} configs seeded`)

  console.log('▶ Seeding categories...')
  // Primero insertar categorías raíz (sin parentSlug)
  const slugToId = new Map<string, string>()
  const roots = CATEGORIES_SEED.filter((c) => c.parentSlug === null)
  const children = CATEGORIES_SEED.filter((c) => c.parentSlug !== null)

  for (const cat of roots) {
    const [inserted] = await db
      .insert(schema.categories)
      .values({ name: cat.name, slug: cat.slug, isCollectible: cat.isCollectible })
      .onConflictDoUpdate({ target: schema.categories.slug, set: { name: cat.name } })
      .returning({ id: schema.categories.id })
    slugToId.set(cat.slug, inserted.id)
  }

  for (const cat of children) {
    const parentId = slugToId.get(cat.parentSlug!)
    const [inserted] = await db
      .insert(schema.categories)
      .values({ name: cat.name, slug: cat.slug, isCollectible: cat.isCollectible, parentId })
      .onConflictDoUpdate({ target: schema.categories.slug, set: { name: cat.name, parentId } })
      .returning({ id: schema.categories.id })
    slugToId.set(cat.slug, inserted.id)
  }
  console.log(`  ✓ ${CATEGORIES_SEED.length} categories seeded`)

  console.log('▶ Seeding category_attributes (idempotent purge + insert)...')
  // Purge attrs of the categories we are about to (re)seed so reruns don't
  // duplicate rows. We only touch categories present in the seed.
  const targetCategoryIds = Array.from(
    new Set(
      CATEGORY_ATTRIBUTES_SEED.map((a) => slugToId.get(a.categorySlug)).filter(
        (v): v is string => !!v,
      ),
    ),
  )
  if (targetCategoryIds.length > 0) {
    await db
      .delete(schema.categoryAttributes)
      .where(inArray(schema.categoryAttributes.categoryId, targetCategoryIds))
  }
  for (const attr of CATEGORY_ATTRIBUTES_SEED) {
    const categoryId = slugToId.get(attr.categorySlug)
    if (!categoryId) {
      console.warn(`  ⚠ Category not found for slug: ${attr.categorySlug}`)
      continue
    }
    await db.insert(schema.categoryAttributes).values({
      categoryId,
      key: attr.key,
      label: attr.label,
      type: attr.type,
      options: attr.options ? { values: attr.options } : null,
      isRequired: attr.isRequired ?? false,
      isVariant: attr.isVariant ?? false,
      sortOrder: attr.sortOrder ?? 0,
    })
  }
  console.log(`  ✓ ${CATEGORY_ATTRIBUTES_SEED.length} category attributes seeded`)

  console.log('▶ Populating depth + path_slugs on categories...')
  const allCats = await db.select().from(schema.categories)
  const byId = new Map(allCats.map((c) => [c.id, c]))
  for (const cat of allCats) {
    const path: string[] = []
    let depth = 0
    let cursor: (typeof cat) | undefined = cat
    while (cursor) {
      path.unshift(cursor.slug)
      depth = path.length - 1
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    }
    await db
      .update(schema.categories)
      .set({ depth, pathSlugs: path })
      .where(inArray(schema.categories.id, [cat.id]))
  }
  console.log(`  ✓ ${allCats.length} category depths/paths populated`)

  await pool.end()
  console.log('✅ All seeds completed successfully')
}

runSeeds().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
