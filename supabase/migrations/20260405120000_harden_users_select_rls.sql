/*
  Endurecer SELECT en public.users:
  - Elimina lectura total para authenticated/anon.
  - Cada usuario autenticado puede leer su propia fila (auth, pending, inactive, etc.).
  - Solo integrantes con status = active pueden listar/ver otras filas también active (directorio en área privada).
  - coordinator_admin sigue pudiendo todo vía la política existente "Admins can manage all users" (FOR ALL).
  Las subconsultas en políticas RLS se evalúan con el mismo rol; la fila del propio viewer entra por "Users can read own profile row".
*/

DROP POLICY IF EXISTS "Users can view public user info" ON users;

CREATE POLICY "Users can read own profile row"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Active members can read active member rows"
  ON users FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM users AS viewer
      WHERE viewer.id = auth.uid()
        AND viewer.status = 'active'
    )
  );
