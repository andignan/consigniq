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
    console.log('[comps] No SERPAPI_KEY set — skipping comp lookup')
    return NextResponse.json({ comps: [], source: 'none' })
  }

  const config = getCategoryConfig(category ?? 'Other')
  const searchQuery = config.searchTerms(name, description)
  console.log('[comps] Searching eBay for:', searchQuery)

  try {
    // Search eBay sold listings via SerpApi
    const params = new URLSearchParams({
      engine: 'ebay',
      _nkw: searchQuery,
      LH_Sold: '1',
      LH_Complete: '1',
      api_key: serpApiKey,
    })

    const debugUrl = `https://serpapi.com/search.json?${new URLSearchParams({ ...Object.fromEntries(params), api_key: '***' })}`
    console.log('[comps] SerpApi request URL:', debugUrl)

    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    if (!res.ok) {
      const errText = await res.text()
      console.error('[comps] SerpApi error:', res.status, errText)
      return NextResponse.json({ comps: [], source: 'ebay_error', detail: errText })
    }

    const data = await res.json()
    const results = data.organic_results ?? []
    console.log('[comps] SerpApi returned', results.length, 'organic_results')
    if (results.length > 0) {
      console.log('[comps] First result sample:', JSON.stringify({
        title: results[0].title,
        price: results[0].price,
        link: results[0].link?.substring(0, 60),
      }))
    }
    if (results.length === 0) {
      console.log('[comps] Zero results. Response keys:', Object.keys(data))
      if (data.error) console.error('[comps] SerpApi error in body:', data.error)
      if (data.search_information) console.log('[comps] search_information:', JSON.stringify(data.search_information))
    }

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

    console.log('[comps] Returning', comps.length, 'comps after filtering')
    return NextResponse.json({ comps, source: 'ebay' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Comp lookup failed:', message)
    return NextResponse.json({ comps: [], source: 'error', detail: message })
  }
}
