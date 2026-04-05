import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galleryService } from '../services/galleryService';
import type { BarraGalleryItem } from '../types';

export const useBarraGallery = () => {
  return useQuery<BarraGalleryItem[]>({
    queryKey: ['barra-gallery'],
    queryFn: () => galleryService.listPublished(),
    staleTime: 60_000,
  });
};

export const useGalleryUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      userId,
      caption,
    }: {
      file: File;
      userId: string;
      caption: string | null;
    }) => galleryService.uploadImage(file, userId, caption),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['barra-gallery'] });
    },
  });
};

export const useGalleryDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: BarraGalleryItem) => galleryService.deleteItem(item),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['barra-gallery'] });
    },
  });
};
