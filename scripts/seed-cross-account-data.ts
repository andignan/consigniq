/**
 * Seed script for cross-account pricing data
 * Creates 3 fake accounts with 30-50 price_history records each
 * Run via: npx ts-node scripts/seed-cross-account-data.ts
 *
 * NOTE: Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const CATEGORIES = [
  'Furniture',
  'Jewelry & Silver',
  'China & Crystal',
  'Clothing & Shoes',
  'Collectibles & Art',
]

const CONDITIONS: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair', 'poor']

const ITEMS_BY_CATEGORY: Record<string, { names: string[]; priceRange: [number, number] }> = {
  'Furniture': {
    names: ['Oak Dining Table', 'Mahogany Dresser', 'Leather Armchair', 'Walnut Bookcase', 'Pine Coffee Table', 'Antique Writing Desk', 'Teak Side Table', 'Cherry Wood Cabinet'],
    priceRange: [45, 450],
  },
  'Jewelry & Silver': {
    names: ['Sterling Silver Bracelet', 'Pearl Necklace', 'Gold Earrings', 'Vintage Brooch', 'Silver Tea Set', 'Diamond Ring', 'Turquoise Pendant', 'Cameo Pin'],
    priceRange: [25, 350],
  },
  'China & Crystal': {
    names: ['Royal Doulton Tea Set', 'Waterford Crystal Vase', 'Lenox Dinner Plate Set', 'Fenton Glass Bowl', 'Wedgwood Pitcher', 'Limoges Porcelain Box', 'Depression Glass Goblets'],
    priceRange: [15, 200],
  },
  'Clothing & Shoes': {
    names: ['Vintage Levi\'s Denim Jacket', 'Coach Leather Handbag', 'Burberry Scarf', 'Red Wing Boots', 'Dooney & Bourke Purse', 'Pendleton Wool Coat', 'Ferragamo Loafers'],
    priceRange: [20, 180],
  },
  'Collectibles & Art': {
    names: ['Oil Painting Landscape', 'Hummel Figurine', 'First Edition Book', 'Vintage Record Collection', 'Art Deco Lamp', 'Bronze Sculpture', 'Signed Lithograph'],
    priceRange: [30, 300],
  },
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomTimestamp(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - randomInt(1, daysBack))
  return d.toISOString()
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function seed() {
  console.log('Creating 3 seed accounts...')

  const accountNames = ['Vintage Treasures Co', 'Estate Finds LLC', 'Second Chance Resale']
  const accountIds: string[] = []

  for (const name of accountNames) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ name, tier: 'pro', status: 'active' })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to create account "${name}":`, error.message)
      continue
    }
    accountIds.push(data.id)
    console.log(`  Created account: ${name} (${data.id})`)
  }

  if (accountIds.length === 0) {
    console.error('No accounts created. Exiting.')
    process.exit(1)
  }

  // Create a location per account
  const locationIds: Record<string, string> = {}
  for (const accountId of accountIds) {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        account_id: accountId,
        name: 'Main Store',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to create location for ${accountId}:`, error.message)
      continue
    }
    locationIds[accountId] = data.id
  }

  console.log('\nSeeding price_history records...')

  let totalRecords = 0

  for (const accountId of accountIds) {
    if (!locationIds[accountId]) {
      console.log(`  Skipping ${accountId} — no location`)
      continue
    }
    const recordCount = randomInt(30, 50)
    const records = []

    for (let i = 0; i < recordCount; i++) {
      const category = pickRandom(CATEGORIES)
      const config = ITEMS_BY_CATEGORY[category]
      const name = pickRandom(config.names)
      const condition = pickRandom(CONDITIONS)
      const sold = Math.random() > 0.2 // 80% sold
      const pricedAt = randomTimestamp(180)
      const soldAt = sold ? randomTimestamp(90) : null
      const soldPrice = sold ? randomPrice(config.priceRange[0], config.priceRange[1]) : null
      const daysToSell = sold ? randomInt(3, 45) : null

      records.push({
        account_id: accountId,
        location_id: locationIds[accountId],
        name,
        category,
        condition,
        sold,
        sold_price: soldPrice,
        sold_at: soldAt,
        priced_at: pricedAt,
        days_to_sell: daysToSell,
        description: `${condition} condition ${name.toLowerCase()}`,
      })
    }

    const { error } = await supabase.from('price_history').insert(records)
    if (error) {
      console.error(`Failed to insert records for ${accountId}:`, error.message)
    } else {
      totalRecords += recordCount
      console.log(`  Account ${accountId}: ${recordCount} records`)
    }
  }

  console.log(`\nDone! Seeded ${totalRecords} price_history records across ${accountIds.length} accounts.`)
}

seed().catch(console.error)
