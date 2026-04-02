import { DocumentCategory, EventType } from '../types';

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  [DocumentCategory.CONSTITUTION]: 'Constitución',
  [DocumentCategory.POLICIES]: 'Políticas',
  [DocumentCategory.LEGAL]: 'Legal',
  [DocumentCategory.TAX]: 'Impuestos',
  [DocumentCategory.TRANSPARENCY]: 'Transparencia',
  [DocumentCategory.OTHER]: 'Otros',
};

export const eventTypeLabels: Record<EventType, string> = {
  [EventType.MATCH]: 'Partido',
  [EventType.REHEARSAL]: 'Ensayo',
  [EventType.CARAVAN]: 'Caravana',
  [EventType.MEETING]: 'Reunión',
  [EventType.OTHER]: 'Otro',
};

export const chantStatusLabels: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};
