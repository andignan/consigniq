// Read-only discovery: find any trace of an email + list soft-deleted accounts.
// Usage: node scripts/find-account.mjs <email>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const raw = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    if (process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch (err) {
  console.error(`Could not read .env.local: ${err.message}`)
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/find-account.mjs <email>')
  process.exit(1)
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`\n=== Searching for ${email} ===\n`)

// 1. users table — exact, ilike, partial
{
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, account_id, platform_role')
    .ilike('email', `%${email.split('@')[0]}%`)
  console.log(`users table (ilike on local-part "${email.split('@')[0]}"):`)
  if (error) console.log(`  error: ${error.message}`)
  else if (!data?.length) console.log('  (none)')
  else for (const u of data) console.log(`  ${u.email.padEnd(40)} role=${u.role} account=${u.account_id} platform=${u.platform_role ?? '-'}`)
  console.log()
}

// 2. auth.users — paginate
console.log('Supabase auth users matching email (any case):')
{
  let page = 1
  let found = []
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) { console.log(`  error: ${error.message}`); break }
    if (!data.users?.length) break
    for (const u of data.users) {
      if (u.email && u.email.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
        found.push(u)
      }
    }
    if (data.users.length < 200) break
    page++
    if (page > 20) break
  }
  if (!found.length) console.log('  (none)')
  else for (const u of found) console.log(`  ${u.email.padEnd(40)} id=${u.id} created=${u.created_at}`)
  console.log()
}

// 3. soft-deleted accounts
{
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, tier, status, account_type, deleted_at, deletion_reason')
    .eq('status', 'deleted')
    .order('deleted_at', { ascending: false })
  console.log('All soft-deleted accounts (status=deleted):')
  if (error) console.log(`  error: ${error.message}`)
  else if (!data?.length) console.log('  (none)')
  else for (const a of data) console.log(`  ${a.id} | ${a.name.padEnd(30)} | ${a.tier} | ${a.account_type} | deleted_at=${a.deleted_at}`)
  console.log()
}

// 4. accounts with this email's local-part in name (heuristic)
{
  const local = email.split('@')[0]
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, tier, status, account_type, deleted_at')
    .ilike('name', `%${local}%`)
  console.log(`Accounts with name like "${local}":`)
  if (error) console.log(`  error: ${error.message}`)
  else if (!data?.length) console.log('  (none)')
  else for (const a of data) console.log(`  ${a.id} | ${a.name.padEnd(30)} | ${a.status} | account_type=${a.account_type} | deleted_at=${a.deleted_at ?? '-'}`)
}
