/*
  Garantiza en base de datos que siempre exista al menos un usuario con role = coordinator_admin.
  Cubre UPDATE (degradar rol) y DELETE, con o sin RLS y con cliente service_role (p. ej. API Vercel).
  Candado transaccional: evita dos degradaciones concurrentes que dejaran 0 coordinadores.
*/

CREATE OR REPLACE FUNCTION public.users_enforce_last_coordinator_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'coordinator_admin' THEN
      PERFORM pg_advisory_xact_lock(8021547);
      SELECT count(*)::integer INTO admin_count FROM public.users WHERE role = 'coordinator_admin';
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'No puede eliminarse el último coordinador.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'coordinator_admin' AND NEW.role IS DISTINCT FROM 'coordinator_admin' THEN
      PERFORM pg_advisory_xact_lock(8021547);
      SELECT count(*)::integer INTO admin_count FROM public.users WHERE role = 'coordinator_admin';
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'No puede modificarse el rol: debe permanecer al menos un coordinador.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.users_enforce_last_coordinator_admin() IS
  'Impide DELETE o degradación de rol si es el último coordinator_admin en public.users.';

DROP TRIGGER IF EXISTS users_require_one_coordinator_admin ON public.users;

CREATE TRIGGER users_require_one_coordinator_admin
  BEFORE UPDATE OF role OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_enforce_last_coordinator_admin();
