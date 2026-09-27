// Force-purge a soft-deleted ConsignIQ account so the owner email can be re-registered.
// Mirrors the hard-delete sequence in src/app/api/admin/accounts/delete/route.ts (non-paid branch).
//
// Usage: node scripts/force-purge-account.mjs <email>
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local automatically.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

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
if (!email) {
  console.error('Usage: node scripts/force-purge-account.mjs <email>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\nLooking up account for ${email}...`)

  const { data: usersByEmail, error: userErr } = await supabase
    .from('users')
    .select('id, email, full_name, role, account_id')
    .ilike('email', email)

  if (userErr) {
    console.error(`users lookup failed: ${userErr.message}`)
    process.exit(1)
  }
  if (!usersByEmail || usersByEmail.length === 0) {
    console.error(`No users row found with email ${email}.`)
    process.exit(1)
  }

  const accountIds = [...new Set(usersByEmail.map(u => u.account_id))]
  if (accountIds.length > 1) {
    console.error(`Email is on multiple accounts (${accountIds.join(', ')}). Aborting — resolve manually.`)
    process.exit(1)
  }
  const accountId = accountIds[0]

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, name, tier, status, account_type, stripe_customer_id, deleted_at, deletion_reason, is_system')
    .eq('id', accountId)
    .single()

  if (accErr || !account) {
    console.error(`Account ${accountId} not found.`)
    process.exit(1)
  }

  if (account.is_system) {
    console.error('Refusing to purge a system account.')
    process.exit(1)
  }

  // Count what we're about to delete
  const tables = ['item_photos', 'items', 'consignors', 'price_history', 'agreements', 'markdowns', 'invitations', 'locations']
  const counts = {}
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('account_id', accountId)
    counts[t] = count ?? 0
  }
  const { data: allUsers } = await supabase.from('users').select('id, email, role').eq('account_id', accountId)
  counts.users = allUsers?.length ?? 0

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ABOUT TO PERMANENTLY PURGE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Account ID:      ${account.id}`)
  console.log(`  Account name:    ${account.name}`)
  console.log(`  Tier:            ${account.tier}`)
  console.log(`  Account type:    ${account.account_type}`)
  console.log(`  Status:          ${account.status}`)
  console.log(`  deleted_at:      ${account.deleted_at ?? '(not soft-deleted)'}`)
  console.log(`  stripe_customer: ${account.stripe_customer_id ?? '(none)'}`)
  console.log('  Rows to delete:')
  for (const [t, c] of Object.entries(counts)) console.log(`    ${t.padEnd(16)} ${c}`)
  console.log(`  Auth users to delete: ${allUsers?.map(u => u.email).join(', ') || '(none)'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (account.status !== 'deleted') {
    console.log(`⚠️  Status is '${account.status}', not 'deleted'. This account was NOT soft-deleted via the admin flow.`)
    console.log(`   If this is wrong, abort now. Continuing will hard-delete it anyway.\n`)
  }

  const rl = createInterface({ input, output })
  const typed = await rl.question(`Type the account name to confirm purge:\n  > `)
  rl.close()

  if (typed.trim().toLowerCase() !== account.name.trim().toLowerCase()) {
    console.error(`\nName did not match (got "${typed}", expected "${account.name}"). Aborted.`)
    process.exit(1)
  }

  console.log('\nProceeding with hard delete...\n')

  // 1. Photo storage cleanup
  try {
    const { data: photos } = await supabase
      .from('item_photos')
      .select('storage_path')
      .eq('account_id', accountId)
    if (photos && photos.length > 0) {
      console.log(`  Removing ${photos.length} photos from storage...`)
      for (let i = 0; i < photos.length; i += 100) {
        const batch = photos.slice(i, i + 100).map(p => p.storage_path)
        await supabase.storage.from('item-photos').remove(batch)
      }
    }
  } catch (err) {
    console.error(`  Photo storage cleanup failed: ${err.message}`)
  }

  // 2. Delete data tables in FK order
  const dataTables = ['item_photos', 'items', 'consignors', 'price_history', 'agreements', 'markdowns', 'invitations']
  for (const t of dataTables) {
    const { error } = await supabase.from(t).delete().eq('account_id', accountId)
    if (error) console.error(`  ${t} delete failed: ${error.message}`)
    else console.log(`  ✓ ${t}`)
  }

  // 3. Locations
  {
    const { error } = await supabase.from('locations').delete().eq('account_id', accountId)
    if (error) console.error(`  locations delete failed: ${error.message}`)
    else console.log('  ✓ locations')
  }

  // 4. Users rows
  {
    const { error } = await supabase.from('users').delete().eq('account_id', accountId)
    if (error) console.error(`  users delete failed: ${error.message}`)
    else console.log('  ✓ users')
  }

  // 5. Account row
  {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) console.error(`  accounts delete failed: ${error.message}`)
    else console.log('  ✓ accounts')
  }

  // 6. Auth users
  for (const u of allUsers ?? []) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(u.id)
      if (error) console.error(`  auth user ${u.email} delete failed: ${error.message}`)
      else console.log(`  ✓ auth user ${u.email}`)
    } catch (err) {
      console.error(`  auth user ${u.email} delete threw: ${err.message}`)
    }
  }

  // 7. Sanity check — confirm the email is no longer present in auth
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    const lingering = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (lingering) {
      console.log(`\n⚠️  Auth user with email ${email} still exists (id ${lingering.id}). Deleting...`)
      await supabase.auth.admin.deleteUser(lingering.id)
      console.log(`  ✓ removed lingering auth user ${lingering.id}`)
    }
  } catch (err) {
    console.error(`  Lingering-auth check failed: ${err.message}`)
  }

  console.log('\nDone. The email should now be free for re-signup as a solo user.')
}

main().catch(err => {
  console.error('\nFatal:', err)
  process.exit(1)
})
