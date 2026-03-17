// Category-aware pricing configuration
// Different item categories have different pricing strategies and search terms

export interface CategoryConfig {
  label: string
  searchTerms: (name: string, description?: string) => string
  priceGuidance: string
  typicalMargin: { low: number; high: number } // percentage of retail
}

// Truncate description to first few words to avoid overly specific eBay searches
function shortDesc(desc?: string, maxWords = 4): string {
  if (!desc) return ''
  return desc.split(/\s+/).slice(0, maxWords).join(' ')
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'Clothing & Shoes': {
    label: 'Clothing & Shoes',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} clothing`.trim(),
    priceGuidance:
      'Clothing resale typically prices at 20-40% of original retail. Brand name and condition matter most. Fast fashion brands command less; designer labels hold value better.',
    typicalMargin: { low: 0.15, high: 0.4 },
  },
  'Furniture': {
    label: 'Furniture',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} furniture`.trim(),
    priceGuidance:
      'Furniture pricing depends heavily on brand, material, age, and condition. Solid wood and mid-century modern command premiums. Particle board and mass-produced pieces sell for much less. Consider local market — shipping is expensive.',
    typicalMargin: { low: 0.2, high: 0.5 },
  },
  'Jewelry & Silver': {
    label: 'Jewelry & Silver',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} jewelry`.trim(),
    priceGuidance:
      'Jewelry pricing varies enormously. Sterling silver has a melt value floor. Gold is priced by weight and karat. Costume jewelry depends on brand and era. Always check hallmarks. Signed designer pieces (Tiffany, David Yurman) carry significant premiums.',
    typicalMargin: { low: 0.25, high: 0.7 },
  },
  'China & Crystal': {
    label: 'China & Crystal',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} china crystal`.trim(),
    priceGuidance:
      'China and crystal have declined in resale value significantly. Complete sets are worth more than individual pieces. Brands like Waterford, Lalique, and Herend still hold value. Check for chips, cracks, and fading.',
    typicalMargin: { low: 0.1, high: 0.35 },
  },
  'Collectibles & Art': {
    label: 'Collectibles & Art',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} collectible`.trim(),
    priceGuidance:
      'Collectibles are highly variable. Provenance and authenticity matter. Art should be priced based on artist recognition, medium, size, and condition. Prints are worth far less than originals. Check for signatures.',
    typicalMargin: { low: 0.2, high: 0.6 },
  },
  'Electronics': {
    label: 'Electronics',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} used`.trim(),
    priceGuidance:
      'Electronics depreciate quickly. Check that items power on and function. Missing cords/accessories reduce value. Brand and model year matter. Apple products hold value best.',
    typicalMargin: { low: 0.15, high: 0.4 },
  },
  'Books & Games': {
    label: 'Books & Games',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} book`.trim(),
    priceGuidance:
      'Most books have very low resale value. First editions, signed copies, and rare/out-of-print titles are exceptions. Board games in complete condition with all pieces sell well. Video games — check if sealed or complete in box.',
    typicalMargin: { low: 0.1, high: 0.35 },
  },
  'Toys': {
    label: 'Toys',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} toy`.trim(),
    priceGuidance:
      'Vintage toys in original packaging command the highest prices. Brand recognition matters (LEGO, Hot Wheels, Barbie). Completeness is key — missing pieces reduce value significantly.',
    typicalMargin: { low: 0.15, high: 0.5 },
  },
  'Tools': {
    label: 'Tools',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} used tool`.trim(),
    priceGuidance:
      'Quality hand tools (Snap-on, Craftsman vintage) hold value well. Power tools depend on brand and condition. Battery-powered tools need working batteries. Check for rust and wear.',
    typicalMargin: { low: 0.2, high: 0.45 },
  },
  'Luxury & Designer': {
    label: 'Luxury & Designer',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} authentic`.trim(),
    priceGuidance:
      'Luxury items require authentication. Louis Vuitton, Chanel, Hermès hold value best. Check date codes, stitching, and hardware. Bags with dust bags and boxes sell for more. Price at 40-70% of retail for excellent condition.',
    typicalMargin: { low: 0.35, high: 0.7 },
  },
  'Kitchen & Home': {
    label: 'Kitchen & Home',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)} kitchen home`.trim(),
    priceGuidance:
      'Kitchen items vary widely. Le Creuset, KitchenAid, and All-Clad hold value. Generic kitchen items sell for very little. Home decor depends on style and brand.',
    typicalMargin: { low: 0.15, high: 0.4 },
  },
  Other: {
    label: 'Other',
    searchTerms: (name, desc) => `${name} ${shortDesc(desc)}`.trim(),
    priceGuidance:
      'Price based on comparable sold items. Consider brand, condition, age, and local market demand.',
    typicalMargin: { low: 0.15, high: 0.45 },
  },
}

export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIGS[category] ?? CATEGORY_CONFIGS['Other']
}
