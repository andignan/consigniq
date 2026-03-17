/**
 * Tests for item photo API routes
 * Covers:
 *   POST /api/items/[id]/photos — upload photo
 *   GET  /api/items/[id]/photos — list photos
 *   DELETE /api/items/[id]/photos/[photoId] — delete photo
 *   PATCH /api/items/[id]/photos/reorder — reorder photos
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()
const mockStorageUpload = jest.fn()
const mockStorageGetPublicUrl = jest.fn()
const mockStorageRemove = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}))

const mockStorageFrom = jest.fn(() => ({
  upload: mockStorageUpload,
  getPublicUrl: mockStorageGetPublicUrl,
  remove: mockStorageRemove,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: { from: mockStorageFrom },
  }),
}))

import { GET, POST } from '@/app/api/items/[id]/photos/route'
import { DELETE } from '@/app/api/items/[id]/photos/[photoId]/route'
import { PATCH } from '@/app/api/items/[id]/photos/reorder/route'
import { NextRequest } from 'next/server'

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

/** Helper to build a chainable/thenable mock (Supabase query builder pattern) */
function makeChainable(resolveWith: unknown = { data: [], error: null }) {
  const obj: Record<string, jest.Mock | ((...args: unknown[]) => unknown)> = {
    eq: jest.fn(() => obj),
    order: jest.fn(() => obj),
    select: jest.fn(() => obj),
    single: jest.fn(() => Promise.resolve(resolveWith)),
    then: jest.fn((resolve: (v: unknown) => unknown) => Promise.resolve(resolveWith).then(resolve)),
  }
  return obj
}

beforeEach(() => {
  jest.clearAllMocks()

  // Default: authenticated user with profile
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  })

  // Default profile lookup chain: from('users').select().eq().single()
  const profileChain = makeChainable({
    data: { account_id: 'acc-1' },
    error: null,
  })
  // The first call to from('users') returns the profile chain
  // Subsequent calls may be for 'item_photos' or 'items'
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return { select: jest.fn(() => profileChain) }
    }
    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }
  })

  // Default storage mocks
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageGetPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://storage.example.com/photo.jpg' },
  })
  mockStorageRemove.mockResolvedValue({ error: null })
})

// ─── GET /api/items/[id]/photos ─────────────────────────────────────────────

describe('GET /api/items/[id]/photos', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos')
    const res = await GET(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(401)
  })

  it('returns ordered photos', async () => {
    const photos = [
      { id: 'p1', display_order: 0, is_primary: true },
      { id: 'p2', display_order: 1, is_primary: false },
    ]

    const chain = makeChainable({ data: photos, error: null })
    mockSelect.mockReturnValue(chain)

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos')
    const res = await GET(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.photos).toHaveLength(2)
    expect(body.photos[0].id).toBe('p1')
  })
})

// ─── POST /api/items/[id]/photos ────────────────────────────────────────────

describe('POST /api/items/[id]/photos', () => {
  // Helper: build a FormData with a photo file
  function makePhotoForm(type = 'image/jpeg'): FormData {
    const form = new FormData()
    const blob = new Blob(['fake-image-data'], { type })
    form.append('photo', blob, 'photo.jpg')
    return form
  }

  function makePostRequest(formData: FormData): NextRequest {
    return new NextRequest(new URL('http://localhost:3000/api/items/item-1/photos'), {
      method: 'POST',
      body: formData,
    })
  }

  /** Set up mocks for a successful upload flow (item exists, count < MAX) */
  function setupSuccessfulUpload(existingCount = 0) {
    // item lookup: from('items').select().eq().eq().single()
    const itemChain = makeChainable({ data: { id: 'item-1', account_id: 'acc-1' }, error: null })
    // count query: from('item_photos').select('id', { count, head }).eq()
    const countChain = makeChainable({ data: null, error: null, count: existingCount })
    // insert chain: from('item_photos').insert().select().single()
    const insertSingle = jest.fn().mockResolvedValue({
      data: { id: 'photo-new', display_order: existingCount, is_primary: existingCount === 0 },
      error: null,
    })
    const insertSelect = jest.fn(() => ({ single: insertSingle }))

    let selectCallIndex = 0
    mockSelect.mockImplementation((...args: unknown[]) => {
      selectCallIndex++
      // First select: item lookup (select('id, account_id'))
      if (selectCallIndex === 1) return itemChain
      // Second select: count query (select('id', { count, head }))
      if (selectCallIndex === 2) return countChain
      return makeChainable()
    })

    mockInsert.mockReturnValue({ select: insertSelect })
  }

  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makePostRequest(makePhotoForm())
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 400 if photo file is missing', async () => {
    // item lookup succeeds, count succeeds
    setupSuccessfulUpload(0)

    const form = new FormData()
    const req = new NextRequest(new URL('http://localhost:3000/api/items/item-1/photos'), {
      method: 'POST',
      body: form,
    })
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/photo/i)
  })

  it('returns 400 for invalid file type', async () => {
    setupSuccessfulUpload(0)

    const form = new FormData()
    const blob = new Blob(['not-an-image'], { type: 'application/pdf' })
    form.append('photo', blob, 'file.pdf')

    const req = new NextRequest(new URL('http://localhost:3000/api/items/item-1/photos'), {
      method: 'POST',
      body: form,
    })
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/JPG|PNG|WebP/i)
  })

  it('returns 400 when max 3 photos reached', async () => {
    setupSuccessfulUpload(3)

    const req = makePostRequest(makePhotoForm())
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/maximum.*3/i)
  })

  it('uploads successfully with correct display_order and is_primary for first photo', async () => {
    setupSuccessfulUpload(0)

    const req = makePostRequest(makePhotoForm())
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.photo.is_primary).toBe(true)
    expect(body.photo.display_order).toBe(0)
  })

  it('sets is_primary=false for second photo', async () => {
    setupSuccessfulUpload(1)

    const req = makePostRequest(makePhotoForm())
    const res = await POST(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.photo.is_primary).toBe(false)
    expect(body.photo.display_order).toBe(1)
  })

  it('calls storage upload with correct bucket', async () => {
    setupSuccessfulUpload(0)

    const req = makePostRequest(makePhotoForm())
    await POST(req, { params: { id: 'item-1' } })

    expect(mockStorageFrom).toHaveBeenCalledWith('item-photos')
    expect(mockStorageUpload).toHaveBeenCalled()
  })
})

