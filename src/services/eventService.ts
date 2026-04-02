import { supabase } from './supabaseClient';
import { CalendarEvent, EventAttendance, PaginatedResponse } from '../types';
import { runExactCount } from '../utils/supabaseExactCount';

export const eventService = {
  async getUpcoming(page = 1, limit = 10): Promise<PaginatedResponse<CalendarEvent>> {
    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    const total = await runExactCount('events_calendar', (q) => q.gte('date', now));

    const { data, error } = await supabase
      .from('events_calendar')
      .select('*')
      .gte('date', now)
      .order('date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<CalendarEvent>> {
    const offset = (page - 1) * limit;

    const total = await runExactCount('events_calendar', (q) => q);

    const { data, error } = await supabase
      .from('events_calendar')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getById(id: string): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('events_calendar')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('events_calendar')
      .insert({
        ...event,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('events_calendar')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('events_calendar').delete().eq('id', id);
    if (error) throw error;
  },

  async markAttendance(
    eventId: string,
    userId: string,
    status: 'attending' | 'not_attending' | 'maybe'
  ): Promise<EventAttendance> {
    const { data: existing } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('event_attendance')
        .update({ status, confirmed_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('event_attendance')
      .insert({
        event_id: eventId,
        user_id: userId,
        status,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAttendance(eventId: string): Promise<EventAttendance[]> {
    const { data, error } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  },
};
