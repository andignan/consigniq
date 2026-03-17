-- Item photos table: up to 3 photos per item, stored in Supabase Storage
CREATE TABLE item_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_photos_item_id ON item_photos(item_id);
CREATE INDEX idx_item_photos_account_id ON item_photos(account_id);

ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their account photos"
  ON item_photos FOR ALL
  USING (account_id IN (SELECT account_id FROM users WHERE id = auth.uid()));

-- Storage bucket 'item-photos' must be created manually in Supabase Dashboard:
--   Name: item-photos
--   Public: Yes
--   File size limit: 2MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Storage RLS policies (apply via Dashboard > Storage > Policies):
--   INSERT: authenticated users can upload (bucket_id = 'item-photos')
--   SELECT: public read (bucket_id = 'item-photos')
--   DELETE: authenticated users can delete (bucket_id = 'item-photos')
--
-- Path format: items/{item_id}/photo_{timestamp}_{rand}.jpg

-- Data migration: if photo_url is ever populated on items, migrate to item_photos:
-- INSERT INTO item_photos (item_id, account_id, storage_path, public_url, display_order, is_primary)
-- SELECT id, account_id, photo_url, photo_url, 0, true
-- FROM items WHERE photo_url IS NOT NULL;
