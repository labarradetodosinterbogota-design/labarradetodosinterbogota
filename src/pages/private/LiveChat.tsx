import React from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, MessagesSquare, X } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Spinner, TextArea } from '../../components/atoms';
import { useAuth } from '../../context/AuthContext';
import { useLiveChat } from '../../hooks';
import { chatService } from '../../services/chatService';
import type { ChatMemberSummary, ChatMessage } from '../../types';

const QUICK_EMOJIS = ['😀', '👍', '❤️', '🔥', '👏', '🎉', '⚽', '🙌', '😂', '🤝'];

function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'IN';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function realtimeLabel(state: string): string {
  if (state === 'subscribed') return 'Conectado al chat en vivo';
  if (state === 'connecting') return 'Conectando…';
  if (state === 'disconnected') return 'Sin conexión en tiempo real (revisa tu red o recarga)';
  return '';
}

interface PresenceMemberRowProps {
  member: ChatMemberSummary;
  isOnline: boolean;
}

const PresenceMemberRow: React.FC<PresenceMemberRowProps> = ({ member, isOnline }) => {
  const name = member.full_name.trim() || 'Integrante';
  return (
    <li className="flex items-center gap-2 rounded-lg border border-dark-100 bg-white px-2 py-1.5 text-sm">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden
      />
      <span className="min-w-0 truncate text-dark-800" title={name}>
        {name}
      </span>
      <span className="sr-only">{isOnline ? 'En línea en el chat' : 'Fuera de línea en el chat'}</span>
    </li>
  );
};

interface ChatImageAttachmentProps {
  imageUrl: string;
  imageLabel: string;
  isOwn: boolean;
}

const ChatImageAttachment: React.FC<ChatImageAttachmentProps> = ({ imageUrl, imageLabel, isOwn }) => {
  const [loadFailed, setLoadFailed] = React.useState(false);

  if (loadFailed) {
    return (
      <p className={`text-xs ${isOwn ? 'text-white/90' : 'text-dark-500'}`}>
        No se pudo cargar la imagen.{' '}
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-medium underline ${isOwn ? 'text-white' : 'text-primary-600'}`}
        >
          Abrir enlace
        </a>
      </p>
    );
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block max-w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
        isOwn ? 'ring-1 ring-white/30' : 'border border-dark-200'
      }`}
      aria-label={`Ver imagen ampliada: ${imageLabel}`}
    >
      <img
        src={imageUrl}
        alt={imageLabel}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="max-h-52 w-full max-w-full object-cover sm:max-h-60"
        onError={() => setLoadFailed(true)}
      />
    </a>
  );
};

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn }) => {
  const hasText = message.content.trim().length > 0;
  const hasImage = Boolean(message.image_url);
  const imageLabel = `Imagen enviada por ${message.author_name}`;

  return (
    <div
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ contentVisibility: 'auto' }}
    >
      <Avatar
        src={message.author_photo_url}
        initials={getInitials(message.author_name)}
        size="sm"
        alt={`Avatar de ${message.author_name}`}
        className="shrink-0"
      />
      <div className={`max-w-[min(100%,28rem)] space-y-2 ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-dark-500">
          <span className="font-medium text-dark-700">{message.author_name}</span>
          <span>{formatChatTime(message.created_at)}</span>
        </div>
        {hasImage && message.image_url ? (
          <ChatImageAttachment imageUrl={message.image_url} imageLabel={imageLabel} isOwn={isOwn} />
        ) : null}
        {hasText ? (
          <div
            className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
              isOwn ? 'bg-primary-400 text-white' : 'border border-dark-200 bg-white text-dark-800'
            }`}
          >
            {message.content}
          </div>
        ) : null}
      </div>
    </div>
  );
};

function connectionBadgeVariant(
  state: string
): 'success' | 'warning' | 'error' | 'secondary' {
  if (state === 'subscribed') return 'success';
  if (state === 'connecting') return 'warning';
  if (state === 'disconnected') return 'error';
  return 'secondary';
}

