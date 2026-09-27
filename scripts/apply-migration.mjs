// Apply a SQL migration file to the linked Supabase project via the Management API.
//
// Usage: node scripts/apply-migration.mjs <path-to-sql-file>
//
// Reads:
//   - SUPABASE_ACCESS_TOKEN (PAT) from .env.local
//   - NEXT_PUBLIC_SUPABASE_URL from .env.local (to derive project ref)
//
// Uses the Supabase Management API (POST /v1/projects/{ref}/database/query) which
// runs SQL via the platform layer — no DB password required.

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

const PAT = process.env.SUPABASE_ACCESS_TOKEN
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!PAT) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local')
  console.error('Generate one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

if (!URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

const refMatch = URL.match(/https?:\/\/([^.]+)\.supabase\.co/)
if (!refMatch) {
  console.error(`Could not derive project ref from URL: ${URL}`)
  process.exit(1)
}
const PROJECT_REF = refMatch[1]

const migrationPath = process.argv[2]
if (!migrationPath) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

let sql
try {
  sql = readFileSync(resolve(process.cwd(), migrationPath), 'utf8')
} catch (err) {
  console.error(`Could not read migration file ${migrationPath}: ${err.message}`)
  process.exit(1)
}

if (!sql.trim()) {
  console.error('Migration file is empty')
  process.exit(1)
}

console.log(`\nApplying migration to project ${PROJECT_REF}`)
console.log(`File: ${migrationPath}`)
console.log(`SQL preview (first 300 chars):\n${sql.substring(0, 300)}${sql.length > 300 ? '...' : ''}\n`)

const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

try {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }

  if (!res.ok) {
    console.error(`Migration failed (HTTP ${res.status}):`)
    console.error(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
    process.exit(1)
  }

  console.log('Migration applied successfully.')
  if (Array.isArray(body) && body.length > 0) {
    console.log('Result rows:', JSON.stringify(body, null, 2))
  } else if (body && Object.keys(body).length > 0) {
    console.log('Response:', JSON.stringify(body, null, 2))
  }
} catch (err) {
  console.error('Request failed:', err.message)
  process.exit(1)
}
