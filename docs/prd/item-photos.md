# Item Photos PRD

## Overview
Items support up to 3 photos stored in Supabase Storage with metadata in `item_photos` table. Photos are compressed client-side before upload and used for AI identification via Claude vision.

## Database Schema

### `item_photos` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| item_id | uuid | FK → items(id), CASCADE delete |
| account_id | uuid | FK → accounts(id) |
| storage_path | text | Path in Supabase Storage |
| public_url | text | Public URL for display |
| display_order | smallint | 0-based ordering |
| is_primary | boolean | true for display_order=0 |
| created_at | timestamptz | Auto-set |

RLS: Users can manage photos for their account.

### Storage
- Bucket: `item-photos` (public, 2MB limit, jpeg/png/webp)
- Path format: `items/{item_id}/photo_{timestamp}_{rand}.jpg`
- Must be created manually in Supabase Dashboard

## API Routes

### `POST /api/items/[id]/photos`
Upload a photo. Accepts FormData with `photo` file. Enforces max 3 per item. Sets `is_primary=true` for first photo.

### `GET /api/items/[id]/photos`
Returns ordered photos for an item.

### `DELETE /api/items/[id]/photos/[photoId]`
Removes photo from storage and database. Promotes next photo to primary if deleted was primary. Re-normalizes display_order.

### `PATCH /api/items/[id]/photos/reorder`
Accepts `{ photo_ids: string[] }` ordered array. Updates display_order and is_primary.

## Primary Photo
- `is_primary=true` for `display_order=0`
- Shown as thumbnail (32x32) in inventory list
- Items GET API returns `primary_photo_url` field via left join

## Photo Lifecycle
- Upload: compressed client-side (max 1200px, JPEG, with 400KB target for storage)
- Storage: uploaded to Supabase Storage after item save (Price Lookup, IntakeQueue) or immediately (Inventory pricing)
- Deletion: CASCADE on item delete; storage files cleaned up in items DELETE handler
- Account deletion: storage files batch-deleted before account data deletion

## Client-Side Compression
`src/lib/compress-image.ts` with optional `maxFileSize` parameter:
- Default: 1200px max dimension, JPEG quality 0.8
- With maxFileSize: retries at quality 0.6, then 0.4 if output exceeds target
- New callers use `{ maxFileSize: 400 * 1024 }` (400KB)

## PhotoUploader Component
`src/components/PhotoUploader.tsx` — shared across Price Lookup, Inventory pricing, and IntakeQueue.

Props:
- `photos: PhotoSlot[]` — current photos
- `onPhotosChange` — update photos array (for remove/reorder)
- `onFileSelected` — parent handles compression + state update
- `onAnalyze` — triggers AI identification
- `analyzing` — shows loading state
- `compact` — smaller slots for IntakeQueue rows

UI:
- Horizontal row of up to 3 photo slots (80px compact, 120px full)
- Empty slot with teal dashed border (`border-brand-200`) and teal icon/text (`text-brand-400`) — inviting visual flow toward adding photos
- Always-visible primary control pills below each photo when >1 photo:
  - Primary photo (index 0): filled teal "★ Primary" label (not clickable)
  - Non-primary photos: "Set Primary" button (`bg-gray-100 border-gray-300 text-gray-600`, hover: `bg-brand-50 border-brand-500 text-brand-600`) — moves photo to position 0 in one action
  - Note: hover-dependent controls are avoided for mobile accessibility
- Hover reorder arrows (left/right)
- Single photo: no reorder arrows or primary controls shown
- "Analyze Photos" button — always visible with three visual states:
  - 0 photos (disabled): `bg-gray-200 text-gray-400 cursor-not-allowed` — clearly inactive
  - 1-2 photos (slots remaining): teal outline (`border-2 border-brand-600 text-brand-600 bg-white`) — available but secondary, encourages adding more photos
  - 3 photos (full): filled teal (`bg-brand-600 text-white hover:bg-brand-700`) — full prominence, ready to analyze
- Mobile: `capture="environment"` for camera-first

## AI Multi-Photo Support
- `/api/pricing/identify` accepts `photo` + `photo_1`, `photo_2`, `photo_3` FormData fields
- Builds multiple Claude vision image content blocks
- Prompt adjusted for multi-photo: "Multiple photos may show different angles"
- max_tokens bumped from 300 → 400

- `/api/pricing/suggest` accepts `photos: Array<{ base64, mediaType }>` alongside legacy `photoBase64`/`photoMediaType`

## Deprecation
`items.photo_url` is deprecated in favor of `item_photos` table. The column remains for backward compatibility but is not used by new code.
