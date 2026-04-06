/*
  Optimización de foro para mayor concurrencia:
  - Mejora de ordenamiento por fecha en temas.
  - Mejora de lectura paginada de comentarios por tema.
  - Soporte para consultas frecuentes por autor.
*/

create index if not exists idx_forum_posts_created_at_desc
  on public.forum_posts (created_at desc);

create index if not exists idx_forum_posts_category_created_at_desc
  on public.forum_posts (category, created_at desc);

create index if not exists idx_forum_posts_user_id
  on public.forum_posts (user_id);

create index if not exists idx_forum_comments_post_created_at_desc
  on public.forum_comments (post_id, created_at desc);

create index if not exists idx_forum_comments_user_id
  on public.forum_comments (user_id);
