# AI Pricing Engine — PRD

**Status:** Implemented

## Overview

Three-stage pricing flow: eBay comp lookup → AI price suggestion → optional photo identification. All Claude calls use singleton `getAnthropicClient()` with model `claude-sonnet-4-20250514`.

## eBay Comp Lookup (`/api/pricing/comps`)

**SerpApi parameters:** `engine: 'ebay'`, `_nkw: <category-aware query>`, `LH_Sold: '1'`, `LH_Complete: '1'`, `LH_ItemCondition: '3000'` (pre-owned only).

**Search query:** Delegates to `getCategoryConfig(category).searchTerms(name, description)` — appends category-specific suffix (e.g., "clothing", "furniture", "authentic").

**Filtering pipeline:** Drop results with no `price.raw` → exclude new-condition listings (`brand new`, `new`, `new with tags`, `new without tags`, `new with defects`, `new other`) → take first 8 → parse price (strip non-numeric) → drop price=0.

**Response:** `CompResult { title, price, link, condition?, thumbnail? }`. Source: `'ebay' | 'none' | 'ebay_error' | 'error'`.

**Auth:** Explicit `getUser()` check. Graceful degradation if `SERPAPI_KEY` not set (returns empty comps, no error).

## AI Price Suggestion (`/api/pricing/suggest`)

**Request:** `{ name, category, condition, description?, comps[], photoBase64?, photoMediaType?, photos?: Array<{ base64, mediaType }> }`

**Multi-photo support:** Accepts `photos` array (preferred) or legacy `photoBase64`/`photoMediaType` (backward compat). When `photos` array is provided, all are sent as image content blocks to Claude.

**Tier-aware prompts:**
- **Solo:** "resale pricing expert" — prices for eBay/Poshmark/Marketplace. Guidance: competitive pricing for faster sale.
- **Starter+:** "consignment shop pricing expert" — prices for brick-and-mortar. Guidance: 10-20% below eBay, lean middle-low for turnover.

**Prompt includes:** Item details, category pricing notes (`priceGuidance`), rounding rules ($5/<$50, $10/<$200, $25/>$200), comps section (numbered list or fallback text).

**Response:** `PriceSuggestion { price, low, high, reasoning }`. Claude generates JSON, validated for correct types.

**Usage limits:** Solo: 200/month. Counter resets after 30 days. When monthly exhausted, uses bonus lookups. Starter/Standard/Pro: unlimited (`aiPricingLimit: null`). Usage incremented via `increment_ai_lookups` RPC post-success.

**Photo support:** If `photoBase64`/`photoMediaType` provided, image block sent to Claude alongside text prompt.

## Photo Identification (`/api/pricing/identify`)

**Input:** `multipart/form-data` with photo fields. Supports 1-3 photos via `photo` (backward compat) + `photo_1`, `photo_2`, `photo_3` fields. Supported formats: JPEG, PNG, WebP.

**Multi-photo support:** When multiple photos are provided, all are sent as separate image content blocks to Claude vision. Prompt includes "Multiple photos may show different angles" note. `max_tokens` set to 400 (up from 300 for single photo).

**Claude vision prompt:** Identifies name (with brand), category (one of 12), condition (one of 10), and description (brand, material, size, color, features, damage). Returns `IdentifyResult` JSON.

**Client-side compression:** All callers use `compressImage()` before upload — max 1200px on longest side, JPEG 0.8 quality, 10MB input limit. Multi-photo callers use `{ maxFileSize: 400 * 1024 }` option for 400KB target with quality retry (0.8 → 0.6 → 0.4).

**"Analyze Photos" button:** Photo identification is no longer auto-triggered on upload. Users click "Analyze Photos" button (in `PhotoUploader` component) to manually trigger identification. This allows uploading multiple photos before analyzing.

## Cross-Account Pricing Intelligence (`/api/pricing/cross-account`)

**Tier enforcement:** Pro-only via `canUseFeature(tier, 'cross_customer_pricing')`.

**Three-level matching** (queries `price_history`, `sold=true`, `sold_price` not null):
1. **Exact:** name + category + condition. Needs ≥3 samples.
2. **Fuzzy:** name (ilike) + category. Needs ≥3 samples.
3. **Category fallback:** category only. Needs ≥3 samples.

Returns `CrossAccountStats { sample_count, avg/min/max/median_sold_price, avg_days_to_sell, match_level, insight_text? }`.

**AI insight:** Optional Claude call (max_tokens: 150) generating 1-2 sentence actionable pricing insight. Non-critical.

## 12 Item Categories

| Category | Search suffix | Margin range | Key guidance |
|---|---|---|---|
| Clothing & Shoes | `clothing` | 15-40% | 20-40% of retail |
| Furniture | `furniture` | 20-50% | Solid wood premium, particle board low |
| Jewelry & Silver | `jewelry` | 25-70% | Sterling has melt value floor |
| China & Crystal | `china crystal` | 10-35% | Declined in value, complete sets > pieces |
| Collectibles & Art | `collectible` | 20-60% | Provenance matters, prints << originals |
| Electronics | `used` | 15-40% | Depreciates quickly, Apple holds best |
| Books & Games | `book` | 10-35% | Most low value, first editions are exceptions |
| Toys | `toy` | 15-50% | Vintage in original packaging highest |
| Tools | `used tool` | 20-45% | Quality brands hold value |
| Luxury & Designer | `authentic` | 35-70% | Authentication required |
| Kitchen & Home | `kitchen home` | 15-40% | Le Creuset/KitchenAid hold value |
| Other | (none) | 15-45% | Price by comparables |

## Description Hints

6 categories show hints when description < 20 chars: China & Crystal, Jewelry & Silver, Collectibles & Art, Furniture, Electronics, Clothing & Shoes. Hints prompt for category-specific details (pattern name, metal type, dimensions, model number, etc.).
