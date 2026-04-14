/*
  Permite que coordinadores admin suban fotos de verificación en la carpeta de cualquier integrante
  (gestión desde directorio / administración), además de la política existente de carpeta propia.
*/

CREATE POLICY "Fan verification insert coordinator admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fan-verification'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'coordinator_admin'
    )
  );