// ─── DELETE /api/items/[id]/photos/[photoId] ────────────────────────────────

describe('DELETE /api/items/[id]/photos/[photoId]', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/photo-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'item-1', photoId: 'photo-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 if photo not found', async () => {
    // photo lookup returns not found
    const notFoundChain = makeChainable({ data: null, error: { message: 'Not found' } })
    mockSelect.mockReturnValue(notFoundChain)

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/photo-bad', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'item-1', photoId: 'photo-bad' } })
    expect(res.status).toBe(404)
  })

  it('deletes photo and re-normalizes display_order', async () => {
    // Photo lookup succeeds
    const photoChain = makeChainable({
      data: { id: 'photo-1', storage_path: 'items/item-1/photo.jpg', is_primary: true, display_order: 0 },
      error: null,
    })
    mockSelect.mockReturnValueOnce(photoChain)

    // Delete row: from('item_photos').delete().eq()
    const deleteEq = jest.fn().mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ eq: deleteEq })

    // Remaining photos query
    const remaining = [
      { id: 'photo-2', display_order: 1 },
      { id: 'photo-3', display_order: 2 },
    ]
    const remainingChain = makeChainable({ data: remaining, error: null })
    mockSelect.mockReturnValueOnce(remainingChain)

    // Update calls for re-normalization
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: updateEq })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/photo-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'item-1', photoId: 'photo-1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)

    // Should have called storage remove
    expect(mockStorageFrom).toHaveBeenCalledWith('item-photos')
    expect(mockStorageRemove).toHaveBeenCalledWith(['items/item-1/photo.jpg'])

    // Should have updated remaining photos with new display_order
    // photo-2 gets display_order=0, is_primary=true
    // photo-3 gets display_order=1, is_primary=false
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 0, is_primary: true })
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 1, is_primary: false })
  })

  it('promotes next photo to primary when primary is deleted', async () => {
    // Primary photo being deleted
    const photoChain = makeChainable({
      data: { id: 'photo-1', storage_path: 'items/item-1/photo.jpg', is_primary: true, display_order: 0 },
      error: null,
    })
    mockSelect.mockReturnValueOnce(photoChain)

    const deleteEq = jest.fn().mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ eq: deleteEq })

    // One remaining photo
    const remaining = [{ id: 'photo-2', display_order: 1 }]
    const remainingChain = makeChainable({ data: remaining, error: null })
    mockSelect.mockReturnValueOnce(remainingChain)

    const updateEq = jest.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: updateEq })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/photo-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'item-1', photoId: 'photo-1' } })
    expect(res.status).toBe(200)

    // The remaining photo should be promoted to primary (display_order=0, is_primary=true)
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 0, is_primary: true })
  })
})

// ─── PATCH /api/items/[id]/photos/reorder ───────────────────────────────────

describe('PATCH /api/items/[id]/photos/reorder', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: ['p1', 'p2'] }),
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(401)
  })

  it('returns 400 if photo_ids is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/photo_ids/i)
  })

  it('returns 400 if photo_ids is empty array', async () => {
    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: [] }),
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
  })

  it('returns 400 if photo_ids is not an array', async () => {
    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: 'not-array' }),
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
  })

  it('returns 400 if photo_ids do not match existing photos', async () => {
    // Existing photos
    const existingChain = makeChainable({
      data: [{ id: 'p1' }, { id: 'p2' }],
      error: null,
    })
    mockSelect.mockReturnValue(existingChain)

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: ['p1', 'p3'] }), // p3 doesn't exist
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid/i)
  })

  it('returns 400 if photo_ids count mismatches existing count', async () => {
    const existingChain = makeChainable({
      data: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      error: null,
    })
    mockSelect.mockReturnValue(existingChain)

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: ['p1', 'p2'] }), // missing p3
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(400)
  })

  it('successfully reorders and sets first as primary', async () => {
    // Existing photos
    const existingChain = makeChainable({
      data: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      error: null,
    })
    mockSelect.mockReturnValue(existingChain)

    // Update calls
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: updateEq })

    const req = makeRequest('http://localhost:3000/api/items/item-1/photos/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ photo_ids: ['p3', 'p1', 'p2'] }), // reorder: p3 first
    })
    const res = await PATCH(req, { params: { id: 'item-1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // p3 → display_order=0, is_primary=true
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 0, is_primary: true })
    // p1 → display_order=1, is_primary=false
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 1, is_primary: false })
    // p2 → display_order=2, is_primary=false
    expect(mockUpdate).toHaveBeenCalledWith({ display_order: 2, is_primary: false })
  })
})
