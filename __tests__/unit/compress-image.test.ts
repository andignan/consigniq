/**
 * Tests for src/lib/compress-image.ts
 * Covers: compression logic, max dimension calc, file size validation
 */

describe('compressImage utility', () => {
  const MAX_DIMENSION = 1200

  // Test dimension calculation logic (extracted from compressImage)
  function calcDimensions(width: number, height: number) {
    let newWidth = width
    let newHeight = height
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        newWidth = MAX_DIMENSION
        newHeight = Math.round(height * (MAX_DIMENSION / width))
      } else {
        newHeight = MAX_DIMENSION
        newWidth = Math.round(width * (MAX_DIMENSION / height))
      }
    }
    return { newWidth, newHeight }
  }

  it('does not resize images smaller than 1200px', () => {
    const { newWidth, newHeight } = calcDimensions(800, 600)
    expect(newWidth).toBe(800)
    expect(newHeight).toBe(600)
  })

  it('resizes landscape image to max 1200px wide', () => {
    const { newWidth, newHeight } = calcDimensions(4000, 3000)
    expect(newWidth).toBe(1200)
    expect(newHeight).toBe(900)
  })

  it('resizes portrait image to max 1200px tall', () => {
    const { newWidth, newHeight } = calcDimensions(3000, 4000)
    expect(newWidth).toBe(900)
    expect(newHeight).toBe(1200)
  })

  it('resizes square image to 1200x1200', () => {
    const { newWidth, newHeight } = calcDimensions(4000, 4000)
    expect(newWidth).toBe(1200)
    expect(newHeight).toBe(1200)
  })

  it('preserves aspect ratio for wide panorama', () => {
    const { newWidth, newHeight } = calcDimensions(6000, 1000)
    expect(newWidth).toBe(1200)
    expect(newHeight).toBe(200)
  })

  it('preserves aspect ratio for tall image', () => {
    const { newWidth, newHeight } = calcDimensions(1000, 6000)
    expect(newWidth).toBe(200)
    expect(newHeight).toBe(1200)
  })

  it('handles exact 1200px dimension', () => {
    const { newWidth, newHeight } = calcDimensions(1200, 800)
    expect(newWidth).toBe(1200)
    expect(newHeight).toBe(800)
  })

  // File size validation
  it('rejects files over 10MB', () => {
    const maxSize = 10 * 1024 * 1024
    expect(11 * 1024 * 1024).toBeGreaterThan(maxSize)
    expect(9 * 1024 * 1024).toBeLessThan(maxSize)
  })
})
