/**
 * Tests for /api/agreements/send and /api/agreements/notify-expiring
 * Covers: auth, validation, agreement creation, email sending, template content
 */

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockNot = jest.fn()
const mockIn = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}))

const mockSendEmail = jest.fn()
jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

import { POST as sendAgreement } from '@/app/api/agreements/send/route'
import { POST as notifyExpiring } from '@/app/api/agreements/notify-expiring/route'
import { buildAgreementEmail, buildExpiryReminderEmail } from '@/lib/email-templates'
import { NextRequest } from 'next/server'

function makeRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockConsignor = {
  id: 'cons-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  account_id: 'acc-1',
  location_id: 'loc-1',
  intake_date: '2026-01-15',
  expiry_date: '2026-03-16',
  grace_end_date: '2026-03-30',
  split_store: 40,
  split_consignor: 60,
}

const mockLocation = {
  name: 'Main Street Antiques',
  address: '123 Main St',
  city: 'Mokena',
  state: 'IL',
  phone: '708-555-1234',
  agreement_days: 60,
  grace_days: 14,
}

const mockItems = [
  { name: 'Vintage Lamp', category: 'Furniture', condition: 'good' },
  { name: 'Silver Necklace', category: 'Jewelry & Silver', condition: 'excellent' },
]

beforeEach(() => {
  jest.clearAllMocks()

  const makeChainable = (resolveWith: unknown = { data: [], error: null }) => {
    const obj: Record<string, jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>)> = {
      eq: mockEq,
      not: mockNot,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      select: mockSelect,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveWith).then(resolve),
    }
    return obj
  }

  const defaultChain = makeChainable()
  mockSelect.mockReturnValue(defaultChain)
  mockEq.mockReturnValue(defaultChain)
  mockNot.mockReturnValue(defaultChain)
  mockIn.mockReturnValue(defaultChain)
  mockOrder.mockReturnValue(defaultChain)
  mockLimit.mockReturnValue(defaultChain)

  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'agr-1', email_sent_at: null },
        error: null,
      }),
    }),
  })

  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  })

  mockSendEmail.mockResolvedValue({ id: 'email-1' })

  // Default: authenticated user with profile (includes tier for tier gate checks)
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockSingle.mockResolvedValue({ data: { account_id: 'acc-1', accounts: { tier: 'starter' } }, error: null })
})

// ==================== /api/agreements/send ====================

describe('POST /api/agreements/send', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = makeRequest('/api/agreements/send', { consignor_id: 'cons-1' })
    const res = await sendAgreement(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 if consignor_id missing', async () => {
    const req = makeRequest('/api/agreements/send', {})
    const res = await sendAgreement(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 if consignor has no email', async () => {
    // First single: profile, second: consignor without email
    mockSingle
      .mockResolvedValueOnce({ data: { account_id: 'acc-1' }, error: null })
      .mockResolvedValueOnce({ data: { ...mockConsignor, email: null }, error: null })

    const req = makeRequest('/api/agreements/send', { consignor_id: 'cons-1' })
    const res = await sendAgreement(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('no email address')
  })

  it('creates agreement record and sends email', async () => {
    // Chain: profile → consignor → items (via then) → location
    mockSingle
      .mockResolvedValueOnce({ data: { account_id: 'acc-1' }, error: null })
      .mockResolvedValueOnce({ data: mockConsignor, error: null })
      .mockResolvedValueOnce({ data: mockLocation, error: null })

    // Items query returns via then chain (not single)
    const itemsChain = {
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: mockItems, error: null }).then(resolve),
          }),
        }),
      }),
    }
    // Override select to return items chain on the third call (items query)
    mockSelect.mockImplementation(() => {
      return {
        eq: mockEq,
        not: mockNot,
        in: mockIn,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: mockItems, error: null }).then(resolve),
      }
    })

    const req = makeRequest('/api/agreements/send', { consignor_id: 'cons-1' })
    const res = await sendAgreement(req)

    // Should have called insert on agreements table
    expect(mockFrom).toHaveBeenCalledWith('agreements')
    expect(mockInsert).toHaveBeenCalled()
    // Should have called sendEmail
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it('updates email_sent_at after successful send', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { account_id: 'acc-1' }, error: null })
      .mockResolvedValueOnce({ data: mockConsignor, error: null })
      .mockResolvedValueOnce({ data: mockLocation, error: null })

    const req = makeRequest('/api/agreements/send', { consignor_id: 'cons-1' })
    await sendAgreement(req)

    // update should have been called to set email_sent_at
    expect(mockFrom).toHaveBeenCalledWith('agreements')
    expect(mockUpdate).toHaveBeenCalled()
  })
})

