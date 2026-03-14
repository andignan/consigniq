# Agreement Emails Test Plan

## Scope
Consignment agreement generation and email delivery. **Note: This feature is not yet implemented.** The `Agreement` type exists in `src/types/index.ts` and Resend is listed as an env var dependency, but no agreement generation or email sending code exists in the codebase.

## Current State
- `Agreement` interface defined with fields: `id`, `account_id`, `consignor_id`, `generated_at`, `expiry_date`, `grace_end`, `email_sent_at`, `pdf_url`, `split_store`, `split_consignor`, `item_count`
- `RESEND_API_KEY` placeholder in `.env.example`
- No API route for agreement generation
- No email sending implementation
- No PDF generation

## Future Implementation Checklist
- [ ] API route to generate agreement from consignor + items
- [ ] PDF generation with agreement terms, item list, split percentages
- [ ] Email delivery via Resend with PDF attachment
- [ ] Track `email_sent_at` timestamp
- [ ] Store `pdf_url` for re-download
- [ ] Trigger on consignor creation or manually from consignor detail page

## Current Status
- **Automated**: N/A — feature not implemented
- **Manual**: N/A — feature not implemented
