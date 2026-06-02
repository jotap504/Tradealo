import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './src/database/schema';

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://tradealo:password@localhost:5432/tradealo';
  console.log('🔌 Connecting to database for verification:', connectionString);
  
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(pool, { schema });
  
  try {
    // 1. Verify User
    const [beto] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'beto@gmail.com'))
      .limit(1);

    if (!beto) {
      console.error('❌ Error: Seller beto@gmail.com was not found in the database!');
      await pool.end();
      process.exit(1);
    }

    console.log('\n👤 --- SELLER VERIFICATION ---');
    console.log(`Email: ${beto.email}`);
    console.log(`Role: ${beto.role}`);
    console.log(`Status: ${beto.status}`);
    
    // Check Profile
    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, beto.id))
      .limit(1);
    console.log(`Username: ${profile?.username || 'N/A'}`);
    console.log(`Name: ${profile?.firstName} ${profile?.lastName}`);
    console.log(`Location: ${profile?.city}, ${profile?.province}`);

    // Check Wallet
    const [wallet] = await db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.userId, beto.id))
      .limit(1);
    console.log(`Wallet Balance: ${wallet?.balance} tokens`);

    // Check Reputation
    const [reputation] = await db
      .select()
      .from(schema.reputationScores)
      .where(eq(schema.reputationScores.userId, beto.id))
      .limit(1);
    console.log(`Reputation Score (as seller): ${reputation?.asSellerAvg} (${reputation?.asSellerCount} reviews)`);

    // 2. Verify Listings Count
    const dbListings = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.userId, beto.id));
    
    console.log('\n📦 --- LISTINGS VERIFICATION ---');
    console.log(`Total listings owned by beto: ${dbListings.length}`);

    // Count listings by category
    const categoryCounts: Record<string, number> = {};
    const allCategories = await db.select().from(schema.categories);
    const categoryNameMap = new Map<string, string>();
    for (const c of allCategories) {
      categoryNameMap.set(c.id, c.name);
    }

    for (const listing of dbListings) {
      const catName = categoryNameMap.get(listing.categoryId) || 'Unknown';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    }
    console.log('Listings per Category:');
    console.table(categoryCounts);

    // Verify Sale Type & Stock system
    const nonStockListings = dbListings.filter(l => l.saleType !== 'stock' || l.stock === null || l.stock <= 0);
    if (nonStockListings.length > 0) {
      console.warn(`⚠️ Warning: Found ${nonStockListings.length} listings without active stock system!`);
    } else {
      console.log('✓ All listings verified to have active stock system (saleType: "stock" & stock > 0)');
    }

    // Verify Standard Modality
    const nonStandardListings = dbListings.filter(l => l.type !== 'standard' || l.creditsSpent !== 1);
    if (nonStandardListings.length > 0) {
      console.warn(`⚠️ Warning: Found ${nonStandardListings.length} listings that are not standard modality (1 token)!`);
    } else {
      console.log('✓ All listings verified to be standard modality (consuming 1 credit)');
    }

    // 3. Verify Images Count
    let totalImages = 0;
    let listingsWithCorrectImageCount = 0;

    for (const listing of dbListings) {
      const imgs = await db
        .select()
        .from(schema.listingImages)
        .where(eq(schema.listingImages.listingId, listing.id));
      
      totalImages += imgs.length;
      if (imgs.length >= 3) {
        listingsWithCorrectImageCount++;
      }
    }
    console.log('\n🖼️ --- IMAGES VERIFICATION ---');
    console.log(`Total listing images created: ${totalImages}`);
    console.log(`Listings with at least 3 photos: ${listingsWithCorrectImageCount}/${dbListings.length}`);

    // 4. Sample check for Collectible Attributes
    console.log('\n🃏 --- SAMPLE COLLECTIBLE ATTRIBUTES ---');
    const collectibleSample = dbListings.find(l => l.isCollectible && l.collectibleAttributes !== null);
    if (collectibleSample) {
      console.log(`Title: ${collectibleSample.title}`);
      console.log(`Collectible Attributes JSON:`, JSON.stringify(collectibleSample.collectibleAttributes, null, 2));
    } else {
      console.warn('⚠️ Warning: No collectible listings with attributes found!');
    }

  } catch (err) {
    console.error('❌ Error during verification:', err);
  }
  
  await pool.end();
  console.log('\n✓ Database check finished.');
}

main();
