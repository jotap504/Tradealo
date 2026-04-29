import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../schema'
import { CONFIG_SEED } from './config.seed'
import { CATEGORIES_SEED, COLLECTIBLE_ATTRIBUTES_SEED } from './categories.seed'

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

  console.log('▶ Seeding collectible_attributes...')
  for (const attr of COLLECTIBLE_ATTRIBUTES_SEED) {
    const categoryId = slugToId.get(attr.categorySlug)
    if (!categoryId) {
      console.warn(`  ⚠ Category not found for slug: ${attr.categorySlug}`)
      continue
    }
    await db
      .insert(schema.categoryAttributes)
      .values({
        categoryId,
        key: attr.key,
        label: attr.label,
        type: attr.type,
        options: attr.options ? { values: attr.options } : null,
        isRequired: attr.isRequired,
        sortOrder: attr.sortOrder,
      })
      .onConflictDoNothing()
  }
  console.log(`  ✓ ${COLLECTIBLE_ATTRIBUTES_SEED.length} collectible attributes seeded`)

  await pool.end()
  console.log('✅ All seeds completed successfully')
}

runSeeds().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
