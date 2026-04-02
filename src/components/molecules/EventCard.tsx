import React, { type ComponentProps } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Badge, Button } from '../atoms';
import { CalendarEvent, EventType } from '../../types';
import { eventTypeLabels } from '../../locales/es';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

interface EventCardProps {
  event: CalendarEvent;
  onAttend?: (event: CalendarEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onAttend }) => {
  const eventDate = new Date(event.date);

  const getEventColor = (type: EventType): BadgeVariant => {
    const colors: Record<EventType, BadgeVariant> = {
      [EventType.MATCH]: 'primary',
      [EventType.REHEARSAL]: 'info',
      [EventType.CARAVAN]: 'warning',
      [EventType.MEETING]: 'secondary',
      [EventType.OTHER]: 'secondary',
    };
    return colors[type];
  };

  return (
    <div className="bg-white rounded-lg border border-dark-200 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-dark-900">{event.title}</h3>
          <Badge variant={getEventColor(event.event_type)} size="sm" className="mt-2">
            {eventTypeLabels[event.event_type]}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-dark-600">
          <Calendar className="w-4 h-4" />
          <span>{format(eventDate, "d 'de' MMMM yyyy", { locale: es })}</span>
        </div>
        <div className="flex items-center gap-2 text-dark-600">
          <Clock className="w-4 h-4" />
          <span>{format(eventDate, 'HH:mm', { locale: es })}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-dark-600">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-dark-600 line-clamp-2 mb-3">{event.description}</p>
      )}

      {onAttend && (
        <Button variant="primary" size="sm" onClick={() => onAttend(event)} className="w-full">
          Confirmar asistencia
        </Button>
      )}
    </div>
  );
};