export const LiveChat: React.FC = () => {
  const { user } = useAuth();
  const {
    messages,
    members,
    onlineUserIds,
    loadError,
    sendError,
    realtimeState,
    isSending,
    isLoadingInitial,
    sendMessage,
  } = useLiveChat(user);

  const [draft, setDraft] = React.useState('');
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = React.useState<string | null>(null);
  const bottomAnchorRef = React.useRef<HTMLDivElement>(null);

  const clearAttachment = React.useCallback(() => {
    setAttachmentPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setAttachment(null);
  }, []);

  React.useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  const onlineMembers = React.useMemo(
    () => members.filter((member) => onlineUserIds.has(member.id)),
    [members, onlineUserIds]
  );
  const offlineMembers = React.useMemo(
    () => members.filter((member) => !onlineUserIds.has(member.id)),
    [members, onlineUserIds]
  );

  React.useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending || isLoadingInitial) return;
    if (draft.trim().length === 0 && !attachment) return;
    const sent = await sendMessage(draft, attachment);
    if (sent) {
      setDraft('');
      clearAttachment();
    }
  };

  const onPickAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAttachmentPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setAttachment(file);
  };

  const appendEmoji = (emoji: string) => {
    setDraft((previous) => `${previous}${emoji}`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dark-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-dark-200 bg-primary-50 p-2 text-primary-500">
              <MessagesSquare className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-900">Chat en vivo</h1>
              <p className="mt-1 text-dark-600">
                Conversación directa entre integrantes. El foro sigue siendo el espacio para temas largos y
                debates por hilos.
              </p>
              <Link to="/forum" className="mt-2 inline-block text-sm font-medium text-primary-500 hover:text-primary-600">
                Ir al foro
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={connectionBadgeVariant(realtimeState)} size="sm">
              {realtimeLabel(realtimeState)}
            </Badge>
            <Badge variant="info" size="sm">
              {onlineUserIds.size} en esta sala
            </Badge>
          </div>
        </div>
      </div>

      {loadError && <Alert type="error" message={loadError} />}
      {sendError && <Alert type="error" message={sendError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          className="lg:col-span-2 flex min-h-[28rem] flex-col rounded-xl border border-dark-200 bg-white shadow-sm"
          aria-label="Mensajes del chat"
        >
          <div className="border-b border-dark-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-dark-900">Mensajes</h2>
            <p className="text-xs text-dark-500">Los últimos {chatService.CHAT_RECENT_LIMIT} mensajes se muestran aquí.</p>
          </div>

          <div
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            style={{ maxHeight: 'min(60vh, 520px)' }}
            aria-live="polite"
          >
            {isLoadingInitial && (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            )}
            {!isLoadingInitial && messages.length === 0 && (
              <p className="text-center text-sm text-dark-500">
                Aún no hay mensajes. ¡Saluda a la barra!
              </p>
            )}
            {!isLoadingInitial &&
              messages.map((message) => (
                <ChatBubble key={message.id} message={message} isOwn={message.user_id === user.id} />
              ))}
            <div ref={bottomAnchorRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-dark-100 p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-lg border border-dark-200 bg-dark-50 px-2 py-1 text-lg leading-none hover:bg-dark-100"
                  onClick={() => appendEmoji(emoji)}
                  aria-label={`Insertar emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1 space-y-2">
                <label htmlFor="chat-attachment-input" className="block text-sm font-medium text-dark-900">
                  Imagen (opcional, se comprime antes de subir)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="chat-attachment-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="w-full cursor-pointer rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm text-dark-700 sm:max-w-xs"
                    disabled={isSending || isLoadingInitial}
                    onChange={onPickAttachment}
                  />
                  {attachment ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAttachment}
                      disabled={isSending || isLoadingInitial}
                      aria-label="Quitar imagen adjunta"
                    >
                      <X className="mr-1 h-4 w-4" aria-hidden />
                      Quitar
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-dark-500">
                  Máx. ~15 MB originales; la app reduce tamaño y calidad para proteger Storage y la carga del chat.
                </p>
              </div>
              {attachmentPreviewUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-dark-200 bg-dark-50">
                  <img
                    src={attachmentPreviewUrl}
                    alt="Vista previa del adjunto"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] text-white">
                    <ImagePlus className="mx-auto h-3 w-3" aria-hidden />
                  </span>
                </div>
              ) : null}
            </div>
            <TextArea
              label="Tu mensaje"
              rows={2}
              maxLength={chatService.CHAT_MESSAGE_MAX_LENGTH}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Texto opcional si envías solo imagen…"
              disabled={isSending || isLoadingInitial}
            />
            <div className="mt-2 flex justify-between gap-2 text-xs text-dark-500">
              <span>
                {draft.length}/{chatService.CHAT_MESSAGE_MAX_LENGTH}
              </span>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSending ||
                  isLoadingInitial ||
                  (draft.trim().length === 0 && !attachment)
                }
              >
                Enviar
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4" aria-label="Estado de integrantes en el chat">
          <div className="rounded-xl border border-dark-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-dark-900">En esta sala (verde)</h2>
            <p className="mt-1 text-xs text-dark-500">
              Integrantes con la página del chat abierta ahora mismo.
            </p>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {onlineMembers.length === 0 ? (
                <li className="text-sm text-dark-500">Nadie más aparece conectado en este momento.</li>
              ) : (
                onlineMembers.map((member) => (
                  <PresenceMemberRow key={member.id} member={member} isOnline />
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-dark-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-dark-900">Fuera de esta sala (rojo)</h2>
            <p className="mt-1 text-xs text-dark-500">
              Cuentas activas que no están en el chat en vivo ahora (o no han abierto esta página).
            </p>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {offlineMembers.length === 0 ? (
                <li className="text-sm text-dark-500">Todos los integrantes activos están en la sala.</li>
              ) : (
                offlineMembers.map((member) => (
                  <PresenceMemberRow key={member.id} member={member} isOnline={false} />
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
