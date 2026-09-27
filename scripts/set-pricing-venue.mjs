// Set the pricing_venue for an account by email.
//
// Usage: node scripts/set-pricing-venue.mjs <email> <online_resale|brick_and_mortar>
//
// Prerequisite: migration 20260517000000_pricing_venue.sql must be applied first
// (via Supabase dashboard SQL editor or `supabase db push`).
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local automatically.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

try {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, k, v] = m
    if (process.env[k]) continue
    process.env[k] = v.replace(/^['"]|['"]$/g, '')
  }
} catch (err) {
  console.error(`Could not read ${envPath}: ${err.message}`)
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const email = process.argv[2]
const venue = process.argv[3]

if (!email || !venue) {
  console.error('Usage: node scripts/set-pricing-venue.mjs <email> <online_resale|brick_and_mortar>')
  process.exit(1)
}

if (!['online_resale', 'brick_and_mortar'].includes(venue)) {
  console.error(`Invalid venue "${venue}". Must be online_resale or brick_and_mortar.`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\nLooking up account for ${email}...`)

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, account_id')
    .ilike('email', email)
    .single()

  if (userErr || !user) {
    console.error(`No user found for ${email}: ${userErr?.message ?? 'not found'}`)
    process.exit(1)
  }

  console.log(`  Found user ${user.email} (account_id=${user.account_id})`)

  const { data: account, error: acctErr } = await supabase
    .from('accounts')
    .select('id, name, tier, pricing_venue')
    .eq('id', user.account_id)
    .single()

  if (acctErr || !account) {
    console.error(`Could not load account ${user.account_id}: ${acctErr?.message ?? 'not found'}`)
    process.exit(1)
  }

  if (account.pricing_venue === undefined) {
    console.error('accounts.pricing_venue column does not exist yet. Apply migration 20260517000000_pricing_venue.sql first.')
    process.exit(1)
  }

  console.log(`  Current account: ${account.name} (tier=${account.tier}, pricing_venue=${account.pricing_venue})`)

  if (account.pricing_venue === venue) {
    console.log(`\nAlready set to ${venue}. No change needed.`)
    return
  }

  const { error: updateErr } = await supabase
    .from('accounts')
    .update({ pricing_venue: venue })
    .eq('id', account.id)

  if (updateErr) {
    console.error(`Update failed: ${updateErr.message}`)
    process.exit(1)
  }

  console.log(`\nUpdated ${account.name}: pricing_venue ${account.pricing_venue} → ${venue}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
