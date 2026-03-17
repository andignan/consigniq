'use client'

import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle, X, Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { TIER_CONFIGS, type Tier } from '@/lib/tier-limits'

// ─── Tier-aware quick links ─────────────────────────────────
interface QuickLink { q: string; a: string }
interface QuickSection { section: string; items: QuickLink[] }

const SOLO_QUICK_LINKS: QuickSection[] = [
  {
    section: 'Getting Started',
    items: [
      { q: 'How do lookups work?', a: 'You get 200 AI pricing lookups per month. Each time you use "Full AI Pricing" or "eBay Comps Only", it counts as one lookup. Your counter resets 30 days from your last reset. You can buy 50 more lookups for $5 if you run out.' },
      { q: 'How do I save an item to inventory?', a: 'After pricing an item on the Price Lookup page, click "Save to My Inventory". The item saves with its AI-suggested price, category, and condition. View saved items on the My Inventory page.' },
      { q: "What's included in Solo Pricer?", a: 'Solo Pricer ($9/mo) includes 200 AI pricing lookups, eBay sold comps, photo identification, personal inventory tracking, and CSV export. Upgrade to Shop ($79/mo) for consignor management, lifecycle tracking, multi-location, reports, payouts, and staff accounts.' },
    ],
  },
  {
    section: 'Pricing Help',
    items: [
      { q: 'How do I use the photo feature?', a: 'Click the camera icon on the Price Lookup page. Upload or take a photo of the item. The AI will identify the item name, category, condition, and description automatically. The photo is also used to improve the AI price suggestion.' },
      { q: 'What are eBay comps?', a: "eBay comps are real sold listings from eBay. The system searches for similar items that recently sold and shows their sale prices. Use these as reference points when deciding your price." },
      { q: 'How accurate is AI pricing?', a: 'AI pricing uses eBay sold data and category-specific logic. Accuracy varies by category — common items with many comps are very accurate. Rare or unique items may need manual adjustment. Always review the reasoning and comps before accepting a price.' },
    ],
  },
  {
    section: 'Account',
    items: [
      { q: 'How do I buy more lookups?', a: 'Go to Settings → Billing and click "Buy 50 more lookups — $5". You can also buy from the dashboard when your remaining lookups are low. Bonus lookups never expire.' },
      { q: 'How do I upgrade my plan?', a: 'Go to Settings → Billing and click "Upgrade to Shop — $79/mo". This adds consignor management, lifecycle tracking, multi-location, reports, payouts, markdown schedules, and staff accounts.' },
      { q: 'How do I change my password?', a: "Go to Settings → Profile and click \"Change Password\". We'll send a password reset link to your email. Click the link to set a new password." },
    ],
  },
]

const FULL_QUICK_LINKS: QuickSection[] = [
  {
    section: 'Getting Started',
    items: [
      { q: 'How do I add a consignor?', a: 'Go to Consignors from the sidebar and click "New Consignor". Fill in their name, phone, email, and notes. The agreement dates and split percentages will use your location defaults.' },
      { q: 'How does pricing work?', a: "From Inventory, click \"Price\" on a pending item. The AI pricing engine uses eBay sold comps and category-specific logic to suggest a price with a low/high range. You can accept the AI suggestion or enter a manual price." },
      { q: 'What happens at 60 days?', a: "After 60 days (configurable in Settings), a consignor's agreement expires. A 3-day grace period follows for item pickup. After the grace period, unsold items become eligible to be marked for donation." },
    ],
  },
  {
    section: 'Pricing Help',
    items: [
      { q: 'What is AI pricing?', a: "AI pricing uses Claude to analyze your item's category, condition, description, and live eBay sold comps to suggest a fair consignment store price. It provides a recommended price, a range, and reasoning." },
      { q: 'How do eBay comps work?', a: "The system searches eBay's completed/sold listings for similar items. These real sale prices are used as reference points for pricing. Comps are shown alongside the AI suggestion so you can compare." },
      { q: 'Can I override a price?', a: 'Yes. After getting an AI suggestion or eBay comps, use the "Manual Price Override" field to enter any price you want. The manual price takes precedence over the AI suggestion when you click Apply.' },
    ],
  },
  {
    section: 'Account & Settings',
    items: [
      { q: 'How do I invite staff?', a: "Go to Settings → Account Settings → click \"Invite User\". Enter their email and select their role (owner or staff). They'll receive an invitation to join your account." },
      { q: 'How do I change split percentages?', a: 'Go to Settings → Location Settings. The "Default Store Split %" and "Default Consignor Split %" fields control the revenue split for new consignors. Both must add to 100%.' },
      { q: 'What do the tiers include?', a: 'ConsignIQ offers Solo ($9), Shop ($79), and Enterprise ($129) tiers. Solo is pricing-only. Shop adds consignor management, multi-location, reports, payouts, and email notifications. Enterprise adds cross-customer pricing intel, community feed, and API access.' },
    ],
  },
]

