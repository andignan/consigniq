// ConsignIQ Help Knowledge Base — used as system context for AI help search
export const HELP_KNOWLEDGE_BASE = `ConsignIQ Help Knowledge Base

SOLO PRICER: Solo Pricer ($9/month) is a pricing-only plan for individual resellers. It includes 200 AI pricing lookups per month, eBay sold comp lookups, photo-based item identification, personal inventory tracking, and CSV export. Solo users do not have consignor management, lifecycle tracking, reports, payouts, or staff accounts. The usage counter resets 30 days from the last reset. Bonus lookup packs (50 for $5) can be purchased and never expire. Solo users can save priced items to their personal inventory from the Price Lookup page.

AI LOOKUPS: Each "Full AI Pricing" or "eBay Comps Only" action on the pricing page counts as one lookup. Solo users get 200 per month. Shop and Enterprise users get unlimited lookups. Solo users can buy additional 50-lookup packs for $5 from the dashboard or Settings → Billing.

PHOTO IDENTIFICATION: Upload a photo of any item using the camera icon on the Price Lookup or Item Intake pages. The AI identifies the item name, category, condition, and description automatically. Photos are compressed to 1200px max before upload. Supported formats: JPG, PNG, WebP.

CONSIGNORS: A consignor is a person who brings items to the store to sell. You create a consignor profile with their name, phone, email, and notes. Each consignor gets a 60-day agreement window (configurable in Settings). The default split is 60% store / 40% consignor but can be changed per consignor. Consignor management requires Shop tier or above.

INTAKE: When a consignor arrives, use the Intake screen to quickly log all items they are leaving. Press Enter to move to the next item. You do not need to price items at intake — pricing happens separately after the consignor leaves.

PRICING: The AI pricing engine suggests a price for each item based on its category, condition, and live eBay sold comps. It shows a recommended price, a low/high range, and a 2-3 sentence explanation. You can accept the suggestion with one click or override it manually. Different categories use different logic: clothing uses 1/3 of retail, furniture uses eBay comps, books are fixed $2-5.

60-DAY LIFECYCLE: Each consignor agreement runs for 60 days from intake. Items not sold by day 60 trigger an expiry notification. A 3-day grace period follows (days 61-63) for the consignor to pick up unsold items. After day 63, unsold items are eligible to be marked for donation. The dashboard shows color-coded countdown indicators: green (>14 days), yellow (8-14 days), orange (1-7 days), red (grace period).

MARKDOWNS: If markdown schedules are enabled in Settings, items automatically reduce in price: 25% off at day 31, 50% off at day 46. The effective price shown in inventory reflects the current markdown. Original price is always preserved.

INVENTORY: The inventory page shows all items. Solo users see All/Priced/Sold/Archived tabs. Shop+ users see All/Pending/Priced/Sold/Donated tabs with consignor filter. Use "Mark as Sold" on priced items. Use "Price" on pending items to go to the pricing screen.

REPORTS: The reports page shows payout summaries per consignor, total inventory value, days-to-sell tracking, and CSV export. Consignor payout = their split % × sold price for each item sold. Reports require Shop tier or above.

SETTINGS: Solo users see Billing and Profile tabs. Billing shows lookup usage, buy more, manage subscription, and upgrade options. Profile allows editing your name and changing your password. Shop+ users see Location Settings (store name, address, split %, agreement days, grace days, markdown toggle), Account Settings (account name, tier, billing, team management), and Locations (multi-location management).

TIERS: Solo ($9/mo) — pricing only, 200 lookups. Shop ($79/mo) — adds consignors, lifecycle, multi-location, reports, payouts, markdowns, staff, email notifications. Enterprise ($129/mo) — adds cross-customer pricing, community feed, All Locations dashboard, API access.

STAFF & USERS: Owners can invite staff via Settings → Account → Invite User. Staff can do intake and pricing but cannot change settings or view account billing. Two roles: owner and staff.

MULTI-LOCATION: If you have multiple store locations, use the location switcher in the sidebar to switch between them. Owners can see all locations. Staff are locked to their assigned location. Owners can see an All Locations aggregate view on the dashboard. Multi-location requires Shop tier or above.

PASSWORD: To change your password, go to Settings → Profile and click "Change Password". A reset link will be sent to your email. Click the link to set a new password. Passwords must be at least 8 characters.`
