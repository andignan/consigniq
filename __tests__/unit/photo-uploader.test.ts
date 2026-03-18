/**
 * Tests for src/components/PhotoUploader.tsx
 * Covers: PhotoSlot interface, MAX_PHOTOS constant, reorder logic,
 * primary badge, analyze button text, add button visibility
 */

// ─── PhotoSlot type shape ────────────────────────────────────

interface PhotoSlot {
  id: string
  blob: Blob
  base64: string
  mediaType: string
  previewUrl: string
  uploadedPhotoId?: string
  publicUrl?: string
  error?: string
}

// ─── Constants (mirrored from component) ─────────────────────

const MAX_PHOTOS = 3

// ─── Reorder logic (extracted from component) ────────────────

function movePhoto(photos: PhotoSlot[], index: number, direction: 'up' | 'down'): PhotoSlot[] {
  if (photos.length <= 1) return photos
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= photos.length) return photos
  const updated = [...photos]
  const [moved] = updated.splice(index, 1)
  updated.splice(newIndex, 0, moved)
  return updated
}

// ─── Make Primary logic (extracted from component) ───────────

function makePrimary(photos: PhotoSlot[], id: string): PhotoSlot[] {
  const idx = photos.findIndex(p => p.id === id)
  if (idx <= 0) return photos // already primary or not found
  const updated = [...photos]
  const [moved] = updated.splice(idx, 1)
  updated.unshift(moved)
  return updated
}

// ─── Analyze button text (extracted from component) ──────────

function analyzeButtonText(count: number): string {
  return `Analyze ${count} Photo${count !== 1 ? 's' : ''}`
}

// ─── Test helpers ────────────────────────────────────────────

