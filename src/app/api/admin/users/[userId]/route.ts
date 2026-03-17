// app/api/admin/users/[userId]/route.ts
import { checkSuperadmin, createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await checkSuperadmin()
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: auth.status }
    )
  }

  const supabase = createAdminClient()
  const { userId } = params

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  // Fetch user to verify they exist
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, platform_role')
    .eq('id', userId)
    .single()

  if (userErr || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Cannot delete the last super_admin
  if (user.platform_role === 'super_admin') {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('platform_role', 'super_admin')

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last super admin' }, { status: 400 })
    }
  }

  // Delete users table row
  const { error: deleteErr } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (deleteErr) {
    return NextResponse.json({ error: `Failed to delete user: ${deleteErr.message}` }, { status: 500 })
  }

  // Delete Supabase auth user
  try {
    await supabase.auth.admin.deleteUser(userId)
  } catch {
    // Non-critical — user row is already gone
  }

  return NextResponse.json({ deleted: true })
}
