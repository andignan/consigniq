// Client-side image compression via canvas API
// Resizes to max 1200px on longest side, JPEG quality 0.8
// Fixes "Request Entity Too Large" on desktop Chrome (large uncompressed photos)

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB input limit

/**
 * Compresses an image file using canvas.
 * Returns a compressed Blob (JPEG) and a data URL preview.
 * Throws if the input file exceeds 10MB.
 */
export async function compressImage(file: File): Promise<{
  blob: Blob
  base64: string
  mediaType: string
  previewUrl: string
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image too large. Please use a photo under 10MB.')
  }

  // Load image
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Calculate scaled dimensions (max 1200px on longest side)
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

  // Draw to canvas
  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
  bitmap.close()

  // Export as JPEG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })

  // Convert to base64 for API payload
  const arrayBuf = await blob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  // Data URL for preview
  const previewUrl = URL.createObjectURL(blob)

  return { blob, base64, mediaType: 'image/jpeg', previewUrl }
}
