/*
  Storage bucket para imágenes de opciones de votación.
  - Lectura: pública (anon + authenticated) para render en votaciones.
  - Escritura/edición/borrado: solo coordinator_admin.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voting-option-images',
  'voting-option-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read voting option images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload voting option images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins update voting option images storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete voting option images storage" ON storage.objects;

CREATE POLICY "Public read voting option images storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'voting-option-images');

CREATE POLICY "Admins upload voting option images storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voting-option-images'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins update voting option images storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voting-option-images'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins delete voting option images storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voting-option-images'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
