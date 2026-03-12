// app/api/pricing/comps/route.ts
// SerpApi eBay sold comp lookup
import { NextRequest, NextResponse } from 'next/server'
import { getCategoryConfig } from '@/lib/pricing/categories'

export interface CompResult {
  title: string
  price: number
  link: string
  condition?: string
  thumbnail?: string
}

export async function POST(request: NextRequest) {
  const { name, category, description } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const serpApiKey = process.env.SERPAPI_KEY
  if (!serpApiKey) {
    // Return empty comps if no API key — pricing can still work without comps
    return NextResponse.json({ comps: [], source: 'none' })
  }

  const config = getCategoryConfig(category ?? 'Other')
  const searchQuery = config.searchTerms(name, description)

  try {
    // Search eBay sold listings via SerpApi
    const params = new URLSearchParams({
      engine: 'ebay',
      _nkw: searchQuery,
      LH_Complete: '1', // completed listings
      LH_Sold: '1',     // sold only
      _sop: '13',       // sort by end date (recent first)
      api_key: serpApiKey,
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    if (!res.ok) {
      console.error('SerpApi error:', res.status, await res.text())
      return NextResponse.json({ comps: [], source: 'ebay_error' })
    }

    const data = await res.json()
    const results = data.organic_results ?? []

    const comps: CompResult[] = results
      .filter((r: { price?: { raw?: string } }) => r.price?.raw)
      .slice(0, 8)
      .map((r: { title: string; price?: { raw?: string }; link: string; condition?: string; thumbnail?: string }) => ({
        title: r.title as string,
        price: parseFloat(
          (r.price?.raw as string ?? '0').replace(/[^0-9.]/g, '')
        ),
        link: r.link as string,
        condition: r.condition as string | undefined,
        thumbnail: r.thumbnail as string | undefined,
      }))
      .filter((c: CompResult) => c.price > 0)

    return NextResponse.json({ comps, source: 'ebay' })
  } catch (err) {
    console.error('Comp lookup failed:', err)
    return NextResponse.json({ comps: [], source: 'error' })
  }
}
