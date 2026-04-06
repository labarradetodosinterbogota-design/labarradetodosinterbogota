import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ForumComment, ForumPost, PaginatedResponse } from '../types';
import { forumService } from '../services/forumService';

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
    staleTime: 15_000,
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forum-comments'] });
      void queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
};
