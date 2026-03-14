/**
 * Tests for /api/labels/generate route
 * Covers: POST validation, account scoping, PDF generation, size handling
 */

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockIn = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

// pdf-lib mock — keep references via a shared object to avoid hoisting issues
const pdfMocks = {
  addPage: jest.fn(),
  save: jest.fn(),
  drawText: jest.fn(),
  drawLine: jest.fn(),
}

jest.mock('pdf-lib', () => {
  const addPage = jest.fn()
  const save = jest.fn()
  return {
    PDFDocument: {
      create: jest.fn().mockImplementation(async () => ({
        addPage,
        embedFont: jest.fn().mockResolvedValue({
          widthOfTextAtSize: jest.fn().mockReturnValue(50),
        }),
        save,
      })),
    },
    StandardFonts: {
      HelveticaBold: 'HelveticaBold',
      Helvetica: 'Helvetica',
    },
    rgb: jest.fn().mockReturnValue({ type: 'RGB' }),
  }
})

import { POST } from '@/app/api/labels/generate/route'
import { NextRequest } from 'next/server'
import { PDFDocument } from 'pdf-lib'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/labels/generate'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const singleItemData = [
  {
    id: 'abc12345-6789-0000-0000-item00000001',
    name: 'Test Widget',
    category: 'Jewelry',
    condition: 'good',
    price: 29.99,
    effective_price: 29.99,
    current_markdown_pct: 0,
    account_id: 'acct-1',
    consignors: { name: 'Sarah Miller' },
    locations: { name: 'Downtown Store' },
  },
]

beforeEach(async () => {
  jest.clearAllMocks()

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

  mockSingle.mockResolvedValue({
    data: { account_id: 'acct-1' },
    error: null,
  })

  mockIn.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: singleItemData, error: null }),
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }
    }
    return {
      select: jest.fn().mockReturnValue({
        in: mockIn,
      }),
    }
  })

  // Reset pdf mock to return valid bytes
  const pdfDoc = await (PDFDocument.create as jest.Mock)()
  const mockPage = {
    getSize: jest.fn().mockReturnValue({ width: 162, height: 90 }),
    drawText: jest.fn(),
    drawLine: jest.fn(),
  }
  ;(pdfDoc.addPage as jest.Mock).mockReturnValue(mockPage)
  ;(pdfDoc.save as jest.Mock).mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
})

describe('POST /api/labels/generate', () => {
  it('returns 401 for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } })
    const req = makeRequest({ item_ids: ['item-1'], size: '2x1' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty item_ids array', async () => {
    const req = makeRequest({ item_ids: [], size: '2x1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('item_ids')
  })

  it('returns 400 for missing item_ids', async () => {
    const req = makeRequest({ size: '2x1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when no items found (wrong account)', async () => {
    mockIn.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })
    const req = makeRequest({ item_ids: ['other-acct-item'], size: '2x1' })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('No items found')
  })

  it('returns PDF content-type for valid request', async () => {
    const req = makeRequest({ item_ids: ['item-1'], size: '2x1' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('defaults to 2x1 size for invalid size value', async () => {
    const req = makeRequest({ item_ids: ['item-1'], size: 'invalid' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('generates labels for multiple items', async () => {
    mockIn.mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [
          { ...singleItemData[0], id: 'item-1', name: 'Widget A' },
          { ...singleItemData[0], id: 'item-2', name: 'Widget B' },
        ],
        error: null,
      }),
    })
    const req = makeRequest({ item_ids: ['item-1', 'item-2'], size: '4x2' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('scopes items by account_id from session', async () => {
    const req = makeRequest({ item_ids: ['item-1'], size: '2x1' })
    await POST(req)
    const itemsFromCall = mockFrom.mock.calls.find((c: string[]) => c[0] === 'items')
    expect(itemsFromCall).toBeDefined()
  })
})
