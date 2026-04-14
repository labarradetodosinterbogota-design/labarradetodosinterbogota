/*
  Videos de Instagram en la página de inicio (público) gestionados por coordinadores sin redeploy.
*/

CREATE TABLE public.homepage_instagram_embeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  title text,
  permalink text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX homepage_instagram_embeds_sort_idx
  ON public.homepage_instagram_embeds (sort_order ASC, created_at ASC);

COMMENT ON TABLE public.homepage_instagram_embeds IS 'Embeds de Instagram mostrados en la home pública; edición solo admins.';

ALTER TABLE public.homepage_instagram_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_instagram_embeds_select_public"
  ON public.homepage_instagram_embeds FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "homepage_instagram_embeds_insert_admin"
  ON public.homepage_instagram_embeds FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_coordinator_admin());

CREATE POLICY "homepage_instagram_embeds_update_admin"
  ON public.homepage_instagram_embeds FOR UPDATE
  TO authenticated
  USING (public.is_current_user_coordinator_admin())
  WITH CHECK (public.is_current_user_coordinator_admin());

CREATE POLICY "homepage_instagram_embeds_delete_admin"
  ON public.homepage_instagram_embeds FOR DELETE
  TO authenticated
  USING (public.is_current_user_coordinator_admin());

CREATE TABLE public.homepage_instagram_profile (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  profile_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.homepage_instagram_profile (id, profile_url) VALUES (1, null);

COMMENT ON TABLE public.homepage_instagram_profile IS 'URL opcional del perfil Instagram (fila única id=1).';

ALTER TABLE public.homepage_instagram_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_instagram_profile_select_public"
  ON public.homepage_instagram_profile FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "homepage_instagram_profile_insert_admin"
  ON public.homepage_instagram_profile FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_coordinator_admin() AND id = 1);

CREATE POLICY "homepage_instagram_profile_update_admin"
  ON public.homepage_instagram_profile FOR UPDATE
  TO authenticated
  USING (public.is_current_user_coordinator_admin() AND id = 1)
  WITH CHECK (public.is_current_user_coordinator_admin() AND id = 1);
