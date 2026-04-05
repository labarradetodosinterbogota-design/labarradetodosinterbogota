/*
  Galería pública de fotos (inicio) + Storage bucket barra-gallery.
  - Lectura: cualquier visitante (anon + authenticated).
  - Alta / borrado: solo coordinator_admin (RLS en tabla y en storage.objects).

  Tras aplicar la migración, el bucket queda creado. Si ya existía con otro nombre,
  ajusta las políticas o el id del bucket en el panel de Supabase.
*/

CREATE TABLE IF NOT EXISTS barra_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barra_gallery_sort ON barra_gallery_items (sort_order, created_at DESC);

ALTER TABLE barra_gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view barra gallery items" ON barra_gallery_items;
DROP POLICY IF EXISTS "Admins can insert barra gallery items" ON barra_gallery_items;
DROP POLICY IF EXISTS "Admins can update barra gallery items" ON barra_gallery_items;
DROP POLICY IF EXISTS "Admins can delete barra gallery items" ON barra_gallery_items;

CREATE POLICY "Public can view barra gallery items"
  ON barra_gallery_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert barra gallery items"
  ON barra_gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins can update barra gallery items"
  ON barra_gallery_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins can delete barra gallery items"
  ON barra_gallery_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barra-gallery',
  'barra-gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read barra gallery storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload barra gallery storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins update barra gallery storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete barra gallery storage" ON storage.objects;

CREATE POLICY "Public read barra gallery storage"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'barra-gallery');

CREATE POLICY "Admins upload barra gallery storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'barra-gallery'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins update barra gallery storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'barra-gallery'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins delete barra gallery storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'barra-gallery'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
