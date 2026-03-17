import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile(supabase, 'account_id')
  if (auth.error) return auth.error

  const { id: itemId, photoId } = params

  // Verify photo belongs to item and account
  const { data: photo, error: fetchErr } = await supabase
    .from('item_photos')
    .select('id, storage_path, is_primary, display_order')
    .eq('id', photoId)
    .eq('item_id', itemId)
    .eq('account_id', auth.profile.account_id)
    .single()

  if (fetchErr || !photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  // Delete from storage (non-critical)
  try {
    await supabase.storage.from('item-photos').remove([photo.storage_path])
  } catch (err) {
    console.error('Storage delete failed:', err instanceof Error ? err.message : String(err))
  }

  // Delete the row
  await supabase.from('item_photos').delete().eq('id', photoId)

  // Get remaining photos for this item
  const { data: remaining } = await supabase
    .from('item_photos')
    .select('id, display_order')
    .eq('item_id', itemId)
    .order('display_order', { ascending: true })

  if (remaining && remaining.length > 0) {
    // Re-normalize display_order and promote primary if needed
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from('item_photos')
        .update({
          display_order: i,
          is_primary: i === 0,
        })
        .eq('id', remaining[i].id)
    }
  }

  return NextResponse.json({ deleted: true })
}
