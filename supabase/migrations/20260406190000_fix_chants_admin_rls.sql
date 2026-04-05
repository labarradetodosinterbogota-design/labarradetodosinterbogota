/*
  Asegura que coordinator_admin pueda crear, actualizar y eliminar cánticos.
  Motivo: la política previa "Admins can manage all chants" no tenía WITH CHECK,
  lo que bloquea INSERT en RLS para administradores.
*/

DROP POLICY IF EXISTS "Admins can manage all chants" ON public.chants;

CREATE POLICY "Admins can manage all chants"
  ON public.chants FOR ALL
  TO authenticated
  USING (public.is_current_user_coordinator_admin())
  WITH CHECK (public.is_current_user_coordinator_admin());
