import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { homepageInstagramEmbedsService } from '../services/homepageInstagramEmbedsService';

const Q_EMBEDS = ['homepage-instagram-embeds'] as const;
const Q_PROFILE = ['homepage-instagram-profile'] as const;

export function useHomepageInstagramEmbeds() {
  return useQuery({
    queryKey: Q_EMBEDS,
    queryFn: () => homepageInstagramEmbedsService.listEmbedsOrdered(),
    staleTime: 30_000,
  });
}

export function useHomepageInstagramProfile() {
  return useQuery({
    queryKey: Q_PROFILE,
    queryFn: () => homepageInstagramEmbedsService.getProfileUrl(),
    staleTime: 60_000,
  });
}

function useInvalidateHomepageInstagram() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: Q_EMBEDS });
    void queryClient.invalidateQueries({ queryKey: Q_PROFILE });
  };
}

export function useSaveInstagramProfileUrl() {
  const invalidate = useInvalidateHomepageInstagram();
  return useMutation({
    mutationFn: (profileUrl: string | null) => homepageInstagramEmbedsService.saveProfileUrl(profileUrl),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useCreateInstagramEmbed() {
  const invalidate = useInvalidateHomepageInstagram();
  return useMutation({
    mutationFn: (input: { title: string | null; permalink: string }) =>
      homepageInstagramEmbedsService.createEmbed(input),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useUpdateInstagramEmbed() {
  const invalidate = useInvalidateHomepageInstagram();
  return useMutation({
    mutationFn: (input: { id: string; title?: string | null; permalink?: string }) =>
      homepageInstagramEmbedsService.updateEmbed(input.id, {
        title: input.title,
        permalink: input.permalink,
      }),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDeleteInstagramEmbed() {
  const invalidate = useInvalidateHomepageInstagram();
  return useMutation({
    mutationFn: (id: string) => homepageInstagramEmbedsService.deleteEmbed(id),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useMoveInstagramEmbed() {
  const invalidate = useInvalidateHomepageInstagram();
  return useMutation({
    mutationFn: (input: { id: string; direction: 'up' | 'down' }) =>
      homepageInstagramEmbedsService.moveEmbed(input.id, input.direction),
    onSuccess: () => {
      invalidate();
    },
  });
}
