import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'

const MAX_PHOTOS = 3
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile(supabase, 'account_id')
  if (auth.error) return auth.error

  const { data: photos, error } = await supabase
    .from('item_photos')
    .select('*')
    .eq('item_id', params.id)
    .eq('account_id', auth.profile.account_id)
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photos: photos ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile(supabase, 'account_id')
  if (auth.error) return auth.error

  const itemId = params.id

  // Verify item belongs to this account
  const { data: item, error: itemErr } = await supabase
    .from('items')
    .select('id, account_id')
    .eq('id', itemId)
    .eq('account_id', auth.profile.account_id)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  // Check photo count
  const { count } = await supabase
    .from('item_photos')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', itemId)

  if ((count ?? 0) >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PHOTOS} photos per item` },
      { status: 400 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('photo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'photo file is required' }, { status: 400 })
  }

  if (!VALID_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, and WebP images are supported' },
      { status: 400 }
    )
  }

  // Upload to Supabase Storage
  const rand = Math.random().toString(36).slice(2, 8)
  const storagePath = `items/${itemId}/photo_${Date.now()}_${rand}.jpg`

  const { error: uploadErr } = await supabase.storage
    .from('item-photos')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    console.error('Photo upload failed:', uploadErr.message)
    return NextResponse.json({ error: 'Photo upload failed' }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('item-photos')
    .getPublicUrl(storagePath)

  const currentCount = count ?? 0

  // Insert item_photos row
  const { data: photo, error: insertErr } = await supabase
    .from('item_photos')
    .insert({
      item_id: itemId,
      account_id: auth.profile.account_id,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      display_order: currentCount,
      is_primary: currentCount === 0,
    })
    .select()
    .single()

  if (insertErr) {
    // Clean up uploaded file
    await supabase.storage.from('item-photos').remove([storagePath])
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ photo }, { status: 201 })
}
