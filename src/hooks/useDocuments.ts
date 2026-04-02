import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';
import { Document, DocumentCategory, PaginatedResponse } from '../types';

export const usePublicDocuments = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<Document>>({
    queryKey: ['public-documents', page, limit],
    queryFn: () => documentService.getPublic(page, limit),
  });
};

export const useAllDocuments = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<Document>>({
    queryKey: ['all-documents', page, limit],
    queryFn: () => documentService.getAll(page, limit),
  });
};

export const useDocumentsByCategory = (
  category: DocumentCategory,
  page: number = 1,
  limit: number = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery<PaginatedResponse<Document>>({
    queryKey: ['documents-category', category, page, limit],
    queryFn: () => documentService.getByCategory(category, page, limit),
    enabled: options?.enabled !== false,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ document, userId }: { document: Omit<Document, 'id' | 'uploaded_at'>; userId: string }) =>
      documentService.create(document, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-documents'] });
      queryClient.invalidateQueries({ queryKey: ['all-documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-category'] });
    },
  });
};

export const useUploadDocument = () => {
  return useMutation({
    mutationFn: (file: File) => documentService.uploadFile(file),
  });
};