// Page-aware section ordering — shows relevant section first based on current page
function getOrderedSections(sections: QuickSection[], pathname: string): QuickSection[] {
  const pageMap: Record<string, string> = {
    '/dashboard/pricing': 'Pricing Help',
    '/dashboard/consignors': 'Getting Started',
    '/dashboard/inventory': 'Getting Started',
    '/dashboard/payouts': 'Account & Settings',
    '/dashboard/reports': 'Account & Settings',
  }

  const match = Object.entries(pageMap).find(([path]) => pathname.startsWith(path))
  if (!match) return sections

  const prioritySection = match[1]
  const sorted = [...sections].sort((a, b) => {
    if (a.section === prioritySection) return -1
    if (b.section === prioritySection) return 1
    return 0
  })
  return sorted
}

// ─── Client-side answer cache (24h TTL) ─────────────────────
const answerCache = new Map<string, { answer: string; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCachedAnswer(question: string): string | null {
  const key = question.toLowerCase().trim()
  const entry = answerCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    answerCache.delete(key)
    return null
  }
  return entry.answer
}

function setCachedAnswer(question: string, answer: string) {
  const key = question.toLowerCase().trim()
  answerCache.set(key, { answer, timestamp: Date.now() })
}

// ─── Component ──────────────────────────────────────────────
export default function HelpWidget() {
  const pathname = usePathname()
  const contextUser = useUser()
  const accountTier = (contextUser?.accounts?.tier ?? 'shop') as Tier
  const isSolo = accountTier === 'solo'
  const tierLabel = TIER_CONFIGS[accountTier]?.label ?? 'Shop'

  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Don't render on /admin pages
  if (pathname.startsWith('/admin')) return null

  const baseLinks = isSolo ? SOLO_QUICK_LINKS : FULL_QUICK_LINKS
  const quickLinks = getOrderedSections(baseLinks, pathname)

  function toggleItem(q: string) {
    setExpandedItem(prev => prev === q ? null : q)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim() || searching) return

    // Check cache first
    const cached = getCachedAnswer(searchQuery)
    if (cached) {
      setAiAnswer(cached)
      setExpandedItem(null)
      return
    }

    setSearching(true)
    setAiAnswer('')
    setExpandedItem(null)
    try {
      const res = await fetch('/api/help/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: searchQuery.trim() }),
      })
      if (res.ok) {
        const { answer } = await res.json()
        const text = answer ?? ''
        setAiAnswer(text)
        if (text) setCachedAnswer(searchQuery, text)
      } else {
        setAiAnswer('Sorry, I couldn\'t find an answer. Try rephrasing your question.')
      }
    } catch {
      setAiAnswer('Something went wrong. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  function closePanel() {
    setOpen(false)
    setSearchQuery('')
    setAiAnswer('')
    setExpandedItem(null)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-50 md:bg-transparent md:pointer-events-none"
            onClick={closePanel}
          />
          <div
            ref={panelRef}
            className="fixed z-50 inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:max-h-[32rem] bg-white md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header with tier badge */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-semibold text-navy-800">Help</h2>
                <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">
                  {tierLabel}
                </span>
              </div>
              <button
                onClick={closePanel}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Search — primary interaction at top */}
            <form onSubmit={handleSearch} className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ask anything..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* AI Answer */}
              {searching && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </div>
              )}
              {aiAnswer && !searching && (
                <div className="mb-4 p-3 bg-brand-50 rounded-xl">
                  <p className="text-sm text-gray-700 leading-relaxed">{aiAnswer}</p>
                  <p className="text-[10px] text-brand-400 mt-2">Powered by AI</p>
                </div>
              )}

              {/* Quick links — tier-aware + page-aware */}
              {quickLinks.map(section => (
                <div key={section.section} className="mb-3">
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    {section.section}
                  </h3>
                  <div className="space-y-0.5">
                    {section.items.map(item => (
                      <div key={item.q}>
                        <button
                          onClick={() => toggleItem(item.q)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          {expandedItem === item.q ? (
                            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                          )}
                          {item.q}
                        </button>
                        {expandedItem === item.q && (
                          <div className="ml-5 px-2.5 py-1.5 text-[13px] text-gray-500 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
