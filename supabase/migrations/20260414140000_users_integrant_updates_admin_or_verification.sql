/*
  Edición de integrantes (public.users):
  - Coordinador activo: puede actualizar cualquier fila (política "Admins can manage all users").
  - Integrante no admin: solo puede ajustar fan_verification_storage_path y updated_at en su propia fila
    (p. ej. PendingApproval tras registro); el resto de columnas queda solo para coordinación.
  - service_role (auth.uid() NULL): sin restricción aquí (bootstrap / jobs).
*/

CREATE OR REPLACE FUNCTION public.users_enforce_integrant_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_current_user_coordinator_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Solo la coordinación puede editar el perfil de otros integrantes.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No se puede cambiar el identificador del integrante.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.phone IS DISTINCT FROM OLD.phone OR
    NEW.full_name IS DISTINCT FROM OLD.full_name OR
    NEW.photo_url IS DISTINCT FROM OLD.photo_url OR
    NEW.member_id IS DISTINCT FROM OLD.member_id OR
    NEW.join_date IS DISTINCT FROM OLD.join_date OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Solo la coordinación puede modificar estos datos del integrante. Puedes actualizar la foto de verificación si aplica.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.users_enforce_integrant_update_scope() IS
  'Limita updates de no-admin en la propia fila users a fan_verification_storage_path y updated_at.';

DROP TRIGGER IF EXISTS users_integrant_update_scope ON public.users;

CREATE TRIGGER users_integrant_update_scope
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_enforce_integrant_update_scope();
