# Manual Test Plan — Solo Tier UI Fixes

## Dashboard
1. Log in as solo user → see "Welcome back, [first name]!" heading
2. Sidebar has NO "Upgrade to Starter" CTA button
3. Dashboard card still has upgrade CTA with "$49/mo"
4. Usage progress bar visible even at 0% usage (thin green line)

## Price Lookup
1. Subtitle reads "Price items and save to your inventory"
2. Hover disabled "Full AI Pricing" button → tooltip shows "Enter an item name to get AI pricing"
3. Enter item name + get AI pricing → "Save to My Inventory" button appears
4. Click "Save to My Inventory" → success message "Saved to your inventory"
5. Check /dashboard/inventory → saved item appears
6. "Price Another Item" button clears form and results
7. On mobile: Clear/action buttons not hidden behind help widget

## My Inventory
1. "All Consignors" filter dropdown NOT shown for solo user
2. Status tabs show: All / Priced / Sold / Archived (no Pending/Donated)
3. Page title reads "My Inventory"
4. Empty state shows "No items yet" with "Price an Item" CTA button
5. Click "Price an Item" → navigates to /dashboard/pricing

## Settings
1. Profile tab → Full Name field is editable
2. Change name → click Save → "Profile updated" success message
3. Email field remains read-only
4. Click "Change Password" → inline message "Password reset link sent to [email]" (no browser alert)
5. Message disappears after 5 seconds

## Login Page
1. Subtitle reads "AI-Powered Pricing & Inventory"
2. Footer reads "ConsignIQ · v1.0" (no "Mokena, IL")

## Non-Solo Regression
1. Log in as starter/standard/pro user → page title "Inventory" (not "My Inventory")
2. Status tabs show all 5: All / Pending / Priced / Sold / Donated
3. "All Consignors" filter visible
4. Pricing page subtitle: "Quick pricing tool — nothing saved to the database"
5. No "Save to My Inventory" button on pricing results
