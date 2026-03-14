// ConsignIQ Help Knowledge Base — used as system context for AI help search
export const HELP_KNOWLEDGE_BASE = `ConsignIQ Help Knowledge Base

CONSIGNORS: A consignor is a person who brings items to the store to sell. You create a consignor profile with their name, phone, email, and notes. Each consignor gets a 60-day agreement window (configurable in Settings). The default split is 60% store / 40% consignor but can be changed per consignor.

INTAKE: When a consignor arrives, use the Intake screen to quickly log all items they are leaving. Press Enter to move to the next item. You do not need to price items at intake — pricing happens separately after the consignor leaves.

PRICING: The AI pricing engine suggests a price for each item based on its category, condition, and live eBay sold comps. It shows a recommended price, a low/high range, and a 2-3 sentence explanation. You can accept the suggestion with one click or override it manually. Different categories use different logic: clothing uses 1/3 of retail, furniture uses eBay comps, books are fixed $2-5.

60-DAY LIFECYCLE: Each consignor agreement runs for 60 days from intake. Items not sold by day 60 trigger an expiry notification. A 3-day grace period follows (days 61-63) for the consignor to pick up unsold items. After day 63, unsold items are eligible to be marked for donation. The dashboard shows color-coded countdown indicators: green (>14 days), yellow (8-14 days), orange (1-7 days), red (grace period).

MARKDOWNS: If markdown schedules are enabled in Settings, items automatically reduce in price: 25% off at day 31, 50% off at day 46. The effective price shown in inventory reflects the current markdown. Original price is always preserved.

INVENTORY: The inventory page shows all items across all consignors. Filter by status (pending/priced/sold/donated), category, condition, or consignor. Use "Mark as Sold" on priced items. Use "Price" on pending items to go to the pricing screen.

REPORTS: The reports page shows payout summaries per consignor, total inventory value, days-to-sell tracking, and CSV export. Consignor payout = their split % × sold price for each item sold.

SETTINGS: Location Settings include store name, address, default split %, agreement days, grace days, and markdown schedule toggle. Account Settings include account name, tier, billing management, and user/staff management. Only owners can edit settings. Staff see settings as read-only.

STAFF & USERS: Owners can invite staff via Settings → Account → Invite User. Staff can do intake and pricing but cannot change settings or view account billing. Two roles: owner and staff.

MULTI-LOCATION: If you have multiple store locations, use the location switcher in the sidebar to switch between them. Owners can see all locations. Staff are locked to their assigned location. Owners can see an All Locations aggregate view on the dashboard.`
