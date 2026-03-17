'use client'

import { useEffect, useCallback } from 'react'
import { MODAL_BACKDROP, MODAL_CONTAINER } from '@/lib/style-constants'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
}

export default function Modal({ open, onClose, title, children, maxWidth }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  if (!open) return null

  const containerClass = maxWidth
    ? MODAL_CONTAINER.replace('max-w-md', maxWidth)
    : MODAL_CONTAINER

  return (
    <div className={MODAL_BACKDROP} onClick={onClose}>
      <div className={containerClass} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy-800">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
