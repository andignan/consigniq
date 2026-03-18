'use client'

import { useRef } from 'react'
import { Camera, X, ChevronUp, ChevronDown, Loader2, Sparkles } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

export interface PhotoSlot {
  id: string              // local temp ID
  blob: Blob              // compressed
  base64: string          // for API
  mediaType: string
  previewUrl: string      // object URL
  uploadedPhotoId?: string // DB ID after upload
  publicUrl?: string       // storage URL after upload
  error?: string
}

interface PhotoUploaderProps {
  photos: PhotoSlot[]
  onPhotosChange: (photos: PhotoSlot[]) => void
  onFileSelected: (file: File) => void  // parent handles compression
  onAnalyze: () => void
  analyzing?: boolean
  disabled?: boolean
  compact?: boolean
}

const MAX_PHOTOS = 3

// ─── Component ────────────────────────────────────────────────

export default function PhotoUploader({
  photos,
  onPhotosChange,
  onFileSelected,
  onAnalyze,
  analyzing = false,
  disabled = false,
  compact = false,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function removePhoto(id: string) {
    const updated = photos.filter(p => p.id !== id)
    onPhotosChange(updated)
  }

  function movePhoto(index: number, direction: 'up' | 'down') {
    if (photos.length <= 1) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= photos.length) return
    const updated = [...photos]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    onPhotosChange(updated)
  }

  function makePrimary(id: string) {
    const idx = photos.findIndex(p => p.id === id)
    if (idx <= 0) return // already primary or not found
    const updated = [...photos]
    const [moved] = updated.splice(idx, 1)
    updated.unshift(moved)
    onPhotosChange(updated)
  }

  function handleFileSelect() {
    if (photos.length >= MAX_PHOTOS || disabled || analyzing) return
    fileInputRef.current?.click()
  }

  const slotSize = compact ? 'w-20 h-20' : 'w-[120px] h-[120px]'
  const canAdd = photos.length < MAX_PHOTOS && !disabled && !analyzing

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
      />

      {/* Photo slots row */}
      <div className="flex gap-2 items-start flex-wrap">
        {photos.map((photo, index) => (
          <div key={photo.id} className="flex flex-col items-center">
            <div className="relative group">
              <div className={`${slotSize} rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative`}>
                <img
                  src={photo.previewUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Error badge */}
                {photo.error && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    Error
                  </span>
                )}
              </div>

              {/* Remove button */}
              {!disabled && !analyzing && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                </button>
              )}

              {/* Reorder buttons */}
              {photos.length > 1 && !disabled && !analyzing && (
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'up')}
                      className="p-0.5 bg-white border border-gray-200 rounded shadow-sm hover:bg-brand-50 transition-colors"
                      title="Move left"
                    >
                      <ChevronUp className="w-3 h-3 text-gray-500 rotate-[-90deg]" />
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'down')}
                      className="p-0.5 bg-white border border-gray-200 rounded shadow-sm hover:bg-brand-50 transition-colors"
                      title="Move right"
                    >
                      <ChevronDown className="w-3 h-3 text-gray-500 rotate-[-90deg]" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Primary control pill */}
            {photos.length > 1 && !disabled && !analyzing && (
              index === 0 ? (
                <span className="text-xs py-1 px-2 rounded-full w-full text-center mt-1 bg-brand-600 text-white cursor-default">
                  ★ Primary
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(photo.id)}
                  className="text-xs py-1 px-2 rounded-full w-full text-center mt-1 bg-gray-100 border border-gray-300 text-gray-600 hover:bg-brand-50 hover:border-brand-500 hover:text-brand-600 transition-colors"
                >
                  Set Primary
                </button>
              )
            )}
          </div>
        ))}

        {/* Empty slot / add button */}
        {canAdd && (
          <button
            type="button"
            onClick={handleFileSelect}
            className={`${slotSize} flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-200 rounded-xl text-brand-400 hover:border-brand-300 hover:text-brand-500 transition-colors`}
          >
            <Camera className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            {!compact && <span className="text-[10px]">Add photo</span>}
          </button>
        )}
      </div>

      {/* Analyze button — always visible, disabled when no photos */}
      <button
        type="button"
        onClick={onAnalyze}
        disabled={analyzing || disabled || photos.length === 0}
        className={`mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
          photos.length === 0
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : photos.length >= MAX_PHOTOS
              ? 'text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'
              : 'border-2 border-brand-600 text-brand-600 bg-white hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {analyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {photos.length > 0
              ? `Analyze ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`
              : 'Analyze Photos'}
          </>
        )}
      </button>
    </div>
  )
}
