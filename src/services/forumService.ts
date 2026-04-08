import { ForumComment, ForumPost, PaginatedResponse, User, UserRole, UserStatus } from '../types';
import { supabase } from './supabaseClient';
import { sanitizeIlikeSearchInput } from '../utils/sanitizeSearch';

interface ForumPostRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface ForumCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ForumCommentCountRow {
  post_id: string;
  comment_count: number | string | null;
}

interface ForumPostListInput {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

interface ForumCreatePostInput {
  userId: string;
  title: string;
  content: string;
  category: string;
}

interface ForumCreateCommentInput {
  postId: string;
  userId: string;
  content: string;
}

interface ForumAuthorMap {
  [userId: string]: User;
}

const DEFAULT_POST_CATEGORY = 'general';
const MAX_PAGE_LIMIT = 30;
const MAX_TITLE_LENGTH = 140;
const MAX_CONTENT_LENGTH = 5000;
const MAX_COMMENT_LENGTH = 1500;

const FORUM_CATEGORY_DEFINITIONS = [
  { value: 'general', label: 'General' },
  { value: 'partidos', label: 'Partidos' },
  { value: 'viajes', label: 'Viajes' },
  { value: 'cantos', label: 'Cantos' },
  { value: 'logistica', label: 'Logística' },
  { value: 'propuestas', label: 'Propuestas' },
] as const;

const ALLOWED_FORUM_CATEGORIES: ReadonlySet<string> = new Set(
  FORUM_CATEGORY_DEFINITIONS.map((entry) => entry.value)
);

export const FORUM_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  FORUM_CATEGORY_DEFINITIONS;

function normalizePage(page: number | undefined): number {
  if (typeof page !== 'number' || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 1) return 10;
  return Math.min(Math.floor(limit), MAX_PAGE_LIMIT);
}

function normalizeSearch(raw: string | undefined): string {
  if (!raw) return '';
  return sanitizeIlikeSearchInput(raw);
}

function normalizeCategoryFilter(raw: string | undefined): string | null {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return ALLOWED_FORUM_CATEGORIES.has(normalized) ? normalized : null;
}

function normalizeCategoryForInsert(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return DEFAULT_POST_CATEGORY;
  return ALLOWED_FORUM_CATEGORIES.has(normalized) ? normalized : DEFAULT_POST_CATEGORY;
}

function unknownAuthor(userId: string): User {
  const nowIso = new Date().toISOString();
  return {
    id: userId,
    email: '',
    phone: null,
    full_name: 'Integrante',
    photo_url: null,
    fan_verification_storage_path: null,
    member_id: '',
    join_date: nowIso,
    role: UserRole.BASIC_USER,
    status: UserStatus.ACTIVE,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}

async function fetchAuthorsByIds(userIds: string[]): Promise<ForumAuthorMap> {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase.from('users').select('*').in('id', uniqueIds);
  if (error) throw error;

  const map: ForumAuthorMap = {};
  for (const row of (data ?? []) as User[]) {
    map[row.id] = row;
  }
  return map;
}

async function fetchCommentCountsForPosts(postIds: string[]): Promise<Record<string, number>> {
  const uniquePostIds = Array.from(new Set(postIds.filter((id) => id.length > 0)));
  if (uniquePostIds.length === 0) return {};

  try {
    return await fetchCommentCountsForPostsByRpc(uniquePostIds);
  } catch (rpcError) {
    if (import.meta.env.DEV) {
      console.warn('Forum comment count RPC unavailable, using fallback counts:', rpcError);
    }
    return fetchCommentCountsForPostsFallback(uniquePostIds);
  }
}

async function fetchCommentCountsForPostsByRpc(postIds: string[]): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('forum_comment_counts_by_post_ids', {
    post_ids: postIds,
  });
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const postId of postIds) {
    counts[postId] = 0;
  }

  for (const row of (data ?? []) as ForumCommentCountRow[]) {
    if (typeof row.post_id !== 'string') continue;
    const parsedCount = Number(row.comment_count ?? 0);
    counts[row.post_id] =
      Number.isFinite(parsedCount) && parsedCount > 0 ? Math.floor(parsedCount) : 0;
  }
  return counts;
}

async function fetchCommentCountsForPostsFallback(
  postIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  await Promise.all(
    postIds.map(async (postId) => {
      const { count, error } = await supabase
        .from('forum_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);
      if (error) throw error;
      counts[postId] = count ?? 0;
    })
  );
  return counts;
}

function toForumPost(
  row: ForumPostRow,
  authors: ForumAuthorMap,
  commentCounts: Record<string, number>
): ForumPost {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
    comment_count: commentCounts[row.id] ?? 0,
    author: authors[row.user_id] ?? unknownAuthor(row.user_id),
  };
}

