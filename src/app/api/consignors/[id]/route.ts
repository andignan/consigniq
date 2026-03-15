// app/api/consignors/[id]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('consignors')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ consignor: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return auth.error

  const body = await request.json()

  // Allowlist editable fields
  const allowed = ['name', 'phone', 'email', 'notes', 'split_store', 'split_consignor', 'status']
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) filtered[key] = body[key]
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('consignors')
    .update(filtered)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ consignor: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return auth.error

  // Check for sold items — can't delete if there are sold items (would break payout history)
  const { data: soldItems } = await supabase
    .from('items')
    .select('id')
    .eq('consignor_id', params.id)
    .eq('status', 'sold')
    .limit(1)

  if (soldItems && soldItems.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete consignor with sold items — this would break payout history. Archive the consignor instead.' },
      { status: 400 }
    )
  }

  // Delete all items for this consignor first
  await supabase.from('items').delete().eq('consignor_id', params.id)

  // Delete agreements
  await supabase.from('agreements').delete().eq('consignor_id', params.id)

  // Delete the consignor
  const { error } = await supabase
    .from('consignors')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
