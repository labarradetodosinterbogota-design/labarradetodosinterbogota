/*
  Imágenes en chat en vivo:
  - Columna image_storage_path en chat_messages.
  - Relaja CHECK: mensaje con texto y/o imagen.
  - Bucket chat-images (público para <img>, subida solo carpeta propia del usuario activo).
*/

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS image_storage_path text NULL;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_check;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.chat_messages'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%content%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_messages DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_or_image_chk;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_or_image_chk
  CHECK (
    char_length(content) <= 1000
    AND (
      char_length(trim(content)) >= 1
      OR (
        image_storage_path IS NOT NULL
        AND char_length(trim(image_storage_path)) > 0
      )
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  2621440,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read chat images storage" ON storage.objects;
DROP POLICY IF EXISTS "Active members upload chat images own folder" ON storage.objects;
DROP POLICY IF EXISTS "Active members delete chat images own folder" ON storage.objects;

CREATE POLICY "Public read chat images storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'chat-images');

CREATE POLICY "Active members upload chat images own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND name LIKE (auth.uid()::text || '/%')
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.status = 'active'
    )
  );

CREATE POLICY "Active members delete chat images own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND name LIKE (auth.uid()::text || '/%')
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.status = 'active'
    )
  );
