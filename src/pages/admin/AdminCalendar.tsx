import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Input, Select, Spinner, TextArea } from '../../components/atoms';
import { useAllEvents, useCreateEvent } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { eventTypeLabels } from '../../locales/es';
import { eventService } from '../../services/eventService';
import { EventType, type CalendarEvent } from '../../types';

function toDatetimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().slice(0, 16);
}

function parseNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export const AdminCalendar: React.FC = () => {
  const [page, setPage] = useState(1);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.MATCH);
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAllEvents(page, 12);
  const createEventMutation = useCreateEvent();

  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) =>
      eventService.update(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-events'] });
      void queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => eventService.delete(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-events'] });
      void queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });

  const eventRows = data?.data ?? [];
  const upcomingCount = useMemo(
    () => eventRows.filter((event) => new Date(event.date).getTime() >= Date.now()).length,
    [eventRows]
  );
  const hasEvents = eventRows.length > 0;

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setEventType(EventType.MATCH);
    setDescription('');
    setEventDate('');
    setLocation('');
  };

  const handleStartEdit = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setTitle(event.title);
    setEventType(event.event_type);
    setDescription(event.description ?? '');
    setEventDate(toDatetimeLocalValue(event.date));
    setLocation(event.location ?? '');
    setMessage(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const accepted = globalThis.confirm('Esta acción eliminará el evento del calendario. ¿Deseas continuar?');
    if (!accepted) return;

    setMessage(null);
    try {
      await deleteEventMutation.mutateAsync(eventId);
      if (editingEventId === eventId) {
        resetForm();
      }
      setMessage({ type: 'success', text: 'Evento eliminado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar el evento.' });
    }
  };

  const handleSaveEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!user) {
      setMessage({ type: 'error', text: 'No hay sesión activa para gestionar eventos.' });
      return;
    }

    const safeTitle = title.trim();
    if (!safeTitle) {
      setMessage({ type: 'error', text: 'El título del evento es obligatorio.' });
      return;
    }

    const parsedDate = new Date(eventDate);
    if (!eventDate || Number.isNaN(parsedDate.getTime())) {
      setMessage({ type: 'error', text: 'La fecha del evento no es válida.' });
      return;
    }

    const payload = {
      event_type: eventType,
      title: safeTitle,
      description: parseNullableString(description),
      date: parsedDate.toISOString(),
      location: parseNullableString(location),
    };

    try {
      if (editingEventId) {
        await updateEventMutation.mutateAsync({
          id: editingEventId,
          updates: payload,
        });
        setMessage({ type: 'success', text: 'Evento actualizado correctamente.' });
      } else {
        await createEventMutation.mutateAsync({
          userId: user.id,
          event: {
            ...payload,
            created_by: user.id,
          },
        });
        setMessage({
          type: 'success',
          text: 'Evento creado correctamente. Ya está disponible en los calendarios público y privado.',
        });
      }
      resetForm();
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar el evento.' });
    }
  };

  const isSaving = createEventMutation.isPending || updateEventMutation.isPending;
  const isDeleting = deleteEventMutation.isPending;
  let tableContent: React.ReactNode;

  if (isLoading) {
    tableContent = (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  } else if (hasEvents) {
    tableContent = (
      <div className="bg-white rounded-lg border border-dark-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-50 text-left text-dark-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Evento</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Lugar</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {eventRows.map((eventItem) => (
              <tr key={eventItem.id} className="border-t border-dark-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-dark-900">{eventItem.title}</p>
                  {eventItem.description && <p className="text-dark-500">{eventItem.description}</p>}
                </td>
                <td className="px-4 py-3 text-dark-700">{eventTypeLabels[eventItem.event_type]}</td>
                <td className="px-4 py-3 text-dark-700">
                  {new Date(eventItem.date).toLocaleString('es-CO')}
                </td>
                <td className="px-4 py-3 text-dark-700">{eventItem.location ?? 'Por definir'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(eventItem)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={isDeleting}
                      onClick={() => {
                        void handleDeleteEvent(eventItem.id);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    tableContent = (
      <div className="bg-white rounded-lg border border-dark-200 p-8 text-center text-dark-600">
        No hay eventos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-dark-200 p-6">
        <h1 className="text-4xl font-bold text-dark-900 mb-2">Gestión de calendario</h1>
        <p className="text-dark-600">
          Crea y administra partidos, ensayos y eventos que verán integrantes y público.
        </p>
      </div>

      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="bg-white rounded-lg border border-dark-200 p-4 flex flex-wrap items-center gap-3">
        <Badge variant="info">Eventos listados: {eventRows.length}</Badge>
        <Badge variant="success">Próximos: {upcomingCount}</Badge>
      </div>

      <form onSubmit={handleSaveEvent} className="bg-white rounded-lg border border-dark-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-dark-900">
          {editingEventId ? 'Editar evento' : 'Crear evento'}
        </h2>
        <Input
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          placeholder="Ej: Partido Inter Bogotá vs ..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de evento"
            value={eventType}
            onChange={(event) => setEventType(event.target.value as EventType)}
            options={Object.values(EventType).map((value) => ({
              value,
              label: eventTypeLabels[value],
            }))}
          />
          <Input
            label="Fecha y hora"
            type="datetime-local"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            required
          />
        </div>
        <Input
          label="Ubicación"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Ej: Estadio Metropolitano de Techo"
        />
        <TextArea
          label="Descripción"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Información adicional para asistentes"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" isLoading={isSaving} disabled={isDeleting}>
            {editingEventId ? 'Guardar cambios' : 'Crear evento'}
          </Button>
          {editingEventId && (
            <Button type="button" variant="secondary" onClick={resetForm} disabled={isSaving || isDeleting}>
              Cancelar edición
            </Button>
          )}
        </div>
      </form>

      {error && <Alert type="error" message="No se pudo cargar el calendario administrativo." />}
      {tableContent}

      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-dark-700">
            Página {page} de {data?.total_pages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page === (data?.total_pages ?? page)}
            onClick={() => setPage((prev) => Math.min(data?.total_pages ?? prev, prev + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};