function toForumComment(row: ForumCommentRow, authors: ForumAuthorMap): ForumComment {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: authors[row.user_id] ?? unknownAuthor(row.user_id),
  };
}

function validatePostInput(title: string, content: string): void {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (cleanTitle.length < 4) {
    throw new Error('El título debe tener al menos 4 caracteres.');
  }
  if (cleanTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`El título no puede superar ${MAX_TITLE_LENGTH} caracteres.`);
  }
  if (cleanContent.length < 10) {
    throw new Error('El contenido debe tener al menos 10 caracteres.');
  }
  if (cleanContent.length > MAX_CONTENT_LENGTH) {
    throw new Error(`El contenido no puede superar ${MAX_CONTENT_LENGTH} caracteres.`);
  }
}

function validateCommentInput(content: string): void {
  const cleanContent = content.trim();
  if (cleanContent.length === 0) {
    throw new Error('El comentario no puede estar vacío.');
  }
  if (cleanContent.length > MAX_COMMENT_LENGTH) {
    throw new Error(`El comentario no puede superar ${MAX_COMMENT_LENGTH} caracteres.`);
  }
}

export const forumService = {
  async listPosts(input: ForumPostListInput = {}): Promise<PaginatedResponse<ForumPost>> {
    const page = normalizePage(input.page);
    const limit = normalizeLimit(input.limit);
    const offset = (page - 1) * limit;
    const search = normalizeSearch(input.search);
    const categoryFilter = normalizeCategoryFilter(input.category);
    const hasSearch = search.length > 0;
    const pattern = `%${search}%`;

    let query = supabase
      .from('forum_posts')
      .select('id,user_id,title,content,category,created_at,updated_at', { count: 'exact' });

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    if (hasSearch) {
      query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    const total = count ?? 0;
    const rows = (data ?? []) as ForumPostRow[];
    if (rows.length === 0) return buildPaginatedResponse([], page, limit, total);

    const [authors, commentCounts] = await Promise.all([
      fetchAuthorsByIds(rows.map((row) => row.user_id)),
      fetchCommentCountsForPosts(rows.map((row) => row.id)),
    ]);

    const enriched = rows.map((row) => toForumPost(row, authors, commentCounts));
    return buildPaginatedResponse(enriched, page, limit, total);
  },

  async listComments(
    postId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<ForumComment>> {
    const normalizedPostId = postId.trim();
    if (!normalizedPostId) {
      return buildPaginatedResponse([], 1, normalizeLimit(limit), 0);
    }

    const normalizedPage = normalizePage(page);
    const normalizedLimit = normalizeLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const { data, error, count } = await supabase
      .from('forum_comments')
      .select('id,post_id,user_id,content,created_at,updated_at', { count: 'exact' })
      .eq('post_id', normalizedPostId)
      .order('created_at', { ascending: false })
      .range(offset, offset + normalizedLimit - 1);
    if (error) throw error;

    const total = count ?? 0;
    const rows = (data ?? []) as ForumCommentRow[];
    if (rows.length === 0) return buildPaginatedResponse([], normalizedPage, normalizedLimit, total);

    const authors = await fetchAuthorsByIds(rows.map((row) => row.user_id));
    const enriched = rows.map((row) => toForumComment(row, authors));

    return buildPaginatedResponse(enriched, normalizedPage, normalizedLimit, total);
  },

  async createPost(input: ForumCreatePostInput): Promise<ForumPost> {
    const userId = input.userId.trim();
    const title = input.title.trim();
    const content = input.content.trim();
    const category = normalizeCategoryForInsert(input.category);
    validatePostInput(title, content);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title,
        content,
        category,
        updated_at: nowIso,
      })
      .select('id,user_id,title,content,category,created_at,updated_at')
      .single();
    if (error) throw error;

    const row = data as ForumPostRow;
    const authors = await fetchAuthorsByIds([row.user_id]);
    return toForumPost(row, authors, { [row.id]: 0 });
  },

  async createComment(input: ForumCreateCommentInput): Promise<ForumComment> {
    const postId = input.postId.trim();
    const userId = input.userId.trim();
    const content = input.content.trim();
    validateCommentInput(content);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        updated_at: nowIso,
      })
      .select('id,post_id,user_id,content,created_at,updated_at')
      .single();
    if (error) throw error;

    const row = data as ForumCommentRow;
    const authors = await fetchAuthorsByIds([row.user_id]);
    return toForumComment(row, authors);
  },
};
