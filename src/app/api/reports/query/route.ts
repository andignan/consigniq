// app/api/reports/query/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic'

const FORBIDDEN_TABLES = ['users', 'accounts', 'invitations', 'agreements']

const SQL_SYSTEM_PROMPT = `You are a SQL query generator for ConsignIQ, a consignment shop management platform. Generate a single, safe, read-only PostgreSQL SELECT query based on the user's question.

Available tables and columns:
- items: id, account_id, location_id, consignor_id, name, category, condition, price, effective_price, status, intake_date, sold_date, sold_price, donated_at, current_markdown_pct, priced_at
- consignors: id, account_id, location_id, name, phone, email, intake_date, expiry_date, grace_end_date, split_store, split_consignor, status
- price_history: id, account_id, location_id, category, name, condition, priced_at, sold_at, sold_price, days_to_sell, sold
- locations: id, account_id, name, city, state
- markdowns: id, account_id, item_id, original_price, markdown_pct, new_price, applied_at

Rules:
- Always include WHERE account_id = '[ACCOUNT_ID_PLACEHOLDER]'
- SELECT only — never INSERT, UPDATE, DELETE, DROP, ALTER
- Return ONLY the SQL query, no explanation, no markdown
- Use CURRENT_DATE for date comparisons
- Limit results to 100 rows maximum`

function validateSql(sql: string): { valid: boolean; error?: string } {
  const upper = sql.toUpperCase().trim()

  // Must be SELECT
  if (!upper.startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' }
  }

  // Reject dangerous statements
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE)\b/i
  if (dangerous.test(sql)) {
    return { valid: false, error: 'Query contains forbidden SQL operations' }
  }

  // Must include account_id placeholder
  if (!sql.includes('[ACCOUNT_ID_PLACEHOLDER]') && !sql.includes('account_id')) {
    return { valid: false, error: 'Query must include account_id scoping' }
  }

  // Check for forbidden tables
  for (const table of FORBIDDEN_TABLES) {
    const tableRegex = new RegExp(`\\b${table}\\b`, 'i')
    if (tableRegex.test(sql)) {
      return { valid: false, error: `Access to table "${table}" is not allowed` }
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile for account_id, role, location_id
  const { data: profile } = await supabase
    .from('users')
    .select('account_id, role, location_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const { question, location_id } = body as { question?: string; location_id?: string }

  if (!question || !question.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  // Validate location_id is a UUID if provided (prevent SQL injection)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (location_id && location_id !== 'all' && !UUID_RE.test(location_id)) {
    return NextResponse.json({ error: 'Invalid location_id' }, { status: 400 })
  }

  // Validate profile IDs are UUIDs (defense-in-depth)
  if (!UUID_RE.test(profile.account_id)) {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }
  if (profile.location_id && !UUID_RE.test(profile.location_id)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })
  }

  const anthropic = getAnthropicClient()

  // Determine location scoping
  let locationFilter = ''
  if (profile.role === 'staff') {
    // Staff always scoped to their location
    locationFilter = ` AND location_id = '${profile.location_id}'`
  } else if (location_id && location_id !== 'all') {
    // Owner with specific location
    locationFilter = ` AND location_id = '${location_id}'`
  }
  // Owner with "all" = no location filter

  try {
    // Step 1: Generate SQL
    const sqlMessage = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: SQL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question.trim() }],
    })

    let sql = (sqlMessage.content[0].type === 'text' ? sqlMessage.content[0].text : '').trim()

    // Strip markdown code fences if present
    sql = sql.replace(/^```(?:sql)?\n?/i, '').replace(/\n?```$/i, '').trim()

    // Step 2: Validate
    const validation = validateSql(sql)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, sql }, { status: 422 })
    }

    // Step 3: Replace placeholder with real account_id and add location filter
    sql = sql.replace(/'\[ACCOUNT_ID_PLACEHOLDER\]'/g, `'${profile.account_id}'`)
    sql = sql.replace(/\[ACCOUNT_ID_PLACEHOLDER\]/g, `'${profile.account_id}'`)

    // Add location filter if needed (inject after first WHERE ... account_id clause)
    if (locationFilter) {
      // Insert location filter after account_id condition
      const accountIdPattern = /account_id\s*=\s*'[^']+'/i
      const match = sql.match(accountIdPattern)
      if (match) {
        const idx = sql.indexOf(match[0]) + match[0].length
        sql = sql.slice(0, idx) + locationFilter + sql.slice(idx)
      }
    }

    // Step 4: Execute query via Supabase RPC (raw SQL)
    const { data: rows, error: queryError } = await supabase.rpc('execute_readonly_query', {
      query_text: sql,
    })

    // If RPC doesn't exist, fall back to trying a direct query approach
    // Since Supabase doesn't support arbitrary SQL via the client library,
    // we'll use the REST API with the service role key if available
    let resultRows: Record<string, unknown>[] = []
    let columns: string[] = []

    if (queryError) {
      console.error('Report query RPC failed:', queryError.message)
      return NextResponse.json({
        question: question.trim(),
        sql,
        summary: 'Unable to process your question right now. Please try again.',
        rows: [],
        columns: [],
      })
    }

    resultRows = (rows as Record<string, unknown>[]) ?? []
    columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : []

    // Step 5: Generate summary
    const summaryMessage = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: 'You are a helpful assistant for ConsignIQ, a consignment shop management platform. Summarize the query results in 2-3 sentences of plain language. Be specific with numbers.',
      messages: [{
        role: 'user',
        content: `Question: ${question.trim()}\n\nQuery results (${resultRows.length} rows):\n${JSON.stringify(resultRows.slice(0, 20), null, 2)}`,
      }],
    })

    const summary = summaryMessage.content[0].type === 'text' ? summaryMessage.content[0].text : ''

    return NextResponse.json({
      question: question.trim(),
      sql,
      summary,
      rows: resultRows,
      columns,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Report query failed:', msg)
    return NextResponse.json({ error: 'Report query failed: ' + msg }, { status: 500 })
  }
}
