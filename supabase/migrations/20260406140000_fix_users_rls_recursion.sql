/*
  Corrige recursión en RLS de public.users (error 500 al leer perfil):
  - Evita subconsultas directas a public.users dentro de políticas de public.users.
  - Usa funciones SECURITY DEFINER para validar "activo" y "admin" del usuario actual.
  - Mantiene el objetivo de seguridad:
      * cada usuario lee su fila;
      * integrantes activos leen filas activas;
      * coordinator_admin gestiona todo.
*/

DROP POLICY IF EXISTS "Users can view public user info" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile row" ON public.users;
DROP POLICY IF EXISTS "Active members can read active member rows" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_coordinator_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'coordinator_admin'
      AND u.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_coordinator_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_coordinator_admin() TO authenticated;

CREATE POLICY "Users can read own profile row"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Active members can read active member rows"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND public.is_current_user_active()
  );

CREATE POLICY "Admins can manage all users"
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_current_user_coordinator_admin())
  WITH CHECK (public.is_current_user_coordinator_admin());
