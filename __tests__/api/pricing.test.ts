/**
 * Tests for /api/pricing/* routes
 * Covers: comps (SerpApi), identify (Claude vision), suggest (Claude pricing)
 */

// Mock Supabase (pricing routes don't use it directly but middleware expects it)
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
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
})
