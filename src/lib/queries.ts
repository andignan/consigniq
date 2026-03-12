// ============================================================
// ConsignIQ — Supabase Query Helpers
// ============================================================
import { createClient } from '@/lib/supabase/client'
import type { Consignor, Item, ItemStatus } from '@/types'

// ============================================================
// CONSIGNORS
// ============================================================

export async function getConsignors(locationId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('consignors')
    .select(`
      *,
      items(count)
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getConsignor(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('consignors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Consignor
}

export async function createConsignor(
  payload: Omit<Consignor, 'id' | 'created_at' | 'created_by' | 'status'>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('consignors')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Consignor
}

export async function updateConsignorStatus(id: string, status: Consignor['status']) {
  const supabase = createClient()

  const { error } = await supabase
    .from('consignors')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

// ============================================================
// ITEMS
// ============================================================

export async function getItemsForConsignor(consignorId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('consignor_id', consignorId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Item[]
}

export async function getInventory(locationId: string, filters?: {
  status?: ItemStatus
  category?: string
  search?: string
}) {
  const supabase = createClient()

  let query = supabase
    .from('items')
    .select(`
      *,
      consignor:consignors(id, name)
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Item[]
}

export async function addItem(
  payload: Pick<Item, 'account_id' | 'location_id' | 'consignor_id' | 'name' | 'category' | 'condition' | 'description'>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('items')
    .insert({
      ...payload,
      status: 'pending',
      intake_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function updateItemStatus(id: string, status: ItemStatus, extra?: Partial<Item>) {
  const supabase = createClient()

  const updates: Partial<Item> & { status: ItemStatus } = { status, ...extra }

  if (status === 'sold') {
    updates.sold_date = new Date().toISOString().split('T')[0]
  }
  if (status === 'donated') {
    updates.donated_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function updateItemPrice(
  id: string,
  price: number,
  low: number,
  high: number,
  reasoning: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('items')
    .update({
      price,
      low_price: low,
      high_price: high,
      ai_reasoning: reasoning,
      status: 'priced',
      priced_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Item
}

export async function deleteItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// LOCATION DEFAULTS
// ============================================================

export async function getLocation(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(locationId: string) {
  const supabase = createClient()

  const [consignorsRes, itemsRes] = await Promise.all([
    supabase
      .from('consignors')
      .select('id, status, expiry_date, grace_end_date')
      .eq('location_id', locationId),
    supabase
      .from('items')
      .select('id, status, price, sold_price')
      .eq('location_id', locationId),
  ])

  if (consignorsRes.error) throw consignorsRes.error
  if (itemsRes.error) throw itemsRes.error

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const consignors = consignorsRes.data
  const items = itemsRes.data

  const expiringIn7 = consignors.filter(c => {
    const exp = new Date(c.expiry_date)
    const diff = Math.floor((exp.getTime() - today.getTime()) / 86400000)
    return diff >= 0 && diff <= 7
  }).length

  const inGrace = consignors.filter(c => {
    const exp = new Date(c.expiry_date)
    const grace = new Date(c.grace_end_date)
    return today > exp && today <= grace
  }).length

  const donationEligible = consignors.filter(c => {
    const grace = new Date(c.grace_end_date)
    return today > grace
  }).length

  const totalInventoryValue = items
    .filter(i => i.status === 'priced' && i.price)
    .reduce((sum, i) => sum + (i.price ?? 0), 0)

  const soldThisMonth = items.filter(i => {
    // This is a simplified check — filter by sold_date would be better in prod
    return i.status === 'sold' && i.sold_price
  })

  const soldRevenue = soldThisMonth.reduce((sum, i) => sum + (i.sold_price ?? 0), 0)

  return {
    activeConsignors: consignors.filter(c => c.status === 'active').length,
    expiringIn7,
    inGrace,
    donationEligible,
    pendingItems: items.filter(i => i.status === 'pending').length,
    pricedItems: items.filter(i => i.status === 'priced').length,
    soldItems: items.filter(i => i.status === 'sold').length,
    totalInventoryValue,
    soldRevenue,
  }
}
