/**
 * Tests for /api/pricing/* routes
 * Covers: comps (SerpApi), identify (Claude vision), suggest (Claude pricing)
 */

// Mock Supabase — suggest route uses .from() for tier/usage checks
const mockSingle = jest.fn().mockResolvedValue({ data: { account_id: 'acc1', tier: 'shop', ai_lookups_this_month: 0, ai_lookups_reset_at: null, bonus_lookups: 0, bonus_lookups_used: 0 }, error: null })
const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
const mockRpc = jest.fn().mockResolvedValue({ error: null })
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: jest.fn().mockReturnValue({ select: mockSelect, update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }),
    rpc: mockRpc,
  }),
}))

// Save original env
const originalEnv = process.env

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...originalEnv }
})

afterAll(() => {
  process.env = originalEnv
})

describe('POST /api/pricing/comps', () => {
  // We need to dynamically import to reset mocks
  let POST: typeof import('@/app/api/pricing/comps/route').POST

  beforeEach(async () => {
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))
    const mod = await import('@/app/api/pricing/comps/route')
    POST = mod.POST
  })

  it('returns 400 if name is missing', async () => {
    const { NextRequest } = await import('next/server')
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/comps'), {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns empty comps if SERPAPI_KEY is not set', async () => {
    delete process.env.SERPAPI_KEY
    const { NextRequest } = await import('next/server')
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/comps'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Item' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.comps).toEqual([])
    expect(body.source).toBe('none')
  })

  it('includes sold listing and pre-owned condition params in SerpApi request', async () => {
    process.env.SERPAPI_KEY = 'test-serpapi-key'
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ organic_results: [] }), { status: 200 })
    )
    const { NextRequest } = await import('next/server')
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/comps'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Oak Table', category: 'Furniture' }),
    })
    await POST(req)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calledUrl = fetchSpy.mock.calls[0][0] as string
    const url = new URL(calledUrl)
    expect(url.searchParams.get('LH_Sold')).toBe('1')
    expect(url.searchParams.get('LH_Complete')).toBe('1')
    expect(url.searchParams.get('LH_ItemCondition')).toBe('3000')
    expect(url.searchParams.get('engine')).toBe('ebay')

    fetchSpy.mockRestore()
  })

  it('filters out new-condition items from results', async () => {
    process.env.SERPAPI_KEY = 'test-serpapi-key'
    const mockResults = {
      organic_results: [
        { title: 'Used Oak Table', price: { raw: '$50.00' }, link: 'http://ebay.com/1', condition: 'Pre-Owned' },
        { title: 'New Oak Table', price: { raw: '$120.00' }, link: 'http://ebay.com/2', condition: 'Brand New' },
        { title: 'Another Table', price: { raw: '$65.00' }, link: 'http://ebay.com/3', condition: 'New with tags' },
        { title: 'Good Table', price: { raw: '$45.00' }, link: 'http://ebay.com/4', condition: 'Used' },
        { title: 'Refurb Table', price: { raw: '$80.00' }, link: 'http://ebay.com/5', condition: 'New other' },
      ],
    }
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResults), { status: 200 })
    )
    const { NextRequest } = await import('next/server')
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/comps'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Oak Table', category: 'Furniture' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Only Pre-Owned and Used should remain
    expect(body.comps).toHaveLength(2)
    expect(body.comps[0].title).toBe('Used Oak Table')
    expect(body.comps[1].title).toBe('Good Table')

    fetchSpy.mockRestore()
  })
})

describe('POST /api/pricing/identify', () => {
  it('returns 400 if no photo provided', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    const { POST } = await import('@/app/api/pricing/identify/route')
    const { NextRequest } = await import('next/server')

    const formData = new FormData()
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/identify'), {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('photo')
  })

  it('returns 500 if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    jest.resetModules()
    const { POST } = await import('@/app/api/pricing/identify/route')
    const { NextRequest } = await import('next/server')

    const formData = new FormData()
    formData.append('photo', new Blob(['fake'], { type: 'image/jpeg' }), 'test.jpg')
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/identify'), {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 400 when no photos provided (empty formData)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    const { POST } = await import('@/app/api/pricing/identify/route')
    const { NextRequest } = await import('next/server')

    const formData = new FormData()
    // No photo, no photo_1, photo_2, photo_3
    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/identify'), {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('photo')
  })

  it('single photo backward compat still works', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        name: 'Vintage Lamp', category: 'Kitchen & Home', condition: 'good', description: 'A brass lamp'
      })}],
    })
    jest.mock('@/lib/anthropic', () => ({
      getAnthropicClient: () => ({ messages: { create: mockCreate } }),
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
    }))

    const { POST } = await import('@/app/api/pricing/identify/route')
    const { NextRequest } = await import('next/server')

    const formData = new FormData()
    formData.append('photo', new Blob(['fake-image-data'], { type: 'image/jpeg' }), 'test.jpg')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/identify'), {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify only 1 image block was sent
    const callArgs = mockCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content
    const imageBlocks = userContent.filter((b: { type: string }) => b.type === 'image')
    expect(imageBlocks).toHaveLength(1)

    // Prompt should say "photo" (singular)
    const textBlock = userContent.find((b: { type: string }) => b.type === 'text')
    expect(textBlock.text).toContain('from the photo.')
    expect(textBlock.text).not.toContain('Multiple photos')
  })

  it('accepts multiple photos (photo + photo_1 + photo_2) and builds correct image blocks', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        name: 'Oak Table', category: 'Furniture', condition: 'good', description: 'Solid oak dining table'
      })}],
    })
    jest.mock('@/lib/anthropic', () => ({
      getAnthropicClient: () => ({ messages: { create: mockCreate } }),
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
    }))

    const { POST } = await import('@/app/api/pricing/identify/route')
    const { NextRequest } = await import('next/server')

    const formData = new FormData()
    formData.append('photo', new Blob(['main-photo'], { type: 'image/jpeg' }), 'main.jpg')
    formData.append('photo_1', new Blob(['angle-1'], { type: 'image/png' }), 'angle1.png')
    formData.append('photo_2', new Blob(['angle-2'], { type: 'image/webp' }), 'angle2.webp')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/identify'), {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify 3 image blocks were sent to Claude
    const callArgs = mockCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content
    const imageBlocks = userContent.filter((b: { type: string }) => b.type === 'image')
    expect(imageBlocks).toHaveLength(3)

    // Verify media types are preserved
    expect(imageBlocks[0].source.media_type).toBe('image/jpeg')
    expect(imageBlocks[1].source.media_type).toBe('image/png')
    expect(imageBlocks[2].source.media_type).toBe('image/webp')

    // Prompt should reference multiple photos
    const textBlock = userContent.find((b: { type: string }) => b.type === 'text')
    expect(textBlock.text).toContain('from the photos.')
    expect(textBlock.text).toContain('Multiple photos')
  })
})

