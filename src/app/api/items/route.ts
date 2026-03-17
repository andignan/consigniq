// app/api/items/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

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
      consignor:consignors(id, name),
      item_photos!left(public_url, is_primary)
    `)
    .order('created_at', { ascending: false })

  if (locationId) query = query.eq('location_id', locationId)
  if (consignorId) query = query.eq('consignor_id', consignorId)
  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten primary photo URL into each item
  const items = (data ?? []).map((item: Record<string, unknown>) => {
    const photos = item.item_photos as Array<{ public_url: string; is_primary: boolean }> | null
    const primary = photos?.find(p => p.is_primary) ?? photos?.[0]
    return {
      ...item,
      primary_photo_url: primary?.public_url ?? null,
      item_photos: undefined, // remove raw join data
    }
  })

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()

  console.log('[items POST] body:', JSON.stringify({ account_id: body.account_id, location_id: body.location_id, name: body.name, consignor_id: body.consignor_id, price: body.price }))

  // consignor_id is optional (null for Solo tier users)
  const required = ['account_id', 'location_id', 'name', 'category', 'condition']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return auth.error

  // If price is provided (e.g., from Price Lookup save), mark as priced
  const hasPrice = body.price != null
  const today = new Date()
  const intakeDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('items')
    .insert({
      account_id: body.account_id,
      location_id: body.location_id,
      consignor_id: body.consignor_id ?? null,
      name: body.name,
      category: body.category,
      condition: body.condition,
      description: body.description ?? null,
      photo_url: body.photo_url ?? null,
      price: body.price ?? null,
      low_price: body.low_price ?? null,
      high_price: body.high_price ?? null,
      ai_reasoning: body.ai_reasoning ?? null,
      status: hasPrice ? 'priced' : 'pending',
      priced_at: hasPrice ? new Date().toISOString() : null,
      intake_date: intakeDate,
      current_markdown_pct: 0,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[items POST] insert error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[items POST] success:', data?.id)
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

  if (error) {
    console.error('[items PATCH] error:', error.message, error.details, error.hint, error.code)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // M5: Write price_history record when item is marked sold (with error handling)
  if (updates.status === 'sold' && data) {
    try {
      const item = data as Record<string, unknown>
      const pricedAt = item.priced_at as string | null
      const soldDate = item.sold_date as string | null
      let daysToSell: number | null = null
      if (pricedAt && soldDate) {
        const priced = new Date(pricedAt)
        const sold = new Date(soldDate + 'T00:00:00')
        daysToSell = Math.max(0, Math.floor((sold.getTime() - priced.getTime()) / (1000 * 60 * 60 * 24)))
      }

      await supabase.from('price_history').insert({
        account_id: item.account_id,
        location_id: item.location_id,
        item_id: item.id,
        category: item.category,
        name: item.name,
        description: item.description ?? null,
        condition: item.condition,
        priced_at: item.priced_at ?? null,
        sold_at: item.sold_date ?? null,
        sold_price: updates.sold_price ?? item.sold_price ?? item.price ?? null,
        days_to_sell: daysToSell,
        sold: true,
      })
    } catch (err) {
      console.error('Failed to write price_history:', err instanceof Error ? err.message : String(err))
    }
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Cannot delete sold items (affects payout history)
  const { data: item } = await supabase
    .from('items')
    .select('status')
    .eq('id', id)
    .single()

  if (item?.status === 'sold') {
    return NextResponse.json({ error: 'Cannot delete sold items — this would affect payout history' }, { status: 400 })
  }

  // Clean up photos from storage before deleting the item (cascade deletes item_photos rows)
  try {
    const { data: photos } = await supabase
      .from('item_photos')
      .select('storage_path')
      .eq('item_id', id)

    if (photos && photos.length > 0) {
      const paths = photos.map(p => p.storage_path)
      await supabase.storage.from('item-photos').remove(paths)
    }
  } catch (err) {
    console.error('Photo cleanup failed:', err instanceof Error ? err.message : String(err))
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
