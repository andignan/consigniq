import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfile } from '@/lib/auth-helpers'
import { ERRORS } from '@/lib/errors'

// PATCH — change team member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'account_id, role')
  if (auth.error) return auth.error
  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  const { role } = await request.json()
  if (!role || !['owner', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'role must be owner or staff' }, { status: 400 })
  }

  // Verify user belongs to this account
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', params.userId)
    .eq('account_id', auth.profile.account_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found on this account' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', params.userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

// DELETE — remove team member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createServerClient()
  const auth = await getAuthenticatedProfile<{ account_id: string; role: string }>(supabase, 'account_id, role')
  if (auth.error) return auth.error
  if (auth.profile.role !== 'owner') {
    return NextResponse.json({ error: ERRORS.OWNER_REQUIRED }, { status: 403 })
  }

  // Cannot remove yourself
  if (params.userId === auth.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself from the account' }, { status: 400 })
  }

  // Verify user belongs to this account
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', params.userId)
    .eq('account_id', auth.profile.account_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found on this account' }, { status: 404 })
  }

  // Cannot remove the last owner
  if (targetUser.role === 'owner') {
    const { data: owners } = await supabase
      .from('users')
      .select('id')
      .eq('account_id', auth.profile.account_id)
      .eq('role', 'owner')

    if ((owners?.length ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
    }
  }

  // Delete the user row
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', params.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
