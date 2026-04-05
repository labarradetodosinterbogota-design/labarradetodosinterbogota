/*
  Registro de integrantes con verificación de hincha:
  - Columna fan_verification_storage_path (foto de respaldo en Storage).
  - Nuevos registros: status por defecto pending (admins activan).
  - Bucket privado fan-verification + políticas.
  - Políticas RLS: insert propio en users y member_profiles (faltaban para el cliente).
*/

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fan_verification_storage_path text;

COMMENT ON COLUMN users.fan_verification_storage_path IS 'Ruta en Storage (bucket fan-verification) con foto que acredita hincha de Inter Bogotá.';

ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY IF EXISTS "Users can register own row" ON users;
CREATE POLICY "Users can register own row"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own member profile" ON member_profiles;
CREATE POLICY "Users can insert own member profile"
  ON member_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fan-verification',
  'fan-verification',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Fan verification insert own folder" ON storage.objects;
DROP POLICY IF EXISTS "Fan verification select own or admin" ON storage.objects;
DROP POLICY IF EXISTS "Fan verification delete admin" ON storage.objects;

CREATE POLICY "Fan verification insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fan-verification'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Fan verification select own or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fan-verification'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
      )
    )
  );

CREATE POLICY "Fan verification delete admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fan-verification'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