describe('POST /api/pricing/suggest', () => {
  it('returns 400 if required fields missing', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))
    const { POST } = await import('@/app/api/pricing/suggest/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/suggest'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }), // missing category and condition
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))
    const { POST } = await import('@/app/api/pricing/suggest/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/suggest'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', category: 'Other', condition: 'good', comps: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('accepts photos array and builds multiple image blocks', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        price: 45, low: 30, high: 60, reasoning: 'Based on comps'
      })}],
    })
    jest.mock('@/lib/anthropic', () => ({
      getAnthropicClient: () => ({ messages: { create: mockCreate } }),
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
    }))

    const { POST } = await import('@/app/api/pricing/suggest/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/suggest'), {
      method: 'POST',
      body: JSON.stringify({
        name: 'Oak Table',
        category: 'Furniture',
        condition: 'good',
        comps: [],
        photos: [
          { base64: 'aW1hZ2UxZGF0YQ==', mediaType: 'image/jpeg' },
          { base64: 'aW1hZ2UyZGF0YQ==', mediaType: 'image/png' },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify 2 image blocks were sent
    const callArgs = mockCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content
    // Content should be an array (not a string) when images are present
    expect(Array.isArray(userContent)).toBe(true)
    const imageBlocks = userContent.filter((b: { type: string }) => b.type === 'image')
    expect(imageBlocks).toHaveLength(2)
    expect(imageBlocks[0].source.media_type).toBe('image/jpeg')
    expect(imageBlocks[1].source.media_type).toBe('image/png')
  })

  it('legacy single photo (photoBase64/photoMediaType) still works', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        price: 25, low: 15, high: 35, reasoning: 'Fair market value'
      })}],
    })
    jest.mock('@/lib/anthropic', () => ({
      getAnthropicClient: () => ({ messages: { create: mockCreate } }),
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
    }))

    const { POST } = await import('@/app/api/pricing/suggest/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/suggest'), {
      method: 'POST',
      body: JSON.stringify({
        name: 'Vintage Lamp',
        category: 'Kitchen & Home',
        condition: 'good',
        comps: [],
        photoBase64: 'bGVnYWN5cGhvdG8=',
        photoMediaType: 'image/jpeg',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify 1 image block from legacy fields
    const callArgs = mockCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content
    expect(Array.isArray(userContent)).toBe(true)
    const imageBlocks = userContent.filter((b: { type: string }) => b.type === 'image')
    expect(imageBlocks).toHaveLength(1)
    expect(imageBlocks[0].source.data).toBe('bGVnYWN5cGhvdG8=')
    expect(imageBlocks[0].source.media_type).toBe('image/jpeg')
  })

  it('photos array takes precedence over legacy photoBase64', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    jest.resetModules()
    jest.mock('@/lib/pricing/categories', () => ({
      getCategoryConfig: () => ({
        label: 'Other',
        searchTerms: (name: string) => name,
        priceGuidance: 'Test guidance',
        typicalMargin: { low: 0.15, high: 0.45 },
      }),
    }))

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        price: 50, low: 40, high: 60, reasoning: 'Based on condition'
      })}],
    })
    jest.mock('@/lib/anthropic', () => ({
      getAnthropicClient: () => ({ messages: { create: mockCreate } }),
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
    }))

    const { POST } = await import('@/app/api/pricing/suggest/route')
    const { NextRequest } = await import('next/server')

    const req = new NextRequest(new URL('http://localhost:3000/api/pricing/suggest'), {
      method: 'POST',
      body: JSON.stringify({
        name: 'Chair',
        category: 'Furniture',
        condition: 'good',
        comps: [],
        photos: [
          { base64: 'bmV3cGhvdG8=', mediaType: 'image/jpeg' },
        ],
        photoBase64: 'bGVnYWN5cGhvdG8=',
        photoMediaType: 'image/jpeg',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // photos array should be used, not legacy fields
    const callArgs = mockCreate.mock.calls[0][0]
    const userContent = callArgs.messages[0].content
    const imageBlocks = userContent.filter((b: { type: string }) => b.type === 'image')
    expect(imageBlocks).toHaveLength(1)
    expect(imageBlocks[0].source.data).toBe('bmV3cGhvdG8=')
  })
})
