// Client-side image compression via canvas API
// Resizes to max 1200px on longest side, JPEG quality 0.8
// Fixes "Request Entity Too Large" on desktop Chrome (large uncompressed photos)

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.8
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB input limit
const RETRY_QUALITIES = [0.6, 0.4]

interface CompressOptions {
  maxFileSize?: number // Target max output size in bytes (e.g. 400 * 1024 for 400KB)
}

/**
 * Compresses an image file using canvas.
 * Returns a compressed Blob (JPEG) and a data URL preview.
 * Throws if the input file exceeds 10MB.
 *
 * If options.maxFileSize is set and output exceeds it, retries at lower quality levels.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<{
  blob: Blob
  base64: string
  mediaType: string
  previewUrl: string
}> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image too large. Please use a photo under 10MB.')
  }

  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Please choose a JPG, PNG, WebP, or HEIC photo.')
  }

  // Load image (falls back to <img> decode, which handles HEIC in Safari)
  const source = await decodeImage(file)
  const { width, height } = source

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
  ctx.drawImage(source.image, 0, 0, newWidth, newHeight)
  source.release()

  // Export as JPEG blob, with quality retry loop if maxFileSize is set
  const qualities = [JPEG_QUALITY, ...RETRY_QUALITIES]
  let blob: Blob | null = null

  for (const quality of qualities) {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas compression failed'))),
        'image/jpeg',
        quality
      )
    })

    if (!options?.maxFileSize || blob.size <= options.maxFileSize) {
      break
    }
  }

  if (!blob) {
    throw new Error('Canvas compression failed')
  }

  // Convert to base64 for API payload
  const arrayBuf = await blob.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  // Data URL for preview
  const previewUrl = URL.createObjectURL(blob)

  return { blob, base64, mediaType: 'image/jpeg', previewUrl }
}

const UNREADABLE_IMAGE_MESSAGE =
  "Couldn't read this photo. Please try a JPG or PNG version."

interface DecodedImage {
  image: CanvasImageSource
  width: number
  height: number
  release: () => void
}

/**
 * Decodes an image file for drawing to canvas.
 * Tries createImageBitmap first, then an <img> element. The <img> path covers
 * formats like HEIC that some browsers render but cannot decode into a bitmap.
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  } catch {
    // Fall through to <img> decode
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('empty image')
    return {
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)
  }

  // Chrome and Firefox can't decode HEIC (iPhone photos AirDropped to a Mac).
  // Decode with heic-to (libheif in a Web Worker), loaded only when needed.
  // Full-size iPhone photos take roughly 20s in Chrome.
  if (isHeic(file)) {
    try {
      const { heicTo } = await import('heic-to/next')
      const bitmap = await heicTo({ blob: file, type: 'bitmap' })
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Fall through to error
    }
  }

  throw new Error(UNREADABLE_IMAGE_MESSAGE)
}

export function isHeic(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}