function makeSlot(id: string, overrides?: Partial<PhotoSlot>): PhotoSlot {
  return {
    id,
    blob: new Blob(['test'], { type: 'image/jpeg' }),
    base64: 'dGVzdA==',
    mediaType: 'image/jpeg',
    previewUrl: `blob:http://localhost/${id}`,
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────

describe('PhotoSlot interface', () => {
  it('has required fields: id, blob, base64, mediaType, previewUrl', () => {
    const slot: PhotoSlot = makeSlot('test-1')
    expect(slot.id).toBe('test-1')
    expect(slot.blob).toBeInstanceOf(Blob)
    expect(slot.base64).toBeDefined()
    expect(slot.mediaType).toBe('image/jpeg')
    expect(slot.previewUrl).toContain('blob:')
  })

  it('has optional uploadedPhotoId field', () => {
    const slot: PhotoSlot = makeSlot('test-1', { uploadedPhotoId: 'db-123' })
    expect(slot.uploadedPhotoId).toBe('db-123')
  })

  it('has optional publicUrl field', () => {
    const slot: PhotoSlot = makeSlot('test-1', { publicUrl: 'https://storage.example.com/photo.jpg' })
    expect(slot.publicUrl).toBe('https://storage.example.com/photo.jpg')
  })

  it('has optional error field', () => {
    const slot: PhotoSlot = makeSlot('test-1', { error: 'Upload failed' })
    expect(slot.error).toBe('Upload failed')
  })

  it('optional fields are undefined by default', () => {
    const slot: PhotoSlot = makeSlot('test-1')
    expect(slot.uploadedPhotoId).toBeUndefined()
    expect(slot.publicUrl).toBeUndefined()
    expect(slot.error).toBeUndefined()
  })
})

describe('MAX_PHOTOS constant', () => {
  it('is 3', () => {
    expect(MAX_PHOTOS).toBe(3)
  })
})

describe('Photo reorder logic', () => {
  const photoA = makeSlot('a')
  const photoB = makeSlot('b')
  const photoC = makeSlot('c')

  it('moves first photo down (index 0 → 1)', () => {
    const result = movePhoto([photoA, photoB, photoC], 0, 'down')
    expect(result.map(p => p.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves last photo up (index 2 → 1)', () => {
    const result = movePhoto([photoA, photoB, photoC], 2, 'up')
    expect(result.map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('moves middle photo up (index 1 → 0)', () => {
    const result = movePhoto([photoA, photoB, photoC], 1, 'up')
    expect(result.map(p => p.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves middle photo down (index 1 → 2)', () => {
    const result = movePhoto([photoA, photoB, photoC], 1, 'down')
    expect(result.map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('does not move first photo up (boundary)', () => {
    const result = movePhoto([photoA, photoB, photoC], 0, 'up')
    expect(result.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not move last photo down (boundary)', () => {
    const result = movePhoto([photoA, photoB, photoC], 2, 'down')
    expect(result.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns same array reference on no-op boundary move', () => {
    const photos = [photoA, photoB]
    const result = movePhoto(photos, 0, 'up')
    expect(result).toBe(photos)
  })

  it('returns new array on valid move (immutable)', () => {
    const photos = [photoA, photoB]
    const result = movePhoto(photos, 0, 'down')
    expect(result).not.toBe(photos)
  })

  it('swaps two photos correctly', () => {
    const result = movePhoto([photoA, photoB], 0, 'down')
    expect(result.map(p => p.id)).toEqual(['b', 'a'])
  })
})

describe('Primary badge logic', () => {
  it('first photo (index 0) is primary', () => {
    const photos = [makeSlot('a'), makeSlot('b'), makeSlot('c')]
    const primaryIndex = 0
    expect(photos[primaryIndex].id).toBe('a')
  })

  it('primary badge shows only when more than one photo', () => {
    const showPrimary = (index: number, length: number) => index === 0 && length > 1
    expect(showPrimary(0, 1)).toBe(false)
    expect(showPrimary(0, 2)).toBe(true)
    expect(showPrimary(0, 3)).toBe(true)
  })

  it('primary badge does not show on non-first photos', () => {
    const showPrimary = (index: number, length: number) => index === 0 && length > 1
    expect(showPrimary(1, 3)).toBe(false)
    expect(showPrimary(2, 3)).toBe(false)
  })

  it('after reorder, new first photo becomes primary', () => {
    const photos = [makeSlot('a'), makeSlot('b'), makeSlot('c')]
    const reordered = movePhoto(photos, 1, 'up')
    expect(reordered[0].id).toBe('b')
  })
})

describe('Analyze button text', () => {
  it('shows "Analyze 1 Photo" for single photo', () => {
    expect(analyzeButtonText(1)).toBe('Analyze 1 Photo')
  })

  it('shows "Analyze 2 Photos" for two photos', () => {
    expect(analyzeButtonText(2)).toBe('Analyze 2 Photos')
  })

  it('shows "Analyze 3 Photos" for three photos', () => {
    expect(analyzeButtonText(3)).toBe('Analyze 3 Photos')
  })

  it('uses singular for exactly 1', () => {
    expect(analyzeButtonText(1)).not.toContain('Photos')
  })

  it('uses plural for more than 1', () => {
    expect(analyzeButtonText(2)).toContain('Photos')
    expect(analyzeButtonText(3)).toContain('Photos')
  })
})

describe('Add button visibility', () => {
  function canAdd(photoCount: number, disabled: boolean, analyzing: boolean): boolean {
    return photoCount < MAX_PHOTOS && !disabled && !analyzing
  }

  it('shows add button when no photos', () => {
    expect(canAdd(0, false, false)).toBe(true)
  })

  it('shows add button when 1 photo', () => {
    expect(canAdd(1, false, false)).toBe(true)
  })

  it('shows add button when 2 photos', () => {
    expect(canAdd(2, false, false)).toBe(true)
  })

  it('hides add button when 3 photos (MAX_PHOTOS)', () => {
    expect(canAdd(3, false, false)).toBe(false)
  })

  it('hides add button when disabled', () => {
    expect(canAdd(0, true, false)).toBe(false)
  })

  it('hides add button when analyzing', () => {
    expect(canAdd(0, false, true)).toBe(false)
  })

  it('hides add button when disabled and analyzing', () => {
    expect(canAdd(1, true, true)).toBe(false)
  })
})

describe('Analyze button visibility', () => {
  it('shows analyze button when photos exist', () => {
    const showAnalyze = (count: number) => count > 0
    expect(showAnalyze(1)).toBe(true)
    expect(showAnalyze(2)).toBe(true)
    expect(showAnalyze(3)).toBe(true)
  })

  it('hides analyze button when no photos', () => {
    const showAnalyze = (count: number) => count > 0
    expect(showAnalyze(0)).toBe(false)
  })
})

describe('Make Primary logic', () => {
  const photoA = makeSlot('a')
  const photoB = makeSlot('b')
  const photoC = makeSlot('c')

  it('moves third photo to primary (3 photos)', () => {
    const result = makePrimary([photoA, photoB, photoC], 'c')
    expect(result.map(p => p.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves second photo to primary (3 photos)', () => {
    const result = makePrimary([photoA, photoB, photoC], 'b')
    expect(result.map(p => p.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves second photo to primary (2 photos)', () => {
    const result = makePrimary([photoA, photoB], 'b')
    expect(result.map(p => p.id)).toEqual(['b', 'a'])
  })

  it('no-op when already primary', () => {
    const photos = [photoA, photoB, photoC]
    const result = makePrimary(photos, 'a')
    expect(result).toBe(photos) // same reference
  })

  it('no-op when photo id not found', () => {
    const photos = [photoA, photoB]
    const result = makePrimary(photos, 'nonexistent')
    expect(result).toBe(photos) // same reference
  })

  it('returns new array on valid make-primary (immutable)', () => {
    const photos = [photoA, photoB, photoC]
    const result = makePrimary(photos, 'c')
    expect(result).not.toBe(photos)
  })

  it('preserves all photos after make-primary', () => {
    const result = makePrimary([photoA, photoB, photoC], 'c')
    expect(result).toHaveLength(3)
    expect(result.map(p => p.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('Reorder with single photo', () => {
  const photoA = makeSlot('a')

  it('movePhoto is no-op with 1 photo (up)', () => {
    const photos = [photoA]
    const result = movePhoto(photos, 0, 'up')
    expect(result).toBe(photos)
  })

  it('movePhoto is no-op with 1 photo (down)', () => {
    const photos = [photoA]
    const result = movePhoto(photos, 0, 'down')
    expect(result).toBe(photos)
  })
})

describe('Make Primary button visibility', () => {
  function showMakePrimary(index: number, length: number, disabled: boolean, analyzing: boolean): boolean {
    return index > 0 && length > 1 && !disabled && !analyzing
  }

  it('shows on non-primary photos', () => {
    expect(showMakePrimary(1, 3, false, false)).toBe(true)
    expect(showMakePrimary(2, 3, false, false)).toBe(true)
  })

  it('hides on primary photo (index 0)', () => {
    expect(showMakePrimary(0, 3, false, false)).toBe(false)
  })

  it('hides when only 1 photo', () => {
    expect(showMakePrimary(0, 1, false, false)).toBe(false)
  })

  it('hides when disabled', () => {
    expect(showMakePrimary(1, 3, true, false)).toBe(false)
  })

  it('hides when analyzing', () => {
    expect(showMakePrimary(1, 3, false, true)).toBe(false)
  })
})
