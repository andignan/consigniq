// app/api/items/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const locationId = searchParams.get('location_id')
  const consignorId = searchParams.get('consignor_id')
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  // Single-item fetch by ID
  if (id) {
    const { data, error } = await supabase
      .from('items')
      .select(`*, consignor:consignors(id, name)`)
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ items: [data] })
  }

  let query = supabase
    .from('items')
    .select(`
      *,
      consignor:consignors(id, name)
    `)
    .order('created_at', { ascending: false })

  if (locationId) query = query.eq('location_id', locationId)
  if (consignorId) query = query.eq('consignor_id', consignorId)
  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  const required = ['account_id', 'location_id', 'consignor_id', 'name', 'category', 'condition']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      account_id: body.account_id,
      location_id: body.location_id,
      consignor_id: body.consignor_id,
      name: body.name,
      category: body.category,
      condition: body.condition,
      description: body.description ?? null,
      photo_url: body.photo_url ?? null,
      status: 'pending',
      intake_date: new Date().toISOString().split('T')[0],
      current_markdown_pct: 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Handle status-specific timestamps
  if (updates.status === 'sold' && !updates.sold_date) {
    updates.sold_date = new Date().toISOString().split('T')[0]
  }
  if (updates.status === 'donated' && !updates.donated_at) {
    updates.donated_at = new Date().toISOString()
  }
  if (updates.price && !updates.priced_at) {
    updates.priced_at = new Date().toISOString()
    updates.status = 'priced'
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
