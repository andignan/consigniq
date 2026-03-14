/**
 * Category-specific description hints for better pricing accuracy.
 * Shown below the description field when description is empty or short (<20 chars).
 */
export const DESCRIPTION_HINTS: Record<string, string> = {
  'China & Crystal': 'For best results, add: pattern name, piece type (vase/bowl/decanter), size/height, and any markings',
  'Jewelry & Silver': 'For best results, add: metal type, weight if known, stone details, maker marks, and any hallmarks',
  'Collectibles & Art': 'For best results, add: artist name, medium, dimensions, signed/unsigned, and provenance if known',
  'Furniture': 'For best results, add: dimensions, maker/brand, period or decade, and any damage or repairs',
  'Electronics': 'For best results, add: model number, year, what\'s included (cables, remote, original box)',
  'Clothing & Shoes': 'For best results, add: brand, size, style name/number, and any flaws',
}

export const DESCRIPTION_HINT_THRESHOLD = 20

export function getDescriptionHint(category: string, description: string): string | null {
  if (description.length >= DESCRIPTION_HINT_THRESHOLD) return null
  return DESCRIPTION_HINTS[category] ?? null
}
