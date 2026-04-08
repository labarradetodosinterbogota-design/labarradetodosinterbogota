/*
  Forum performance improvements for higher concurrency:
  - Batch comment counts by post ids through RPC.
  - Faster ILIKE search in title/content using trigram indexes.
*/

create extension if not exists pg_trgm;

create or replace function public.forum_comment_counts_by_post_ids(post_ids uuid[])
returns table(post_id uuid, comment_count bigint)
language sql
stable
set search_path = public
as $$
  select
    forum_comments.post_id,
    count(*)::bigint as comment_count
  from public.forum_comments
  where forum_comments.post_id = any(coalesce(post_ids, '{}'::uuid[]))
  group by forum_comments.post_id
$$;

grant execute on function public.forum_comment_counts_by_post_ids(uuid[]) to authenticated;

create index if not exists idx_forum_posts_title_trgm
  on public.forum_posts using gin (title gin_trgm_ops);

create index if not exists idx_forum_posts_content_trgm
  on public.forum_posts using gin (content gin_trgm_ops);
