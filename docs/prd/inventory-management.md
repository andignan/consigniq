# Inventory Management — PRD

**Status:** Implemented

## Item Conditions

10 valid conditions (ordered best to worst):
`new_in_box`, `new_with_tags`, `new_without_tags`, `new`, `like_new`, `excellent`, `very_good`, `good`, `fair`, `poor`

Defined in `src/types/index.ts` as `ItemCondition` type and `CONDITION_LABELS` map. Used in all condition dropdowns (intake, pricing, inventory edit) and the AI identification prompt.

## Item Status States

| Status | Description | Transition from | Transition to |
|---|---|---|---|
| `pending` | Intake'd, not yet priced | (creation) | `priced`, `archived` |
| `priced` | Has a price assigned | `pending`, `archived` (restore) | `sold`, `donated`, `archived` |
| `sold` | Sold to customer | `priced` | (terminal — cannot delete) |
| `donated` | Donated after grace period | `priced` | (terminal — can only delete) |
| `archived` | Soft archive, hidden from All tab | `pending`, `priced` | `priced` (restore if price), `pending` (restore if no price) |

## Item Actions

| Action | Description | Available on | Button |
|---|---|---|---|
| **Archive** | Hides item from main inventory. Reversible. | pending, priced | Archive icon |
| **Restore** | Returns archived item to active inventory | archived | "Restore" button + RotateCcw icon |
| **Delete** | Permanently removes item from database. Irreversible. | pending, priced, donated, archived (NOT sold) | Trash icon with `confirm()` dialog |
| **Sell** | Marks item as sold, records sold_price | priced only | "Sell" button |
| **Donate** | Marks item as donated | priced only | Gift icon |

**"All" tab hides archived items.** Archived items only appear in the Archived tab. This is filtered client-side after fetch.

## Auto-Timestamps on PATCH

- `status = 'sold'` → sets `sold_date` (date only, YYYY-MM-DD)
- `status = 'donated'` → sets `donated_at` (ISO timestamp)
- `price` provided → sets `priced_at` (ISO timestamp) + forces `status = 'priced'`

## Price History on Sold

When an item is marked sold, a `price_history` record is automatically inserted:
- `sold_price`: prefers `updates.sold_price` → `item.sold_price` → `item.price`
- `days_to_sell`: computed from `priced_at` to `sold_date`
- `sold: true`
- Wrapped in try/catch — failure is non-fatal

## Solo vs Shop+ Inventory

| Aspect | Solo | Shop+ |
|---|---|---|
| Page title | "My Inventory" | "Inventory" |
| Status tabs | All / Priced / Sold / Archived | All / Pending / Priced / Sold / Donated / Archived |
| Consignor filter | Hidden | Shown ("All Consignors" dropdown) |
| `consignor_id` | null (no consignors) | Required (linked to consignor) |
| Empty state | "No items yet" + "Price an Item" CTA | "No items found" |
| Save from pricing | "Save to My Inventory" button | Not shown (items created via intake) |

## Save from Price Lookup (Solo)

**Flow:** Solo user prices an item on `/dashboard/pricing` → clicks "Save to My Inventory" → POST `/api/items` with `consignor_id: null`, `price`, `low_price`, `high_price`, `ai_reasoning` → item saved with `status: 'priced'` and `priced_at` set → full page reload via `window.location.href` to `/dashboard/pricing` (guarantees clean state for next item).

**Key details:**
- `consignor_id` is nullable in the items table (migration `20260316000000`) — Solo users have no consignors
- Items saved from Price Lookup have `status: 'priced'` (not `pending`) since they already have a price
- `priced_at` is set automatically when `price` is provided in the POST body
- The API validation does NOT require `consignor_id` — it's optional
- RLS scopes items by `account_id`, which works regardless of `consignor_id` being null

## Markdown Schedule

If `markdown_enabled` on the location:
- Day 31: `current_markdown_pct = 25` → `effective_price = price * 0.75`
- Day 46: `current_markdown_pct = 50` → `effective_price = price * 0.50`
- Labels show original price struck through + effective price

## CSV Export

Client-side export with columns: name, category, condition, status, price, sold_price, consignor name, intake_date, description.

## Label Printing

**Endpoint:** POST `/api/labels/generate` with `{ item_ids[], size: '2x1' | '4x2' }`

**Sizes:** 2.25" x 1.25" (default) or 4" x 2"

**Label content:** Item name (2-line max), category + condition, price (with strikethrough for markdowns), consignor (first name + last initial), location name, short item ID (last 6 chars), ConsignIQ branding.

**Technology:** `pdf-lib` with Helvetica/HelveticaBold. One page per item. Returns PDF blob. Client opens PDF via dynamically created `<a>` tag click (instead of `window.open`) to avoid Safari popup blocker.

## Bulk Actions

- "Print Labels" toggle button enters selection mode (checkboxes appear on each item row)
- "Select All" checkbox in header
- Bulk actions bar appears when items selected: count, label size picker, Print Labels button, Clear
- Single-item label printing: print icon button on priced items (no selection mode needed)
- Label size picker (2.25"x1.25" or 4"x2")

## API

**GET `/api/items`:** Params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search` (ilike on name). Joins `consignor:consignors(id, name)`.

**POST `/api/items`:** Required: `account_id`, `location_id`, `consignor_id`, `name`, `category`, `condition`. Sets `status: 'pending'`, `intake_date: today`, `current_markdown_pct: 0`.

**PATCH `/api/items`:** Takes `{ id, ...updates }`. Handles auto-timestamps and price_history write.

**DELETE `/api/items`:** Takes `{ id }`. Blocks deletion of sold items (returns 400 — "Cannot delete sold items — this would affect payout history"). Hard deletes the row from the database.
