import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile(supabase, 'account_id')
  if (auth.error) return auth.error

  const itemId = params.id
  const { photo_ids } = await request.json() as { photo_ids?: string[] }

  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return NextResponse.json({ error: 'photo_ids array is required' }, { status: 400 })
  }

  // Verify all photos belong to this item and account
  const { data: existing } = await supabase
    .from('item_photos')
    .select('id')
    .eq('item_id', itemId)
    .eq('account_id', auth.profile.account_id)

  const existingIds = new Set((existing ?? []).map(p => p.id))
  const allValid = photo_ids.every(id => existingIds.has(id))

  if (!allValid || photo_ids.length !== existingIds.size) {
    return NextResponse.json(
      { error: 'Invalid photo IDs — all must belong to this item' },
      { status: 400 }
    )
  }

  // Update display_order and is_primary
  for (let i = 0; i < photo_ids.length; i++) {
    await supabase
      .from('item_photos')
      .update({
        display_order: i,
        is_primary: i === 0,
      })
      .eq('id', photo_ids[i])
  }

  return NextResponse.json({ success: true })
}