// ==================== Email templates ====================

describe('Agreement email template', () => {
  it('includes all required fields', () => {
    const { subject, text, html } = buildAgreementEmail({
      storeName: 'Main Street Antiques',
      storeAddress: '123 Main St',
      storeCity: 'Mokena',
      storeState: 'IL',
      storePhone: '708-555-1234',
      consignorName: 'Jane Doe',
      intakeDate: '2026-01-15',
      expiryDate: '2026-03-16',
      graceEndDate: '2026-03-30',
      splitStore: 40,
      splitConsignor: 60,
      agreementDays: 60,
      graceDays: 14,
      items: [
        { name: 'Vintage Lamp', category: 'Furniture', condition: 'Good' },
        { name: 'Silver Necklace', category: 'Jewelry', condition: 'Excellent' },
      ],
    })

    // Subject
    expect(subject).toContain('Main Street Antiques')
    expect(subject).toContain('Agreement')

    // Text version
    expect(text).toContain('Main Street Antiques')
    expect(text).toContain('123 Main St')
    expect(text).toContain('Jane Doe')
    expect(text).toContain('60%') // consignor split
    expect(text).toContain('40%') // store split
    expect(text).toContain('Vintage Lamp')
    expect(text).toContain('Silver Necklace')
    expect(text).toContain('2 total')
    expect(text).toContain('60 days')
    expect(text).toContain('14-day grace period')
    expect(text).toContain('708-555-1234')

    // HTML version
    expect(html).toContain('Main Street Antiques')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Vintage Lamp')
    expect(html).toContain('60%')
  })

  it('handles missing phone gracefully', () => {
    const { text } = buildAgreementEmail({
      storeName: 'Test Store',
      storeAddress: '456 Oak',
      storeCity: 'Chicago',
      storeState: 'IL',
      storePhone: null,
      consignorName: 'Bob',
      intakeDate: '2026-01-01',
      expiryDate: '2026-03-02',
      graceEndDate: '2026-03-16',
      splitStore: 50,
      splitConsignor: 50,
      agreementDays: 60,
      graceDays: 14,
      items: [],
    })
    expect(text).not.toContain('null')
    expect(text).toContain('Test Store')
  })
})

describe('Expiry reminder email template', () => {
  it('includes consignor name and dates', () => {
    const { subject, text, html } = buildExpiryReminderEmail({
      storeName: 'Main Street Antiques',
      storePhone: '708-555-1234',
      consignorName: 'Jane Doe',
      expiryDate: '2026-03-16',
      graceEndDate: '2026-03-30',
    })

    expect(subject).toContain('expires soon')
    expect(text).toContain('Jane Doe')
    expect(text).toContain('708-555-1234')
    expect(html).toContain('Jane Doe')
  })
})

// ==================== /api/agreements/notify-expiring ====================

describe('POST /api/agreements/notify-expiring', () => {
  it('returns 401 if unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authed' } })
    const req = new NextRequest(new URL('/api/agreements/notify-expiring', 'http://localhost:3000'), { method: 'POST' })
    const res = await notifyExpiring()
    expect(res.status).toBe(401)
  })

  it('returns sent: 0 when no expiring consignors', async () => {
    // profile query
    mockSingle.mockResolvedValue({ data: { account_id: 'acc-1' }, error: null })

    const res = await notifyExpiring()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
  })

  it('finds consignors expiring in 3 days', async () => {
    mockSingle.mockResolvedValue({ data: { account_id: 'acc-1' }, error: null })

    const res = await notifyExpiring()
    // Should query consignors with expiry_date filter
    expect(mockFrom).toHaveBeenCalledWith('consignors')
    expect(mockEq).toHaveBeenCalledWith('account_id', 'acc-1')
  })
})
