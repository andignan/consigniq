# Manual Test Plan — Photo Upload Compression

## Bug 1 — Image too large error on desktop Chrome

### Setup
- Use desktop Chrome browser
- Have a large photo ready (>2MB, e.g., a 4000x3000 DSLR photo)

### Tests
1. **Price Lookup** (`/dashboard/pricing`): Click camera icon → select large photo → should NOT get "Request Entity Too Large" error
2. **Inventory Pricing** (`/dashboard/inventory/[id]/price`): Upload large photo → should compress and send successfully
3. **Item Intake** (`/dashboard/consignors/[id]/intake`): Upload photo on intake row → should compress and identify
4. **Preview displays**: After upload, compressed image preview shows correctly
5. **Small images pass through**: Upload a small image (<1200px) → should work without visible quality loss

## Bug 2 — Photo AI identification on desktop Chrome

### Tests
1. **Price Lookup auto-populate**: Upload photo → Item Name, Category, Condition, Description auto-fill from AI
2. **Inventory pricing auto-populate**: Upload photo on item pricing → fields update with AI identification
3. **Intake auto-populate**: Upload photo on intake row → name, category, condition, description fill in

## Compression Quality

### Tests
1. **Output is JPEG**: Check Network tab → uploaded file is `image/jpeg` regardless of input format
2. **Max 1200px**: Upload a 4000x3000 image → compressed version should be 1200x900
3. **Reasonable size**: A 5MB DSLR photo should compress to well under 1MB
4. **Aspect ratio preserved**: Wide panorama should stay wide, tall image should stay tall

## Error Handling

### Tests
1. **10MB limit**: Upload a file over 10MB → should show "Image too large. Please use a photo under 10MB."
2. **Invalid format**: Upload a PDF → should show "Only JPG, PNG, and WebP images are supported"
3. **Network error**: Disconnect network after photo selection → should show error message, not crash
