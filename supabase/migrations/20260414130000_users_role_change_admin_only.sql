/*
  Solo un coordinator_admin activo (JWT) o el rol de servicio (auth.uid() NULL) puede cambiar users.role.
  Evita escalación vía la política legada "Users can update own profile" (WITH CHECK solo auth.uid() = id).
*/

CREATE OR REPLACE FUNCTION public.users_enforce_role_change_by_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_current_user_coordinator_admin() THEN
      RAISE EXCEPTION 'Solo un coordinador puede modificar el rol de un integrante.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.users_enforce_role_change_by_admin_only() IS
  'Restringe cambios de role en public.users a coordinator_admin activo o a sesión sin JWT (service_role).';

DROP TRIGGER IF EXISTS users_role_change_admin_only ON public.users;

CREATE TRIGGER users_role_change_admin_only
  BEFORE UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_enforce_role_change_by_admin_only();
