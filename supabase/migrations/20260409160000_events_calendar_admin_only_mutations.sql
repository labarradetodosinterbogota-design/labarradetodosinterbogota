/*
  Calendario: deja explícito que INSERT/UPDATE/DELETE en events_calendar
  solo aplican a coordinator_admin (lectura pública/miembros sin cambios).
*/

DROP POLICY IF EXISTS "Admins can manage events" ON public.events_calendar;
DROP POLICY IF EXISTS "Admins can insert calendar events" ON public.events_calendar;
DROP POLICY IF EXISTS "Admins can update calendar events" ON public.events_calendar;
DROP POLICY IF EXISTS "Admins can delete calendar events" ON public.events_calendar;

CREATE POLICY "Admins can insert calendar events"
  ON public.events_calendar FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins can update calendar events"
  ON public.events_calendar FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Admins can delete calendar events"
  ON public.events_calendar FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
