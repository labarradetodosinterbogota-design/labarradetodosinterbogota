import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ForumComment, ForumPost, PaginatedResponse } from '../types';
import { forumService } from '../services/forumService';

const FORUM_POSTS_STALE_TIME_MS = 30_000;
const FORUM_COMMENTS_STALE_TIME_MS = 20_000;
const FORUM_QUERY_GC_TIME_MS = 5 * 60_000;

function incrementPostCommentCount(
  current: PaginatedResponse<ForumPost> | undefined,
  postId: string
): PaginatedResponse<ForumPost> | undefined {
  if (!current) return current;

  let hasChanges = false;
  const updatedPosts = current.data.map((post) => {
    if (post.id !== postId) return post;
    hasChanges = true;
    return {
      ...post,
      comment_count: post.comment_count + 1,
    };
  });

  if (!hasChanges) return current;
  return {
    ...current,
    data: updatedPosts,
  };
}

export const useForumPosts = (
  page: number = 1,
  limit: number = 12,
  search: string = '',
  category: string = ''
) => {
  const normalizedSearch = search.trim();
  const normalizedCategory = category.trim().toLowerCase();

  return useQuery<PaginatedResponse<ForumPost>>({
    queryKey: ['forum-posts', page, limit, normalizedSearch, normalizedCategory],
    queryFn: () =>
      forumService.listPosts({
        page,
        limit,
        search: normalizedSearch,
        category: normalizedCategory,
      }),
    placeholderData: keepPreviousData,
    staleTime: FORUM_POSTS_STALE_TIME_MS,
    gcTime: FORUM_QUERY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
};

export const useForumComments = (
  postId: string | null,
  page: number = 1,
  limit: number = 20
) => {
  return useQuery<PaginatedResponse<ForumComment>>({
    queryKey: ['forum-comments', postId, page, limit],
    queryFn: () => forumService.listComments(postId ?? '', page, limit),
    enabled: !!postId,
    placeholderData: keepPreviousData,
    staleTime: FORUM_COMMENTS_STALE_TIME_MS,
    gcTime: FORUM_QUERY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
};

export const useCreateForumPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; title: string; content: string; category: string }) =>
      forumService.createPost(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
};

export const useCreateForumComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { postId: string; userId: string; content: string }) =>
      forumService.createComment(input),
    onSuccess: (_createdComment, variables) => {
      queryClient.setQueriesData<PaginatedResponse<ForumPost>>(
        { queryKey: ['forum-posts'] },
        (current) => incrementPostCommentCount(current, variables.postId)
      );
      void queryClient.invalidateQueries({ queryKey: ['forum-comments', variables.postId] });
    },
  });
};
