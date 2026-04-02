import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/eventService';
import { CalendarEvent, PaginatedResponse } from '../types';

export const useUpcomingEvents = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<CalendarEvent>>({
    queryKey: ['upcoming-events', page, limit],
    queryFn: () => eventService.getUpcoming(page, limit),
  });
};

export const useAllEvents = (page: number = 1, limit: number = 10) => {
  return useQuery<PaginatedResponse<CalendarEvent>>({
    queryKey: ['all-events', page, limit],
    queryFn: () => eventService.getAll(page, limit),
  });
};

export const useEvent = (id: string) => {
  return useQuery<CalendarEvent>({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(id),
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId, status }: { eventId: string; userId: string; status: 'attending' | 'not_attending' | 'maybe' }) =>
      eventService.markAttendance(eventId, userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
    },
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ event, userId }: { event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>; userId: string }) =>
      eventService.create(event, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
    },
  });
};
