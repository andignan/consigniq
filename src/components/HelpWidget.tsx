'use client'

import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle, X, Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'

const QUICK_LINKS = [
  {
    section: 'Getting Started',
    items: [
      {
        q: 'How do I add a consignor?',
        a: 'Go to Consignors from the sidebar and click "New Consignor". Fill in their name, phone, email, and notes. The agreement dates and split percentages will use your location defaults.',
      },
      {
        q: 'How does pricing work?',
        a: 'From Inventory, click "Price" on a pending item. The AI pricing engine uses eBay sold comps and category-specific logic to suggest a price with a low/high range. You can accept the AI suggestion or enter a manual price.',
      },
      {
        q: 'What happens at 60 days?',
        a: 'After 60 days (configurable in Settings), a consignor\'s agreement expires. A 3-day grace period follows for item pickup. After the grace period, unsold items become eligible to be marked for donation.',
      },
    ],
  },
  {
    section: 'Pricing Help',
    items: [
      {
        q: 'What is AI pricing?',
        a: 'AI pricing uses Claude to analyze your item\'s category, condition, description, and live eBay sold comps to suggest a fair consignment store price. It provides a recommended price, a range, and reasoning.',
      },
      {
        q: 'How do eBay comps work?',
        a: 'The system searches eBay\'s completed/sold listings for similar items. These real sale prices are used as reference points for pricing. Comps are shown alongside the AI suggestion so you can compare.',
      },
      {
        q: 'Can I override a price?',
        a: 'Yes. After getting an AI suggestion or eBay comps, use the "Manual Price Override" field to enter any price you want. The manual price takes precedence over the AI suggestion when you click Apply.',
      },
    ],
  },
  {
    section: 'Account & Settings',
    items: [
      {
        q: 'How do I invite staff?',
        a: 'Go to Settings → Account Settings → click "Invite User". Enter their email and select their role (owner or staff). They\'ll receive an invitation to join your account.',
      },
      {
        q: 'How do I change split percentages?',
        a: 'Go to Settings → Location Settings. The "Default Store Split %" and "Default Consignor Split %" fields control the revenue split for new consignors. Both must add to 100%.',
      },
      {
        q: 'What do the tiers include?',
        a: 'ConsignIQ offers Starter, Standard, and Pro tiers. Each tier determines your feature access and usage limits. Your current tier is shown in Account Settings. Contact support to upgrade.',
      },
    ],
  },
]

export default function HelpWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Don't render on /admin pages
  if (pathname.startsWith('/admin')) return null

  function toggleItem(q: string) {
    setExpandedItem(prev => prev === q ? null : q)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim() || searching) return
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
        setAiAnswer(answer ?? '')
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
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900">Help</h2>
              </div>
              <button
                onClick={closePanel}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                <div className="mb-4 p-3 bg-indigo-50 rounded-xl">
                  <p className="text-sm text-gray-800 leading-relaxed">{aiAnswer}</p>
                  <p className="text-[10px] text-indigo-400 mt-2">Powered by AI</p>
                </div>
              )}

              {/* Quick links */}
              {QUICK_LINKS.map(section => (
                <div key={section.section} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {section.section}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <div key={item.q}>
                        <button
                          onClick={() => toggleItem(item.q)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          {expandedItem === item.q ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                          {item.q}
                        </button>
                        {expandedItem === item.q && (
                          <div className="ml-6 px-3 py-2 text-sm text-gray-600 leading-relaxed">
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
