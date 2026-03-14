'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string
  className?: string
}

export default function Tooltip({ content, className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 inline-flex items-center justify-center transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 leading-relaxed">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 -translate-y-1" />
          </div>
        </div>
      )}
    </div>
  )
}
