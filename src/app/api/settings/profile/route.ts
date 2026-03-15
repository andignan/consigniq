import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export async function PATCH(request: Request) {
  const supabase = createServerClient()

  const auth = await getAuthenticatedUser(supabase)
  if (auth.error) return auth.error

  const body = await request.json()
  const { full_name } = body

  if (!full_name || !full_name.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .update({ full_name: full_name.trim() })
    .eq('id', auth.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}
